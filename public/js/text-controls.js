/**
 * Text element controls: font-size for p, td/th, li.
 * Bidirectional sync with the CSS editor via CSS variables.
 */
const TextControls = (() => {
  const container = document.getElementById('text-controls');
  let onChange = null;
  let onTableOptionsChange = null;
  const state = {
    p:  { fontSize: '', fontSizeUnit: 'pt' },
    td: { fontSize: '', fontSizeUnit: 'pt' },
    li: { fontSize: '', fontSizeUnit: 'pt' },
  };
  const tableState = {
    fullWidth: false,
    cellHeight: '', cellHeightUnit: 'px',
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
    // Append table-specific options (full width + cell padding) to the td group
    const tdGroup = container.querySelector('[data-element="td"]');
    if (tdGroup) tdGroup.appendChild(createTableOptions());
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
   * Sync controls from CSS text: reads --p-font-size, --td-font-size, --li-font-size,
   * --table-width, --td-padding-top, --td-padding-bottom from :root.
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

    // Table options
    tableState.fullWidth = !!vars['--table-width'];

    const ch = vars['--td-height'];
    if (ch) {
      const parsed = ch.match(/^([\d.]+)\s*(px|pt|em)$/);
      if (parsed) { tableState.cellHeight = parsed[1]; tableState.cellHeightUnit = parsed[2]; }
    } else {
      tableState.cellHeight = '';
    }

    syncTableUI();
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

  function createTableOptions() {
    const div = document.createElement('div');

    // Full width checkbox
    const fullWidthRow = document.createElement('div');
    fullWidthRow.className = 'heading-row';
    fullWidthRow.style.alignItems = 'center';

    const fullWidthCb = document.createElement('input');
    fullWidthCb.type = 'checkbox';
    fullWidthCb.id = 'table-full-width-checkbox';
    fullWidthCb.addEventListener('change', () => {
      tableState.fullWidth = fullWidthCb.checked;
      fireTableOptionsChange();
    });

    const fullWidthLabel = el('label', 'Pleine largeur');
    fullWidthLabel.htmlFor = 'table-full-width-checkbox';
    fullWidthRow.append(fullWidthCb, fullWidthLabel);

    // Cell height
    const heightRow = document.createElement('div');
    heightRow.className = 'heading-row';

    const heightLabel = el('label', 'Hauteur cellules');

    const heightInput = el('input');
    heightInput.type = 'number';
    heightInput.id = 'td-height-input';
    heightInput.min = '0';
    heightInput.max = '500';
    heightInput.addEventListener('input', () => {
      tableState.cellHeight = heightInput.value;
      fireTableOptionsChange();
    });

    const heightUnit = el('select');
    heightUnit.id = 'td-height-unit';
    ['px', 'pt', 'em'].forEach(u => {
      const o = el('option'); o.value = u; o.textContent = u;
      heightUnit.appendChild(o);
    });
    heightUnit.addEventListener('change', () => {
      tableState.cellHeightUnit = heightUnit.value;
      if (tableState.cellHeight) fireTableOptionsChange();
    });

    heightRow.append(heightLabel, heightInput, heightUnit);
    div.append(fullWidthRow, heightRow);
    return div;
  }

  function syncTableUI() {
    const fullWidthCb = document.getElementById('table-full-width-checkbox');
    if (fullWidthCb) fullWidthCb.checked = tableState.fullWidth;

    const hInput = document.getElementById('td-height-input');
    const hUnit  = document.getElementById('td-height-unit');
    if (hInput) hInput.value = tableState.cellHeight;
    if (hUnit)  hUnit.value  = tableState.cellHeightUnit;
  }

  function fireTableOptionsChange() {
    if (onTableOptionsChange) onTableOptionsChange({ ...tableState });
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  function setOnTableOptionsChange(fn) {
    onTableOptionsChange = fn;
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

  return { init, setFromCss, setOnChange, setOnTableOptionsChange };
})();
