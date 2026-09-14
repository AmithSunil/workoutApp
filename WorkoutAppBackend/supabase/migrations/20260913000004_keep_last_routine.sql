/**
 * A client is never left with an empty app.
 *
 * Their last routine stays until a different one is assigned: unassigning is
 * for swapping, not for emptying. Both removal paths -- a plain
 * `delete /routine_assignments` and the untick branch of `assign_routine` --
 * are ordinary deletes, so one BEFORE DELETE trigger covers both and anything
 * added later.
 *
 * Cascades are exempt. Deleting the routine, or the client, is an explicit
 * destructive act; by the time the referential action fires this trigger the
 * parent row is already gone, which is exactly what the two `exists` checks
 * below are testing for.
 *
 * SECURITY DEFINER, unlike the RPCs: this is an integrity check, and it has to
 * see every assignment the client holds even when RLS would hide some of them
 * from the caller. Returning a trigger type keeps it off the PostgREST surface.
 */
create function public.keep_last_routine()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.routines where id = old.routine_id)
     and exists (select 1 from public.client_profiles where id = old.client_id)
     and not exists (
       select 1 from public.routine_assignments
        where client_id = old.client_id and id <> old.id
     )
  then
    raise exception 'That would leave a client with no routine. Assign another one first.'
      using errcode = 'PT409';
  end if;
  return old;
end;
$$;

create trigger routine_assignments_keep_last
  before delete on public.routine_assignments
  for each row execute function public.keep_last_routine();

-- Postgres grants EXECUTE to PUBLIC by default; the advisor counts that as the
-- function being on the REST surface, so take it back as 20260831000005 did.
revoke execute on function public.keep_last_routine() from public;
