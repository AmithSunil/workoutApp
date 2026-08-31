-- Links the app's text identities to Supabase Auth, and gives the policy set
-- the handful of predicates it needs.
--
-- Why a column rather than a uuid primary key: users.id is `c-001`-shaped
-- across 8,900 seeded rows and 15 foreign keys, and `src/types/models.ts`
-- declares `id: string`. One nullable uuid column carries the whole
-- relationship without touching any of that.
--
-- Nullable on purpose: a client_profile can exist before its owner has ever
-- signed in, which is how a trainer adds someone to their roster.

alter table users
  add column auth_user_id uuid unique references auth.users (id) on delete set null;

comment on column users.auth_user_id is
  'Supabase Auth account for this person. Null until they first sign in.';

-- The helpers below are SECURITY DEFINER for the usual reason: a policy on
-- `users` that reads `users` to work out who you are would recurse. Reading
-- past RLS inside the helper breaks that cycle. They are stable, read-only, and
-- leak nothing beyond whether a given client belongs to the caller.
--
-- auth.uid() is wrapped in a scalar subquery so the planner treats it as an
-- InitPlan and evaluates it once per statement rather than once per row.

create function public.app_user_id()
returns text language sql stable security definer set search_path = '' as $$
  select u.id from public.users u where u.auth_user_id = (select auth.uid());
$$;

create function public.app_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select u.role from public.users u where u.auth_user_id = (select auth.uid());
$$;

/** True when the caller is the trainer this client belongs to. */
create function public.is_trainer_of(p_client_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_profiles c
     where c.id = p_client_id and c.trainer_id = public.app_user_id());
$$;

/** True when the caller is this client, or the trainer who coaches them. */
create function public.owns_client(p_client_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_client_id = public.app_user_id() or public.is_trainer_of(p_client_id);
$$;

/** True when the caller is a client of this trainer -- lets a client read their coach. */
create function public.is_my_trainer(p_trainer_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.client_profiles c
     where c.id = public.app_user_id() and c.trainer_id = p_trainer_id);
$$;

/** Either side of a conversation. */
create function public.in_thread(p_thread_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.threads t
     where t.id = p_thread_id
       and (t.client_id = public.app_user_id() or t.trainer_id = public.app_user_id()));
$$;
