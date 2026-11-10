// Light / dark toggle. One source of truth: the `data-theme` attribute on <html>.
// We persist the user's pick in localStorage. Default is dark.

import { state } from './state.js';
import { load, save } from '../utils/storage.js';

export function loadTheme() {
  const saved = load('corner-theme');
  if (saved === 'light') {
    state.theme = 'light';
    document.documentElement.setAttribute('data-theme', 'light');
  }
}

export function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  if (state.theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  save('corner-theme', state.theme);
}

// Shared SVG icon pair so every nav renders the same sun/moon button.
export const themeToggleHTML = `
  <button class="theme-btn" aria-label="Toggle theme" data-theme-toggle>
    <svg class="moon" width="14" height="14" viewBox="0 0 18 18" fill="none">
      <path d="M15.5 10.5A6.5 6.5 0 1 1 7.5 2.5 5.5 5.5 0 0 0 15.5 10.5z" fill="currentColor"/>
    </svg>
    <svg class="sun" width="14" height="14" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="3.4" fill="currentColor"/>
      <g stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="9" y1="1.5" x2="9" y2="3.3"/>
        <line x1="9" y1="14.7" x2="9" y2="16.5"/>
        <line x1="1.5" y1="9" x2="3.3" y2="9"/>
        <line x1="14.7" y1="9" x2="16.5" y2="9"/>
        <line x1="3.7" y1="3.7" x2="5" y2="5"/>
        <line x1="13" y1="13" x2="14.3" y2="14.3"/>
        <line x1="3.7" y1="14.3" x2="5" y2="13"/>
        <line x1="13" y1="5" x2="14.3" y2="3.7"/>
      </g>
    </svg>
  </button>
`;

// Call once after main.js injects the page — wires every theme toggle on screen.
export function initThemeButtons() {
  document.querySelectorAll('[data-theme-toggle]').forEach((b) =>
    b.addEventListener('click', toggleTheme)
  );
}
