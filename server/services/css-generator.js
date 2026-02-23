/**
 * Extract heading properties from CSS text.
 * Returns an object keyed by selector (h1-h6) with font-size, color, text-align.
 */
function extractHeadingStyles(css) {
  const vars = parseCssVars(css);
  const headings = {};
  for (let i = 1; i <= 6; i++) {
    headings[`h${i}`] = { fontSize: '', fontSizeUnit: 'pt', color: '', textAlign: '', marginTop: '', marginBottom: '', marginUnit: 'px', pageBreakBefore: false };
  }
  const MARGIN_DEFAULTS = {
    h1: { marginTop: '0', marginBottom: '15' },
    h2: { marginTop: '5', marginBottom: '5' },
    h3: { marginTop: '20', marginBottom: '10' },
    h4: { marginTop: '20', marginBottom: '10' },
    h5: { marginTop: '0', marginBottom: '0' },
    h6: { marginTop: '0', marginBottom: '0' },
  };
  for (let i = 1; i <= 6; i++) {
    Object.assign(headings[`h${i}`], MARGIN_DEFAULTS[`h${i}`]);
  }

  // Match standalone heading rules: h1 { ... }, h2 { ... } etc.
  // Avoid matching combined selectors like "h1, h2, h3 { ... }"
  const ruleRegex = /(?:^|\n)\s*(h[1-6])\s*\{([^}]*)\}/g;
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1];
    const body = match[2];

    const fontSize = extractProperty(body, 'font-size');
    if (fontSize) {
      const parsed = parseSize(resolveVar(fontSize, vars));
      headings[selector].fontSize = parsed.value;
      headings[selector].fontSizeUnit = parsed.unit;
    }

    const color = extractProperty(body, 'color');
    if (color) {
      headings[selector].color = resolveVar(color, vars);
    }

    const textAlign = extractProperty(body, 'text-align');
    if (textAlign) {
      headings[selector].textAlign = resolveVar(textAlign, vars);
    }

    const marginTop = extractProperty(body, 'margin-top');
    if (marginTop) {
      const parsed = parseSize(resolveVar(marginTop, vars));
      headings[selector].marginTop = parsed.value;
      headings[selector].marginUnit = parsed.unit;
    }

    const marginBottom = extractProperty(body, 'margin-bottom');
    if (marginBottom) {
      const parsed = parseSize(resolveVar(marginBottom, vars));
      headings[selector].marginBottom = parsed.value;
      if (!marginTop) headings[selector].marginUnit = parsed.unit;
    }

    const pageBreakBefore = extractProperty(body, 'page-break-before');
    if (pageBreakBefore) {
      headings[selector].pageBreakBefore = resolveVar(pageBreakBefore, vars) === 'always';
    }
  }

  return headings;
}

/**
 * Update a CSS property for a specific heading selector.
 * If the rule exists, update the property in place. If the property doesn't exist, add it.
 * If the rule doesn't exist, append it.
 */
function updateHeadingProperty(css, selector, property, value) {
  // Find the standalone rule for this selector
  const ruleRegex = new RegExp(`((?:^|\\n)(\\s*${selector}\\s*\\{))([^}]*)(\\})`, 'g');
  let match = null;
  let lastMatch = null;

  // Find the first standalone rule (not part of a comma-separated group)
  while ((match = ruleRegex.exec(css)) !== null) {
    // Check that the character before the selector isn't a comma or another selector
    const before = css.substring(Math.max(0, match.index - 5), match.index);
    if (!before.match(/,\s*$/)) {
      lastMatch = match;
      break;
    }
  }

  if (!lastMatch) {
    // Rule doesn't exist, append it
    return css.trimEnd() + `\n\n${selector} {\n    ${property}: ${value};\n}\n`;
  }

  const ruleBody = lastMatch[3];
  const propRegex = new RegExp(`([ \\t]*${property}\\s*:\\s*)([^;]*)(;)`);
  const propMatch = ruleBody.match(propRegex);

  if (propMatch) {
    // Replace existing property value
    const newBody = ruleBody.replace(propRegex, `$1${value}$3`);
    return css.substring(0, lastMatch.index) +
      lastMatch[1] + newBody + lastMatch[4] +
      css.substring(lastMatch.index + lastMatch[0].length);
  } else {
    // Add property to existing rule
    const newBody = ruleBody.trimEnd() + `\n    ${property}: ${value};\n`;
    return css.substring(0, lastMatch.index) +
      lastMatch[1] + newBody + lastMatch[4] +
      css.substring(lastMatch.index + lastMatch[0].length);
  }
}

function parseCssVars(css) {
  const vars = {};
  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  if (rootMatch) {
    const varRegex = /--([\w-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = varRegex.exec(rootMatch[1])) !== null) {
      vars[`--${m[1]}`] = m[2].trim();
    }
  }
  return vars;
}

function resolveVar(value, vars) {
  if (!value) return value;
  const m = value.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (m && vars[m[1]]) return vars[m[1]];
  return value;
}

function extractProperty(ruleBody, property) {
  const regex = new RegExp(`${property}\\s*:\\s*([^;]+);`);
  const match = ruleBody.match(regex);
  return match ? match[1].trim() : null;
}

function parseSize(value) {
  const match = value.match(/^([\d.]+)\s*(pt|px|em|rem)$/);
  if (match) {
    return { value: match[1], unit: match[2] };
  }
  return { value: value, unit: 'pt' };
}

module.exports = { extractHeadingStyles, updateHeadingProperty };
