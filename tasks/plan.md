# Implementation Plan: Client onboarding (invite → sign-in → link → intake)

Replanned 2026-09-15 against the second onboarding spec. This replaces `ONBOARDING_PLAN.md`
(2026-09-14), which was never built. Everything from that plan that still holds is carried over here.
Checked against the repo and the live project (`vxytcykmeskjdyxtrjco`, 18 migrations, the last one
`one_routine_per_client`).

**Decisions (Sneha, 2026-09-15):**
- The trainer sends the invite from their phone's **share sheet**. Automated email is deferred.
- **The coach keeps goals, macros and habits.** Intake asks for height, current weight, goal weight
  (only if the coach left it blank) and free-text health and diet notes.
- **Email code first. Google (Android + web) is a later phase.** iOS and Sign in with Apple are out of scope.
- Still in force from 2026-09-14: email only (no SMS), and the pending RLS set is applied as part
  of this work.

---

## Part 1: Problems with the spec

### 1. "Pre-configured setup" can't work if the client row doesn't exist until sign-in
The spec has the trainer pre-fill **routines** and habits before the client signs in, and has a
coach chat ready on day one. But `routine_assignments`, `habits`, `threads`, `body_metrics` and
nine other tables all reference `client_profiles(id)` by foreign key (checked on the remote). Until a
`client_profiles` row exists, nothing can be assigned to the client.

The 2026-09-14 plan had the same gap. Its `client_invites.prefill jsonb` covered metrics only.
Routines, habits and the thread would each have needed their own jsonb, plus trigger code that
repeats `assign_routine`.

**Fix: the invite is the client row.** Adding a client creates `users` (with `auth_user_id` null)
plus `client_profiles` plus `threads` right away. The schema already allows this state: its comment
reads "a client can be on a roster before they ever sign in". The trainer then sets things up with
the editors that already exist (`GoalsEditor`, `HabitEditor`, `AssignSheet`) against a real client
id. With this design:
- **The `client_invites` table goes away.** "Pending" means `users.auth_user_id is null`.
- **The `prefill` jsonb goes away.** Pre-configuring means filling in the normal fields.
- **The two spec branches become one rule.** A client needs intake when `height_cm` or
  `start_weight_kg` is null. There's no status column, and no flag that could fall out of sync.
- **Re-invites and duplicate addresses are already blocked** by `users.email not null unique`.

Cost: `height_cm`, `start_weight_kg` and `target_weight_kg` become nullable, and those fields are
typed `number | null` in `models.ts`. That affects 32 references in 10 files, and `tsc` lists every
one. Most are display code, which shows "—".

### 2. The 2026-09-14 plan's OTP gate would have blocked every invitee
That plan used `signInWithOtp({ shouldCreateUser: false })` and relied on an invite lookup to let
people in. But an invitee doesn't have an `auth.users` row yet, so `false` makes Supabase reject
their first code request ("Signups not allowed for otp"). **No invited client could ever sign in.**

**Fix:** leave `shouldCreateUser` at its default (true) and do the gating server-side with the
**Before User Created auth hook**, a Postgres function that turns down any signup whose email
isn't on a roster. The same hook covers Google, where the client has no `shouldCreateUser` option.
It also means someone who taps "Sign in with Google" with the wrong account doesn't leave an
orphan `auth.users` row behind.

### 3. There is no hook that runs "upon successful login"
Postgres has no login event. The events that exist are the auth hook above, which runs before the
account is created, and `AFTER INSERT ON auth.users`, which runs once when it is created. Linking
has to finish **during account creation**: `resolveIdentity()` throws `unlinked` when
`app_user_id()` is null, and `useAuthSession` responds by signing the user out. An account that
gets linked any later is signed out on its first launch.

Consequences:
- The link trigger **must never raise an error.** A raising trigger on `auth.users` makes signup
  fail with an unexplained 500.
- With OTP, Supabase creates the `auth.users` row when the code is **sent**, before it's verified.
  Linking that early is safe, because only someone who enters the code gets a session for that uuid.
- A person who **already has an account** never triggers the insert again, so the flow can't link
  them to a second trainer. That matches the schema (`client_profiles.trainer_id` holds one coach),
  and the unique email makes the invite fail clearly. Moving a client to a new trainer is out of scope.

### 4. The welcome email can't link anywhere yet, and nothing here can send it
- The app isn't in any store. The Android package is still `com.anonymous.WorkoutAppFrontend`.
- Supabase Auth's SMTP only sends auth emails. A custom email needs an Edge Function (this repo
  has none), a provider key and a verified sending domain.
- Any automated sender tied to a trainer account can email arbitrary addresses, so it needs a
  per-trainer limit.

