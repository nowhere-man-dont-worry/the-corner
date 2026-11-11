-- 0004: realtime rooms. The app opens one private channel per room
-- (room:plaza, room:council, room:suggestions, room:events, room:guide,
-- room:members) for presence and plaza broadcasts. Private channels are
-- checked against these policies, so only signed-in users can join, see who
-- is online, or send positions / speech bubbles.
create policy "signed-in users receive room presence and broadcasts"
  on realtime.messages for select to authenticated
  using (realtime.topic() like 'room:%' and extension in ('presence', 'broadcast'));

create policy "signed-in users send room presence and broadcasts"
  on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'room:%' and extension in ('presence', 'broadcast'));
