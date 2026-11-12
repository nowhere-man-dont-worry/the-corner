// Live presence and plaza broadcasts on per-user topics.
//
// Every signed-in user owns one private Realtime topic, user:<their id>.
// The database lets only that user send on it (migration 0009), so whatever
// arrives on user:X really came from X. Receivers take the sender's id from
// the topic name and ignore any id inside the payload.
//
// On their own topic, each tab broadcasts:
//   here { room }      — a heartbeat every few seconds (and on every room
//                        change): "I'm online and in this room"
//   bye                — when the tab is closed or hidden for good
//   pos  { nx, ny, dir, walking }   — plaza position (see views/plaza.js)
//   say  { text }                   — plaza speech bubble
//
// Each tab subscribes to the topic of every member in `profiles` (the class
// is small). Someone counts as online while their heartbeats keep arriving.
// Names, looks and flags come from the profiles table, never from a message.

import { state } from './state.js';
import { supabase } from './supabase.js';

export const ROOMS = ['plaza', 'council', 'suggestions', 'events', 'guide', 'members'];

const HEARTBEAT_MS = 8000;
const STALE_MS = 20000;            // no heartbeat for this long = offline

const topicOf = (id) => 'user:' + id;
const channels = new Map();        // user id -> RealtimeChannel
const seen = new Map();            // other user id -> { room, at }
let currentRoom = null;
let started = false;
const listeners = new Set();
const handlers = {};               // 'pos' | 'say' | 'join' -> fn

export function onPresenceChange(fn) { listeners.add(fn); }
export function onPlazaEvent(event, fn) { handlers[event] = fn; }
function emit() {
  for (const fn of listeners) { try { fn(); } catch (e) { console.error('[presence] listener', e); } }
}

function me() { return state.auth?.id; }
function myChannel() { return channels.get(me()); }
function profileOf(id) { return (state.profiles || []).find((p) => p.user_id === id) || null; }

// Presence "meta" for a user, built from trusted data only.
function metaFor(id, room) {
  const p = profileOf(id) || {};
  const self = id === me();
  return {
    user_id: id,
    handle: p.handle || (self ? state.auth.github_username : null),
    display_name: p.display_name || null,
    country_code: p.country_code || null,
    hair: self ? state.avatar.hair : p.hair,
    hair_color: self ? state.avatar.hairColor : p.hair_color,
    skin: self ? state.avatar.skin : p.skin,
    top: self ? state.avatar.top : p.top,
    bottom: self ? state.avatar.bottom : p.bottom,
    room,
  };
}

function send(event, payload = {}) {
  const ch = myChannel();
  if (ch?.state === 'joined') ch.send({ type: 'broadcast', event, payload });
}

function heartbeat() {
  if (currentRoom) send('here', { room: currentRoom });
}

function onMessage(fromId, event, payload) {
  if (fromId === me()) return;
  const p = payload && typeof payload === 'object' ? payload : {};
  if (event === 'here') {
    const room = typeof p.room === 'string' ? p.room.slice(0, 20) : 'plaza';
    const wasOnline = isOnline(fromId);
    const prevRoom = seen.get(fromId)?.room;
    seen.set(fromId, { room, at: Date.now() });
    if (!wasOnline) {
      heartbeat();                          // let the newcomer see us right away
      handlers.join?.(fromId);
    }
    if (!wasOnline || prevRoom !== room) emit();
  } else if (event === 'bye') {
    if (seen.delete(fromId)) emit();
  } else if (event === 'pos' || event === 'say') {
    if (!isOnline(fromId)) return;
    handlers[event]?.({ ...p, user_id: fromId });   // identity from the topic only
  }
}

function subscribeTo(id) {
  if (!id || channels.has(id)) return;
  const ch = supabase.channel(topicOf(id), { config: { private: true, broadcast: { self: false } } });
  for (const ev of ['here', 'bye', 'pos', 'say']) {
    ch.on('broadcast', { event: ev }, ({ payload }) => onMessage(id, ev, payload));
  }
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED' && id === me()) heartbeat();
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('[presence]', topicOf(id), status);
  });
  channels.set(id, ch);
}

function isOnline(id) {
  if (id === me()) return true;
  const s = seen.get(id);
  return !!s && Date.now() - s.at < STALE_MS;
}

// Subscribe to every member's topic (and pick up new members later).
export function syncPresenceMembers() {
  if (!started) return;
  subscribeTo(me());
  for (const p of state.profiles || []) subscribeTo(p.user_id);
  emit();   // profiles changed: names/looks shown for online people may have too
}

export function startPresence() {
  if (!supabase || !state.auth || started) return;
  started = true;
  syncPresenceMembers();
  setInterval(heartbeat, HEARTBEAT_MS);
  // Drop people whose heartbeats stopped.
  setInterval(() => {
    let changed = false;
    for (const [id, s] of seen) if (Date.now() - s.at >= STALE_MS) { seen.delete(id); changed = true; }
    if (changed) emit();
  }, 4000);
  window.addEventListener('pagehide', () => send('bye'));
}

// Called by nav() whenever the visible room changes.
export function setPresenceRoom(room) {
  if (!room || room === currentRoom) return;
  currentRoom = room;
  heartbeat();
  emit();
}

// Our look changed: tell others to re-read profiles (they get it from the
// profiles table; the heartbeat just nudges counts/rooms).
export function retrackPresence() { heartbeat(); emit(); }

// Plaza broadcasts go out on our own topic only.
export function sendPlaza(event, payload) {
  if (event !== 'pos' && event !== 'say') return;
  const { user_id, ...rest } = payload || {};   // never send an id; the topic is the id
  send(event, rest);
}

// People whose tab is in `room` (including us).
export function usersInRoom(room) {
  const out = [];
  if (me() && currentRoom === room) out.push(metaFor(me(), room));
  for (const [id, s] of seen) if (isOnline(id) && s.room === room) out.push(metaFor(id, room));
  return out;
}

export function onlineUserIds() {
  const ids = new Set();
  if (me()) ids.add(me());
  for (const id of seen.keys()) if (isOnline(id)) ids.add(id);
  return ids;
}

export function presenceReady() { return started; }
