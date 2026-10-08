/**
 * A coach's invite adopts an existing coachless account (signup plan S11).
 *
 * Inviting an address that belongs to a client with no coach -- someone who
 * signed up on their own (20260919094856), or was removed from a roster
 * (20260926113815) -- attaches them to the inviting coach instead of answering
 * "That email already has an account". Their goal, macros, body numbers, logs,
 * habits and routine are left exactly as they are; the coach edits targets
 * afterwards with the editors they already have. The invite's name and
 * profile fields are ignored for an adoption. Attaching is one-way: detaching
 * stays remove_client, and switching coaches is still out of scope.
 *
 * The moment trainer_id is set, the pending client_profiles_self_writes policy
 * (trainer_id is null) stops matching, so the client loses their own macro
 * editor in the same statement -- no extra step.
 *
 * adopt_client is SECURITY DEFINER, the seventh deliberate exception: under
 * the pending RLS set a coach can neither see nor update a client row that is
 * not on their roster yet. Because it is callable directly, it repeats
 * invite_client's coach, plan and seat checks rather than trusting its caller.
 * It never takes the coach as a parameter.
 *
 * ponytail: the new coach gets a fresh thread; an old one with a previous
 * coach stays theirs. A paid solo subscription is not cancelled on adoption --
 * the app simply stops asking for it. Cancel it here if that turns up.
 */
create function public.adopt_client(p_email text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_trainer text := public.app_user_id();
  v_limit   integer;
  v_used    integer;
  v_id      text;
begin
  if v_trainer is null or public.app_role() is distinct from 'trainer' then
    raise exception 'Only a coach can add clients' using errcode = '42501';
  end if;
  if not public.plan_active(v_trainer) then
    raise exception 'Your plan has expired' using errcode = 'PT402';
  end if;

  select c.id into v_id
    from public.users u
    join public.client_profiles c on c.id = u.id
   where lower(u.email) = lower(btrim(p_email))
     and c.trainer_id is null
     for update of c;
  if v_id is null then
    return null;
  end if;

  v_limit := public.seat_limit(v_trainer);
  if v_limit is not null then
    select count(*) into v_used from public.client_profiles c where c.trainer_id = v_trainer;
    if v_used >= v_limit then
      raise exception 'Your plan covers % clients', v_limit using errcode = 'PT402';
    end if;
  end if;

  update public.client_profiles set trainer_id = v_trainer where id = v_id;
  -- th-<client> may already be a previous coach's thread, so key this one on both.
  insert into public.threads (id, client_id, trainer_id)
  values ('th-' || v_id || '-' || v_trainer, v_id, v_trainer)
  on conflict (client_id, trainer_id) do nothing;

  return v_id;
end;
$$;

revoke execute on function public.adopt_client(text) from public, anon;
grant  execute on function public.adopt_client(text) to authenticated;

-- Unchanged from 20260929084446 except the adopt_client branch before the insert.
create or replace function public.invite_client(p_name text, p_email text, p_profile jsonb default null)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_trainer text := public.app_user_id();
  -- Pending name is '': the client names themselves at onboarding.
  v_name    text := coalesce(btrim(p_name), '');
  v_email   text := lower(btrim(coalesce(p_email, '')));
  p         jsonb := coalesce(p_profile, '{}'::jsonb);
  v_height  numeric := nullif(p->>'heightCm', '')::numeric;
  v_weight  numeric := nullif(p->>'startWeightKg', '')::numeric;
  v_target  numeric := nullif(p->>'targetWeightKg', '')::numeric;
  v_limit   integer;
  v_used    integer;
  v_id      text;
  v_con     text;
begin
  if v_trainer is null or public.app_role() is distinct from 'trainer' then
    raise exception 'Only a coach can add clients' using errcode = '42501';
  end if;
  if not public.plan_active(v_trainer) then
    raise exception 'Your plan has expired' using errcode = 'PT402';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address doesn''t look right';
  end if;
  if v_height <= 0 or v_weight <= 0 or v_target <= 0 then
    raise exception 'Height and weights must be positive numbers';
  end if;

  -- Pending invites count. They are real seats: the row exists, the coach can
  -- pre-configure it, and only the client's own sign-in is outstanding.
  v_limit := public.seat_limit(v_trainer);
  if v_limit is not null then
    select count(*) into v_used from public.client_profiles c where c.trainer_id = v_trainer;
    if v_used >= v_limit then
      raise exception 'Your plan covers % clients', v_limit using errcode = 'PT402';
    end if;
  end if;

  -- Someone already training on their own joins this roster with everything
  -- they have logged. Anything else with this address still answers PT409.
  v_id := public.adopt_client(v_email);
  if v_id is not null then
    return v_id;
  end if;

  v_id := public.next_id('c');
  insert into public.users (id, role, name, email) values (v_id, 'client', v_name, v_email);
  insert into public.client_profiles (id, trainer_id, height_cm, start_weight_kg, target_weight_kg, goal)
  values (v_id, v_trainer, v_height, v_weight, v_target,
          coalesce(nullif(p->>'goal', '')::public.client_goal, 'recomp'));
  insert into public.threads (id, client_id, trainer_id) values ('th-' || v_id, v_id, v_trainer);

  if v_weight is not null then
    insert into public.body_metrics (client_id, date, weight_kg) values (v_id, current_date, v_weight);
  end if;

  return v_id;
exception when unique_violation then
  -- Name the constraint before speaking for it. This handler used to translate
  -- *any* unique violation into the email message, which hid a real bug for a
  -- while: with the id counters un-advanced after a fresh seed, next_id('c')
  -- minted c-001, collided on users_pkey, and the function reported a duplicate
  -- email for an address nobody had ever used. Anything that is not the email
  -- is re-raised as itself.
  get stacked diagnostics v_con = constraint_name;
  if v_con in ('users_email_key', 'users_email_lower_key') then
    raise exception 'That email already has an account' using errcode = 'PT409';
  end if;
  raise;
end;
$$;
