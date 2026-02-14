/**
 * Margin controls panel: top, right, bottom, left.
 * Bidirectional sync with the CSS editor (@page rule).
 */
const Margins = (() => {
  const container = document.getElementById('margin-controls');
  let onChange = null;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const LABELS = { top: 'Haut', right: 'Droite', bottom: 'Bas', left: 'Gauche' };
  const UNIT = 'px';
  const state = { top: '', right: '', bottom: '', left: '' };

  function init() {
    const grid = document.createElement('div');
    grid.className = 'margin-grid';

    SIDES.forEach(side => {
      const group = document.createElement('div');
      group.className = 'margin-field';

      const label = document.createElement('label');
      label.textContent = LABELS[side];

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '200';
      input.dataset.side = side;
      input.addEventListener('input', () => {
        state[side] = input.value;
        fireChange();
      });

      const unitLabel = document.createElement('span');
      unitLabel.className = 'margin-unit-label';
      unitLabel.textContent = UNIT;

      group.append(label, input, unitLabel);
      grid.appendChild(group);
    });

    container.appendChild(grid);
  }

  function fireChange() {
    if (!onChange) return;
    const margins = {};
    SIDES.forEach(s => {
      margins[s] = state[s] ? `${state[s]}${UNIT}` : '';
    });
    onChange(margins);
  }

  /**
   * Parse @page margin values from CSS and populate inputs.
   */
  function setFromCss(css) {
    const pageMatch = css.match(/@page\s*\{([^}]*)\}/);
    if (!pageMatch) return;
    const body = pageMatch[1];

    // Try individual margin properties first
    let found = false;
    SIDES.forEach(side => {
      const re = new RegExp(`margin-${side}\\s*:\\s*([\\d.]+)\\s*(mm|cm|px)`, 'i');
      const m = body.match(re);
      if (m) {
        state[side] = m[1];
        found = true;
      }
    });

    // Try shorthand margin
    if (!found) {
      const shorthand = body.match(/margin\s*:\s*([^;]+);/);
      if (shorthand) {
        parseShorthand(shorthand[1].trim());
      }
    }

    // Update DOM
    SIDES.forEach(side => {
      const input = container.querySelector(`[data-side="${side}"]`);
      if (input) input.value = state[side];
    });
  }

  function parseShorthand(value) {
    const parts = value.trim().split(/\s+/);
    const parsed = parts.map(p => {
      const m = p.match(/^([\d.]+)\s*(mm|cm|px)$/i);
      return m ? { val: m[1] } : null;
    }).filter(Boolean);

    if (parsed.length === 0) return;

    if (parsed.length === 1) {
      state.top = state.right = state.bottom = state.left = parsed[0].val;
    } else if (parsed.length === 2) {
      state.top = state.bottom = parsed[0].val;
      state.right = state.left = parsed[1].val;
    } else if (parsed.length === 3) {
      state.top = parsed[0].val;
      state.right = state.left = parsed[1].val;
      state.bottom = parsed[2].val;
    } else {
      state.top = parsed[0].val;
      state.right = parsed[1].val;
      state.bottom = parsed[2].val;
      state.left = parsed[3].val;
    }
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  return { init, setFromCss, setOnChange };
})();
