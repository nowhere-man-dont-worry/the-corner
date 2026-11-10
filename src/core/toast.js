// Tiny toast notifier, used from everywhere.

let toastTimer = null;

export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

export const toastHTML = `<div id="toast"></div>`;
