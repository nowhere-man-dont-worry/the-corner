// Council motions and secret votes — backed by Supabase (migration 0006).
//
//  - You can only read your own vote. Tallies (counts only) come from the
//    motion_tallies() RPC and are refetched whenever a motion's last_vote_at
//    changes (realtime UPDATE), so they stay live without exposing ballots.
//  - Raising and voting are optimistic with rollback.
//  - A motion past closes_at reads as closed even if its status is 'open'.
//  - Only admins can change status / outcome (set_motion_outcome RPC; the
//    database checks is_admin()).

import { state } from './state.js';
import { supabase } from './supabase.js';

let motions = [];
let tallies = {};      // motion id -> { yes, no, abstain }
let myVotes = {};      // motion id -> 'yes' | 'no' | 'abstain'

export const getMotions = () => motions;
export const tallyOf = (id) => tallies[id] || { yes: 0, no: 0, abstain: 0 };
export const myVoteOn = (id) => myVotes[id] || null;

export function effectiveStatus(m) {
  if (m.status === 'open' && new Date(m.closes_at).getTime() <= Date.now()) return 'closed';
  return m.status;
}
export const isOpen = (m) => !m.pending && effectiveStatus(m) === 'open';
export const openCount = () => motions.filter(isOpen).length;

export async function loadCouncil() {
  if (!supabase || !state.auth) return;
  const [m, t, v] = await Promise.all([
    supabase.from('motions').select('*').order('created_at', { ascending: false }),
    supabase.rpc('motion_tallies'),
    supabase.from('motion_votes').select('motion_id, vote'),
  ]);
  if (m.error) console.error('[council] motions:', m.error); else motions = m.data || [];
  if (t.error) console.error('[council] tallies:', t.error); else tallies = Object.fromEntries((t.data || []).map((r) => [r.motion_id, r]));
  if (v.error) console.error('[council] my votes:', v.error); else myVotes = Object.fromEntries((v.data || []).map((r) => [r.motion_id, r.vote]));
}

async function refreshTallies() {
  const { data, error } = await supabase.rpc('motion_tallies');
  if (!error) tallies = Object.fromEntries((data || []).map((r) => [r.motion_id, r]));
}

export async function raiseMotion({ title, body }, onChange) {
  if (!supabase || !state.auth) return { error: new Error('Sign in first.') };
  const id = 'temp-' + Math.random().toString(36).slice(2);
  motions.unshift({
    id, title, body, created_by: state.auth.id, created_handle: state.auth.github_username,
    created_at: new Date().toISOString(), closes_at: new Date(Date.now() + 7 * 864e5).toISOString(),
    status: 'open', outcome_note: null, pending: true,
  });
  onChange?.();
  const { data, error } = await supabase.from('motions').insert({ title, body }).select().single();
  const i = motions.findIndex((m) => m.id === id);
  if (error) {
    if (i >= 0) motions.splice(i, 1);
    onChange?.();
    return { error };
  }
  const dup = motions.findIndex((m) => m.id === data.id);
  if (dup >= 0 && dup !== i) motions.splice(dup, 1);
  const j = motions.findIndex((m) => m.id === id);
  if (j >= 0) motions[j] = data;
  onChange?.();
  return { error: null };
}

export async function castMotionVote(id, vote, onChange) {
  const m = motions.find((x) => x.id === id);
  if (!m || !isOpen(m) || !supabase || !state.auth) return { error: null };
  const prev = myVotes[id] || null;
  if (prev === vote) return { error: null };
  const t = (tallies[id] ||= { yes: 0, no: 0, abstain: 0 });
  if (prev) t[prev]--;
  t[vote]++;
  myVotes[id] = vote;
  onChange?.();
  const { error } = await supabase
    .from('motion_votes')
    .upsert({ motion_id: id, vote }, { onConflict: 'motion_id,user_id' });
  if (error) {
    t[vote]--;
    if (prev) t[prev]++;
    if (prev) myVotes[id] = prev; else delete myVotes[id];
    onChange?.();
    return { error };
  }
  return { error: null };
}

export async function setOutcome(id, status, note) {
  const { error } = await supabase.rpc('set_motion_outcome', { p_motion: id, p_status: status, p_note: note || '' });
  return { error };
}

export async function deleteMotion(id, onChange) {
  const i = motions.findIndex((m) => m.id === id);
  if (i < 0 || !supabase) return { error: null };
  const [removed] = motions.splice(i, 1);
  onChange?.();
  const { data, error } = await supabase.from('motions').delete().eq('id', id).select('id');
  if (error || !data?.length) {
    motions.splice(i, 0, removed);
    onChange?.();
    return { error: error || new Error('not allowed') };
  }
  return { error: null };
}

export function canDeleteMotion(m) {
  return !!state.auth && !m.pending && (m.created_by === state.auth.id || state.isAdmin);
}

let tallyTimer = null;
export function subscribeCouncil(onChange) {
  if (!supabase || !state.auth) return;
  supabase.channel('motions-stream')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'motions' }, ({ new: row }) => {
      if (motions.some((m) => m.id === row.id)) return;
      if (row.created_by === state.auth.id && motions.some((m) => m.pending && m.title === row.title)) return;
      motions.unshift(row);
      onChange?.();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'motions' }, ({ new: row }) => {
      const i = motions.findIndex((m) => m.id === row.id);
      if (i >= 0) motions[i] = row;
      // A vote happened somewhere: refetch the counts (debounced).
      clearTimeout(tallyTimer);
      tallyTimer = setTimeout(async () => { await refreshTallies(); onChange?.(); }, 250);
      onChange?.();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'motions' }, ({ old }) => {
      const i = motions.findIndex((m) => m.id === old?.id);
      if (i >= 0) { motions.splice(i, 1); onChange?.(); }
    })
    .subscribe();
}
