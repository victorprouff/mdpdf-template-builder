/**
 * Header & Footer controls: logo upload + footer text editing.
 */
const HeaderFooter = (() => {
  const container = document.getElementById('header-footer-controls');
  let onLogoChange = null;
  let onFooterChange = null;
  let debounceTimer = null;

  function init() {
    // Logo section
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

    // Footer section
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

    container.append(logoSection, footerSection);
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

  function setOnLogoChange(fn) { onLogoChange = fn; }
  function setOnFooterChange(fn) { onFooterChange = fn; }

  return { init, setData, setOnLogoChange, setOnFooterChange };
})();
