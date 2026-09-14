-- What a coach tracks: workouts, nutrition, or both.
--
-- Nullable on purpose, with no default: null means "not chosen yet", which is
-- what the app's first-run prompt keys off. Once there is a real sign-up flow
-- the choice is made there and the column is never null for a new trainer.
--
-- The existing seeded trainer is left null so the prompt is reachable in dev;
-- every read path treats null as 'both', so nothing is hidden meanwhile.

begin;

create type public.tracking_mode as enum ('workout', 'nutrition', 'both');

alter table public.trainer_profiles add column tracks public.tracking_mode;

-- Appended at the end of the select list: CREATE OR REPLACE VIEW can add
-- trailing columns but cannot reorder or retype the existing ones.
create or replace view public.v_trainer_profiles as
  select t.id,
         u.role,
         u.name,
         u.email,
         u.avatar_url,
         t.headline,
         coalesce(
           array(select c.id from client_profiles c where c.trainer_id = t.id order by c.id),
           '{}'::text[]
         ) as client_ids,
         t.tracks
  from trainer_profiles t
  join users u on u.id = t.id;

alter view public.v_trainer_profiles set (security_invoker = on);

commit;
