// View routing. One function to switch screens.
// Also responsible for toggling `body.app-view` which controls the chat column's
// visibility on wide screens.

import { state } from './state.js';
import { renderChat, toggleChat } from './chat.js';

export const SUBVIEWS = ['plaza', 'council', 'suggestions', 'events', 'guide', 'members'];

export function nav(view, sub) {
  // Auth gate: anything past landing requires a session.
  if (!state.auth && (view === 'create' || view === 'app' || SUBVIEWS.includes(view))) {
    view = 'landing';
    sub = undefined;
  }
  state.view = view;
  if (sub) state.sub = sub;

  // Show/hide top-level view sections.
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === view));

  // If the caller passed a subview name directly (e.g. nav('plaza')), treat the
  // whole thing as entering the app and routing to that subview.
  if (view === 'app' || SUBVIEWS.includes(view)) {
    document.getElementById('app').classList.add('active');
    document.getElementById('landing').classList.remove('active');
    document.getElementById('create').classList.remove('active');

    const targetSub = view === 'app' ? state.sub : view;
    state.sub = targetSub;

    document.querySelectorAll('.subview').forEach((s) =>
      s.classList.toggle('active', s.dataset.sub === targetSub)
    );
    document.querySelectorAll('.navtab').forEach((n) =>
      n.classList.toggle('on', n.dataset.sub === targetSub)
    );
    if (targetSub === 'plaza') {
      setTimeout(() => document.getElementById('room')?.focus(), 50);
    }
  }

  window.scrollTo(0, 0);
  location.hash = view === 'app' ? state.sub : view;

  const inApp = view === 'app' || SUBVIEWS.includes(view);
  document.body.classList.toggle('app-view', inApp);
  if (inApp) renderChat();
  if (state.chatOpen && !inApp) toggleChat();
}

export function initNav() {
  // Nav tabs within the app.
  document.querySelectorAll('.navtab').forEach((n) =>
    n.addEventListener('click', () => nav('app', n.dataset.sub))
  );

  // Hash routing — so you can share /#council or /#guide.
  window.addEventListener('hashchange', () => {
    const h = location.hash.replace('#', '');
    if (h === 'landing') nav('landing');
    else if (h === 'create') nav('create');
    else if (SUBVIEWS.includes(h)) nav('app', h);
  });
}

// Called once at boot to pick up any initial hash.
export function bootFromHash() {
  const h = location.hash.replace('#', '');
  if (!state.auth) { nav('landing'); return; }
  if (h === 'create') nav('create');
  else if (SUBVIEWS.includes(h)) nav('app', h);
  else nav('landing');
}
