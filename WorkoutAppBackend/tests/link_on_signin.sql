-- Guard check for 20260920000002_link_on_signin.sql: an invite adopts an auth
-- account that already existed, at the client's next sign-in.
--
-- Everything it writes is inside a transaction it rolls back itself.
-- Silence is failure; one notice is a pass.
--
--   psql "$DATABASE_URL" -f tests/link_on_signin.sql
\set ON_ERROR_STOP on
begin;

do $$
declare v_uid uuid := gen_random_uuid(); v_email text := 'orphan-check@example.invalid';
begin
  -- 1. They open the app before their coach adds them: an auth row, nothing else.
  insert into auth.users (
    instance_id, id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
          v_email, now(),
          jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
          '{}'::jsonb, now(), now(), '', '', '', '');

  assert not exists (select 1 from public.users where auth_user_id = v_uid),
    'nothing should be linked yet -- no roster row exists';

  -- 2. The coach adds that address (invite_client, minus the RLS/trainer setup).
  insert into public.users (id, role, name, email) values ('c-orphan-check', 'client', 'Orphan', v_email);

  assert (select auth_user_id from public.users where id = 'c-orphan-check') is null,
    'the invite itself must not link -- that is the sign-in trigger''s job';

  -- 3. They sign in. GoTrue touches auth.users; nothing is inserted.
  update auth.users set last_sign_in_at = now(), updated_at = now() where id = v_uid;

  assert (select auth_user_id from public.users where id = 'c-orphan-check') = v_uid,
    'sign-in did not adopt the pending invite -- app_user_id() will answer null '
    'and the client is sent back to /welcome to pick a role';

  -- 4. A second sign-in must not move an already-linked row onto someone else.
  update auth.users set last_sign_in_at = now() where id = v_uid;
  assert (select count(*) from public.users where auth_user_id = v_uid) = 1,
    'the link is not idempotent';

  raise notice 'link_on_signin: pass';
end $$;

rollback;
