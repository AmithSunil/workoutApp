-- Id minting and domain-shape renderers.
--
-- Two problems this file solves for the RPCs in the next migration:
--
--   1. Ids are prefixed text (`wl-00144`), not UUIDs, so new rows need a
--      server-side minter that continues the seeded sequence per prefix.
--   2. The frontend consumes camelCase nested objects (`src/types/models.ts`),
--      while the schema is snake_case and flat. Every write RPC has to return
--      the domain shape, so the renderers live here once rather than being
--      re-spelled in each function.

-- ---------------------------------------------------------------------------
-- Id minting
-- ---------------------------------------------------------------------------

create table id_sequences (
  prefix      text primary key,
  width       integer not null,
  last_value  bigint not null default 0
);

comment on table id_sequences is
  'Per-prefix counters for the text primary keys. Seeded from the highest '
  'numeric suffix already present so minted ids can never collide with fixtures.';

insert into id_sequences (prefix, width) values
  ('rt',4), ('rd',4), ('rx',4), ('ra',4), ('ad',4), ('ax',4),
  ('fe',5), ('wl',5), ('le',5), ('ls',6), ('pe',5),
  ('al',4), ('h',4), ('bm',5), ('pp',5), ('m',5), ('ci',4);

-- Advance each counter past whatever the seed already used.
do $$
declare
  m record;
begin
  for m in
    select * from (values
      ('fe','food_entries'), ('wl','workout_logs'), ('le','logged_exercises'),
      ('ls','logged_sets'), ('pe','session_exercises'), ('al','red_flag_alerts'),
      ('h','habits'), ('bm','body_metrics'), ('pp','progress_photos'),
      ('m','messages'), ('ci','check_ins')
    ) as t(prefix, tbl)
  loop
    execute format(
      'update id_sequences s set last_value = greatest(s.last_value, coalesce('
      '  (select max((regexp_match(id, ''^%s-(\d+)$''))[1]::bigint) from public.%I), 0))'
      ' where s.prefix = %L',
      m.prefix, m.tbl, m.prefix);
  end loop;
end;
$$;

create function public.next_id(p_prefix text)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  update public.id_sequences
     set last_value = last_value + 1
   where prefix = p_prefix
  returning prefix || '-' || lpad(last_value::text, width, '0');
$$;

revoke execute on function public.next_id(text) from public;

-- ---------------------------------------------------------------------------
-- Rendering helpers
-- ---------------------------------------------------------------------------

-- The domain types mark several fields optional (`notes?: string`) rather than
-- nullable, so a null has to disappear from the object entirely instead of
-- serialising as null. Blanket jsonb_strip_nulls would be wrong -- `sessionId`,
-- `readAt` and `targetWeightKg` are genuinely `T | null` -- so callers name the
-- keys that are optional.
create function public.drop_null_keys(obj jsonb, keys text[])
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select jsonb_object_agg(k, v)
       from jsonb_each(obj) as e(k, v)
      where not (k = any(keys) and v = 'null'::jsonb)),
    '{}'::jsonb);
$$;

/** ISO 8601 with milliseconds and a Z, matching what the app already stores. */
create function public.iso(ts timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select to_char(ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- --- Routine ---------------------------------------------------------------

create function public.routine_day_exercises_json(p_day_id text)
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
      'restSeconds', e.rest_seconds, 'targetRpe', e.target_rpe,
      'notes', e.notes), array['notes']) order by e.position), '[]'::jsonb)
  from public.routine_exercises e
 where e.routine_day_id = p_day_id;
$$;

create function public.assignment_day_exercises_json(p_day_id text)
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
      'restSeconds', e.rest_seconds, 'targetRpe', e.target_rpe,
      'notes', e.notes), array['notes']) order by e.position), '[]'::jsonb)
  from public.routine_assignment_exercises e
 where e.assignment_day_id = p_day_id;
$$;

/** Days of a routine template, Monday-first (the weekday enum's own order). */
create function public.routine_days_json(p_routine_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.drop_null_keys(jsonb_build_object(
      'id', d.id, 'weekday', d.weekday, 'name', d.name, 'focus', d.focus,
      'notes', d.notes, 'exercises', public.routine_day_exercises_json(d.id)
    ), array['name','notes']) order by d.weekday), '[]'::jsonb)
  from public.routine_days d
 where d.routine_id = p_routine_id;
$$;

