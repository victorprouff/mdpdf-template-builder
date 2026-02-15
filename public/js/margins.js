/**
 * Margin controls panel: top, right, bottom, left.
 * Bidirectional sync with the CSS editor (@page rule).
 */
const Margins = (() => {
  const container = document.getElementById('margin-controls');
  let onChange = null;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const LABELS = { top: 'Haut', right: 'Droite', bottom: 'Bas', left: 'Gauche' };
  const DEFAULT_UNIT = 'mm';
  const SUPPORTED_UNITS = ['mm', 'cm', 'px'];
  const state = { top: '', right: '', bottom: '', left: '' };
  const units = { top: DEFAULT_UNIT, right: DEFAULT_UNIT, bottom: DEFAULT_UNIT, left: DEFAULT_UNIT };

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

      const unitSelect = document.createElement('select');
      unitSelect.className = 'margin-unit-select';
      unitSelect.dataset.unitSide = side;
      SUPPORTED_UNITS.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        if (u === DEFAULT_UNIT) opt.selected = true;
        unitSelect.appendChild(opt);
      });
      unitSelect.addEventListener('change', () => {
        units[side] = unitSelect.value;
        fireChange();
      });

      group.append(label, input, unitSelect);
      grid.appendChild(group);
    });

    container.appendChild(grid);
  }

  function fireChange() {
    if (!onChange) return;
    const margins = {};
    SIDES.forEach(s => {
      margins[s] = state[s] ? `${state[s]}${units[s]}` : '';
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
        units[side] = m[2].toLowerCase();
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
      const unitSelect = container.querySelector(`[data-unit-side="${side}"]`);
      if (unitSelect) unitSelect.value = units[side];
    });
  }

  function parseShorthand(value) {
    const parts = value.trim().split(/\s+/);
    const parsed = parts.map(p => {
      const m = p.match(/^([\d.]+)\s*(mm|cm|px)$/i);
      return m ? { val: m[1], unit: m[2].toLowerCase() } : null;
    }).filter(Boolean);

    if (parsed.length === 0) return;

    const assign = (sides, item) => {
      sides.forEach(s => { state[s] = item.val; units[s] = item.unit; });
    };

    if (parsed.length === 1) {
      assign(['top', 'right', 'bottom', 'left'], parsed[0]);
    } else if (parsed.length === 2) {
      assign(['top', 'bottom'], parsed[0]);
      assign(['right', 'left'], parsed[1]);
    } else if (parsed.length === 3) {
      assign(['top'], parsed[0]);
      assign(['right', 'left'], parsed[1]);
      assign(['bottom'], parsed[2]);
    } else {
      assign(['top'], parsed[0]);
      assign(['right'], parsed[1]);
      assign(['bottom'], parsed[2]);
      assign(['left'], parsed[3]);
    }
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  return { init, setFromCss, setOnChange };
})();
