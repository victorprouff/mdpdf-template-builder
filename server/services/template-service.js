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

module.exports = { listTemplates, loadTemplate, saveCss, getTemplatePath, TEMPLATES_DIR };
