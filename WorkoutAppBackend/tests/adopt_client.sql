-- Signup plan S11: invite_client adopts a coachless account. Applies the
-- pending RLS set (the posture this has to survive), checks, and rolls back.
-- Run from inside tests/. Expected: adopted_same_id true, adopted_coach t-001,
-- history_kept true, new_thread 1, solo_self_macro_after 0, the three *_err
-- keys carry 42501 / PT409 / PT409 / PT404, readopt_threads 1.

begin;

\i ../supabase/future/20260901000001_auth_rls.sql.pending

do $$
declare
  maya uuid := (select auth_user_id from public.users where id = 't-001');
  adi  uuid := (select auth_user_id from public.users where id = 'c-001');
  solo uuid := gen_random_uuid();
  solo_id text;
  got text;
  metrics_before int;
  r jsonb := '{}'::jsonb;
  n int;
begin
  insert into auth.users (id, email, email_confirmed_at) values (solo, 'solo.adopt@example.com', now());
  execute 'set local role authenticated';

  -- An individual signs up and logs a weigh-in on their own.
  perform set_config('request.jwt.claims', json_build_object('sub', solo, 'role','authenticated')::text, true);
  solo_id := public.create_profile('individual', 'Solo');
  insert into public.body_metrics (client_id, date, weight_kg) values (solo_id, current_date - 3, 80);
  select count(*) into metrics_before from public.body_metrics where client_id = solo_id;

  -- A client cannot call the DEFINER half directly.
  begin perform public.adopt_client('solo.adopt@example.com'); r := r || '{"client_adopt_ALLOWED":true}';
  exception when others then r := r || jsonb_build_object('client_adopt_err', sqlstate); end;

  -- The coach invites that address.
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  got := public.invite_client('Ignored', '  Solo.Adopt@example.com ', '{"heightCm": 999}');
  r := r || jsonb_build_object(
    'adopted_same_id', got = solo_id,
    'adopted_coach',   (select trainer_id from public.client_profiles where id = solo_id),
    'height_untouched',(select height_cm is null from public.client_profiles where id = solo_id),
    'history_kept',    (select count(*) from public.body_metrics where client_id = solo_id) = metrics_before,
    'new_thread',      (select count(*) from public.threads where client_id = solo_id and trainer_id = 't-001'));

  begin perform public.invite_client('', (select email from public.users where id = 'c-001'));
    r := r || '{"coached_client_ALLOWED":true}';
  exception when others then r := r || jsonb_build_object('coached_client_err', sqlstate); end;
  begin perform public.invite_client('', (select email from public.users where id = 't-001'));
    r := r || '{"trainer_email_ALLOWED":true}';
  exception when others then r := r || jsonb_build_object('trainer_email_err', sqlstate); end;
  begin perform public.revoke_invite(solo_id); r := r || '{"revoke_adopted_ALLOWED":true}';
  exception when others then r := r || jsonb_build_object('revoke_adopted_err', sqlstate); end;

  -- Their own macro editor stops the moment they have a coach.
  perform set_config('request.jwt.claims', json_build_object('sub', solo, 'role','authenticated')::text, true);
  update public.client_profiles set target_protein = target_protein where id = solo_id;
  get diagnostics n = row_count;
  r := r || jsonb_build_object('solo_self_macro_after', n);

  -- Removed and invited again by the same coach: no second thread.
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  perform public.remove_client(solo_id);
  perform public.invite_client('', 'solo.adopt@example.com');
  r := r || jsonb_build_object('readopt_threads',
    (select count(*) from public.threads where client_id = solo_id));

  raise notice 'adopt_client: %', r;
end $$;

rollback;
