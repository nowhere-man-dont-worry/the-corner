-- 0006: council motions with secret votes.
--
--  - Any signed-in user raises a motion; created_by/handle come from the
--    sign_new_row() trigger (0005). closes_at is always 7 days after creation
--    and status always starts 'open', whatever the client sends.
--  - Votes are secret: you can only read your own motion_votes row. Tallies
--    come from motion_tallies(), a security definer function that returns
--    counts only. You can change your vote while the motion is open and
--    closes_at hasn't passed.
--  - Only admins change status / outcome_note, through set_motion_outcome().
--  - A motion past closes_at reads as closed (computed by the client from
--    closes_at; no cron needed).

create table public.motions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_handle text,
  created_at timestamptz not null default now(),
  closes_at timestamptz not null default (now() + interval '7 days'),
  status text not null default 'open'
    check (status in ('open', 'closed', 'brought_to_pedagogy', 'resolved')),
  outcome_note text check (outcome_note is null or char_length(outcome_note) <= 500),
  last_vote_at timestamptz   -- bumped on every vote so clients refetch tallies
);
create index motions_created_at_idx on public.motions (created_at desc);

create or replace function public.motions_defaults() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.closes_at := now() + interval '7 days';
  new.status := 'open';
  new.outcome_note := null;
  new.last_vote_at := null;
  return new;
end $$;
create trigger motions_sign before insert on public.motions
  for each row execute function public.sign_new_row();
create trigger motions_z_defaults before insert on public.motions
  for each row execute function public.motions_defaults();

alter table public.motions enable row level security;
create policy "signed-in users read motions" on public.motions
  for select to authenticated using (true);
create policy "signed-in users raise motions" on public.motions
  for insert to authenticated with check (created_by = auth.uid());
create policy "delete own or admin" on public.motions
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ votes
create table public.motion_votes (
  motion_id uuid not null references public.motions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  vote text not null check (vote in ('yes', 'no', 'abstain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (motion_id, user_id)
);
create trigger motion_votes_owner before insert or update on public.motion_votes
  for each row execute function public.own_vote_row();

create or replace function public.motion_is_open(m uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.motions x
                  where x.id = m and x.status = 'open' and x.closes_at > now());
$$;

alter table public.motion_votes enable row level security;
create policy "read own motion vote" on public.motion_votes
  for select to authenticated using (user_id = auth.uid());
create policy "vote while open" on public.motion_votes
  for insert to authenticated
  with check (user_id = auth.uid() and public.motion_is_open(motion_id));
create policy "change vote while open" on public.motion_votes
  for update to authenticated
  using (user_id = auth.uid() and public.motion_is_open(motion_id))
  with check (user_id = auth.uid() and public.motion_is_open(motion_id));

create or replace function public.motion_votes_touch() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end $$;
create trigger motion_votes_z_touch before update on public.motion_votes
  for each row execute function public.motion_votes_touch();

create or replace function public.motions_bump_votes() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.motions set last_vote_at = now()
   where id = coalesce(new.motion_id, old.motion_id);
  return null;
end $$;
create trigger motion_votes_bump after insert or update or delete on public.motion_votes
  for each row execute function public.motions_bump_votes();

-- ------------------------------------------------------------ RPCs
-- Counts only; never who voted what.
create or replace function public.motion_tallies()
returns table (motion_id uuid, yes integer, no integer, abstain integer)
language sql stable security definer set search_path = '' as $$
  select m.id,
         (count(*) filter (where v.vote = 'yes'))::int,
         (count(*) filter (where v.vote = 'no'))::int,
         (count(*) filter (where v.vote = 'abstain'))::int
    from public.motions m
    left join public.motion_votes v on v.motion_id = m.id
   where auth.uid() is not null
   group by m.id;
$$;
revoke execute on function public.motion_tallies() from public, anon;
grant execute on function public.motion_tallies() to authenticated;

create or replace function public.set_motion_outcome(p_motion uuid, p_status text, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'only an admin can change a motion''s status';
  end if;
  if p_status not in ('open', 'closed', 'brought_to_pedagogy', 'resolved') then
    raise exception 'invalid status %', p_status;
  end if;
  update public.motions
     set status = p_status, outcome_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_motion;
  if not found then raise exception 'motion not found'; end if;
end $$;
revoke execute on function public.set_motion_outcome(uuid, text, text) from public, anon;
grant execute on function public.set_motion_outcome(uuid, text, text) to authenticated;

revoke all on public.motions, public.motion_votes from anon;
revoke execute on function public.motion_is_open(uuid) from public, anon;
grant execute on function public.motion_is_open(uuid) to authenticated;

alter publication supabase_realtime add table public.motions;
