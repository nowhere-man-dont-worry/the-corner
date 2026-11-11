// Searchable country picker (ARIA 1.2 combobox + listbox).
//
// Replaces the native <input list>/<datalist>: native popups can't show flag
// images and ignore our light/dark theme. Type to filter by country name or
// ISO code; Up/Down move, Enter or Tab pick, Escape closes, clicking outside
// closes. The first row clears the country. The closed state shows the
// selected flag in front of the name.
//
//   const cbx = createCountryCombobox(el, { id, value, onChange });
//   cbx.setValue('PK');   // programmatic, does not call onChange
//   cbx.open();           // focus + open the list

import { COUNTRY_CODES, countryName, flagHTML, isCountryCode } from '../core/countries.js';
import { escapeHtml } from '../utils/html.js';

let sortedCache = null;
function sortedCountries() {
  if (!sortedCache) {
    sortedCache = COUNTRY_CODES
      .map((code) => ({ code, name: countryName(code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
  return sortedCache;
}

function filterCountries(query) {
  const q = query.trim().toLowerCase();
  const all = sortedCountries();
  if (!q) return all;
  const exactCode = [], starts = [], contains = [];
  for (const c of all) {
    const name = c.name.toLowerCase();
    if (c.code.toLowerCase() === q) exactCode.push(c);
    else if (name.startsWith(q)) starts.push(c);
    else if (name.includes(q) || (q.length <= 2 && c.code.toLowerCase().startsWith(q))) contains.push(c);
  }
  return [...exactCode, ...starts, ...contains];
}

export function createCountryCombobox(container, { id, value = null, onChange, placeholder = 'where you\'re from — type to search' } = {}) {
  const listId = `${id}-list`;
  container.innerHTML = `
    <div class="cbx">
      <div class="cbx-field">
        <span class="cbx-flag" aria-hidden="true"></span>
        <input id="${id}" class="cbx-input" type="text" role="combobox"
          aria-expanded="false" aria-controls="${listId}" aria-autocomplete="list"
          aria-haspopup="listbox" autocomplete="off" spellcheck="false"
          placeholder="${escapeHtml(placeholder)}"/>
        <button type="button" class="cbx-clear" aria-label="Clear country" hidden>×</button>
        <button type="button" class="cbx-toggle" tabindex="-1" aria-label="Show countries">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>
      <ul class="cbx-list" id="${listId}" role="listbox" aria-label="Countries" hidden></ul>
    </div>`;

  const root = container.querySelector('.cbx');
  const input = root.querySelector('.cbx-input');
  const flagSlot = root.querySelector('.cbx-flag');
  const clearBtn = root.querySelector('.cbx-clear');
  const toggleBtn = root.querySelector('.cbx-toggle');
  const list = root.querySelector('.cbx-list');

  let selected = isCountryCode(value) ? value : null;
  let options = [];          // [{ code: 'PK' | '' (clear), name }]
  let active = -1;
  let isOpen = false;

  function showSelected() {
    input.value = selected ? countryName(selected) : '';
    flagSlot.innerHTML = selected ? flagHTML(selected) : '';
    root.classList.toggle('has-value', !!selected);
    clearBtn.hidden = !selected;
  }

  function renderList() {
    const matches = filterCountries(isOpen && input.value !== (selected ? countryName(selected) : '') ? input.value : '');
    options = selected ? [{ code: '', name: 'No country (clear)' }, ...matches] : matches;
    if (!options.length) {
      list.innerHTML = `<li class="cbx-empty" role="presentation">no country matches “${escapeHtml(input.value.trim())}”</li>`;
      setActive(-1);
      return;
    }
    list.innerHTML = options.map((o, i) => o.code === ''
      ? `<li id="${id}-opt-clear" class="cbx-opt cbx-opt-clear" role="option" aria-selected="false" data-i="${i}">
           <span class="cbx-opt-flag" aria-hidden="true">×</span><span class="cbx-opt-name">${o.name}</span></li>`
      : `<li id="${id}-opt-${o.code}" class="cbx-opt" role="option" aria-selected="${o.code === selected}" data-i="${i}">
           <span class="cbx-opt-flag">${flagHTML(o.code)}</span>
           <span class="cbx-opt-name">${escapeHtml(o.name)}</span>
           <span class="cbx-opt-code">${o.code}</span></li>`
    ).join('');
  }

  function setActive(i) {
    active = i;
    list.querySelectorAll('.cbx-opt').forEach((el) => el.classList.toggle('active', +el.dataset.i === i));
    const el = list.querySelector(`.cbx-opt[data-i="${i}"]`);
    if (el) {
      input.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    root.classList.add('open');
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    renderList();
    list.scrollTop = 0;
    const cur = options.findIndex((o) => o.code && o.code === selected);
    setActive(cur);
  }

  function close({ restore = true } = {}) {
    if (!isOpen) { if (restore) showSelected(); return; }
    isOpen = false;
    root.classList.remove('open');
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
    if (restore) showSelected();
  }

  function choose(i) {
    const o = options[i];
    if (!o) return;
    const next = o.code || null;
    const changed = next !== selected;
    selected = next;
    close();
    if (changed) onChange?.(selected);
  }

  input.addEventListener('focus', () => input.select());
  input.addEventListener('click', open);
  input.addEventListener('input', () => {
    if (!isOpen) open();
    renderList();
    // With a query, highlight the best match so Enter picks it.
    setActive(input.value.trim() && options.length ? options.findIndex((o) => o.code) : -1);
  });
  input.addEventListener('keydown', (e) => {
    const n = options.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) { open(); if (active < 0 && n) setActive(0); return; }
        if (n) setActive(active < n - 1 ? active + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) { open(); if (n) setActive(n - 1); return; }
        if (n) setActive(active > 0 ? active - 1 : n - 1);
        break;
      case 'Home':
        if (isOpen && n) { e.preventDefault(); setActive(0); }
        break;
      case 'End':
        if (isOpen && n) { e.preventDefault(); setActive(n - 1); }
        break;
      case 'Enter':
        if (isOpen) {
          e.preventDefault();
          if (active >= 0) choose(active); else close();
        }
        break;
      case 'Escape':
        if (isOpen) { e.preventDefault(); e.stopPropagation(); close(); }
        break;
      case 'Tab':
        if (isOpen) { if (active >= 0) choose(active); else close(); }
        break;
    }
  });

  // Keep focus in the input while clicking an option.
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => {
    const li = e.target.closest('.cbx-opt');
    if (li) choose(+li.dataset.i);
  });
  list.addEventListener('mousemove', (e) => {
    const li = e.target.closest('.cbx-opt');
    if (li && +li.dataset.i !== active) setActive(+li.dataset.i);
  });

  toggleBtn.addEventListener('mousedown', (e) => e.preventDefault());
  toggleBtn.addEventListener('click', () => {
    if (isOpen) close(); else { input.focus(); open(); }
  });
  clearBtn.addEventListener('click', () => {
    const changed = selected !== null;
    selected = null;
    close();
    input.focus();
    if (changed) onChange?.(null);
  });

  document.addEventListener('pointerdown', (e) => {
    if (isOpen && !root.contains(e.target)) close();
  });

  showSelected();

  return {
    setValue(code) {
      selected = isCountryCode(code) ? code : null;
      if (isOpen) close(); else showSelected();
    },
    getValue: () => selected,
    open() {
      input.focus();
      open();
    },
  };
}
