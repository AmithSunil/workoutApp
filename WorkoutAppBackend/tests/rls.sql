-- Applies supabase/future/20260901000001_auth_rls.sql.pending, checks what each
-- role can see, and rolls back. Safe to run against the live project: the final
-- RAISE guarantees the transaction cannot commit even if something above it
-- succeeded unexpectedly.
--
-- Run it through the SQL editor, or `psql "$DATABASE_URL" -f tests/rls.sql`.
-- Paste the policy file's body where marked -- it is kept in one place rather
-- than duplicated here so the tested text and the deployable text cannot drift.
--
-- The onboarding half creates two throwaway clients and an auth.users row, and
-- the self-signup half one more of each; the rollback removes them. Expected:
-- every *_ALLOWED key absent, the failure keys carry a SQLSTATE
-- (42501 / PT404 / PT409), newbie_app_user_id_is_pending is true, both
-- trainer_sees_* are 1, client_self_macro_update_rows is 0 (a coached client
-- cannot move their own macros) and client_self_routine is ok.
--
-- Self-signup (20260918000002, and the two policy edits below): solo_coachless
-- and solo_id_is_client are true, solo_self_macro_update_rows is 1 (an
-- individual CAN, which is the whole point of client_profiles_self_writes),
-- solo_writes_other_client_rows is 0, solo_routine is ok and
-- solo_routine_coachless is 1.
--
-- hook_require_invite was dropped by 20260918000003 (signup is open), so the
-- two hook_* keys are gone.
--
-- Role escalation: c1_role_after_self_promote is 'client' (users has no
-- self-update policy, so the statement matches no row), and both
-- c1_mints_trainer_profile and c1_fake_roster are 42501 -- never ALLOWED.

begin;

\i ../supabase/future/20260901000001_auth_rls.sql.pending

do $$
declare
  maya uuid := (select auth_user_id from public.users where id = 't-001');
  adi  uuid := (select auth_user_id from public.users where id = 'c-001');
  leah uuid := (select auth_user_id from public.users where id = 'c-002');
  r    jsonb := '{}'::jsonb;
  n    int;
  pending   text;
  prefilled text;
  newbie    uuid;
  solo      uuid;
  solo_id   text;
