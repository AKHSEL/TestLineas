begin;

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  apellido text not null check (char_length(btrim(apellido)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.evaluation_links add column if not exists doctor_id uuid references auth.users(id) on delete restrict;
alter table public.evaluation_links add column if not exists patient_id uuid references public.patients(id) on delete restrict;
alter table public.evaluations add column if not exists doctor_id uuid references auth.users(id) on delete restrict;
alter table public.evaluations add column if not exists patient_id uuid references public.patients(id) on delete restrict;

do $$
declare l_owner uuid; l_owner_count integer;
begin
  if exists (select 1 from public.evaluation_links where doctor_id is null)
    or exists (select 1 from public.evaluations where doctor_id is null) then
    select count(*), (array_agg(id order by last_sign_in_at desc))[1]
    into l_owner_count, l_owner
    from auth.users
    where last_sign_in_at is not null;
    if l_owner_count <> 1 then
      raise exception 'La migracion requiere exactamente una cuenta que haya iniciado sesion para asignar los registros historicos; se encontraron %.', l_owner_count;
    end if;
    update public.evaluation_links set doctor_id = l_owner where doctor_id is null;
    update public.evaluations e
      set doctor_id = coalesce(l.doctor_id, l_owner), patient_id = coalesce(e.patient_id, l.patient_id)
      from public.evaluation_links l
      where e.link_id = l.id and e.doctor_id is null;
  end if;
end $$;

alter table public.evaluation_links alter column doctor_id set not null;
alter table public.evaluations alter column doctor_id set not null;
alter table public.evaluation_links alter column doctor_id set default auth.uid();

create index if not exists patients_doctor_id_idx on public.patients(doctor_id);
create index if not exists evaluation_links_doctor_id_idx on public.evaluation_links(doctor_id);
create index if not exists evaluation_links_patient_id_idx on public.evaluation_links(patient_id);
create index if not exists evaluations_doctor_id_idx on public.evaluations(doctor_id);
create index if not exists evaluations_patient_id_created_at_idx on public.evaluations(patient_id, created_at desc);

alter table public.patients enable row level security;
alter table public.evaluation_links enable row level security;
alter table public.evaluations enable row level security;

drop policy if exists "doctor manages links" on public.evaluation_links;
drop policy if exists "doctor reads evaluations" on public.evaluations;
drop policy if exists "doctors read own patients" on public.patients;
drop policy if exists "doctors create own patients" on public.patients;
drop policy if exists "doctors update own patients" on public.patients;
drop policy if exists "doctors read own links" on public.evaluation_links;
drop policy if exists "doctors create patient links" on public.evaluation_links;
drop policy if exists "doctors update own links" on public.evaluation_links;
drop policy if exists "doctors read own evaluations" on public.evaluations;
drop policy if exists "doctors assign own evaluations" on public.evaluations;

revoke all on table public.patients from anon, authenticated;
revoke all on table public.evaluation_links from anon, authenticated;
revoke all on table public.evaluations from anon, authenticated;
grant select, insert on table public.patients to authenticated;
grant update (nombre, apellido, updated_at) on table public.patients to authenticated;
grant select, insert on table public.evaluation_links to authenticated;
grant update (patient_id) on table public.evaluation_links to authenticated;
grant select on table public.evaluations to authenticated;
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
  and (patient_id is null or exists (select 1 from public.patients where patients.id = patient_id and patients.doctor_id = (select auth.uid())))
);
create policy "doctors update own links" on public.evaluation_links for update to authenticated
using ((select auth.uid()) = doctor_id)
with check (
  (select auth.uid()) = doctor_id
  and (patient_id is null or exists (select 1 from public.patients where patients.id = patient_id and patients.doctor_id = (select auth.uid())))
);
create policy "doctors read own evaluations" on public.evaluations for select to authenticated
using ((select auth.uid()) = doctor_id);
create policy "doctors assign own evaluations" on public.evaluations for update to authenticated
using ((select auth.uid()) = doctor_id)
with check (
  (select auth.uid()) = doctor_id
  and (patient_id is null or exists (select 1 from public.patients where patients.id = patient_id and patients.doctor_id = (select auth.uid())))
);

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

create or replace function public.complete_evaluation(
  p_token uuid, p_user_data jsonb, p_slots jsonb, p_rankings jsonb, p_result jsonb,
  p_started_at timestamptz, p_finished_at timestamptz, p_total_seconds integer,
  p_first_response_times jsonb, p_average_response_seconds numeric
) returns public.evaluations
language plpgsql security definer set search_path = '' as $$
declare l_link public.evaluation_links; l_evaluation public.evaluations;
begin
  select * into l_link from public.evaluation_links
  where token = p_token and status = 'available' and expires_at > now() for update;
  if not found then raise exception 'LINK_INVALID'; end if;
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
    coalesce(p_user_data->>'convivientes', ''), p_slots, p_rankings, p_result,
    p_started_at, p_finished_at, p_total_seconds, p_first_response_times, p_average_response_seconds
  ) returning * into l_evaluation;
  update public.evaluation_links set status = 'completed', completed_at = now() where id = l_link.id;
  return l_evaluation;
end; $$;

revoke execute on function public.get_evaluation_session(uuid) from public, anon, authenticated;
grant execute on function public.get_evaluation_session(uuid) to anon, authenticated;
revoke execute on function public.assign_evaluation_to_patient(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_evaluation_to_patient(uuid, uuid) to authenticated;
revoke execute on function public.complete_evaluation(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, integer, jsonb, numeric) from public, anon, authenticated;
grant execute on function public.complete_evaluation(uuid, jsonb, jsonb, jsonb, jsonb, timestamptz, timestamptz, integer, jsonb, numeric) to anon, authenticated;

commit;
