/**
 * One routine per client.
 *
 * By request: "only allow assigning one routine to a client, de-allocate the
 * old one automatically". Assigning is therefore a *swap*, and it is the only
 * way a client changes routine -- there is no unassign in the app, because a
 * client with no routine has nothing to train.
 *
 * `create_assignment` becomes the single writer: it drops whatever the client
 * was following before inserting the new row. `assign_routine` and
 * `create_routine` both route through it rather than inserting themselves, so
 * the rule cannot be bypassed by picking a different entry point, and
 * `unique (client_id)` makes it true even for a write around the RPCs.
 *
 * NOTE: assigning discards the client's customised copy along with the old
 * assignment. That is the honest reading of "de-allocate the old one" -- a
 * customisation belongs to a routine, not to the client.
 *
 * This replaces the never-applied `20260913000004_keep_last_routine.sql`, whose
 * BEFORE DELETE guard would have blocked exactly the de-allocation above. That
 * rule is now structural instead: assigning is the only operation, so a client
 * who has a routine keeps one.
 */

-- Keep each client's newest assignment; drop the rest so the constraint fits.
delete from public.routine_assignments a
 using public.routine_assignments b
 where a.client_id = b.client_id
   and (b.assigned_at, b.id) > (a.assigned_at, a.id);

alter table public.routine_assignments
  add constraint routine_assignments_client_key unique (client_id);

/**
 * Puts one client on one routine. Re-assigning the routine they already follow
 * is a no-op, so it never silently discards a customisation the trainer just
 * made; assigning a *different* routine de-allocates the current one.
 */
create or replace function public.create_assignment(p_routine_id text, p_client_id text)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
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
    delete from public.routine_assignments where client_id = p_client_id;
    v_id := public.next_id('ra');
    insert into public.routine_assignments (id, routine_id, client_id)
    values (v_id, p_routine_id, p_client_id);
  end if;

  return public.assigned_routine_json(v_id);
end;
$$;

/**
 * Adds clients to this routine. Deliberately additive: a client left out of the
 * list is not removed, because that would leave them with no routine at all.
 * Moving someone off means assigning them a different one.
 */
create or replace function public.assign_routine(p_id text, p_client_ids text[])
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_client text;
begin
  if not exists (select 1 from public.routines where id = p_id) then
    raise exception 'Routine % not found', p_id using errcode = 'PT404';
  end if;

  foreach v_client in array coalesce(p_client_ids, '{}') loop
    perform public.create_assignment(p_id, v_client);
  end loop;

  update public.routines set updated_at = now() where id = p_id;
  return public.routine_json(p_id);
end;
$$;

/** Same writer for a routine created with clients already ticked. */
create or replace function public.create_routine(p_input jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_id      text := public.next_id('rt');
  v_title   text := nullif(btrim(p_input->>'title'), '');
  v_trainer text := coalesce(p_input->>'trainerId', (select id from public.trainer_profiles limit 1));
  v_client  text;
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
    perform public.create_assignment(v_id, v_client);
  end loop;

  return public.routine_json(v_id);
end;
$$;
