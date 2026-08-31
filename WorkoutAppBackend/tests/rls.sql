-- Applies supabase/future/20260901000001_auth_rls.sql.pending, checks what each
-- role can see, and rolls back. Safe to run against the live project: the final
-- RAISE guarantees the transaction cannot commit even if something above it
-- succeeded unexpectedly.
--
-- Run it through the SQL editor, or `psql "$DATABASE_URL" -f tests/rls.sql`.
-- Paste the policy file's body where marked -- it is kept in one place rather
-- than duplicated here so the tested text and the deployable text cannot drift.

begin;

\i ../supabase/future/20260901000001_auth_rls.sql.pending

do $$
declare
  maya uuid := (select auth_user_id from public.users where id = 't-001');
  adi  uuid := (select auth_user_id from public.users where id = 'c-001');
  leah uuid := (select auth_user_id from public.users where id = 'c-002');
  r    jsonb := '{}'::jsonb;
begin
  execute 'set local role authenticated';

  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'trainer_app_user_id', public.app_user_id(),
    'trainer_role',        public.app_role(),
    'trainer_clients',     (select count(*) from public.client_profiles),
    'trainer_logs',        (select count(*) from public.workout_logs),
    'trainer_logged_sets', (select count(*) from public.logged_sets),
    'trainer_threads',     (select count(*) from public.threads),
    'trainer_messages',    (select count(*) from public.messages),
    'trainer_nutrition',   (select count(*) from public.nutrition_days),
    'trainer_exercises',   (select count(*) from public.exercises),
    'trainer_users',       (select count(*) from public.users));

  perform set_config('request.jwt.claims', json_build_object('sub', adi, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'c1_app_user_id',       public.app_user_id(),
    'c1_clients',           (select count(*) from public.client_profiles),
    'c1_logs',              (select count(*) from public.workout_logs),
    'c1_other_logs',        (select count(*) from public.workout_logs where client_id <> 'c-001'),
    'c1_logged_sets',       (select count(*) from public.logged_sets),
    'c1_threads',           (select count(*) from public.threads),
    'c1_messages',          (select count(*) from public.messages),
    'c1_nutrition',         (select count(*) from public.nutrition_days),
    'c1_metrics',           (select count(*) from public.body_metrics),
    'c1_habits',            (select count(*) from public.habits),
    'c1_habit_completions', (select count(*) from public.habit_completions),
    'c1_exercises',         (select count(*) from public.exercises),
    'c1_users',             (select count(*) from public.users),
    'c1_trainer_profiles',  (select count(*) from public.trainer_profiles));

  perform set_config('request.jwt.claims', json_build_object('sub', leah, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'c2_logs',         (select count(*) from public.workout_logs),
    'c2_sees_c1_logs', (select count(*) from public.workout_logs where client_id = 'c-001'),
    'c2_threads',      (select count(*) from public.threads));

  execute 'set local role anon';
  perform set_config('request.jwt.claims', '', true);
  r := r || jsonb_build_object(
    'anon_clients',   (select count(*) from public.client_profiles),
    'anon_logs',      (select count(*) from public.workout_logs),
    'anon_exercises', (select count(*) from public.exercises),
    'anon_messages',  (select count(*) from public.messages));

  execute 'reset role';
  raise exception 'REPORT %', r;
end $$;

rollback;
