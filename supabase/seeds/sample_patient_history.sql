-- Datos de ejemplo para poblar la vista longitudinal.
-- Idempotente: omite pacientes cuyo nombre/apellido ya existan.
do $$
declare
  l_doctor uuid;
  l_patient uuid;
  l_link uuid;
  l_date timestamptz;
  l_duration integer;
  l_average numeric;
  l_ranks integer[];
  l_rankings jsonb;
  l_slots jsonb;
  l_positions jsonb;
  l_result jsonb;
  l_style text;
  l_conocimiento text;
  l_planeamiento text;
  l_enfrentamiento text;
  l_negative_sum integer;
  l_negative_level text;
  l_dominant text;
  l_dominant_label text;
  l_clave text;
  i integer;
  j integer;
  k integer;
  l_codes text[] := array['A1Z','A2Z','A3Z','A4Z','A5Z','A6Z','A7Z','A8Z','A9Z'];
  l_line_names text[] := array['Convergentes','Geométricas','Enraizadas','Ondulantes','De red','Agudas','Estáticas','En espiral','De fisuras'];
  l_image_ids integer[] := array[3,8,7,6,5,4,9,2,1];
  l_names text[] := array['Ana','Luis','Carla','Diego','Elena','Marco','Sofía','Jorge','Valeria','Andrés'];
  l_surnames text[] := array['Torres','Mendoza','Rojas','Salazar','Vega','Castillo','Paredes','Flores','Navarro','Campos'];
  l_documents text[] := array['70000001','70000002','70000003','70000004','70000005','70000006','70000007','70000008','70000009','70000010'];
  l_ages integer[] := array[28,35,31,42,26,39,33,45,30,37];
  l_sexes text[] := array['Femenino','Masculino','Femenino','Masculino','Femenino','Masculino','Femenino','Masculino','Femenino','Masculino'];
  l_occupations text[] := array['Diseñadora gráfica','Ingeniero civil','Administradora','Docente','Psicóloga','Contador','Arquitecta','Comerciante','Abogada','Analista de sistemas'];
  l_studies text[] := array['Diseño gráfico','Ingeniería civil','Administración','Educación','Psicología','Contabilidad','Arquitectura','Administración comercial','Derecho','Ingeniería de sistemas'];
  l_households text[] := array['Vive con su pareja','Vive con su esposa e hijos','Vive con sus padres','Vive con su esposa','Vive con una hermana','Vive con su pareja e hijo','Vive sola','Vive con su esposa e hijos','Vive con su pareja','Vive con sus padres'];
