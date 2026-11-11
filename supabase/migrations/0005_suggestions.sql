-- 0005: suggestions box — posts, one up/down vote per person, comment threads.
--
-- created_by / created_handle / user_id are always set by triggers from
-- auth.uid() and the GitHub identity; the client never sends them.
-- score and comment_count are maintained by triggers (security definer) so
-- realtime UPDATEs on suggestions carry live totals without exposing who
-- voted which way: clients can only read their own vote rows.

-- ------------------------------------------------------------ helpers
-- Signs a new row: created_by = auth.uid(), created_handle = GitHub login.
create or replace function public.sign_new_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare gh text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select i.identity_data->>'user_name' into gh from auth.identities i
   where i.user_id = auth.uid() and i.provider = 'github' limit 1;
  if gh is null then raise exception 'no github identity for this user'; end if;
  new.id := gen_random_uuid();
  new.created_by := auth.uid();
  new.created_handle := gh;
  new.created_at := now();
  return new;
end $$;

-- Vote rows: the voter is always the caller, and a vote can't be moved to
-- another person or another suggestion/motion/event afterwards.
create or replace function public.own_vote_row() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
  else
    new.user_id := old.user_id;
    if to_jsonb(new) ? 'suggestion_id' then new.suggestion_id := old.suggestion_id; end if;
  end if;
  return new;
end $$;

-- ------------------------------------------------------------ suggestions
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text check (body is null or char_length(body) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_handle text,
  created_at timestamptz not null default now(),
  score integer not null default 0,
  comment_count integer not null default 0
);
create index suggestions_created_at_idx on public.suggestions (created_at desc);

create or replace function public.suggestions_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.score := 0;
  new.comment_count := 0;
  return new;
end $$;
create trigger suggestions_sign before insert on public.suggestions
  for each row execute function public.sign_new_row();
create trigger suggestions_zero_counts before insert on public.suggestions
  for each row execute function public.suggestions_before_insert();

alter table public.suggestions enable row level security;
create policy "signed-in users read suggestions" on public.suggestions
  for select to authenticated using (true);
create policy "signed-in users post suggestions" on public.suggestions
  for insert to authenticated with check (created_by = auth.uid());
create policy "delete own or admin" on public.suggestions
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ------------------------------------------------------------ votes
create table public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
create trigger suggestion_votes_owner before insert or update on public.suggestion_votes
  for each row execute function public.own_vote_row();

alter table public.suggestion_votes enable row level security;
create policy "read own vote" on public.suggestion_votes
  for select to authenticated using (user_id = auth.uid());
create policy "cast own vote" on public.suggestion_votes
  for insert to authenticated with check (user_id = auth.uid());
create policy "change own vote" on public.suggestion_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "remove own vote" on public.suggestion_votes
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.suggestions_refresh_score() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sid uuid := coalesce(new.suggestion_id, old.suggestion_id);
begin
  update public.suggestions s
     set score = coalesce((select sum(v.value) from public.suggestion_votes v where v.suggestion_id = sid), 0)
   where s.id = sid;
  return null;
end $$;
create trigger suggestion_votes_score after insert or update or delete on public.suggestion_votes
  for each row execute function public.suggestions_refresh_score();

-- ------------------------------------------------------------ comments
create table public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_handle text,
  created_at timestamptz not null default now()
);
create index suggestion_comments_sid_idx on public.suggestion_comments (suggestion_id, created_at);
create trigger suggestion_comments_sign before insert on public.suggestion_comments
  for each row execute function public.sign_new_row();

alter table public.suggestion_comments enable row level security;
create policy "signed-in users read comments" on public.suggestion_comments
  for select to authenticated using (true);
create policy "signed-in users comment" on public.suggestion_comments
  for insert to authenticated with check (created_by = auth.uid());
create policy "delete own or admin" on public.suggestion_comments
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create or replace function public.suggestions_refresh_comments() returns trigger
language plpgsql security definer set search_path = '' as $$
declare sid uuid := coalesce(new.suggestion_id, old.suggestion_id);
begin
  update public.suggestions s
     set comment_count = (select count(*) from public.suggestion_comments c where c.suggestion_id = sid)
   where s.id = sid;
  return null;
end $$;
create trigger suggestion_comments_count after insert or delete on public.suggestion_comments
  for each row execute function public.suggestions_refresh_comments();

-- ------------------------------------------------------------ feed RPC
-- Each suggestion with its score, comment count and the caller's own vote.
-- security invoker: RLS still applies (signed-in users only).
create or replace function public.suggestions_feed()
returns table (id uuid, title text, body text, created_by uuid, created_handle text,
               created_at timestamptz, score integer, comment_count integer, my_vote smallint)
language sql stable security invoker set search_path = '' as $$
  select s.id, s.title, s.body, s.created_by, s.created_handle, s.created_at,
         s.score, s.comment_count,
         (select v.value from public.suggestion_votes v
           where v.suggestion_id = s.id and v.user_id = auth.uid())
    from public.suggestions s
   order by s.created_at desc;
$$;
revoke execute on function public.suggestions_feed() from public, anon;
grant execute on function public.suggestions_feed() to authenticated;

revoke all on public.suggestions, public.suggestion_votes, public.suggestion_comments from anon;

alter publication supabase_realtime add table public.suggestions, public.suggestion_comments;
