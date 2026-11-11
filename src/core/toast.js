// Tiny toast notifier, used from everywhere.
//   toast('Saved.')                                   — text only
//   toastAction('Sign-in failed', 'Try again', fn)   — with one button

let toastTimer = null;

function show(t, ms) {
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show', 'has-action'), ms);
}

export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.classList.remove('has-action');
  t.textContent = msg;
  show(t, 2600);
}

export function toastAction(msg, label, onClick, ms = 10000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  const b = document.createElement('button');
  b.className = 'toast-action';
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => { t.classList.remove('show', 'has-action'); onClick(); });
  t.append(' ', b);
  t.classList.add('has-action');
  show(t, ms);
}

export const toastHTML = `<div id="toast" role="status" aria-live="polite"></div>`;
