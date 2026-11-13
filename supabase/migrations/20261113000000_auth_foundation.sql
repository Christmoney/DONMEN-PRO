create extension if not exists pgcrypto;

create type public.app_role as enum ('client', 'hairdresser', 'admin');
create type public.gender as enum ('female', 'male');
create type public.hairdresser_review_status as enum ('pending', 'approved', 'suspended');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  first_name text not null,
  last_name text,
  phone text not null,
  gender public.gender not null,
  city text,
  coverage_areas text,
  specialties text[] not null default '{}',
  years_experience integer check (years_experience is null or years_experience >= 0),
  serves public.gender[] not null default array['female'::public.gender, 'male'::public.gender],
  women_only boolean not null default false,
  hairdresser_status public.hairdresser_review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_length check (char_length(username) between 3 and 20),
  constraint profiles_phone_format check (phone ~ '^\+237[0-9]{9}$')
);

create unique index profiles_username_lower_unique on public.profiles (lower(username));
create unique index profiles_phone_unique on public.profiles (phone);

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.kyc_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'not_submitted' check (status in ('not_submitted', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('kyc_enabled', 'false'::jsonb);

create table public.auth_attempts (
  id bigint generated always as identity primary key,
  identifier_hash text not null,
  attempted_at timestamptz not null default now(),
  succeeded boolean not null
);

create index auth_attempts_identifier_time_idx
  on public.auth_attempts (identifier_hash, attempted_at desc);

create or replace function public.has_role(requested_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = requested_role
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');

  if requested_role not in ('client', 'hairdresser') then
    raise exception 'Unsupported self-registration role';
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
    new.phone,
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.lookup_phone_by_username(input_username text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select phone
  from public.profiles
  where lower(username) = lower(trim(input_username))
  limit 1;
$$;

revoke all on function public.lookup_phone_by_username(text) from public, anon, authenticated;
grant execute on function public.lookup_phone_by_username(text) to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.kyc_verifications enable row level security;
alter table public.app_settings enable row level security;
alter table public.auth_attempts enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can read their own roles"
  on public.user_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their own KYC status"
  on public.kyc_verifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Admins can read KYC statuses"
  on public.kyc_verifications for select
  to authenticated
  using ((select public.has_role('admin'::public.app_role)));

create policy "Admins can manage app settings"
  on public.app_settings for all
  to authenticated
  using ((select public.has_role('admin'::public.app_role)))
  with check ((select public.has_role('admin'::public.app_role)));

grant usage on schema public to anon, authenticated, service_role;
revoke all on public.profiles, public.user_roles, public.kyc_verifications, public.app_settings, public.auth_attempts
  from public, anon, authenticated;
grant select on public.profiles, public.user_roles, public.kyc_verifications to authenticated;
grant select, insert, update, delete on public.app_settings to authenticated;
grant all on public.auth_attempts to service_role;
revoke all on sequence public.auth_attempts_id_seq from public, anon, authenticated;
grant usage, select on sequence public.auth_attempts_id_seq to service_role;

revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated, service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
