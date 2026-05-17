-- Feature flags for the six student-facing features.
-- Reads are public (so unauthenticated students can see whether a feature
-- is enabled before clicking a menu tile). Writes are restricted to the
-- service-role client used by the root-admin Server Action.

create table public.feature_flags (
  key         text primary key check (key in (
    'calendar','booking','sport','portfolio','pshare','carelin'
  )),
  enabled     boolean not null default true,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.admins(id) on delete set null
);

alter table public.feature_flags enable row level security;

create policy "feature_flags_read_all"
  on public.feature_flags for select to public using (true);

-- No insert/update/delete policies. Only the service-role key bypasses RLS,
-- and it is only reachable from getSupabaseServiceRole() in a root-gated
-- Server Action.

insert into public.feature_flags (key) values
  ('calendar'),
  ('booking'),
  ('sport'),
  ('portfolio'),
  ('pshare'),
  ('carelin');
