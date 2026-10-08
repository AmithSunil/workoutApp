-- WorkoutApp core schema
-- Implements BACKEND_DATA_SCHEMA.md sections 1-6 and 9.
--
-- Key decisions:
--   * Primary keys are TEXT, not UUID. The mock fixtures the app already ships
--     use prefixed ids (t-001, c-001, e-014, wl-00144) and the frontend types
--     declare `id: string`. Keeping text keys lets the seeded data and the
--     existing fixtures stay interchangeable while auth is still to come.
--   * Nested structures in the plan (routine days/exercises, session sets,
--     logged sets, nutrition entries, habit completions) are real child tables
--     with foreign keys, not jsonb. `position` preserves array order so the API
--     layer can reassemble the exact nested shape src/types/models.ts expects.
--   * Denormalised fields the plan lists as "calculated by backend"
--     (compliance, thread unread counts, trainer summary) are stored where the
--     plan stores them, with views for the ones that are pure derivations.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role          as enum ('client', 'trainer');
create type client_goal        as enum ('cut', 'recomp', 'bulk', 'performance');
create type compliance_status  as enum ('green', 'yellow', 'red');
create type muscle_group       as enum ('chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full body', 'conditioning');
create type weekday            as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
create type session_status     as enum ('scheduled', 'in-progress', 'completed', 'missed');
create type meal_slot          as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type food_entry_source  as enum ('search', 'quick-add', 'ai');
create type photo_pose         as enum ('front', 'side', 'back');
create type habit_cadence      as enum ('daily');
create type habit_creator      as enum ('trainer', 'client');
create type attachment_kind    as enum ('workout', 'nutrition', 'photo');
create type alert_kind         as enum ('missed-logs', 'high-rpe', 'weight-stall', 'calorie-deficit-miss', 'check-in-due');
create type alert_severity     as enum ('critical', 'warning', 'info');
create type check_in_status    as enum ('pending', 'reviewed');

-- ---------------------------------------------------------------------------
-- updated_at housekeeping
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. User management
-- ---------------------------------------------------------------------------

