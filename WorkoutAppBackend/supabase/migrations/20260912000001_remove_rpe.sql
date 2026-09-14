-- Removes RPE (Rate of Perceived Exertion) from the product.
--
-- RPE was collected in three places -- the target on a prescribed exercise, the
-- rating a client gave a finished session, and the weekly average on a check-in
-- -- and it drove one red-flag alert kind. None of it is part of the product
-- any more, so the columns go rather than lingering as storage the app lies
-- about.
--
-- DESTRUCTIVE: stored RPE values and every 'high-rpe' alert are deleted.
--
-- The functions below are re-created without their RPE fields. The two that
-- 20260831000009 switched to SECURITY INVOKER are re-declared as such, because
-- CREATE OR REPLACE takes the security attribute from the new definition and
-- would otherwise quietly hand back the elevation that migration removed.

begin;

-- --- Columns ---------------------------------------------------------------
-- Dropped before the functions are replaced, so the SQL bodies are validated
-- against the new shape rather than the old one.

alter table public.routine_exercises            drop column target_rpe;
alter table public.routine_assignment_exercises drop column target_rpe;
alter table public.workout_logs                 drop column rpe;
alter table public.check_ins                    drop column avg_rpe;

-- --- Alert kind ------------------------------------------------------------
-- Postgres cannot drop a value from an enum in place, so the type is rebuilt
-- and the column re-pointed at it.

delete from public.red_flag_alerts where kind = 'high-rpe';

alter type public.alert_kind rename to alert_kind_old;

create type public.alert_kind as enum
  ('missed-logs', 'weight-stall', 'calorie-deficit-miss', 'check-in-due');

alter table public.red_flag_alerts
  alter column kind type public.alert_kind using kind::text::public.alert_kind;

drop type public.alert_kind_old;

-- --- JSON renderers --------------------------------------------------------

create or replace function public.routine_day_exercises_json(p_day_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.drop_null_keys(jsonb_build_object(
      'id', e.id, 'exerciseId', e.exercise_id, 'name', e.name,
      'muscleGroup', e.muscle_group, 'sets', e.sets,
      'repMin', e.rep_min, 'repMax', e.rep_max,
      'restSeconds', e.rest_seconds,
      'notes', e.notes), array['notes']) order by e.position), '[]'::jsonb)
  from public.routine_exercises e
 where e.routine_day_id = p_day_id;
$$;

create or replace function public.assignment_day_exercises_json(p_day_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.drop_null_keys(jsonb_build_object(
      'id', e.id, 'exerciseId', e.exercise_id, 'name', e.name,
      'muscleGroup', e.muscle_group, 'sets', e.sets,
      'repMin', e.rep_min, 'repMax', e.rep_max,
      'restSeconds', e.rest_seconds,
      'notes', e.notes), array['notes']) order by e.position), '[]'::jsonb)
  from public.routine_assignment_exercises e
 where e.assignment_day_id = p_day_id;
$$;

create or replace function public.workout_log_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.drop_null_keys(jsonb_build_object(
    'id', l.id, 'clientId', l.client_id, 'sessionId', l.session_id,
    'title', l.title, 'date', to_char(l.date, 'YYYY-MM-DD'),
    'durationMinutes', l.duration_minutes,
    'totalVolumeKg', l.total_volume_kg, 'notes', l.notes,
    'completedAt', public.iso(l.completed_at),
    'exercises', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', x.id, 'exerciseId', x.exercise_id, 'name', x.name,
               'muscleGroup', x.muscle_group,
               'sets', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', s.id, 'reps', s.reps,
                          'weightKg', s.weight_kg, 'completed', s.completed)
                        order by s.position)
                   from public.logged_sets s where s.logged_exercise_id = x.id), '[]'::jsonb))
             order by x.position)
        from public.logged_exercises x where x.workout_log_id = l.id), '[]'::jsonb)
  ), array['notes'])
  from public.workout_logs l where l.id = p_id;
$$;

-- --- Write paths -----------------------------------------------------------

/**
 * Materialises a day/exercise tree under either a routine or an assignment.
 * The two shapes are identical by design -- an assignment's custom days are a
 * snapshot of a routine's days -- so one writer serves both and there is no
 * chance of the copy-on-write branch drifting from the template branch.
 */
create or replace function public.write_routine_days(
  p_owner_id text, p_days jsonb, p_assignment boolean)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare
  day      jsonb;
  ex       jsonb;
  day_id   text;
  day_pos  integer := 0;
  ex_pos   integer;
