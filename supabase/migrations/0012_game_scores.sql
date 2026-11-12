-- 0012: server-timed minigame rounds and scores (first user: the reaction
-- timer).
--
-- A run is 5 rounds; its score is the average of the 5 reaction times. The
-- server picks each round's delay and stamps when it was issued, then checks
-- the time the client reports against the time it saw itself. Clients have
-- no table access to rounds at all; they go through start_round() and
-- finish_round(). Scores are written only by finish_round().

-- ------------------------------------------------------------ settings
-- Every threshold lives here so it can be tuned with one UPDATE, e.g.
--   update public.game_settings set value = 350 where key = 'max_under_server_ms';
create table public.game_settings (
  key text primary key,
  value numeric not null,
  note text
);
alter table public.game_settings enable row level security;
revoke all on public.game_settings from anon, authenticated;
insert into public.game_settings (key, value, note) values
  ('min_client_ms',        100, 'faster than this is not a human reaction'),
  ('max_over_server_ms',    30, 'client may claim at most this much MORE time than the server saw'),
  ('max_under_server_ms',  400, 'client may claim at most this much LESS time than the server saw (network lag allowance)'),
  ('round_ttl_s',           30, 'a round must be finished within this many seconds of being issued'),
  ('rate_limit_rounds',     60, 'max rounds a user can start per window'),
  ('rate_limit_window_min', 10, 'rate limit window in minutes'),
  ('delay_min_ms',        1500, 'shortest wait before green'),
  ('delay_max_ms',        4000, 'longest wait before green'),
  ('rounds_per_run',         5, 'rounds in one run');

create or replace function public.game_setting(k text) returns numeric
language sql stable security definer set search_path = '' as $$
  select value from public.game_settings where key = k;
$$;
revoke execute on function public.game_setting(text) from public, anon, authenticated;

-- ------------------------------------------------------------ rounds
create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null check (game_id ~ '^[a-z0-9-]{1,40}$'),
  run_id uuid not null,
  round_no smallint not null check (round_no between 1 and 5),
  issued_at timestamptz not null default now(),
  delay_ms integer not null,
  finished_at timestamptz,
  client_ms integer,
  server_ms integer,
  status text not null default 'issued'
    check (status in ('issued', 'done', 'early', 'rejected', 'expired')),
  reject_reason text,
  unique (run_id, round_no)
);
create index game_rounds_user_issued_idx on public.game_rounds (user_id, issued_at desc);
alter table public.game_rounds enable row level security;   -- no policies: no client access
revoke all on public.game_rounds from anon, authenticated;

-- For tuning the thresholds from real data (SQL editor only).
create view public.game_rejected_rounds with (security_invoker = true) as
  select r.issued_at, p.handle, r.game_id, r.round_no, r.client_ms, r.server_ms,
         r.server_ms - r.client_ms as server_minus_client_ms, r.reject_reason
    from public.game_rounds r left join public.profiles p using (user_id)
   where r.status in ('rejected', 'expired')
   order by r.issued_at desc;
revoke all on public.game_rejected_rounds from anon, authenticated;

-- ------------------------------------------------------------ scores
create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric not null,
  details jsonb not null,           -- the 5 reaction times, in round order
  created_at timestamptz not null default now()
);
create index game_scores_board_idx on public.game_scores (game_id, score, created_at);
alter table public.game_scores enable row level security;
revoke all on public.game_scores from anon, authenticated;
grant select, delete on public.game_scores to authenticated;   -- never insert/update
create policy "signed-in users read scores" on public.game_scores
  for select to authenticated using (true);
