# Todo: Self-signup, and three ways into the app

See `tasks/signup-plan.md` for the reasoning. Separate from `tasks/todo.md` (client onboarding,
T0–T12), which is still open — do not renumber or tick anything there except old T5, in S14.

Workspace rule: **build only; run tests only when asked.** "Build" means `npx tsc --noEmit` locally,
plus `expo export --platform android` and then `--platform web` in the cloud container (project
memory `verification`). Backend changes are replayed offline against Postgres 16 in the cloud
container before they touch the remote, and `list_migrations` is checked before every
`apply_migration` (project memory `backend_schema` — the folder is not the remote).

## Status: 2026-09-19

- **Greenlit by Sneha 2026-09-19 to build S1-S14 as written** (asked for "a way for coaches to
  onboard the app"; that is S2 + S3 + S5 + S6 + S7 + S12, and she chose to run the whole plan
  rather than the coach-only slice).
- Re-checked against the working tree 2026-09-19, every premise still holds: no `welcome.tsx`, no
  `20260918*` migration, `/sign-in` is still what `app/index.tsx` redirects to, `resolveIdentity`
  still throws `unlinked` on a null answer, `routes.otp()` still takes no arguments, and
  `20260831000006` still seeds no `t` prefix in `id_sequences`.
- **S1-S3 built and applied 2026-09-19.** The three migrations are in the folder and on the remote
  as `optional_coach`, `create_profile`, `open_signup` (`list_migrations` confirms; the remote was
  at `complete_intake` before). The whole chain plus `seed.sql` replayed clean on offline Postgres
  16 first, and every S1-S3 acceptance case was exercised there: a coachless `client_profiles` row
  inserts, `t-001`'s `v_trainer_summary` and `v_trainer_profiles.client_ids` are unchanged,
  `create_routine` writes `trainer_id null / author_id <client>` for an individual and `t-001` for
  a coach, `create_profile` creates and links both kinds and refuses a second call, an invited
  address, an unknown kind and a blank name (PT409 / 400, nothing written), `anon` cannot execute
  it, the hook is gone and `link_auth_user` still links an invited address on signup.
  `get_advisors` shows only the standing warnings plus the one expected authenticated-executable
  DEFINER for `create_profile`. `npx tsc --noEmit` clean (no frontend change in S1-S3).
  Still open in Checkpoint A: confirming in the Dashboard that no Before User Created hook is
  configured.
