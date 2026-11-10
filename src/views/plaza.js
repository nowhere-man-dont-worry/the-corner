// The plaza — walk around, say hi, step through a door.
// Arrow keys or WASD move your avatar. Space pops a bubble. Walk into a door
// to enter that room (cinema and game room are placeholders for now).

import { state } from '../core/state.js';
import { nav } from '../core/nav.js';
import { avatarSVG } from '../avatars/render.js';
import { NPCS } from '../data/npcs.js';
import { MEMBERS } from '../data/members.js';
import { toast } from '../core/toast.js';
import { addChatMsg, makeMyChatMsg } from '../core/chat.js';

export const plazaHTML = `
  <div class="plaza-wrap">
    <aside class="plaza-side">
      <div class="sidekey">ROOMS</div>
      <button class="room-link on"><span class="room-icon">▲</span>Plaza <span class="count">8</span></button>
      <button class="room-link"><span class="room-icon">🎬</span>Cinema <span class="count">3</span></button>
      <button class="room-link"><span class="room-icon">🎮</span>Game Room <span class="count">2</span></button>
      <button class="room-link"><span class="room-icon">🏛</span>Council <span class="count">1</span></button>
      <button class="room-link"><span class="room-icon">🌙</span>Garden</button>

      <div class="sidekey">THIS WEEK</div>
      <div class="room-card" style="border-color:var(--border)">
        <div class="when" style="color:var(--coral)">FRI · 20:30</div>
        <div class="what">Movie night</div>
        <div class="where">Voting ends Thu. 9 picked In Bruges.</div>
      </div>
      <div class="room-card" style="background:transparent">
        <div class="when" style="color:var(--muted)">SAT · 15:00</div>
        <div class="what" style="color:#c8bcaf">Buttes-Chaumont picnic</div>
      </div>
    </aside>

    <main class="plaza-main">
      <div class="plaza-head">
        <div>
          <h1 class="plaza-title">The plaza</h1>
          <div class="plaza-sub">Walk around. Say hi. Open a door.</div>
        </div>
        <div class="plaza-clock">◐ THU 14:08 · PARIS</div>
      </div>

      <div class="room" id="room" tabindex="0">
        <div class="help-hint">
          <kbd>↑↓←→</kbd> move · <kbd>Space</kbd> say hi<br/>
          walk into a door to enter it
        </div>

        <div class="poster p1">
          <span>MOVIE NIGHT</span>
          <span style="font-size:22px;line-height:0.9">FRI<br/>20:30</span>
          <span>→ vote</span>
        </div>
        <div class="poster p2">GAME JAM<br/>DEC 14-15<br/>48 HRS<br/>BRING<br/>SNACKS</div>

        <svg style="position:absolute;top:10px;left:0;right:0;width:100%;height:60px;pointer-events:none" viewBox="0 0 780 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 10 Q 195 55 390 15 T 780 10" stroke="#3d3050" stroke-width="1.5" fill="none"/>
          <circle class="light" cx="60" cy="33" r="4" fill="#ffd166"/>
          <circle class="light" cx="140" cy="43" r="4" fill="#ff6b4a"/>
          <circle class="light" cx="220" cy="46" r="4" fill="#7fd4a8"/>
          <circle class="light" cx="300" cy="40" r="4" fill="#c589e8"/>
          <circle class="light" cx="380" cy="30" r="4" fill="#ffd166"/>
          <circle class="light" cx="460" cy="25" r="4" fill="#ff6b4a"/>
          <circle class="light" cx="540" cy="23" r="4" fill="#7fd4a8"/>
          <circle class="light" cx="620" cy="21" r="4" fill="#c589e8"/>
          <circle class="light" cx="700" cy="17" r="4" fill="#ffd166"/>
        </svg>

        <button class="door d-cinema" data-door="cinema">
          <div class="door-icon">🎬</div>
          <div class="door-label">CINEMA</div>
          <div class="door-count">3 inside</div>
        </button>
        <button class="door d-council" data-door="council">
          <div class="door-icon">🏛</div>
          <div class="door-label">COUNCIL</div>
          <div class="door-count">1 vote open</div>
        </button>
        <button class="door d-game" data-door="game">
          <div class="door-icon">🎮</div>
          <div class="door-label">GAME ROOM</div>
          <div class="door-count">2 playing</div>
        </button>

        <div class="floor"></div>

        <div id="npcs"></div>
        <div class="me-avatar" id="me-avatar"></div>

        <div class="entering-cue" id="entering-cue">
          <span class="label">ENTERING <span id="entering-name">—</span></span>
          <div class="bar"><div class="bar-fill" id="entering-bar"></div></div>
        </div>
        <div class="chat-dock">
          <input id="chat-input" placeholder="say something…"/>
          <button data-plaza-send>say</button>
        </div>
      </div>
    </main>
  </div>
`;

// ---- state ----
const keys = {};
let lastFrame = 0;
let npcsLastMove = 0;
let loopRunning = false;

