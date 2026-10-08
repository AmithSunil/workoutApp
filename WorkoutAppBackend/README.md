# WorkoutAppBackend

Supabase backend for WorkoutApp, implementing `../BACKEND_DATA_SCHEMA.md`.

Staging project ref: `vxytcykmeskjdyxtrjco`. Which backend the app talks to is
set in `../WorkoutAppFrontend/.env.local` — see `.env.example` there.

## Layout

```
supabase/migrations/   the schema, in order; versions match the staging ledger
supabase/future/       drafted, NOT applied
seed/seed.mjs          flattens ../WorkoutAppFrontend/src/mock-api/*.json into the schema
seed/seed.sql          the same data pre-rendered as upserts, for the SQL editor
```

## Environments and releases

| | Where | Data | Razorpay |
|---|---|---|---|
| **Local** | `npx supabase start` (Docker) | seed fixtures + dev logins | test keys in `supabase/functions/.env` |
| **Staging** | `vxytcykmeskjdyxtrjco` | seed fixtures + dev logins | test keys |
| **Production** | not created yet — at launch | real users only | live keys |

**The migration folder is the only way the schema changes.** Every file's version
matches the staging ledger (`supabase_migrations.schema_migrations`). SQL pasted
into the dashboard, or applied through an MCP tool, gets a different version and
drifts — that is how 11 files ended up differing from what ran, found and
reconciled 2026-10-08 (`20261008140000_sync_live_drift`).

### Day to day (local)

```sh
cd WorkoutAppBackend
npx supabase start        # first run pulls images; prints URLs and keys
npx supabase db reset     # rebuild from migrations + seed, any time
npx supabase stop
```

Studio at http://127.0.0.1:54323, sign-in codes land in http://127.0.0.1:54324.
Dev logins: any fixture user's email (e.g. `maya@corda.fit`) with the password
in `seed/auth_dev_users.sql`. Point the app here with the local block in
`../WorkoutAppFrontend/.env.example`. Edge functions need
`supabase/functions/.env` (copy `.env.example`).

### Changing the schema

1. `npx supabase migration new <what_it_does>` and write the SQL.
2. `npx supabase db reset`, then try it in the app against local.
3. Release it (below).

### Releasing to staging (later: production)

```sh
npx supabase link --project-ref vxytcykmeskjdyxtrjco   # once; asks for the DB password
npx supabase db push --dry-run                        # lists exactly what will run
npx supabase db push
npx supabase functions deploy                         # verify_jwt comes from config.toml
npx supabase secrets set --env-file supabase/functions/.env   # only when a secret changed
```

Pending on staging right now: `20261008140000_sync_live_drift` (a no-op there).

### Launch day: creating production

1. New project **Corda**, region `ap-south-1` (Mumbai). Free projects pause after
   a week idle, which is why it is not created ahead of time.
2. `npx supabase link --project-ref <prod-ref>`, then `db push` and `functions deploy`.
   **No seed and no `auth_dev_users.sql`** — production starts empty.
   Optionally `seed/preset_routines.sql` for the routine library.
3. `npx supabase secrets set` with the live Razorpay keys and `AI_API_KEY`.
4. Razorpay live mode: create the four plans, `update plans set razorpay_plan_id = ...`
   (as on staging, see `../tasks/billing-todo.md`), and register a webhook at
   `https://<prod-ref>.supabase.co/functions/v1/razorpay-webhook`; its secret
   becomes `RAZORPAY_WEBHOOK_SECRET`.
5. Dashboard → Authentication: SMTP, both email templates and subjects (the same
   as `supabase/config.toml`), email OTP length 6, Site URL `https://corda.fit`.
6. The web host's environment: `EXPO_PUBLIC_SUPABASE_URL` / `_KEY` of production.
7. Point `link` back at staging for day-to-day releases.

## Schema shape

The fixtures the app ships are deeply nested because that is what
`src/types/models.ts` declares. The database is normalised, so the nesting
becomes child tables and array order is preserved in a `position` column:

| domain type        | tables |
|--------------------|--------|
| `Routine`          | `routines` → `routine_days` → `routine_exercises` |
| `RoutineAssignment`| `routine_assignments` → `routine_assignment_days` → `routine_assignment_exercises` |
| `WorkoutSession`   | `workout_sessions` → `session_exercises` → `prescribed_sets` |
| `WorkoutLog`       | `workout_logs` → `logged_exercises` → `logged_sets` |
| `NutritionDay`     | `nutrition_days` → `food_entries` |
| `Habit`            | `habits` → `habit_completions` |

Reassembling the nested shape is the API layer's job, not the database's.

Two exceptions, both deliberate: `messages.attachment_*` is a discriminated
union of at most one value, so it is columns plus a check constraint; and
`ai_food_suggestions.items` is jsonb because it is throwaway parser output with
a 24-hour TTL that nothing references.

### Computed fields

- `nutrition_days.consumed_*` — maintained by trigger from `food_entries`.
- `threads.last_message_preview` / `last_message_at` — maintained by trigger
  from `messages`.
