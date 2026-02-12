/**
 * Template selector dropdown.
 */
const TemplateSelector = (() => {
  const select = document.getElementById('template-select');
  let onChange = null;

  async function load() {
    const res = await fetch('/api/templates');
    const templates = await res.json();
    select.innerHTML = '';
    templates.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    return templates;
  }

  function current() {
    return select.value;
  }

  function setOnChange(fn) {
    onChange = fn;
  }

  async function refresh(selectName) {
    const res = await fetch('/api/templates');
    const templates = await res.json();
    select.innerHTML = '';
    templates.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      select.appendChild(opt);
    });
    if (selectName && templates.includes(selectName)) {
      select.value = selectName;
    }
    return templates;
  }

  select.addEventListener('change', () => {
    if (onChange) onChange(select.value);
  });

  return { load, current, setOnChange, refresh };
})();
