-- The client names themselves at onboarding; the coach invites by email alone.
--
-- A name nobody has given yet is '' -- users.name stays not null, and every
-- query that concatenates it keeps working. The app shows the email in its
-- place and sends the client through onboarding until they fill it in, the
-- same way a null height or start weight does. No flag column.

-- Unchanged from 20260920121309 except that the name is no longer required.
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

-- ---------------------------------------------------------------------------
-- complete_intake gains the name
-- ---------------------------------------------------------------------------

-- Unchanged from 20260915101739 except p_name: required while the stored name
-- is '', ignored once it is set -- the same "whatever is already there wins"
-- rule as the body numbers.
drop function public.complete_intake(numeric, numeric, numeric, public.client_goal, text, date);

create function public.complete_intake(
  p_name   text,
  p_height numeric,
  p_weight numeric,
  p_target numeric,
  p_goal   public.client_goal,
  p_notes  text default null,
  p_date   date default current_date)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id   text := public.app_user_id();
  v_name text := btrim(coalesce(p_name, ''));
  c      public.client_profiles;
  v_user public.users;
begin
  select * into c from public.client_profiles where id = v_id for update;
  if not found then
    raise exception 'No client profile for this account' using errcode = 'PT404';
  end if;
  select * into v_user from public.users where id = v_id;
  if c.height_cm is not null and c.start_weight_kg is not null and v_user.name <> '' then
    raise exception 'Setup is already done' using errcode = 'PT409';
  end if;
  if v_user.name = '' and v_name = '' then
    raise exception 'Tell your coach your name';
  end if;
  if coalesce(c.height_cm, p_height, 0) <= 0
     or coalesce(c.start_weight_kg, p_weight, 0) <= 0
     or coalesce(c.target_weight_kg, p_target, 0) <= 0 then
    raise exception 'Height, weight and goal weight must be positive numbers';
  end if;

  -- First, so the alert below names them.
  if v_user.name = '' then
    update public.users set name = v_name where id = v_id;
  end if;

  update public.client_profiles set
    height_cm        = coalesce(c.height_cm, p_height),
    start_weight_kg  = coalesce(c.start_weight_kg, p_weight),
    target_weight_kg = coalesce(c.target_weight_kg, p_target),
    goal             = case when c.target_weight_kg is null then coalesce(p_goal, c.goal) else c.goal end
  where id = v_id;

  if c.start_weight_kg is null then
    insert into public.body_metrics (client_id, date, weight_kg)
    values (v_id, p_date, p_weight)
    on conflict (client_id, date) do update set weight_kg = excluded.weight_kg;
  end if;

  insert into public.red_flag_alerts (client_id, kind, severity, title, detail)
  select v_id, 'intake-complete', 'info',
         u.name || ' finished setup',
         'Still on starter macros — set their calorie and macro targets.'
    from public.users u where u.id = v_id;

  if nullif(btrim(coalesce(p_notes, '')), '') is not null then
    insert into public.messages (thread_id, sender_id, body)
    select th.id, v_id, btrim(p_notes)
      from public.threads th
     where th.client_id = v_id and th.trainer_id = c.trainer_id;
  end if;
end;
$$;

revoke execute on function public.complete_intake(text, numeric, numeric, numeric, public.client_goal, text, date) from public, anon;
grant  execute on function public.complete_intake(text, numeric, numeric, numeric, public.client_goal, text, date) to authenticated;
