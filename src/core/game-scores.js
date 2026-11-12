// Minigame rounds, scores and leaderboards (migration 0012). Generic: any
// minigame can use it with its own game id.
//
//  - startRound / finishRound are RPCs. The server picks the delay, stamps
//    the time, checks the reported reaction time against what it measured,
//    and writes the score itself at the end of a valid 5-round run.
//  - leaderboard() returns one best run per person (week or all time).
//  - onScoresChange() fires when anyone's score is added or deleted
//    (realtime), so leaderboards and the plaza door stay live.

import { state } from './state.js';
import { supabase } from './supabase.js';

const listeners = new Set();
let subscribed = false;

function rpcError(error) {
  // Postgres "raise exception" messages are written for people; show those.
  return new Error(error?.message || 'Something went wrong.');
}

export async function startRound(gameId, runId = null) {
  const { data, error } = await supabase.rpc('start_round', { p_game_id: gameId, p_run_id: runId });
  if (error) throw rpcError(error);
  return data;   // { run_id, round_id, round_no, delay_ms }
}

export async function finishRound(roundId, clientMs, early = false) {
  const { data, error } = await supabase.rpc('finish_round', {
    p_round_id: roundId, p_client_ms: clientMs == null ? null : Math.round(clientMs), p_early: early,
  });
  if (error) throw rpcError(error);
  return data;   // { round_no, status, reason, client_ms, server_ms, run_void, run_complete?, score?, ... }
}

// scope: 'week' (since Monday 00:00 Paris) or 'all'
export async function leaderboard(gameId, scope) {
  if (!supabase || !state.auth) return [];
  const { data, error } = await supabase.rpc('game_leaderboard', { p_game_id: gameId, p_scope: scope });
  if (error) { console.error('[games] leaderboard:', error); return []; }
  return data || [];
}

// Your best score and your last `n` runs.
export async function myScores(gameId, n = 5) {
  if (!supabase || !state.auth) return { best: null, recent: [] };
  const [recent, best] = await Promise.all([
    supabase.from('game_scores').select('score, details, created_at').eq('game_id', gameId)
      .eq('user_id', state.auth.id).order('created_at', { ascending: false }).limit(n),
    supabase.from('game_scores').select('score, created_at').eq('game_id', gameId)
      .eq('user_id', state.auth.id).order('score').order('created_at').limit(1),
  ]);
  if (recent.error) console.error('[games] my scores:', recent.error);
  return { best: best.data?.[0] || null, recent: recent.data || [] };
}

export function onScoresChange(fn) {
  listeners.add(fn);
  if (!subscribed && supabase && state.auth) {
    subscribed = true;
    supabase.channel('game-scores-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_scores' }, (payload) => {
        for (const l of listeners) { try { l(payload); } catch (e) { console.error(e); } }
      })
      .subscribe();
  }
  return () => listeners.delete(fn);
}
