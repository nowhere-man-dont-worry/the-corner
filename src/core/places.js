// Guide places, backed by the Supabase `places` table.
//
//  - loadPlaces() fetches every place (the guide is small; no paging yet).
//  - addPlace() is optimistic like chat: the spot shows immediately with a
//    temp id, then INSERTs. On error it rolls back; on success it swaps in the
//    real row. submitted_by / submitted_handle are set by a DB trigger from
//    the signed-in user, never from what the client sends.

import { state } from './state.js';
import { supabase } from './supabase.js';

// Must match the places.category CHECK constraint.
export const PLACE_CATEGORIES = {
  food:                { name: 'Food',              color: '#ff6b4a', blurb: 'Cheap, good, vouched for by one of us.' },
  nightlife:           { name: 'Nightlife',         color: '#c589e8', blurb: 'Where to go when the week is done.' },
  admin:               { name: 'Admin / banks',     color: '#4a90c7', blurb: 'Paperwork without the tears.' },
  'student-resources': { name: 'Student resources', color: '#7fd4a8', blurb: 'Free food, discounts, cheap care, quiet desks.' },
};

let places = [];
export function getPlaces() { return places; }

export async function loadPlaces() {
  // Places are readable only when signed in (migration 0010).
  if (!supabase || !state.auth) { places = []; return places; }
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('[places] load:', error); return places; }
  places = data || [];
  return places;
}

// fields: { category, name, address, tip, lat, long }. onChange re-renders.
// Resolves to { error } (null on success).
export async function addPlace(fields, onChange) {
  if (!supabase) return { error: new Error('Supabase is not configured.') };
  if (!state.auth) return { error: new Error('Sign in to add a spot.') };

  const tempId = 'temp-' + Math.random().toString(36).slice(2);
  places.push({
    id: tempId, ...fields,
    submitted_handle: state.auth.github_username,
    created_at: new Date().toISOString(),
    pending: true,
  });
  onChange?.();

  const { data, error } = await supabase
    .from('places')
    .insert(fields)
    .select()
    .single();

  const idx = places.findIndex((p) => p.id === tempId);
  if (error) {
    if (idx >= 0) places.splice(idx, 1);
    onChange?.();
    console.error('[places] add:', error);
    return { error };
  }
  if (idx >= 0) places[idx] = data;
  onChange?.();
  return { error: null };
}

// Delete your own spot, or any spot as an admin. RLS decides; the UI only
// shows the button when it should work. Optimistic with rollback.
export async function deletePlace(id, onChange) {
  if (!supabase || !state.auth) return { error: new Error('Sign in first.') };
  const i = places.findIndex((p) => p.id === id);
  if (i < 0) return { error: null };
  const [removed] = places.splice(i, 1);
  onChange?.();
  const { data, error } = await supabase.from('places').delete().eq('id', id).select('id');
  if (error || !data?.length) {
    places.splice(i, 0, removed);
    onChange?.();
    return { error: error || new Error('not allowed') };
  }
  return { error: null };
}

// Live adds/deletes from classmates.
export function subscribePlaces(onChange) {
  if (!supabase || !state.auth) return;
  supabase.channel('places-stream')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'places' }, (payload) => {
      if (places.some((p) => p.id === payload.new.id)) return;
      places.push(payload.new);
      onChange?.();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'places' }, (payload) => {
      const i = places.findIndex((p) => p.id === payload.old?.id);
      if (i >= 0) { places.splice(i, 1); onChange?.(); }
    })
    .subscribe();
}

export function canDeletePlace(p) {
  return !!state.auth && !p.pending && (p.submitted_by === state.auth.id || state.isAdmin);
}
