alter table public.patients
  add column if not exists document_type text,
  add column if not exists document_number text;

alter table public.patients
  add constraint patients_document_pair_check
    check ((document_type is null) = (document_number is null)),
  add constraint patients_document_type_check
    check (document_type is null or document_type in ('dni', 'ce', 'passport')),
  add constraint patients_document_number_check
    check (
      document_number is null
      or (
        document_number = upper(regexp_replace(document_number, '[^A-Za-z0-9]', '', 'g'))
        and (
          (document_type = 'dni' and document_number ~ '^[0-9]{8}$')
          or (document_type in ('ce', 'passport') and document_number ~ '^[A-Z0-9]{6,15}$')
        )
      )
    );

create unique index if not exists patients_doctor_document_unique
  on public.patients (doctor_id, document_type, document_number)
  where document_number is not null;

grant update (document_type, document_number) on table public.patients to authenticated;
