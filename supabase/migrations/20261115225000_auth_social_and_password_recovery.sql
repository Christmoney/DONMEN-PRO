alter table public.profiles
  alter column gender drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
  username_source text;
  profile_username text;
  username_suffix text;
  profile_first_name text;
begin
  requested_role := case
    when new.raw_user_meta_data ->> 'role' = 'hairdresser' then 'hairdresser'
    else 'client'
  end;

  username_source := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'user_name', ''),
    nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(pg_catalog.split_part(coalesce(new.email, ''), '@', 1), ''),
    'user'
  );
  profile_username := pg_catalog.lower(pg_catalog.regexp_replace(username_source, '[^a-zA-Z0-9._-]', '', 'g'));

  if pg_catalog.char_length(profile_username) < 3 then
    profile_username := 'user';
  end if;

  profile_username := pg_catalog.left(profile_username, 20);
  if exists (
    select 1
    from public.profiles p
    where pg_catalog.lower(p.username) = pg_catalog.lower(profile_username)
  ) then
    username_suffix := pg_catalog.left(pg_catalog.md5(new.id::text), 12);
    profile_username := pg_catalog.left(profile_username, 7) || '_' || username_suffix;
  end if;

  profile_first_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    profile_username
  );

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
    profile_username,
    profile_first_name,
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when new.raw_user_meta_data ->> 'gender' in ('female', 'male')
        then (new.raw_user_meta_data ->> 'gender')::public.gender
      else null
    end,
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