- `v_trainer_profiles.client_ids` — derived, not stored; the source of truth is
  `client_profiles.trainer_id`.
- `v_trainer_summary` — derived on read; nothing to invalidate.
- `client_profiles.compliance_*` — stored, not yet computed. The 7-day rolling
  calculation in plan section 7.1 has no implementation; the seeded values come
  from the fixtures. This is the main piece of the plan still outstanding.

### Copy-on-write routine customisation

`routine_assignments.customised = false` and no rows in
`routine_assignment_days` means the client follows the template verbatim. On the
first per-client tweak, snapshot the routine's days into
`routine_assignment_days` / `routine_assignment_exercises` and flip the flag;
from then on the template no longer reaches that client.

## Security

### Where it stands

RLS is enabled on all 29 tables. The **policies currently in force are open to
`anon`** -- a development posture, not a production one. Expo inlines
`EXPO_PUBLIC_*` at build time, so the shipped key is always the publishable one
and RLS is the only real boundary.

**Do not point a production build at this project in its current state.**

### What is ready

Auth is wired and the real policy set is written and tested; only the flip is
outstanding.

- `users.auth_user_id uuid` references `auth.users`, nullable (a client can be
  on a roster before they have ever signed in). Text primary keys are untouched.
- Identity resolves through `app_user_id()` / `app_role()`, with
  `is_trainer_of()`, `owns_client()`, `is_my_trainer()`, `in_thread()`,
  `owns_routine()` and `can_read_routine()` as the policy predicates. These are
  SECURITY DEFINER on purpose: a policy on `users` that read `users` to work out
  who you are would recurse.
- All eleven fixture users have email/password accounts
  (`seed/auth_dev_users.sql`, password `apex-dev-2026`). Signing in and calling
  `POST /rest/v1/rpc/app_user_id` returns `t-001`, `c-001` and so on; the anon
  key returns null.
- `supabase/future/20260901000001_auth_rls.sql.pending` holds the real policy
  set. It has been applied inside a transaction, exercised as the trainer and
  two clients, and rolled back -- `tests/rls.sql` re-runs that at any time.
  Measured: the trainer sees 8 clients / 144 logs / 2290 sets / 27 messages; a
  client sees only their own 44 logs, 1 thread, their coach and themselves;
  one client sees zero rows belonging to another; anon sees nothing anywhere.

### What blocks the flip

The app does not sign in. `src/app/index.tsx` is a demo role switcher that
writes a role into `sessionSlice` without a token, so under the real policies
every screen would read zero rows. Order of operations:

1. Replace the role switcher with a real sign-in, and put the Supabase session
   into `sessionSlice`.
2. Swap the transport in `src/api/*` so requests carry the token.
3. Apply `supabase/future/20260901000001_auth_rls.sql.pending`.

Applying it is one transaction and nothing else changes -- the RPCs are
SECURITY INVOKER, so they start obeying these policies rather than needing edits.

## Seeding

```sh
cd seed
NODE_USE_ENV_PROXY=1 \
MOCK_DIR=../../WorkoutAppFrontend/src/mock-api \
SUPABASE_URL=https://vxytcykmeskjdyxtrjco.supabase.co \
SUPABASE_KEY=<publishable key from .env.local> \
node seed.mjs
```

Idempotent upserts throughout, so re-running refreshes rather than duplicates.

`NODE_USE_ENV_PROXY=1` matters behind an HTTP proxy: curl honours `https_proxy`
but Node's `fetch` does not unless told to, and the symptom is a confusing 403
from the proxy rather than a connection error.

Offline fallback, if the host is unreachable: `node seed.mjs --emit-sql`
regenerates `seed/seed.sql`, and `seed/chunks/seed_01..07.sql` are the same
statements split small enough to paste into the Supabase SQL editor. Run the
parts in order — parents before children.

## The API surface

Reads are plain PostgREST: `GET /rest/v1/workout_logs?select=*,logged_exercises(*,logged_sets(*))`
returns the nested tree, and `src/api/*` reshapes it. Single-row inserts are
plain PostgREST too -- every text primary key has a `next_id()` default, so a
client never mints an id.

Writes that span tables are RPCs, because PostgREST cannot put a log, its
exercises and its sets in one transaction, and a half-written workout is exactly
what a phone on a bad connection produces. Each one mirrors a handler in
`src/api/handlers.ts`, takes the same body and returns the same domain shape --
camelCase, nested, optional keys absent rather than null -- so the transport
swap changes nothing above `src/api/*`.

