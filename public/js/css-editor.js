/**
 * CodeMirror CSS editor wrapper.
 */
const CssEditor = (() => {
  let editor = null;
  let onChange = null;
  let suppressChange = false;

  function init() {
    editor = CodeMirror(document.getElementById('css-editor-container'), {
      mode: 'css',
      theme: 'material-darker',
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 4,
      indentUnit: 4
    });

    let debounceTimer = null;
    editor.on('change', () => {
      if (suppressChange) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (onChange) onChange(editor.getValue());
      }, 300);
    });
  }

  function setValue(css) {
    if (!editor) return;
    suppressChange = true;
    const cursor = editor.getCursor();
    const scroll = editor.getScrollInfo();
    editor.setValue(css);
    editor.setCursor(cursor);
    editor.scrollTo(scroll.left, scroll.top);
    suppressChange = false;
  }

  function getValue() {
    return editor ? editor.getValue() : '';
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  return { init, setValue, getValue, setOnChange };
})();
