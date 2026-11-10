// Entry point. Imports everything, injects the HTML, wires up handlers,
// and boots the first view based on the URL hash.

import './style.css';

import { state } from './core/state.js';
import { initNav, bootFromHash, nav } from './core/nav.js';
import { loadTheme, initThemeButtons } from './core/theme.js';
import { initChat, chatDrawerHTML } from './core/chat.js';
import { toastHTML } from './core/toast.js';
import { getSession, onAuthChange } from './core/supabase.js';
import { ensureProfile, loadAllProfiles, subscribeProfiles } from './core/profile.js';

import { landingHTML, initLanding, refreshLandingAuth } from './views/landing.js';
import { createHTML, initCreate } from './views/create.js';
import { appNavHTML, initAppShell } from './views/app-shell.js';
import { plazaHTML, initPlaza } from './views/plaza.js';
import { councilHTML, initCouncil } from './views/council.js';
import { suggestionsHTML, initSuggestions, loadSugComments } from './views/suggestions.js';
import { eventsHTML, initEvents } from './views/events.js';
import { guideHTML, initGuide } from './views/guide.js';
import { membersHTML, initMembers } from './views/members.js';

function hydrateAuth(session) {
  if (!session) { state.auth = null; return; }
  const u = session.user;
  state.auth = {
    id: u.id,
    github_username: u.user_metadata?.user_name || 'anon',
    avatar_url: u.user_metadata?.avatar_url || null,
  };
  state.avatar.name = state.auth.github_username;
}

async function boot() {
  loadTheme();
  loadSugComments();

  const session = await getSession();
  hydrateAuth(session);

  await loadAllProfiles();
  if (state.auth) await ensureProfile();

  document.body.innerHTML = `
    <section id="landing" class="view active">${landingHTML}</section>
    <section id="create" class="view">${createHTML}</section>
    <section id="app" class="view">
      ${appNavHTML}
      <div class="subview active" data-sub="plaza">${plazaHTML}</div>
      <div class="subview" data-sub="council">${councilHTML}</div>
      <div class="subview" data-sub="suggestions">${suggestionsHTML}</div>
      <div class="subview" data-sub="events">${eventsHTML}</div>
      <div class="subview" data-sub="guide">${guideHTML}</div>
      <div class="subview" data-sub="members">${membersHTML}</div>
    </section>
    ${chatDrawerHTML}
    ${toastHTML}
  `;

  initLanding();
  initCreate();
  initAppShell();
  initPlaza();
  initCouncil();
  initSuggestions();
  initEvents();
  initGuide();
  initMembers();
  initNav();
  initChat();
  initThemeButtons();

  subscribeProfiles(() => {
    // re-render members if visible
    import('./views/members.js').then(m => m.renderMembers());
  });

  onAuthChange((session) => {
    const wasSignedIn = !!state.auth;
    hydrateAuth(session);
    // Calling Supabase inside onAuthStateChange can deadlock supabase-js,
    // so the profile work runs right after this callback returns.
    setTimeout(async () => {
      if (session) await ensureProfile();
      await loadAllProfiles();
    }, 0);
    refreshLandingAuth();
    if (!wasSignedIn && session) nav('create');
  });

  // After a GitHub OAuth return, jump straight to the avatar creator once.
  try {
    const target = sessionStorage.getItem('corner-post-auth');
    if (target && state.auth) {
      sessionStorage.removeItem('corner-post-auth');
      nav(target);
      return;
    }
  } catch (e) {}

  bootFromHash();
}

boot();
