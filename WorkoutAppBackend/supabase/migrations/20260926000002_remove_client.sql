/**
 * A coach can take a signed-up client off their roster.
 *
 * Removing DETACHES, it never deletes: the client row, logs, weigh-ins, habits,
 * routine and chat history all stay, trainer_id goes null, and they carry on as
 * an individual (20260918000001) on a fresh 14-day solo trial -- the same start
 * a self-signed-up individual gets, so they are not paywalled the moment their
 * coach lets them go. Pending invites keep using revoke_invite, which deletes,
 * since nobody has anything to keep yet.
 *
 * Detaching also frees the seat (invite_client counts trainer_id rows) and
 * drops the client from v_trainer_summary, the cron flags and weekly
 * check-ins, all of which already filter on trainer_id.
 *
 * SECURITY DEFINER, the sixth deliberate exception: under the pending RLS set
 * a coach cannot write a client row they would no longer own afterwards, and
 * write grants on subscriptions are revoked from authenticated (billing).
 * The ownership check below is therefore the only gate -- keep it.
 *
 * ponytail: the client keeps following the coach's routine template (and the
 * old thread stays, readable by both). Drop the assignment here if coaches
 * object to ex-clients keeping their programme.
 */
create function public.remove_client(p_client_id text)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_trainer text := public.app_user_id();
begin
  if v_trainer is null or public.app_role() is distinct from 'trainer' then
    raise exception 'Only a coach can remove clients' using errcode = '42501';
  end if;

  update public.client_profiles c
     set trainer_id = null
    from public.users u
   where c.id = p_client_id
     and u.id = c.id
     and c.trainer_id = v_trainer
     and u.auth_user_id is not null;
  if not found then
    raise exception 'No client % on your roster', p_client_id using errcode = 'PT404';
  end if;

  -- on conflict do nothing: an adopted individual keeps whatever plan they had.
  perform public.start_subscription(p_client_id, 'client');
end;
$$;

revoke execute on function public.remove_client(text) from public, anon;
grant  execute on function public.remove_client(text) to authenticated;
