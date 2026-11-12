// The plaza — walk around, see who's here, say hi, step through a door.
//
// Arrow keys / WASD move your avatar; Space says hi. Everyone else in the
// plaza is drawn from live presence (src/core/presence.js): their look comes
// from their profile, their position from `pos` broadcasts, which are sent
// only when you move and at most 8 times a second. Positions travel as
// 0..1 fractions of the walkable area so they line up on any screen size,
// and other avatars glide smoothly between updates.
//
// Doors: Council and Game Room open real views. Cinema and Garden are
// intentionally "coming soon": dimmed, no enter countdown, just a bubble.

import { state } from '../core/state.js';
import { nav } from '../core/nav.js';
import { avatarSVG } from '../avatars/render.js';
import { addChatMsg, makeMyChatMsg } from '../core/chat.js';
import { flagHTML } from '../core/countries.js';
import { escapeHtml } from '../utils/html.js';
import { usersInRoom, onPresenceChange, onPlazaEvent, sendPlaza } from '../core/presence.js';

export const plazaHTML = `
  <div class="plaza-wrap">
    <aside class="plaza-side">
      <div class="sidekey">ROOMS</div>
      <button class="room-link on" data-room-link="plaza"><span class="room-icon">▲</span>Plaza <span class="count" data-room-count="plaza"></span></button>
      <button class="room-link" data-room-link="games"><span class="room-icon">🎮</span>Game Room <span class="count" data-room-count="games"></span></button>
      <button class="room-link" data-room-link="council"><span class="room-icon">🏛</span>Council <span class="count" data-room-count="council"></span></button>
    </aside>

    <main class="plaza-main">
      <div class="plaza-head">
        <div>
          <h1 class="plaza-title">The plaza</h1>
          <div class="plaza-sub">Walk around. Say hi. Open a door.</div>
        </div>
        <div class="plaza-clock" id="plaza-clock"></div>
      </div>

      <div class="room" id="room" tabindex="0">
        <div class="help-hint">
          <kbd>↑↓←→</kbd> move · <kbd>Space</kbd> say hi<br/>
          walk into a door to enter it
        </div>

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

        <button class="door d-cinema soon" data-door="cinema" aria-disabled="true">
          <div class="door-icon">🎬</div>
          <div class="door-label">CINEMA</div>
          <div class="door-count">COMING SOON</div>
        </button>
        <button class="door d-game" data-door="game">
          <div class="door-icon">🎮</div>
          <div class="door-label">GAME ROOM</div>
          <div class="door-count" id="door-game-count"></div>
        </button>
        <button class="door d-council" data-door="council">
          <div class="door-icon">🏛</div>
          <div class="door-label">COUNCIL</div>
          <div class="door-count" id="door-council-count"></div>
        </button>
        <button class="door d-garden soon" data-door="garden" aria-disabled="true">
          <div class="door-icon">🌙</div>
          <div class="door-label">GARDEN</div>
          <div class="door-count">COMING SOON</div>
        </button>

        <div class="floor"></div>

        <div id="others"></div>
        <div class="me-avatar" id="me-avatar"></div>

        <div class="entering-cue" id="entering-cue">
          <span class="label">ENTERING <span id="entering-name">—</span></span>
          <div class="bar"><div class="bar-fill" id="entering-bar"></div></div>
        </div>
        <div class="door-soon-bubble" id="door-soon-bubble" aria-live="polite">Coming soon</div>
        <div class="chat-dock">
          <input id="chat-input" placeholder="say something…" maxlength="60"/>
          <button data-plaza-send>say</button>
        </div>
      </div>
    </main>
  </div>
`;

// ---- state ----
const keys = {};
let lastFrame = 0;
let loopRunning = false;

const DOORS = {
  cinema:  { cls: 'd-cinema',  label: 'CINEMA',    soon: true },
  game:    { cls: 'd-game',    label: 'GAME ROOM', action: () => nav('games') },
  council: { cls: 'd-council', label: 'COUNCIL',   action: () => nav('council') },
  garden:  { cls: 'd-garden',  label: 'GARDEN',    soon: true },
};
const ENTER_HOLD_MS = 1200;
let hoverDoor = null;
let hoverElapsed = 0;

