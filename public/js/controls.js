/**
 * Heading controls panel (h1-h6): font-size, color, text-align, margin-top/bottom.
 * Bidirectional sync with the CSS editor.
 */
const Controls = (() => {
  const container = document.getElementById('heading-controls');
  let onChange = null;
  const state = {};

  const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const ALIGNS = ['left', 'center', 'right'];
  const MARGIN_DEFAULTS = {
    h1: { marginTop: '0', marginBottom: '15' },
    h2: { marginTop: '5', marginBottom: '5' },
    h3: { marginTop: '20', marginBottom: '10' },
    h4: { marginTop: '20', marginBottom: '10' },
    h5: { marginTop: '0', marginBottom: '0' },
    h6: { marginTop: '0', marginBottom: '0' },
  };

  function init() {
    HEADINGS.forEach(h => {
      const md = MARGIN_DEFAULTS[h];
      state[h] = { fontSize: '', fontSizeUnit: 'pt', color: '#333333', textAlign: '', marginTop: md.marginTop, marginBottom: md.marginBottom, marginUnit: 'px' };
      container.appendChild(createGroup(h));
    });
  }

  function createGroup(h) {
    const group = document.createElement('div');
    group.className = 'heading-group';
    group.dataset.heading = h;

    const title = document.createElement('div');
    title.className = 'heading-group-title';
    title.textContent = h.toUpperCase();

    const row = document.createElement('div');
    row.className = 'heading-row';

    // Font size
    const sizeLabel = el('label', 'Taille');
    const sizeInput = el('input');
    sizeInput.type = 'number';
    sizeInput.min = '1';
    sizeInput.max = '100';
    sizeInput.dataset.prop = 'fontSize';
    sizeInput.addEventListener('input', () => handleChange(h, 'fontSize', sizeInput.value));

    const unitSelect = el('select');
    ['pt', 'px', 'em'].forEach(u => {
      const o = el('option');
      o.value = u; o.textContent = u;
      unitSelect.appendChild(o);
    });
    unitSelect.dataset.prop = 'fontSizeUnit';
    unitSelect.addEventListener('change', () => handleChange(h, 'fontSizeUnit', unitSelect.value));

    // Color
    const colorInput = el('input');
    colorInput.type = 'color';
    colorInput.dataset.prop = 'color';
    colorInput.addEventListener('input', () => handleChange(h, 'color', colorInput.value));

    // Alignment
    const alignDiv = document.createElement('div');
    alignDiv.className = 'align-btns';
    ALIGNS.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'align-btn';
      btn.dataset.align = a;
      btn.textContent = a === 'left' ? '\u2190' : a === 'center' ? '\u2194' : '\u2192';
      btn.title = a;
      btn.addEventListener('click', () => handleChange(h, 'textAlign', a));
      alignDiv.appendChild(btn);
    });

    row.append(sizeLabel, sizeInput, unitSelect, colorInput, alignDiv);

    // Padding row
    const padRow = document.createElement('div');
    padRow.className = 'heading-row';

    const padTopLabel = el('label', 'M. haut');
    const padTopInput = el('input');
    padTopInput.type = 'number';
    padTopInput.min = '0';
    padTopInput.max = '200';
    padTopInput.dataset.prop = 'marginTop';
    padTopInput.addEventListener('input', () => handleChange(h, 'marginTop', padTopInput.value));

    const padBottomLabel = el('label', 'M. bas');
    const padBottomInput = el('input');
    padBottomInput.type = 'number';
    padBottomInput.min = '0';
    padBottomInput.max = '200';
    padBottomInput.dataset.prop = 'marginBottom';
    padBottomInput.addEventListener('input', () => handleChange(h, 'marginBottom', padBottomInput.value));

    const padUnitSelect = el('select');
    ['px', 'pt', 'em'].forEach(u => {
      const o = el('option');
      o.value = u; o.textContent = u;
      padUnitSelect.appendChild(o);
    });
    padUnitSelect.dataset.prop = 'marginUnit';
    padUnitSelect.addEventListener('change', () => handleChange(h, 'marginUnit', padUnitSelect.value));

    padRow.append(padTopLabel, padTopInput, padBottomLabel, padBottomInput, padUnitSelect);

    group.append(title, row, padRow);
    return group;
  }

  function handleChange(heading, prop, value) {
    state[heading][prop] = value;
    updateAlignButtons(heading);
    if (onChange) onChange(heading, prop, value, state);
  }

  function updateAlignButtons(heading) {
    const group = container.querySelector(`[data-heading="${heading}"]`);
    if (!group) return;
    group.querySelectorAll('.align-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === state[heading].textAlign);
    });
  }

  /**
   * Set controls from parsed heading styles (from CSS).
   */
  function setFromStyles(headingStyles) {
    HEADINGS.forEach(h => {
      const s = headingStyles[h];
      if (!s) return;
      state[h] = { ...state[h], ...s };

      // Colors should already be resolved by parseHeadingStyles
      if (!state[h].color || state[h].color.startsWith('var(')) {
        state[h].color = '#333333';
      }

      const group = container.querySelector(`[data-heading="${h}"]`);
      if (!group) return;

      const rows = group.querySelectorAll('.heading-row');
      const row = rows[0];
      const sizeInput = row.querySelector('[data-prop="fontSize"]');
      const unitSelect = row.querySelector('[data-prop="fontSizeUnit"]');
      const colorInput = row.querySelector('[data-prop="color"]');

      if (sizeInput) sizeInput.value = state[h].fontSize;
      if (unitSelect) unitSelect.value = state[h].fontSizeUnit;
      if (colorInput) colorInput.value = toHex(state[h].color);

      if (rows[1]) {
        const padTopInput = rows[1].querySelector('[data-prop="marginTop"]');
        const padBottomInput = rows[1].querySelector('[data-prop="marginBottom"]');
        const padUnitSelect = rows[1].querySelector('[data-prop="marginUnit"]');
        if (padTopInput) padTopInput.value = state[h].marginTop;
        if (padBottomInput) padBottomInput.value = state[h].marginBottom;
        if (padUnitSelect) padUnitSelect.value = state[h].marginUnit;
      }

      updateAlignButtons(h);
    });
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  function el(tag, text) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    return e;
  }

  function toHex(color) {
    if (!color) return '#333333';
    if (color.startsWith('#') && color.length >= 7) return color.substring(0, 7);
    if (color.startsWith('#') && color.length === 4) {
      return '#' + color[1]+color[1] + color[2]+color[2] + color[3]+color[3];
    }
    return color;
  }

  return { init, setFromStyles, setOnChange };
})();
