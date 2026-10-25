-- An expired or suspended license keeps historical data readable, but forbids
-- every clinical write, including direct Data API and public RPC calls.
create trigger license_required_for_patient_writes
  before insert or update on public.patients
  for each row execute function public.enforce_active_test_license();

create trigger license_required_for_link_updates
  before update on public.evaluation_links
  for each row execute function public.enforce_active_test_license();

create trigger license_required_for_evaluation_updates
  before update on public.evaluations
  for each row execute function public.enforce_active_test_license();

-- Existing permissive policies still control ownership and bucket paths.
-- These restrictive policies add the license check without changing reads.
create policy "active license required to upload test scans"
  on storage.objects as restrictive for insert to authenticated
  with check (
    bucket_id <> 'test-scans' or exists (
      select 1 from public.test_licenses l
      where l.user_id = (select auth.uid())
        and l.status = 'active'
        and (l.valid_until is null or l.valid_until >= (now() at time zone 'America/Lima')::date)
    )
  );

create policy "active license required to delete test scans"
  on storage.objects as restrictive for delete to authenticated
  using (
    bucket_id <> 'test-scans' or exists (
      select 1 from public.test_licenses l
      where l.user_id = (select auth.uid())
        and l.status = 'active'
        and (l.valid_until is null or l.valid_until >= (now() at time zone 'America/Lima')::date)
    )
  );
