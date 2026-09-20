-- Client onboarding, trainer side: the invite IS the client row.
--
-- Adding a client creates users + client_profiles + threads straight away, with
-- users.auth_user_id null. That null is the whole "pending" state -- no invite
-- table, no status column. Everything a coach pre-configures (routine, habits,
-- goals) hangs off client_profiles by foreign key, so it has to exist first;
-- the existing editors then work on a pending client unchanged.
--
-- The client's own account is linked later, by the trigger in 20260915000004.
-- See tasks/plan.md.

-- ---------------------------------------------------------------------------
-- A client row that is not filled in yet
-- ---------------------------------------------------------------------------

-- The body numbers only the client can supply. Null height or start weight is
-- the "needs intake" state the app routes on; there is no separate flag to
-- fall out of step with it.
alter table public.client_profiles
  alter column height_cm        drop not null,
  alter column start_weight_kg  drop not null,
  alter column target_weight_kg drop not null,
  alter column goal             set default 'recomp',
  alter column joined_at        set default current_date,
  -- ponytail: flat starter macros, not an estimate -- intake does not collect
  -- age or sex. The intake-complete alert is what gets the coach to set real ones.
  alter column target_calories  set default 2000,
  alter column target_protein   set default 150,
  alter column target_carbs     set default 200,
  alter column target_fat       set default 65;

-- users.email is unique but case-sensitive; an invite typed with a capital
-- letter must not become a second account.
create unique index users_email_lower_key on public.users (lower(email));

-- Client ids are minted now, so they need a counter (the seed only ever wrote
-- them by hand). Threads are keyed 'th-' || client id and need none.
insert into public.id_sequences (prefix, width, last_value)
select 'c', 3, coalesce(max((regexp_match(id, '^c-(\d+)$'))[1]::bigint), 0) from public.users
on conflict (prefix) do update set last_value = greatest(public.id_sequences.last_value, excluded.last_value);

-- Who wrote a routine. A client of a coach who does not track workouts plans
-- their own week, stored under their coach's id (routines.trainer_id is not
-- null); this is what lets RLS tell that routine apart from the coach's own.
alter table public.routines
  add column author_id text references public.users (id) on delete set null
  default public.app_user_id();

-- Pending clients have never logged anything; counting them would drag the
-- coach's averages down for no reason.
create or replace view public.v_trainer_summary with (security_invoker = on) as
  select t.id as trainer_id,
         (select count(*) from public.client_profiles c
            join public.users u on u.id = c.id
           where c.trainer_id = t.id and u.auth_user_id is not null) as active_clients,
         (select count(*) from public.check_ins ci
            join public.client_profiles c on c.id = ci.client_id
           where c.trainer_id = t.id and ci.status = 'pending') as pending_check_ins,
         (select coalesce(sum(th.unread_for_trainer), 0) from public.threads th
           where th.trainer_id = t.id) as unread_messages,
         (select count(*) from public.red_flag_alerts a
            join public.client_profiles c on c.id = a.client_id
           where c.trainer_id = t.id and not a.resolved and a.severity = 'critical') as critical_alerts,
         (select coalesce(round(avg(c.compliance_score)), 0) from public.client_profiles c
            join public.users u on u.id = c.id
           where c.trainer_id = t.id and u.auth_user_id is not null) as weekly_compliance_avg
  from public.trainer_profiles t;

-- ---------------------------------------------------------------------------
-- invite_client / revoke_invite
-- ---------------------------------------------------------------------------

/**
 * Puts a new client on the calling coach's roster. `p_profile` optionally
 * carries heightCm / startWeightKg / targetWeightKg / goal; supplying the first
 * two is what lets the client skip intake. Returns the new client id.
 */
create function public.invite_client(p_name text, p_email text, p_profile jsonb default null)
returns text language plpgsql volatile security invoker set search_path = '' as $$
declare
  v_trainer text := public.app_user_id();
  v_name    text := nullif(btrim(p_name), '');
  v_email   text := lower(btrim(coalesce(p_email, '')));
  p         jsonb := coalesce(p_profile, '{}'::jsonb);
  v_height  numeric := nullif(p->>'heightCm', '')::numeric;
  v_weight  numeric := nullif(p->>'startWeightKg', '')::numeric;
  v_target  numeric := nullif(p->>'targetWeightKg', '')::numeric;
  v_id      text;
begin
  if v_trainer is null or public.app_role() is distinct from 'trainer' then
    raise exception 'Only a coach can add clients' using errcode = '42501';
  end if;
  if v_name is null then raise exception 'A client needs a name'; end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'That email address doesn''t look right';
  end if;
  if v_height <= 0 or v_weight <= 0 or v_target <= 0 then
    raise exception 'Height and weights must be positive numbers';
  end if;

  v_id := public.next_id('c');
  insert into public.users (id, role, name, email) values (v_id, 'client', v_name, v_email);
  insert into public.client_profiles (id, trainer_id, height_cm, start_weight_kg, target_weight_kg, goal)
  values (v_id, v_trainer, v_height, v_weight, v_target,
          coalesce(nullif(p->>'goal', '')::public.client_goal, 'recomp'));
  insert into public.threads (id, client_id, trainer_id) values ('th-' || v_id, v_id, v_trainer);

  -- A starting weight is a weigh-in; without it the weight chart opens empty.
  if v_weight is not null then
    insert into public.body_metrics (client_id, date, weight_kg) values (v_id, current_date, v_weight);
  end if;

  return v_id;
exception when unique_violation then
  raise exception 'That email already has an account' using errcode = 'PT409';
end;
$$;

/** Takes back an invite nobody has signed in with yet. Cascades everything. */
create function public.revoke_invite(p_client_id text)
returns void language plpgsql volatile security invoker set search_path = '' as $$
begin
  delete from public.users u
   where u.id = p_client_id
     and u.auth_user_id is null
     and exists (select 1 from public.client_profiles c
                  where c.id = u.id and c.trainer_id = public.app_user_id());
  if not found then
    raise exception 'No pending invite for %', p_client_id using errcode = 'PT404';
  end if;
end;
$$;

revoke execute on function public.invite_client(text, text, jsonb) from public, anon;
revoke execute on function public.revoke_invite(text)              from public, anon;
grant  execute on function public.invite_client(text, text, jsonb) to authenticated;
grant  execute on function public.revoke_invite(text)              to authenticated;