| RPC | replaces |
|-----|----------|
| `create_routine(p_input)` | `POST /routines` |
| `update_routine(p_id, p_patch)` | `PATCH /routines/:id` |
| `assign_routine(p_id, p_client_ids)` | `POST /routines/:id/assign` |
| `duplicate_routine(p_id)` | `POST /routines/:id/duplicate` |
| `create_assignment(p_routine_id, p_client_id)` | `POST /assignments` |
| `customise_assignment(p_id, p_days)` | `PATCH /assignments/:id` |
| `reset_assignment(p_id)` | `POST /assignments/:id/reset` |
| `create_workout_session(p_input)` | `POST /sessions` |
| `create_workout_log(p_input)` | `POST /workouts/logs` |
| `get_or_create_nutrition_day(p_client_id, p_date)` | `GET /nutrition/days/:date` |
| `add_food_entries(p_entries)` | `POST /nutrition/entries[/batch]` |
| `delete_food_entry(p_id)` | `DELETE /nutrition/entries/:id` |
| `toggle_habit(p_id, p_date)` | `POST /habits/:id/toggle` |
| `mark_thread_read(p_thread_id, p_as)` | `POST /threads/:id/read` |
| `create_profile(p_kind, p_name)` | `POST /session/profile` -- an unknown signed-in address becomes a coach or an individual |
| `invite_client(p_name, p_email, p_profile)` | `POST /clients/invite` -- a new client row, or adopts a coachless one via `adopt_client` |
| `revoke_invite(p_id)` | `DELETE /clients/:id/invite` |
| `complete_intake(...)` | `POST /clients/:id/intake` |
| `remove_client(p_client_id)` | `DELETE /clients/:id` -- detaches, never deletes |

The RPCs run **SECURITY INVOKER**, so they obey whatever RLS is in force rather
than bypassing it. `create or replace` takes the attribute from the new
definition, so every migration that re-creates one re-declares `security invoker`.

### Every SECURITY DEFINER function, and why

These are the deliberate exceptions -- the full list (checked against the remote
on 2026-10-07). Each one that is callable by `authenticated` does its own
identity check and never takes the caller's id as a parameter; the advisor
flags each as "signed-in users can execute", which is expected. Anything not in
this list showing up as DEFINER is a bug.

| Function | Why it cannot be INVOKER |
|---|---|
| `next_id` | `id_sequences` has RLS on and no policies. |
| `app_user_id`, `app_role`, `is_trainer_of`, `owns_client`, `is_my_trainer`, `in_thread`, `owns_routine`, `can_read_routine` | Policy predicates: a policy on `users` that read `users` would recurse. |
| `plan_active`, `seat_limit` | Billing reads; `subscriptions` writes are revoked from `authenticated`. |
| `complete_intake` | RLS cannot restrict columns, and a client must never write their own macros -- it fills only null intake columns on the caller's row. |
| `create_profile` | The caller has no `users` row yet, so no policy can admit the insert. Reads `auth.uid()` and the address itself; refuses an existing profile or an invited address (PT409). |
| `remove_client` | A coach cannot write a row they no longer own afterwards. Its trainer-owns-client check is the only gate. |
| `adopt_client` | A coach can neither see nor update a coachless client before adopting them. Repeats `invite_client`'s coach / plan / seat checks because it is callable directly. |
| `link_auth_user`, `bump_thread_unread`, `refresh_thread_preview`, `refresh_nutrition_day_totals` | Trigger functions; execute revoked from the API roles. |

`rls_auto_enable` is Supabase's own.

Errors follow PostgREST's mapping: a bare `raise exception` becomes 400, and the
`PT404` errcode becomes 404, reproducing the mock's status codes.

Read-side renderers (`routine_json`, `assigned_routine_json`, `workout_log_json`,
`workout_session_json`, `nutrition_day_json`, `habit_json`) are callable in their
own right when a nested read is easier than an embed.

Side effects worth knowing, all server-side so they cannot be skipped by a
client: saving a log marks its session `completed`; food entries recompute
`nutrition_days.consumed_*`; sending a message bumps the *recipient's* unread
counter and refreshes the thread preview.

## Verifying

```sh
cd seed
NODE_USE_ENV_PROXY=1 MOCK_DIR=... SUPABASE_URL=... SUPABASE_KEY=... node verify.mjs
```

Two suites. `seed/verify.mjs` pulls every record back through PostgREST, rebuilds the nested
shape `src/types/models.ts` declares, and deep-compares it with the fixture the
row was seeded from. It is the real test of the normalisation: if flattening
lost an ordering, a null, or a numeric precision, it fails here.

`tests/rpcs.mjs` exercises every write RPC against the live project, asserts the
rows and counters that come back, and then undoes everything it did:

```sh
NODE_USE_ENV_PROXY=1 SUPABASE_URL=... SUPABASE_KEY=... node tests/rpcs.mjs
```

Last run: **1053 records compared, 0 mismatched; 44 RPC assertions passed, 0 failed**,
with `verify.mjs` re-run afterwards to confirm the fixtures were left untouched.

Current row counts: 195 sessions / 918 session_exercises / 3095 prescribed_sets,
144 logs / 682 logged_exercises / 2290 logged_sets, 177 nutrition_days / 477
food_entries, 504 body_metrics, 108 photos, 33 habits / 630 completions, 8
threads / 27 messages, 8 alerts, 24 check-ins, 32 exercises, 40 foods.

The six `routine*` tables are empty by design — the routine library ships
unseeded and fills as the trainer builds templates.
