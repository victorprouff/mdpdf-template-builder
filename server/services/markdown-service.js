const { Marked } = require('marked');
const hljs = require('highlight.js');

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language }).value;
      return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
    }
  }
});

function renderMarkdown(md) {
  // Strip front matter (---...---)
  const stripped = md.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return marked.parse(stripped);
}

module.exports = { renderMarkdown };
