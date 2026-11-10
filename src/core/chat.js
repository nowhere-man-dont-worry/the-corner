// Chat drawer system — one thread per room (plaza, council, suggestions, ...).
// Seeded from src/data/chat-seeds.js so the pitch looks lived-in; user messages
// persist in localStorage.
//
// The rail/drawer visual behavior lives entirely in style.css; this file only
// manages state, DOM content and open/close.

import { state } from './state.js';
import { avatarSVG } from '../avatars/render.js';
import { SEED_CHATS } from '../data/chat-seeds.js';
import { formatTime } from '../utils/time.js';
import { escapeHtml } from '../utils/html.js';
import { load, save } from '../utils/storage.js';

export const ROOM_LABELS = {
  plaza: 'Plaza',
  council: 'Council',
  suggestions: 'Suggestions',
  events: 'Events',
  guide: 'Guide',
  members: 'Members',
};

export const ROOM_COUNTS = {
  plaza: '14 here now',
  council: '4 posting · motion open',
  suggestions: '27 following',
  events: '11 this week',
  guide: '9 contributors',
  members: '28 of us, 14 online',
};

export function loadChats() {
  state.chats = {};
  for (const r in SEED_CHATS) state.chats[r] = [...SEED_CHATS[r]];
  const saved = load('corner-chats');
  if (saved) {
    for (const room in saved) {
      state.chats[room] = (state.chats[room] || []).concat(saved[room] || []);
    }
  }
}

// Only persist the user's own messages (seeds are in the repo, no need to copy them).
function saveUserChats() {
  const user = {};
  for (const room in state.chats) {
    user[room] = state.chats[room].filter((m) => m.me);
  }
  save('corner-chats', user);
}

export function roomForChat() {
  return state.view === 'app' && state.sub ? state.sub : 'plaza';
}

export function makeMyChatMsg(text) {
  return {
    name: state.avatar.name,
    avatar: {
      hair: 'mop',
      hairColor: state.avatar.hairColor,
      skin: state.avatar.skin,
      top: state.avatar.top,
      bottom: state.avatar.bottom,
    },
    text,
    ts: Date.now(),
    me: true,
  };
}

export function addChatMsg(room, msg) {
  if (!state.chats[room]) state.chats[room] = [];
  state.chats[room].push(msg);
  if (msg.me) saveUserChats();
  if (state.chatOpen && roomForChat() === room) renderChat();
}

export function toggleChat() {
  const d = document.getElementById('chat-drawer');
  state.chatOpen = !state.chatOpen;
  d.classList.toggle('open', state.chatOpen);
  d.setAttribute('aria-hidden', String(!state.chatOpen));
  document.body.classList.toggle('chat-open', state.chatOpen);
  if (state.chatOpen) {
    renderChat();
    setTimeout(() => document.getElementById('chat-drawer-input')?.focus(), 300);
  }
}

export function renderChat() {
  const room = roomForChat();
  if (!state.chats[room]) state.chats[room] = [];

  document.getElementById('chat-drawer-room').textContent = ROOM_LABELS[room] || 'Chat';
  document.getElementById('chat-drawer-count').textContent = (ROOM_COUNTS[room] || '').toUpperCase();
  document.getElementById('chat-drawer-input').placeholder = `say something in ${room}…`;
  const railLabel = document.getElementById('chat-rail-label');
  if (railLabel) railLabel.textContent = (ROOM_LABELS[room] || 'Chat').toUpperCase() + ' · LIVE';

  const list = document.getElementById('chat-drawer-list');
  const msgs = state.chats[room];
  if (!msgs.length) {
    list.innerHTML = `<div class="chat-empty">nothing in ${room} yet. go first.</div>`;
    return;
  }
  list.innerHTML = msgs
    .map(
      (m) => `
    <div class="chat-msg ${m.me ? 'me' : ''}">
      ${avatarSVG(m.avatar, 28)}
      <div class="chat-msg-body">
        <div class="chat-msg-head">
          <span class="chat-msg-name">${escapeHtml(m.name)}</span>
          <span class="chat-msg-time">${formatTime(m.ts)}</span>
        </div>
        <div class="chat-msg-text">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `
    )
    .join('');
  list.scrollTop = list.scrollHeight;
}

function sendDrawerChat() {
  const i = document.getElementById('chat-drawer-input');
  const text = i.value.trim();
  if (!text) return;
  i.value = '';
  const room = roomForChat();
  addChatMsg(room, makeMyChatMsg(text.slice(0, 200)));
  // Plaza chat dock and the drawer share the plaza thread — echo as a bubble
  // so you can see your message over your avatar when you're in the plaza.
  if (room === 'plaza') {
    import('../views/plaza.js').then((p) => p.showMyBubble(text.slice(0, 60)));
  }
}

// The drawer HTML — rendered once by main.js, event handlers wired here.
export const chatDrawerHTML = `
  <aside id="chat-drawer" class="chat-drawer" aria-hidden="true">
    <button class="chat-rail" data-chat-rail aria-label="Open chat">
      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
        <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4 4v-4H5a2 2 0 0 1-2-2V5z" fill="currentColor"/>
      </svg>
      <div class="chat-rail-label" id="chat-rail-label">LIVE CHAT</div>
      <div class="chat-rail-dot"></div>
    </button>
    <div class="chat-panel">
      <div class="chat-drawer-head">
        <div>
          <div class="chat-drawer-room" id="chat-drawer-room">Plaza</div>
          <div class="chat-drawer-count" id="chat-drawer-count">14 HERE NOW</div>
        </div>
        <button class="chat-drawer-close" data-chat-close aria-label="Close">×</button>
      </div>
      <div class="chat-drawer-list" id="chat-drawer-list"></div>
      <div class="chat-drawer-foot">
        <input id="chat-drawer-input" placeholder="say something in plaza…" maxlength="200"/>
        <button data-chat-send>send</button>
      </div>
    </div>
  </aside>
`;

export function initChat() {
  document.querySelector('[data-chat-rail]').addEventListener('click', toggleChat);
  document.querySelector('[data-chat-close]').addEventListener('click', toggleChat);
  document.querySelector('[data-chat-send]').addEventListener('click', sendDrawerChat);
  document.getElementById('chat-drawer-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendDrawerChat();
  });
}
