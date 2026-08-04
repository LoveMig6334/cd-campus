-- 0011_live_matches.sql
-- Live match scoreboard: matches + append-only match_events + apply RPC.
-- Score state (sets/serving/status/winner) is computed by the TS engine in
-- lib/sport/rules.ts; clock fields are stamped here with now() so kiosk /
-- admin clock skew never leaks into stored timestamps.

create type match_status     as enum ('scheduled','live','paused','finished','cancelled');
create type match_event_type as enum ('start','pause','resume','score','undo','finish','cancel');

-- ----------------------------------------------------------------------------
-- matches — one row per match; the display board reads exactly this row.
-- ----------------------------------------------------------------------------
create table matches (
  id                  uuid primary key default gen_random_uuid(),
  sport               text not null,     -- validated against SPORTS config in lib/sport/rules.ts
  house_a             smallint not null references houses(id),
  house_b             smallint not null references houses(id),
  status              match_status not null default 'scheduled',
  sets                jsonb not null default '[{"a":0,"b":0}]'::jsonb, -- current set last
  current_set         smallint not null default 1 check (current_set >= 1),
  serving             text not null default 'a' check (serving in ('a','b')),
  winner_house_id     smallint references houses(id),
  venue               text,
  round_label         text,
  scheduled_at        timestamptz,
  version             integer not null default 0,  -- optimistic-concurrency token
  last_score_event_id uuid,                        -- undo target; null = nothing to undo
  timer_seconds       integer not null default 0,  -- accumulated across pauses
  timer_started_at    timestamptz,                 -- non-null while the clock runs
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now(),
  started_at          timestamptz,
  ended_at            timestamptz,
  updated_at          timestamptz not null default now(),
  check (house_a <> house_b)
);

create trigger matches_set_updated_at
  before update on matches
  for each row execute function set_updated_at();

-- At most one match on the board. Scheduled matches may queue.
create unique index matches_single_live_idx on matches ((1))
  where status in ('live','paused');

create index matches_status_ended_idx on matches (status, ended_at desc);
create index matches_sport_idx        on matches (sport);
create index matches_house_a_idx      on matches (house_a);
create index matches_house_b_idx      on matches (house_b);
create index matches_scheduled_idx    on matches (scheduled_at);

-- ----------------------------------------------------------------------------
-- match_events — append-only audit log. id is CLIENT-generated (idempotency key).
-- payload for 'score': {team, delta, before, after}; 'undo': {undoneEventId, before, after}.
-- ----------------------------------------------------------------------------
create table match_events (
  id             uuid primary key,
  match_id       uuid not null references matches(id) on delete cascade,
  seq            integer not null,
  type           match_event_type not null,
  payload        jsonb not null default '{}'::jsonb,
  actor_admin_id uuid references admins(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (match_id, seq)
);

create index match_events_match_idx on match_events (match_id, seq);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table matches      enable row level security;
alter table match_events enable row level security;

-- Public display + anon realtime delivery need select; writes are admin-only.
-- The create/cancel path uses this policy directly; live mutations go through
-- the RPC below.
create policy matches_select_all on matches
  for select to anon, authenticated using (true);
create policy matches_admin_write on matches
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Audit log carries admin identities: admin-read only, no direct writes at all
-- (inserts happen inside the security-definer RPC).
create policy match_events_admin_select on match_events
  for select to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- Realtime — the display board subscribes to postgres_changes on matches.
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table matches;

-- ----------------------------------------------------------------------------
-- Atomic apply: lock row -> idempotency check -> version check -> append event
-- -> update projection. Serializes concurrent admins; duplicate event ids
-- (client retries) are no-ops that return current state.
-- ----------------------------------------------------------------------------
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
      when p_type = 'score' then p_event_id
      when p_type = 'undo'  then null
      else last_score_event_id end
  where id = p_match_id
  returning * into v_match;

  return v_match;
end;
$$;

revoke all on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, match_status, smallint) from public;
grant execute on function public.apply_match_event(uuid, uuid, integer, match_event_type, jsonb, jsonb, smallint, text, match_status, smallint) to authenticated;
