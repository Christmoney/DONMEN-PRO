create table public.hairdresser_public_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) > 0),
  zone text not null default '',
  specialties text[] not null default '{}',
  bio text not null default '',
  rating numeric(2, 1) not null default 0 check (rating between 0 and 5),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array'),
  years_experience integer check (years_experience is null or years_experience >= 0),
  languages text[] not null default '{}',
  social_url text,
  brings_kit boolean not null default false,
  profile_completion integer generated always as (
    (case when char_length(btrim(display_name)) > 0 then 10 else 0 end)
    + (case when char_length(btrim(bio)) > 0 then 20 else 0 end)
    + (case when cardinality(specialties) > 0 then 15 else 0 end)
    + (case when char_length(btrim(zone)) > 0 then 15 else 0 end)
    + (case when years_experience is not null then 10 else 0 end)
    + (case when cardinality(languages) > 0 then 10 else 0 end)
    + (case when social_url is not null and char_length(btrim(social_url)) > 0 then 5 else 0 end)
    + (case when jsonb_array_length(services) > 0 then 15 else 0 end)
  ) stored,
  updated_at timestamptz not null default now()
);

create index hairdresser_public_profiles_eligible_updated_idx
  on public.hairdresser_public_profiles (updated_at desc)
  where profile_completion >= 51;

alter table public.hairdresser_public_profiles enable row level security;

create policy "Hairdressers can read their own public profile"
  on public.hairdresser_public_profiles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Clients can read profiles completed at least 51 percent"
  on public.hairdresser_public_profiles for select
  to authenticated
  using (
    profile_completion >= 51
    and (select public.has_role('client'::public.app_role))
  );

create policy "Hairdressers can create their own public profile"
  on public.hairdresser_public_profiles for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can update their own public profile"
  on public.hairdresser_public_profiles for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  )
  with check (
    user_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

revoke all on public.hairdresser_public_profiles from public, anon, authenticated;
grant select, insert, update on public.hairdresser_public_profiles to authenticated;
