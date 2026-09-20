-- Self-signup: the one call /welcome makes.
--
-- SECURITY DEFINER, deliberately -- the fourth exception after next_id, the
-- policy helpers and complete_intake. The caller has no public.users row yet,
-- so app_role() is null and no policy on users could ever admit the insert.
-- The blast radius is kept small the same way complete_intake keeps it small:
-- the identity and the email are read server-side from auth.uid() / auth.users
-- and are NOT parameters, so the worst a caller can do with it is create their
-- own profile, once.
--
-- The invite path wins over this one. An address a coach has already added is
-- owned by link_auth_user (20260915000004); creating a second row for it would
-- orphan the roster entry, so an email that already exists is a 409 here.

-- Trainer ids are minted now. 20260831000006 seeds seventeen prefixes and 't'
-- is not one of them (the seed wrote t-001 by hand); 'c' was added the same way
-- by 20260915000003.
insert into public.id_sequences (prefix, width, last_value)
select 't', 3, coalesce(max((regexp_match(id, '^t-(\d+)$'))[1]::bigint), 0) from public.users
on conflict (prefix) do update set last_value = greatest(public.id_sequences.last_value, excluded.last_value);

/**
 * Creates the profile for the account that is calling, and links it.
 *
 * `p_kind` is 'individual' (a client with no coach) or 'coach'. Returns the new
 * app id (`c-014`, `t-003`). A coach is left with `tracks` null on purpose --
 * the first-run tracking card on the dashboard is what greets them, rather than
 * a second question during signup.
 */
create function public.create_profile(p_kind text, p_name text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_name  text := nullif(btrim(coalesce(p_name, '')), '');
  v_email text;
  v_id    text;
begin
  if v_uid is null then
    raise exception 'Sign in before creating a profile' using errcode = '42501';
  end if;
  if v_name is null then raise exception 'A profile needs a name'; end if;

  select lower(btrim(u.email)) into v_email from auth.users u where u.id = v_uid;
  if coalesce(v_email, '') = '' then
    raise exception 'This account has no email address';
  end if;

  if exists (select 1 from public.users u where u.auth_user_id = v_uid) then
    raise exception 'This account already has a profile' using errcode = 'PT409';
  end if;
  -- An invited address: link_auth_user owns it, and it already has its row.
  if exists (select 1 from public.users u where lower(u.email) = v_email) then
    raise exception 'That email already has an account' using errcode = 'PT409';
  end if;

  if p_kind = 'individual' then
    v_id := public.next_id('c');
    insert into public.users (id, role, name, email, auth_user_id)
    values (v_id, 'client', v_name, v_email, v_uid);
    -- Everything else takes the defaults 20260915000003 set: goal recomp,
    -- starter macros, joined_at today, and null body numbers so the app routes
    -- them through intake exactly like an invited client.
    insert into public.client_profiles (id, trainer_id) values (v_id, null);

  elsif p_kind = 'coach' then
    v_id := public.next_id('t');
    insert into public.users (id, role, name, email, auth_user_id)
    values (v_id, 'trainer', v_name, v_email, v_uid);
    insert into public.trainer_profiles (id) values (v_id);

  else
    raise exception 'Unknown profile kind: %', p_kind;
  end if;

  return v_id;
end;
$$;

-- Supabase grants EXECUTE to anon/authenticated directly, not via PUBLIC, so
-- both have to be named (project memory backend_schema).
revoke execute on function public.create_profile(text, text) from public, anon;
grant  execute on function public.create_profile(text, text) to authenticated;
