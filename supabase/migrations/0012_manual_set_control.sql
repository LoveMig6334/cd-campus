-- 0012_manual_set_control.sql
-- Flexible per-match format + admin-controlled set endings.
-- The school plays (probably) 3 sets to 15, but rules vary — so the format is
-- chosen per match at creation and the target score is advisory: sets end only
-- when an admin sends an 'end_set' event, never automatically.

alter table matches
  add column best_of smallint not null default 3
    check (best_of between 1 and 9 and best_of % 2 = 1),
  add column points_to_win smallint not null default 15
    check (points_to_win between 1 and 99);

alter type match_event_type add value if not exists 'end_set';

-- Same body as 0011 except: 'end_set' also becomes the undo target, so an
-- accidental set ending can be reverted exactly like a score tap. The enum
-- comparison goes through ::text because the new value cannot be referenced
-- as an enum literal in the transaction that added it.
create or replace function public.apply_match_event(
  p_match_id         uuid,
  p_event_id         uuid,
  p_expected_version integer,
  p_type             match_event_type,
  p_payload          jsonb,
  p_sets             jsonb,
  p_current_set      smallint,
  p_serving          text,
  p_status           match_status,
  p_winner_house_id  smallint
) returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches;
  v_seq   integer;
  v_actor uuid;
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

  update matches set
    version         = version + 1,
    sets            = p_sets,
    current_set     = p_current_set,
    serving         = p_serving,
    status          = p_status,
    winner_house_id = p_winner_house_id,
    started_at = case when p_type = 'start' then now() else started_at end,
    ended_at   = case when p_type in ('finish','cancel') then now() else ended_at end,
    timer_started_at = case
      when p_type in ('start','resume') then now()
      when p_type in ('pause','finish','cancel') then null
      else timer_started_at end,
    timer_seconds = case
      when p_type in ('pause','finish','cancel') and timer_started_at is not null
        then timer_seconds + greatest(0, extract(epoch from now() - timer_started_at))::int
      else timer_seconds end,
    last_score_event_id = case
      when p_type::text in ('score','end_set') then p_event_id
      when p_type = 'undo' then null
      else last_score_event_id end
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;
