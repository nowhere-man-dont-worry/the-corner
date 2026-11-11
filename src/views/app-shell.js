// The top nav bar shared by every app subview. Contains:
//  - logo + 6 tab buttons for subviews
//  - online count
//  - "Chat" button (visible only on narrow screens — on wide, the right rail
//    serves the same purpose)
//  - avatar chip (clicking it jumps back to the avatar creator)
//  - theme toggle

import { nav } from '../core/nav.js';
import { toggleChat } from '../core/chat.js';
import { themeToggleHTML } from '../core/theme.js';

export const appNavHTML = `
  <div class="app-nav">
    <div class="app-nav-l">
      <div class="logo" style="font-size:15px">
        <svg width="28" height="28" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect x="2" y="2" width="28" height="28" rx="7" fill="#ff6b4a"/><rect x="8" y="9" width="16" height="12" rx="2" fill="#1a1420"/><rect x="11" y="13" width="2" height="2" fill="#ff6b4a"/><rect x="19" y="13" width="2" height="2" fill="#ff6b4a"/><rect x="13" y="17" width="6" height="1" fill="#ff6b4a"/></svg>
        the corner
      </div>
      <div class="navtabs">
        <button class="navtab on" data-sub="plaza">Plaza</button>
        <button class="navtab" data-sub="council">Council</button>
        <button class="navtab" data-sub="suggestions">Suggestions <span class="notif" id="sugg-badge" hidden></span></button>
        <button class="navtab" data-sub="events">Events</button>
        <button class="navtab" data-sub="guide">Guide</button>
        <button class="navtab" data-sub="members">Members</button>
      </div>
    </div>
    <div class="app-nav-r">
      <button class="chat-nav-btn" data-chat-open aria-label="Open chat"><span class="dot"></span>Chat</button>
      <span class="online-chip mono" id="online-chip" hidden><span class="online-dot"></span><span id="online-count"></span> online</span>
      <button class="me-chip" data-back-to-create>
        <span id="me-mini"></span>
        <span id="me-name"></span>
      </button>
      ${themeToggleHTML}
    </div>
  </div>
`;

export function initAppShell() {
  document.querySelector('[data-chat-open]').addEventListener('click', toggleChat);
  document.querySelector('[data-back-to-create]').addEventListener('click', () => nav('create'));
}
