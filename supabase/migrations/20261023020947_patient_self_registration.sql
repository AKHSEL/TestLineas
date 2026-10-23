begin;

alter table public.evaluation_links
  add column if not exists registration_required boolean not null default false;

create or replace function public.register_invited_patient(
  p_token uuid, p_nombre text, p_apellido text, p_document_type text, p_document_number text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  l_link public.evaluation_links;
  l_patient_id uuid;
  l_nombre text := btrim(regexp_replace(coalesce(p_nombre, ''), '[[:space:]]+', ' ', 'g'));
  l_apellido text := btrim(regexp_replace(coalesce(p_apellido, ''), '[[:space:]]+', ' ', 'g'));
  l_type text := lower(btrim(coalesce(p_document_type, '')));
  l_number text := upper(regexp_replace(coalesce(p_document_number, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  select * into l_link
  from public.evaluation_links
  where token = p_token and status = 'available' and expires_at > now()
  for update;
  if not found or not l_link.registration_required then
    raise exception 'LINK_INVALID';
  end if;
  if l_link.patient_id is not null then
    return l_link.patient_id;
  end if;
  if l_link.consent_started_at is null then
    raise exception 'CONSENT_REQUIRED';
  end if;
  if char_length(l_nombre) not between 1 and 80
     or char_length(l_apellido) not between 1 and 80
     or l_type not in ('dni', 'ce', 'passport')
     or (l_type = 'dni' and l_number !~ '^[0-9]{8}$')
     or (l_type <> 'dni' and l_number !~ '^[A-Z0-9]{6,15}$') then
    raise exception 'PATIENT_INVALID';
  end if;

  begin
    insert into public.patients(doctor_id, nombre, apellido, document_type, document_number)
    values (l_link.doctor_id, l_nombre, l_apellido, l_type, l_number)
    returning id into l_patient_id;
  exception when unique_violation then
    raise exception 'DOCUMENT_EXISTS';
  end;

  update public.evaluation_links set patient_id = l_patient_id where id = l_link.id;
  return l_patient_id;
end; $$;

revoke execute on function public.register_invited_patient(uuid, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.register_invited_patient(uuid, text, text, text, text) to anon;

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
  if l_link.registration_required and l_link.patient_id is null then
    raise exception 'REGISTRATION_REQUIRED';
  end if;

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

commit;
