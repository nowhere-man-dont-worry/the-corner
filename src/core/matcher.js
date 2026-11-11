// Weekly classmate matcher (migration 0008). You opt in on the Members page;
// on Sundays a pg_cron job groups everyone who opted in. You can only read
// the rows of your own group, so this returns your group for the current week.

import { state } from './state.js';
import { supabase } from './supabase.js';
import { dateToParisInput } from '../utils/paris-time.js';

// Monday of the current week in Paris, as YYYY-MM-DD.
function thisMondayParis() {
  const today = dateToParisInput(new Date()).slice(0, 10);
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// -> { week_start, user_ids: [...others] } or null when there's no match yet.
export async function loadMyMatch() {
  if (!supabase || !state.auth) return null;
  const { data, error } = await supabase
    .from('matches')
    .select('week_start, group_id, user_id')
    .gte('week_start', thisMondayParis())
    .order('week_start', { ascending: false });
  if (error) { console.error('[matcher] load:', error); return null; }
  const mine = (data || []).find((r) => r.user_id === state.auth.id);
  if (!mine) return null;
  return {
    week_start: mine.week_start,
    user_ids: data.filter((r) => r.group_id === mine.group_id && r.user_id !== state.auth.id).map((r) => r.user_id),
  };
}
