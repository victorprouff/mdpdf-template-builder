const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const templateService = require('../services/template-service');
const { renderMarkdown } = require('../services/markdown-service');

const sampleMdPath = path.join(__dirname, '..', '..', 'data', 'sample.md');
const sampleMd = fs.readFileSync(sampleMdPath, 'utf-8');

// List available templates
router.get('/templates', (req, res) => {
  res.json(templateService.listTemplates());
});

// Load a specific template
router.get('/templates/:name', (req, res) => {
  const template = templateService.loadTemplate(req.params.name);
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Save CSS for a template
router.put('/templates/:name/css', express.json(), (req, res) => {
  try {
    templateService.saveCss(req.params.name, req.body.css);
    res.json({ ok: true });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// Preview: full HTML page for the iframe
router.get('/preview/:name', (req, res) => {
  const template = templateService.loadTemplate(req.params.name);
  if (!template) {
    return res.status(404).send('Template not found');
  }

  const bodyHtml = renderMarkdown(sampleMd);
  const date = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  let headerHtml = template.header
    .replace(/\{\{LOGO\}\}/g, template.logo || '')
    .replace(/\{\{DATE\}\}/g, date);
  let footerHtml = template.footer;

  // Strip @page rules from template CSS for browser preview
  // and translate margins into padding on .page-body
  const { previewCss, margins } = stripPageRules(template.css);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style id="highlight-css">
${getHighlightCss()}
</style>
<style id="preview-layout">
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 794px; height: 1123px; overflow: hidden; }
.page {
  width: 794px;
  height: 1123px;
  position: relative;
  background: white;
  display: flex;
  flex-direction: column;
}
.page-header {
  padding: ${margins.top} ${margins.right} 0 ${margins.left};
  flex-shrink: 0;
}
.page-body {
  flex: 1;
  padding: 15px ${margins.right} 15px ${margins.left};
  overflow: hidden;
}
.page-footer {
  padding: 0 ${margins.right} ${margins.bottom} ${margins.left};
  flex-shrink: 0;
}
</style>
<style id="template-css">
${previewCss}
</style>
</head>
<body>
<div class="page">
  <div class="page-header">${headerHtml}</div>
  <div class="page-body">${bodyHtml}</div>
  <div class="page-footer">${footerHtml}</div>
</div>
</body>
</html>`;

  res.type('html').send(html);
});

function stripPageRules(css) {
  const margins = { top: '20px', right: '10mm', bottom: '20px', left: '10mm' };

  // Extract margins from @page
  const pageMatch = css.match(/@page\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/s);
  if (pageMatch) {
    const pageBlock = pageMatch[0];
    const mt = pageBlock.match(/margin-top\s*:\s*([^;]+);/);
    const mb = pageBlock.match(/margin-bottom\s*:\s*([^;]+);/);
    const ml = pageBlock.match(/margin-left\s*:\s*([^;]+);/);
    const mr = pageBlock.match(/margin-right\s*:\s*([^;]+);/);
    if (mt) margins.top = mt[1].trim();
    if (mb) margins.bottom = mb[1].trim();
    if (ml) margins.left = ml[1].trim();
    if (mr) margins.right = mr[1].trim();
  }

  // Remove @page block and running() positions (not supported in browser)
  let previewCss = css
    .replace(/@page\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}/gs, '')
    .replace(/position\s*:\s*running\([^)]+\)\s*;/g, '')
    .replace(/page-break-after\s*:\s*avoid\s*;/g, '')
    .replace(/page-break-inside\s*:\s*avoid\s*;/g, '');

  return { previewCss: previewCss.trim(), margins };
}

function getHighlightCss() {
  try {
    return fs.readFileSync(
      path.join(__dirname, '..', '..', 'node_modules', 'highlight.js', 'styles', 'github.css'),
      'utf-8'
    );
  } catch {
    return '';
  }
}

module.exports = router;
