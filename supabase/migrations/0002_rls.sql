-- 0002_rls.sql
-- Helper functions + RLS policies for all 11 tables.

-- ----------------------------------------------------------------------------
-- Helper functions (security definer so they can read admins under RLS)
-- ----------------------------------------------------------------------------
create or replace function public.current_admin_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from admins where auth_user_id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where auth_user_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.is_root_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admins
    where auth_user_id = auth.uid() and is_active = true and tier = 'root'
  );
$$;

revoke all on function public.current_admin_id() from public;
revoke all on function public.is_admin()         from public;
revoke all on function public.is_root_admin()    from public;
grant execute on function public.current_admin_id() to anon, authenticated;
grant execute on function public.is_admin()         to anon, authenticated;
grant execute on function public.is_root_admin()    to anon, authenticated;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------
alter table admins            enable row level security;
alter table houses            enable row level security;
alter table events            enable row level security;
alter table sport_results     enable row level security;
alter table rooms             enable row level security;
alter table bookings          enable row level security;
alter table projects          enable row level security;
alter table pshare_posts      enable row level security;
alter table carelin_requests  enable row level security;
alter table carelin_replies   enable row level security;
alter table site_config       enable row level security;

-- ----------------------------------------------------------------------------
-- admins — admins can SELECT their own row only. Writes via service role.
-- ----------------------------------------------------------------------------
create policy admins_select_self on admins
  for select to authenticated
  using (auth_user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- houses — public read, admin full CRUD
-- ----------------------------------------------------------------------------
create policy houses_select_all on houses
  for select to anon, authenticated using (true);
create policy houses_admin_write on houses
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- events — public read, admin full CRUD
-- ----------------------------------------------------------------------------
create policy events_select_all on events
  for select to anon, authenticated using (true);
create policy events_admin_write on events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- sport_results — public read, admin full CRUD
-- ----------------------------------------------------------------------------
create policy sport_results_select_all on sport_results
  for select to anon, authenticated using (true);
create policy sport_results_admin_write on sport_results
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- rooms — public read, ALL admins SELECT, only root writes
-- ----------------------------------------------------------------------------
create policy rooms_select_all on rooms
  for select to anon, authenticated using (true);
create policy rooms_root_insert on rooms
  for insert to authenticated with check (public.is_root_admin());
create policy rooms_root_update on rooms
  for update to authenticated
  using (public.is_root_admin()) with check (public.is_root_admin());
create policy rooms_root_delete on rooms
  for delete to authenticated using (public.is_root_admin());

-- ----------------------------------------------------------------------------
-- bookings — public read, admin full CRUD
-- ----------------------------------------------------------------------------
create policy bookings_select_all on bookings
  for select to anon, authenticated using (true);
create policy bookings_admin_write on bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- projects — public read, admin full CRUD
-- ----------------------------------------------------------------------------
create policy projects_select_all on projects
  for select to anon, authenticated using (true);
create policy projects_admin_write on projects
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- pshare_posts — public reads only 'published'; admin full CRUD
-- ----------------------------------------------------------------------------
create policy pshare_posts_select_published on pshare_posts
  for select to anon using (status = 'published');
create policy pshare_posts_select_admin on pshare_posts
  for select to authenticated using (public.is_admin() or status = 'published');
create policy pshare_posts_admin_write on pshare_posts
  for insert to authenticated with check (public.is_admin());
create policy pshare_posts_admin_update on pshare_posts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy pshare_posts_admin_delete on pshare_posts
  for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- carelin_requests — public read AND public INSERT (the only anon write).
-- Admin updates status; root deletes.
-- ----------------------------------------------------------------------------
create policy carelin_requests_select_all on carelin_requests
  for select to anon, authenticated using (true);
create policy carelin_requests_anon_insert on carelin_requests
  for insert to anon, authenticated with check (true);
create policy carelin_requests_admin_update on carelin_requests
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy carelin_requests_root_delete on carelin_requests
  for delete to authenticated using (public.is_root_admin());

-- ----------------------------------------------------------------------------
-- carelin_replies — public read; admin insert/update
-- ----------------------------------------------------------------------------
create policy carelin_replies_select_all on carelin_replies
  for select to anon, authenticated using (true);
create policy carelin_replies_admin_insert on carelin_replies
  for insert to authenticated with check (public.is_admin());
create policy carelin_replies_admin_update on carelin_replies
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- site_config — public read, admin update/insert
-- ----------------------------------------------------------------------------
create policy site_config_select_all on site_config
  for select to anon, authenticated using (true);
create policy site_config_admin_insert on site_config
  for insert to authenticated with check (public.is_admin());
create policy site_config_admin_update on site_config
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