const DOORS = {
  cinema:  { cls: 'd-cinema',  label: 'CINEMA',    action: () => toast('Cinema opens next week — the first stream is Fri 20:30.') },
  council: { cls: 'd-council', label: 'COUNCIL',   action: () => nav('council') },
  game:    { cls: 'd-game',    label: 'GAME ROOM', action: () => toast('Game Room: Mario Kart Sunday 14:00.') },
};
const ENTER_HOLD_MS = 1200;
let hoverDoor = null;
let hoverElapsed = 0;

// ---- NPC rendering ----
function renderNPCs() {
  const wrap = document.getElementById('npcs');
  if (!wrap) return;
  wrap.innerHTML = NPCS.map(
    (n, i) => `
    <div class="npc" id="npc-${i}" style="left:${n.x}px;bottom:${600 - n.y}px">
      ${n.showBubble ? `<div class="chat-bubble">${n.line}</div>` : ''}
      ${avatarSVG({ hair: 'mop', hairColor: n.hair, skin: n.skin, top: n.top, bottom: n.bottom }, 56)}
      <div class="npc-label">${n.name}</div>
    </div>`
  ).join('');
}

function updateNPCs(ts) {
  if (ts - npcsLastMove < 2500) return;
  npcsLastMove = ts;
  NPCS.forEach((n) => {
    if (Math.random() < 0.45) {
      n.x = Math.max(80, Math.min(680, n.x + (Math.random() * 80 - 40)));
      n.y = Math.max(440, Math.min(560, n.y + (Math.random() * 30 - 15)));
    }
    if (Math.random() < 0.25) {
      n.showBubble = true;
      setTimeout(() => {
        n.showBubble = false;
        renderNPCs();
      }, 3500);
    }
  });
  renderNPCs();
}

// ---- Who's here side panel (kept mountable; hidden by default via CSS) ----
export function renderWhoList() {
  const el = document.getElementById('who-list');
  if (!el) return;
  el.innerHTML =
    MEMBERS.map(
      (m) => `
    <div class="who">
      <span class="who-dot ${m.online ? '' : 'away'}"></span>
      ${avatarSVG({ hair: 'mop', hairColor: m.hair, skin: m.skin, top: m.top, bottom: m.bottom }, 22)}
      <div>${m.name}</div>
      ${m.me ? '<div class="who-sub">you</div>' : (!m.online ? `<div class="who-sub">· ${m.name === 'priya' ? 'cinema' : 'game room'}</div>` : '')}
    </div>`
    ).join('') + '<div style="padding:7px 9px;font-size:12px;color:var(--dim);cursor:pointer">+ 6 more</div>';
}

// ---- The player ----
function updateMe(dt) {
  let vx = 0;
  let vy = 0;
  if (keys['ArrowUp'] || keys['w']) vy -= 1;
  if (keys['ArrowDown'] || keys['s']) vy += 1;
  if (keys['ArrowLeft'] || keys['a']) { vx -= 1; state.plaza.dir = -1; }
  if (keys['ArrowRight'] || keys['d']) { vx += 1; state.plaza.dir = 1; }

  const moving = vx !== 0 || vy !== 0;
  if (moving) {
    const sp = 0.22 * dt;
    const b = walkBounds();
    state.plaza.x = Math.max(b.minX, Math.min(b.maxX, state.plaza.x + vx * sp));
    state.plaza.y = Math.max(b.minY, Math.min(600, state.plaza.y + vy * sp));
  }

  const me = document.getElementById('me-avatar');
  if (!me) return;
  me.style.left = state.plaza.x + 'px';
  me.style.bottom = 600 - state.plaza.y + 'px';
  me.classList.toggle('walking', moving);
}

