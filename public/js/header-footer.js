/**
 * Header & Footer controls: logo upload, footer text editing, and padding controls.
 */
const HeaderFooter = (() => {
  const headerContainer = document.getElementById('header-controls');
  const footerContainer = document.getElementById('footer-controls');
  let onLogoChange = null;
  let onFooterChange = null;
  let onPaddingChange = null;
  let debounceTimer = null;
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const LABELS = { top: 'Haut', right: 'Droite', bottom: 'Bas', left: 'Gauche' };

  function createPaddingGrid(area, container) {
    const label = document.createElement('div');
    label.className = 'field-label';
    label.textContent = 'Padding';
    label.style.marginTop = '10px';

    const grid = document.createElement('div');
    grid.className = 'margin-grid';

    SIDES.forEach(side => {
      const group = document.createElement('div');
      group.className = 'margin-field';

      const lbl = document.createElement('label');
      lbl.textContent = LABELS[side];

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '200';
      input.dataset.area = area;
      input.dataset.side = side;
      input.addEventListener('input', () => {
        firePaddingChange(area);
      });

      const unitLabel = document.createElement('span');
      unitLabel.className = 'margin-unit-label';
      unitLabel.textContent = 'px';

      group.append(lbl, input, unitLabel);
      grid.appendChild(group);
    });

    container.append(label, grid);
  }

  function firePaddingChange(area) {
    if (!onPaddingChange) return;
    const container = area === 'header' ? headerContainer : footerContainer;
    const paddings = {};
    SIDES.forEach(side => {
      const input = container.querySelector(`[data-area="${area}"][data-side="${side}"]`);
      paddings[side] = input && input.value ? `${input.value}px` : '';
    });
    onPaddingChange({ area, paddings });
  }

  function init() {
    // Logo section → header container
    const logoSection = document.createElement('div');
    logoSection.className = 'logo-section';

    const logoLabel = document.createElement('div');
    logoLabel.className = 'field-label';
    logoLabel.textContent = 'Logo';

    const logoRow = document.createElement('div');
    logoRow.className = 'logo-row';

    const logoThumb = document.createElement('img');
    logoThumb.className = 'logo-thumb';
    logoThumb.id = 'logo-thumb';
    logoThumb.alt = 'Logo';

    const logoPlaceholder = document.createElement('div');
    logoPlaceholder.className = 'logo-placeholder';
    logoPlaceholder.id = 'logo-placeholder';
    logoPlaceholder.textContent = 'Aucun logo';

    const logoBtn = document.createElement('button');
    logoBtn.className = 'btn-upload';
    logoBtn.textContent = 'Changer';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';

    logoBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = reader.result;
        setLogoPreview(dataUri);
        if (onLogoChange) onLogoChange(dataUri);
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });

    logoRow.append(logoThumb, logoPlaceholder, logoBtn, fileInput);
    logoSection.append(logoLabel, logoRow);
    headerContainer.append(logoSection);

    // Padding controls for header
    createPaddingGrid('header', headerContainer);

    // Footer section → footer container
    const footerSection = document.createElement('div');
    footerSection.className = 'footer-section';

    const footerLabel = document.createElement('div');
    footerLabel.className = 'field-label';
    footerLabel.textContent = 'Texte du footer';

    const textarea = document.createElement('textarea');
    textarea.className = 'footer-textarea';
    textarea.id = 'footer-textarea';
    textarea.rows = 3;
    textarea.placeholder = 'Texte du pied de page...';

    textarea.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (onFooterChange) onFooterChange(textarea.value);
      }, 500);
    });

    footerSection.append(footerLabel, textarea);
    footerContainer.append(footerSection);

    // Padding controls for footer
    createPaddingGrid('footer', footerContainer);
  }

  function setLogoPreview(dataUri) {
    const thumb = document.getElementById('logo-thumb');
    const placeholder = document.getElementById('logo-placeholder');
    if (dataUri) {
      thumb.src = dataUri;
      thumb.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      thumb.style.display = 'none';
      placeholder.style.display = 'block';
    }
  }

  function setData({ logo, footerText }) {
    setLogoPreview(logo);
    const textarea = document.getElementById('footer-textarea');
    if (textarea) textarea.value = footerText || '';
  }

  function setPaddings({ header, footer }) {
    ['header', 'footer'].forEach(area => {
      const data = area === 'header' ? header : footer;
      const cont = area === 'header' ? headerContainer : footerContainer;
      SIDES.forEach(side => {
        const input = cont.querySelector(`[data-area="${area}"][data-side="${side}"]`);
        if (input) {
          const val = data && data[side] ? data[side].replace(/px$/, '') : '';
          input.value = val;
        }
      });
    });
  }

  function setOnLogoChange(fn) { onLogoChange = fn; }
  function setOnFooterChange(fn) { onFooterChange = fn; }
  function setOnPaddingChange(fn) { onPaddingChange = fn; }

  return { init, setData, setPaddings, setOnLogoChange, setOnFooterChange, setOnPaddingChange };
})();
