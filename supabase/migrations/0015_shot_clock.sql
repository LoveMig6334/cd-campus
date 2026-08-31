-- 0015_shot_clock.sql
-- Shot clock for timed sports (basketball 24 s / 14 s after an offensive
-- rebound), shown on the hall board. Lives on the match row (not in the event
-- log — resets are frequent and not score history) and is stamped with
-- Postgres now() like the game clock, so kiosk/admin clock skew never leaks.
-- Runs only while the game clock runs: ends_at while live, a frozen
-- remaining value while paused.

alter table matches
  add column shot_clock_team text check (shot_clock_team in ('a','b')),
  add column shot_clock_ends_at timestamptz,
  add column shot_clock_remaining integer check (shot_clock_remaining >= 0);

-- p_seconds null clears the shot clock. Otherwise it (re)starts for p_team:
-- counting from now() if the game clock is running, frozen until resume if not.
create or replace function public.set_shot_clock(
  p_match_id uuid,
  p_team     text,
  p_seconds  integer
) returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches;
begin
  if public.current_admin_id() is null then
    raise exception 'forbidden';
  end if;

  select * into v_match from matches where id = p_match_id for update;
  if not found then
    raise exception 'match_not_found';
  end if;

  if p_seconds is null then
    update matches set
      shot_clock_team = null,
      shot_clock_ends_at = null,
      shot_clock_remaining = null
    where id = p_match_id
    returning * into v_match;
    return v_match;
  end if;

  if p_team not in ('a','b') or p_seconds < 1 or p_seconds > 60 then
    raise exception 'bad_shot_clock';
  end if;

  update matches set
    shot_clock_team = p_team,
    shot_clock_ends_at = case
      when v_match.timer_started_at is not null
        then now() + make_interval(secs => p_seconds)
      else null end,
    shot_clock_remaining = case
      when v_match.timer_started_at is not null then null
      else p_seconds end
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

revoke all on function public.set_shot_clock(uuid, text, integer) from public;
grant execute on function public.set_shot_clock(uuid, text, integer) to authenticated;

-- Same body as 0014 plus shot-clock handling: freeze on stop, unfreeze on
-- run, clear on start / end period / finish / cancel.
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
  v_sc_team text;
  v_sc_ends timestamptz;
  v_sc_rem  integer;
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
  -- The shot clock follows it: unfreeze when the clock starts, freeze when
  -- it stops.
  v_seconds := v_match.timer_seconds;
  v_started := v_match.timer_started_at;
  v_sc_team := v_match.shot_clock_team;
  v_sc_ends := v_match.shot_clock_ends_at;
  v_sc_rem  := v_match.shot_clock_remaining;
  if p_status = 'live' then
    if v_started is null then
      v_started := now();
      if v_sc_rem is not null then
        v_sc_ends := now() + make_interval(secs => v_sc_rem);
        v_sc_rem := null;
      end if;
    end if;
  elsif v_started is not null then
    v_seconds := v_seconds + greatest(0, extract(epoch from now() - v_started))::int;
    v_started := null;
    if v_sc_ends is not null then
      v_sc_rem := greatest(0, ceil(extract(epoch from v_sc_ends - now())))::int;
      v_sc_ends := null;
    end if;
  end if;
  if p_type::text in ('start','end_set','finish','cancel') then
    v_sc_team := null;
    v_sc_ends := null;
    v_sc_rem := null;
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
    shot_clock_team      = v_sc_team,
    shot_clock_ends_at   = v_sc_ends,
    shot_clock_remaining = v_sc_rem,
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
