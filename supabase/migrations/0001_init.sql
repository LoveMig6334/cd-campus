-- 0001_init.sql
-- CD Smart Campus — initial schema. 9 enums + 11 tables.
-- RLS is enabled in 0002_rls.sql.

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type admin_tier            as enum ('root', 'normal');
create type event_category        as enum ('sport', 'tradition', 'music', 'admin', 'academic');
create type sport_result_category as enum ('Track', 'Team');
create type room_kind             as enum ('music', 'meeting');
create type booking_status        as enum ('Confirmed', 'Pending', 'Review');
create type booking_bar_variant   as enum ('default', 'y', 'p', 'g', 'o');
create type project_status        as enum ('Published', 'Under Review', 'Draft');
create type pshare_status         as enum ('draft', 'published', 'review');
create type carelin_status        as enum ('open', 'answered');

-- ----------------------------------------------------------------------------
-- Reusable updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- admins
-- ----------------------------------------------------------------------------
create table admins (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique not null references auth.users(id) on delete cascade,
  email         text unique not null,
  display_name  text not null,
  tier          admin_tier not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger admins_set_updated_at
  before update on admins
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- houses (fixed 4 rows, seeded; smallint PK 1..4)
-- ----------------------------------------------------------------------------
create table houses (
  id            smallint primary key,
  name_en       text not null,
  name_th       text not null,
  color_token   text not null,
  current_score integer not null default 0,
  stat_summary  text,
  sort_order    smallint
);

-- ----------------------------------------------------------------------------
-- events (calendar)
-- ----------------------------------------------------------------------------
create table events (
  id                  uuid primary key default gen_random_uuid(),
  title_th            text not null,
  title_en            text,
  tag                 text,
  category            event_category not null,
  starts_at           timestamptz not null,
  location            text,
  highlight           boolean not null default false,
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index events_starts_at_idx on events (starts_at);
create index events_category_idx  on events (category);
create trigger events_set_updated_at
  before update on events
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- sport_results
-- ----------------------------------------------------------------------------
create table sport_results (
  id                  uuid primary key default gen_random_uuid(),
  title_th            text not null,
  title_en            text,
  category            sport_result_category not null,
  placements          smallint[] not null check (array_length(placements, 1) = 4),
  time_label          text,
  recorded_at         timestamptz not null default now(),
  created_by_admin_id uuid references admins(id) on delete set null
);
create index sport_results_recorded_at_idx on sport_results (recorded_at);

-- ----------------------------------------------------------------------------
-- rooms (fixed 6 rows, seeded)
-- ----------------------------------------------------------------------------
create table rooms (
  id         uuid primary key default gen_random_uuid(),
  name_en    text unique not null,
  name_th    text not null,
  kind       room_kind not null,
  sort_order smallint,
  is_active  boolean not null default true
);

-- ----------------------------------------------------------------------------
-- bookings
-- ----------------------------------------------------------------------------
create table bookings (
  id                  uuid primary key default gen_random_uuid(),
  room_id             uuid not null references rooms(id) on delete restrict,
  user_label          text not null,
  purpose             text,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  status              booking_status not null default 'Confirmed',
  bar_variant         booking_bar_variant not null default 'default',
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index bookings_room_starts_idx on bookings (room_id, starts_at);
create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
create table projects (
  id                  uuid primary key default gen_random_uuid(),
  title_en            text not null,
  title_th            text,
  desc_long           text,
  author_line         text,
  klass               text,
  status              project_status not null,
  is_featured         boolean not null default false,
  icon_key            text,
  thumb_bg            text,
  tags                jsonb,
  submitted_at        date,
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index projects_status_idx on projects (status);
create trigger projects_set_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- pshare_posts
-- ----------------------------------------------------------------------------
create table pshare_posts (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  num_label           text,
  title               text not null,
  snippet             text,
  body_md             text,
  author_alias        text,
  art_halftone        text,
  art_bg              text,
  art_num_color       text,
  status              pshare_status not null default 'draft',
  tags                text[] not null default '{}',
  published_at        timestamptz,
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index pshare_posts_status_idx on pshare_posts (status);
create trigger pshare_posts_set_updated_at
  before update on pshare_posts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- carelin_requests (only table with anon INSERT)
-- ----------------------------------------------------------------------------
create table carelin_requests (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  who_name      text not null,
  student_id_4  text not null check (student_id_4 ~ '^[0-9]{4}$'),
  klass         text,
  status        carelin_status not null default 'open',
  created_at    timestamptz not null default now()
);
create index carelin_requests_status_idx on carelin_requests (status);
create index carelin_requests_created_at_idx on carelin_requests (created_at desc);

-- ----------------------------------------------------------------------------
-- carelin_replies
-- ----------------------------------------------------------------------------
create table carelin_replies (
  id                  uuid primary key default gen_random_uuid(),
  request_id          uuid not null references carelin_requests(id) on delete cascade,
  teacher_name        text,
  role_label          text,
  body                text not null,
  avatar_letter       text,
  created_by_admin_id uuid references admins(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index carelin_replies_request_idx on carelin_replies (request_id);

-- ----------------------------------------------------------------------------
-- site_config (key/value)
-- ----------------------------------------------------------------------------
create table site_config (
  key                  text primary key,
  value                jsonb not null,
  updated_by_admin_id  uuid references admins(id) on delete set null,
  updated_at           timestamptz not null default now()
);
create trigger site_config_set_updated_at
  before update on site_config
  for each row execute function set_updated_at();
