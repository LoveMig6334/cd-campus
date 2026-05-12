-- Phase 4: enable anonymous student bookings.
-- Mirrors the carelin_requests anon-INSERT contract: hand-rolled DB-level check
-- on a 4-digit student_id_4 column, plus an RLS policy granting INSERT to anon.
-- Existing admin-created bookings continue to work; the new columns are nullable
-- and the constraint only fires when student_id_4 is non-null.

alter table bookings
  add column student_id_4 text,
  add column klass        text;

alter table bookings
  add constraint bookings_student_id_4_format
  check (student_id_4 is null or student_id_4 ~ '^[0-9]{4}$');

-- Anon INSERT — mirrors carelin_requests policy from 0002.
create policy "bookings_anon_insert"
  on bookings for insert to anon
  with check (
    user_label is not null
    and length(trim(user_label)) > 0
    and student_id_4 ~ '^[0-9]{4}$'
    and starts_at < ends_at
  );
