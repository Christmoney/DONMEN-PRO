create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  normalized_phone text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');

  if requested_role not in ('client', 'hairdresser') then
    raise exception 'Unsupported self-registration role';
  end if;

  normalized_phone := '+' || pg_catalog.regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g');
  if normalized_phone !~ '^\+237[0-9]{9}$' then
    raise exception 'Unsupported phone format';
  end if;

  insert into public.profiles (
    id,
    username,
    first_name,
    last_name,
    phone,
    gender,
    city,
    coverage_areas,
    specialties,
    years_experience
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    normalized_phone,
    (new.raw_user_meta_data ->> 'gender')::public.gender,
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'coverage_areas', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'specialties', '[]'::jsonb))),
      '{}'::text[]
    ),
    nullif(new.raw_user_meta_data ->> 'years_experience', '')::integer
  );

  insert into public.user_roles (user_id, role)
  values (new.id, requested_role::public.app_role);

  insert into public.kyc_verifications (user_id)
  values (new.id);

  return new;
end;
$$;
