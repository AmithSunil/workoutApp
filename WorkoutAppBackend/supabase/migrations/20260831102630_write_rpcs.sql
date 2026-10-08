-- Write RPCs.
--
-- Everything here is a write that spans more than one table. PostgREST can do
-- single-table inserts perfectly well, so those stay as plain REST calls; what
-- it cannot do is put a workout log and its exercises and its sets into one
-- transaction, which is exactly where a mobile client on a flaky connection
-- leaves half-written rows behind. Each function mirrors one handler in
-- `src/api/handlers.ts`, takes the same body, and returns the same domain shape,
-- so swapping the transport does not change anything above `src/api/*`.
--
-- Error mapping: PostgREST turns SQLSTATE P0001 (a bare `raise exception`) into
-- 400 and the `PTxxx` convention into that status, so `PT404` reproduces the
-- mock's 404s and the default reproduces its 400s.

-- ---------------------------------------------------------------------------
-- Shared internals
-- ---------------------------------------------------------------------------

/** A JSON null, a missing key and a non-array all mean "no items here". */
create function public.jsonb_array(v jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'array' then v else '[]'::jsonb end;
$$;

create function public.assert_client(p_client_id text)
returns void language plpgsql stable set search_path = '' as $$
begin
  if not exists (select 1 from public.client_profiles where id = p_client_id) then
    raise exception 'Client % not found', p_client_id using errcode = 'PT404';
  end if;
end;
$$;

/** Same rules the builder enforces client-side, restated where they bind. */
create function public.validate_routine_days(p_days jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare
  seen text[] := '{}';
  day  jsonb;
begin
  if p_days is null or jsonb_typeof(p_days) <> 'array' or jsonb_array_length(p_days) = 0 then
    raise exception 'A routine needs at least one training day';
  end if;
  for day in select * from jsonb_array_elements(public.jsonb_array(p_days)) loop
    if day->>'weekday' = any (seen) then
      raise exception 'Two training days are both set to %', day->>'weekday';
    end if;
    seen := seen || (day->>'weekday');
    if coalesce(jsonb_array_length(day->'exercises'), 0) = 0 then
      raise exception 'Every training day needs at least one exercise';
    end if;
  end loop;
end;
$$;

/**
 * Materialises a day/exercise tree under either a routine or an assignment.
 * The two shapes are identical by design -- an assignment's custom days are a
 * snapshot of a routine's days -- so one writer serves both and there is no
 * chance of the copy-on-write branch drifting from the template branch.
 */
create function public.write_routine_days(
  p_owner_id text, p_days jsonb, p_assignment boolean)
returns void language plpgsql volatile security definer set search_path = '' as $$
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
           rep_min, rep_max, rest_seconds, target_rpe, notes, position)
        values (public.next_id('ax'), day_id, ex->>'exerciseId', ex->>'name',
                (ex->>'muscleGroup')::public.muscle_group, (ex->>'sets')::int,
                (ex->>'repMin')::int, (ex->>'repMax')::int,
                coalesce((ex->>'restSeconds')::int, 90), (ex->>'targetRpe')::numeric,
                ex->>'notes', ex_pos);
      else
        insert into public.routine_exercises
          (id, routine_day_id, exercise_id, name, muscle_group, sets,
           rep_min, rep_max, rest_seconds, target_rpe, notes, position)
        values (public.next_id('rx'), day_id, ex->>'exerciseId', ex->>'name',
                (ex->>'muscleGroup')::public.muscle_group, (ex->>'sets')::int,
                (ex->>'repMin')::int, (ex->>'repMax')::int,
                coalesce((ex->>'restSeconds')::int, 90), (ex->>'targetRpe')::numeric,
                ex->>'notes', ex_pos);
      end if;
      ex_pos := ex_pos + 1;
    end loop;
    day_pos := day_pos + 1;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Routines
-- ---------------------------------------------------------------------------

create function public.create_routine(p_input jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id       text := public.next_id('rt');
  v_title    text := nullif(btrim(p_input->>'title'), '');
  v_trainer  text := coalesce(p_input->>'trainerId', (select id from public.trainer_profiles limit 1));
  v_client   text;
begin
  if v_title is null then raise exception 'A routine needs a title'; end if;
  perform public.validate_routine_days(p_input->'days');

  for v_client in select jsonb_array_elements_text(public.jsonb_array(p_input->'assignedClientIds')) loop
    perform public.assert_client(v_client);
  end loop;

  insert into public.routines (id, trainer_id, title, notes)
  values (v_id, v_trainer, v_title, nullif(btrim(coalesce(p_input->>'notes', '')), ''));

  perform public.write_routine_days(v_id, p_input->'days', false);

  -- Distinct, so a repeated id in the payload cannot trip the unique constraint.
  for v_client in
    select distinct jsonb_array_elements_text(public.jsonb_array(p_input->'assignedClientIds'))
  loop
    insert into public.routine_assignments (id, routine_id, client_id)
    values (public.next_id('ra'), v_id, v_client);
  end loop;

  return public.routine_json(v_id);
end;
$$;

/**
 * Patch semantics: a key absent from p_patch is left alone, which is why this
 * takes the whole body rather than one nullable argument per column.
 *
 * Replacing `days` re-mints ids and only moves clients still following the
 * template -- a customised assignment holds its own snapshot and is untouched.
 */
create function public.update_routine(p_id text, p_patch jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_title text;
begin
  if not exists (select 1 from public.routines where id = p_id) then
    raise exception 'Routine % not found', p_id using errcode = 'PT404';
  end if;

  if p_patch ? 'title' then
    v_title := nullif(btrim(p_patch->>'title'), '');
    if v_title is null then raise exception 'A routine needs a title'; end if;
    update public.routines set title = v_title where id = p_id;
  end if;

  if p_patch ? 'notes' then
    update public.routines set notes = nullif(btrim(coalesce(p_patch->>'notes','')), '') where id = p_id;
  end if;

  if p_patch ? 'days' then
    perform public.validate_routine_days(p_patch->'days');
    delete from public.routine_days where routine_id = p_id;  -- cascades to exercises
    perform public.write_routine_days(p_id, p_patch->'days', false);
  end if;

  update public.routines set updated_at = now() where id = p_id;
  return public.routine_json(p_id);
end;
$$;

/**
 * Sets the routine's client list to exactly p_client_ids.
 *
 * Rows already present are left alone rather than deleted and recreated, so an
 * existing customisation survives an edit to the client list. Unknown clients
 * abort the whole call instead of being dropped silently.
 */
create function public.assign_routine(p_id text, p_client_ids text[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_client text;
begin
  if not exists (select 1 from public.routines where id = p_id) then
    raise exception 'Routine % not found', p_id using errcode = 'PT404';
  end if;
  foreach v_client in array coalesce(p_client_ids, '{}') loop
    perform public.assert_client(v_client);
  end loop;

  delete from public.routine_assignments
   where routine_id = p_id and not (client_id = any (coalesce(p_client_ids, '{}')));

  insert into public.routine_assignments (id, routine_id, client_id)
  select public.next_id('ra'), p_id, c
    from unnest(coalesce(p_client_ids, '{}')) as c
   where not exists (select 1 from public.routine_assignments a
                      where a.routine_id = p_id and a.client_id = c);

  update public.routines set updated_at = now() where id = p_id;
  return public.routine_json(p_id);
end;
$$;

/** A copy starts unassigned -- duplicating is for editing, not re-issuing. */
create function public.duplicate_routine(p_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_new text := public.next_id('rt');
  v_src public.routines;
begin
  select * into v_src from public.routines where id = p_id;
  if not found then
    raise exception 'Routine % not found', p_id using errcode = 'PT404';
  end if;

  insert into public.routines (id, trainer_id, title, notes)
  values (v_new, v_src.trainer_id, v_src.title || ' (copy)', v_src.notes);

  perform public.write_routine_days(v_new, public.routine_days_json(p_id), false);
  return public.routine_json(v_new);
end;
$$;

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------

/** Re-assigning an existing pairing is a no-op, never a reset of a customisation. */
create function public.create_assignment(p_routine_id text, p_client_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text;
begin
  if not exists (select 1 from public.routines where id = p_routine_id) then
    raise exception 'Routine % not found', p_routine_id using errcode = 'PT404';
  end if;
  perform public.assert_client(p_client_id);

  select id into v_id from public.routine_assignments
   where routine_id = p_routine_id and client_id = p_client_id;

  if v_id is null then
    v_id := public.next_id('ra');
    insert into public.routine_assignments (id, routine_id, client_id)
    values (v_id, p_routine_id, p_client_id);
  end if;

  return public.assigned_routine_json(v_id);
end;
$$;

/**
 * The copy-on-write fork. The first call snapshots the days onto the
 * assignment and flips `customised`; every later call replaces that snapshot.
 * From here the template no longer reaches this client, which is the point --
 * one client's adjustment must never leak to the others.
 */
create function public.customise_assignment(p_id text, p_days jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.routine_assignments where id = p_id) then
    raise exception 'Assignment % not found', p_id using errcode = 'PT404';
  end if;
  perform public.validate_routine_days(p_days);

  delete from public.routine_assignment_days where assignment_id = p_id;
  perform public.write_routine_days(p_id, p_days, true);

  update public.routine_assignments
     set customised = true, updated_at = now()
   where id = p_id;

  return public.assigned_routine_json(p_id);
end;
$$;

create function public.reset_assignment(p_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.routine_assignments where id = p_id) then
    raise exception 'Assignment % not found', p_id using errcode = 'PT404';
  end if;
  delete from public.routine_assignment_days where assignment_id = p_id;
  update public.routine_assignments
     set customised = false, updated_at = now()
   where id = p_id;
  return public.assigned_routine_json(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Training
-- ---------------------------------------------------------------------------

create function public.create_workout_session(p_input jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id     text;
  v_client text := p_input->>'clientId';
  ex       jsonb;
  st       jsonb;
  ex_id    text;
  ex_pos   integer := 0;
  st_pos   integer;
begin
  perform public.assert_client(v_client);
  -- Sessions are one per client per day, so the id is derivable rather than minted.
  v_id := coalesce(p_input->>'id', 'ws-' || v_client || '-' || (p_input->>'scheduledFor'));

  insert into public.workout_sessions
    (id, client_id, title, scheduled_for, estimated_minutes, focus, status)
  values (v_id, v_client, p_input->>'title', (p_input->>'scheduledFor')::date,
          coalesce((p_input->>'estimatedMinutes')::int, 60),
          (p_input->>'focus')::public.muscle_group,
          coalesce((p_input->>'status')::public.session_status, 'scheduled'));

  for ex in select * from jsonb_array_elements(public.jsonb_array(p_input->'exercises')) loop
    ex_id := coalesce(ex->>'id', public.next_id('pe'));
    insert into public.session_exercises
      (id, session_id, exercise_id, name, muscle_group, notes, position)
    values (ex_id, v_id, ex->>'exerciseId', ex->>'name',
            (ex->>'muscleGroup')::public.muscle_group, ex->>'notes', ex_pos);

    st_pos := 0;
    for st in select * from jsonb_array_elements(public.jsonb_array(ex->'sets')) loop
      insert into public.prescribed_sets (session_exercise_id, position, reps, target_weight_kg)
      values (ex_id, st_pos, (st->>'reps')::int, (st->>'targetWeightKg')::numeric);
      st_pos := st_pos + 1;
    end loop;
    ex_pos := ex_pos + 1;
  end loop;

  return public.workout_session_json(v_id);
end;
$$;

/**
 * Saves a finished workout: the log, its exercises and every set in one
 * transaction, plus the two side effects the mock handler has -- the source
 * session is marked completed, and a session logged at RPE 9+ raises a strain
 * alert the trainer sees immediately.
 *
 * Nested ids are taken from the payload when present: the in-progress workout
 * lives in a Redux draft that already minted them, and keeping them means a
 * retry of the same save cannot produce a second copy of the sets.
 */
create function public.create_workout_log(p_input jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id      text := coalesce(p_input->>'id', public.next_id('wl'));
  v_client  text := p_input->>'clientId';
  v_session text := p_input->>'sessionId';
  v_rpe     numeric := (p_input->>'rpe')::numeric;
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
    (id, client_id, session_id, title, date, duration_minutes, rpe,
     total_volume_kg, notes, completed_at)
  values (v_id, v_client, v_session, v_title, (p_input->>'date')::date,
          (p_input->>'durationMinutes')::int, v_rpe,
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

  if v_rpe >= 9 then
    insert into public.red_flag_alerts (id, client_id, kind, severity, title, detail)
    values (public.next_id('al'), v_client, 'high-rpe', 'warning',
            'RPE ' || rtrim(rtrim(v_rpe::text, '0'), '.') || ' on ' || v_title,
            'Logged above the prescribed intensity -- review before the next session.');
  end if;

  return public.workout_log_json(v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Nutrition
-- ---------------------------------------------------------------------------

/**
 * A nutrition day is created on first read, not on first write, because the
 * day view opens before anything is logged. Targets are copied from the client
 * as they stand today so a later change to their macros cannot rewrite what
 * they were asked to hit months ago.
 */
create function public.get_or_create_nutrition_day(p_client_id text, p_date date)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  perform public.assert_client(p_client_id);
  insert into public.nutrition_days
    (id, client_id, date, target_calories, target_protein, target_carbs, target_fat)
  select 'nd-' || p_client_id || '-' || to_char(p_date, 'YYYY-MM-DD'),
         p_client_id, p_date, c.target_calories, c.target_protein, c.target_carbs, c.target_fat
    from public.client_profiles c where c.id = p_client_id
  on conflict (client_id, date) do nothing;

  return public.nutrition_day_json(p_client_id, p_date);
end;
$$;

/** Takes an array so the AI parser can commit a whole meal atomically. */
create function public.add_food_entries(p_entries jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  e         jsonb;
  v_client  text;
  v_date    date;
begin
  if p_entries is null or jsonb_array_length(p_entries) = 0 then
    raise exception 'No entries supplied';
  end if;

  for e in select * from jsonb_array_elements(p_entries) loop
    v_client := e->>'clientId';
    v_date   := (e->>'date')::date;
    perform public.get_or_create_nutrition_day(v_client, v_date);

    insert into public.food_entries
      (id, nutrition_day_id, client_id, date, slot, food_id, name, servings,
       calories, protein, carbs, fat, source, logged_at)
    values (coalesce(e->>'id', public.next_id('fe')),
            'nd-' || v_client || '-' || to_char(v_date, 'YYYY-MM-DD'),
            v_client, v_date, (e->>'slot')::public.meal_slot, e->>'foodId', e->>'name',
            (e->>'servings')::numeric, (e->>'calories')::int, (e->>'protein')::int,
            (e->>'carbs')::int, (e->>'fat')::int,
            coalesce((e->>'source')::public.food_entry_source, 'search'),
            coalesce((e->>'loggedAt')::timestamptz, now()));
  end loop;

  -- The day the last entry landed on is the one the screen is showing.
  return public.nutrition_day_json(v_client, v_date);
end;
$$;

create function public.delete_food_entry(p_id text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_client text;
  v_date   date;
begin
  delete from public.food_entries where id = p_id
  returning client_id, date into v_client, v_date;
  if v_client is null then
    raise exception 'Entry % not found', p_id using errcode = 'PT404';
  end if;
  return public.nutrition_day_json(v_client, v_date);
end;
$$;

-- ---------------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------------

create function public.habit_json(p_id text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', h.id, 'clientId', h.client_id, 'title', h.title, 'icon', h.icon,
    'cadence', h.cadence, 'createdBy', h.created_by,
    'completedDates', coalesce((
      select jsonb_agg(to_char(c.date, 'YYYY-MM-DD') order by c.date)
        from public.habit_completions c where c.habit_id = h.id), '[]'::jsonb))
  from public.habits h where h.id = p_id;
$$;

/** Ticking a habit is an insert, unticking a delete -- never a rewritten array. */
create function public.toggle_habit(p_id text, p_date date)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.habits where id = p_id) then
    raise exception 'Habit % not found', p_id using errcode = 'PT404';
  end if;
  if exists (select 1 from public.habit_completions where habit_id = p_id and date = p_date) then
    delete from public.habit_completions where habit_id = p_id and date = p_date;
  else
    insert into public.habit_completions (habit_id, date) values (p_id, p_date);
  end if;
  return public.habit_json(p_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------

/**
 * Unread counts, the other half of plan section 7.3. Sending increments the
 * recipient's counter here rather than in the client, so a message sent from
 * one device is unread on every other.
 */
create function public.bump_thread_unread()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_trainer text;
begin
  select trainer_id into v_trainer from public.threads where id = new.thread_id;
  if new.sender_id = v_trainer then
    update public.threads set unread_for_client = unread_for_client + 1 where id = new.thread_id;
  else
    update public.threads set unread_for_trainer = unread_for_trainer + 1 where id = new.thread_id;
  end if;
  return null;
end;
$$;

create trigger messages_bump_unread
after insert on messages
for each row execute function public.bump_thread_unread();

revoke execute on function public.bump_thread_unread() from public;

create function public.mark_thread_read(p_thread_id text, p_as text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_trainer text;
  v_row     public.threads;
begin
  select trainer_id into v_trainer from public.threads where id = p_thread_id;
  if v_trainer is null then
    raise exception 'Thread % not found', p_thread_id using errcode = 'PT404';
  end if;
  if p_as not in ('trainer', 'client') then
    raise exception 'Unknown reader %', p_as;
  end if;

  -- Stamp the messages too: the counter is a convenience, read_at is the record.
  update public.messages
     set read_at = now()
   where thread_id = p_thread_id
     and read_at is null
     and ((p_as = 'trainer' and sender_id <> v_trainer)
       or (p_as = 'client'  and sender_id =  v_trainer));

  update public.threads
     set unread_for_trainer = case when p_as = 'trainer' then 0 else unread_for_trainer end,
         unread_for_client  = case when p_as = 'client'  then 0 else unread_for_client  end
   where id = p_thread_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id, 'clientId', v_row.client_id, 'trainerId', v_row.trainer_id,
    'lastMessagePreview', v_row.last_message_preview,
    'lastMessageAt', public.iso(v_row.last_message_at),
    'unreadForTrainer', v_row.unread_for_trainer,
    'unreadForClient', v_row.unread_for_client);
end;
$$;

-- Internals are not part of the API surface.
revoke execute on function public.write_routine_days(text, jsonb, boolean) from public;
revoke execute on function public.assert_client(text) from public;
