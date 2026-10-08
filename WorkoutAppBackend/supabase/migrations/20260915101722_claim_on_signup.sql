-- Client onboarding, sign-in side: who may create an account, and linking it.
--
-- Supabase has no "on login" hook. There are two real moments, and both are
-- used:
--
--   1. hook_require_invite -- the Before User Created auth hook. Turns down any
--      signup whose email is not a pending client. This is the gate for email
--      OTP (signInWithOtp keeps shouldCreateUser at its default: an invitee has
--      no auth row yet, so `false` would lock every one of them out) and for
--      Google later, which has no such option at all.
--      ENABLE IT BY HAND: Dashboard -> Authentication -> Hooks ->
--      Before User Created -> Postgres -> public.hook_require_invite.
--
--   2. link_auth_user -- AFTER INSERT on auth.users. Sets users.auth_user_id in
--      the same statement that creates the account, so the app's first
--      app_user_id() call already answers. Linking any later is too late: the
--      app hard-signs-out an unlinked session.
--
-- With OTP the auth row is created when the code is *sent*, so the link lands
-- before verification. That is safe: only someone holding the code ever gets
-- a session for that uuid.

create function public.hook_require_invite(event jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case
    when exists (select 1 from public.users u
                  where lower(u.email) = lower(event->'user'->>'email')
                    and u.role = 'client'
                    and u.auth_user_id is null)
      then '{}'::jsonb
    -- The app matches on this exact message (src/auth/errors.ts).
    else jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'no_invite'))
  end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke execute on function public.hook_require_invite(jsonb) from public, anon, authenticated;
grant  execute on function public.hook_require_invite(jsonb) to supabase_auth_admin;

create function public.link_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- An OAuth email only counts once the provider has verified it; otherwise an
  -- unverified address could claim someone else's roster row.
  if coalesce(new.raw_app_meta_data->>'provider', 'email') <> 'email'
     and new.email_confirmed_at is null then
    return new;
  end if;

  update public.users
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and role = 'client'
     and auth_user_id is null;
  return new;
exception when others then
  -- Never fail account creation. An unlinked account is recoverable (the app
  -- says "ask your coach"); a raised error here is an opaque 500 on sign-up.
  raise warning 'link_auth_user(%): %', new.id, sqlerrm;
  return new;
end;
$$;

revoke execute on function public.link_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.link_auth_user();