**Chosen:** React Native's built-in `Share.share()` opens the trainer's share sheet with a
ready-made message. It needs no setup, and the message comes from someone the client knows. The
message **must name the exact email address to sign in with.** That line does the most to prevent
the next problem.

### 5. Google sign-in: problems with matching the email
- **A different Google account.** Clients often sign in with a personal Gmail when the coach
  invited their work address. The hook rejects it, so the error copy has to say "use the address
  your coach invited, or sign in with an email code."
- **Gmail dots.** `j.doe@gmail.com` and `jdoe@gmail.com` go to the same inbox, but they don't match
  as strings. Matching uses `lower()` only; this is a `ponytail:` ceiling, and Gmail normalisation
  can be added if it causes problems in practice.
- **Unverified email.** The link trigger requires `email_confirmed_at is not null` for any provider
  other than `email`. Otherwise an unverified OAuth email could take over a roster row.
- **Setup before Google can be added:** a real Android package id; Google Cloud OAuth clients (web,
  plus Android with SHA-1 fingerprints for the debug, EAS upload and Play signing keys); a dev build
  for `@react-native-google-signin/google-signin`; and on web, `detectSessionInUrl` (currently
  `false`) for the redirect flow. On iOS, App Store guideline 4.8 would also require Sign in with
  Apple.
- When the same verified email signs in with both OTP and Google, Supabase links the two identities
  automatically. No work is needed for that.

### 6. The intake scope conflicts with ownership decisions already in the code
"Dietary goals and daily habits" belong to the coach (`GoalsEditor`, `HabitEditor`), and the pending
RLS set gives clients **read-only** access to `client_profiles`. Per the decision above, intake
collects body numbers and notes. **Health restrictions** go out as free text in the client's first
coach message, not into structured columns: it's sensitive data, and there's no screen that would
read it.

The goal is still derived by `deriveGoal()` (`src/utils/goal.ts`), and only when intake is the step
that supplies the goal weight. A coach who chose `performance` keeps it.

### 7. The pending RLS set doesn't allow trainers to insert
`client_profiles_trainer_writes` checks `is_trainer_of(id)`, and `threads_participants` checks
`in_thread(id)`. Both helpers are STABLE functions that look the row up in its own table. An INSERT
check runs against a snapshot that doesn't include the new row yet, so **inserts fail.** `users` has
no trainer insert policy at all. Today nobody notices, because the seed data is the only source of
clients. Adding one from the app needs three new insert policies keyed on the column value
(`trainer_id = app_user_id()`). The client-authored-routine policy flagged in `tracking_mode` is still
missing too.

### 8. The spec leaves out tracking mode
`trainer_profiles.tracks` can be `workout`, `nutrition`, `both` or null. Intake steps and the
contents of the day-one dashboard have to go through `shows()` from `src/utils/tracking.ts`.
Otherwise, a workout-only coach's client is shown calorie goals.

### 9. "Active calorie goals, assigned workouts" on day one isn't guaranteed
- A self-guided client gets starter macros (column defaults), which the coach is expected to replace.
- The `intake-complete` alert is what reminds the coach to do that.
- A client with no routine sees the workouts empty state. If the coach doesn't track workouts, the
  existing "Plan a routine" path appears.
- "Direct chat ready" is covered because the invite creates the thread.

### 10. Pending clients would skew roster numbers
A client who hasn't signed in has compliance 0 / `yellow`. The roster counts, the "need attention"
subtitle and `v_trainer_summary` need to leave pending clients out. They get their own "Invited"
group instead.

### 11. Smaller items (carried over from 2026-09-14)
- Intake routing goes in `(client)/_layout.tsx`, not `src/app/index.tsx`, which is a pure
  redirect by design.
