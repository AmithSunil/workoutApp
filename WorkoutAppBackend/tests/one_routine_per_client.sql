-- Guard check for 20260915000001_one_routine_per_client.sql: assigning swaps,
-- re-assigning is a no-op, and leaving a client out of the tick list does not
-- strand them. Runs against the project and puts the client back where it
-- found them. Silence is failure; two notices are a pass.
--
--   psql "$DATABASE_URL" -f tests/one_routine_per_client.sql
\set ON_ERROR_STOP on

do $$
declare
  v_client text;
  v_from   text;
  v_to     text;
  v_first  jsonb;
begin
  -- A client who already follows something, and a different routine to move to.
  select client_id, routine_id into v_client, v_from from public.routine_assignments limit 1;
  select id into v_to from public.routines where id <> v_from limit 1;
  if v_client is null or v_to is null then
    raise notice 'SKIP: needs an assigned client and two routines';
    return;
  end if;
  raise notice 'moving % from % to %', v_client, v_from, v_to;

  v_first := public.create_assignment(v_to, v_client);
  assert (select count(*) from public.routine_assignments where client_id = v_client) = 1,
    'client ended up following two routines';
  assert (select routine_id from public.routine_assignments where client_id = v_client) = v_to,
    'the new routine did not take';

  -- Re-assigning what they already follow keeps the same row, so a customisation survives.
  assert (public.create_assignment(v_to, v_client))->>'assignmentId' = v_first->>'assignmentId',
    're-assigning the same routine minted a new assignment';

  -- The routine's client list is additive: being left out of it strands nobody.
  perform public.assign_routine(v_to, array[]::text[]);
  assert (select count(*) from public.routine_assignments where client_id = v_client) = 1,
    'an empty tick list removed the client''s routine';

  perform public.create_assignment(v_from, v_client);
  raise notice 'PASS: one routine per client, swapped and restored';
end $$;
