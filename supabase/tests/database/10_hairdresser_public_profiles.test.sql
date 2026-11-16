begin;

select plan(4);

select has_table('public', 'hairdresser_public_profiles');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.hairdresser_public_profiles'::regclass),
  'hairdresser public profiles has row level security enabled'
);
select ok(
  exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'hairdresser_public_profiles'
      and policyname = 'Clients can read profiles completed at least 51 percent'
  ),
  'clients can read only profiles at or above the completion threshold'
);
select ok(
  (select is_generated = 'ALWAYS'
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'hairdresser_public_profiles'
     and column_name = 'profile_completion'),
  'profile completion is calculated by the database'
);

select * from finish();

rollback;
