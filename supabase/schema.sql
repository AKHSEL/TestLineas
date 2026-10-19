create extension if not exists pgcrypto;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  apellido text not null check (char_length(btrim(apellido)) between 1 and 80),
  document_type text check (document_type is null or document_type in ('dni', 'ce', 'passport')),
  document_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_document_pair_check check ((document_type is null) = (document_number is null)),
  constraint patients_document_number_check check (
    document_number is null
    or (
      document_number = upper(regexp_replace(document_number, '[^A-Za-z0-9]', '', 'g'))
      and (
        (document_type = 'dni' and document_number ~ '^[0-9]{8}$')
        or (document_type in ('ce', 'passport') and document_number ~ '^[A-Z0-9]{6,15}$')
      )
    )
  )
);

create table if not exists public.evaluation_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  doctor_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete restrict,
  status text not null default 'available' check (status in ('available', 'completed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  completed_at timestamptz,
  consent_started_at timestamptz,
  response_confirmed_at timestamptz
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null unique references public.evaluation_links(id),
  doctor_id uuid not null references auth.users(id) on delete restrict,
  patient_id uuid references public.patients(id) on delete restrict,
  nombre text not null,
  apellido text not null,
  edad text not null,
  sexo text not null,
  estado_civil text not null,
  ocupacion text not null,
  estudios text not null,
  convivientes text not null,
  slots jsonb not null,
  rankings jsonb not null,
  result jsonb not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  total_execution_seconds integer not null,
  first_response_times jsonb not null,
  average_response_seconds numeric not null,
  source_type text not null default 'online' check (source_type in ('online', 'imported')),
  source_pdf_path text,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists patients_doctor_id_idx on public.patients(doctor_id);
create unique index if not exists patients_doctor_document_unique
  on public.patients(doctor_id, document_type, document_number)
  where document_number is not null;
create index if not exists evaluation_links_doctor_id_idx on public.evaluation_links(doctor_id);
create index if not exists evaluation_links_patient_id_idx on public.evaluation_links(patient_id);
create index if not exists evaluations_doctor_id_idx on public.evaluations(doctor_id);
create index if not exists evaluations_patient_id_created_at_idx on public.evaluations(patient_id, created_at desc);

alter table public.patients enable row level security;
alter table public.evaluation_links enable row level security;
alter table public.evaluations enable row level security;

revoke all on table public.patients from anon, authenticated;
revoke all on table public.evaluation_links from anon, authenticated;
revoke all on table public.evaluations from anon, authenticated;
grant select, insert on table public.patients to authenticated;
grant update (nombre, apellido, document_type, document_number, updated_at) on table public.patients to authenticated;
grant select, insert on table public.evaluation_links to authenticated;
grant update (patient_id) on table public.evaluation_links to authenticated;
grant select, insert on table public.evaluations to authenticated;
grant update (patient_id) on table public.evaluations to authenticated;

create policy "doctors read own patients" on public.patients for select to authenticated
using ((select auth.uid()) = doctor_id);
create policy "doctors create own patients" on public.patients for insert to authenticated
with check ((select auth.uid()) = doctor_id);
create policy "doctors update own patients" on public.patients for update to authenticated
using ((select auth.uid()) = doctor_id) with check ((select auth.uid()) = doctor_id);

create policy "doctors read own links" on public.evaluation_links for select to authenticated
using ((select auth.uid()) = doctor_id);
create policy "doctors create patient links" on public.evaluation_links for insert to authenticated
with check (
  (select auth.uid()) = doctor_id
  and (patient_id is null or exists (
    select 1 from public.patients
    where patients.id = patient_id and patients.doctor_id = (select auth.uid())
  ))
);
create policy "doctors update own links" on public.evaluation_links for update to authenticated
using ((select auth.uid()) = doctor_id)
with check (
  (select auth.uid()) = doctor_id
  and (patient_id is null or exists (
    select 1 from public.patients
    where patients.id = patient_id and patients.doctor_id = (select auth.uid())
  ))
);

create policy "doctors read own evaluations" on public.evaluations for select to authenticated
using ((select auth.uid()) = doctor_id);
create policy "doctors create own imported evaluations" on public.evaluations for insert to authenticated
with check (
  (select auth.uid()) = doctor_id
  and source_type = 'imported'
  and exists (
    select 1 from public.patients
    where patients.id = patient_id and patients.doctor_id = (select auth.uid())
  )
);
create policy "doctors assign own evaluations" on public.evaluations for update to authenticated
using ((select auth.uid()) = doctor_id)
with check (
  (select auth.uid()) = doctor_id
  and (patient_id is null or exists (
    select 1 from public.patients
    where patients.id = patient_id and patients.doctor_id = (select auth.uid())
  ))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('test-scans', 'test-scans', false, 10485760, array['application/pdf']::text[])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "doctors upload own test scans" on storage.objects for insert to authenticated
with check (bucket_id = 'test-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "doctors read own test scans" on storage.objects for select to authenticated
using (bucket_id = 'test-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "doctors delete own test scans" on storage.objects for delete to authenticated
using (bucket_id = 'test-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.get_evaluation_session(p_token uuid)
returns table (nombre text, apellido text)
language sql security definer set search_path = '' as $$
  select p.nombre, p.apellido
  from public.evaluation_links l
  left join public.patients p on p.id = l.patient_id and p.doctor_id = l.doctor_id
  where l.token = p_token and l.status = 'available' and l.expires_at > now()
  limit 1
$$;

create or replace function public.assign_evaluation_to_patient(p_evaluation_id uuid, p_patient_id uuid)
returns void
language plpgsql security invoker set search_path = '' as $$
declare l_link_id uuid;
begin
  if not exists (select 1 from public.patients where id = p_patient_id and doctor_id = (select auth.uid())) then
    raise exception 'ASSIGNMENT_INVALID';
  end if;
  update public.evaluations set patient_id = p_patient_id
  where id = p_evaluation_id and doctor_id = (select auth.uid()) and patient_id is null
  returning link_id into l_link_id;
  if l_link_id is null then raise exception 'ASSIGNMENT_INVALID'; end if;
  update public.evaluation_links set patient_id = p_patient_id
  where id = l_link_id and doctor_id = (select auth.uid());
end; $$;

create or replace function public.record_test_consent(p_token uuid)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare l_started_at timestamptz;
begin
  update public.evaluation_links
  set consent_started_at = coalesce(consent_started_at, clock_timestamp())
  where token = p_token and status = 'available' and expires_at > now()
  returning consent_started_at into l_started_at;
  if l_started_at is null then raise exception 'LINK_INVALID'; end if;
  return l_started_at;
end; $$;

create or replace function public.record_test_confirmation(p_token uuid)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare l_confirmed_at timestamptz;
begin
  update public.evaluation_links
  set response_confirmed_at = coalesce(response_confirmed_at, clock_timestamp())
  where token = p_token and status = 'available' and expires_at > now()
    and consent_started_at is not null
  returning response_confirmed_at into l_confirmed_at;
  if l_confirmed_at is null then raise exception 'CONSENT_REQUIRED'; end if;
  return l_confirmed_at;
end; $$;

create or replace function public.complete_evaluation(
  p_token uuid, p_user_data jsonb, p_slots jsonb, p_rankings jsonb, p_result jsonb,
  p_started_at timestamptz, p_finished_at timestamptz, p_total_seconds integer,
  p_first_response_times jsonb, p_average_response_seconds numeric
) returns public.evaluations
language plpgsql security definer set search_path = '' as $$
declare l_link public.evaluation_links; l_evaluation public.evaluations; l_result jsonb;
begin
  select * into l_link from public.evaluation_links
  where token = p_token and status = 'available' and expires_at > now() for update;
  if not found then raise exception 'LINK_INVALID'; end if;
  l_result := p_result;
  if l_link.consent_started_at is not null then
    if l_link.response_confirmed_at is null then raise exception 'CONFIRMATION_REQUIRED'; end if;
    l_result := jsonb_set(
      coalesce(p_result, '{}'::jsonb), '{thesis}',
      coalesce(p_result->'thesis', '{}'::jsonb) || jsonb_build_object(
        'consentStartedAt', l_link.consent_started_at,
        'confirmedAt', l_link.response_confirmed_at
      ), true
    );
  end if;
  insert into public.evaluations(
    link_id, doctor_id, patient_id, nombre, apellido, edad, sexo, estado_civil,
    ocupacion, estudios, convivientes, slots, rankings, result, started_at,
    finished_at, total_execution_seconds, first_response_times, average_response_seconds
  ) values (
    l_link.id, l_link.doctor_id, l_link.patient_id,
    coalesce((select nombre from public.patients where id = l_link.patient_id), p_user_data->>'nombre'),
    coalesce((select apellido from public.patients where id = l_link.patient_id), p_user_data->>'apellido'),
    p_user_data->>'edad', p_user_data->>'sexo', p_user_data->>'estadoCivil',
    coalesce(p_user_data->>'ocupacion', ''), coalesce(p_user_data->>'estudios', ''),
    coalesce(p_user_data->>'convivientes', ''), p_slots, p_rankings, l_result,
    p_started_at, p_finished_at, p_total_seconds, p_first_response_times, p_average_response_seconds
  ) returning * into l_evaluation;
  update public.evaluation_links set status = 'completed', completed_at = now() where id = l_link.id;
  return l_evaluation;
end; $$;

revoke execute on function public.get_evaluation_session(uuid) from public, anon, authenticated;
grant execute on function public.get_evaluation_session(uuid) to anon;
revoke execute on function public.assign_evaluation_to_patient(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_evaluation_to_patient(uuid, uuid) to authenticated;
revoke execute on function public.record_test_consent(uuid) from public, anon, authenticated;
grant execute on function public.record_test_consent(uuid) to anon;
revoke execute on function public.record_test_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.record_test_confirmation(uuid) to anon;
revoke execute on function public.complete_evaluation(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, integer, jsonb, numeric) from public, anon, authenticated;
grant execute on function public.complete_evaluation(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, integer, jsonb, numeric) to anon;
