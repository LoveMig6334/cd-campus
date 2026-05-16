-- 0008_author_profile_image.sql
-- Adds the author's profile photo, displayed in the student-side
-- portfolio card hero (falling back to the profile icon when null).

alter table projects add column if not exists author_image_path text;
