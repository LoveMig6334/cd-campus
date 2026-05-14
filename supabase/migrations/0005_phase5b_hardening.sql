-- 0005_phase5b_hardening.sql
-- Phase 5b — booking overlap backstop + anon-write rate limit.

-- 1. Booking overlap backstop.
--    `bookings.status` has no `cancelled` value; cancel = hard DELETE in actions.
--    So the constraint applies to ALL rows — no WHERE clause.
create extension if not exists btree_gist;

alter table bookings add constraint bookings_no_overlap
  exclude using gist (
    room_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  );

-- 2. Anon rate-limit state. RLS-closed; written only via the function below.
create table rate_limit_buckets (
  ip           text not null,
  action       text not null,
  bucket_start timestamptz not null,
  hits         int not null default 1,
  primary key (ip, action, bucket_start)
);

alter table rate_limit_buckets enable row level security;
-- No policies. Anon/authenticated have no direct access.

-- 3. Increment-and-return helper. SECURITY DEFINER bypasses RLS.
create or replace function public.record_anon_hit(p_ip text, p_action text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into rate_limit_buckets (ip, action, bucket_start, hits)
  values (p_ip, p_action, date_trunc('minute', now()), 1)
  on conflict (ip, action, bucket_start)
  do update set hits = rate_limit_buckets.hits + 1
  returning hits into v_hits;
  return v_hits;
end;
$$;

revoke all on function public.record_anon_hit(text, text) from public;
grant execute on function public.record_anon_hit(text, text) to anon, authenticated;
