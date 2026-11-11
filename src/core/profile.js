import { state } from './state.js';
import { supabase } from './supabase.js';

function hydrateProfile(p) {
  state.profile = p;
  if (p?.hair) state.avatar.hair = p.hair;
  if (p?.hair_color) state.avatar.hairColor = p.hair_color;
  if (p?.skin) state.avatar.skin = p.skin;
  if (p?.top) state.avatar.top = p.top;
  if (p?.bottom) state.avatar.bottom = p.bottom;
  state.avatar.name = p?.display_name || p?.handle || state.avatar.name;
}

export async function ensureProfile() {
  if (!supabase || !state.auth) return null;
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', state.auth.id)
    .maybeSingle();
  if (existing) {
    hydrateProfile(existing);
    return existing;
  }
  const defaults = {
    user_id: state.auth.id,
    handle: state.auth.github_username,
    hair: state.avatar.hair,
    hair_color: state.avatar.hairColor,
    skin: state.avatar.skin,
    top: state.avatar.top,
    bottom: state.avatar.bottom,
  };
  const { data, error } = await supabase
    .from('profiles').insert(defaults).select().single();
  if (error) { console.error('[profile] create:', error); return null; }
  hydrateProfile(data);
  return data;
}

export async function saveProfile(patch) {
  if (!supabase || !state.auth) return null;
  const { data, error } = await supabase
    .from('profiles').update(patch).eq('user_id', state.auth.id).select().single();
  if (error) { console.error('[profile] save:', error); return null; }
  hydrateProfile(data);
  return data;
}

// Profiles are only readable when signed in (anon has no access).
export async function loadAllProfiles() {
  if (!supabase || !state.auth) { state.profiles = []; return []; }
  const { data, error } = await supabase
    .from('profiles').select('*').order('created_at', { ascending: true });
  if (error) { console.error('[profile] loadAll:', error); return []; }
  state.profiles = data || [];
  return state.profiles;
}

export function subscribeProfiles(onChange) {
  if (!supabase) return () => {};
  const ch = supabase.channel('profiles-stream')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      async () => { await loadAllProfiles(); onChange?.(); }
    )
    .subscribe();
  return () => ch.unsubscribe();
}

// Admin status only decides whether delete buttons show; RLS enforces it.
export async function loadIsAdmin() {
  state.isAdmin = false;
  if (!supabase || !state.auth) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) { console.error('[profile] is_admin:', error); return false; }
  state.isAdmin = data === true;
  return state.isAdmin;
}

export const PROFILE_TAGS = ['OPEN', 'DEFENSE', 'MUSICIAN', 'COOKS', 'NEW', 'FRANCOPHONE', 'GUIDE', 'COUNCIL'];