begin
  execute 'set local role authenticated';

  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'trainer_app_user_id', public.app_user_id(),
    'trainer_role',        public.app_role(),
    'trainer_clients',     (select count(*) from public.client_profiles),
    'trainer_logs',        (select count(*) from public.workout_logs),
    'trainer_logged_sets', (select count(*) from public.logged_sets),
    'trainer_threads',     (select count(*) from public.threads),
    'trainer_messages',    (select count(*) from public.messages),
    'trainer_nutrition',   (select count(*) from public.nutrition_days),
    'trainer_exercises',   (select count(*) from public.exercises),
    'trainer_users',       (select count(*) from public.users));

  perform set_config('request.jwt.claims', json_build_object('sub', adi, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'c1_app_user_id',       public.app_user_id(),
    'c1_clients',           (select count(*) from public.client_profiles),
    'c1_logs',              (select count(*) from public.workout_logs),
    'c1_other_logs',        (select count(*) from public.workout_logs where client_id <> 'c-001'),
    'c1_logged_sets',       (select count(*) from public.logged_sets),
    'c1_threads',           (select count(*) from public.threads),
    'c1_messages',          (select count(*) from public.messages),
    'c1_nutrition',         (select count(*) from public.nutrition_days),
    'c1_metrics',           (select count(*) from public.body_metrics),
    'c1_habits',            (select count(*) from public.habits),
    'c1_habit_completions', (select count(*) from public.habit_completions),
    'c1_exercises',         (select count(*) from public.exercises),
    'c1_users',             (select count(*) from public.users),
    'c1_trainer_profiles',  (select count(*) from public.trainer_profiles));

  perform set_config('request.jwt.claims', json_build_object('sub', leah, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'c2_logs',         (select count(*) from public.workout_logs),
    'c2_sees_c1_logs', (select count(*) from public.workout_logs where client_id = 'c-001'),
    'c2_threads',      (select count(*) from public.threads));

  -- Onboarding (20260915000002..05): invite, sign up, intake, revoke.
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  pending := public.invite_client('Rls Pending', 'Rls.Pending@Example.com');
  prefilled := public.invite_client('Rls Prefilled', 'rls.prefilled@example.com',
                 '{"heightCm":170,"startWeightKg":80,"targetWeightKg":75,"goal":"cut"}');
  r := r || jsonb_build_object(
    'inv_trainer_sees_pending', (select count(*) from public.client_profiles where id = pending),
    'inv_thread',               (select count(*) from public.threads where client_id = pending),
    'inv_prefilled_weighin',    (select count(*) from public.body_metrics where client_id = prefilled));
  begin
    perform public.invite_client('Dup', 'RLS.PENDING@example.com');
    r := r || '{"inv_duplicate":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('inv_duplicate', sqlstate);
  end;
  begin
    perform public.revoke_invite('c-001');
    r := r || '{"revoke_linked":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('revoke_linked', sqlstate);
  end;
  perform public.revoke_invite(prefilled);
  r := r || jsonb_build_object('revoke_pending_gone', (select count(*) from public.client_profiles where id = prefilled));

  perform set_config('request.jwt.claims', json_build_object('sub', adi, 'role','authenticated')::text, true);
  begin
    perform public.invite_client('Nope', 'nope@example.com');
    r := r || '{"client_invite":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('client_invite', sqlstate);
  end;
  begin
    update public.client_profiles set target_calories = 9999 where id = 'c-001';
    r := r || jsonb_build_object('client_self_macro_update_rows',
      (select count(*) from public.client_profiles where id = 'c-001' and target_calories = 9999));
  exception when others then r := r || jsonb_build_object('client_self_macro_update_rows', sqlstate);
  end;
  begin
    perform public.complete_intake(180, 80, 75, 'cut');
    r := r || '{"intake_twice":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('intake_twice', sqlstate);
  end;
  begin
    perform public.create_routine(jsonb_build_object('title','Rls self plan','trainerId','t-001',
      'assignedClientIds', jsonb_build_array('c-001'),
      'days', jsonb_build_array(jsonb_build_object('weekday','mon','focus','legs','exercises',
        jsonb_build_array(jsonb_build_object('exerciseId', (select id from public.exercises limit 1),
          'name','Squat','muscleGroup','legs','sets',3,'repMin',8,'repMax',10))))));
    r := r || '{"client_self_routine":"ok"}';
  exception when others then r := r || jsonb_build_object('client_self_routine', sqlstate || ' ' || sqlerrm);
  end;

  -- The invitee signs up: the trigger links them in the same statement.
  execute 'reset role';
  insert into auth.users (id, email, raw_app_meta_data)
  values (gen_random_uuid(), 'rls.pending@example.com', '{"provider":"email"}')
  returning id into newbie;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', newbie, 'role','authenticated')::text, true);
  r := r || jsonb_build_object('newbie_app_user_id_is_pending', public.app_user_id() = pending);
  perform public.complete_intake(165, 70, 62, 'cut', 'No dairy. Bad left knee.', '2026-09-15');
  r := r || jsonb_build_object(
    'newbie_profile', (select jsonb_build_object('h', height_cm, 'w', start_weight_kg, 't', target_weight_kg, 'goal', goal)
                         from public.client_profiles where id = pending),
    'newbie_sees_own_alert', (select count(*) from public.red_flag_alerts where client_id = pending));

  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'trainer_sees_intake_alert', (select count(*) from public.red_flag_alerts
                                   where client_id = pending and kind = 'intake-complete'),
    'trainer_sees_notes_message', (select count(*) from public.messages m
                                    join public.threads t on t.id = m.thread_id where t.client_id = pending));
  begin
    perform public.revoke_invite(pending);
    r := r || '{"revoke_after_signup":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('revoke_after_signup', sqlstate);
  end;

  -- A client cannot become a coach. Three ways to try, all shut: the column
  -- itself, the table that makes you look like one, and a roster row of your
  -- own. (Registering as one is refused earlier, by create_profile.)
  perform set_config('request.jwt.claims', json_build_object('sub', adi, 'role','authenticated')::text, true);
  begin
    update public.users set role = 'trainer' where id = 'c-001';
    r := r || jsonb_build_object('c1_role_after_self_promote',
      (select u.role::text from public.users u where u.id = 'c-001'));
  exception when others then r := r || jsonb_build_object('c1_role_after_self_promote', sqlstate);
  end;
  begin
    insert into public.trainer_profiles (id) values ('c-001');
    r := r || '{"c1_mints_trainer_profile":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('c1_mints_trainer_profile', sqlstate);
  end;
  begin
    insert into public.client_profiles (id, trainer_id) values ('t-001', 'c-001');
    r := r || '{"c1_fake_roster":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('c1_fake_roster', sqlstate);
  end;

  -- Self-signup: an individual creates their own profile and owns it.
  execute 'reset role';
  insert into auth.users (id, email, raw_app_meta_data)
  values (gen_random_uuid(), 'rls.solo@example.com', '{"provider":"email"}')
  returning id into solo;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', solo, 'role','authenticated')::text, true);
  solo_id := public.create_profile('individual', 'Rls Solo');
  r := r || jsonb_build_object(
    'solo_id_is_client', solo_id like 'c-%',
    'solo_role',         public.app_role(),
    'solo_coachless',    (select trainer_id is null from public.client_profiles where id = solo_id));
  -- The one thing a coached client may not do, and an individual may.
  begin
    update public.client_profiles set target_calories = 2345 where id = solo_id;
    r := r || jsonb_build_object('solo_self_macro_update_rows',
      (select count(*) from public.client_profiles where id = solo_id and target_calories = 2345));
  exception when others then r := r || jsonb_build_object('solo_self_macro_update_rows', sqlstate);
  end;
  begin
    update public.client_profiles set target_calories = 1 where id = 'c-001';
    r := r || jsonb_build_object('solo_writes_other_client_rows',
      (select count(*) from public.client_profiles where id = 'c-001' and target_calories = 1));
  exception when others then r := r || jsonb_build_object('solo_writes_other_client_rows', sqlstate);
  end;
  begin
    perform public.create_routine(jsonb_build_object('title','Rls solo plan',
      'assignedClientIds', jsonb_build_array(solo_id),
      'days', jsonb_build_array(jsonb_build_object('weekday','tue','focus','back','exercises',
        jsonb_build_array(jsonb_build_object('exerciseId', (select id from public.exercises limit 1),
          'name','Row','muscleGroup','back','sets',3,'repMin',8,'repMax',10))))));
    r := r || '{"solo_routine":"ok"}';
  exception when others then r := r || jsonb_build_object('solo_routine', sqlstate || ' ' || sqlerrm);
  end;
  r := r || jsonb_build_object('solo_routine_coachless',
    (select count(*) from public.routines
      where title = 'Rls solo plan' and trainer_id is null and author_id = solo_id));

  -- ---------------------------------------------------------------------
  -- Billing (20260920000001): the gate is inside owns_client()
  -- ---------------------------------------------------------------------
  execute 'reset role';
  update public.subscriptions set current_period_end = now() - interval '1 day'
   where user_id = 't-001';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  r := r || jsonb_build_object(
    'lapsed_clients',   (select count(*) from public.client_profiles),
    'lapsed_logs',      (select count(*) from public.workout_logs),
    'lapsed_metrics',   (select count(*) from public.body_metrics));
  update public.client_profiles set target_calories = 1 where id = 'c-001';
  get diagnostics n = row_count;
  r := r || jsonb_build_object('lapsed_macro_write', n);
  begin
    perform public.invite_client('Lapsed', 'lapsed@example.com');
    r := r || '{"lapsed_invite":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('lapsed_invite', sqlstate);
  end;

  -- Back in credit, everything returns. Nothing was deleted while it was gone.
  execute 'reset role';
  update public.subscriptions set current_period_end = null where user_id = 't-001';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  r := r || jsonb_build_object('restored_clients', (select count(*) from public.client_profiles));

  -- The seat cap, which bites whatever the app is showing.
  execute 'reset role';
  update public.subscriptions set plan_code = 'coach_free' where user_id = 't-001';
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', maya, 'role','authenticated')::text, true);
  begin
    perform public.invite_client('Over Cap', 'overcap@example.com');
    r := r || '{"over_cap_invite":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('over_cap_invite', sqlstate);
  end;

  -- A client must not be able to write themselves a plan.
  perform set_config('request.jwt.claims', json_build_object('sub', adi, 'role','authenticated')::text, true);
  begin
    update public.subscriptions set plan_code = 'coach_elite' where user_id = 'c-001';
    get diagnostics n = row_count;
    r := r || jsonb_build_object('client_self_grant', n);
  exception when others then r := r || jsonb_build_object('client_self_grant', sqlstate);
  end;

  execute 'set local role anon';
  perform set_config('request.jwt.claims', '', true);
  begin
    perform public.invite_client('Anon', 'anon@example.com');
    r := r || '{"anon_invite":"ALLOWED"}';
  exception when others then r := r || jsonb_build_object('anon_invite', sqlstate);
  end;
  r := r || jsonb_build_object(
    'anon_clients',   (select count(*) from public.client_profiles),
    'anon_logs',      (select count(*) from public.workout_logs),
    'anon_exercises', (select count(*) from public.exercises),
    'anon_messages',  (select count(*) from public.messages));

  execute 'reset role';
  raise exception 'REPORT %', r;
end $$;

rollback;
