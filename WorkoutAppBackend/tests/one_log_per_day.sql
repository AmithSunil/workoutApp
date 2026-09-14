-- Guard check for 20260913000005_one_log_per_day.sql: saving twice for the same
-- day edits the day's log in place instead of adding a second one.
--
-- Runs against the project itself (it uses a real client id and a far-future
-- date, then deletes what it wrote). Silence is failure; one notice is a pass.
--
--   psql "$DATABASE_URL" -f tests/one_log_per_day.sql
\set ON_ERROR_STOP on

do $$
declare a jsonb; b jsonb; v_client text; v_date text := '2099-01-01';
begin
  select id into v_client from public.client_profiles limit 1;

  a := public.create_workout_log(jsonb_build_object(
        'clientId', v_client, 'title', 'Legs', 'date', v_date, 'durationMinutes', 40,
        'totalVolumeKg', 1000,
        'exercises', jsonb_build_array(jsonb_build_object(
          'exerciseId','e-001','name','Barbell Back Squat','muscleGroup','legs',
          'sets', jsonb_build_array(jsonb_build_object('reps',8,'weightKg',60,'completed',true))))));

  b := public.create_workout_log(jsonb_build_object(
        'clientId', v_client, 'title', 'Legs (edited)', 'date', v_date, 'durationMinutes', 55,
        'totalVolumeKg', 1500,
        'exercises', jsonb_build_array(jsonb_build_object(
          'exerciseId','e-001','name','Barbell Back Squat','muscleGroup','legs',
          'sets', jsonb_build_array(
            jsonb_build_object('reps',8,'weightKg',60,'completed',true),
            jsonb_build_object('reps',8,'weightKg',65,'completed',true))))));

  assert a->>'id' = b->>'id', 'the id changed on edit -- links to the log would break';
  assert b->>'title' = 'Legs (edited)', 'title not updated';
  assert jsonb_array_length(b->'exercises'->0->'sets') = 2, 'sets not replaced';
  assert (select count(*) from public.workout_logs
           where client_id = v_client and date = v_date::date) = 1, 'two logs for one day';
  assert (select count(*) from public.logged_sets s
            join public.logged_exercises x on x.id = s.logged_exercise_id
           where x.workout_log_id = (b->>'id')) = 2, 'orphan sets left behind';

  delete from public.workout_logs where id = b->>'id';
  raise notice 'PASS: one log per day, edited in place';
end $$;