/** The client's own snapshot, once they have been forked off the template. */
create function public.assignment_days_json(p_assignment_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
    public.drop_null_keys(jsonb_build_object(
      'id', d.id, 'weekday', d.weekday, 'name', d.name, 'focus', d.focus,
      'notes', d.notes, 'exercises', public.assignment_day_exercises_json(d.id)
    ), array['name','notes']) order by d.weekday), '[]'::jsonb)
  from public.routine_assignment_days d
 where d.assignment_id = p_assignment_id;
$$;

create function public.routine_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.drop_null_keys(jsonb_build_object(
    'id', r.id,
    'trainerId', r.trainer_id,
    'title', r.title,
    'notes', r.notes,
    'days', public.routine_days_json(r.id),
    -- Assignment membership is the source of truth; this is derived on read so
    -- the two can never drift.
    'assignedClientIds', coalesce(
      (select jsonb_agg(a.client_id order by a.assigned_at desc)
         from public.routine_assignments a where a.routine_id = r.id), '[]'::jsonb),
    'createdAt', public.iso(r.created_at),
    'updatedAt', public.iso(r.updated_at)
  ), array['notes'])
  from public.routines r where r.id = p_id;
$$;

/** A routine resolved for one client -- the customised copy when there is one. */
create function public.assigned_routine_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.drop_null_keys(jsonb_build_object(
    'assignmentId', a.id,
    'routineId', r.id,
    'clientId', a.client_id,
    'title', r.title,
    'notes', r.notes,
    'days', case when a.customised
                 then public.assignment_days_json(a.id)
                 else public.routine_days_json(r.id) end,
    'customised', a.customised,
    'assignedAt', public.iso(a.assigned_at)
  ), array['notes'])
  from public.routine_assignments a
  join public.routines r on r.id = a.routine_id
 where a.id = p_id;
$$;

-- --- Training --------------------------------------------------------------

create function public.workout_log_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.drop_null_keys(jsonb_build_object(
    'id', l.id, 'clientId', l.client_id, 'sessionId', l.session_id,
    'title', l.title, 'date', to_char(l.date, 'YYYY-MM-DD'),
    'durationMinutes', l.duration_minutes, 'rpe', l.rpe,
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

create function public.workout_session_json(p_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', s.id, 'clientId', s.client_id, 'title', s.title,
    'scheduledFor', to_char(s.scheduled_for, 'YYYY-MM-DD'),
    'estimatedMinutes', s.estimated_minutes, 'focus', s.focus, 'status', s.status,
    'exercises', coalesce((
      select jsonb_agg(public.drop_null_keys(jsonb_build_object(
               'id', x.id, 'exerciseId', x.exercise_id, 'name', x.name,
               'muscleGroup', x.muscle_group, 'notes', x.notes,
               'sets', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'reps', p.reps, 'targetWeightKg', p.target_weight_kg)
                        order by p.position)
                   from public.prescribed_sets p where p.session_exercise_id = x.id), '[]'::jsonb)
             ), array['notes']) order by x.position)
        from public.session_exercises x where x.session_id = s.id), '[]'::jsonb)
  )
  from public.workout_sessions s where s.id = p_id;
$$;

-- --- Nutrition -------------------------------------------------------------

create function public.nutrition_day_json(p_client_id text, p_date date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'date', to_char(d.date, 'YYYY-MM-DD'),
    'clientId', d.client_id,
    'targets', jsonb_build_object('calories', d.target_calories, 'protein', d.target_protein,
                                  'carbs', d.target_carbs, 'fat', d.target_fat),
    'consumed', jsonb_build_object('calories', d.consumed_calories, 'protein', d.consumed_protein,
                                   'carbs', d.consumed_carbs, 'fat', d.consumed_fat),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', e.id, 'clientId', e.client_id,
               'date', to_char(e.date, 'YYYY-MM-DD'), 'slot', e.slot,
               'foodId', e.food_id, 'name', e.name, 'servings', e.servings,
               'calories', e.calories, 'protein', e.protein, 'carbs', e.carbs,
               'fat', e.fat, 'source', e.source, 'loggedAt', public.iso(e.logged_at))
             order by e.logged_at)
        from public.food_entries e where e.nutrition_day_id = d.id), '[]'::jsonb)
  )
  from public.nutrition_days d
 where d.client_id = p_client_id and d.date = p_date;
$$;
