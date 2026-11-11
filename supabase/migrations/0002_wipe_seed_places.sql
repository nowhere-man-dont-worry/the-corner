-- 0002: remove the 12 seeded Guide places.
-- Exported to a JSON backup outside the repo before running (2026-11-12).
delete from public.places where submitted_handle = 'seed';
