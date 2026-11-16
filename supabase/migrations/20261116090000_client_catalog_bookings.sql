begin;

create extension if not exists btree_gist;

insert into public.app_settings (key, value)
values
  ('hairdresser_auto_approval', 'true'::jsonb),
  ('booking_slot_step_minutes', '30'::jsonb),
  ('booking_min_notice_minutes', '60'::jsonb),
  ('booking_travel_buffer_minutes', '30'::jsonb),
  ('booking_free_cancel_hours', '24'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Clients can read profiles completed at least 51 percent"
  on public.hairdresser_public_profiles;

alter table public.hairdresser_public_profiles
  add column avatar_path text,
  add column is_available boolean not null default false,
  add column validation_status text not null default 'pending'
    check (validation_status in ('pending', 'approved', 'suspended'));

drop index if exists public.hairdresser_public_profiles_eligible_updated_idx;
alter table public.hairdresser_public_profiles drop column profile_completion;
alter table public.hairdresser_public_profiles
  add column profile_completion integer not null default 0
    check (profile_completion between 0 and 100);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  hairdresser_id uuid not null references public.hairdresser_public_profiles (user_id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  category text not null check (category in ('Tresses', 'Tissage', 'Coupe', 'Soins')),
  description text not null default '',
  price_fcfa integer not null check (price_fcfa >= 0),
  duration_min integer not null check (duration_min > 0),
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.services (hairdresser_id, name, category, description, price_fcfa, duration_min, photo_path, is_active)
select
  profile.user_id,
  btrim(item.value ->> 'name'),
  case
    when item.value ->> 'category' in ('Tresses', 'Tissage', 'Coupe', 'Soins') then item.value ->> 'category'
    else 'Soins'
  end,
  coalesce(item.value ->> 'description', ''),
  case
    when coalesce(item.value ->> 'price', '') ~ '^[0-9]+$' then (item.value ->> 'price')::integer
    else 0
  end,
  greatest(
    case
      when coalesce(item.value ->> 'duration', '') ~* 'h' then
        coalesce((regexp_match(item.value ->> 'duration', '([0-9]+)[[:space:]]*h', 'i'))[1]::integer, 0) * 60
        + coalesce((regexp_match(item.value ->> 'duration', 'h[[:space:]]*([0-9]+)', 'i'))[1]::integer, 0)
      else coalesce((regexp_match(item.value ->> 'duration', '([0-9]+)'))[1]::integer, 60)
    end,
    1
  ),
  case
    when coalesce(item.value ->> 'photo', '') <> ''
      and item.value ->> 'photo' not like 'data:%'
      and item.value ->> 'photo' !~ '^https?://' then item.value ->> 'photo'
    else null
  end,
  true
from public.hairdresser_public_profiles as profile
cross join lateral jsonb_array_elements(profile.services) as item(value)
where jsonb_typeof(profile.services) = 'array'
  and nullif(btrim(item.value ->> 'name'), '') is not null;

alter table public.hairdresser_public_profiles drop column services;

create or replace function public.recalculate_hairdresser_profile_completion(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  completion integer;
begin
  select
    (case when char_length(btrim(profile.display_name)) > 0 then 10 else 0 end)
    + (case when char_length(btrim(profile.bio)) > 0 then 15 else 0 end)
    + (case when profile.avatar_path is not null and char_length(btrim(profile.avatar_path)) > 0 then 10 else 0 end)
    + (case when cardinality(profile.specialties) > 0 then 15 else 0 end)
    + (case when char_length(btrim(profile.zone)) > 0 then 15 else 0 end)
    + (case when profile.years_experience is not null then 10 else 0 end)
    + (case when cardinality(profile.languages) > 0 then 10 else 0 end)
    + (case when profile.social_url is not null and char_length(btrim(profile.social_url)) > 0 then 5 else 0 end)
    + (case when exists (
      select 1
      from public.services as service
      where service.hairdresser_id = profile.user_id
        and service.is_active
    ) then 10 else 0 end)
  into completion
  from public.hairdresser_public_profiles as profile
  where profile.user_id = target_user_id;

  if completion is not null then
    update public.hairdresser_public_profiles
    set profile_completion = completion
    where user_id = target_user_id
      and profile_completion is distinct from completion;
  end if;
end;
$$;

create or replace function public.refresh_hairdresser_profile_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'services' then
    if tg_op = 'DELETE' then
      perform public.recalculate_hairdresser_profile_completion(old.hairdresser_id);
      return old;
    end if;
    perform public.recalculate_hairdresser_profile_completion(new.hairdresser_id);
    if tg_op = 'UPDATE' and old.hairdresser_id is distinct from new.hairdresser_id then
      perform public.recalculate_hairdresser_profile_completion(old.hairdresser_id);
    end if;
    return new;
  end if;

  perform public.recalculate_hairdresser_profile_completion(new.user_id);
  return new;
end;
$$;

create trigger hairdresser_profile_completion_refresh
  after insert or update on public.hairdresser_public_profiles
  for each row execute function public.refresh_hairdresser_profile_completion();

create trigger service_profile_completion_refresh
  after insert or update or delete on public.services
  for each row execute function public.refresh_hairdresser_profile_completion();

update public.hairdresser_public_profiles as profile
set profile_completion =
  (case when char_length(btrim(profile.display_name)) > 0 then 10 else 0 end)
  + (case when char_length(btrim(profile.bio)) > 0 then 15 else 0 end)
  + (case when profile.avatar_path is not null and char_length(btrim(profile.avatar_path)) > 0 then 10 else 0 end)
  + (case when cardinality(profile.specialties) > 0 then 15 else 0 end)
  + (case when char_length(btrim(profile.zone)) > 0 then 15 else 0 end)
  + (case when profile.years_experience is not null then 10 else 0 end)
  + (case when cardinality(profile.languages) > 0 then 10 else 0 end)
  + (case when profile.social_url is not null and char_length(btrim(profile.social_url)) > 0 then 5 else 0 end)
  + (case when exists (
    select 1 from public.services as service
    where service.hairdresser_id = profile.user_id and service.is_active
  ) then 10 else 0 end);

create index hairdresser_public_profiles_eligible_updated_idx
  on public.hairdresser_public_profiles (updated_at desc)
  where profile_completion >= 50
    and validation_status = 'approved'
    and is_available;

create or replace function public.apply_hairdresser_auto_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.validation_status := case
    when coalesce((
      select setting.value #>> '{}'
      from public.app_settings as setting
      where setting.key = 'hairdresser_auto_approval'
    ), 'true') = 'true' then 'approved'
    else 'pending'
  end;
  return new;
end;
$$;

create trigger hairdresser_auto_approval
  before insert on public.hairdresser_public_profiles
  for each row execute function public.apply_hairdresser_auto_approval();

update public.hairdresser_public_profiles
set validation_status = 'approved'
where coalesce((
  select setting.value #>> '{}'
  from public.app_settings as setting
  where setting.key = 'hairdresser_auto_approval'
), 'true') = 'true';

create or replace function public.guard_hairdresser_approval_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.has_role('admin'::public.app_role)) then
    new.validation_status := old.validation_status;
  end if;
  return new;
end;
$$;

create trigger hairdresser_approval_status_guard
  before update of validation_status on public.hairdresser_public_profiles
  for each row execute function public.guard_hairdresser_approval_status();

create table public.availabilities (
  id uuid primary key default gen_random_uuid(),
  hairdresser_id uuid not null references public.hairdresser_public_profiles (user_id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (hairdresser_id, weekday),
  check (end_time > start_time)
);

create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  hairdresser_id uuid not null references public.hairdresser_public_profiles (user_id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  hairdresser_id uuid not null references public.hairdresser_public_profiles (user_id) on delete restrict,
  hairdresser_display_name text not null,
  scheduled_at timestamptz not null,
  ends_at timestamptz not null,
  service_duration_min integer not null check (service_duration_min > 0),
  total_price_fcfa integer not null check (total_price_fcfa >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'declined', 'cancelled', 'expired')),
  cancelled_by text check (cancelled_by is null or cancelled_by in ('client', 'hairdresser', 'admin')),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > scheduled_at),
  constraint bookings_no_hairdresser_overlap
    exclude using gist (
      hairdresser_id with =,
      tstzrange(scheduled_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'accepted', 'on_the_way', 'in_progress'))
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name text not null,
  category text not null,
  description text not null default '',
  price_fcfa integer not null check (price_fcfa >= 0),
  duration_min integer not null check (duration_min > 0),
  photo_path text,
  created_at timestamptz not null default now()
);

create table public.booking_addresses (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  address_text text not null check (char_length(btrim(address_text)) > 0),
  latitude double precision,
  longitude double precision,
  access_notes text,
  created_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create index services_hairdresser_active_idx on public.services (hairdresser_id, is_active);
create index availabilities_hairdresser_weekday_idx on public.availabilities (hairdresser_id, weekday);
create index bookings_client_scheduled_idx on public.bookings (client_id, scheduled_at desc);
create index bookings_hairdresser_scheduled_idx on public.bookings (hairdresser_id, scheduled_at desc);

alter table public.services enable row level security;
alter table public.availabilities enable row level security;
alter table public.time_off enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_addresses enable row level security;

create policy "Clients can read available verified profiles"
  on public.hairdresser_public_profiles for select to authenticated
  using (
    profile_completion >= 50
    and validation_status = 'approved'
    and is_available
    and (select public.has_role('client'::public.app_role))
  );

create policy "Admins can read all hairdresser profiles"
  on public.hairdresser_public_profiles for select to authenticated
  using ((select public.has_role('admin'::public.app_role)));

create policy "Admins can update hairdresser approval"
  on public.hairdresser_public_profiles for update to authenticated
  using ((select public.has_role('admin'::public.app_role)))
  with check ((select public.has_role('admin'::public.app_role)));

revoke all on public.hairdresser_public_profiles from public, anon, authenticated;
grant select on public.hairdresser_public_profiles to authenticated;
grant insert (user_id, display_name, zone, specialties, bio, years_experience, languages, social_url, brings_kit, avatar_path, is_available, updated_at)
  on public.hairdresser_public_profiles to authenticated;
grant update (user_id, display_name, zone, specialties, bio, years_experience, languages, social_url, brings_kit, avatar_path, is_available, updated_at, validation_status)
  on public.hairdresser_public_profiles to authenticated;

create policy "Clients can read active services from available profiles"
  on public.services for select to authenticated
  using (
    is_active
    and (select public.has_role('client'::public.app_role))
    and exists (
      select 1 from public.hairdresser_public_profiles as profile
      where profile.user_id = services.hairdresser_id
        and profile.profile_completion >= 50
        and profile.validation_status = 'approved'
        and profile.is_available
    )
  );

create policy "Hairdressers can read their catalog"
  on public.services for select to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Admins can read all services"
  on public.services for select to authenticated
  using ((select public.has_role('admin'::public.app_role)));

create policy "Hairdressers can create their services"
  on public.services for insert to authenticated
  with check (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can update their services"
  on public.services for update to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  )
  with check (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can delete their services"
  on public.services for delete to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can manage their availability"
  on public.availabilities for all to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  )
  with check (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Clients can read appointment availability"
  on public.availabilities for select to authenticated
  using (
    (select public.has_role('client'::public.app_role))
    and exists (
      select 1 from public.hairdresser_public_profiles as profile
      where profile.user_id = availabilities.hairdresser_id
        and profile.profile_completion >= 50
        and profile.validation_status = 'approved'
        and profile.is_available
    )
  );

create policy "Hairdressers can manage their time off"
  on public.time_off for all to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  )
  with check (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Clients can read their bookings"
  on public.bookings for select to authenticated
  using (
    client_id = (select auth.uid())
    and (select public.has_role('client'::public.app_role))
  );

create policy "Hairdressers can read their bookings"
  on public.bookings for select to authenticated
  using (
    hairdresser_id = (select auth.uid())
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Admins can read all bookings"
  on public.bookings for select to authenticated
  using ((select public.has_role('admin'::public.app_role)));

create policy "Clients can read their booking items"
  on public.booking_items for select to authenticated
  using (
    exists (
      select 1 from public.bookings as booking
      where booking.id = booking_items.booking_id
        and booking.client_id = (select auth.uid())
        and (select public.has_role('client'::public.app_role))
    )
  );

create policy "Hairdressers can read their booking items"
  on public.booking_items for select to authenticated
  using (
    exists (
      select 1 from public.bookings as booking
      where booking.id = booking_items.booking_id
        and booking.hairdresser_id = (select auth.uid())
        and (select public.has_role('hairdresser'::public.app_role))
    )
  );

create policy "Clients can read their booking address"
  on public.booking_addresses for select to authenticated
  using (
    exists (
      select 1 from public.bookings as booking
      where booking.id = booking_addresses.booking_id
        and booking.client_id = (select auth.uid())
        and (select public.has_role('client'::public.app_role))
    )
  );

create policy "Hairdressers can read their active booking addresses"
  on public.booking_addresses for select to authenticated
  using (
    exists (
      select 1 from public.bookings as booking
      where booking.id = booking_addresses.booking_id
        and booking.hairdresser_id = (select auth.uid())
        and booking.status in ('accepted', 'on_the_way', 'in_progress', 'completed')
        and (select public.has_role('hairdresser'::public.app_role))
    )
  );

create policy "Admins can read booking addresses"
  on public.booking_addresses for select to authenticated
  using ((select public.has_role('admin'::public.app_role)));

revoke all on public.services, public.availabilities, public.time_off, public.bookings, public.booking_items, public.booking_addresses
  from public, anon, authenticated;
grant select, insert, update, delete on public.services, public.availabilities, public.time_off to authenticated;
grant select on public.bookings, public.booking_items, public.booking_addresses to authenticated;

create or replace view public.public_hairdressers
with (security_invoker = true)
as
select
  profile.user_id,
  profile.display_name,
  profile.zone,
  profile.specialties,
  profile.bio,
  profile.rating,
  profile.profile_completion,
  profile.years_experience,
  profile.avatar_path,
  profile.is_available,
  profile.updated_at,
  coalesce(min(service.price_fcfa) filter (where service.is_active), 0)::integer as starting_price,
  coalesce(array_agg(distinct service.name) filter (where service.is_active), '{}'::text[]) as service_names
from public.hairdresser_public_profiles as profile
left join public.services as service on service.hairdresser_id = profile.user_id
where profile.profile_completion >= 50
  and profile.validation_status = 'approved'
  and profile.is_available
group by profile.user_id;

grant select on public.public_hairdressers to authenticated;

create or replace function public.get_available_slots(
  p_hairdresser_id uuid,
  p_date date,
  p_service_ids uuid[]
)
returns table (slot timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  requested_duration integer;
  requested_count integer;
  slot_step integer;
  minimum_notice integer;
  travel_buffer integer;
begin
  if (select auth.uid()) is null
    or not (select public.has_role('client'::public.app_role)) then
    raise exception 'CLIENT_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if cardinality(coalesce(p_service_ids, '{}'::uuid[])) = 0 then
    return;
  end if;
  if not exists (
    select 1
    from public.hairdresser_public_profiles as profile
    where profile.user_id = p_hairdresser_id
      and profile.profile_completion >= 50
      and profile.validation_status = 'approved'
      and profile.is_available
  ) then
    return;
  end if;

  select count(*)::integer, coalesce(sum(service.duration_min), 0)::integer
  into requested_count, requested_duration
  from public.services as service
  where service.id = any(p_service_ids)
    and service.hairdresser_id = p_hairdresser_id
    and service.is_active;
  if requested_count <> cardinality(p_service_ids) then
    raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023';
  end if;

  select coalesce((setting.value #>> '{}')::integer, 30)
  into slot_step from public.app_settings as setting where setting.key = 'booking_slot_step_minutes';
  slot_step := greatest(coalesce(slot_step, 30), 5);
  select coalesce((setting.value #>> '{}')::integer, 60)
  into minimum_notice from public.app_settings as setting where setting.key = 'booking_min_notice_minutes';
  minimum_notice := greatest(coalesce(minimum_notice, 60), 0);
  select coalesce((setting.value #>> '{}')::integer, 30)
  into travel_buffer from public.app_settings as setting where setting.key = 'booking_travel_buffer_minutes';
  travel_buffer := greatest(coalesce(travel_buffer, 30), 0);

  return query
  with candidates as (
    select
      ((p_date + availability.start_time)
        + series.step_index * make_interval(mins => slot_step))
        at time zone 'Africa/Douala' as starts_at
    from public.availabilities as availability
    cross join lateral generate_series(
      0,
      floor(
        (floor(extract(epoch from (availability.end_time - availability.start_time)) / 60)::integer
          - requested_duration - travel_buffer)::numeric / slot_step
      )::integer
    ) as series(step_index)
    where availability.hairdresser_id = p_hairdresser_id
      and availability.weekday = extract(isodow from p_date)::smallint
  )
  select candidates.starts_at
  from candidates
  where candidates.starts_at >= now() + make_interval(mins => minimum_notice)
    and not exists (
      select 1 from public.time_off as blocked
      where blocked.hairdresser_id = p_hairdresser_id
        and tstzrange(blocked.starts_at, blocked.ends_at, '[)')
          && tstzrange(candidates.starts_at, candidates.starts_at + make_interval(mins => requested_duration + travel_buffer), '[)')
    )
    and not exists (
      select 1 from public.bookings as booking
      where booking.hairdresser_id = p_hairdresser_id
        and booking.status in ('pending', 'accepted', 'on_the_way', 'in_progress')
        and tstzrange(booking.scheduled_at, booking.ends_at, '[)')
          && tstzrange(candidates.starts_at, candidates.starts_at + make_interval(mins => requested_duration + travel_buffer), '[)')
    )
  order by candidates.starts_at;
end;
$$;

create or replace function public.create_booking(
  p_hairdresser_id uuid,
  p_service_ids uuid[],
  p_scheduled_at timestamptz,
  p_address_text text,
  p_access_notes text default null,
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_count integer;
  duration_total integer;
  price_total integer;
  travel_buffer integer;
  booking_id uuid;
  hairdresser_name text;
begin
  if (select auth.uid()) is null
    or not (select public.has_role('client'::public.app_role)) then
    raise exception 'CLIENT_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if cardinality(coalesce(p_service_ids, '{}'::uuid[])) = 0
    or nullif(btrim(p_address_text), '') is null then
    raise exception 'INVALID_BOOKING' using errcode = '22023';
  end if;

  select count(*)::integer, coalesce(sum(service.duration_min), 0)::integer, coalesce(sum(service.price_fcfa), 0)::integer
  into service_count, duration_total, price_total
  from public.services as service
  where service.id = any(p_service_ids)
    and service.hairdresser_id = p_hairdresser_id
    and service.is_active;
  if service_count <> cardinality(p_service_ids) then
    raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.get_available_slots(
      p_hairdresser_id,
      (p_scheduled_at at time zone 'Africa/Douala')::date,
      p_service_ids
    ) as available
    where available.slot = p_scheduled_at
  ) then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
  end if;

  select profile.display_name
  into hairdresser_name
  from public.hairdresser_public_profiles as profile
  where profile.user_id = p_hairdresser_id
    and profile.profile_completion >= 50
    and profile.validation_status = 'approved'
    and profile.is_available;
  if hairdresser_name is null then
    raise exception 'HAIRDRESSER_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select coalesce((setting.value #>> '{}')::integer, 30)
  into travel_buffer from public.app_settings as setting where setting.key = 'booking_travel_buffer_minutes';
  travel_buffer := greatest(coalesce(travel_buffer, 30), 0);

  insert into public.bookings (
    client_id, hairdresser_id, hairdresser_display_name, scheduled_at, ends_at,
    service_duration_min, total_price_fcfa
  )
  values (
    (select auth.uid()),
    p_hairdresser_id,
    hairdresser_name,
    p_scheduled_at,
    p_scheduled_at + make_interval(mins => duration_total + travel_buffer),
    duration_total,
    price_total
  )
  returning id into booking_id;

  insert into public.booking_items (booking_id, service_id, name, category, description, price_fcfa, duration_min, photo_path)
  select booking_id, service.id, service.name, service.category, service.description,
    service.price_fcfa, service.duration_min, service.photo_path
  from public.services as service
  where service.id = any(p_service_ids)
    and service.hairdresser_id = p_hairdresser_id
    and service.is_active;

  insert into public.booking_addresses (booking_id, address_text, latitude, longitude, access_notes)
  values (booking_id, btrim(p_address_text), p_latitude, p_longitude, nullif(btrim(p_access_notes), ''));

  return booking_id;
exception
  when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = 'P0001';
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_booking public.bookings%rowtype;
  cancellation_hours integer;
begin
  if (select auth.uid()) is null
    or not (select public.has_role('client'::public.app_role)) then
    raise exception 'CLIENT_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into selected_booking
  from public.bookings
  where id = p_booking_id
    and client_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'BOOKING_NOT_FOUND' using errcode = 'P0002';
  end if;
  if selected_booking.status not in ('pending', 'accepted') then
    raise exception 'BOOKING_CANNOT_BE_CANCELLED' using errcode = 'P0001';
  end if;

  select coalesce((setting.value #>> '{}')::integer, 24)
  into cancellation_hours from public.app_settings as setting where setting.key = 'booking_free_cancel_hours';
  cancellation_hours := greatest(coalesce(cancellation_hours, 24), 0);
  if selected_booking.scheduled_at < now() + make_interval(hours => cancellation_hours) then
    raise exception 'CANCELLATION_WINDOW_CLOSED' using errcode = 'P0001';
  end if;

  update public.bookings
  set status = 'cancelled',
      cancelled_by = 'client',
      updated_at = now()
  where id = p_booking_id;
end;
$$;

revoke all on function public.recalculate_hairdresser_profile_completion(uuid) from public, anon, authenticated;
revoke all on function public.refresh_hairdresser_profile_completion() from public, anon, authenticated;
revoke all on function public.apply_hairdresser_auto_approval() from public, anon, authenticated;
revoke all on function public.guard_hairdresser_approval_status() from public, anon, authenticated;
revoke all on function public.get_available_slots(uuid, date, uuid[]) from public, anon;
revoke all on function public.create_booking(uuid, uuid[], timestamptz, text, text, double precision, double precision) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
grant execute on function public.get_available_slots(uuid, date, uuid[]) to authenticated;
grant execute on function public.create_booking(uuid, uuid[], timestamptz, text, text, double precision, double precision) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('gallery', 'gallery', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "DONMEN public images are readable"
  on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'gallery'));

create policy "Hairdressers can upload their public images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'gallery')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can update their public images"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'gallery')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.has_role('hairdresser'::public.app_role))
  )
  with check (
    bucket_id in ('avatars', 'gallery')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.has_role('hairdresser'::public.app_role))
  );

create policy "Hairdressers can delete their public images"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'gallery')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.has_role('hairdresser'::public.app_role))
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table public.hairdresser_public_profiles';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.services';
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;

commit;
