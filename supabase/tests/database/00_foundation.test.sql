begin;

select plan(6);

select has_table('public', 'profiles');
select has_table('public', 'user_roles');
select has_table('public', 'auth_attempts');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has row level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass),
  'user_roles has row level security enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.auth_attempts'::regclass),
  'auth_attempts has row level security enabled'
);

select * from finish();

rollback;
