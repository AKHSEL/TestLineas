alter table public.evaluations
  alter column created_at set default clock_timestamp();
