-- supabase/seed.sql
-- One-time bootstrap of the root admin row. Run manually via the Supabase
-- Studio SQL editor AFTER replacing the UUID below with the UID from
-- Authentication → Users (the user invited during Phase 3a).
--
-- This file is NOT auto-applied on `supabase db push`. It exists so the
-- bootstrap step is recorded in git alongside the migrations.

insert into public.admins (auth_user_id, email, display_name, tier)
values (
  '00000000-0000-0000-0000-000000000000', -- REPLACE with auth.users.id UUID
  'tom.tom.thanet@gmail.com',
  'Thatt',
  'root'
)
on conflict (auth_user_id) do nothing;
