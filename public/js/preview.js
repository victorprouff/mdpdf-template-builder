/**
 * Preview iframe management: load, scale to fit, hot-swap CSS.
 */
const Preview = (() => {
  const container = document.getElementById('preview-container');
  const iframe = document.getElementById('preview-iframe');
  let orientation = 'portrait';

  function load(templateName) {
    iframe.src = `/api/preview/${encodeURIComponent(templateName)}?orientation=${orientation}`;
    iframe.onload = () => scaleToFit();
  }

  function setOrientation(o) {
    orientation = o;
    const [w, h] = o === 'landscape' ? [1123, 794] : [794, 1123];
    iframe.style.width = `${w}px`;
    iframe.style.height = `${h}px`;
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
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const pageW = orientation === 'landscape' ? 1123 : 794;
    const pageH = orientation === 'landscape' ? 794 : 1123;
    const scale = Math.min(cw / pageW, ch / pageH, 1);
    const scaledW = pageW * scale;
    const scaledH = pageH * scale;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.left = `${(cw - scaledW) / 2}px`;
    iframe.style.top = `${(ch - scaledH) / 2}px`;
  }

  window.addEventListener('resize', scaleToFit);

  return { load, updateCss, scaleToFit, setOrientation };
})();
