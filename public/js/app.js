/**
 * Main orchestrator: wires template selector, preview, CSS editor,
 * controls, and WebSocket together.
 */
(async () => {
  // Current template state
  let currentCss = '';
  let currentName = '';
  let saveTimer = null;
  const saveStatus = document.getElementById('save-status');

  // ── Init modules ──
  CssEditor.init();
  Controls.init();
  HeaderFooter.init();

  // ── Load templates ──
  let templates = await TemplateSelector.load();
  if (templates.length === 0) {
    saveStatus.textContent = 'Aucun template';
  } else {
    await loadTemplate(templates[0]);
  }

  // ── Template selector change ──
  TemplateSelector.setOnChange(async (name) => {
    await loadTemplate(name);
  });

  // ── CSS Editor change -> update preview + controls + schedule save ──
  CssEditor.setOnChange((css) => {
    currentCss = css;
    Preview.updateCss(css);
    Controls.setFromStyles(parseHeadingStyles(css));
    scheduleSave();
  });

  // ── Controls change -> update CSS text + preview + editor ──
  Controls.setOnChange((heading, prop, value, state) => {
    const newCss = applyControlChange(currentCss, heading, prop, value, state);
    currentCss = newCss;
    CssEditor.setValue(newCss);
    Preview.updateCss(newCss);
    scheduleSave();
  });

  // ── WebSocket: external file changes ──
  WsClient.on('file-changed', async (msg) => {
    if (msg.name === currentName) {
      await loadTemplate(currentName);
    }
  });

  WsClient.on('css-updated', (msg) => {
    if (msg.name === currentName) {
      currentCss = msg.css;
      CssEditor.setValue(msg.css);
      Preview.updateCss(msg.css);
      Controls.setFromStyles(parseHeadingStyles(msg.css));
    }
  });

  WsClient.on('open', () => {
    if (currentName) {
      WsClient.send({ type: 'watch-template', name: currentName });
    }
  });

  // ── New template button ──
  document.getElementById('btn-new-template').addEventListener('click', async () => {
    const name = prompt('Nom du nouveau template :');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Erreur');
        return;
      }
      templates = await TemplateSelector.refresh(name.trim());
      await loadTemplate(name.trim());
    } catch {
      alert('Erreur lors de la création');
    }
  });

  // ── Logo change ──
  HeaderFooter.setOnLogoChange(async (dataUri) => {
    try {
      await fetch(`/api/templates/${encodeURIComponent(currentName)}/logo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataUri })
      });
      Preview.load(currentName);
      saveStatus.textContent = 'Logo sauvegardé';
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } catch {
      saveStatus.textContent = 'Erreur logo';
    }
  });

  // ── Footer text change ──
  HeaderFooter.setOnFooterChange(async (text) => {
    try {
      await fetch(`/api/templates/${encodeURIComponent(currentName)}/footer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      Preview.load(currentName);
      saveStatus.textContent = 'Footer sauvegardé';
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } catch {
      saveStatus.textContent = 'Erreur footer';
    }
  });

  // ── Helper functions ──

  async function loadTemplate(name) {
    currentName = name;
    const res = await fetch(`/api/templates/${encodeURIComponent(name)}`);
    const tpl = await res.json();
    currentCss = tpl.css;
    CssEditor.setValue(tpl.css);
    Controls.setFromStyles(parseHeadingStyles(tpl.css));
    HeaderFooter.setData({ logo: tpl.logo, footerText: extractFooterText(tpl.footer) });
    Preview.load(name);
    WsClient.send({ type: 'watch-template', name });
  }

  function extractFooterText(html) {
    if (!html) return '';
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .join('\n');
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveStatus.textContent = 'Modifié';
    saveTimer = setTimeout(() => saveCss(), 500);
  }

  async function saveCss() {
    try {
      await fetch(`/api/templates/${encodeURIComponent(currentName)}/css`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ css: currentCss })
      });
      saveStatus.textContent = 'Sauvegardé';
      setTimeout(() => { saveStatus.textContent = ''; }, 2000);
    } catch {
      saveStatus.textContent = 'Erreur sauvegarde';
    }
  }

  /**
   * Parse CSS variables from :root block.
   */
  function parseCssVars(css) {
    const vars = {};
    const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
    if (rootMatch) {
      const body = rootMatch[1];
      const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
      let m;
      while ((m = varRegex.exec(body)) !== null) {
        vars[`--${m[1]}`] = m[2].trim();
      }
    }
    return vars;
  }

  /**
   * Resolve a CSS value: if it's var(--x), return the resolved hex value.
   */
  function resolveVar(value, vars) {
    if (!value) return value;
    const varMatch = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
    if (varMatch && vars[varMatch[1]]) {
      return vars[varMatch[1]];
    }
    return value;
  }


  /**
   * Parse heading styles from CSS (simple regex extraction).
   * Resolves var() references to actual hex values.
   */
  function parseHeadingStyles(css) {
    const vars = parseCssVars(css);
    const headings = {};
    for (let i = 1; i <= 6; i++) {
      headings[`h${i}`] = { fontSize: '', fontSizeUnit: 'pt', color: '', textAlign: '' };
    }

    const ruleRegex = /(?:^|\n)\s*(h[1-6])\s*\{([^}]*)\}/g;
    let match;
    while ((match = ruleRegex.exec(css)) !== null) {
      const sel = match[1];
      const body = match[2];

      const fs = body.match(/font-size\s*:\s*([^;]+);/);
      if (fs) {
        const resolved = resolveVar(fs[1].trim(), vars);
        const parsed = resolved.match(/^([\d.]+)\s*(pt|px|em|rem)$/);
        if (parsed) {
          headings[sel].fontSize = parsed[1];
          headings[sel].fontSizeUnit = parsed[2];
        }
      }

      const col = body.match(/color\s*:\s*([^;]+);/);
      if (col) headings[sel].color = resolveVar(col[1].trim(), vars);

      const ta = body.match(/text-align\s*:\s*([^;]+);/);
      if (ta) headings[sel].textAlign = resolveVar(ta[1].trim(), vars);
    }

    return headings;
  }

  /**
   * Set or create a CSS variable in :root.
   * Updates if exists, adds if :root exists but var doesn't, creates :root if needed.
   */
  function setOrCreateCssVar(css, varName, value) {
    const escaped = varName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escaped}\\s*:\\s*)([^;]*)(;)`);
    if (regex.test(css)) {
      return css.replace(regex, `$1${value}$3`);
    }
    const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
    if (rootMatch) {
      const rootEnd = css.indexOf('}', css.indexOf(':root'));
      return css.slice(0, rootEnd) + `    ${varName}: ${value};\n` + css.slice(rootEnd);
    }
    return `:root {\n    ${varName}: ${value};\n}\n\n` + css;
  }

  /**
   * Apply a control change to the CSS text.
   * Always writes to --hN-property variables in :root.
   */
  function applyControlChange(css, heading, prop, value, state) {
    if (prop === 'fontSize' || prop === 'fontSizeUnit') {
      const s = state[heading];
      if (s.fontSize) {
        const varName = `--${heading}-font-size`;
        css = setOrCreateCssVar(css, varName, `${s.fontSize}${s.fontSizeUnit}`);
        css = updateCssProp(css, heading, 'font-size', `var(${varName})`);
      }
    } else if (prop === 'color') {
      const varName = `--${heading}-color`;
      css = setOrCreateCssVar(css, varName, value);
      css = updateCssProp(css, heading, 'color', `var(${varName})`);
    } else if (prop === 'textAlign') {
      const varName = `--${heading}-text-align`;
      css = setOrCreateCssVar(css, varName, value);
      css = updateCssProp(css, heading, 'text-align', `var(${varName})`);
    }
    return css;
  }

  /**
   * Update or insert a CSS property in a rule block.
   */
  function updateCssProp(css, selector, property, value) {
    const ruleRegex = new RegExp(`((?:^|\\n)(\\s*${selector}\\s*\\{))([^}]*)(\\})`, 'g');
    let match = null;

    while ((match = ruleRegex.exec(css)) !== null) {
      const before = css.substring(Math.max(0, match.index - 5), match.index);
      if (!before.match(/,\s*$/)) break;
      match = null;
    }

    if (!match) {
      return css.trimEnd() + `\n\n${selector} {\n    ${property}: ${value};\n}\n`;
    }

    const ruleBody = match[3];
    const propRegex = new RegExp(`([ \\t]*${property}\\s*:\\s*)([^;]*)(;)`);
    const propMatch = ruleBody.match(propRegex);

    if (propMatch) {
      const newBody = ruleBody.replace(propRegex, `$1${value}$3`);
      return css.substring(0, match.index) +
        match[1] + newBody + match[4] +
        css.substring(match.index + match[0].length);
    } else {
      const newBody = ruleBody.trimEnd() + `\n    ${property}: ${value};\n`;
      return css.substring(0, match.index) +
        match[1] + newBody + match[4] +
        css.substring(match.index + match[0].length);
    }
  }
})();
