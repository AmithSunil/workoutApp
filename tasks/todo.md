# Todo: Client onboarding

See `tasks/plan.md` for the reasoning. Workspace rule: **build only; run tests only when asked.**
"Build" means `npx tsc --noEmit` locally, plus `expo export --platform android` and then `--platform
web` in the cloud container (see project memory `verification`).
Backend changes are replayed offline against Postgres 16 in the cloud container before they touch the remote.

## Status: 2026-09-15

- **Code for T1–T9 is written.** tsc is clean, and the android and web exports succeed. The T12 Google code is not written.
- **Migrations 20260915000002..05 are applied to the remote** under the names `intake_alert_kind`, `invite_clients`, `claim_on_signup` and `complete_intake`.
  - Replayed offline first.
  - The whole flow was dry-run on the remote in a rolled-back transaction: invite, then hook, then link on signup, then `complete_intake`, then alert and note message.
- **The T2 policies are in the pending file and pass `tests/rls.sql` offline.** They are not applied (T10).
- **Still manual:**
  - T0 (SMTP and OTP templates)
  - **enabling the Before User Created hook** (T5)
  - the manual checks in Checkpoints A–C
  - T10

---

## Phase 0: Config

### Task 0: Supabase Auth config (manual, dashboard)
**Description:** Set up custom SMTP. Change the *Confirm signup* and *Magic Link* templates so they
show the 6-digit `{{ .Token }}` with invite-appropriate wording. Confirm the OTP length is 6 and the
expiry is ≤ 1 h.
**Acceptance criteria:**
- [ ] Sending a code to a new address arrives through custom SMTP with a 6-digit code and no confirm link
- [ ] The rate limit allows at least 30 emails/hour
**Verification:** Manual: request a code for a test address (via `POST /auth/v1/otp`, or from the app once T6 is done)
**Dependencies:** None
**Files:** none (dashboard)
**Scope:** XS

---

## Phase 1: Trainer adds a client

### Task 1: Schema and invite RPCs
**Description:** Make pending clients possible and give trainers a single call to create one.
- `20260915000002_intake_alert_kind.sql`: `alter type alert_kind add value 'intake-complete'` (its own migration).
- `20260915000003_invite_clients.sql`:
  - drop NOT NULL on `client_profiles.height_cm`, `start_weight_kg` and `target_weight_kg`
  - defaults: `goal 'recomp'`, `joined_at current_date`, starter macros (2000 / 150 / 200 / 65), with a `ponytail:` comment
  - `invite_client(p_name, p_email, p_profile jsonb default null)`, SECURITY INVOKER: mints `next_id('c')`, inserts `users` (lowercased email, role `client`), `client_profiles` (`trainer_id = app_user_id()`, optional numbers from `p_profile`) and `threads`; returns `client_json`-style output
  - `revoke_invite(p_client_id)`, INVOKER: deletes the `users` row only if `auth_user_id is null` and the caller coaches that client; otherwise `PT404`
  - `v_trainer_summary` excludes clients with a null `auth_user_id`
  - explicit `revoke execute … from anon`, and `grant … to authenticated`
**Acceptance criteria:**
- [ ] `invite_client` as `t-001` creates all three rows, and a duplicate email raises 23505 (mapped to 409)
- [ ] `revoke_invite` on a linked client does nothing and returns 404
- [ ] The whole migration chain plus `seed.sql` replays cleanly on offline Postgres
**Verification:**
- [ ] Offline replay (recipe in memory `verification`)
- [ ] `list_migrations` checked, then `apply_migration` for each file under the file's name
**Dependencies:** None
**Files:** `WorkoutAppBackend/supabase/migrations/20260915000002_*.sql`, `…000003_*.sql`, `WorkoutAppBackend/README.md`
**Scope:** S