begin
  select id into l_doctor
  from auth.users
  where last_sign_in_at is not null
  order by last_sign_in_at desc
  limit 1;

  if l_doctor is null then
    raise exception 'No existe una cuenta profesional activa para los datos demo.';
  end if;

  for i in 1..10 loop
    select id into l_patient
      from public.patients
      where doctor_id = l_doctor and nombre = l_names[i] and apellido = l_surnames[i]
      limit 1;
    if l_patient is not null then
      update public.patients
      set document_type = 'dni', document_number = l_documents[i], updated_at = now()
      where id = l_patient and document_number is null;
      continue;
    end if;

    insert into public.patients(doctor_id, nombre, apellido, document_type, document_number, created_at, updated_at)
    values (l_doctor, l_names[i], l_surnames[i], 'dni', l_documents[i], now() - interval '220 days', now())
    returning id into l_patient;

    for j in 1..3 loop
      l_date := now() - ((3 - j) * interval '80 days') - (i * interval '1 day');
      l_duration := 105 + (i * 8) + (j * 19);
      l_average := round((1.35 + i * 0.07 + j * 0.16)::numeric, 2);
      l_ranks := array[]::integer[];

      for k in 1..9 loop
        l_ranks := array_append(l_ranks, ((k + i + j * 2 - 3) % 9) + 1);
      end loop;

      select jsonb_object_agg(code, rank),
             jsonb_agg(image_id order by rank),
             string_agg(substring(code from 2 for 1), '' order by rank),
             jsonb_agg(
               jsonb_build_object(
                 'code', code,
                 'name', line_name,
                 'rank', rank,
                 'zoneLabel', case when rank <= 3 then 'Primera elección (polo activo)' when rank <= 6 then 'Posición intermedia' else 'Última elección (polo rechazado)' end,
                 'interpretation', 'La posición refleja el nivel de preferencia observado durante esta aplicación.'
               ) order by rank
             )
      into l_rankings, l_slots, l_clave, l_positions
      from unnest(l_codes, l_line_names, l_image_ids, l_ranks) as item(code, line_name, image_id, rank);

      l_conocimiento := case when l_ranks[5] < l_ranks[2] then 'Elemental' else 'Sofisticado' end;
      l_planeamiento := case when l_ranks[3] < l_ranks[1] then 'Preservar' else 'Renovar' end;
      l_enfrentamiento := case when l_ranks[6] < l_ranks[4] then 'Enérgico' else 'Cálido' end;
      l_style := case
        when l_conocimiento = 'Elemental' and l_planeamiento = 'Preservar' and l_enfrentamiento = 'Enérgico' then 'Almirante'
        when l_conocimiento = 'Elemental' and l_planeamiento = 'Preservar' then 'Promotor'
        when l_conocimiento = 'Elemental' and l_planeamiento = 'Renovar' and l_enfrentamiento = 'Enérgico' then 'Combatiente'
        when l_conocimiento = 'Elemental' and l_planeamiento = 'Renovar' then 'Gerente'
        when l_conocimiento = 'Sofisticado' and l_planeamiento = 'Preservar' and l_enfrentamiento = 'Enérgico' then 'Caudillo'
        when l_conocimiento = 'Sofisticado' and l_planeamiento = 'Preservar' then 'Caballero'
        when l_conocimiento = 'Sofisticado' and l_planeamiento = 'Renovar' and l_enfrentamiento = 'Enérgico' then 'Magnate'
        else 'Estadista'
      end;

      l_negative_sum := l_ranks[7] + l_ranks[8] + l_ranks[9];
      l_negative_level := case
        when l_negative_sum = 6 then 'Muy activo negativo'
        when l_negative_sum <= 9 then 'Regularmente activo'
        when l_negative_sum <= 20 then 'Poco activo'
        when l_negative_sum <= 23 then 'Casi desactivado'
        else 'Desactivado'
      end;
      if l_ranks[7] <= l_ranks[8] and l_ranks[7] <= l_ranks[9] then
        l_dominant := 'A7Z'; l_dominant_label := 'Desmotivación (pensamientos de obsolescencia)';
      elsif l_ranks[8] <= l_ranks[9] then
        l_dominant := 'A8Z'; l_dominant_label := 'Descontrol (pensamientos de irreflexión)';
      else
        l_dominant := 'A9Z'; l_dominant_label := 'Desintegración (pensamientos de desmoronamiento)';
      end if;

      l_result := jsonb_build_object(
        'rankings', l_rankings,
        'claveAfrontamiento', l_clave,
        'copingStyle', jsonb_build_object(
          'style', l_style,
          'description', 'Síntesis del patrón de afrontamiento observado durante esta aplicación.',
          'dimensions', jsonb_build_object('conocimiento', l_conocimiento, 'planeamiento', l_planeamiento, 'enfrentamiento', l_enfrentamiento)
        ),
        'threePairs', jsonb_build_object(
          'par1', jsonb_build_object('label', case when l_conocimiento = 'Elemental' then 'Simple' else 'Compleja' end, 'orientation', l_conocimiento, 'description', 'Forma predominante de procesar la información.'),
          'par2', jsonb_build_object('label', case when l_planeamiento = 'Renovar' then 'Perspectiva' else 'Retrospectiva' end, 'orientation', l_planeamiento, 'description', 'Orientación predominante al planificar.'),
          'par3', jsonb_build_object('label', case when l_enfrentamiento = 'Enérgico' then 'Rayos' else 'Ondas' end, 'orientation', l_enfrentamiento, 'description', 'Forma predominante de responder ante situaciones exigentes.')
        ),
        'negativeTrio', jsonb_build_object('sum', l_negative_sum, 'levelLabel', l_negative_level, 'levelText', 'Nivel estimado a partir de la posición conjunta de los tres indicadores.', 'dominant', l_dominant, 'dominantLabel', l_dominant_label),
        'individualPositions', l_positions,
        'time', jsonb_build_object('seconds', l_duration, 'minutes', round(l_duration / 60.0), 'label', case when l_duration <= 120 then 'Decisor rápido (1–2 minutos)' when l_duration <= 240 then 'Tiempo normal (3–4 minutos)' else 'Perfil analítico (5+ minutos)' end),
        'userData', jsonb_build_object('nombre', l_names[i], 'apellido', l_surnames[i], 'edad', l_ages[i]::text, 'sexo', l_sexes[i], 'estadoCivil', 'Soltero/a', 'ocupacion', l_occupations[i], 'estudios', l_studies[i], 'convivientes', l_households[i]),
        'timestamp', l_date
      );

      insert into public.evaluation_links(doctor_id, patient_id, status, created_at, expires_at, completed_at)
      values (l_doctor, l_patient, 'completed', l_date - interval '1 day', l_date + interval '1 day', l_date)
      returning id into l_link;

      insert into public.evaluations(
        link_id, doctor_id, patient_id, nombre, apellido, edad, sexo, estado_civil,
        ocupacion, estudios, convivientes, slots, rankings, result, started_at,
        finished_at, total_execution_seconds, first_response_times, average_response_seconds, created_at
      ) values (
        l_link, l_doctor, l_patient, l_names[i], l_surnames[i], l_ages[i]::text, l_sexes[i], 'Soltero/a',
        l_occupations[i], l_studies[i], l_households[i], l_slots, l_rankings, l_result,
        l_date, l_date + make_interval(secs => l_duration), l_duration,
        jsonb_build_array(l_average - 0.4, l_average - 0.3, l_average - 0.2, l_average - 0.1, l_average, l_average + 0.1, l_average + 0.2, l_average + 0.3, l_average + 0.4),
        l_average, l_date
      );
    end loop;
  end loop;
end $$;
