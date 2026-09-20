-- Subscriptions: who is allowed to operate the app, and how many clients they
-- may carry. Razorpay is the gateway; see supabase/functions/razorpay*.
--
-- The whole entitlement rule is ONE comparison:
--
--     current_period_end is null  -> never expires (the free coach tier)
--     current_period_end > now()  -> paid up
--
-- `status` is informational only. A user who cancels mid-cycle keeps the app
-- until the date they paid for, and lapses on their own when it passes -- no
-- job, no sweep, no pg_cron (which is not installed anyway).
--
-- Reverting: drop the two tables and the three functions, then restore
-- invite_client and create_profile from 20260915000003 / 20260918000002.

-- ---------------------------------------------------------------------------
-- The price list
-- ---------------------------------------------------------------------------

-- ponytail: a table, not a constant, because razorpay_plan_id is created in
-- Razorpay's dashboard per environment and the amounts are placeholders Sneha
-- will replace. Neither should need an app release.
create table public.plans (
  code            text primary key,
  role            public.user_role not null,
  name            text not null,
  -- Paise, the unit Razorpay charges in. 0 is the free tier.
  price_paise     integer not null check (price_paise >= 0),
  -- Seats. Null means unlimited; ignored for a client-role plan, which has no
  -- roster to cap.
  max_clients     integer check (max_clients > 0),
  -- The plan object created in Razorpay. Null for a tier nobody pays for.
  razorpay_plan_id text unique,
  position        integer not null default 0
);

-- PLACEHOLDER PRICING, 2026-09-20. Amounts are a guess to make the screens
-- real; the tier *shape* (2 / 15 / 50 / unlimited) is the decision.
insert into public.plans (code, role, name, price_paise, max_clients, position) values
  ('coach_free',    'trainer', 'Free',      0,      2,    0),
  ('coach_starter', 'trainer', 'Starter',   99900,  15,   1),
  ('coach_pro',     'trainer', 'Pro',       249900, 50,   2),
  ('coach_elite',   'trainer', 'Elite',     499900, null, 3),
  ('solo',          'client',  'Solo',      29900,  null, 0);

-- ---------------------------------------------------------------------------
-- One subscription per user
-- ---------------------------------------------------------------------------

