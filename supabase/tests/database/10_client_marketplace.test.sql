begin;

select plan(12);

select has_table('public', 'services');
select has_table('public', 'availabilities');
select has_table('public', 'time_off');
select has_table('public', 'bookings');
select has_table('public', 'booking_items');
select has_table('public', 'booking_addresses');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.bookings'::regclass),
  'bookings has row level security enabled'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and conname = 'bookings_no_hairdresser_overlap'
      and pg_get_constraintdef(oid) like '%EXCLUDE%'
  ),
  'active bookings cannot overlap for the same hairdresser'
);
select ok(
  exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'public_hairdressers'
  ),
  'the client directory is exposed through a public projection'
);
select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'get_available_slots'
  ),
  'available slots are calculated by the database'
);
select ok(
  exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'create_booking'
  )
  and has_function_privilege(
    'authenticated',
    'public.create_booking(uuid, uuid[], timestamp with time zone, text, text, double precision, double precision)',
    'EXECUTE'
  ),
  'authenticated clients can submit booking requests through the server function'
);
select ok(
  not has_table_privilege('authenticated', 'public.bookings', 'INSERT'),
  'clients cannot insert bookings directly'
);

select * from finish();

rollback;
