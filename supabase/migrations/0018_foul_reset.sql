-- ----------------------------------------------------------------------------
-- Team-foul reset (timed sports): zero one team's foul count (e.g. the table
-- forgot to clear at the half) without touching per-player fouls. The state
-- is carried in p_fouls like every other event, so apply_match_event needs
-- no change — only the enum grows.
-- ----------------------------------------------------------------------------

alter type match_event_type add value if not exists 'foul_reset';