create policy "delete own or admin" on public.game_scores
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ RPCs
create or replace function public.start_round(p_game_id text, p_run_id uuid default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  ttl interval := make_interval(secs => public.game_setting('round_ttl_s'));
  win interval := make_interval(mins => public.game_setting('rate_limit_window_min')::int);
  per_run int := public.game_setting('rounds_per_run')::int;
  v_run uuid;
  v_no int;
  v_delay int;
  v_id uuid;
begin
  if uid is null then raise exception 'sign in first'; end if;
  if p_game_id is null or p_game_id !~ '^[a-z0-9-]{1,40}$' then raise exception 'unknown game'; end if;
  perform pg_advisory_xact_lock(hashtext('game_rounds:' || uid::text));

  update public.game_rounds set status = 'expired', reject_reason = 'never finished'
   where user_id = uid and status = 'issued' and issued_at < now() - ttl;

  if exists (select 1 from public.game_rounds where user_id = uid and status = 'issued') then
    raise exception 'finish your current round first';
  end if;
  if (select count(*) from public.game_rounds where user_id = uid and issued_at > now() - win)
     >= public.game_setting('rate_limit_rounds') then
    raise exception 'too many rounds, take a short break';
  end if;

  if p_run_id is null then
    v_run := gen_random_uuid();
    v_no := 1;
  else
    v_run := p_run_id;
    if not exists (select 1 from public.game_rounds
                    where run_id = v_run and user_id = uid and game_id = p_game_id) then
      raise exception 'run not found';
    end if;
    if exists (select 1 from public.game_rounds where run_id = v_run and status <> 'done') then
      raise exception 'this run is over, start a new one';
    end if;
    select max(round_no) + 1 into v_no from public.game_rounds where run_id = v_run;
    if v_no > per_run then raise exception 'this run is complete, start a new one'; end if;
  end if;

  v_delay := public.game_setting('delay_min_ms')::int
           + floor(random() * (public.game_setting('delay_max_ms') - public.game_setting('delay_min_ms')))::int;
  insert into public.game_rounds (user_id, game_id, run_id, round_no, delay_ms)
       values (uid, p_game_id, v_run, v_no, v_delay)
    returning id into v_id;
  return jsonb_build_object('run_id', v_run, 'round_id', v_id, 'round_no', v_no, 'delay_ms', v_delay);
end $$;

create or replace function public.finish_round(p_round_id uuid, p_client_ms integer, p_early boolean default false)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r public.game_rounds;
  v_server int;
  v_status text := 'done';
  v_reason text;
  per_run int := public.game_setting('rounds_per_run')::int;
  v_times jsonb;
  v_score numeric;
  v_prev_best numeric;
  v_week_start timestamptz := date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  v_out jsonb;
begin
  if uid is null then raise exception 'sign in first'; end if;
  select * into r from public.game_rounds where id = p_round_id for update;
  if not found or r.user_id <> uid then raise exception 'round not found'; end if;
  if r.status <> 'issued' then raise exception 'round already finished'; end if;

  v_server := round(extract(epoch from (now() - (r.issued_at + make_interval(secs => r.delay_ms / 1000.0)))) * 1000);

  if coalesce(p_early, false) then
    v_status := 'early';
  elsif now() - r.issued_at > make_interval(secs => public.game_setting('round_ttl_s')) then
    v_status := 'expired'; v_reason := 'older than the round time limit';
  elsif p_client_ms is null or p_client_ms < public.game_setting('min_client_ms') then
    v_status := 'rejected'; v_reason := 'faster than humanly possible';
  elsif p_client_ms > v_server + public.game_setting('max_over_server_ms') then
    v_status := 'rejected'; v_reason := 'claims more time than the server saw';
  elsif v_server - p_client_ms > public.game_setting('max_under_server_ms') then
    v_status := 'rejected'; v_reason := 'claims much faster than the server saw';
  end if;

  update public.game_rounds
     set status = v_status, reject_reason = v_reason, finished_at = now(),
         client_ms = p_client_ms, server_ms = v_server
   where id = r.id;

  v_out := jsonb_build_object('round_no', r.round_no, 'status', v_status, 'reason', v_reason,
                            'client_ms', p_client_ms, 'server_ms', v_server,
                            'run_void', v_status <> 'done');

  if v_status = 'done' and r.round_no = per_run
     and (select count(*) from public.game_rounds where run_id = r.run_id and status = 'done') = per_run then
    select jsonb_agg(client_ms order by round_no), round(avg(client_ms), 1)
      into v_times, v_score
      from public.game_rounds where run_id = r.run_id;
    select min(score) into v_prev_best from public.game_scores where game_id = r.game_id and user_id = uid;
    insert into public.game_scores (game_id, user_id, score, details) values (r.game_id, uid, v_score, v_times);
    v_out := v_out || jsonb_build_object(
      'run_complete', true,
      'score', v_score,
      'times', v_times,
      'personal_best', v_prev_best is null or v_score < v_prev_best,
      'rank_all_time', 1 + (select count(*) from (
          select user_id, min(score) best from public.game_scores where game_id = r.game_id group by user_id) b
          where b.best < (select min(score) from public.game_scores where game_id = r.game_id and user_id = uid)),
      'rank_week', 1 + (select count(*) from (
          select user_id, min(score) best from public.game_scores
           where game_id = r.game_id and created_at >= v_week_start group by user_id) b
          where b.best < (select min(score) from public.game_scores
                           where game_id = r.game_id and user_id = uid and created_at >= v_week_start)));
  end if;
  return v_out;
end $$;

-- One row per person: their best run, lowest first. p_scope: 'week'
-- (since Monday 00:00 Paris) or 'all'.
create or replace function public.game_leaderboard(p_game_id text, p_scope text default 'all')
returns table (rank bigint, user_id uuid, score numeric, details jsonb, created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  with best as (
    select distinct on (s.user_id) s.user_id, s.score, s.details, s.created_at
      from public.game_scores s
     where s.game_id = p_game_id
       and (p_scope <> 'week' or s.created_at >= date_trunc('week', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris')
     order by s.user_id, s.score, s.created_at
  )
  select rank() over (order by b.score, b.created_at), b.user_id, b.score, b.details, b.created_at
    from best b order by b.score, b.created_at;
$$;

revoke execute on function public.start_round(text, uuid) from public, anon;
revoke execute on function public.finish_round(uuid, integer, boolean) from public, anon;
revoke execute on function public.game_leaderboard(text, text) from public, anon;
grant execute on function public.start_round(text, uuid) to authenticated;
grant execute on function public.finish_round(uuid, integer, boolean) to authenticated;
grant execute on function public.game_leaderboard(text, text) to authenticated;

alter publication supabase_realtime add table public.game_scores;
