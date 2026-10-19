begin;

alter table public.evaluations
  add column if not exists source_type text not null default 'online',
  add column if not exists source_pdf_path text;

alter table public.evaluations
  drop constraint if exists evaluations_source_type_check;

alter table public.evaluations
  add constraint evaluations_source_type_check
  check (source_type in ('online', 'imported'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('test-scans', 'test-scans', false, 10485760, array['application/pdf']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "doctors upload own test scans" on storage.objects;
drop policy if exists "doctors read own test scans" on storage.objects;
drop policy if exists "doctors delete own test scans" on storage.objects;

create policy "doctors upload own test scans"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'test-scans'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "doctors read own test scans"
on storage.objects for select to authenticated
using (
  bucket_id = 'test-scans'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "doctors delete own test scans"
on storage.objects for delete to authenticated
using (
  bucket_id = 'test-scans'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

grant insert on table public.evaluations to authenticated;

drop policy if exists "doctors create own imported evaluations" on public.evaluations;
create policy "doctors create own imported evaluations"
on public.evaluations for insert to authenticated
with check (
  (select auth.uid()) = doctor_id
  and source_type = 'imported'
  and exists (
    select 1 from public.patients
    where patients.id = patient_id and patients.doctor_id = (select auth.uid())
  )
);

commit;
