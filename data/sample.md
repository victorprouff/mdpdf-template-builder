---
template: formation
---

# Titre principal du document

## Sous-titre de section

### Section détaillée

Ceci est un paragraphe de texte standard avec du **gras**, de l'*italique* et du `code inline`. Les templates md2pdf permettent de personnaliser l'apparence de chaque élément.

#### Sous-section

Voici un lien vers [un site web](https://example.com) et une citation :

> Les citations sont utiles pour mettre en avant des passages importants
> ou des témoignages.

##### Niveau 5

###### Niveau 6

## Listes

### Liste non ordonnée

- Premier élément
  - Sous-élément A
  - Sous-élément B
- Deuxième élément
- Troisième élément

### Liste ordonnée

1. Première étape
2. Deuxième étape
3. Troisième étape

## Tableau

| Colonne 1 | Colonne 2 | Colonne 3 |
|-----------|-----------|-----------|
| Cellule 1 | Cellule 2 | Cellule 3 |
| Cellule 4 | Cellule 5 | Cellule 6 |
| Cellule 7 | Cellule 8 | Cellule 9 |

## Code

```javascript
function generatePdf(markdown, options) {
  const html = marked.parse(markdown);
  const css = loadTemplate(options.template);
  return renderToPdf(html, css);
}
```

```css
h1 {
    color: var(--primary-color);
    font-size: 24pt;
}
```

## Texte final

Ce document sert de **preview** pour tester l'apparence d'un template md2pdf. Il contient tous les types d'éléments Markdown courants : titres, paragraphes, listes, tableaux, blocs de code et citations.
