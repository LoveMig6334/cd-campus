-- ----------------------------------------------------------------------------
-- Hold the shot clock on its own (game clock keeps running): bank the
-- remaining seconds into shot_clock_remaining and clear shot_clock_ends_at.
-- Resuming is set_shot_clock with the banked seconds; the next game-clock
-- start (resume / clock_start) also lets a held shot clock run again.
-- ----------------------------------------------------------------------------

create or replace function public.hold_shot_clock(
  p_match_id uuid
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

  if v_match.shot_clock_ends_at is not null then
    update matches set
      shot_clock_remaining =
        greatest(0, ceil(extract(epoch from v_match.shot_clock_ends_at - now())))::int,
      shot_clock_ends_at = null
    where id = p_match_id
    returning * into v_match;
  end if;

  return v_match;
end;
$$;

revoke all on function public.hold_shot_clock(uuid) from public;
grant execute on function public.hold_shot_clock(uuid) to authenticated;
