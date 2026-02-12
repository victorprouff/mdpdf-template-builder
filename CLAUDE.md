# CLAUDE.md

## Projet

mdpdf-template-builder — éditeur visuel de templates pour mdpdf. Node.js (Express), vanilla JS côté client, pas de bundler.

## Commandes

```bash
npm start        # Lancer le serveur (port 3000)
npm run dev      # Lancer en mode watch (--watch)
```

Pas de tests automatisés. Vérification manuelle via le navigateur sur http://localhost:3000.

## Architecture

### Server (Node.js / Express)

- `server/index.js` — Point d'entrée, monte Express + WebSocket
- `server/routes/api.js` — API REST + génération du HTML de preview (iframe A4)
- `server/services/template-service.js` — CRUD fichiers templates (`~/.mdpdf/templates/`)
- `server/services/css-generator.js` — Extraction des styles heading côté serveur
- `server/services/markdown-service.js` — Rendu Markdown (marked + highlight.js), strip du front matter
- `server/websocket.js` — WebSocket (ws) + chokidar file watcher

### Client (vanilla JS, pattern IIFE)

Chaque module est un IIFE qui expose un objet global :

- `public/js/app.js` — Orchestrateur principal, wire tous les modules ensemble
- `public/js/controls.js` — `Controls` : panneau h1-h6 (font-size, color, text-align)
- `public/js/css-editor.js` — `CssEditor` : wrapper CodeMirror (mode CSS, thème material-darker)
- `public/js/header-footer.js` — `HeaderFooter` : upload logo + textarea footer
- `public/js/preview.js` — `Preview` : gestion iframe, scaling A4, hot CSS swap
- `public/js/template-selector.js` — `TemplateSelector` : dropdown + refresh
- `public/js/websocket-client.js` — `WsClient` : client WebSocket auto-reconnect

### CSS

- `public/css/app.css` — Layout + variables de thème (`:root` dark, `[data-theme="light"]`)
- `public/css/controls.css` — Styles des contrôles, boutons, header-footer section, CodeMirror overrides
- `public/css/preview.css` — Iframe preview (position absolute + transform scale)

## Templates

Stockés dans `~/.mdpdf/templates/<nom>/`. Fichiers :
- `template.css` — CSS avec `:root` (variables `--hN-property`), `@page`, headings
- `header.html` — Placeholders `{{LOGO}}` et `{{DATE}}`
- `footer.html` — Texte wrappé dans un div stylé
- `logo.png` — Optionnel, chargé en base64

## Conventions

- **Variables CSS des templates** : `--h1-font-size`, `--h1-color`, `--h1-text-align`, etc.
- **Variables CSS du thème UI** : `--bg-body`, `--bg-panel`, `--text-primary`, `--accent`, etc.
- **Pas de framework** côté client, pas de bundler, pas de TypeScript
- **Modules IIFE** : chaque fichier JS expose un objet global (ex: `const Controls = (() => { ... })()`)
- Les scripts sont chargés dans l'ordre des dépendances dans `index.html`
- **Sauvegarde auto** : debounce 500ms pour CSS, footer, logo
- **Preview** : l'iframe fait 794x1123px (A4 96dpi), scalée avec `transform: scale()`

## API REST

- `GET /api/templates` — Liste
- `GET /api/templates/:name` — Charge (css, header, footer, logo base64)
- `POST /api/templates` — Crée un nouveau template `{ name }`
- `PUT /api/templates/:name/css` — Sauvegarde CSS `{ css }`
- `PUT /api/templates/:name/footer` — Sauvegarde footer `{ text }` (texte brut, converti en HTML)
- `POST /api/templates/:name/logo` — Upload logo `{ data }` (base64 data URI, limit 5MB)
- `GET /api/preview/:name` — HTML complet pour l'iframe

## Points d'attention

- Le reset CSS de la preview (`* { margin: 0; padding: 0; }`) nécessite de re-déclarer `padding-left` sur `ul/ol` pour l'indentation des listes
- Le front matter YAML est strippé avant le rendu Markdown
- La preview supprime les règles `@page` et `position: running()` (CSS Paged Media non supporté par le navigateur)
- Header/footer de la preview utilisent des hauteurs basées sur les marges `@page`