create table users (
  id          text primary key,
  role        user_role not null,
  name        text not null,
  email       text not null unique,
  avatar_url  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table trainer_profiles (
  id          text primary key references users (id) on delete cascade,
  headline    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table client_profiles (
  id                      text primary key references users (id) on delete cascade,
  trainer_id              text not null references trainer_profiles (id) on delete restrict,
  goal                    client_goal not null,
  height_cm               numeric(5,1) not null,
  start_weight_kg         numeric(5,1) not null,
  target_weight_kg        numeric(5,1) not null,
  -- MacroTargets, flattened. Stored per client; nutrition_days snapshots them
  -- per day so historical days keep the targets that were live at the time.
  target_calories         integer not null,
  target_protein          integer not null,
  target_carbs            integer not null,
  target_fat              integer not null,
  joined_at               date not null,
  -- Rolled up by the backend over a trailing 7-day window (plan section 7.1).
  compliance_score        integer not null default 0 check (compliance_score between 0 and 100),
  compliance_status       compliance_status not null default 'yellow',
  last_logged_at          timestamptz,
  compliance_streak_days  integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index client_profiles_trainer_id_idx on client_profiles (trainer_id);

-- The plan denormalises trainer_profiles.clientIds. Deriving it keeps one
-- source of truth (client_profiles.trainer_id) while still handing the API
-- layer the array shape TrainerProfile declares.
create view v_trainer_profiles as
  select t.id,
         u.role,
         u.name,
         u.email,
         u.avatar_url,
         t.headline,
         coalesce(
           array(select c.id from client_profiles c where c.trainer_id = t.id order by c.id),
           '{}'::text[]
         ) as client_ids
  from trainer_profiles t
  join users u on u.id = t.id;

-- ---------------------------------------------------------------------------
-- 2. Training & programming
-- ---------------------------------------------------------------------------

create table exercises (
  id            text primary key,
  name          text not null,
  muscle_group  muscle_group not null,
  equipment     text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index exercises_muscle_group_idx on exercises (muscle_group);

-- Routines carry no dates. Days are weekdays; a weekday with no row is a rest day.
create table routines (
  id          text primary key,
  trainer_id  text not null references trainer_profiles (id) on delete cascade,
  title       text not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index routines_trainer_id_idx on routines (trainer_id);

create table routine_days (
  id          text primary key,
  routine_id  text not null references routines (id) on delete cascade,
  weekday     weekday not null,
  name        text,
  focus       muscle_group not null,
  notes       text,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (routine_id, weekday)
);

create index routine_days_routine_id_idx on routine_days (routine_id);

create table routine_exercises (
  id              text primary key,
  routine_day_id  text not null references routine_days (id) on delete cascade,
  exercise_id     text not null references exercises (id) on delete restrict,
  name            text not null,          -- denormalised from exercises
  muscle_group    muscle_group not null,  -- denormalised from exercises
  sets            integer not null check (sets > 0),
  rep_min         integer not null check (rep_min > 0),
  rep_max         integer not null,
  rest_seconds    integer not null default 90,
  target_rpe      numeric(3,1) not null check (target_rpe between 1 and 10),
  notes           text,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (rep_max >= rep_min)
);

create index routine_exercises_day_idx on routine_exercises (routine_day_id, position);

create table routine_assignments (
  id           text primary key,
  routine_id   text not null references routines (id) on delete cascade,
  client_id    text not null references client_profiles (id) on delete cascade,
  -- Copy-on-write: no rows in routine_assignment_days means the client follows
  -- the template verbatim. The moment the trainer customises anything, the days
  -- are snapshotted into the child tables and the template stops reaching them.
  customised   boolean not null default false,
  assigned_at  timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (routine_id, client_id)
);

create index routine_assignments_routine_idx on routine_assignments (routine_id);
create index routine_assignments_client_idx  on routine_assignments (client_id);

create table routine_assignment_days (
  id             text primary key,
  assignment_id  text not null references routine_assignments (id) on delete cascade,
  weekday        weekday not null,
  name           text,
  focus          muscle_group not null,
  notes          text,
  position       integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (assignment_id, weekday)
);

create table routine_assignment_exercises (
  id                        text primary key,
  assignment_day_id         text not null references routine_assignment_days (id) on delete cascade,
  exercise_id               text not null references exercises (id) on delete restrict,
  name                      text not null,
  muscle_group              muscle_group not null,
  sets                      integer not null check (sets > 0),
  rep_min                   integer not null check (rep_min > 0),
  rep_max                   integer not null,
  rest_seconds              integer not null default 90,
  target_rpe                numeric(3,1) not null check (target_rpe between 1 and 10),
  notes                     text,
  position                  integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  check (rep_max >= rep_min)
);

create index routine_assignment_exercises_day_idx on routine_assignment_exercises (assignment_day_id, position);

-- Dated, scheduled workouts.
create table workout_sessions (
  id                text primary key,
  client_id         text not null references client_profiles (id) on delete cascade,
  title             text not null,
  scheduled_for     date not null,
  estimated_minutes integer not null default 60,
  focus             muscle_group not null,
  status            session_status not null default 'scheduled',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workout_sessions_client_date_idx on workout_sessions (client_id, scheduled_for desc);
create index workout_sessions_status_idx      on workout_sessions (client_id, status);

create table session_exercises (
  id            text primary key,
  session_id    text not null references workout_sessions (id) on delete cascade,
  exercise_id   text not null references exercises (id) on delete restrict,
  name          text not null,
  muscle_group  muscle_group not null,
  notes         text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index session_exercises_session_idx on session_exercises (session_id, position);

-- PrescribedSet has no id in the domain model, so the key is synthetic and
-- `position` is what the client reads back as array order.
create table prescribed_sets (
  id                  bigint generated always as identity primary key,
  session_exercise_id text not null references session_exercises (id) on delete cascade,
  position            integer not null,
  reps                integer not null check (reps > 0),
  target_weight_kg    numeric(6,2),
  unique (session_exercise_id, position)
);

-- Completed workouts.
create table workout_logs (
  id                text primary key,
  client_id         text not null references client_profiles (id) on delete cascade,
  session_id        text references workout_sessions (id) on delete set null,
  title             text not null,
  date              date not null,
  duration_minutes  integer not null,
  rpe               numeric(3,1) not null check (rpe between 1 and 10),
  total_volume_kg   numeric(10,2) not null default 0,
  notes             text,
  completed_at      timestamptz not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index workout_logs_client_date_idx on workout_logs (client_id, date desc);
create index workout_logs_session_idx     on workout_logs (session_id);

create table logged_exercises (
  id              text primary key,
  workout_log_id  text not null references workout_logs (id) on delete cascade,
  exercise_id     text not null references exercises (id) on delete restrict,
  name            text not null,
  muscle_group    muscle_group not null,
  position        integer not null default 0
);

create index logged_exercises_log_idx on logged_exercises (workout_log_id, position);

create table logged_sets (
  id                  text primary key,
  logged_exercise_id  text not null references logged_exercises (id) on delete cascade,
  position            integer not null default 0,
  reps                integer not null,
  weight_kg           numeric(6,2) not null,
  completed           boolean not null default true
);

create index logged_sets_exercise_idx on logged_sets (logged_exercise_id, position);
