-- Client onboarding, last step: the client fills in what the coach did not.
--
-- SECURITY DEFINER, deliberately -- the third exception after next_id and the
-- policy helpers. RLS cannot restrict *which columns* an UPDATE touches, and a
-- client must never be able to rewrite their own macro targets. So the client
-- gets no update policy on client_profiles at all; this function is the only
-- way in, it only ever touches the caller's own row (app_user_id()), and only
-- the intake columns, and only while intake is still pending.

create function public.complete_intake(
  p_height numeric,
  p_weight numeric,
  p_target numeric,
  p_goal   public.client_goal,
  p_notes  text default null,
  p_date   date default current_date)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id text := public.app_user_id();
  c    public.client_profiles;
begin
  select * into c from public.client_profiles where id = v_id for update;
  if not found then
    raise exception 'No client profile for this account' using errcode = 'PT404';
  end if;
  if c.height_cm is not null and c.start_weight_kg is not null then
    raise exception 'Setup is already done' using errcode = 'PT409';
  end if;
  if coalesce(c.height_cm, p_height, 0) <= 0
     or coalesce(c.start_weight_kg, p_weight, 0) <= 0
     or coalesce(c.target_weight_kg, p_target, 0) <= 0 then
    raise exception 'Height, weight and goal weight must be positive numbers';
  end if;

  -- Whatever the coach already set wins. The goal only follows a goal weight
  -- the client supplied -- a coach who picked one (or chose performance) keeps it.
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

  -- Health and diet notes go where the coach already reads: the chat.
  if nullif(btrim(coalesce(p_notes, '')), '') is not null then
    insert into public.messages (thread_id, sender_id, body)
    select th.id, v_id, btrim(p_notes)
      from public.threads th
     where th.client_id = v_id and th.trainer_id = c.trainer_id;
  end if;
end;
$$;

revoke execute on function public.complete_intake(numeric, numeric, numeric, public.client_goal, text, date) from public, anon;
grant  execute on function public.complete_intake(numeric, numeric, numeric, public.client_goal, text, date) to authenticated;
