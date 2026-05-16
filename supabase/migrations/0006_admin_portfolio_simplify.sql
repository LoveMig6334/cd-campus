-- 0005_admin_portfolio_simplify.sql
-- Phase 5b — simplify admin portfolio create flow.
-- Adds two columns used by the new minimal form:
--   applied_to  free-text "Faculty & university applied to"
--   pdf_path    storage path to the uploaded portfolio PDF (assets bucket)
-- Existing rows keep their image_path / status / submitted_at / etc.

alter table projects add column if not exists applied_to text;
alter table projects add column if not exists pdf_path   text;
