// Entry point. Imports everything, injects the HTML, wires up handlers,
// and boots the first view based on the URL hash.

import 'flag-icons/css/flag-icons.min.css';
import './style.css';

import { state } from './core/state.js';
import { initNav, bootFromHash, nav } from './core/nav.js';
import { loadTheme, initThemeButtons } from './core/theme.js';
import { initChat, chatDrawerHTML } from './core/chat.js';
import { toastHTML, toastAction } from './core/toast.js';
import { getSession, onAuthChange, signInWithGitHub } from './core/supabase.js';
import { ensureProfile, loadAllProfiles, subscribeProfiles, loadIsAdmin } from './core/profile.js';

import { landingHTML, initLanding, refreshLandingAuth } from './views/landing.js';
import { createHTML, initCreate } from './views/create.js';
import { appNavHTML, initAppShell } from './views/app-shell.js';
import { plazaHTML, initPlaza } from './views/plaza.js';
import { councilHTML, initCouncil } from './views/council.js';
import { suggestionsHTML, initSuggestions } from './views/suggestions.js';
import { eventsHTML, initEvents } from './views/events.js';
import { guideHTML, initGuide } from './views/guide.js';
import { membersHTML, initMembers, renderMembers } from './views/members.js';
import { gamesHTML, initGames } from './views/games.js';
import { startPresence, onPresenceChange, syncPresenceMembers } from './core/presence.js';
import { renderChatCount } from './core/chat.js';
import { renderOnlineChip } from './views/app-shell.js';

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

// Supabase sends failed OAuth round-trips back as ?error=…&error_description=…
// (sometimes in the hash). Read it, clean the URL, and offer a retry.
function takeAuthError() {
  const q = new URLSearchParams(location.search);
  const h = new URLSearchParams(location.hash.replace(/^#/, ''));
  const desc = q.get('error_description') || h.get('error_description');
  const code = q.get('error') || h.get('error');
  if (!desc && !code) return null;
  const route = h.has('error') ? '#landing' : location.hash;
  history.replaceState(null, '', location.pathname + route);
  return (desc || code).replace(/\+/g, ' ');
}

async function boot() {
  const authError = takeAuthError();
  loadTheme();

  const session = await getSession();
  hydrateAuth(session);

  if (state.auth) {
    await ensureProfile();
    await Promise.all([loadAllProfiles(), loadIsAdmin()]);
  }

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
      <div class="subview" data-sub="games">${gamesHTML}</div>
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
  initGames();
  initNav();
  initChat();
  initThemeButtons();

  onPresenceChange(() => { renderOnlineChip(); renderChatCount(); renderMembers(); });
  if (state.auth) startPresence();

  if (state.auth) {
    subscribeProfiles(() => {
      syncPresenceMembers();   // a new member's topic, and fresh looks for avatars
      import('./views/members.js').then(m => m.renderMembers());
    });
  }

  onAuthChange((session) => {
    const wasSignedIn = !!state.auth;
    hydrateAuth(session);
    // Calling Supabase inside onAuthStateChange can deadlock supabase-js,
    // so the profile work runs right after this callback returns.
    setTimeout(async () => {
      if (session) await ensureProfile();
      await Promise.all([loadAllProfiles(), loadIsAdmin()]);
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
  if (authError) {
    toastAction(`Sign-in didn't finish: ${authError}.`, 'Try again', signInWithGitHub);
  }
}

boot();
