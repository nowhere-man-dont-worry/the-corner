-- 0011: the weekly matcher draws at 18:00 Paris time all year.
--
-- pg_cron runs in UTC, and Paris is UTC+1 in winter and UTC+2 in summer, so
-- the job now runs every hour on Sundays and run_weekly_match() only does
-- anything during the 18:00 hour in Paris. The once-per-week guard
-- (matches already exist for this week -> do nothing) is unchanged.

-- True during Sunday 18:00–18:59 in Paris. A pure function of the time
-- given, so the hour check can be tested with any timestamp.
create or replace function public.is_match_hour(ts timestamptz) returns boolean
language sql immutable set search_path = '' as $$
  select extract(isodow from ts at time zone 'Europe/Paris') = 7
     and extract(hour from ts at time zone 'Europe/Paris') = 18;
$$;
revoke execute on function public.is_match_hour(timestamptz) from public, anon, authenticated;

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
  if not public.is_match_hour(now()) then
    return 0;                                   -- not Sunday 18:00 in Paris
  end if;
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

-- Every hour on Sundays (UTC); the function picks the 18:00 Paris hour.
select cron.schedule('weekly-classmate-match', '0 * * * 0', $$select public.run_weekly_match()$$);