### Task 2: RLS additions (authored now, applied in T10)
**Description:** Add the policies this flow needs to `supabase/future/20260901000001_auth_rls.sql.pending`:
- `users_trainer_insert_client`: insert where `role = 'client' and app_role() = 'trainer'`
- `client_profiles_trainer_insert`: insert where `trainer_id = app_user_id()` (`is_trainer_of(id)` can't see the new row)
- `threads_trainer_insert`: insert where `trainer_id = app_user_id()`
- `users_trainer_delete_pending`: delete where `auth_user_id is null and is_trainer_of(id)`
- the client-authored-routine policy flagged in memory `tracking_mode`

Extend `tests/rls.sql` with these checks:
- a trainer can invite a client and revoke a pending one
- a trainer can't revoke a linked client
- a client can't insert a profile
- the policies behave as before for the existing fixtures
**Acceptance criteria:**
- [ ] Offline replay of the migrations, the pending file and `tests/rls.sql` passes with the new checks
- [ ] Under RLS, `invite_client` works for `t-001`, and fails for `c-001` and for anon
**Verification:** Offline replay only (tests run when asked)
**Dependencies:** T1
**Files:** `WorkoutAppBackend/supabase/future/20260901000001_auth_rls.sql.pending`, `WorkoutAppBackend/tests/rls.sql`
**Scope:** S

### Task 3: API layer and nullable profile types
**Description:**
- `ClientProfile.heightCm`, `startWeightKg` and `targetWeightKg` become `number | null`
- new field `invited: boolean`, from `users.auth_user_id is null`, added to the `CLIENT` select in `rows.ts` (keep it one string literal)
- `POST /clients/invite` and `DELETE /clients/:id/invite` in `handlers.ts` (mock) and `src/api/supabase/routes.ts` (RPC)
- `trainerApi` mutations that invalidate `ClientList`
- fix every `tsc` error: show "—", and skip the goal-weight line on charts when the value is null
- `WeighInPrompt` and `GoalsEditor`'s fallback to `startWeightKg` must handle null
**Acceptance criteria:**
- [ ] `npx tsc --noEmit` is clean
- [ ] Both transports return the same shape for an invited client (checked against mock and remote)
- [ ] An invited client with null numbers opens every trainer client-detail tab without crashing
**Verification:** Build (tsc, then android and web export)
**Dependencies:** T1
**Files:** `src/types/models.ts`, `src/api/handlers.ts`, `src/api/supabase/routes.ts`, `src/api/supabase/rows.ts`, `src/api/endpoints/trainerApi.ts` (+ the display sites `tsc` reports)
**Scope:** M (the display fixes are one-line edits)

### Task 4: Invite screen, share sheet, and roster group
**Description:**
- `src/app/(trainer)/invite.tsx`: name and email (required); a "Set their numbers now" toggle reveals height, current weight and goal weight. On submit it calls the mutation and then `Share.share()` with a message that names the coach, the **exact email to sign in with**, and `INVITE_LINK` from `src/constants/`.
- Roster: a `+` in the header; invited clients appear in their own "Invited" group and are left out of the counts and the "need attention" subtitle.
- Client detail for an invited client: an "Invited" chip, a "Share invite again" button and a "Revoke" button (behind a screen-level confirm, since `Alert.alert` does nothing on web).
- `routes.trainer.invite()`.
**Acceptance criteria:**
- [ ] A trainer can add a client, the share sheet opens with the right email, and the client appears under "Invited"
- [ ] The trainer can open the invited client and assign a routine, habits and goals with the existing editors
- [ ] Revoke removes the client, and a second revoke returns an error
**Verification:** Build; manual run on Android against the mock transport
**Dependencies:** T3
**Files:** `src/app/(trainer)/invite.tsx`, `src/app/(trainer)/(tabs)/roster.tsx`, `src/app/(trainer)/client/[id].tsx`, `src/navigation/routes.ts`, `src/constants/invite.ts`
**Scope:** M

## Checkpoint A: Trainer side
- [ ] tsc clean; android and web export succeed
- [ ] On the remote (open policies): `t-001` invites a throwaway address, assigns a routine and habits, and revokes an invite
- [ ] Review with Sneha before continuing

---

## Phase 2: Client signs in with a code

### Task 5: Signup gate hook and link trigger
**Description:** In `20260915000004_claim_on_signup.sql`:
- `hook_require_invite(event jsonb) returns jsonb`: SECURITY DEFINER, `search_path = ''`. Returns `{}` when `users` has a row with `lower(email) = lower(event->'user'->>'email')`, `role = 'client'` and `auth_user_id is null`; otherwise returns `{"error":{"http_code":403,"message":"no_invite"}}`. EXECUTE goes to `supabase_auth_admin` only, and is revoked from anon, authenticated and public.
- `link_auth_user()`: AFTER INSERT on `auth.users`, DEFINER. Sets `auth_user_id = new.id` on that pending row. For any provider other than `email`, it requires `new.email_confirmed_at is not null`. Wrapped in `exception when others then return new`.

Then enable the hook in Dashboard → Auth → Hooks (manual).
**Acceptance criteria:**
- [ ] A new auth user with a pending email is linked in the same statement
- [ ] A new auth user with no pending email is rejected by the hook, and no row is created
- [ ] Forcing an error inside the trigger (tested inside `begin`/`rollback`) still lets the insert through
**Verification:** Offline replay, using a stub `auth.users` insert for the trigger; the hook is called directly with a sample payload
**Dependencies:** T1
**Files:** `WorkoutAppBackend/supabase/migrations/20260915000004_claim_on_signup.sql`
**Scope:** S

### Task 6: OTP sign-in
**Description:**
- `src/auth/otp.ts`:
  - `sendCode(email)` calls `signInWithOtp({ email })`, leaving `shouldCreateUser` at its default. Add a comment explaining why: the hook is the gate.
  - `verifyCode(email, token)` uses `type: 'email'`.
  - export both from `@/auth`.
- `errors.ts`: kinds `otpInvalid` ("That code is wrong or has expired.") and `noInvite` ("That email isn't on a coach's roster. Use the address your coach invited.").
- `src/app/otp.tsx`: one screen with two states (email, then code), a 60 s resend cooldown, and the `Input` and `Button` primitives.
- `sign-in.tsx`: a "Coach invited you? Sign in with a code" link. The password form stays.
- `routes.otp()`.
**Acceptance criteria:**
- [ ] An invited email gets a code; entering it signs in, and the first `app_user_id()` returns the new `c-0xx`
- [ ] An uninvited email shows the `noInvite` copy and creates no `auth.users` row
- [ ] A wrong or expired code shows the `otpInvalid` copy
**Verification:** Build; manual run on the remote with a throwaway address
**Dependencies:** T0, T5
**Files:** `src/auth/otp.ts`, `src/auth/errors.ts`, `src/auth/index.ts`, `src/app/otp.tsx`, `src/app/sign-in.tsx`, `src/navigation/routes.ts`
**Scope:** M

## Checkpoint B: A client can get in
- [ ] End to end: a pre-configured client (all numbers set by the trainer) signs in and lands on `log` with no intake screen
- [ ] tsc clean; android and web export succeed

---

## Phase 3: Intake and routing

### Task 7: `complete_intake` RPC
**Description:** In `20260915000005_complete_intake.sql`, add `complete_intake(p_height, p_weight, p_target, p_goal, p_notes)`, SECURITY DEFINER with a guard (it must be the caller's own row, and only while intake is pending). It:
- sets `height_cm` and `start_weight_kg`
- sets `target_weight_kg` and `goal` only if `target_weight_kg` was null
- inserts one `body_metrics` weigh-in for today
- inserts a `red_flag_alerts` row (`intake-complete`, severity `info`)
- if notes are present, posts them as the client's first message in their thread

Re-declare `security definer` explicitly, and grant EXECUTE to authenticated only. Add `POST /me/intake` to both transports. It invalidates `Client` and `ClientOverview`, plus whichever tag `GET /trainer/alerts` provides.
**Acceptance criteria:**
- [ ] A second call after completion returns 409
- [ ] It never changes macros, and never changes the goal when the coach has set a goal weight
- [ ] The alert appears in `GET /trainer/alerts` for that trainer
**Verification:** Offline replay; build
**Dependencies:** T1, T3
**Files:** migration, `src/api/handlers.ts`, `src/api/supabase/routes.ts`, `src/api/endpoints/progressApi.ts` (where the client's own writes live; confirm first)
**Scope:** S

### Task 8: Onboarding screen and redirect
**Description:**
- `src/app/(client)/onboarding.tsx`, outside `(tabs)`, as one scrolling form:
  - height and current weight, always
  - goal weight, only when the coach left it null
  - health and diet notes, free text; the placeholder mentions dietary preferences only when `shows(tracks, 'nutrition')`
  - on submit: `deriveGoal()`, then the mutation, then `router.replace(routes.client.log())`
- `(client)/_layout.tsx`: `useGetClientQuery(userId)`. Render `null` while loading. If `heightCm` or `startWeightKg` is null, redirect to onboarding, except when the current route is already onboarding. Register `<Stack.Screen name="onboarding" />`.
- `routes.client.onboarding()`.
**Acceptance criteria:**
- [ ] A blank invited client lands on onboarding, can't reach the tabs, and lands on `log` after submitting
- [ ] A pre-configured client never sees onboarding
- [ ] The tab set and copy follow `shows()` for a workout-only and a nutrition-only coach
**Verification:** Build; manual run on Android
**Dependencies:** T6, T7
**Files:** `src/app/(client)/onboarding.tsx`, `src/app/(client)/_layout.tsx`, `src/navigation/routes.ts`
**Scope:** M

### Task 9: Triage alert
**Description:**
- Add `'intake-complete'` to `AlertKind` and to `ALERT_DOMAIN` as always-shown.
- `AlertCard` gets an icon and copy ("Jane finished setup — set her targets").
- The alert deep-links to client detail: the Nutrition tab if the coach tracks nutrition, otherwise Metrics.
- Check that the client workouts empty state reads well for a client with no routine.
**Acceptance criteria:**
- [ ] The alert shows on the dashboard for every tracking mode and opens the correct tab
- [ ] The tab-bar badge counts it
**Verification:** Build
**Dependencies:** T7
**Files:** `src/types/models.ts`, `src/utils/tracking.ts`, `src/components/trainer/AlertCard.tsx`, `src/api/handlers.ts` (mock alert)
**Scope:** S

## Checkpoint C: Whole flow on open policies
- [ ] Blank client: invite, code, onboarding, log; the coach sees the alert and sets macros; today's bars update (the `nutrition_days` snapshot rule)
- [ ] Pre-configured client: invite, code, log, with routine, habits and chat thread already there
- [ ] Review with Sneha

---

## Phase 4: Lock down

### Task 10: Apply RLS to the remote
**Description:** Apply the pending RLS file with the T2 additions in one transaction, with no other changes, as `20260915000006_auth_rls.sql`. Drop the open `*_dev_*` policies in the same transaction.
**Acceptance criteria:**
- [ ] `tests/rls.sql` numbers match the ones recorded in the pending file, plus the new checks
- [ ] Checkpoint C's two flows still work on the remote
- [ ] The security advisor shows no new warnings
**Verification:** A dry run inside `begin` / `rollback` (the `raise exception 'REPORT %'` technique), then apply
**Dependencies:** Checkpoint C
**Files:** migration (moved from `future/`)
**Scope:** S (high risk)

## Checkpoint D: Ship-ready (email path)
- [ ] All acceptance criteria above are met
- [ ] Memory and README updated (`onboarding`, `auth`, `backend_schema`)

---

## Phase 5: Google (later)

### Task 11: Google prerequisites (manual)
**Description:**
- Pick a real Android package id and update `app.json`.
- In Google Cloud, create a web OAuth client plus Android OAuth clients with SHA-1s for the debug, EAS upload and Play signing keys.
- Enable the Google provider in Supabase with the client IDs.
**Acceptance criteria:**
- [ ] The Supabase provider is enabled
- [ ] A test ID token from each client is accepted
**Dependencies:** Checkpoint D
**Scope:** XS (config)

### Task 12: Google sign-in
**Description:**
- Add `@react-native-google-signin/google-signin` with its config plugin (requires a dev build).
- `src/auth/google.ts`:
  - native: `signInWithIdToken({ provider: 'google', token })`
  - web: `signInWithOAuth`, with `detectSessionInUrl` turned on for web only in `src/utils/supabase.ts`
- A "Continue with Google" button on the OTP screen.
- A rejection from the hook maps to `noInvite`, with copy that suggests the email-code option.
**Acceptance criteria:**
- [ ] A Google account whose email matches a pending client signs in and gets linked
- [ ] A different Google account is rejected, and no `auth.users` row is left behind
- [ ] OTP and Google on the same email end up in one account
**Verification:** Build; manual run on an Android dev build and on web
**Dependencies:** T11
**Files:** `package.json`, `app.json`, `src/auth/google.ts`, `src/auth/index.ts`, `src/utils/supabase.ts`, `src/app/otp.tsx`
**Scope:** M

## Phase 6: Post-MVP (saved for later, do last)
Pick these up only after the MVP build ships. Each one needs its own task breakdown when it starts.
- [ ] Automated welcome email (Edge Function + Resend, with a per-trainer limit); replaces or supplements the share sheet from T4
- [ ] Sign in with Apple and iOS (bundle id, App Store guideline 4.8)
- [ ] Moving a client to another trainer
- [ ] Gmail address normalisation in the signup hook and link trigger (T5)
