-- 0007: events and RSVPs.
--
--  - created_by / created_handle come from sign_new_row() (0005).
--  - A trigger rejects a starts_at in the past on insert.
--  - RSVPs are 'going' or 'maybe', one per person per event; you can only
--    add, change or remove your own. Everyone signed in can see who's going.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  description text check (description is null or char_length(description) <= 800),
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  location text check (location is null or char_length(location) <= 200),
  place_id uuid references public.places(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_handle text,
  created_at timestamptz not null default now()
);
create index events_starts_at_idx on public.events (starts_at);

create or replace function public.events_not_in_past() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.starts_at < now() then
    raise exception 'an event can''t start in the past';
  end if;
  return new;
end $$;
create trigger events_sign before insert on public.events
  for each row execute function public.sign_new_row();
create trigger events_z_future before insert on public.events
  for each row execute function public.events_not_in_past();

alter table public.events enable row level security;
create policy "signed-in users read events" on public.events
  for select to authenticated using (true);
create policy "signed-in users create events" on public.events
  for insert to authenticated with check (created_by = auth.uid());
create policy "delete own or admin" on public.events
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ RSVPs
create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('going', 'maybe')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create trigger event_rsvps_owner before insert or update on public.event_rsvps
  for each row execute function public.own_vote_row();

alter table public.event_rsvps enable row level security;
create policy "signed-in users see rsvps" on public.event_rsvps
  for select to authenticated using (true);
create policy "rsvp for yourself" on public.event_rsvps
  for insert to authenticated with check (user_id = auth.uid());
create policy "change own rsvp" on public.event_rsvps
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove own rsvp" on public.event_rsvps
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.events, public.event_rsvps from anon;

alter publication supabase_realtime add table public.events, public.event_rsvps;
