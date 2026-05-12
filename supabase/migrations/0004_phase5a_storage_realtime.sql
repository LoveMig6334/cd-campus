-- 0004_phase5a_storage_realtime.sql
-- Phase 5a — image columns, public `assets` bucket, Realtime publication.

-- 1. Storage path columns (nullable, no backfill).
alter table pshare_posts add column art_image_path text;
alter table projects     add column image_path     text;

-- 2. Storage bucket (idempotent).
insert into storage.buckets (id, name, public)
values ('assets', 'assets', true)
on conflict (id) do nothing;

-- 3. Storage RLS — reuses public.is_admin() from 0002_rls.sql.
create policy "assets_public_read"
  on storage.objects for select
  using (bucket_id = 'assets');

create policy "assets_admin_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'assets' and public.is_admin());

create policy "assets_admin_update"
  on storage.objects for update to authenticated
  using      (bucket_id = 'assets' and public.is_admin())
  with check (bucket_id = 'assets' and public.is_admin());

create policy "assets_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'assets' and public.is_admin());

-- 4. Realtime publication.
alter publication supabase_realtime add table sport_results;
alter publication supabase_realtime add table carelin_requests;
alter publication supabase_realtime add table bookings;
