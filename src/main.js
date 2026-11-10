// Entry point. Imports everything, injects the HTML, wires up handlers,
// and boots the first view based on the URL hash.

import './style.css';

import { initNav, bootFromHash } from './core/nav.js';
import { loadTheme, initThemeButtons } from './core/theme.js';
import { loadChats, initChat, chatDrawerHTML } from './core/chat.js';
import { toastHTML } from './core/toast.js';

import { landingHTML, initLanding } from './views/landing.js';
import { createHTML, initCreate } from './views/create.js';
import { appNavHTML, initAppShell } from './views/app-shell.js';
import { plazaHTML, initPlaza } from './views/plaza.js';
import { councilHTML, initCouncil } from './views/council.js';
import { suggestionsHTML, initSuggestions, loadSugComments } from './views/suggestions.js';
import { eventsHTML, initEvents } from './views/events.js';
import { guideHTML, initGuide } from './views/guide.js';
import { membersHTML, initMembers } from './views/members.js';

// 1. Preload persisted state before any render.
loadTheme();
loadChats();
loadSugComments();

// 2. Build the page in one shot.
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

// 3. Wire up each view's handlers now that the DOM exists.
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

// 4. Route to whatever view matches the current URL hash.
bootFromHash();
