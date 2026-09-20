-- A client can have no coach.
--
-- An "individual" -- someone using the app on their own -- is a client row with
-- trainer_id null. Not a third role, not a self-coaching trainer row: every
-- client screen, log, weigh-in and habit already hangs off client_profiles, and
-- a null coach is the smallest change that makes all of it reachable without one.
--
-- The foreign key and `on delete restrict` stay: restrict still means a coach
-- with clients cannot be deleted. Only the not-null goes.
--
-- REVERTING needs trainer_id backfilled for every account created as an
-- individual; there is no coach to guess, so pick one before re-adding the
-- constraint. See tasks/signup-plan.md (S1).

alter table public.client_profiles alter column trainer_id drop not null;
alter table public.routines        alter column trainer_id drop not null;

comment on column public.client_profiles.trainer_id is
  'The coach who owns this client. Null means an individual training on their own.';
comment on column public.routines.trainer_id is
  'The coach who owns this routine. Null when an individual wrote it for themselves -- '
  'author_id (20260915000003) is what carries ownership in that case.';

/**
 * Same writer as 20260915000001; only the trainer fallback changes.
 *
 * It used to be `(select id from public.trainer_profiles limit 1)` -- which
 * under RLS means "whichever coach this caller can see", and for an individual
 * that is either nobody or an arbitrary stranger. Now a routine gets a null
 * trainer by intent, and only a caller who actually is a coach gets themselves.
 *
 * `create or replace` takes the security attribute from the new definition, so
 * `security invoker` is re-declared here on purpose (project memory backend_schema).
 */
create or replace function public.create_routine(p_input jsonb)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_id      text := public.next_id('rt');
  v_title   text := nullif(btrim(p_input->>'title'), '');
  v_trainer text := coalesce(p_input->>'trainerId',
                             case when public.app_role() = 'trainer' then public.app_user_id() end);
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
