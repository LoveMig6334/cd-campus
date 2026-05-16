-- 0007_project_status_simplify.sql
-- Drop "Under Review" from project_status. Existing rows in that state are
-- remapped to Draft (the more conservative not-yet-published state) before
-- the enum is recreated, since Postgres cannot drop enum values in-place.

-- 1. Remap existing rows.
update projects set status = 'Draft' where status = 'Under Review';

-- 2. Recreate the enum without "Under Review".
alter type project_status rename to project_status_old;
create type project_status as enum ('Published', 'Draft');
alter table projects
  alter column status type project_status
  using status::text::project_status;
drop type project_status_old;