begin
  for day in select * from jsonb_array_elements(public.jsonb_array(p_days)) loop
    ex_pos := 0;
    if p_assignment then
      day_id := public.next_id('ad');
      insert into public.routine_assignment_days
        (id, assignment_id, weekday, name, focus, notes, position)
      values (day_id, p_owner_id, (day->>'weekday')::public.weekday, day->>'name',
              (day->>'focus')::public.muscle_group, day->>'notes', day_pos);
    else
      day_id := public.next_id('rd');
      insert into public.routine_days
        (id, routine_id, weekday, name, focus, notes, position)
      values (day_id, p_owner_id, (day->>'weekday')::public.weekday, day->>'name',
              (day->>'focus')::public.muscle_group, day->>'notes', day_pos);
    end if;

    for ex in select * from jsonb_array_elements(public.jsonb_array(day->'exercises')) loop
      if p_assignment then
        insert into public.routine_assignment_exercises
          (id, assignment_day_id, exercise_id, name, muscle_group, sets,
           rep_min, rep_max, rest_seconds, notes, position)
        values (public.next_id('ax'), day_id, ex->>'exerciseId', ex->>'name',
                (ex->>'muscleGroup')::public.muscle_group, (ex->>'sets')::int,
                (ex->>'repMin')::int, (ex->>'repMax')::int,
                coalesce((ex->>'restSeconds')::int, 90),
                ex->>'notes', ex_pos);
      else
        insert into public.routine_exercises
          (id, routine_day_id, exercise_id, name, muscle_group, sets,
           rep_min, rep_max, rest_seconds, notes, position)
        values (public.next_id('rx'), day_id, ex->>'exerciseId', ex->>'name',
                (ex->>'muscleGroup')::public.muscle_group, (ex->>'sets')::int,
                (ex->>'repMin')::int, (ex->>'repMax')::int,
                coalesce((ex->>'restSeconds')::int, 90),
                ex->>'notes', ex_pos);
      end if;
      ex_pos := ex_pos + 1;
    end loop;
    day_pos := day_pos + 1;
  end loop;
end;
$$;

/**
 * Saves a finished workout: the log, its exercises and every set in one
 * transaction, plus the side effect the mock handler has -- the source session
 * is marked completed. (It used to raise a strain alert at RPE 9+; RPE is gone
 * and the alert with it.)
 *
 * Nested ids are taken from the payload when present: the in-progress workout
 * lives in a Redux draft that already minted them, and keeping them means a
 * retry of the same save cannot produce a second copy of the sets.
 */
create or replace function public.create_workout_log(p_input jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_id      text := coalesce(p_input->>'id', public.next_id('wl'));
  v_client  text := p_input->>'clientId';
  v_session text := p_input->>'sessionId';
  v_title   text := p_input->>'title';
  ex        jsonb;
  st        jsonb;
  ex_id     text;
  ex_pos    integer := 0;
  st_pos    integer;
begin
  perform public.assert_client(v_client);
  if v_session is not null
     and not exists (select 1 from public.workout_sessions where id = v_session) then
    v_session := null;  -- an ad-hoc workout with no scheduled session behind it
  end if;

  insert into public.workout_logs
    (id, client_id, session_id, title, date, duration_minutes,
     total_volume_kg, notes, completed_at)
  values (v_id, v_client, v_session, v_title, (p_input->>'date')::date,
          (p_input->>'durationMinutes')::int,
          coalesce((p_input->>'totalVolumeKg')::numeric, 0),
          p_input->>'notes', coalesce((p_input->>'completedAt')::timestamptz, now()));

  for ex in select * from jsonb_array_elements(public.jsonb_array(p_input->'exercises')) loop
    ex_id := coalesce(ex->>'id', public.next_id('le'));
    insert into public.logged_exercises
      (id, workout_log_id, exercise_id, name, muscle_group, position)
    values (ex_id, v_id, ex->>'exerciseId', ex->>'name',
            (ex->>'muscleGroup')::public.muscle_group, ex_pos);

    st_pos := 0;
    for st in select * from jsonb_array_elements(public.jsonb_array(ex->'sets')) loop
      insert into public.logged_sets (id, logged_exercise_id, position, reps, weight_kg, completed)
      values (coalesce(st->>'id', public.next_id('ls')), ex_id, st_pos,
              (st->>'reps')::int, (st->>'weightKg')::numeric,
              coalesce((st->>'completed')::boolean, true));
      st_pos := st_pos + 1;
    end loop;
    ex_pos := ex_pos + 1;
  end loop;

  if v_session is not null then
    update public.workout_sessions set status = 'completed' where id = v_session;
  end if;

  return public.workout_log_json(v_id);
end;
$$;

-- CREATE OR REPLACE keeps the existing ACL, but 20260831000009 and
-- 20260831000010 left write_routine_days with a deliberately narrow one.
-- Re-asserting it here keeps that intent legible next to the replacement.
revoke execute on function public.write_routine_days(text, jsonb, boolean) from public;
grant  execute on function public.write_routine_days(text, jsonb, boolean) to anon, authenticated;

commit;
