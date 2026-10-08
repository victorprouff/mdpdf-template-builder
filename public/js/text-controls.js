/**
 * Text element controls: font-size for p, td/th, li.
 * Bidirectional sync with the CSS editor via CSS variables.
 */
const TextControls = (() => {
  const container = document.getElementById('text-controls');
  let onChange = null;
  let onTableOptionsChange = null;
  let onListOptionsChange = null;
  const state = {
    p:  { fontSize: '', fontSizeUnit: 'pt' },
    td: { fontSize: '', fontSizeUnit: 'pt' },
    li: { fontSize: '', fontSizeUnit: 'pt' },
  };
  const tableState = {
    fullWidth: false,
    cellHeight: '', cellHeightUnit: 'px',
    borderWidth: '', borderWidthUnit: 'px',
  };
  const listState = {
    marginTop: '', marginTopUnit: 'px',
    preMargin: '', preMarginUnit: 'px',
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
    // Append list-specific options to the li group
    const liGroup = container.querySelector('[data-element="li"]');
    if (liGroup) liGroup.appendChild(createListOptions());
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

    const bw = vars['--table-border-width'];
    if (bw) {
      const parsed = bw.match(/^([\d.]+)\s*(px|pt)$/);
      if (parsed) { tableState.borderWidth = parsed[1]; tableState.borderWidthUnit = parsed[2]; }
    } else {
      tableState.borderWidth = '';
    }

    syncTableUI();

    // List options
    const lmt = vars['--list-margin-top'];
    if (lmt) {
      const parsed = lmt.match(/^([\d.]+)\s*(px|pt|em)$/);
      if (parsed) { listState.marginTop = parsed[1]; listState.marginTopUnit = parsed[2]; }
    } else {
      listState.marginTop = '';
    }

    const plm = vars['--pre-list-margin'];
    if (plm) {
      const parsed = plm.match(/^([\d.]+)\s*(px|pt|em)$/);
      if (parsed) { listState.preMargin = parsed[1]; listState.preMarginUnit = parsed[2]; }
    } else {
      listState.preMargin = '';
    }
    syncListUI();
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

    // Border width
    const borderRow = document.createElement('div');
    borderRow.className = 'heading-row';

    const borderLabel = el('label', 'Bordure');

    const borderInput = el('input');
    borderInput.type = 'number';
    borderInput.id = 'td-border-width-input';
    borderInput.min = '0';
    borderInput.max = '20';
    borderInput.placeholder = '—';
    borderInput.addEventListener('input', () => {
      tableState.borderWidth = borderInput.value;
      fireTableOptionsChange();
    });

    const borderUnit = el('select');
    borderUnit.id = 'td-border-width-unit';
    ['px', 'pt'].forEach(u => {
      const o = el('option'); o.value = u; o.textContent = u;
      borderUnit.appendChild(o);
    });
    borderUnit.addEventListener('change', () => {
      tableState.borderWidthUnit = borderUnit.value;
      if (tableState.borderWidth) fireTableOptionsChange();
    });

    borderRow.append(borderLabel, borderInput, borderUnit);
    div.append(fullWidthRow, heightRow, borderRow);
    return div;
  }

  function syncTableUI() {
    const fullWidthCb = document.getElementById('table-full-width-checkbox');
    if (fullWidthCb) fullWidthCb.checked = tableState.fullWidth;

    const hInput = document.getElementById('td-height-input');
    const hUnit  = document.getElementById('td-height-unit');
    if (hInput) hInput.value = tableState.cellHeight;
    if (hUnit)  hUnit.value  = tableState.cellHeightUnit;

    const bInput = document.getElementById('td-border-width-input');
    const bUnit  = document.getElementById('td-border-width-unit');
    if (bInput) bInput.value = tableState.borderWidth;
    if (bUnit)  bUnit.value  = tableState.borderWidthUnit;
  }

  function createListOptions() {
    const div = document.createElement('div');

    const marginTopRow = document.createElement('div');
    marginTopRow.className = 'heading-row';

    const marginTopLabel = el('label', 'Espacement avant');

    const marginTopInput = el('input');
    marginTopInput.type = 'number';
    marginTopInput.id = 'list-margin-top-input';
    marginTopInput.min = '0';
    marginTopInput.max = '200';
    marginTopInput.placeholder = '—';
    marginTopInput.addEventListener('input', () => {
      listState.marginTop = marginTopInput.value;
      fireListOptionsChange();
    });

    const marginTopUnit = el('select');
    marginTopUnit.id = 'list-margin-top-unit';
    ['px', 'pt', 'em'].forEach(u => {
      const o = el('option'); o.value = u; o.textContent = u;
      marginTopUnit.appendChild(o);
    });
    marginTopUnit.addEventListener('change', () => {
      listState.marginTopUnit = marginTopUnit.value;
      if (listState.marginTop) fireListOptionsChange();
    });

    marginTopRow.append(marginTopLabel, marginTopInput, marginTopUnit);

    // Margin-bottom of preceding element (p:has(+ ul/ol))
    const preMarginRow = document.createElement('div');
    preMarginRow.className = 'heading-row';

    const preMarginLabel = el('label', 'Marge élément précédent');

    const preMarginInput = el('input');
    preMarginInput.type = 'number';
    preMarginInput.id = 'pre-list-margin-input';
    preMarginInput.min = '0';
    preMarginInput.max = '200';
    preMarginInput.placeholder = '—';
    preMarginInput.addEventListener('input', () => {
      listState.preMargin = preMarginInput.value;
      fireListOptionsChange();
    });

    const preMarginUnit = el('select');
    preMarginUnit.id = 'pre-list-margin-unit';
    ['px', 'pt', 'em'].forEach(u => {
      const o = el('option'); o.value = u; o.textContent = u;
      preMarginUnit.appendChild(o);
    });
    preMarginUnit.addEventListener('change', () => {
      listState.preMarginUnit = preMarginUnit.value;
      if (listState.preMargin) fireListOptionsChange();
    });

    preMarginRow.append(preMarginLabel, preMarginInput, preMarginUnit);
    div.append(marginTopRow, preMarginRow);
    return div;
  }

  function syncListUI() {
    const mtInput = document.getElementById('list-margin-top-input');
    const mtUnit  = document.getElementById('list-margin-top-unit');
    if (mtInput) mtInput.value = listState.marginTop;
    if (mtUnit)  mtUnit.value  = listState.marginTopUnit;

    const pmInput = document.getElementById('pre-list-margin-input');
    const pmUnit  = document.getElementById('pre-list-margin-unit');
    if (pmInput) pmInput.value = listState.preMargin;
    if (pmUnit)  pmUnit.value  = listState.preMarginUnit;
  }

  function fireListOptionsChange() {
    if (onListOptionsChange) onListOptionsChange({
      marginTop: listState.marginTop,
      marginTopUnit: listState.marginTopUnit,
      preMargin: listState.preMargin,
      preMarginUnit: listState.preMarginUnit,
    });
  }

  function fireTableOptionsChange() {
    if (onTableOptionsChange) onTableOptionsChange({
      fullWidth: tableState.fullWidth,
      cellHeight: tableState.cellHeight,
      cellHeightUnit: tableState.cellHeightUnit,
      borderWidth: tableState.borderWidth,
      borderWidthUnit: tableState.borderWidthUnit,
    });
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  function setOnTableOptionsChange(fn) {
    onTableOptionsChange = fn;
  }

  function setOnListOptionsChange(fn) {
    onListOptionsChange = fn;
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

  return { init, setFromCss, setOnChange, setOnTableOptionsChange, setOnListOptionsChange };
})();
