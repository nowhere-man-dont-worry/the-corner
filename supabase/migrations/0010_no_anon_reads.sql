-- 0010: nothing is readable without signing in.
--
-- The site is sign-in gated, so the anon role gets no table privileges at
-- all in public, now or for tables created later, and the last two
-- "readable by everyone" policies become signed-in only. The landing page
-- needs no data before sign-in, so no anon view or RPC is kept.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;

drop policy if exists "anyone can read" on public.messages;
create policy "signed-in users read messages" on public.messages
  for select to authenticated using (true);

drop policy if exists "places readable by all" on public.places;
create policy "signed-in users read places" on public.places
  for select to authenticated using (true);