create table public.subscriptions (
  user_id                  text primary key references public.users (id) on delete cascade,
  plan_code                text not null references public.plans (code),
  -- trialing | active | past_due | cancelled. Display only -- see the header.
  status                   text not null default 'trialing'
                             check (status in ('trialing', 'active', 'past_due', 'cancelled')),
  -- Null = perpetual (free tier, and the grandfathered fixtures below).
  current_period_end       timestamptz,
  razorpay_subscription_id text unique,
  razorpay_customer_id     text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Individuals get 14 days on the house; coaches get the free tier instead, so
-- they can try the product with two clients for as long as they like.
create function public.start_subscription(p_user text, p_role public.user_role)
returns void language sql volatile security invoker set search_path = '' as $$
  insert into public.subscriptions (user_id, plan_code, status, current_period_end)
  values (
    p_user,
    case when p_role = 'trainer' then 'coach_free' else 'solo' end,
    case when p_role = 'trainer' then 'active' else 'trialing' end,
    case when p_role = 'trainer' then null else now() + interval '14 days' end
  )
  on conflict (user_id) do nothing;
$$;

-- ---------------------------------------------------------------------------
-- The entitlement predicates
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER, the fifth deliberate exception (after next_id, the policy
-- helpers, complete_intake and create_profile) and for the same reason as the
-- policy helpers: this is called *from* a policy on client_profiles, and a
-- policy that reads an RLS-protected table would see the filtered view of it.
create function public.plan_active(p_user text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
     where s.user_id = coalesce(p_user, public.app_user_id())
       and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Null = unlimited, and null for a user with no subscription row at all, which
-- cannot happen through the app -- plan_active() is what refuses those.
create function public.seat_limit(p_trainer text)
returns integer language sql stable security definer set search_path = '' as $$
  select p.max_clients from public.subscriptions s
    join public.plans p on p.code = s.plan_code
   where s.user_id = p_trainer;
$$;

-- ---------------------------------------------------------------------------
-- The gate, in the one place every policy already goes through
-- ---------------------------------------------------------------------------

-- Unchanged from 20260831000011 except the plan_active() clause, and
-- re-declaring `security definer` because create-or-replace takes the attribute
-- from the new definition (project memory backend_schema).
--
-- Putting it here rather than in each policy is the whole gate: the pending RLS
-- set routes ~20 tables through owns_client() -- logs, sessions, nutrition,
-- habits, metrics, photos, check-ins and every child table of those -- so a
-- coach whose plan has lapsed stops seeing their clients everywhere at once,
-- not just on the roster screen. The first branch is untouched, which is what
-- keeps the client side working: a client's own access never consults billing,
-- so they keep training and logging while their coach is not paying.
create or replace function public.owns_client(p_client_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_client_id = public.app_user_id()
      or (public.is_trainer_of(p_client_id) and public.plan_active());
$$;

comment on function public.plan_active(text) is
  'True while the user is entitled to operate. One rule: current_period_end is null, or in the future.';

-- ---------------------------------------------------------------------------
-- Existing rows
-- ---------------------------------------------------------------------------

-- Grandfathered, perpetual. The seeded coach has eight clients and would
-- otherwise be over the free cap the moment this lands; nobody should have to
-- pay for a roster they already had.
insert into public.subscriptions (user_id, plan_code, status, current_period_end)
select u.id,
       case when u.role = 'trainer' then 'coach_pro' else 'solo' end,
       'active',
       null
  from public.users u
 where u.role = 'trainer'
    or exists (select 1 from public.client_profiles c where c.id = u.id and c.trainer_id is null)
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Development posture, matching 20260831000003
-- ---------------------------------------------------------------------------

alter table public.plans          enable row level security;
alter table public.subscriptions  enable row level security;

-- Only select, unlike every other table here. Nothing in the app writes either
-- of these: the razorpay edge functions do, under the service role, which
-- bypasses RLS entirely. That is the point -- a client that could write this
-- table could grant itself a plan, and money-backed state must not be one
-- forged request away.
create policy plans_dev_select         on public.plans         for select to anon, authenticated using (true);
create policy subscriptions_dev_select on public.subscriptions for select to anon, authenticated using (true);

-- Supabase hands `authenticated` all four verbs on a new table by default, so
-- RLS would otherwise be the only thing standing between a client and their own
-- plan_code. Take the grants away and there is nothing for a missing policy to
-- go wrong about.
revoke all on public.plans         from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
grant select on public.plans         to anon, authenticated;
grant select on public.subscriptions to authenticated;

revoke execute on function public.plan_active(text)                                from public, anon;
revoke execute on function public.seat_limit(text)                                 from public, anon;
revoke execute on function public.start_subscription(text, public.user_role)       from public, anon, authenticated;
grant  execute on function public.plan_active(text)                                to authenticated;
grant  execute on function public.seat_limit(text)                                 to authenticated;

-- ---------------------------------------------------------------------------
-- The seat cap, enforced where it cannot be talked out of
-- ---------------------------------------------------------------------------

-- Unchanged from 20260915000003 except for the cap block. This is the one gate
-- that works TODAY: the roster *view* gate rides in with the pending RLS set
-- (old T10), but a coach cannot mint seats past their plan from this moment on,
-- whatever the app is showing them.
create or replace function public.invite_client(p_name text, p_email text, p_profile jsonb default null)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_trainer text := public.app_user_id();
  v_name    text := nullif(btrim(p_name), '');
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
  if v_name is null then raise exception 'A client needs a name'; end if;
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
-- A new account starts subscribed
-- ---------------------------------------------------------------------------

-- Unchanged from 20260918000002 except the two start_subscription calls.
create or replace function public.create_profile(p_kind text, p_name text)
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
  if exists (select 1 from public.users u where lower(u.email) = v_email) then
    raise exception 'That email already has an account' using errcode = 'PT409';
  end if;

  if p_kind = 'individual' then
    v_id := public.next_id('c');
    insert into public.users (id, role, name, email, auth_user_id)
    values (v_id, 'client', v_name, v_email, v_uid);
    insert into public.client_profiles (id, trainer_id) values (v_id, null);
    perform public.start_subscription(v_id, 'client');

  elsif p_kind = 'coach' then
    v_id := public.next_id('t');
    insert into public.users (id, role, name, email, auth_user_id)
    values (v_id, 'trainer', v_name, v_email, v_uid);
    insert into public.trainer_profiles (id) values (v_id);
    perform public.start_subscription(v_id, 'trainer');

  else
    raise exception 'Unknown profile kind: %', p_kind;
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_profile(text, text) from public, anon;
grant  execute on function public.create_profile(text, text) to authenticated;
revoke execute on function public.invite_client(text, text, jsonb) from public, anon;
grant  execute on function public.invite_client(text, text, jsonb) to authenticated;
