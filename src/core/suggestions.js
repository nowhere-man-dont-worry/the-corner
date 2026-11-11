// Suggestions, votes and comments — backed by Supabase (migration 0005).
//
//  - loadSuggestions() calls the suggestions_feed() RPC: every suggestion with
//    its score, comment count and *your* vote (nobody else's votes are
//    readable).
//  - Posting, voting and commenting are optimistic, like chat: the change
//    shows at once and is rolled back if the database refuses it.
//  - subscribeSuggestions() streams new suggestions, score / comment-count
//    changes (kept up to date by triggers) and comments.
//  - created_by / created_handle / user_id are set by triggers; the client
//    never sends them.

import { state } from './state.js';
import { supabase } from './supabase.js';

let items = [];                 // feed rows (+ pending flag for optimistic ones)
const comments = {};            // suggestion id -> [rows]
const commentsLoaded = new Set();

export const getSuggestions = () => items;
export const getComments = (sid) => comments[sid] || [];
export const commentsAreLoaded = (sid) => commentsLoaded.has(sid);

const tempId = () => 'temp-' + Math.random().toString(36).slice(2);

export async function loadSuggestions() {
  if (!supabase || !state.auth) { items = []; return items; }
  const { data, error } = await supabase.rpc('suggestions_feed');
  if (error) { console.error('[suggestions] load:', error); return items; }
  items = data || [];
  return items;
}

export function recentCount(days = 7) {
  const since = Date.now() - days * 864e5;
  return items.filter((s) => !s.pending && new Date(s.created_at).getTime() >= since).length;
}

export async function postSuggestion({ title, body }, onChange) {
  if (!supabase || !state.auth) return { error: new Error('Sign in first.') };
  const id = tempId();
  items.unshift({
    id, title, body, created_by: state.auth.id, created_handle: state.auth.github_username,
    created_at: new Date().toISOString(), score: 0, comment_count: 0, my_vote: null, pending: true,
  });
  onChange?.();
  const { data, error } = await supabase.from('suggestions').insert({ title, body }).select().single();
  const i = items.findIndex((s) => s.id === id);
  if (error) {
    if (i >= 0) items.splice(i, 1);
    onChange?.();
    return { error };
  }
  // The realtime INSERT may have arrived first; keep a single copy.
  const dup = items.findIndex((s) => s.id === data.id);
  if (dup >= 0 && dup !== i) items.splice(dup, 1);
  const j = items.findIndex((s) => s.id === id);
  if (j >= 0) items[j] = { ...data, my_vote: null };
  onChange?.();
  return { error: null };
}

// dir: 1 (up) or -1 (down). Clicking the arrow you already chose removes it.
export async function vote(id, dir, onChange) {
  const s = items.find((x) => x.id === id);
  if (!s || s.pending || !supabase || !state.auth) return { error: null };
  const prev = s.my_vote ?? null;
  const next = prev === dir ? null : dir;
  s.my_vote = next;
  s.score += (next || 0) - (prev || 0);
  onChange?.();
  const q = next === null
    ? supabase.from('suggestion_votes').delete().eq('suggestion_id', id)
    : supabase.from('suggestion_votes').upsert({ suggestion_id: id, value: next }, { onConflict: 'suggestion_id,user_id' });
  const { error } = await q;
  if (error) {
    s.my_vote = prev;
    s.score -= (next || 0) - (prev || 0);
    onChange?.();
    return { error };
  }
  return { error: null };
}

export async function deleteSuggestion(id, onChange) {
  const i = items.findIndex((s) => s.id === id);
  if (i < 0 || !supabase) return { error: null };
  const [removed] = items.splice(i, 1);
  onChange?.();
  const { data, error } = await supabase.from('suggestions').delete().eq('id', id).select('id');
  if (error || !data?.length) {
    items.splice(i, 0, removed);
    onChange?.();
    return { error: error || new Error('not allowed') };
  }
  return { error: null };
}

export async function loadComments(sid) {
  if (!supabase || !state.auth) return [];
  const { data, error } = await supabase
    .from('suggestion_comments').select('*').eq('suggestion_id', sid).order('created_at');
  if (error) { console.error('[suggestions] comments:', error); return getComments(sid); }
  comments[sid] = data || [];
  commentsLoaded.add(sid);
  return comments[sid];
}

export async function addComment(sid, body, onChange) {
  if (!supabase || !state.auth) return { error: new Error('Sign in first.') };
  const id = tempId();
  (comments[sid] ||= []).push({
    id, suggestion_id: sid, body, created_by: state.auth.id,
    created_handle: state.auth.github_username, created_at: new Date().toISOString(), pending: true,
  });
  onChange?.();
  const { data, error } = await supabase.from('suggestion_comments').insert({ suggestion_id: sid, body }).select().single();
  const list = comments[sid];
  const i = list.findIndex((c) => c.id === id);
  if (error) {
    if (i >= 0) list.splice(i, 1);
    onChange?.();
    return { error };
  }
  const dup = list.findIndex((c) => c.id === data.id);
  if (dup >= 0 && dup !== i) list.splice(dup, 1);
  const j = list.findIndex((c) => c.id === id);
  if (j >= 0) list[j] = data;
  onChange?.();
  return { error: null };
}

export async function deleteComment(sid, id, onChange) {
  const list = comments[sid] || [];
  const i = list.findIndex((c) => c.id === id);
  if (i < 0 || !supabase) return { error: null };
  const [removed] = list.splice(i, 1);
  onChange?.();
  const { data, error } = await supabase.from('suggestion_comments').delete().eq('id', id).select('id');
  if (error || !data?.length) {
    list.splice(i, 0, removed);
    onChange?.();
    return { error: error || new Error('not allowed') };
  }
  return { error: null };
}

export function canDelete(row) {
  return !!state.auth && !row.pending && (row.created_by === state.auth.id || state.isAdmin);
}

export function subscribeSuggestions(onChange) {
  if (!supabase || !state.auth) return;
  supabase.channel('suggestions-stream')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' }, ({ new: row }) => {
      if (items.some((s) => s.id === row.id)) return;
      // Our own optimistic copy is swapped in by postSuggestion(); skip the echo.
      if (row.created_by === state.auth.id && items.some((s) => s.pending && s.title === row.title)) return;
      items.unshift({ ...row, my_vote: null });
      onChange?.();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'suggestions' }, ({ new: row }) => {
      const s = items.find((x) => x.id === row.id);
      if (!s) return;
      s.score = row.score;
      s.comment_count = row.comment_count;
      onChange?.();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'suggestions' }, ({ old }) => {
      const i = items.findIndex((s) => s.id === old?.id);
      if (i >= 0) { items.splice(i, 1); onChange?.(); }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestion_comments' }, ({ new: row }) => {
      if (!commentsLoaded.has(row.suggestion_id)) return;
      const list = comments[row.suggestion_id];
      if (list.some((c) => c.id === row.id)) return;
      if (row.created_by === state.auth.id && list.some((c) => c.pending && c.body === row.body)) return;
      list.push(row);
      onChange?.();
    })
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'suggestion_comments' }, ({ old }) => {
      for (const sid of Object.keys(comments)) {
        const i = comments[sid].findIndex((c) => c.id === old?.id);
        if (i >= 0) { comments[sid].splice(i, 1); onChange?.(); }
      }
    })
    .subscribe();
}
