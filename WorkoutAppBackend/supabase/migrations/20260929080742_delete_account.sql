/**
 * Deleting an account -- the data half.
 *
 * Called only by the `razorpay` edge function as service_role, after it has
 * stopped any live mandate and before it deletes the auth user. Not on the REST
 * surface: the id comes from the function, which read it off the caller's JWT.
 * INVOKER is enough -- service_role bypasses RLS -- so this is not another
 * DEFINER exception.
 *
 * Nearly everything already cascades: users -> client_profiles / trainer_profiles
 * -> every child table (logs, sets, nutrition, metrics, habits, threads, alerts,
 * check-ins, subscription). Only what the cascade gets wrong is handled here.
 *
 * Coach:
 *  - linked clients are detached exactly as remove_client (20260926113815) does:
 *    trainer_id null + a 14-day solo trial. Their data is theirs, and
 *    client_profiles.trainer_id is ON DELETE RESTRICT anyway.
 *  - pending invites (no auth user yet) are deleted, as revoke_invite would.
 *  - routines assigned to a client lose their trainer instead of cascading, so a
 *    detached client keeps their programme -- the same promise remove_client
 *    makes. Unassigned templates and all threads go with the coach.
 * Client / individual:
 *  - routines they wrote themselves are deleted; routines.author_id is SET NULL,
 *    so they would otherwise be left orphaned.
 */
create function public.delete_account(p_user_id text)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_role   public.user_role;
  v_client text;
begin
  select role into v_role from public.users where id = p_user_id;
  if v_role is null then
    raise exception 'No account %', p_user_id using errcode = 'PT404';
  end if;

  if v_role = 'trainer' then
    delete from public.users u
     using public.client_profiles c
     where c.id = u.id and c.trainer_id = p_user_id and u.auth_user_id is null;

    for v_client in
      -- invites are gone by now, so everyone left is a linked client
      update public.client_profiles set trainer_id = null
       where trainer_id = p_user_id
      returning id
    loop
      perform public.start_subscription(v_client, 'client');
    end loop;

    update public.routines r set trainer_id = null
     where r.trainer_id = p_user_id
       and exists (select 1 from public.routine_assignments a where a.routine_id = r.id);
  else
    delete from public.routines where author_id = p_user_id;
  end if;

  delete from public.users where id = p_user_id;
end;
$$;

revoke execute on function public.delete_account(text) from public, anon, authenticated;
grant  execute on function public.delete_account(text) to service_role;
