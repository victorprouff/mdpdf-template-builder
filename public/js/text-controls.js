/**
 * Text element controls: font-size for p, td/th, li.
 * Bidirectional sync with the CSS editor via CSS variables.
 */
const TextControls = (() => {
  const container = document.getElementById('text-controls');
  let onChange = null;
  const state = {
    p:  { fontSize: '', fontSizeUnit: 'pt' },
    td: { fontSize: '', fontSizeUnit: 'pt' },
    li: { fontSize: '', fontSizeUnit: 'pt' },
  };

  const ELEMENTS = [
    { key: 'p',  label: 'Paragraphes (p)' },
    { key: 'td', label: 'Tableaux (td, th)' },
    { key: 'li', label: 'Listes (li)' },
  ];

  function init() {
    ELEMENTS.forEach(({ key, label }) => {
      container.appendChild(createGroup(key, label));
    });
  }

  function createGroup(key, label) {
    const group = document.createElement('div');
    group.className = 'heading-group';
    group.dataset.element = key;

    const title = document.createElement('div');
    title.className = 'heading-group-title';
    title.textContent = label;

    const row = document.createElement('div');
    row.className = 'heading-row';

    const sizeLabel = el('label', 'Taille');

    const sizeInput = el('input');
    sizeInput.type = 'number';
    sizeInput.min = '1';
    sizeInput.max = '100';
    sizeInput.dataset.prop = 'fontSize';
    sizeInput.addEventListener('input', () => {
      state[key].fontSize = sizeInput.value;
      if (onChange) onChange(key, state[key].fontSize, state[key].fontSizeUnit);
    });

    const unitSelect = el('select');
    ['pt', 'px', 'em'].forEach(u => {
      const o = el('option');
      o.value = u; o.textContent = u;
      unitSelect.appendChild(o);
    });
    unitSelect.dataset.prop = 'fontSizeUnit';
    unitSelect.addEventListener('change', () => {
      state[key].fontSizeUnit = unitSelect.value;
      if (onChange && state[key].fontSize) onChange(key, state[key].fontSize, state[key].fontSizeUnit);
    });

    row.append(sizeLabel, sizeInput, unitSelect);
    group.append(title, row);
    return group;
  }

  /**
   * Sync controls from CSS text: reads --p-font-size, --td-font-size, --li-font-size from :root.
   */
  function setFromCss(css) {
    const vars = parseCssVars(css);
    ELEMENTS.forEach(({ key }) => {
      const val = vars[`--${key}-font-size`];
      if (val) {
        const parsed = val.match(/^([\d.]+)\s*(pt|px|em|rem)$/);
        if (parsed) {
          state[key].fontSize = parsed[1];
          state[key].fontSizeUnit = parsed[2];
        }
      } else {
        state[key].fontSize = '';
      }
      syncGroupUI(key);
    });
  }

  function syncGroupUI(key) {
    const group = container.querySelector(`[data-element="${key}"]`);
    if (!group) return;
    const row = group.querySelector('.heading-row');
    const sizeInput = row.querySelector('[data-prop="fontSize"]');
    const unitSelect = row.querySelector('[data-prop="fontSizeUnit"]');
    if (sizeInput) sizeInput.value = state[key].fontSize;
    if (unitSelect) unitSelect.value = state[key].fontSizeUnit;
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  function parseCssVars(css) {
    const vars = {};
    const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
    if (rootMatch) {
      const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
      let m;
      while ((m = varRegex.exec(rootMatch[1])) !== null) {
        vars[`--${m[1]}`] = m[2].trim();
      }
    }
    return vars;
  }

  function el(tag, text) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  }

  return { init, setFromCss, setOnChange };
})();
