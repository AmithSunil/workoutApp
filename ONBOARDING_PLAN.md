> **Superseded 2026-09-15 by `tasks/plan.md` / `tasks/todo.md`.** Kept for history. Two things below are wrong: `shouldCreateUser: false` blocks every invitee (they have no auth row yet), and `prefill` jsonb can't pre-assign routines/habits/threads (all FK `client_profiles`).

# Client onboarding — review of the proposed flow, and the plan

Reviewed against the repo as of 2026-09-14. Decisions taken with Sneha before writing:
email-only (no SMS), coach keeps ownership of targets, real RLS applied as part of this work.

---

## Part 1 — What's wrong with the flow as written

### A. It names things that don't exist

| Spec says | Reality |
|---|---|
| `client_invites` | no such table |
| `trainer_client_links` (with `status`) | no such table. The link is `client_profiles.trainer_id text not null references trainer_profiles(id)` — one FK, no status, no membership row |
| `client_intake` | no such table |
| `AssignRoutineSheet.tsx` | `src/components/routines/AssignSheet.tsx`, and it is a **client multi-select on a routine**. It has no props for metrics, calories or provisioning and cannot do what the spec assigns to it |
| `MetricsChart.tsx` | `charts/LineChart.tsx`, `BarSeries.tsx`, `Sparkline.tsx` |
| `CalorieRing.tsx` | `charts/CalorieGauge.tsx` |
| `MacroBar.tsx` | `charts/MacroBars.tsx` |
| `DailyChecklist.tsx` | `progress/HabitChecklist.tsx` |
| `(client)/onboarding` | no route, and no entry in `src/navigation/routes.ts` |
| Edge Functions | `WorkoutAppBackend/supabase/` has `migrations/` and `future/` only. **Zero edge functions exist.** No CLI deploy, no secrets, no service_role key in the repo — by deliberate choice |

Building against invented filenames produces dead code. Everything below uses real paths.

### B. "Intake is empty" is unrepresentable

The routing decision hinges on reading an empty intake record. But `client_profiles` has
`goal`, `height_cm`, `start_weight_kg`, `target_weight_kg`, `target_calories`,
`target_protein`, `target_carbs`, `target_fat` and `joined_at` all **NOT NULL**. You cannot
create a client row and leave it blank. There is nothing to test for emptiness.

Fix: don't create the row. *Absence of a `client_profiles` row* is the "needs intake" state.
Every existing screen already assumes a complete profile, and this keeps that true.

### C. "A database trigger on session start" doesn't exist

Postgres has no hook on session start, and PostgREST won't give you one. The real Supabase
hook is `AFTER INSERT ON auth.users` — it fires **once, at account creation**. That is the only
moment the link is needed, so it's sufficient, but the mechanism is different from what the
spec describes and the timing matters (see D).

Two traps on that trigger:

- It must be `SECURITY DEFINER` (it writes `public.users` from an auth-schema context).
- **It must never raise.** A raising trigger on `auth.users` makes sign-up fail with an opaque
  500 and no way to diagnose it from the client. No matching invite → return `new`, silently.

### D. A new OTP user gets signed straight back out

`src/auth/identity.ts` throws `AuthFailure('unlinked')` when `app_user_id()` returns null, and
`useAuthSession.ts` **hard signs out** on `unlinked` (deliberately — otherwise every launch
retries forever). A brand-new account is unlinked by definition. Under the spec's ordering the
client verifies their OTP and is immediately bounced to sign-in reading *"This account isn't
linked to a profile yet. Ask your coach to finish setting it up."*

The link must complete **inside account creation**, before the first `app_user_id()` call.
The `AFTER INSERT ON auth.users` trigger does exactly that. A trigger fired later does not.

### E. `signInWithOtp` creates accounts by default

`shouldCreateUser` defaults to `true`. Anyone typing any address into the client front door gets
a real `auth.users` row, then hits D. Must be `shouldCreateUser: false`, with the invite
lookup as the gate.

### F. No phone column anywhere

`users.email` is `not null unique`; there is no `phone` column in any migration and no phone
field in `src/types/models.ts`. Phone OTP also needs a paid Twilio/MessageBird provider wired
into Supabase Auth. Out of scope (decided) — but the invite table should stay channel-agnostic
enough that adding it later isn't a rewrite.

### G. It contradicts decisions this codebase already made

1. **The coach owns targets.** `GoalsEditor` (Nutrition tab) sets goal, goal weight and macros;
   `HabitEditor` (Metrics tab) sets habits; `Habit.createdBy` is `'trainer'` for everything the
   app creates. The pending RLS set makes this structural: `client_profiles_visible` is
   **select-only** for the client, `client_profiles_trainer_writes` is `for all` to the trainer.
   An intake wizard that writes macros would be refused by the policy you're about to apply.