- **Role escalation closed in the pending file 2026-09-19** (asked for as "prevent a client from
  registering as a coach"). Registering was never the hole -- `create_profile` already raises
  `PT409` for an account that has a profile and for an email already in `users`, and Supabase
  applies `options.data` only when it creates an account, so a returning client's chosen kind is
  ignored. The hole was afterwards: `users_self_update` had no column restriction (RLS cannot), so
  `update users set role = 'trainer'` would have worked and `app_role()` reads that column. It is
  dropped -- nothing in the app updates `users`; `link_auth_user` is the only writer and is
  DEFINER. `trainer_profiles_self` and `client_profiles_trainer_insert` gained an `app_role()`
  test, which stops a client minting their own `trainer_profiles` row or hanging a roster row off
  themselves. `tests/rls.sql` gained the three cases. Not replayed (build only). Frontend: `/otp`
  now says so once when the resolved role disagrees with the kind picked at the front door, instead
  of dropping them on a home screen they did not choose. `npx tsc --noEmit` clean.

- **S4 done 2026-09-19, not applied** (applying the pending file is still old T10). The pending
  file gained `client_profiles_self_writes` (update, `id = app_user_id() and trainer_id is null`),
  `routines_owner`'s author branch now reads `(trainer_id is null or is_my_trainer(trainer_id))`,
  and a comment records that `create_profile` is DEFINER and does not pass through
  `client_profiles_trainer_insert`. The client-authored-routine rule the `tracking_mode` memory
  flagged as missing was already there (the author branch, added with `routines.author_id` in
  `20260915000003`); this only widens it to a null coach.
  `tests/rls.sql` gained the five self-signup cases and **lost the two `hook_*` keys**, which
  called the function S3 dropped -- it would not have run at all otherwise. Re-run offline against
  the whole chain + `seed.sql`: every previously measured number is unchanged, an individual can
  move their own macros (1 row) where a coached client still cannot (0), an individual cannot
  touch another client's row (0), and an individual's routine is created with `trainer_id null`
  and their own `author_id`. Results appended to the measured-behaviour block in the pending file.
- **S5 done 2026-09-19.** `resolveIdentity` returns `AppIdentity | null` -- two nulls is "no
  profile", one null and one answer still throws `unlinked`; `needsProfile` is a new
  `AuthFailureKind` and a new `AuthStatus` with a `profileNeeded({authUserId, email})` action;
  `useAuthSession` dispatches it and **leaves the Supabase session alone**, clearing only the
  identity cache. `persistence.ts` needed no change -- `saveIdentity` was only ever called with a
  resolved identity, so a `needsProfile` session already caches nothing. `npx tsc --noEmit` clean.
  Deviation from the plan: the payload does **not** carry the raw `user_metadata`. S7(e) reads the
  pre-chosen kind from `session.user.user_metadata` inside `src/auth/*`, which is where the rule
  allows it, so nothing outside needs the blob; add it in S7 if the recovery screen turns out to
  want it. Until S7 lands, a `needsProfile` session falls through `app/index.tsx` to `/sign-in` --
  no screen answers this state yet, which is exactly what S7 builds.
- **S6 done 2026-09-19.** `POST /session/profile` in both transports, body `{kind, name}`,
  returning `{id}`. Supabase: `rpc('create_profile', {p_kind, p_name})` -- the uid and the address
  are read off the token server-side, so they are not in the body. Mock: mints the row the same
  way; signing up as a coach returns the mock's one trainer id, because the mock has exactly one
  coach and you are it. `createProfile` on `trainerApi` invalidates nothing (identity is read
  through `resolveIdentity`, not RTK Query). `PT409` already maps to 409 through the generic
  `/^PT\d{3}$/` rule in `httpError.ts` -- no change needed there. `npx tsc --noEmit` clean.
  Carried into S8: the mock's individual is minted under the mock's trainer, since
  `ClientProfile.trainerId` is still `string`; the line has a `ponytail:` comment and S8 flips it
  to null, which is when S13's coachless fixture becomes possible.
- **S7 first half done 2026-09-19** (the split the task itself proposes: (a) the screen and (b) the
  gate; (c)(d)(e), the kind riding along in the OTP metadata, are still to do).
  `app/welcome.tsx` is one screen in two modes keyed on `status`: signed out it is the front door
  (*Continue with email* -> `/otp`, *Already have a password? Sign in* -> `/sign-in`), and on
  `needsProfile` it is the recovery screen -- the signed-in address, a name field, *I'm a coach* /
  *I'm training on my own*, the ask-your-coach line and *Sign out*. `app/index.tsx` now redirects
  `signedOut` **and** `needsProfile` to `/welcome`; `/sign-in` and `/otp` gained the same
  `needsProfile` redirect, without which a verified account with no profile just sat on the screen
  it verified from. `welcome` is registered in the root `Stack`, and `routes.welcome()` exists.
  Deliberate deviation while the halves are apart: the front door does **not** offer the three-way
  choice yet, because with no metadata to carry it every branch would go to the same place -- a
  choice that changes nothing is worse than no choice. The question is asked once, in recovery
  mode, which is exactly the "every new user lands in recovery mode" state the task predicted. A
  `ponytail:` comment at the top of the file says so.
  New in `src/auth`: `refreshIdentity()` (`supabase.auth.refreshSession()`), which is how the
  screen says "the backend would answer differently about me now" without writing the session
  slice -- the refreshed session goes through the existing listener and the normal resolve, so
  `src/auth/*` stays the only writer. No `Alert.alert` anywhere on the screen.
  `npx tsc --noEmit` clean; `expo export --platform android` (6.1MB bundle) then `--platform web`
  both succeed in the cloud container, with `/welcome` among the prerendered routes.
- **S7 second half done 2026-09-19 -- S7 complete.** The three-way choice is on the front door now
  (name + *I'm a coach* / *I'm training on my own* / *I have a coach*, the last needing no name
  because their coach already typed it into the roster). `routes.otp(signup?)` carries it as query
  params, `sendSignInCode(email, signup?)` puts it in `options.data`, and `useAuthSession`'s new
  `createFromMetadata()` reads `session.user.user_metadata` on a null identity, calls
  `createProfile`, and resolves again -- no screen, no second prompt. A 409 there is swallowed on
  purpose (an invite that linked first, or a second launch racing this one): the resolve that
  follows is the truth, and only a null answer falls through to `/welcome` recovery mode. Role
  cannot be changed by a returning user arriving with a different link, because Supabase applies
  `options.data` only when it creates the account -- that is the property this leans on, noted in
  `sendSignInCode`'s doc. `/otp`'s copy branches on the kind, and its back button falls back to
  `/welcome` rather than `/sign-in`.
  `npx tsc --noEmit` clean; both exports succeed again (android 6.1MB, web prerenders `/welcome`,
  `/otp`, `/sign-in`).
  Checkpoint B is now code-complete; everything left in it is manual and blocked on old T0.
- **`/sign-in` deleted 2026-09-19, by Sneha's call.** `app/sign-in.tsx` is gone and `routes.signIn`
  with it; the two shell guards and both profile sign-out buttons now land on `/welcome`, which is
  the only way in. This **supersedes the first half of S12** -- the hierarchy question it posed
  (code primary vs password primary) no longer exists, because the screen does not. `DevQuickSignIn`
  moved onto `/welcome` behind `__DEV__`: the seeded fixtures are the only accounts with a password,
  and deleting the screen would otherwise have removed the only working way into the app while T0 is
  outstanding. `signedOutReason` is rendered on `/welcome` now too, or an `unlinked` sign-out would
  land on a screen that says nothing. `signInWithPassword` and `DEV_PASSWORD` stay, for that one
  dev-only caller. tsc clean; both exports pass and `/sign-in` is gone from the prerendered routes.
- Blocked on nothing to continue; **end-to-end device testing is blocked on old T0** (custom SMTP and
  `{{ .Token }}` in the Confirm signup / Magic Link templates).

---

## Phase 1: Backend — a client can have no coach

### Task S1: Nullable `trainer_id` on `client_profiles` and `routines`
**Description:** Make coachless rows representable. New migration
`20260918000001_optional_coach.sql`:
- `alter table client_profiles alter column trainer_id drop not null` (the FK and `on delete
  restrict` stay — restrict still means a coach with clients cannot be deleted).
- `alter table routines alter column trainer_id drop not null`. `author_id` (from
  `20260915000003`) is what carries ownership for a routine with no coach behind it.
- `create_routine`: replace the implicit fallback
  `coalesce(p_input->>'trainerId', (select id from trainer_profiles limit 1))` with
  `coalesce(p_input->>'trainerId', case when app_role() = 'trainer' then app_user_id() end)`, so an
  individual's routine gets a null trainer by intent rather than because RLS happened to hide the
  row. Re-declare `security invoker` explicitly — `create or replace` takes the attribute from the
  new definition.
- Header comment: reverting needs `trainer_id` backfilled for any account created as an individual.

**Acceptance criteria:**
- [x] `insert into client_profiles (id, trainer_id, …) values (…, null, …)` succeeds
- [x] `v_trainer_profiles.client_ids` and `v_trainer_summary` are unchanged for `t-001` (coachless
      clients join on `trainer_id = t.id` and simply do not appear)
- [x] `create_routine` called by a client with no coach writes `trainer_id null, author_id <client>`;
      called by a trainer it still writes their own id
- [x] The whole migration chain plus `seed.sql` replays cleanly on offline Postgres 16

**Verification:**
- [x] Offline replay (recipe in project memory `verification`)
- [x] `list_migrations`, then `apply_migration` under the name `optional_coach`
- [x] `npx tsc --noEmit` (no frontend change expected — this is the control)

**Dependencies:** None
**Files:** `WorkoutAppBackend/supabase/migrations/20260918000001_optional_coach.sql`
**Scope:** S

---

### Task S2: `create_profile` RPC
**Description:** The one call `/welcome` makes. New migration `20260918000002_create_profile.sql`.

`create_profile(p_kind text, p_name text) returns text`, **SECURITY DEFINER** (the fourth deliberate
exception — the caller has no `public.users` row, so `app_role()` is null and no policy on `users`
can admit the insert). It:
- reads `auth.uid()` and the address from `auth.users`; **neither is a parameter**;
- raises `PT409` if any `users` row already has this `auth_user_id`;
- raises `PT409` if any `users` row already has this email (that is an invited account, and
  `link_auth_user` owns it);
- `p_kind = 'individual'` → `users(next_id('c'), 'client', name, email, auth_user_id)` +
  `client_profiles(id, trainer_id null)` taking the defaults `20260915000003` set (goal `recomp`,
  starter macros, `joined_at current_date`);
- `p_kind = 'coach'` → `users(next_id('t'), 'trainer', …)` + `trainer_profiles(id)` with `tracks`
  left **null**, so the existing first-run tracking card on the dashboard is what greets them;
- any other `p_kind` → plain `raise exception` (400);
- returns the new id.
- `revoke execute … from public, anon`, `grant … to authenticated`.

`id_sequences` has **no `t` prefix** (checked 2026-09-18 — `20260831000006` seeds seventeen prefixes and `t` is not one of them; `c` was added later by `20260915000003`). Add it the same way, seeded from `max(regexp_match(id,'^t-(\d+)$'))` over `users`.

**Acceptance criteria:**
- [x] `create_profile('individual','Ada')` as a session with no profile creates both rows, links
      `auth_user_id`, and `app_user_id()` / `app_role()` answer on the next call
- [x] A second call from the same uid raises `PT409` and writes nothing
- [x] Calling it from a session whose email is a pending invite raises `PT409` (the invite path wins)
- [x] `create_profile('coach','Ada')` leaves `trainer_profiles.tracks` null
- [x] `create_profile('trainer', …)` and `create_profile('', …)` are rejected
- [x] `anon` cannot execute it

**Verification:**
- [x] Offline replay, including the two refusal cases
- [x] Dry run on the remote inside `begin … rollback` (technique in project memory `auth`)
- [x] `list_migrations`, then `apply_migration` under the name `create_profile`
- [x] `get_advisors` shows only the known standing warnings plus this one expected
      authenticated-executable DEFINER, the same way `complete_intake` reads

**Dependencies:** S1
**Files:** `WorkoutAppBackend/supabase/migrations/20260918000002_create_profile.sql`
**Scope:** S

---

### Task S3: Delete `hook_require_invite`, keep `link_auth_user`
**Description:** Signup is open, so the gate has nothing left to refuse. New migration
`20260918000003_open_signup.sql`: `drop function public.hook_require_invite(jsonb)`. The
`on_auth_user_created` trigger and `link_auth_user` are untouched — an invited address must still be
linked inside account creation, before the app's first identity check.

Leave a header comment saying the Before User Created hook must stay **unconfigured** in
Dashboard → Authentication → Hooks, and why.

**Acceptance criteria:**
- [x] The function is gone; the trigger and `link_auth_user` still exist
- [x] An invited address signing in still links (regression check on the existing flow)
- [x] A brand-new address can create an auth user (the `no_invite` 403 no longer happens)

**Verification:**
- [x] Offline replay
- [x] `list_migrations`, then `apply_migration` under the name `open_signup`
- [ ] Dashboard: confirm no Before User Created hook is configured
- [x] Grep the frontend: `errors.ts` still classifies `no_invite`; leave the kind in place (an old
      build in someone's hands can still trigger it) but it is now unreachable from a current server

**Dependencies:** S2
**Files:** `WorkoutAppBackend/supabase/migrations/20260918000003_open_signup.sql`
**Scope:** XS

---

### Task S4: Three policy edits in the pending RLS file
**Description:** Edit `supabase/future/20260901000001_auth_rls.sql.pending` **in place** — it is
still unapplied (old T10), so this stays one transaction rather than a follow-up migration.

1. New `client_profiles_self_writes`:
   `for update to authenticated using (id = app_user_id() and trainer_id is null) with check (id = app_user_id() and trainer_id is null)`.
   This is the only way an individual sets their own goal, goal weight and macros. Scoped to
   `trainer_id is null`, so a coached client still cannot rewrite their macros — the invariant
   `complete_intake` exists to protect is preserved by the predicate, not by discipline.
2. `routines_owner`: the author branch becomes
   `(author_id = app_user_id() and (trainer_id is null or is_my_trainer(trainer_id)))`.
3. Comment only, no code: note next to `client_profiles_trainer_insert` that `create_profile` is
   DEFINER and does not pass through it.

Also add the client-authored-routine insert rule the `tracking_mode` memory flags as missing, if S4
is the first task to touch that block — check before writing, it may already be there.

**Acceptance criteria:**
- [x] An individual can `update client_profiles` on their own row; a coached client's identical
      update is refused
- [x] An individual can insert/update their own routine and its days and exercises
- [x] The measured numbers at the bottom of the pending file are unchanged for `t-001`, `c-001`,
      `c-002` and `anon`
- [x] `tests/rls.sql` passes offline, with the three new cases added to it

**Verification:**
- [x] Offline replay of the whole chain plus the pending file plus `tests/rls.sql`
- [x] **Not applied** (that is old T10, after this task). Applying is old T10, and it happens once, after this task.

**Dependencies:** S1
**Files:** `WorkoutAppBackend/supabase/future/20260901000001_auth_rls.sql.pending`,
`WorkoutAppBackend/tests/rls.sql`
**Scope:** S

---

## Checkpoint A: after S1–S4
- [ ] The full migration chain + `seed.sql` + the pending file + `tests/rls.sql` replay clean offline
- [ ] S1–S3 applied to the remote; `list_migrations` shows all three
- [ ] `get_advisors` shows nothing new beyond the expected `create_profile` DEFINER line
- [ ] Nothing in the frontend has changed yet, and the app still builds and signs in as before

---

## Phase 2: Frontend — the new identity state

### Task S5: `needsProfile` — a null identity stops being fatal
**Description:** The heart of the change. Today `resolveIdentity()` throws
`AuthFailure('unlinked')` on a null answer and the bootstrap hard-signs-out. Split that:

- `errors.ts`: new kind `needsProfile` with its own copy. Keep `unlinked` — it still means "an
  account that should have been linked was not", which is a real fault.
- `identity.ts`: `resolveIdentity()` returns `AppIdentity | null` (null = no profile) instead of
  throwing for that case. Both RPCs answering null is `needsProfile`; one answering and not the
  other stays `unlinked`. Keep the existing retry-once-on-error behaviour — the 401-after-token-swap
  bug it fixes is unrelated and still live.
- `sessionSlice.ts`: new status `needsProfile`, and a `profileNeeded({authUserId, email})` action.
  `signedIn` and `signedOut` are unchanged. `role` and `userId` stay null in this state.
- `useAuthSession.ts`: a null identity dispatches `profileNeeded` and **leaves the Supabase session
  alone** — the user is signed in to Supabase, just not to the app.
- `persistence.ts`: do not cache anything for a `needsProfile` session; there is no `userId` to cache.
- The `needsProfile` payload carries `email` **and** the raw `user_metadata`, so S7 can read the
  pre-chosen kind off it without reaching back into `supabase.auth` from outside `src/auth/*`.

**Acceptance criteria:**
- [x] A session whose account has no `users` row lands on `status: 'needsProfile'` and is **not**
      signed out
- [x] An account that is linked still reaches `signedIn` in one pass, with no extra round trip
- [x] A genuinely broken link (`app_user_id` answers, `app_role` does not) still signs out as
      `unlinked`
- [x] Cold start with a cached identity is unchanged

**Verification:**
- [x] `npx tsc --noEmit`
- [ ] Manual: sign in with an address that has no profile on the remote and confirm the session
      survives (the screen it lands on arrives in S7) -- blocked on T0, and on S7 for the screen

**Dependencies:** S2, S3
**Files:** `WorkoutAppFrontend/src/auth/errors.ts`, `src/auth/identity.ts`,
`src/auth/useAuthSession.ts`, `src/store/slices/sessionSlice.ts`, `src/store/persistence.ts`
**Scope:** M

---

### Task S6: `POST /session/profile` in both transports
**Description:** One route, both transports, matching the existing shape. Body
`{ kind: 'individual' | 'coach', name: string }`.
- `src/api/supabase/routes.ts` → `rpc('create_profile', { p_kind, p_name })`.
- `src/api/handlers.ts` → the mock equivalent: mint an id, push the row into `mockDb`, return it.
- `trainerApi.ts`: `createProfile` mutation. It invalidates nothing — the identity it creates is
  read through `resolveIdentity`, not RTK Query, and S7 re-resolves explicitly.

**Acceptance criteria:**
- [x] Both transports accept the same body and return the new id
- [x] A second call answers 409 through `httpError.ts`'s `PT409` mapping
- [ ] The mock transport can produce a coachless client (needed by S13) -- **deferred to S8**:
      `ClientProfile.trainerId` is still `string`, so the mock's individual is minted under the
      mock's one trainer with a `ponytail:` comment on the line to flip

**Verification:**
- [x] `npx tsc --noEmit`
- [ ] Manual on both transports via the env flag -- no caller yet; S7 is the first

**Dependencies:** S2
**Files:** `WorkoutAppFrontend/src/api/supabase/routes.ts`, `src/api/handlers.ts`,
`src/api/endpoints/trainerApi.ts`
**Scope:** S

---

### Task S7: `/welcome` as the front door, and `/otp` carrying the choice through
**Description:** The role is asked **before** sign-in. `/welcome` becomes the app's first screen and
`/sign-in` stops being it.

**a. `app/welcome.tsx` — one screen, two modes, keyed on `status`.**
- *signed out* (the front door): a name field and three choices — *I have a coach* → `routes.otp()`,
  *I'm training on my own* → `routes.otp({kind:'individual', name})`, *I'm a coach* →
  `routes.otp({kind:'coach', name})`. Footer link *"Already have a password? Sign in"* → `/sign-in`.
- *`needsProfile`* (recovery): a verified session with no profile and no kind in its metadata.
  Shows the signed-in email, *"Ask your coach to add this exact address"*, and buttons for
  *Train on my own for now*, *I'm a coach* and *Sign out* — these call `createProfile` directly,
  which is the first draft's behaviour kept as the fallback.

**b. `app/index.tsx`** — `signedOut` redirects to `routes.welcome()`, not `routes.signIn()`.
`needsProfile` redirects there too. `/sign-in` stays reachable, just no longer the default.

**c. `app/otp.tsx`** — reads `kind` and `name` off the route and passes them through:
`signInWithOtp(email, { options: { data: { kind, name } } })`. When a kind is present the copy says
so ("Create your coach account", "Set up your own training"); with none it keeps today's wording.

**d. `src/auth/authService.ts`** — `sendSignInCode(email, meta?)` grows the optional second argument.
This is the only file allowed to touch `supabase.auth`, so the metadata write lives here.

**e. `src/auth/useAuthSession.ts`** — on `needsProfile`, read
`session.user.user_metadata` for `kind`. If it is `'individual'` or `'coach'`, call `createProfile`
straight away and re-resolve; **no screen**. Anything else (absent, unknown) → leave the status at
`needsProfile` and let the gate route to `/welcome` recovery mode.

Do **not** write the session slice from a screen — `src/auth/*` is the only writer, and that rule is
load-bearing (project memory `architecture`).

**Acceptance criteria:**
- [x] A cold start signed out lands on `/welcome`, not on `/sign-in`
- [x] Coach path: `/welcome` → `/otp` → code → **straight to the trainer dashboard**, with the
      tracking first-run card showing and no second prompt
- [x] Individual path: same, straight to the client explore tab
- [x] "I have a coach" with an invite waiting → the existing invited flow, unchanged, no kind used
- [x] "I have a coach" with **no** invite → recovery mode, and *Train on my own for now* works
- [x] The choice survives: pick coach, kill the app, reopen from the emailed code — still a coach
- [x] A returning user's `options.data` is ignored by Supabase and cannot change their role
- [x] `/welcome` is unreachable once a profile exists (a direct navigation redirects home)
- [x] No `Alert.alert` anywhere on it (dead on web — project memory `architecture`)

**Verification:**
- [x] `npx tsc --noEmit`
- [x] `expo export --platform android`, then `--platform web`, in the cloud container
- [ ] Manual: all three branches plus the kill-and-reopen case, on web and on a device -- blocked on T0
- [ ] `select raw_user_meta_data from auth.users where email = …` shows the kind after a signup -- blocked on T0

**Dependencies:** S5, S6
**Files:** `WorkoutAppFrontend/src/app/welcome.tsx`, `src/app/index.tsx`, `src/app/otp.tsx`,
`src/auth/authService.ts`, `src/auth/useAuthSession.ts`, `src/navigation/routes.ts`,
`src/app/_layout.tsx`
**Scope:** L — **split if it runs long:** (a)+(b) the screen and the gate first, (c)+(d)+(e) the
metadata pass-through second. Each half leaves the app working; after the first, every new user
simply lands in recovery mode.

---

## Checkpoint B: after S5–S7
- [ ] A brand-new email goes: `/welcome` → choice → code → the right home, with no second prompt
- [ ] Killing the app mid-flow and reopening from the email keeps the choice
- [ ] The invited-client flow from `tasks/todo.md` still works end to end, unchanged
- [ ] `npx tsc --noEmit` clean; both exports succeed
- [ ] Review with Sneha before Phase 3

---

## Phase 3: Frontend — the coachless client

### Task S8: `trainerId: string | null`, and `GET /trainer` answers null
**Description:** Make the absence of a coach a type the compiler can find every reader of.
- `types/models.ts`: `ClientProfile.trainerId: string | null`.
- `api/supabase/rows.ts`: the three `trainerId: r.trainer_id` mappings pass null through.
- `api/supabase/routes.ts`: `trainerProfile()` uses `maybeSingle()` and returns null; `GET /trainer`
  answers `null` instead of throwing *"No trainer profile is visible to this account"*.
  `GET /session/roles` does the same.
- `trainerApi.ts`: `getTrainer` becomes `TrainerProfile | null`.
- `useTracking()`: no trainer → `mode null`, `chosen true`, both domains shown. `shows(null, …)`
  already returns true, so this is a guard, not a new rule.
- Fix whatever `tsc` then flags. **A trainer screen may still assume non-null** — that is correct
  there, because the trainer shell already guarantees `role === 'trainer'`.

**Acceptance criteria:**
- [ ] `GET /trainer` for a coachless client resolves to null rather than erroring
- [ ] `useTracking()` for a coachless client reports both domains visible
- [ ] Every trainer-side reader still compiles without a non-null assertion sprinkled in
- [ ] `grep -rn "v_trainer_profiles\|trainer_profiles" src/` turns up no other `.single()`

**Verification:**
- [ ] `npx tsc --noEmit`
- [ ] Manual: sign in as a coachless client and confirm no error banner on any tab

**Dependencies:** S1, S7
**Files:** `WorkoutAppFrontend/src/types/models.ts`, `src/api/supabase/rows.ts`,
`src/api/supabase/routes.ts`, `src/api/endpoints/trainerApi.ts`, `src/hooks/useTracking.ts`
**Scope:** M

---

### Task S9: `hasCoach()` and the surfaces it hides
**Description:** One predicate, one file: `src/utils/coach.ts`,
`hasCoach = (c: Pick<ClientProfile,'trainerId'>) => c.trainerId !== null`. Same shape as
`shows()` in `utils/tracking.ts` — screens call it, nothing re-derives it.

Hidden or reworded when false:
- `app/(client)/(tabs)/_layout.tsx` — no `ChatFab`, and `useClientThread` is skipped
- `app/(client)/_layout.tsx` — `/chat` is not in the Stack
- `components/common/TrainerIndicator.tsx` — renders null (mounted in one place only,
  `explore.tsx:124`, despite its doc comment claiming every client screen — fix the comment too)
- `app/(client)/profile.tsx:39` — drop the "· coached by …" line
- `app/(client)/(tabs)/explore.tsx:209` — "Your coach will give you a routine" → "Plan a routine and
  it will show up here", with the button `(client)/routine/new` already provides
- `app/(client)/(tabs)/workouts.tsx:90/170/200` — `selfPlanned` is already the flag these read; it
  becomes `selfPlanned || !hasCoach(client)`
- `app/(client)/onboarding.tsx` — the intake notes field says notes go to the coach; for an
  individual, hide the notes field entirely (there is nobody to send it to)

**Acceptance criteria:**
- [ ] A coachless client sees no chat entry point anywhere, and `/chat` is not reachable by URL
- [ ] No screen renders the word "coach" for a coachless client
- [ ] A coached client's screens are byte-identical to today
- [ ] `hasCoach` is imported, never re-implemented (grep for `trainerId ===` / `trainerId !==`)

**Verification:**
- [ ] `npx tsc --noEmit`
- [ ] Manual: both client kinds, every client tab, on web and android
- [ ] `expo export --platform android`, then `--platform web`

**Dependencies:** S8
**Files:** `WorkoutAppFrontend/src/utils/coach.ts`, `src/app/(client)/(tabs)/_layout.tsx`,
`src/app/(client)/_layout.tsx`, `src/components/common/TrainerIndicator.tsx`,
`src/app/(client)/(tabs)/explore.tsx`, `src/app/(client)/(tabs)/workouts.tsx`,
`src/app/(client)/profile.tsx`, `src/app/(client)/onboarding.tsx`
**Scope:** L — **split if it runs long:** navigation and chat first, copy second.

---

### Task S10: An individual sets their own goals, macros and habits
**Description:** Reuse, do not rewrite. `components/trainer/GoalsEditor.tsx` and
`components/trainer/HabitEditor.tsx` already take a client id and go through `PATCH /clients/:id`
and the habit CRUD. Mount both on `app/(client)/profile.tsx`, behind `!hasCoach(client)`. The
precedent is `RoutineBuilder` on `(client)/routine/new` (project memory `tracking_mode`).

If either component reads `useSession().trainer` or assumes the trainer shell, lift that to a prop
rather than branching inside it.

**Acceptance criteria:**
- [ ] An individual can change goal, goal weight and the four macro targets from their own profile,
      and today's nutrition day picks the new targets up (the existing `updateClient` invalidation
      already covers this)
- [ ] An individual can add, edit and complete their own daily habits
- [ ] A **coached** client sees neither editor, and a direct `PATCH /clients/:id` from them is
      refused once the RLS set is applied (S4 + old T10)
- [ ] Neither editor changed behaviour on the trainer side

**Verification:**
- [ ] `npx tsc --noEmit`
- [ ] Manual: as an individual, set macros then log food and confirm the ring targets moved
- [ ] Manual: as `c-001` (coached), confirm the editors are absent

**Dependencies:** S8, S9
**Files:** `WorkoutAppFrontend/src/app/(client)/profile.tsx`,
`src/components/trainer/GoalsEditor.tsx`, `src/components/trainer/HabitEditor.tsx`
**Scope:** M

---

## Checkpoint C: after S8–S10
- [ ] A self-signed-up individual can, with no coach anywhere: finish intake, plan a routine, train,
      log food, log a weigh-in, tick habits, and see their progress charts
- [ ] Nothing about the coached-client experience changed
- [ ] `npx tsc --noEmit` clean; both exports succeed
- [ ] Review with Sneha before Phase 4

---

## Phase 4: Coming together

### Task S11: `invite_client` adopts a coachless account
**Description:** New migration `20260918000004_adopt_client.sql`, `create or replace` on
`invite_client` (re-declare `security invoker` explicitly). Before the insert, look the email up:

- a `users` row that is a **client with `trainer_id is null`** → set `trainer_id` to the calling
  coach, insert the `threads` row, return that id. Do not touch their goal, macros, height or weight
  — the coach edits those afterwards with the editors they already have.
- anything else (a trainer, or a client who already has a coach) → the existing `PT409`.

Raise an `intake-complete`-style info alert? No — they have already done intake. Skip it; the client
appears on the roster with real numbers, which is the signal.

**Acceptance criteria:**
- [ ] Inviting an individual's address attaches them, creates the thread, and returns their existing
      id, with every log, weigh-in, habit and routine intact
- [ ] Their `client_profiles_self_writes` access stops the moment `trainer_id` is set
- [ ] Inviting an address that belongs to a trainer still raises 409
- [ ] Inviting an address that belongs to a client with a coach still raises 409
- [ ] `revoke_invite` on an adopted client does **not** delete them (`auth_user_id` is not null) —
      it returns `PT404`, which is right, but confirm the roster copy does not promise otherwise

**Verification:**
- [ ] Offline replay including all four cases
- [ ] Remote dry run in `begin … rollback`
- [ ] `list_migrations`, then `apply_migration` under the name `adopt_client`
- [ ] Manual: invite an individual account from `t-001` and sign in as them

**Dependencies:** S1, Checkpoint C
**Files:** `WorkoutAppBackend/supabase/migrations/20260918000004_adopt_client.sql`,
`WorkoutAppFrontend/src/app/(trainer)/invite.tsx` (one line of copy: an existing account is added,
not re-created)
**Scope:** M

---

### Task S12: Sign-in and OTP copy, and the way in for a new user
**Description:** `/welcome` is the front door now (S7), so `sign-in.tsx` demotes to the password
path for the seeded dev fixtures.
- `sign-in.tsx`: tagline stops promising coaching. The ghost button stops being the only way to a
  code — it points back to `/welcome` for anyone who arrived here by a stale link. **Note the
  hierarchy is now wrong on this screen**: no self-signed-up user ever has a password, because
  `create_profile` never sets one. Either swap the order (code primary, password behind "Sign in with
  a password instead") or accept that this screen is dev-only and say so in a comment. Swapping is
  two props on existing `Button`s.
- `otp.tsx`: the no-kind wording ("Use the email address your coach added you with") stays for the
  invited path, since that is now the only way to reach `/otp` without a kind.
- `errors.ts`: keep the `noInvite` kind (an old client build can still hit an old server) but the
  copy no longer tells people to ask their coach — nothing on a current server produces it.

**Acceptance criteria:**
- [ ] No copy on the two auth screens assumes an invite
- [ ] The invited path still reads naturally for someone who *was* invited
- [ ] `DevQuickSignIn` is untouched and still behind `__DEV__`

**Verification:**
- [ ] `npx tsc --noEmit`; both exports
- [ ] Manual read-through on web and android

**Dependencies:** S7
**Files:** `WorkoutAppFrontend/src/app/sign-in.tsx`, `src/app/otp.tsx`, `src/auth/errors.ts`
**Scope:** S

---

### Task S13: Seed and mock fixtures
**Description:** Both transports need a coachless client to be testable at all.
- `WorkoutAppBackend/seed/`: one individual (`c-010`-ish, `trainer_id null`, real numbers, a few
  logs) and one self-signed coach with no clients. Bump `id_sequences.last_value` after seeding —
  the standing trap in project memory `backend_schema`. Patch the changed statement into the
  matching `seed/chunks/seed_0N.sql` by hand; the chunks are not regenerated.
- `auth_dev_users.sql`: accounts for both, password `apex-dev-2026`, so `DevQuickSignIn` reaches them.
- `src/api/mockDb.ts`: the same two fixtures, so the mock transport exercises the coachless paths.

**Acceptance criteria:**
- [ ] `DevQuickSignIn` lists the individual and the empty coach, and both sign in for real
- [ ] The mock transport can run the whole individual experience with no network
- [ ] `t-001`'s roster, counts and compliance averages are unchanged by the new rows
- [ ] `seed/verify.mjs` passes, or its existing RPE/scheduled-session failures are the only ones

**Verification:**
- [ ] Offline replay of `seed.sql`
- [ ] Manual: both fixtures on both transports

**Dependencies:** S10
**Files:** `WorkoutAppBackend/seed/seed.mjs`, `seed/chunks/seed_0N.sql`, `seed/auth_dev_users.sql`,
`WorkoutAppFrontend/src/api/mockDb.ts`
**Scope:** M

---

### Task S14: Docs, and striking old T5
**Description:** Write down what changed, where the next person will look.
- `WorkoutAppFrontend/ARCHITECTURE.md`: the three ways in, `needsProfile` as a routable state, and
  `hasCoach()` as the one rule for coachless UI.
- `BACKEND_DATA_SCHEMA.md`: `client_profiles.trainer_id` and `routines.trainer_id` are nullable, and
  what null means in each.
- `WorkoutAppBackend/README.md`: `create_profile` in the RPC list, with the DEFINER exception spelled
  out beside `next_id`, the policy helpers and `complete_intake`.
- `tasks/todo.md`: **strike old T5** ("enable the Before User Created hook") with a one-line note
  pointing at S3. Leave every other unchecked item alone.
- `tasks/signup-todo.md`: fill in the Status block.

**Acceptance criteria:**
- [ ] A reader who knows nothing about this plan can tell, from `ARCHITECTURE.md` alone, what happens
      when an unknown email signs in
- [ ] Old T5 can no longer be picked up by mistake
- [ ] The four DEFINER exceptions are listed together in one place

**Verification:**
- [ ] Read-through against the shipped code — no doc describes something that was not built

**Dependencies:** S11, S12, S13
**Files:** `WorkoutAppFrontend/ARCHITECTURE.md`, `BACKEND_DATA_SCHEMA.md`,
`WorkoutAppBackend/README.md`, `tasks/todo.md`, `tasks/signup-todo.md`
**Scope:** S

---

## Checkpoint D: complete
- [ ] All three entry paths work on web and android: new coach, new individual, invited client
- [ ] An individual can be adopted by a coach and keeps their history
- [ ] `npx tsc --noEmit` clean; `expo export` succeeds for android and then web
- [ ] Migrations `optional_coach`, `create_profile`, `open_signup`, `adopt_client` are all in
      `list_migrations`
- [ ] **Old T10 (apply the RLS set) is now unblocked** — it applies the pending file including S4's
      three edits, in one transaction, and is the last thing that happens
- [ ] Ready for review
