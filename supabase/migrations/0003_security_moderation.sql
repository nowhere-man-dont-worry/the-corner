-- 0003: admins, moderation deletes, server-set chat user_id, profiles
-- closed to anonymous users.

-- 1. Admins. RLS on with no policies and no grants: clients can neither read
--    nor write this table. Only security definer functions look at it.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

insert into public.admins (user_id)
select user_id from public.profiles where handle = 'nowhere-man-dont-worry';

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2. Chat: user_id and created_at are now set by the trigger from auth.uid(),
--    never taken from the client (same pattern as places).
create or replace function public.messages_set_name() returns trigger
language plpgsql security definer set search_path = '' as $$
declare dn text; gh text;
begin
  if auth.uid() is null then raise exception 'sign in to chat'; end if;
  new.user_id := auth.uid();
  new.created_at := now();
  select i.identity_data->>'user_name' into gh from auth.identities i
   where i.user_id = new.user_id and i.provider = 'github' limit 1;
  if gh is null then raise exception 'no github identity for this user'; end if;
  select nullif(btrim(p.display_name), '') into dn from public.profiles p where p.user_id = new.user_id;
  if dn is null then new.name := '@' || gh;
  else new.name := rtrim(left(dn, 60 - char_length(gh) - 4)) || ' · @' || gh;
  end if;
  return new;
end $$;

-- 3. Moderation: delete your own rows; admins delete any row. No update
--    policies exist on places/messages, so content can't be edited.
create policy "delete own or admin" on public.places
  for delete to authenticated using (submitted_by = auth.uid() or public.is_admin());
create policy "delete own or admin" on public.messages
  for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- 4. Profiles: the site is sign-in gated, so anonymous users get nothing.
drop policy "profiles readable by all" on public.profiles;
create policy "signed-in users read profiles" on public.profiles
  for select to authenticated using (true);
revoke all on public.profiles from anon;

-- 5. Guide changes (adds and deletes) stream live like chat.
alter publication supabase_realtime add table public.places;
