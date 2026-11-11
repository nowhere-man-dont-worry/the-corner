-- 0008: weekly classmate matcher.
--
--  - profiles.matcher_opt_in is toggled by each person on the Members page
--    (the existing "users update own profile" policy covers it).
--  - matches rows are written only by run_weekly_match() (security definer,
--    not executable by clients). Clients can read rows of their own group
--    only.
--  - pg_cron runs it on Sundays at 17:00 UTC (18:00 in Paris in winter,
--    19:00 during summer time). Running it twice for the same week does
--    nothing the second time.

alter table public.profiles add column matcher_opt_in boolean not null default false;

create table public.matches (
  week_start date not null,
  group_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week_start, user_id)
);
create index matches_group_idx on public.matches (group_id);

alter table public.matches enable row level security;
revoke all on public.matches from anon, authenticated;
grant select on public.matches to authenticated;

-- The groups the caller belongs to. security definer so the policy below
-- doesn't have to query matches through its own RLS (no recursion).
create or replace function public.my_match_groups() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select m.group_id from public.matches m where m.user_id = auth.uid();
$$;
revoke execute on function public.my_match_groups() from public, anon;
grant execute on function public.my_match_groups() to authenticated;

create policy "read your own group" on public.matches
  for select to authenticated
  using (group_id in (select public.my_match_groups()));

-- The week a draw belongs to: the Monday of the week that starts on or after
-- the moment it runs (Sunday 18:00 Paris -> the next day, Monday).
create or replace function public.match_week_start(ts timestamptz default now()) returns date
language sql stable set search_path = '' as $$
  select (date_trunc('week', (ts at time zone 'Europe/Paris') + interval '1 day'))::date;
$$;

create or replace function public.run_weekly_match() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  wk date := public.match_week_start(now());
  ids uuid[];
  n int;
  groups int;
  gid uuid[];
  g int;
begin
  perform pg_advisory_xact_lock(hashtext('run_weekly_match'));
  if exists (select 1 from public.matches where week_start = wk) then
    return 0;                                   -- already drawn this week
  end if;
  select array_agg(p.user_id order by random()) into ids
    from public.profiles p where p.matcher_opt_in;
  n := coalesce(array_length(ids, 1), 0);
  if n < 2 then return 0; end if;               -- nobody to match with
  groups := n / 3 + case when n % 3 = 2 then 1 else 0 end;
  if groups = 0 then groups := 1; end if;
  gid := array(select gen_random_uuid() from generate_series(1, groups));
  for i in 1..n loop
    g := (i - 1) / 3 + 1;
    if n % 3 = 1 and i = n then g := g - 1; end if;   -- a lone remainder joins a group of 3
    insert into public.matches (week_start, group_id, user_id) values (wk, gid[g], ids[i]);
  end loop;
  return n;
end $$;
revoke execute on function public.run_weekly_match() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('weekly-classmate-match', '0 17 * * 0', $$select public.run_weekly_match()$$);
