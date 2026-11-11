// Chat drawer system — one thread per room. Backed by Supabase.
//
// Data flow:
//  - loadChats() fetches recent messages into state.chats on boot.
//  - subscribeChats() opens a realtime subscription; new inserts arrive
//    push-style and append to state.chats, re-rendering if open.
//  - addChatMsg() is optimistic: it shows the message immediately with a
//    temp id, then INSERTs. On error it rolls back. On success it swaps
//    the temp for the real row. The realtime echo is deduped by row id.
//  - If VITE_SUPABASE_URL/ANON_KEY are missing, we fall back to local-only.

import { state } from './state.js';
import { avatarSVG } from '../avatars/render.js';
import { formatTime } from '../utils/time.js';
import { escapeHtml } from '../utils/html.js';
import { supabase } from './supabase.js';
import { flagHTML } from './countries.js';

export const ROOM_LABELS = {
  plaza: 'Plaza', council: 'Council', suggestions: 'Suggestions',
  events: 'Events', guide: 'Guide', members: 'Members',
};
export const ROOM_COUNTS = {
  plaza: '14 here now', council: '4 posting · motion open',
  suggestions: '27 following', events: '11 this week',
  guide: '9 contributors', members: '28 of us, 14 online',
};

function emptyRooms() {
  return { plaza: [], council: [], suggestions: [], events: [], guide: [], members: [] };
}

function rowToMsg(row) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    text: row.text,
    ts: new Date(row.created_at).getTime(),
    me: false,
    user_id: row.user_id,
  };
}

async function loadChats() {
  state.chats = emptyRooms();
  if (!supabase) return;
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) {
    console.error('[chat] loadChats:', error);
    return;
  }
  for (const row of data || []) {
    if (!state.chats[row.room]) state.chats[row.room] = [];
    const m = rowToMsg(row);
    if (m.user_id && state.auth && m.user_id === state.auth.id) m.me = true;
    state.chats[row.room].push(m);
  }
  if (state.chatOpen) renderChat();
}

function subscribeChats() {
  if (!supabase) return;
  supabase
    .channel('messages-stream')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const row = payload.new;
        const room = row.room;
        if (!state.chats[room]) state.chats[room] = [];
        if (state.chats[room].some((m) => m.id === row.id)) return;
        const m = rowToMsg(row);
        if (m.user_id && state.auth && m.user_id === state.auth.id) m.me = true;
        state.chats[room].push(m);
        if (state.chatOpen && roomForChat() === room) renderChat();
      }
    )
    .subscribe();
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
  };
}

export async function addChatMsg(room, msg) {
  if (supabase && !state.auth) {
    console.warn('[chat] not signed in — skipping insert');
    return;
  }
  if (!state.chats[room]) state.chats[room] = [];

  if (!supabase) {
    state.chats[room].push({ ...msg, ts: Date.now(), me: true });
    if (state.chatOpen && roomForChat() === room) renderChat();
    return;
  }

  const tempId = 'temp-' + Math.random().toString(36).slice(2);
  state.chats[room].push({ id: tempId, ...msg, ts: Date.now(), me: true });
  if (state.chatOpen && roomForChat() === room) renderChat();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room,
      name: msg.name,
      avatar: msg.avatar,
      text: msg.text,
      user_id: state.auth.id,
    })
    .select()
    .single();

  const idx = state.chats[room].findIndex((m) => m.id === tempId);
  if (error) {
    if (idx >= 0) state.chats[room].splice(idx, 1);
    if (state.chatOpen && roomForChat() === room) renderChat();
    console.error('[chat] addChatMsg:', error);
    return;
  }
  if (idx >= 0) state.chats[room][idx] = { ...rowToMsg(data), me: true };
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
  list.innerHTML = msgs.map((m) => {
    const uid = m.user_id || (m.me ? state.auth?.id : null);
    const cc = uid ? state.profiles?.find((p) => p.user_id === uid)?.country_code : null;
    return `
    <div class="chat-msg ${m.me ? 'me' : ''}">
      ${avatarSVG(m.avatar, 28)}
      <div class="chat-msg-body">
        <div class="chat-msg-head">
          ${flagHTML(cc)}<span class="chat-msg-name" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</span>
          <span class="chat-msg-time">${formatTime(m.ts)}</span>
        </div>
        <div class="chat-msg-text">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `;
  }).join('');
  list.scrollTop = list.scrollHeight;
}

function sendDrawerChat() {
  const i = document.getElementById('chat-drawer-input');
  const text = i.value.trim();
  if (!text) return;
  i.value = '';
  const room = roomForChat();
  addChatMsg(room, makeMyChatMsg(text.slice(0, 200)));
  if (room === 'plaza') {
    import('../views/plaza.js').then((p) => p.showMyBubble(text.slice(0, 60)));
  }
}

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
  state.chats = emptyRooms();
  loadChats();
  subscribeChats();
}
