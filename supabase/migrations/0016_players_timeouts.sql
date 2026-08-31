-- 0016_players_timeouts.sql
-- Per-player fouls/points for timed sports (basketball), team timeouts, and
-- the last player foul for the hall board's PLAYER FOUL panel. Score/foul
-- events may credit a player inside apply_match_event (atomic, undoable);
-- roster edits and timeout corrections are plain admin writes.

create table match_players (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  team       text not null check (team in ('a','b')),
  number     smallint not null check (number between 0 and 99),
  name       text,
  fouls      smallint not null default 0 check (fouls >= 0),
  points     smallint not null default 0 check (points >= 0),
  on_court   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (match_id, team, number)
);

create index match_players_match_idx on match_players (match_id, team, number);

alter table match_players enable row level security;

create policy match_players_select_all on match_players
  for select to anon, authenticated using (true);
create policy match_players_admin_write on match_players
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table match_players;

alter table matches
  add column timeouts jsonb not null default '{"a":2,"b":2}'::jsonb,
  add column last_player_foul jsonb;

drop function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint);

-- Same body as 0015 plus: optional player credit (p_player_*), FIBA timeouts
-- reset on start / second half / overtime, last_player_foul stamp.
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
  p_winner_house_id  smallint,
  p_player_id        uuid,
  p_player_points    integer,
  p_player_fouls     integer
) returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match   matches;
  v_player  match_players;
  v_seq     integer;
  v_actor   uuid;
  v_seconds integer;
  v_started timestamptz;
  v_sc_team text;
  v_sc_ends timestamptz;
  v_sc_rem  integer;
  v_last_foul jsonb;
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

  -- Player credit (score / foul / their undo).
  v_last_foul := v_match.last_player_foul;
  if p_player_id is not null then
    update match_players set
      points = greatest(0, points + coalesce(p_player_points, 0)),
      fouls  = greatest(0, fouls  + coalesce(p_player_fouls, 0))
    where id = p_player_id and match_id = p_match_id
    returning * into v_player;
    if not found then
      raise exception 'player_not_found';
    end if;
    if coalesce(p_player_fouls, 0) > 0 then
      v_last_foul := jsonb_build_object(
        'team', v_player.team, 'number', v_player.number,
        'fouls', v_player.fouls, 'at', now());
    end if;
  end if;

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
    last_player_foul = v_last_foul,
    started_at = case when p_type::text = 'start' then now() else started_at end,
    ended_at   = case when p_type::text in ('finish','cancel') then now() else ended_at end,
    timer_seconds    = v_seconds,
    timer_started_at = v_started,
    shot_clock_team      = v_sc_team,
    shot_clock_ends_at   = v_sc_ends,
    shot_clock_remaining = v_sc_rem,
    -- FIBA timeouts: 2 in the first half, 3 in the second, 1 per overtime.
    timeouts = case
      when p_type::text = 'start' then '{"a":2,"b":2}'::jsonb
      when p_type::text = 'end_set' and p_current_set > v_match.best_of
        then '{"a":1,"b":1}'::jsonb
      when p_type::text = 'end_set' and p_current_set = v_match.best_of / 2 + 1
        then '{"a":3,"b":3}'::jsonb
      else timeouts end,
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

revoke all on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint, uuid, integer, integer) from public;
grant execute on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, jsonb, match_status, smallint, uuid, integer, integer) to authenticated;
