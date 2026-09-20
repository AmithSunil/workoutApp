-- An invite must be able to adopt an auth account that already exists.
--
-- link_auth_user (20260915000004) only ever ran AFTER INSERT on auth.users, on
-- the assumption that the auth row is born when the invitee asks for their
-- first code. Since 20260918000003 dropped hook_require_invite, signup is open,
-- so that assumption no longer holds: anyone who opens the app before their
-- coach adds them gets an auth row with no public.users row behind it. The
-- coach then adds the address, the client signs in -- and because nothing is
-- INSERTED into auth.users that time, the trigger never fires, auth_user_id
-- stays null, app_user_id() answers null, and the app routes them to
-- /welcome's recovery mode asking whether they are a coach or training alone.
-- Forever: every later sign-in is another UPDATE.
--
-- Signing in is an UPDATE of auth.users (last_sign_in_at, and
-- email_confirmed_at on the first one), so firing on UPDATE too is the whole
-- fix, and it heals every account already stuck in that state at their next
-- sign-in. The function is unchanged and already idempotent -- it only touches
-- rows where auth_user_id is null -- so on a linked account the UPDATE matches
-- nothing, via the users_email_lower_key index.
--
-- It also fixes the OAuth path the insert guard deliberately skips: a Google
-- account is inserted with email_confirmed_at null and confirmed by a later
-- UPDATE, which now links it.

drop trigger on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute function public.link_auth_user();