- New `AuthFailureKind`s: `otpInvalid` ("token has expired or is invalid") and `noInvite` (the
  hook's message). Right now both fall into `unknown`.
- There's no realtime anywhere in the code, so triage is an `intake-complete` alert kind and not a
  subscription.
- Don't create a separate invite token or magic link. OTP codes are already single-use and expire,
  and a 6-digit code needs no deep-link setup.
- Ids are text, so mint them with `next_id()`. After any reseed, bump `id_sequences` for `c` and
  the thread prefix.
- Before testing more than two invites, set up custom SMTP and change the **Confirm signup** and
  **Magic Link** templates to show `{{ .Token }}`. For a new user, `signInWithOtp` sends the
  *Confirm signup* template.
- Add enum values in their own migration. `ALTER TYPE … ADD VALUE` can't be used within the same
  transaction that adds the value.
- Always check `list_migrations` before adding to the migrations folder.

---

## Part 2: The shape

```
Trainer: roster "+" → name, email, [optional: height / weight / goal weight / macros]
   └─ invite_client RPC → users (auth_user_id null) + client_profiles + threads
   └─ Share.share("…sign in with jane@x.com…")
   └─ roster "Invited" group → client detail → GoalsEditor / HabitEditor / AssignSheet as usual

Client: sign-in → "Coach invited you?" → email → signInWithOtp (shouldCreateUser default)
   ├─ before-user-created hook: no pending roster row → reject "no_invite" → noInvite copy
   └─ auth.users INSERT → link_auth_user trigger sets users.auth_user_id  (never raises)
   → verifyOtp → resolveIdentity() → c-0xx on the first call
   → (client)/_layout: profile.heightCm or startWeightKg null?
        ├─ yes → (client)/onboarding → POST /me/intake (complete_intake)
        │        → weigh-in + intake-complete alert + notes as first message
        └─ no  → (client)/(tabs)/log
```

**Skipped on purpose:** a `client_invites` table, `prefill` jsonb, an invite status enum, invite
tokens, magic links, Edge Functions, the Admin SDK, realtime, calculated macro estimates, SMS,
moving clients between trainers, and Gmail address normalisation.

## Architecture Decisions
- **The roster row is the invite.** It reuses every existing editor, needs no new table, and
  derives the status.
- **The hook is the gate and the trigger is the link.** Both run inside Supabase Auth, so OTP and
  Google take the same path without changes.
- **The intake check reuses the cached `GET /clients/:id`** in the client layout, so `resolveIdentity`,
  the session slice and the identity cache stay unchanged. `complete_intake` invalidates the `Client`
  tag, which clears the redirect by itself. The trade-off is one blank frame on a cold start with no
  cache.
- **`invite_client` and `revoke_invite` are SECURITY INVOKER**, backed by the new insert policies.
- **`complete_intake` is SECURITY DEFINER.** This is the third deliberate exception. RLS can't limit
  which columns get updated, and clients must not be able to update their macros. The function only
  touches `id = app_user_id()` and only the intake columns.
- **The hook function is DEFINER, and only `supabase_auth_admin` gets EXECUTE.** It's revoked from
  anon and authenticated by name, not only from PUBLIC.

## Task List
Tasks are in `tasks/todo.md`. Order:

- Phase 0: T0 Auth config (SMTP, OTP templates)
- Phase 1, trainer adds a client: T1 schema and RPCs → T2 RLS additions (authored and replayed offline) → T3 API
  layer and nullable types → T4 invite screen, share, roster group
- **Checkpoint A**
- Phase 2, client signs in with a code: T5 hook and link trigger → T6 OTP screen and error kinds
- **Checkpoint B**
- Phase 3, intake and routing: T7 `complete_intake` → T8 onboarding screen and redirect → T9 triage alert
- **Checkpoint C**
- Phase 4, lock down: T10 apply the RLS set to the remote
- **Checkpoint D**
- Phase 5, Google (later): T11 prerequisites → T12 Google sign-in
- Phase 6, post-MVP (saved for later, do last): automated welcome email, Sign in with Apple and iOS, moving clients between trainers, Gmail normalisation

T1 → T2 → T3 → T4 must run in order. T5 can run in parallel with T3 and T4 once T1 is on the
remote. T6 needs T5. T7 needs T1. T8 needs T6 and T7. T9 can run alongside T8.

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Link trigger raises an error, so every signup returns a 500 | High | `exception when others then return new`; replay offline; try on the remote inside `begin`/`rollback` |
| Hook is misconfigured, so nobody can sign up | High | Try it with one throwaway address before sharing any invite; disabling the hook in the dashboard undoes it immediately |
| Applying RLS breaks existing screens | High | Replay offline with `tests/rls.sql`; apply in one transaction; the old open policies are the rollback |
| Remote schema drifts from the migrations folder | Med | `list_migrations` before every apply; apply with MCP under the file's name |
| Nullable profile fields crash a screen `tsc` can't catch (`?? 0` math) | Med | Grep `heightCm`, `startWeightKg`, `targetWeightKg` and check each chart for null handling |
| Built-in SMTP limits stop testing | Med | T0 comes first |
| Seed ids collide with minted ids | Low | Bump `id_sequences` after a reseed |

## Open Questions
- Which link goes in the share message before a store listing exists: an EAS internal-distribution
  URL, the web build, or none? For now it's a single constant in `src/constants/`.
- Should trainers be able to change a pending client's email, or only revoke and re-add? The plan
  uses revoke and re-add.
