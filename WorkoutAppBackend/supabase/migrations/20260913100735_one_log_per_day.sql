/**
 * One workout log per client per day.
 *
 * By request: a client cannot log a second workout for a day, but can edit the
 * one they logged. So "save" became "save today's workout" -- `create_workout_log`
 * replaces the day's log rather than adding another, and the unique constraint
 * makes that the only reachable shape even if something writes around the RPC.
 *
 * The replacement keeps the existing log's id, so a link to it (history rows,
 * the log detail screen) still resolves after an edit. Child rows go with the
 * old row through `on delete cascade` and are re-inserted from the payload.
 *
 * The dead session branch is dropped here too: training comes from routines now
 * and nothing sends `sessionId`. The column stays for the seeded rows.
 */

alter table public.workout_logs
  add constraint workout_logs_client_date_key unique (client_id, date);

create or replace function public.create_workout_log(p_input jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_client   text := p_input->>'clientId';
  v_date     date := (p_input->>'date')::date;
  v_title    text := p_input->>'title';
  v_existing text;
  v_id       text;
  ex         jsonb;
  st         jsonb;
  ex_id      text;
  ex_pos     integer := 0;
  st_pos     integer;
begin
  perform public.assert_client(v_client);

  -- Editing today's workout is a replace: same id, children cascade away.
  select id into v_existing from public.workout_logs
   where client_id = v_client and date = v_date;

  v_id := coalesce(v_existing, p_input->>'id', public.next_id('wl'));
  if v_existing is not null then
    delete from public.workout_logs where id = v_existing;
  end if;

  insert into public.workout_logs
    (id, client_id, title, date, duration_minutes,
     total_volume_kg, notes, completed_at)
  values (v_id, v_client, v_title, v_date,
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

  return public.workout_log_json(v_id);
end;
$$;
