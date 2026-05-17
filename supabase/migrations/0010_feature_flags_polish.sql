-- Attach the shared set_updated_at trigger to feature_flags so future writers
-- don't have to remember to set updated_at manually (matches every other table
-- with an updated_at column).

create trigger feature_flags_set_updated_at
  before update on public.feature_flags
  for each row execute function set_updated_at();
