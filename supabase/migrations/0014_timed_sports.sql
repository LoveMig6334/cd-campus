-- 0014_timed_sports.sql
-- Timed sports (basketball): periods on a countdown clock, +1/+2/+3, team
-- fouls (game-cumulative), overtime. Periods reuse `sets`/`current_set`/
-- `best_of`; the `end_set` event means "end period". New: per-match period
-- length, fouls, and the game-clock offset at which the current period began.

alter type match_event_type add value if not exists 'foul';

-- best_of is the regulation period count for timed sports (4 quarters); the
-- odd-only rule for set sports now lives in lib/sport/rules.ts.
alter table matches drop constraint matches_best_of_check;
alter table matches
  add constraint matches_best_of_check check (best_of between 1 and 12),
  add column period_minutes smallint
    check (period_minutes between 1 and 60),
  add column fouls jsonb not null default '{"a":0,"b":0}'::jsonb,
  add column period_started_seconds integer not null default 0
    check (period_started_seconds >= 0);

drop function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, match_status, smallint);

-- Changes vs 0012: p_fouls; the clock follows p_status (running only while
-- live) instead of the event type — identical for existing events, and it
-- lets end_set stop the clock between quarters; end_set stamps the period
-- offset; undo may restore it (payload.periodStartedSeconds); 'foul' is an
-- undo target. Enum comparisons go through ::text because 'foul' cannot be
-- referenced as a literal in the transaction that added it.
create or replace function public.apply_match_event(
  p_match_id         uuid,
  p_event_id         uuid,
  p_expected_version integer,
  p_type             match_event_type,
  p_payload          jsonb,
  p_sets             jsonb,
  p_current_set      smallint,
  p_serving          text,
  p_fouls            jsonb,
  p_status           match_status,
  p_winner_house_id  smallint
) returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match   matches;
  v_seq     integer;
  v_actor   uuid;
  v_seconds integer;
  v_started timestamptz;
begin
  v_actor := public.current_admin_id();
  if v_actor is null then
    raise exception 'forbidden';
  end if;

  select * into v_match from matches where id = p_match_id for update;
  if not found then
    raise exception 'match_not_found';
  end if;

  -- Idempotent replay: this event already applied -> return current state.
  if exists (select 1 from match_events where id = p_event_id) then
    return v_match;
  end if;

  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;

  select coalesce(max(seq), 0) + 1 into v_seq
    from match_events where match_id = p_match_id;

  insert into match_events (id, match_id, seq, type, payload, actor_admin_id)
  values (p_event_id, p_match_id, v_seq, p_type, p_payload, v_actor);

  -- Game clock: runs while the match is live, accumulates when it isn't.
  v_seconds := v_match.timer_seconds;
  v_started := v_match.timer_started_at;
  if p_status = 'live' then
    if v_started is null then
      v_started := now();
    end if;
  elsif v_started is not null then
    v_seconds := v_seconds + greatest(0, extract(epoch from now() - v_started))::int;
    v_started := null;
  end if;

  update matches set
    version         = version + 1,
    sets            = p_sets,
    current_set     = p_current_set,
    serving         = p_serving,
    fouls           = p_fouls,
    status          = p_status,
    winner_house_id = p_winner_house_id,
    started_at = case when p_type::text = 'start' then now() else started_at end,
    ended_at   = case when p_type::text in ('finish','cancel') then now() else ended_at end,
    timer_seconds    = v_seconds,
    timer_started_at = v_started,
    period_started_seconds = case
      when p_type::text = 'end_set' then v_seconds
      when p_type::text = 'undo' and (p_payload->>'periodStartedSeconds') is not null
        then (p_payload->>'periodStartedSeconds')::int
      else period_started_seconds end,
    last_score_event_id = case
      when p_type::text in ('score','end_set','foul') then p_event_id
      when p_type::text = 'undo' then null
      else last_score_event_id end
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

revoke all on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint) from public;
grant execute on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint) to authenticated;
