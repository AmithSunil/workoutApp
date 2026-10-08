-- The client's phone number, asked once on sign-in and kept.
--
-- On client_profiles, not users: a client has no update policy anywhere, and
-- complete_intake (SECURITY DEFINER) is already the one door for what the
-- client supplies about themselves. Null is "not asked yet" -- existing
-- clients go through onboarding once more, for this field alone.

alter table public.client_profiles
  add column phone text check (phone ~ '^\+?[0-9]{7,15}$');

-- Unchanged from 20260929084446 except p_phone: required while the stored
-- phone is null, ignored once it is set.
drop function public.complete_intake(text, numeric, numeric, numeric, public.client_goal, text, date);

create function public.complete_intake(
  p_name   text,
  p_phone  text,
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
  -- Spaces, dashes, dots and brackets are how people type numbers, not part of them.
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '[[:space:]().-]', '', 'g'), '');
  c      public.client_profiles;
  v_user public.users;
begin
  select * into c from public.client_profiles where id = v_id for update;
  if not found then
    raise exception 'No client profile for this account' using errcode = 'PT404';
  end if;
  select * into v_user from public.users where id = v_id;
  if c.height_cm is not null and c.start_weight_kg is not null and v_user.name <> '' and c.phone is not null then
    raise exception 'Setup is already done' using errcode = 'PT409';
  end if;
  if v_user.name = '' and v_name = '' then
    raise exception 'Tell your coach your name';
  end if;
  if c.phone is null and (v_phone is null or v_phone !~ '^\+?[0-9]{7,15}$') then
    raise exception 'Enter a valid phone number';
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
    goal             = case when c.target_weight_kg is null then coalesce(p_goal, c.goal) else c.goal end,
    phone            = coalesce(c.phone, v_phone)
  where id = v_id;

  if c.start_weight_kg is null then
    insert into public.body_metrics (client_id, date, weight_kg)
    values (v_id, p_date, p_weight)
    on conflict (client_id, date) do update set weight_kg = excluded.weight_kg;
  end if;

  -- A client who was only missing a phone number has not "finished setup" in
  -- any sense the coach needs to act on.
  insert into public.red_flag_alerts (client_id, kind, severity, title, detail)
  select v_id, 'intake-complete', 'info',
         u.name || ' finished setup',
         'Still on starter macros — set their calorie and macro targets.'
    from public.users u
   where u.id = v_id
     and (c.height_cm is null or c.start_weight_kg is null or v_user.name = '');

  if nullif(btrim(coalesce(p_notes, '')), '') is not null then
    insert into public.messages (thread_id, sender_id, body)
    select th.id, v_id, btrim(p_notes)
      from public.threads th
     where th.client_id = v_id and th.trainer_id = c.trainer_id;
  end if;
end;
$$;

revoke execute on function public.complete_intake(text, text, numeric, numeric, numeric, public.client_goal, text, date) from public, anon;
grant  execute on function public.complete_intake(text, text, numeric, numeric, numeric, public.client_goal, text, date) to authenticated;
