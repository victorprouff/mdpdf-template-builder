const fs = require('fs');
const path = require('path');
const os = require('os');

const TEMPLATES_DIR = path.join(os.homedir(), '.mdpdf', 'templates');

function listTemplates() {
  if (!fs.existsSync(TEMPLATES_DIR)) return [];
  return fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function getTemplatePath(name) {
  return path.join(TEMPLATES_DIR, name);
}

function loadTemplate(name) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) return null;

  const result = { name, css: '', header: '', footer: '', logo: null };

  const cssPath = path.join(dir, 'template.css');
  if (fs.existsSync(cssPath)) {
    result.css = fs.readFileSync(cssPath, 'utf-8');
  }

  const headerPath = path.join(dir, 'header.html');
  if (fs.existsSync(headerPath)) {
    result.header = fs.readFileSync(headerPath, 'utf-8');
  }

  const footerPath = path.join(dir, 'footer.html');
  if (fs.existsSync(footerPath)) {
    result.footer = fs.readFileSync(footerPath, 'utf-8');
  }

  const logoPath = path.join(dir, 'logo.png');
  if (fs.existsSync(logoPath)) {
    const base64 = fs.readFileSync(logoPath, { encoding: 'base64' });
    result.logo = `data:image/png;base64,${base64}`;
  }

  return result;
}

function saveCss(name, css) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  fs.writeFileSync(path.join(dir, 'template.css'), css, 'utf-8');
}

function createTemplate(name) {
  const dir = getTemplatePath(name);
  if (fs.existsSync(dir)) {
    throw new Error(`Template "${name}" already exists`);
  }
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'template.css'), `\
:root {
    --h1-font-size: 24pt;
    --h1-color: #333333;
    --h2-font-size: 18pt;
    --h2-color: #333333;
    --logo-height: 60px;
    --show-date: 1;
}

@page {
    size: A4;
    margin-top: 25mm;
    margin-bottom: 20mm;
    margin-left: 15mm;
    margin-right: 15mm;
}

body {
    font-family: 'Segoe UI', Roboto, sans-serif;
    font-size: 11pt;
    color: #333;
    line-height: 1.6;
}

h1 {
    font-size: var(--h1-font-size);
    color: var(--h1-color);
}

h2 {
    font-size: var(--h2-font-size);
    color: var(--h2-color);
}
`, 'utf-8');

  fs.writeFileSync(path.join(dir, 'header.html'), `\
<div style="width: 100%; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 5mm; font-size: 11px;">
    <img src="{{LOGO}}" style="height: 60px; display: block;">
    <span style="color: #666; line-height: 1;">{{DATE}}</span>
</div>
`, 'utf-8');

  fs.writeFileSync(path.join(dir, 'footer.html'), `\
<div style="width: 100%; text-align: center; font-size: 9px; color: #666; line-height: 1.4;">
    Nom de l'entreprise
</div>
`, 'utf-8');
}

function saveFooter(name, text) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  const footerPath = path.join(dir, 'footer.html');

  // Preserve current visibility setting
  let hidden = false;
  if (fs.existsSync(footerPath)) {
    const existing = fs.readFileSync(footerPath, 'utf-8');
    hidden = /(<div\b[^>]*style=")display\s*:\s*none;/.test(existing);
  }

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const inner = lines.join(' <br>\n    ');
  let html = `<div style="width: 100%; text-align: center; font-size: 9px; color: #666; line-height: 1.4;">\n    ${inner}\n</div>\n`;

  if (hidden) {
    html = html.replace(/(<div\b[^>]*style=")/, '$1display: none; ');
  }

  fs.writeFileSync(footerPath, html, 'utf-8');
}

function savePadding(name, area, paddings) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  const file = area === 'header' ? 'header.html' : 'footer.html';
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');
  const paddingValue = `${paddings.top || '0'} ${paddings.right || '0'} ${paddings.bottom || '0'} ${paddings.left || '0'}`;

  // Replace existing padding in inline style
  if (/padding\s*:[^;"]+/.test(html)) {
    html = html.replace(/padding\s*:[^;"]+/, `padding: ${paddingValue}`);
  } else {
    // Add padding to the first style attribute
    html = html.replace(/style="/, `style="padding: ${paddingValue}; `);
  }

  fs.writeFileSync(filePath, html, 'utf-8');
}

function saveHeaderOptions(name, { logoHeight, showDate, showHeader = true, showLogo = true }) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  const filePath = path.join(dir, 'header.html');
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // Update logo height in img style
  const heightVal = logoHeight || '60px';
  if (/height\s*:\s*[\d]+px/.test(html)) {
    html = html.replace(/height\s*:\s*[\d]+px/, `height: ${parseInt(heightVal)}px`);
  }

  // Update logo visibility: use visibility: hidden (keeps space) so date stays aligned
  html = html.replace(/(<img\b[^>]*style="[^"]*?)visibility\s*:\s*(?:visible|hidden);\s*/g, '$1');
  if (showLogo === false) {
    html = html.replace(/(<img\b[^>]*style=")/, `$1visibility: hidden; `);
  }

  // Update date visibility on the span containing {{DATE}}
  html = html.replace(
    /(<span\s+style=")display\s*:\s*none;\s*([^"]*"[^>]*>\s*\{\{DATE\}\})/,
    '$1$2'
  );
  if (showDate === false) {
    html = html.replace(
      /(<span\s+style=")((?:(?!display\s*:\s*none)[^"])*"[^>]*>\s*\{\{DATE\}\})/,
      '$1display: none; $2'
    );
  }

  // Update header visibility: toggle display: flex <-> display: none on outer div
  const newHeaderDisplay = showHeader === false ? 'none' : 'flex';
  if (/(<div\b[^>]*style="[^"]*?)display\s*:\s*(?:flex|none)/.test(html)) {
    html = html.replace(
      /(<div\b[^>]*style="[^"]*?)display\s*:\s*(?:flex|none)/,
      `$1display: ${newHeaderDisplay}`
    );
  } else if (showHeader === false) {
    html = html.replace(/(<div\b[^>]*style=")/, `$1display: none; `);
  }

  fs.writeFileSync(filePath, html, 'utf-8');
}

function saveFooterOptions(name, { showFooter = true }) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  const filePath = path.join(dir, 'footer.html');
  if (!fs.existsSync(filePath)) return;

  let html = fs.readFileSync(filePath, 'utf-8');

  // Remove existing display: none if previously added
  html = html.replace(/(<div\b[^>]*style=")display\s*:\s*none;\s*/, '$1');

  if (showFooter === false) {
    html = html.replace(/(<div\b[^>]*style=")/, '$1display: none; ');
  }

  fs.writeFileSync(filePath, html, 'utf-8');
}

function saveLogo(name, dataUri) {
  const dir = getTemplatePath(name);
  if (!fs.existsSync(dir)) {
    throw new Error(`Template "${name}" not found`);
  }
  const match = dataUri.match(/^data:image\/\w+;base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }
  const buffer = Buffer.from(match[1], 'base64');
  fs.writeFileSync(path.join(dir, 'logo.png'), buffer);
}

module.exports = { listTemplates, loadTemplate, saveCss, getTemplatePath, TEMPLATES_DIR, createTemplate, saveFooter, saveLogo, savePadding, saveHeaderOptions, saveFooterOptions };
