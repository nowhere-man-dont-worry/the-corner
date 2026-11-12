-- 0009: plaza broadcasts and presence can't be faked.
--
-- Realtime Authorization checks these policies once, when a client joins a
-- channel (the result is cached for the connection), so a policy can't
-- inspect each message's payload. Instead every user gets one private topic,
-- user:<their auth uid>, and only that user may send on it. Receivers take
-- the sender's identity from the topic name, never from the payload.
--
-- The topic carries everything that used to go through the shared room
-- channels: a presence heartbeat (which room you're in), plaza positions and
-- speech bubbles. Supabase's built-in Presence isn't used any more, because
-- its key is chosen by the client and can be claimed by anyone.
--
-- (Private and public channels with the same topic name are separate
-- channels in Supabase Realtime, so a public "user:<id>" channel can't inject
-- into the private one the app listens to.)

drop policy if exists "signed-in users receive room presence and broadcasts" on realtime.messages;
drop policy if exists "signed-in users send room presence and broadcasts" on realtime.messages;

create policy "signed-in users receive user topics"
  on realtime.messages for select to authenticated
  using (realtime.topic() like 'user:%' and extension = 'broadcast');

create policy "users send only on their own topic"
  on realtime.messages for insert to authenticated
  with check (realtime.topic() = 'user:' || (select auth.uid())::text and extension = 'broadcast');
