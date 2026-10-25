-- Licenses are per professional account. Existing accounts remain active until
-- the owner assigns an end date; new accounts require an explicit license.
create table if not exists public.test_licenses (
  user_id uuid primary key references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'suspended')),
  valid_until date,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.license_owners (
  user_id uuid primary key references auth.users(id) on delete restrict
);

create table if not exists public.license_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  changed_by uuid not null references auth.users(id) on delete restrict,
  status text not null,
  valid_until date,
  changed_at timestamptz not null default now()
);

alter table public.test_licenses enable row level security;
alter table public.license_owners enable row level security;
alter table public.license_events enable row level security;

revoke all on public.test_licenses, public.license_owners, public.license_events from anon, authenticated;
grant select on public.test_licenses to authenticated;
create policy "professionals read own license" on public.test_licenses
  for select to authenticated using (user_id = (select auth.uid()));

-- Preserve access for accounts that existed before licensing was introduced.
insert into public.test_licenses (user_id)
select id from auth.users
on conflict (user_id) do nothing;

create or replace function public.is_license_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.license_owners
    where user_id = (select auth.uid())
  );
$$;
revoke execute on function public.is_license_owner() from public, anon, authenticated;
grant execute on function public.is_license_owner() to authenticated;

create or replace function public.owner_list_licenses()
returns table (user_id uuid, email text, status text, valid_until date, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_license_owner() then raise exception 'OWNER_REQUIRED'; end if;
  return query
    select u.id, u.email::text, l.status, l.valid_until, l.updated_at
    from auth.users u
    left join public.test_licenses l on l.user_id = u.id
    where not exists (select 1 from public.license_owners o where o.user_id = u.id)
    order by u.email;
end;
$$;
revoke execute on function public.owner_list_licenses() from public, anon, authenticated;
grant execute on function public.owner_list_licenses() to authenticated;

create or replace function public.owner_set_license(
  p_user_id uuid, p_status text, p_valid_until date
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_license_owner() then raise exception 'OWNER_REQUIRED'; end if;
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id)
    or exists (select 1 from public.license_owners where user_id = p_user_id)
    or p_status not in ('active', 'suspended') then
    raise exception 'LICENSE_INVALID';
  end if;
  insert into public.test_licenses (user_id, status, valid_until, updated_at, updated_by)
  values (p_user_id, p_status, p_valid_until, now(), auth.uid())
  on conflict (user_id) do update set
    status = excluded.status,
    valid_until = excluded.valid_until,
    updated_at = excluded.updated_at,
    updated_by = excluded.updated_by;
  insert into public.license_events (user_id, changed_by, status, valid_until)
  values (p_user_id, auth.uid(), p_status, p_valid_until);
end;
$$;
revoke execute on function public.owner_set_license(uuid, text, date) from public, anon, authenticated;
grant execute on function public.owner_set_license(uuid, text, date) to authenticated;

create or replace function public.enforce_active_test_license()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.test_licenses l
    where l.user_id = new.doctor_id
      and l.status = 'active'
      and (l.valid_until is null or l.valid_until >= (now() at time zone 'America/Lima')::date)
  ) then
    raise exception 'LICENSE_INACTIVE';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_active_test_license() from public, anon, authenticated;

create trigger license_required_for_links before insert on public.evaluation_links
  for each row execute function public.enforce_active_test_license();
create trigger license_required_for_evaluations before insert on public.evaluations
  for each row execute function public.enforce_active_test_license();

create or replace function public.get_evaluation_session(p_token uuid)
returns table (nombre text, apellido text)
language sql security definer set search_path = '' as $$
  select p.nombre, p.apellido
  from public.evaluation_links l
  left join public.patients p on p.id = l.patient_id and p.doctor_id = l.doctor_id
  join public.test_licenses license on license.user_id = l.doctor_id
  where l.token = p_token and l.status = 'available' and l.expires_at > now()
    and license.status = 'active'
    and (license.valid_until is null or license.valid_until >= (now() at time zone 'America/Lima')::date)
  limit 1
$$;