// ---- other people ----
const others = new Map();     // user_id -> { meta, sig, el, nx, ny, x, y, dir, walking, bubbleUntil }
const SEND_EVERY_MS = 125;    // at most 8 position broadcasts per second
let lastSent = { at: 0, key: '' };

function displayName(meta) {
  return meta.display_name || meta.handle || 'someone';
}

function lookSig(m) {
  return [m.hair, m.hair_color, m.skin, m.top, m.bottom, m.display_name, m.handle, m.country_code].join('|');
}

function avatarFor(m) {
  return { hair: m.hair || 'mop', hairColor: m.hair_color, skin: m.skin, top: m.top, bottom: m.bottom };
}

function labelHTML(name, countryCode) {
  return `<div class="npc-label" title="${escapeHtml(name)}">${flagHTML(countryCode)}<span class="lbl-name">${escapeHtml(name)}</span></div>`;
}

// A stable spot for someone we haven't heard a position from yet.
function spawnFor(userId) {
  let h = 0;
  for (const c of userId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { nx: 0.15 + (h % 70) / 100, ny: 0.55 + ((h >> 8) % 30) / 100 };
}

function toLocal(nx, ny) {
  const b = walkBounds();
  return { x: b.minX + nx * (b.maxX - b.minX), y: b.minY + ny * (600 - b.minY) };
}

function syncOthers() {
  const wrap = document.getElementById('others');
  if (!wrap || !state.auth) return;
  const here = usersInRoom('plaza').filter((m) => m.user_id !== state.auth.id);
  const ids = new Set(here.map((m) => m.user_id));
  for (const [id, o] of others) {
    if (!ids.has(id)) { o.el.remove(); others.delete(id); }
  }
  for (const m of here) {
    let o = others.get(m.user_id);
    if (!o) {
      const s = spawnFor(m.user_id);
      const p = toLocal(s.nx, s.ny);
      o = { meta: m, sig: '', el: document.createElement('div'), nx: s.nx, ny: s.ny, x: p.x, y: p.y, dir: 1, walking: false, bubbleUntil: 0 };
      o.el.className = 'npc other-avatar';
      o.el.dataset.user = m.user_id;
      wrap.appendChild(o.el);
      others.set(m.user_id, o);
    }
    o.meta = m;
    const sig = lookSig(m);
    if (sig !== o.sig) {
      o.sig = sig;
      const bubble = o.el.querySelector('.chat-bubble');
      o.el.innerHTML = avatarSVG(avatarFor(m), 56) + labelHTML(displayName(m), m.country_code);
      if (bubble) o.el.prepend(bubble);
    }
  }
}

function onPos(p) {
  if (!p || typeof p.user_id !== 'string') return;
  const o = others.get(p.user_id);
  if (!o) return;
  const clamp = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5);
  o.nx = clamp(p.nx);
  o.ny = clamp(p.ny);
  o.dir = p.dir === -1 ? -1 : 1;
  o.walking = !!p.walking;
}

