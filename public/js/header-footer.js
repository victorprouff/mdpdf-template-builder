/**
 * Header & Footer controls: logo upload, footer text editing, and padding controls.
 */
const HeaderFooter = (() => {
  const headerContainer = document.getElementById('header-controls');
  const footerContainer = document.getElementById('footer-controls');
  let onLogoChange = null;
  let onFooterChange = null;
  let onPaddingChange = null;
  let onHeaderOptionsChange = null;
  let debounceTimer = null;
  let headerOptionsTimer = null;
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

  function fireHeaderOptionsChange() {
    if (!onHeaderOptionsChange) return;
    const heightInput = document.getElementById('logo-height-input');
    const dateCheckbox = document.getElementById('show-date-checkbox');
    onHeaderOptionsChange({
      logoHeight: heightInput ? `${heightInput.value}px` : '60px',
      showDate: dateCheckbox ? dateCheckbox.checked : true
    });
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

    // Logo height input
    const heightRow = document.createElement('div');
    heightRow.className = 'logo-height-row';
    heightRow.style.display = 'flex';
    heightRow.style.alignItems = 'center';
    heightRow.style.gap = '8px';
    heightRow.style.marginTop = '8px';

    const heightLabel = document.createElement('label');
    heightLabel.textContent = 'Hauteur';
    heightLabel.style.fontSize = '12px';

    const heightInput = document.createElement('input');
    heightInput.type = 'number';
    heightInput.id = 'logo-height-input';
    heightInput.min = '10';
    heightInput.max = '300';
    heightInput.value = '60';
    heightInput.style.width = '70px';
    heightInput.addEventListener('input', () => {
      clearTimeout(headerOptionsTimer);
      headerOptionsTimer = setTimeout(() => fireHeaderOptionsChange(), 500);
    });

    const heightUnit = document.createElement('span');
    heightUnit.className = 'margin-unit-label';
    heightUnit.textContent = 'px';

    heightRow.append(heightLabel, heightInput, heightUnit);

    // Show date checkbox
    const dateRow = document.createElement('div');
    dateRow.style.display = 'flex';
    dateRow.style.alignItems = 'center';
    dateRow.style.gap = '8px';
    dateRow.style.marginTop = '8px';

    const dateCheckbox = document.createElement('input');
    dateCheckbox.type = 'checkbox';
    dateCheckbox.id = 'show-date-checkbox';
    dateCheckbox.checked = true;
    dateCheckbox.addEventListener('change', () => fireHeaderOptionsChange());

    const dateLabel = document.createElement('label');
    dateLabel.textContent = 'Afficher la date';
    dateLabel.style.fontSize = '12px';
    dateLabel.htmlFor = 'show-date-checkbox';

    dateRow.append(dateCheckbox, dateLabel);

    logoSection.append(logoLabel, logoRow, heightRow, dateRow);
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

  function setHeaderOptions({ logoHeight, showDate }) {
    const heightInput = document.getElementById('logo-height-input');
    const dateCheckbox = document.getElementById('show-date-checkbox');
    if (heightInput) heightInput.value = parseInt(logoHeight) || 60;
    if (dateCheckbox) dateCheckbox.checked = showDate;
  }

  function setOnLogoChange(fn) { onLogoChange = fn; }
  function setOnFooterChange(fn) { onFooterChange = fn; }
  function setOnPaddingChange(fn) { onPaddingChange = fn; }
  function setOnHeaderOptionsChange(fn) { onHeaderOptionsChange = fn; }

  return { init, setData, setPaddings, setHeaderOptions, setOnLogoChange, setOnFooterChange, setOnPaddingChange, setOnHeaderOptionsChange };
})();