2. **Tracking mode is ignored entirely.** `trainer_profiles.tracks` is `workout | nutrition |
   both`, **nullable**. A nutrition-only coach's client must not see a workout step; a
   workout-only coach's client must not see dietary or calorie steps. And `tracks` may still be
   null at invite time (it's set by a first-run card on the trainer dashboard). Intake has to
   call `shows()` from `src/utils/tracking.ts` — not re-derive the rule.
3. **The goal derives itself.** `src/utils/goal.ts` `deriveGoal(currentKg, targetKg)` already
   owns this, at save time. Intake must call it, not ask the client to pick a goal.

### H. "Real-time event to the triage dashboard"

**There are zero realtime subscriptions in this codebase.** Nothing calls `.channel()`. The
established pattern is RTK Query with tag invalidation. Adding a realtime connection — lifecycle,
reconnect, auth refresh, teardown — for one notification card is a lot of new surface.

The dashboard already renders `red_flag_alerts` through `AlertCard`. A completed intake is a row
insert in a table the dashboard already fetches. Same outcome, no new transport.

### I. Two provisioning branches is one branch too many

Both branches converge on the same end state: an `auth.users` row, a `users` row, a
`client_profiles` row, and a `trainer_id`. The only difference is *who typed the numbers*.

The Direct Provisioning branch as specced costs: an Edge Function runtime that doesn't exist
yet, a service_role key to store and rotate, a second account-creation path with its own failure
modes, and a second routing outcome. All to skip a wizard.

Collapse it: the trainer always creates an **invite**. The account is always created by the
client verifying their OTP. "Direct provisioning" is just an invite whose `prefill` is non-null —
the trigger inserts `client_profiles` from it and intake is already done. One code path, no
Admin SDK, no Edge Function, no service_role key.

### J. Smaller ones

- **`src/app/index.tsx` is a pure redirect with no data fetch, by design** — the root layout
  holds children until `status` settles so this component has no loading state. Putting a
  `client_intake` query in it re-introduces one. The check belongs in the identity resolve
  (free — it's already a parallel RPC batch) and the redirect in `(client)/_layout.tsx`, which
  already guards on role.
- **`AuthFailureKind` has no OTP case.** `classify()` maps *"Token has expired or is invalid"* to
  `unknown` → "Something went wrong signing in." That's the single most common OTP failure and
  it deserves its own copy.
- **Magic links need deep-link config** — a scheme in `app.json`, universal/app links, and
  session-from-URL handling on native. A 6-digit code needs none of that. Ship OTP only; the
  magic link is a second credential path for the same outcome.
- **Don't mint your own invite token.** Supabase's OTP is already single-use and expiring. A
  second token in `client_invites` is a second thing to expire, rotate and leak.
- **Text PKs.** Auth mints a uuid; this app keys off `c-001`. The trigger must mint via
  `next_id('c')`. Known trap: `seed/seed.sql` inserts explicit ids without advancing
  `id_sequences`, so the first minted id after a fresh seed collides — bump `last_value`.
- **Day-1 "assigned workouts ready to log"** — a new client has zero routines. Routines are
  dateless and assignment is a membership list; `20260913000004_keep_last_routine.sql` is
  **not applied**. The workouts tab needs its empty state, and for a nutrition-only coach the
  client plans their own (that path already exists).
- **Email rate limits.** Supabase's built-in SMTP allows only a handful of messages per hour.
  Custom SMTP has to be configured before this is testable with more than one or two invites.
  The default template also says "Confirm your signup", which is wrong copy for an invite.
- **Migration drift.** The folder is not the remote. Check `list_migrations` before adding to it.
  `20260913000004` is unapplied; `20260913000002` is unverified.

---

## Part 2 — The plan

### The shape

One new table. No link table (the FK is the link). No intake table (the `client_profiles` row
*is* the intake, and it doesn't exist until intake completes). No status enum (`claimed_by is
null` is the status). No Edge Functions. No realtime. No Admin SDK.

```
trainer fills invite ─► client_invites row (claimed_by null)
                              │
client types email ──► signInWithOtp({ shouldCreateUser: false })
                              │
        …no invite? ─────────► "Ask your coach for an invite." (never creates an account)
                              │
client types 6 digits ► verifyOtp ► auth.users INSERT
                              │
                  AFTER INSERT trigger: claim_invite()
                     • users row, id = next_id('c'), auth_user_id set
                     • client_profiles from invite.prefill, if present
                     • invite.claimed_by set
                              │
        resolveIdentity() ──► userId + role + needsIntake, already linked
                              │
         needsIntake ─► (client)/onboarding ─► complete_intake RPC ─► alert row
                     └─► (client)/(tabs)/log
```

---

### Phase 1 — Schema

`WorkoutAppBackend/supabase/migrations/20260914000001_client_invites.sql`

```sql
create table client_invites (
  id         text primary key default next_id('inv'),
  trainer_id text not null references trainer_profiles (id) on delete cascade,
  email      text not null,
  name       text not null,
  -- Non-null = the coach filled the numbers in; the trigger writes
  -- client_profiles from it and the client skips the wizard.
  prefill    jsonb,
  claimed_by text references users (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index client_invites_open_email
  on client_invites (lower(email)) where claimed_by is null;
create index client_invites_trainer_idx on client_invites (trainer_id);
alter table client_invites enable row level security;
```

- No `status` column — two derivable values are dead state.
- Partial unique index: one open invite per address, but the same person can be re-invited
  after a claim.
- `prefill` as jsonb rather than ten nullable columns: it is written once, read once, and never
  queried by field.

`20260914000002_claim_invite.sql` — the trigger:

```sql
create function public.claim_invite() returns trigger
language plpgsql security definer set search_path = '' as $$
declare inv public.client_invites; uid text;
begin
  select * into inv from public.client_invites
   where lower(email) = lower(new.email) and claimed_by is null limit 1;
  if not found then return new; end if;   -- unlinked account, handled by the app

  uid := public.next_id('c');
  insert into public.users (id, role, name, email, auth_user_id)
       values (uid, 'client', inv.name, new.email, new.id);

  if inv.prefill is not null then
    insert into public.client_profiles (id, trainer_id, goal, height_cm,
      start_weight_kg, target_weight_kg, target_calories, target_protein,
      target_carbs, target_fat, joined_at)
    select uid, inv.trainer_id, (inv.prefill->>'goal')::client_goal, …, current_date;
  end if;

  update public.client_invites set claimed_by = uid where id = inv.id;
  return new;
exception when others then
  -- Never fail account creation. An unclaimed invite is a recoverable state;
  -- a 500 out of auth.users is not.
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.claim_invite();
```

`20260914000003_intake_defaults.sql`

```sql
alter table client_profiles
  alter column target_calories set default 2000,
  alter column target_protein  set default 150,
  alter column target_carbs    set default 200,
  alter column target_fat      set default 65;
-- ponytail: flat starter macros, not a computed estimate. Mifflin-St Jeor needs
-- age and sex, which intake doesn't collect. Coach sets real numbers in triage;
-- the intake-complete alert is what makes sure they do.
```

Plus a new `AlertKind` value `'intake-complete'` on the `alert_kind` enum.

**Before writing any of this: run `list_migrations` against the remote.** The folder is not the
remote, and that drift has already cost one full day of debugging (see `backend_schema.md`).
Bump `id_sequences.last_value` for the `c` and `inv` prefixes after any reseed.

---

### Phase 2 — RLS, in one transaction

Apply `supabase/future/20260901000001_auth_rls.sql.pending` plus three additions, together:

```sql
create policy client_invites_trainer on client_invites for all to authenticated
  using (trainer_id = app_user_id()) with check (trainer_id = app_user_id());
-- Nothing for anon. The claim happens inside the DEFINER trigger, so the
-- invite table is never a client-side read. An anon-readable invite table is
-- an email-enumeration oracle.

create policy client_profiles_self_insert on client_profiles for insert
  to authenticated with check (id = app_user_id());
-- complete_intake is SECURITY INVOKER, so the client needs to insert their own
-- first row. Update stays trainer-only: targets are still the coach's.
```

...and the client-authored-routine policy already flagged as missing in `tracking_mode.md` —
without it, applying RLS breaks client self-planning for nutrition-only coaches.

Re-run `tests/rls.sql`, extended with: a client can insert their own `client_profiles` row and
not another's; a trainer sees only their own invites; anon sees no invites.

Test everything inside `begin` / `rollback` with the `raise exception 'REPORT %'` technique from
`auth.md` first.

---

### Phase 3 — Backend RPC

`20260914000004_complete_intake.sql` — `complete_intake(height numeric, start_kg numeric,
target_kg numeric, goal client_goal)`, **SECURITY INVOKER** (re-declare it explicitly — `CREATE
OR REPLACE` takes the attribute from the new definition):

1. insert `client_profiles` for `app_user_id()` with `trainer_id` read from the claimed invite,
   macros defaulted
2. insert one `body_metrics` weigh-in at `start_kg` (so the weight chart isn't empty on day 1)
3. insert a `red_flag_alerts` row, kind `intake-complete`, for that trainer

`goal` comes from the client via the existing `deriveGoal()` — don't reimplement that rule in
plpgsql.

---

### Phase 4 — Auth module

- `src/auth/otp.ts` — `sendOtp(email)` (`signInWithOtp({ email, options: { shouldCreateUser:
  false } })`) and `verifyOtp(email, token)` (`type: 'email'`). Nothing outside `src/auth/*`
  touches `supabase.auth` — the containment rule holds.
- `src/auth/errors.ts` — two new `AuthFailureKind`s: `'otpInvalid'` (matches *"token has
  expired or is invalid"*) and `'noInvite'` (matches *"signups not allowed"* /
  *"user not found"*), with real copy. Currently both land in `unknown`.
- `src/auth/identity.ts` — add `supabase.rpc('app_needs_intake')` as a **third parallel call** in
  the existing `Promise.all`; return `needsIntake` on `AppIdentity`. Two-line diff, no latency
  cost, no change to existing behaviour.
  *(Optional follow-up: collapse all three into one `app_identity()` returning jsonb — less code
  and one round trip instead of three, twice per cold start. Not required for this work.)*
- `src/auth/useAuthSession.ts` + `sessionSlice` — carry `needsIntake` through. It is **not** a
  new status; `signedIn` still means signed in.
- Don't cache `needsIntake` in `workoutapp:identity:v2` — it's true exactly once and a stale
  `true` traps a client in the wizard forever.

---

### Phase 5 — Client screens

- `src/app/sign-in.tsx` — a "I have an invite" link to the OTP screen. The existing
  password form stays: it's the trainer front door and what `DevQuickSignIn` drives.
- `src/app/otp.tsx` — one screen, two states (email → code). `Input` and `Button` primitives
  already exist. Resend with a 60s cooldown (the Supabase limit is stricter than users assume).
- `src/app/(client)/onboarding.tsx` — sibling of `chat.tsx` and `profile.tsx`, i.e. **outside
  `(tabs)`**, so it has no tab bar. One scroll, not a multi-step wizard:
  - height, current weight, goal weight — always
  - `shows(tracks, 'nutrition')` → free-text dietary notes
  - `shows(tracks, 'workout')` → nothing; the routine is the coach's
  - no goal picker (`deriveGoal` on submit), no macros, no habits
  - Submit → `complete_intake`, then `router.replace(routes.client.log())`
  - Dietary notes go out as the first message in the coach thread — no migration, and it lands
    where the coach actually reads it.
- `src/app/(client)/_layout.tsx` — `if (needsIntake) return <Redirect href=…/>`. Beside the
  existing role guard. **Not** in `index.tsx`.
- `src/navigation/routes.ts` — `routes.otp()`, `routes.client.onboarding()`.

---

### Phase 6 — Trainer screens

- `src/app/(trainer)/invite.tsx` — reached from a `+` in the roster header. Name + email, and a
  "set their numbers up now" toggle revealing height / current / goal weight / macros. Toggle on
  → `prefill`, client skips the wizard. Toggle off → they get the wizard. One screen, one
  mutation, both spec branches.
  Don't reuse `GoalsEditor` here — it's a `Sheet` keyed to an existing client id and contorting
  it costs more than the plain fields.
- `src/api/endpoints/trainerApi.ts` + `handlers.ts` + `src/api/supabase/` — `POST /invites`,
  `GET /invites`, `DELETE /invites/:id`. Plain PostgREST single-row writes, both transports,
  matching the existing convention. Invalidates `ClientList`.
- Triage: **no new dashboard section.** Tag `'intake-complete'` in `ALERT_DOMAIN` as
  always-shown (like `check-in-due`), give `AlertCard` its icon and copy, and deep-link it to
  `(trainer)/client/[id]` Nutrition tab where `GoalsEditor` already lives. The dashboard already
  fetches alerts; nothing new to wire.
- Pending invites in the roster: skipped. Add a count chip when someone asks for it.

---

### Phase 7 — Verify

Build only, per the workspace rule.

- `npx tsc --noEmit` and the lint pass (`expo export` can't run in the local VM — see
  `verification.md`; `npm install` needs the EACCES workaround in `local_vm.md`).
- Replay all four migrations offline against real Postgres in the cloud container before
  touching the remote.
- `tests/rls.sql` with the three new assertions.
- One end-to-end pass on the remote: create an invite as `t-001`, verify an OTP for a throwaway
  address, confirm `app_user_id()` returns a fresh `c-0xx` **on the first call**, walk the
  wizard, confirm the alert lands on the trainer dashboard.
- Configure custom SMTP and rewrite the OTP email template before testing more than two invites.

---

### Order, and what it depends on

1 → 2 → 3 must be sequential (the RPC needs the policy; the policy needs the table).
4 → 5 and 6 can run in parallel once 3 is on the remote. 7 continuously.

**Skipped deliberately:** magic links (OTP alone is enough and needs no deep-link config), SMS,
Edge Functions, the Admin SDK, realtime, a `trainer_client_links` table, an invite-status enum,
computed macro estimates, pending invites in the roster. Add SMS when a paid provider is wired
up; add realtime when polling visibly lags; add the rest when something actually needs them.
