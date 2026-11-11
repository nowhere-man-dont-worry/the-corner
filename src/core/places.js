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
  if (!supabase) { places = []; return places; }
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
