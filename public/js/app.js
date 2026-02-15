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

  // ── Init accordions ──
  document.querySelectorAll('[data-accordion-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('[data-accordion]').classList.toggle('open');
    });
  });

  // ── Init modules ──
  CssEditor.init();
  Controls.init();
  HeaderFooter.init();
  Margins.init();

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
    Margins.setFromCss(css);
    HeaderFooter.setPaddings(parseAreaPaddings(css));
    HeaderFooter.setHeaderOptions(parseHeaderOptions(css));
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

  // ── Margins change -> update CSS + save + reload preview ──
  Margins.setOnChange(async (margins) => {
    const newCss = applyMarginChange(currentCss, margins);
    currentCss = newCss;
    CssEditor.setValue(newCss);
    await saveCss();
    Preview.load(currentName);
  });

  // ── Header/Footer padding change -> update CSS variables + editor + HTML + reload preview ──
  HeaderFooter.setOnPaddingChange(async ({ area, paddings }) => {
    let css = currentCss;
    const SIDES = ['top', 'right', 'bottom', 'left'];
    SIDES.forEach(side => {
      const varName = `--${area}-padding-${side}`;
      const value = paddings[side] || '0px';
      css = setOrCreateCssVar(css, varName, value);
    });
    currentCss = css;
    CssEditor.setValue(css);
    // Save CSS + padding HTML, then reload preview
    await saveCss();
    await savePadding(area, paddings);
    Preview.load(currentName);
  });

  // ── Header options (logo height, show date) change ──
  HeaderFooter.setOnHeaderOptionsChange(async ({ logoHeight, showDate }) => {
    let css = currentCss;
    css = setOrCreateCssVar(css, '--logo-height', logoHeight);
    css = setOrCreateCssVar(css, '--show-date', showDate ? '1' : '0');
    currentCss = css;
    CssEditor.setValue(css);
    await saveCss();
    await saveHeaderOptions(logoHeight, showDate);
    Preview.load(currentName);
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
      Margins.setFromCss(msg.css);
      HeaderFooter.setPaddings(parseAreaPaddings(msg.css));
      HeaderFooter.setHeaderOptions(parseHeaderOptions(msg.css));
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
    Margins.setFromCss(tpl.css);
    HeaderFooter.setData({ logo: tpl.logo, footerText: extractFooterText(tpl.footer) });
    HeaderFooter.setPaddings(parseAreaPaddings(tpl.css));
    HeaderFooter.setHeaderOptions(parseHeaderOptions(tpl.css));
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

  async function savePadding(area, paddings) {
    try {
      await fetch(`/api/templates/${encodeURIComponent(currentName)}/padding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, paddings })
      });
    } catch {
      saveStatus.textContent = 'Erreur padding';
    }
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
   * Parse logo height and show-date from CSS variables.
   */
  function parseHeaderOptions(css) {
    const vars = parseCssVars(css);
    return {
      logoHeight: vars['--logo-height'] || '60px',
      showDate: vars['--show-date'] !== '0'
    };
  }

  async function saveHeaderOptions(logoHeight, showDate) {
    try {
      await fetch(`/api/templates/${encodeURIComponent(currentName)}/header-options`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoHeight, showDate })
      });
    } catch {
      saveStatus.textContent = 'Erreur header options';
    }
  }

  /**
   * Parse header/footer padding CSS variables from :root.
   */
  function parseAreaPaddings(css) {
    const vars = parseCssVars(css);
    const result = { header: {}, footer: {} };
    ['header', 'footer'].forEach(area => {
      ['top', 'right', 'bottom', 'left'].forEach(side => {
        const val = vars[`--${area}-padding-${side}`];
        result[area][side] = val || '';
      });
    });
    return result;
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
   * Apply margin changes to the @page rule in CSS.
   */
  function applyMarginChange(css, margins) {
    const sides = ['top', 'right', 'bottom', 'left'];
    const hasValues = sides.some(s => margins[s]);
    if (!hasValues) return css;

    // Build individual margin declarations
    const decls = sides
      .filter(s => margins[s])
      .map(s => `    margin-${s}: ${margins[s]};`)
      .join('\n');

    const pageMatch = css.match(/@page\s*\{([^}]*)\}/);
    if (pageMatch) {
      let body = pageMatch[1];
      // Remove existing margin declarations (shorthand and individual)
      body = body.replace(/\s*margin\s*:[^;]*;/g, '');
      sides.forEach(s => {
        body = body.replace(new RegExp(`\\s*margin-${s}\\s*:[^;]*;`, 'g'), '');
      });
      // Clean up extra blank lines
      body = body.replace(/\n{3,}/g, '\n\n');
      // Add new margin declarations
      const trimmed = body.trimEnd();
      const newBody = trimmed + '\n' + decls + '\n';
      return css.replace(/@page\s*\{[^}]*\}/, `@page {${newBody}}`);
    }

    // No @page block exists, create one
    return `@page {\n${decls}\n}\n\n` + css;
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
