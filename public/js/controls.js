/**
 * Heading controls panel (h1-h6): font-size, color, text-align.
 * Bidirectional sync with the CSS editor.
 */
const Controls = (() => {
  const container = document.getElementById('heading-controls');
  let onChange = null;
  const state = {};

  const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  const ALIGNS = ['left', 'center', 'right'];

  function init() {
    HEADINGS.forEach(h => {
      state[h] = { fontSize: '', fontSizeUnit: 'pt', color: '#333333', textAlign: '' };
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
    group.append(title, row);
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

      const row = group.querySelector('.heading-row');
      const sizeInput = row.querySelector('[data-prop="fontSize"]');
      const unitSelect = row.querySelector('[data-prop="fontSizeUnit"]');
      const colorInput = row.querySelector('[data-prop="color"]');

      if (sizeInput) sizeInput.value = state[h].fontSize;
      if (unitSelect) unitSelect.value = state[h].fontSizeUnit;
      if (colorInput) colorInput.value = toHex(state[h].color);

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