function onSay(p) {
  if (!p || typeof p.user_id !== 'string' || typeof p.text !== 'string') return;
  const o = others.get(p.user_id);
  if (!o) return;
  o.el.querySelector('.chat-bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'chat-bubble';
  b.textContent = p.text.slice(0, 60);
  o.el.prepend(b);
  o.bubbleUntil = performance.now() + 3200;
}

// Glide others toward their last broadcast position, and keep two avatars on
// the same spot from hiding each other by nudging the later one sideways.
function updateOthers(dt, ts) {
  const placed = [{ x: state.plaza.x, y: state.plaza.y }];
  const ids = [...others.keys()].sort();
  const k = Math.min(1, dt / 110);
  for (const id of ids) {
    const o = others.get(id);
    const t = toLocal(o.nx, o.ny);
    o.x += (t.x - o.x) * k;
    o.y += (t.y - o.y) * k;
    const moving = Math.abs(t.x - o.x) > 0.6 || Math.abs(t.y - o.y) > 0.6 || o.walking;
    let dx = 0;
    // Avatars are ~56px wide: anything closer than that overlaps.
    while (placed.some((q) => Math.abs(q.x - (o.x + dx)) < 52 && Math.abs(q.y - o.y) < 40) && dx < 400) dx += 58;
    placed.push({ x: o.x + dx, y: o.y });
    o.el.style.left = o.x + dx + 'px';
    o.el.style.bottom = 600 - o.y + 'px';
    o.el.classList.toggle('walking', moving);
    if (o.bubbleUntil && ts > o.bubbleUntil) {
      o.el.querySelector('.chat-bubble')?.remove();
      o.bubbleUntil = 0;
    }
  }
}

function broadcastMyPosition(force = false) {
  if (!state.auth) return;
  const b = walkBounds();
  const nx = (state.plaza.x - b.minX) / Math.max(1, b.maxX - b.minX);
  const ny = (state.plaza.y - b.minY) / Math.max(1, 600 - b.minY);
  const walking = !!state.plaza.walking;
  const key = `${nx.toFixed(3)}|${ny.toFixed(3)}|${state.plaza.dir}|${walking}`;
  const now = performance.now();
  if (!force && (key === lastSent.key || now - lastSent.at < SEND_EVERY_MS)) return;
  lastSent = { at: now, key };
  sendPlaza('pos', { user_id: state.auth.id, nx, ny, dir: state.plaza.dir, walking });
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
  state.plaza.walking = moving;
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
// any window size. Falls back to fixed limits when the room isn't laid out.
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
  return { minX: 20, maxX: Math.max(60, rr.width - meW - 20), minY: 600 - maxBottom };
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function showSoonBubble(rect) {
  const b = document.getElementById('door-soon-bubble');
  if (!b) return;
  b.style.left = (rect.left + rect.right) / 2 + 'px';
  b.style.top = rect.top - 40 + 'px';
  b.classList.add('show');
}
function hideSoonBubble() {
  document.getElementById('door-soon-bubble')?.classList.remove('show');
}

function checkDoorHover(dt) {
  const room = document.getElementById('room');
  const meEl = document.getElementById('me-avatar');
  const cue = document.getElementById('entering-cue');
  if (!room || !meEl || !cue) return;

  const rr = room.getBoundingClientRect();
  const mr = meEl.getBoundingClientRect();
  const avatarBox = { left: mr.left - rr.left, right: mr.right - rr.left, top: mr.top - rr.top, bottom: mr.bottom - rr.top };

  let hit = null, hitRect = null;
  for (const [key, meta] of Object.entries(DOORS)) {
    const el = room.querySelector('.' + meta.cls);
    if (!el) continue;
    const dr = el.getBoundingClientRect();
    const box = { left: dr.left - rr.left, right: dr.right - rr.left, top: dr.top - rr.top, bottom: dr.bottom - rr.top };
    if (rectsOverlap(avatarBox, box)) { hit = key; hitRect = box; break; }
  }

  // "Coming soon" doors never start the enter countdown.
  if (hit && DOORS[hit].soon) {
    if (hoverDoor) { hoverDoor = null; hoverElapsed = 0; cue.classList.remove('show'); }
    showSoonBubble(hitRect);
    return;
  }
  hideSoonBubble();

  if (hit && hoverDoor === hit) {
    hoverElapsed += dt;
    document.getElementById('entering-bar').style.width = Math.min(100, (hoverElapsed / ENTER_HOLD_MS) * 100) + '%';
    cue.style.left = (hitRect.left + hitRect.right) / 2 + 'px';
    cue.style.top = hitRect.top - 56 + 'px';
    if (hoverElapsed >= ENTER_HOLD_MS) {
      cue.classList.remove('show');
      state.plaza.y = 520; // nudge avatar off the door's rect
      hoverDoor = null; hoverElapsed = 0;
      DOORS[hit].action();
    }
  } else if (hit && hoverDoor !== hit) {
    hoverDoor = hit; hoverElapsed = 0;
    document.getElementById('entering-name').textContent = DOORS[hit].label;
    document.getElementById('entering-bar').style.width = '0%';
    cue.style.left = (hitRect.left + hitRect.right) / 2 + 'px';
    cue.style.top = hitRect.top - 56 + 'px';
    cue.classList.add('show');
  } else if (!hit && hoverDoor) {
    hoverDoor = null; hoverElapsed = 0;
    cue.classList.remove('show');
  }
}

function loop(ts) {
  const dt = Math.min(100, ts - (lastFrame || ts));
  lastFrame = ts;
  if (state.view === 'app' && state.sub === 'plaza') {
    updateMe(dt);
    checkDoorHover(dt);
    broadcastMyPosition();
    updateOthers(dt, ts);
    if (state.plaza.bubble && ts > state.plaza.bubbleUntil) {
      state.plaza.bubble = null;
      document.querySelector('#me-avatar .chat-bubble')?.remove();
    }
  }
  requestAnimationFrame(loop);
}

// ---- Bubbles + chat ----
// Shows a bubble over your avatar and over your avatar on everyone else's screen.
export function showMyBubble(text) {
  const me = document.getElementById('me-avatar');
  if (!me) return;
  const t = String(text).slice(0, 60);
  me.querySelector('.chat-bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'chat-bubble';
  b.textContent = t;
  me.prepend(b);
  state.plaza.bubble = t;
  state.plaza.bubbleUntil = performance.now() + 3200;
  if (state.auth) sendPlaza('say', { user_id: state.auth.id, text: t });
}

function sayHi() {
  showMyBubble('hi!');
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
  if (!(state.view === 'app' && state.sub === 'plaza')) return;
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!e.repeat) sayHi();
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
}
function handleKeyUp(e) {
  keys[e.key] = false;
}

// Real Paris time, not a frozen label.
function tickClock() {
  const el = document.getElementById('plaza-clock');
  if (!el) return;
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date());
  el.textContent = '◐ ' + t.toUpperCase().replace(',', '') + ' · PARIS';
}

// Live counts on the Rooms list and the Game Room door.
function renderRoomCounts() {
  const n = (room) => usersInRoom(room).length;
  document.querySelectorAll('[data-room-count]').forEach((el) => {
    const c = n(el.dataset.roomCount);
    el.textContent = c ? String(c) : '';
  });
  const g = n('games');
  const gameCount = document.getElementById('door-game-count');
  if (gameCount) gameCount.textContent = g ? `${g} playing` : '';
}

// ---- Init ----
export function initPlaza() {
  const root = document.querySelector('.subview[data-sub="plaza"]');

  // Door clicks (clickable alternative to walking into them).
  root.querySelectorAll('[data-door]').forEach((d) =>
    d.addEventListener('click', () => {
      const door = DOORS[d.dataset.door];
      if (door.soon) {
        const rr = document.getElementById('room').getBoundingClientRect();
        const dr = d.getBoundingClientRect();
        showSoonBubble({ left: dr.left - rr.left, right: dr.right - rr.left, top: dr.top - rr.top });
        setTimeout(hideSoonBubble, 1600);
      } else {
        door.action();
      }
    })
  );
  root.querySelectorAll('[data-room-link]').forEach((b) =>
    b.addEventListener('click', () => nav(b.dataset.roomLink))
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
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
    window.__plazaKeysBound = true;
  }

  onPresenceChange(() => { syncOthers(); renderRoomCounts(); });
  onPlazaEvent('pos', onPos);
  onPlazaEvent('say', onSay);
  // Someone new arrived: tell them where we are so they don't wait for us to move.
  onPlazaEvent('join', () => {
    if (state.view === 'app' && state.sub === 'plaza') setTimeout(() => broadcastMyPosition(true), 300);
  });

  tickClock();
  setInterval(tickClock, 15000);

  if (!loopRunning) {
    loopRunning = true;
    requestAnimationFrame(loop);
  }
}
