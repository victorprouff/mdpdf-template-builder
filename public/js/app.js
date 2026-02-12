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

  // ── Load templates ──
  const templates = await TemplateSelector.load();
  if (templates.length === 0) {
    saveStatus.textContent = 'Aucun template';
    return;
  }

  // ── Load first template ──
  await loadTemplate(templates[0]);

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

  // ── Helper functions ──

  async function loadTemplate(name) {
    currentName = name;
    const res = await fetch(`/api/templates/${encodeURIComponent(name)}`);
    const tpl = await res.json();
    currentCss = tpl.css;
    CssEditor.setValue(tpl.css);
    Controls.setFromStyles(parseHeadingStyles(tpl.css));
    Preview.load(name);
    WsClient.send({ type: 'watch-template', name });
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
   * Find which CSS variable a heading color uses, if any.
   */
  function findColorVar(css, heading) {
    const ruleRegex = new RegExp(`(?:^|\\n)\\s*${heading}\\s*\\{([^}]*)\\}`, 'g');
    let match;
    while ((match = ruleRegex.exec(css)) !== null) {
      const before = css.substring(Math.max(0, match.index - 5), match.index);
      if (before.match(/,\s*$/)) continue;
      const col = match[1].match(/color\s*:\s*(var\(\s*(--[\w-]+)\s*\))\s*;/);
      if (col) return col[2]; // returns the variable name e.g. --primary-color
      break;
    }
    return null;
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
        const parsed = fs[1].trim().match(/^([\d.]+)\s*(pt|px|em|rem)$/);
        if (parsed) {
          headings[sel].fontSize = parsed[1];
          headings[sel].fontSizeUnit = parsed[2];
        }
      }

      const col = body.match(/color\s*:\s*([^;]+);/);
      if (col) headings[sel].color = resolveVar(col[1].trim(), vars);

      const ta = body.match(/text-align\s*:\s*([^;]+);/);
      if (ta) headings[sel].textAlign = ta[1].trim();
    }

    return headings;
  }

  /**
   * Update a CSS variable value in :root.
   */
  function updateCssVar(css, varName, value) {
    const regex = new RegExp(`(${varName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*)([^;]*)(;)`);
    if (regex.test(css)) {
      return css.replace(regex, `$1${value}$3`);
    }
    return css;
  }

  /**
   * Apply a control change to the CSS text.
   * If the heading color uses a var(), update the variable in :root instead.
   */
  function applyControlChange(css, heading, prop, value, state) {
    if (prop === 'fontSize' || prop === 'fontSizeUnit') {
      const s = state[heading];
      if (s.fontSize) {
        css = updateCssProp(css, heading, 'font-size', `${s.fontSize}${s.fontSizeUnit}`);
      }
    } else if (prop === 'color') {
      const varName = findColorVar(css, heading);
      if (varName) {
        css = updateCssVar(css, varName, value);
      } else {
        css = updateCssProp(css, heading, 'color', value);
      }
    } else if (prop === 'textAlign') {
      css = updateCssProp(css, heading, 'text-align', value);
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
