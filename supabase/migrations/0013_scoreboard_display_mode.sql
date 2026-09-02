-- 0013_scoreboard_display_mode.sql
-- Admin-controlled hall board mode. `{"mode":"match"}` follows the live match;
-- `{"mode":"idle"}` forces the Sports Day holding screen without touching the
-- match row (score/clock keep running). Realtime on site_config lets the kiosk
-- flip immediately.

insert into site_config (key, value)
values ('scoreboard_display', '{"mode":"match"}'::jsonb)
on conflict (key) do nothing;

alter publication supabase_realtime add table site_config;