// Walkable area, measured from the live room so every door is reachable at
// any window size. Doors are anchored to the room's top (and the council door
// to its right edge) while the avatar is anchored to the bottom, so fixed
// numbers drift as the room resizes. Falls back to the old limits when the
// room isn't laid out (e.g. while another view is showing).
function walkBounds() {
  const room = document.getElementById('room');
  const me = document.getElementById('me-avatar');
  if (!room || !me || !room.clientWidth) return { minX: 60, maxX: 700, minY: 440 };
  const rr = room.getBoundingClientRect();
  const meW = me.offsetWidth || 60;
  const meH = me.offsetHeight || 104;
  let doorBottom = 0;
  for (const meta of Object.values(DOORS)) {
    const el = room.querySelector('.' + meta.cls);
    if (el) doorBottom = Math.max(doorBottom, el.getBoundingClientRect().bottom - rr.top);
  }
  // Let the avatar's head overlap the lowest door edge by ~12px.
  const maxBottom = Math.max(160, rr.height - meH - doorBottom + 12);
  return { minX: 60, maxX: Math.max(60, rr.width - meW - 20), minY: 600 - maxBottom };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function checkDoorHover(dt) {
  const room = document.getElementById('room');
  const meEl = document.getElementById('me-avatar');
  const cue  = document.getElementById('entering-cue');
  if (!room || !meEl || !cue) return;

  const rr = room.getBoundingClientRect();
  const mr = meEl.getBoundingClientRect();
  const avatarBox = {
    left:   mr.left - rr.left, right:  mr.right - rr.left,
    top:    mr.top  - rr.top,  bottom: mr.bottom - rr.top,
  };

  let hit = null, hitRect = null;
  for (const [key, meta] of Object.entries(DOORS)) {
    const el = room.querySelector('.' + meta.cls);
    if (!el) continue;
    const dr = el.getBoundingClientRect();
    const box = {
      left:   dr.left - rr.left, right:  dr.right - rr.left,
      top:    dr.top  - rr.top,  bottom: dr.bottom - rr.top,
    };
    if (rectsOverlap(avatarBox, box)) { hit = key; hitRect = box; break; }
  }

  if (hit && hoverDoor === hit) {
    hoverElapsed += dt;
    document.getElementById('entering-bar').style.width =
      Math.min(100, (hoverElapsed / ENTER_HOLD_MS) * 100) + '%';
    cue.style.left = ((hitRect.left + hitRect.right) / 2) + 'px';
    cue.style.top  = (hitRect.top - 56) + 'px';
    if (hoverElapsed >= ENTER_HOLD_MS) {
      cue.classList.remove('show');
      const fn = DOORS[hit].action;
      state.plaza.y = 520;              // nudge avatar off the door's rect
      hoverDoor = null; hoverElapsed = 0;
      fn();
    }
  } else if (hit && hoverDoor !== hit) {
    hoverDoor = hit; hoverElapsed = 0;
    document.getElementById('entering-name').textContent = DOORS[hit].label;
    document.getElementById('entering-bar').style.width = '0%';
    cue.style.left = ((hitRect.left + hitRect.right) / 2) + 'px';
    cue.style.top  = (hitRect.top - 56) + 'px';
    cue.classList.add('show');
  } else if (!hit && hoverDoor) {
    hoverDoor = null; hoverElapsed = 0;
    cue.classList.remove('show');
  }
}

function loop(ts) {
  const dt = ts - (lastFrame || ts);
  lastFrame = ts;
  if (state.sub === 'plaza') {
    updateMe(dt);
    checkDoorHover(dt);
    updateNPCs(ts);
    if (state.plaza.bubble && ts > state.plaza.bubbleUntil) {
      state.plaza.bubble = null;
      const b = document.querySelector('#me-avatar .chat-bubble');
      if (b) b.remove();
    }
  }
  requestAnimationFrame(loop);
}

// ---- Bubble + chat ----
export function showMyBubble(text) {
  const me = document.getElementById('me-avatar');
  if (!me) return;
  const old = me.querySelector('.chat-bubble');
  if (old) old.remove();
  const b = document.createElement('div');
  b.className = 'chat-bubble';
  b.textContent = text;
  me.appendChild(b);
  state.plaza.bubble = text;
  state.plaza.bubbleUntil = performance.now() + 3200;
}

function sayHi() {
  const lines = ['hi!', 'wya', 'bored :(', 'anyone up?', 'oi', '...', 'coffee?'];
  const l = lines[Math.floor(Math.random() * lines.length)];
  showMyBubble(l);
  addChatMsg('plaza', makeMyChatMsg(l));
}

function sendPlazaChat() {
  const i = document.getElementById('chat-input');
  if (!i.value.trim()) return;
  const text = i.value.trim().slice(0, 60);
  showMyBubble(text);
  addChatMsg('plaza', makeMyChatMsg(text));
  i.value = '';
}

// ---- Keyboard ----
function handleKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  keys[e.key] = true;
  if ((e.key === ' ' || e.key === 'Enter') && state.view === 'app' && state.sub === 'plaza') {
    e.preventDefault();
    sayHi();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
}
function handleKeyUp(e) {
  keys[e.key] = false;
}

// ---- Init ----
export function initPlaza() {
  const root = document.querySelector('.subview[data-sub="plaza"]');

  // Door clicks (clickable alternative to walking into them).
  root.querySelector('[data-door="cinema"]').addEventListener('click', () =>
    toast('Cinema opens next week — the first stream is Fri 20:30.')
  );
  root.querySelector('[data-door="council"]').addEventListener('click', () => nav('council'));
  root.querySelector('[data-door="game"]').addEventListener('click', () =>
    toast('Game Room: Mario Kart Sunday 14:00.')
  );

  // Chat dock.
  root.querySelector('[data-plaza-send]').addEventListener('click', sendPlazaChat);
  root.querySelector('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendPlazaChat();
  });

  // Keyboard once, globally.
  if (!window.__plazaKeysBound) {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.__plazaKeysBound = true;
  }

  renderNPCs();
  renderWhoList();

  if (!loopRunning) {
    loopRunning = true;
    requestAnimationFrame(loop);
  }
}
