// Live presence: one private Supabase Realtime channel per room.
//
//  - Every signed-in tab listens to all six room channels, so site-wide
//    counts ("N online") are real, but it only *tracks* itself in the channel
//    of the room it is in. Views that aren't one of the six rooms (the avatar
//    creator, the game room) track in the plaza channel with their own `room`
//    value, so they count as online without standing in the plaza.
//  - The plaza channel also carries broadcasts: `pos` (avatar position) and
//    `say` (speech bubbles).
//  - Presence is keyed by user id, so several tabs of one person count once.
//
// Channels are private (see supabase/migrations/0004_realtime_rooms.sql):
// only signed-in users can join them.

import { state } from './state.js';
import { supabase } from './supabase.js';

export const ROOMS = ['plaza', 'council', 'suggestions', 'events', 'guide', 'members'];

const channels = {};                 // room -> RealtimeChannel
const roomState = {};                // room -> Map(user_id -> meta)
let currentRoom = null;              // what this tab is looking at
const listeners = new Set();
const broadcastHandlers = {};        // 'pos' | 'say' | 'join' -> fn

const channelFor = (room) => (ROOMS.includes(room) ? room : 'plaza');

export function onPresenceChange(fn) { listeners.add(fn); }
export function onPlazaEvent(event, fn) { broadcastHandlers[event] = fn; }
function emit() {
  for (const fn of listeners) { try { fn(); } catch (e) { console.error('[presence] listener', e); } }
}

function myMeta(room) {
  const p = state.profile || {};
  return {
    user_id: state.auth.id,
    handle: state.auth.github_username,
    display_name: p.display_name || null,
    country_code: p.country_code || null,
    hair: state.avatar.hair,
    hair_color: state.avatar.hairColor,
    skin: state.avatar.skin,
    top: state.avatar.top,
    bottom: state.avatar.bottom,
    room,
  };
}

export function startPresence() {
  if (!supabase || !state.auth || channels.plaza) return;
  for (const room of ROOMS) {
    const ch = supabase.channel('room:' + room, {
      config: { private: true, presence: { key: state.auth.id }, broadcast: { self: false } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      const map = new Map();
      for (const [key, metas] of Object.entries(ch.presenceState())) {
        const m = metas[metas.length - 1];
        if (m && m.user_id === key) map.set(key, m);
      }
      roomState[room] = map;
      emit();
    });
    if (room === 'plaza') {
      ch.on('presence', { event: 'join' }, ({ key }) => {
        if (key !== state.auth.id) broadcastHandlers.join?.(key);
      });
      ch.on('broadcast', { event: 'pos' }, ({ payload }) => broadcastHandlers.pos?.(payload));
      ch.on('broadcast', { event: 'say' }, ({ payload }) => broadcastHandlers.say?.(payload));
    }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' && currentRoom && channelFor(currentRoom) === room) {
        ch.track(myMeta(currentRoom));
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('[presence]', room, status);
      }
    });
    channels[room] = ch;
  }
}

// Called by nav() whenever the visible room changes.
export async function setPresenceRoom(room) {
  if (!channels.plaza || !room || room === currentRoom) return;
  const prev = currentRoom;
  currentRoom = room;
  const prevCh = prev ? channels[channelFor(prev)] : null;
  const nextCh = channels[channelFor(room)];
  if (prevCh && prevCh !== nextCh && prevCh.state === 'joined') await prevCh.untrack();
  if (nextCh?.state === 'joined') await nextCh.track(myMeta(room));
}

// Re-send our meta after the avatar or profile changed.
export function retrackPresence() {
  const ch = currentRoom ? channels[channelFor(currentRoom)] : null;
  if (ch?.state === 'joined') ch.track(myMeta(currentRoom));
}

export function sendPlaza(event, payload) {
  const ch = channels.plaza;
  if (ch?.state === 'joined') ch.send({ type: 'broadcast', event, payload });
}

// People whose tab is in `room` (deduped by user).
export function usersInRoom(room) {
  const map = roomState[channelFor(room)];
  if (!map) return [];
  return [...map.values()].filter((m) => m.room === room);
}

export function onlineUserIds() {
  const ids = new Set();
  for (const map of Object.values(roomState)) for (const id of map.keys()) ids.add(id);
  return ids;
}

export function presenceReady() { return !!channels.plaza; }
