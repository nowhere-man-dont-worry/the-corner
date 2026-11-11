// Events and RSVPs — backed by Supabase (migration 0007).
//
//  - created_by / created_handle and RSVP user_id are set by triggers.
//  - The database rejects events that start in the past.
//  - RSVPs are optimistic with rollback; everything streams live.

import { state } from './state.js';
import { supabase } from './supabase.js';

let events = [];
let rsvps = [];   // { event_id, user_id, status }

export const getEvents = () => events;
export const rsvpsFor = (eventId) => rsvps.filter((r) => r.event_id === eventId);
export const myRsvp = (eventId) => rsvps.find((r) => r.event_id === eventId && r.user_id === state.auth?.id)?.status || null;

export const isPast = (e) => new Date(e.ends_at || e.starts_at).getTime() < Date.now();
export const upcoming = () => events.filter((e) => !isPast(e)).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
export const past = () => events.filter(isPast).sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

export async function loadEvents() {
  if (!supabase || !state.auth) return;
  const [e, r] = await Promise.all([
    supabase.from('events').select('*').order('starts_at'),
    supabase.from('event_rsvps').select('event_id, user_id, status'),
  ]);
  if (e.error) console.error('[events] load:', e.error); else events = e.data || [];
  if (r.error) console.error('[events] rsvps:', r.error); else rsvps = r.data || [];
}

export async function createEvent(fields, onChange) {
  if (!supabase || !state.auth) return { error: new Error('Sign in first.') };
  const id = 'temp-' + Math.random().toString(36).slice(2);
  events.push({ id, ...fields, created_by: state.auth.id, created_handle: state.auth.github_username, created_at: new Date().toISOString(), pending: true });
  onChange?.();
  const { data, error } = await supabase.from('events').insert(fields).select().single();
  const i = events.findIndex((e) => e.id === id);
  if (error) {
    if (i >= 0) events.splice(i, 1);
    onChange?.();
    return { error };
  }
  const dup = events.findIndex((e) => e.id === data.id);
  if (dup >= 0 && dup !== i) events.splice(dup, 1);
  const j = events.findIndex((e) => e.id === id);
  if (j >= 0) events[j] = data;
  onChange?.();
  return { error: null };
}

// status 'going' | 'maybe'; picking your current status again removes it.
export async function setRsvp(eventId, status, onChange) {
  if (!supabase || !state.auth) return { error: null };
  const me = state.auth.id;
  const prev = myRsvp(eventId);
  const next = prev === status ? null : status;
  rsvps = rsvps.filter((r) => !(r.event_id === eventId && r.user_id === me));
  if (next) rsvps.push({ event_id: eventId, user_id: me, status: next });
  onChange?.();
  const q = next
    ? supabase.from('event_rsvps').upsert({ event_id: eventId, status: next }, { onConflict: 'event_id,user_id' })
    : supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', me);
  const { error } = await q;
  if (error) {
    rsvps = rsvps.filter((r) => !(r.event_id === eventId && r.user_id === me));
    if (prev) rsvps.push({ event_id: eventId, user_id: me, status: prev });
    onChange?.();
    return { error };
  }
  return { error: null };
}

export async function deleteEvent(id, onChange) {
  const i = events.findIndex((e) => e.id === id);
  if (i < 0 || !supabase) return { error: null };
  const [removed] = events.splice(i, 1);
  onChange?.();
  const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
  if (error || !data?.length) {
    events.splice(i, 0, removed);
    onChange?.();
    return { error: error || new Error('not allowed') };
  }
  rsvps = rsvps.filter((r) => r.event_id !== id);
  return { error: null };
}

export function canDeleteEvent(e) {
  return !!state.auth && !e.pending && (e.created_by === state.auth.id || state.isAdmin);
}

export function subscribeEvents(onChange) {
  if (!supabase || !state.auth) return;
  supabase.channel('events-stream')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, ({ new: row }) => {
      if (events.some((e) => e.id === row.id)) return;
      if (row.created_by === state.auth.id && events.some((e) => e.pending && e.title === row.title)) return;
      events.push(row);
      onChange?.();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'events' }, ({ old }) => {
      const i = events.findIndex((e) => e.id === old?.id);
      if (i >= 0) { events.splice(i, 1); rsvps = rsvps.filter((r) => r.event_id !== old.id); onChange?.(); }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, ({ eventType, new: row, old }) => {
      const key = eventType === 'DELETE' ? old : row;
      if (!key?.event_id || !key?.user_id) return;
      rsvps = rsvps.filter((r) => !(r.event_id === key.event_id && r.user_id === key.user_id));
      if (eventType !== 'DELETE') rsvps.push({ event_id: row.event_id, user_id: row.user_id, status: row.status });
      onChange?.();
    })
    .subscribe();
}
