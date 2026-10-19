begin;

alter table public.evaluation_links
  add column if not exists consent_started_at timestamptz,
  add column if not exists response_confirmed_at timestamptz;

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

  -- Preserve submissions already in progress before this migration.
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

revoke execute on function public.record_test_consent(uuid) from public, anon, authenticated;
grant execute on function public.record_test_consent(uuid) to anon;
revoke execute on function public.record_test_confirmation(uuid) from public, anon, authenticated;
grant execute on function public.record_test_confirmation(uuid) to anon;

commit;
