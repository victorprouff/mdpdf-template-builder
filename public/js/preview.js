/**
 * Preview iframe management: load, scale to fit, hot-swap CSS.
 */
const Preview = (() => {
  const container = document.getElementById('preview-container');
  const iframe = document.getElementById('preview-iframe');

  function load(templateName) {
    iframe.src = `/api/preview/${encodeURIComponent(templateName)}`;
    iframe.onload = () => scaleToFit();
  }

  /**
   * Hot-swap only the template CSS inside the iframe without full reload.
   */
  function updateCss(cssText) {
    const doc = iframe.contentDocument;
    if (!doc) return;
    const styleEl = doc.getElementById('template-css');
    if (styleEl) {
      // Strip @page rules and running() for browser preview
      styleEl.textContent = stripForPreview(cssText);
    }
  }

  function stripForPreview(css) {
    return css
      .replace(/@page\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/gs, '')
      .replace(/position\s*:\s*running\([^)]+\)\s*;/g, '')
      .replace(/page-break-after\s*:\s*avoid\s*;/g, '')
      .replace(/page-break-inside\s*:\s*avoid\s*;/g, '');
  }

  function scaleToFit() {
    const cw = container.clientWidth - 40;
    const ch = container.clientHeight - 40;
    const pageW = 794;
    const pageH = 1123;
    const scale = Math.min(cw / pageW, ch / pageH, 1);
    iframe.style.transform = `scale(${scale})`;
  }

  window.addEventListener('resize', scaleToFit);

  return { load, updateCss, scaleToFit };
})();
