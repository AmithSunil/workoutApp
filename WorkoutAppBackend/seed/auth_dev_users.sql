-- Dev sign-in accounts for the nine fixture users. ALREADY APPLIED.
--
-- Password for every account:  apex-dev-2026
--
-- Deliberately obvious and deliberately shared: these exist so a dev build can
-- sign in without SMTP configured, and so the role switcher can keep working by
-- signing in behind the scenes. Delete them before this project sees a real
-- user, and never copy this pattern into one that does.
--
-- Written straight into auth.users rather than through the Admin API because
-- the service_role key is not in this repo; the identities row is what GoTrue
-- needs for the email provider to recognise the account.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000',
       gen_random_uuid(), 'authenticated', 'authenticated', u.email,
       extensions.crypt('apex-dev-2026', extensions.gen_salt('bf')), now(),
       jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
       jsonb_build_object('name', u.name, 'app_role', u.role),
       now(), now(), '', '', '', ''
  from public.users u
 where not exists (select 1 from auth.users a where a.email = u.email);

update public.users u
   set auth_user_id = a.id
  from auth.users a
 where a.email = u.email and u.auth_user_id is distinct from a.id;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select a.id::text, a.id,
       jsonb_build_object('sub', a.id::text, 'email', a.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
  from auth.users a
 where not exists (select 1 from auth.identities i where i.user_id = a.id and i.provider = 'email');
