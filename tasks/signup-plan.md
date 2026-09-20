# Implementation Plan: Self-signup, and three ways into the app

Planned 2026-09-18. New work, not a revision: `tasks/plan.md` / `tasks/todo.md` (client onboarding,
T0–T12) still have unchecked items and are left alone. Tasks here are numbered **S1–S14** so the two
lists can never be confused. This plan **depends on** two of the old ones — see *Dependencies on the
onboarding plan* below.

Checked against the repo on 2026-09-18: 22 migration files, `supabase/future/20260901000001_auth_rls.sql.pending`
still unapplied, `src/auth/*` as built on 2026-09-15.

**Decisions (Sneha, 2026-09-18):**
- **An individual is a client with no coach.** `client_profiles.trainer_id` becomes nullable. No third
  role, no self-coaching hack.
- **"I have a coach" with no invite waiting** → a screen that says *ask your coach to add this exact
  address*, with a button to continue as an individual instead. No join-request table.
- **Attaching later is in scope, one direction only.** A coach inviting an address that already has a
  coachless account adopts it. Detaching, and switching coach, stay out.
- Plan and tasks live in `tasks/signup-plan.md` and `tasks/signup-todo.md`.

---

## Part 1: What the architecture assumes today, and exactly where it breaks

The app was built on one premise: **every account exists because a coach created it.** Nine places
encode that premise, and each is a concrete breakage for a self-signed-up user.

### 1. There is no sign-up at all
`src/app/sign-in.tsx` offers password sign-in and "Coach invited you? Sign in with a code". Neither
creates an account on purpose — `invite_client` does, from the trainer side
(`20260915000003_invite_clients.sql`). There is no screen that mints a new identity.

### 2. `hook_require_invite` refuses every uninvited email
The Before User Created hook (`20260915000004_claim_on_signup.sql`) returns `no_invite` unless the
address is already a `users` row with `role = 'client'` and `auth_user_id is null`. Self-signup is
precisely the case it was written to block.

It has never been enabled (old plan T5 is unchecked), so nothing depends on it in production yet.

### 3. `unlinked` is fatal, and it is the exact state a new signup lands in
`resolveIdentity()` (`src/auth/identity.ts`) calls `app_user_id()` / `app_role()`; a null answer
throws `AuthFailure('unlinked')`, and the bootstrap hard-signs-out — deliberately, so a broken
account cannot retry forever. A freshly signed-up user has an `auth.users` row and no `public.users`
row, which is *the same state*. **This is the single most important change in the plan:** "no profile
yet" has to stop being an error and become a route.

### 4. `client_profiles.trainer_id` is NOT NULL, `on delete restrict`
`20260831000001_core_schema.sql:75`. An individual has nothing to put there.

### 5. `routines.trainer_id` is NOT NULL too
`20260831000001_core_schema.sql:133`. A client already writes their own routine today when their
coach tracks nutrition only (`app/(client)/routine/new.tsx`), and it is stored **under the coach's
id** — a ceiling already marked with a `ponytail:` comment there and recorded in project memory
`tracking_mode`. An individual has no coach's id to borrow, so this column has to go nullable as
well. `routines.author_id` (added in `20260915000003`) is what carries ownership instead, and
`owns_routine()` in the pending RLS file already checks it.

### 6. `trainerProfile()` assumes a visible trainer row
`src/api/supabase/routes.ts` — `v_trainer_profiles … .limit(1).single()`, with the error *"No trainer
profile is visible to this account"*. It backs `GET /trainer`, which backs `useTracking()` **and**
`useSession().trainer`. Both are read by client screens. For a coachless client the view returns zero
rows and `.single()` throws, so the tracking hook and the profile header fail rather than degrade.

### 7. The coach owns goals, macros and habits
`complete_intake` deliberately does not let a client write their own macros; there is **no client
update policy on `client_profiles` at all** in the pending RLS set. The editors exist
(`components/trainer/GoalsEditor.tsx`, `HabitEditor.tsx`) but are mounted only on trainer screens.
An individual left as-is is stuck on the starter macros `invite_client` defaults to (2000/150/200/65)
with no way to change them.

### 8. The chat assumes a counterparty
`threads` is `(client_id, trainer_id)` both NOT NULL. `ChatFab` is mounted unconditionally in
`app/(client)/(tabs)/_layout.tsx`, and `TrainerIndicator` renders "your coach is watching" on every
client screen. An individual has no thread and no coach.

### 9. Copy throughout the client side names a coach
`explore.tsx:209`, `workouts.tsx:90/170/200`, `profile.tsx:39`, `onboarding.tsx`, `routine/[id].tsx`,
`train/[id].tsx`. Not architecture, but it is what makes the coachless build feel broken rather than
intentional.

---

## Part 2: The design

### The gate moves from the database to the app

`hook_require_invite` stops being a gate — self-signup means *anyone may create an auth account*. So
the check it performs is deleted rather than loosened, and the app takes over the job it was really
doing: deciding what a brand-new identity is.

`link_auth_user` (the AFTER INSERT trigger) stays exactly as it is: for an invited address it still
links inside account creation, so the invited path is untouched by this plan.

### The role is asked first, before any sign-in

**Decision (Sneha, 2026-09-18, revising the first draft of this plan):** the app asks *who you are*
before it asks *who you are signing in as*. `/welcome` is the front door; sign-in is downstream of it.

```
/welcome   (signed out — no email, no password yet)
   │
   ├─ "I have a coach"         → /otp                    no kind carried
   ├─ "I'm training on my own" → /otp?kind=individual
   └─ "I'm a coach"            → /otp?kind=coach
           │
           │  signInWithOtp(email, { data: { kind, name } })
           │  ── the auth.users row is created here, at send time
           │  ── link_auth_user matches a pending invite, or does nothing
           │
           ▼  code verified, session exists
       resolveIdentity()
           │
           ├─ answers  → signedIn → homeFor(role)     invited client, or returning user
           │
           └─ null     → needsProfile
                   │
                   ├─ session carries a kind → create_profile(kind, name), no screen
                   └─ no kind                → /welcome in recovery mode
```

### Why the choice rides in user metadata, not a route param

The choice has to survive the email round-trip: the user leaves the app, opens their mail, and may
come back to a cold start. A route param dies there, and `navigation/routes.ts` would have to grow a
typed param for a value only one screen cares about.

`signInWithOtp(email, { options: { data: { kind, name } } })` writes it to
`auth.users.raw_user_meta_data` at account creation, and it comes back on every session as
`session.user.user_metadata`. Nothing to thread, nothing to persist, survives a restart.

It is client-set and unverified, and that is fine **because it is never trusted for authorization** —
it picks between two shapes the user could have picked by hand on the recovery screen anyway, and it
is only read once the app already holds a verified session for that uid. Supabase applies
`options.data` only when the user is created, so a returning user cannot rewrite their own role with it.

**What does not move earlier: the profile.** `create_profile` still runs *after* the code is verified,
never at send time. Creating a `public.users` row from unverified metadata would let anyone squat any
address — and since `users_email_lower_key` is unique, a squatted row would block the real coach's
invite to that address.

### `/welcome` — one screen, two modes

| Reached as | Shows |
|---|---|
| **signed out** (the front door) | Three choices, plus a name field so `options.data` can carry it. Footer link *"Already have a password? Sign in"* → `/sign-in`, for the seeded dev fixtures. |
| **`needsProfile`** (recovery) | A session with no profile and no kind in its metadata: *"Ask your coach to add **this exact address**"*, showing the signed-in email, plus *Train on my own for now*, *I'm a coach* and *Sign out*. |

One file, keyed on `status`. The redirect gate in `index.tsx` already has to send both states
somewhere, and sending them to the same route is one branch instead of two.

Recovery mode is what "I have a coach" lands in when no invite is waiting — that branch carries no
kind precisely so it arrives there. It is also the honest answer for someone whose profile creation
failed halfway, or who killed the app between verifying and creating.

The "I have a coach" branch creates nothing on purpose. The invite already **is** the client row (the
whole design of `20260915000003`), so a row created here would collide with the one the coach creates
later — and the adoption path in S11 handles the other ordering.

**Not done: checking whether an address is on a roster before sending a code.** It would need an
anon-callable RPC answering "is this email invited", which is an email-enumeration oracle. The user
sends a code and finds out after.

### `create_profile(p_role, p_name)` — one new RPC, SECURITY DEFINER

DEFINER is the **fourth** deliberate exception, after `next_id`, the policy helpers and
`complete_intake`. It is unavoidable and narrow: the caller has no `public.users` row, so
`app_role()` is null and no RLS policy on `users` can admit the insert (`users_trainer_insert_client`
requires `app_role() = 'trainer'`). The function is safe because it can only ever act on
`auth.uid()`:

- refuses if a row with this `auth_user_id` already exists (`PT409`);
- refuses if the email already belongs to a `users` row (`PT409` — that is the invited case, and it
  is `link_auth_user`'s job, not this one's);
- writes `auth_user_id = auth.uid()` itself; it is not a parameter;
- accepts exactly two roles, and `'individual'` is not a database role — it maps to
  `role 'client'` with `trainer_id null`;
- takes the email from `auth.users` rather than from the caller.

### An individual is a client whose coach is null

That is the whole model. Everything keyed on `client_id` — logs, sessions, nutrition days, body
metrics, habits, assignments, photos — keeps working untouched, because
`owns_client(id)` is `id = app_user_id() or is_trainer_of(id)` and the **first** branch already
covers a coachless client. No policy in the `_owner` loop changes.

Three policies do need a coachless branch, and only three:

1. **`client_profiles_self_writes`** (new) — `for update using (id = app_user_id() and trainer_id is null)`.
   This is what lets an individual set their own goal, goal weight and macros. Scoped to
   `trainer_id is null`, so a coached client still cannot rewrite their macros — the rule that
   `complete_intake` exists to protect is preserved by construction.
2. **`routines_owner`** — add `or trainer_id is null` to the author branch, so an individual owns the
   routine they wrote.
3. **`client_profiles_trainer_insert`** — unchanged, but noted: `create_profile` is DEFINER and does
   not go through it.

### What hides when there is no coach

One predicate, one place, the same shape as `utils/tracking.ts`: `hasCoach(client)` in
`src/utils/coach.ts`, `client.trainerId !== null`. Screens call it; nothing re-derives it.

Hidden or reworded when false: `ChatFab` and the `/chat` route, `TrainerIndicator`, the
"coached by …" line on the client profile, the "your coach will give you a routine" empty states, and
the intake screen's "this goes to your coach as a message" note. Shown instead: the goals/macros
editor and the habit editor on the client's own profile screen — the existing trainer components,
reused, exactly as `RoutineBuilder` is already reused on `(client)/routine/new`.

`useTracking()` returns "both" for a coachless client — an individual tracks whatever they like.
That falls out of `shows(null, …)` already returning true; the only change is that `GET /trainer`
must answer `null` instead of throwing.

### Attaching later: the invite adopts

`invite_client` currently raises `PT409 'That email already has an account'` on a duplicate email.
It grows one branch first: if the address belongs to a **client with `trainer_id is null`**, set
`trainer_id` to the calling coach, create the thread, and return that id. Anything else (a trainer, a
client who already has a coach) still raises.

The client keeps every log, weigh-in and routine they built while on their own. Their macros become
the coach's to set from that moment — which is exactly what the `trainer_id is null` scope on
`client_profiles_self_writes` gives, with no extra code.

---

## Part 3: Deliberately not built

- **No join-request table.** "I have a coach" writes nothing; the coach's invite is the join.
- **No detaching, and no coach switching.** Old plan Phase 6 already defers trainer switching; this
  plan does not pull it forward.
- **No coach-discovery, no coach directory, no coach codes.** Email is the handle.
- **No new role in `user_role`.** An individual is a client; `app_role()` keeps two answers and every
  `role === 'trainer'` branch in the app stays a two-way branch.
- **No email verification of coach accounts.** Anyone can sign up as a coach. If that needs gating
  later it is a hook, not a schema change.
- **No password sign-up.** OTP is the only account-creating path, so there is no new password
  screen, no reset flow and no second credential surface. Password sign-in stays for the seeded dev
  fixtures.

---

## Architecture decisions

| Decision | Why |
|---|---|
| Individual = `client_profiles.trainer_id null` | Two nullable columns against a third role that would branch every policy, view, guard and route table. The `owns_client` self-branch already carries it. |
| `unlinked` splits into `unlinked` and `needsProfile` | Same null answer, two meanings. A signup with no profile is a routable state; an invited account whose link failed is still a fault and still signs out. |
| `create_profile` is SECURITY DEFINER | The caller has no profile, so no policy can let them create one. Narrowed by acting only on `auth.uid()` and refusing any existing row. |
| Delete `hook_require_invite` rather than loosen it | Once signup is open, the hook's only possible answer is "yes". A function that always returns `{}` is worse than no function. It was never enabled, so nothing regresses. |
| `hasCoach()` in `src/utils/coach.ts` | Mirrors `shows()` in `utils/tracking.ts`: one rule, one file, screens never re-derive it. |
| Reuse `GoalsEditor` / `HabitEditor` on the client profile | They already take a client id and patch `/clients/:id`. The precedent is `RoutineBuilder` on `(client)/routine/new`. |
| Adoption lives in `invite_client`, not a new RPC | It is one branch on an error path the function already has. |

---

## Dependencies on the onboarding plan

Two unchecked items in `tasks/todo.md` interact with this work:

- **Old T5 (enable the Before User Created hook) is cancelled.** S3 deletes the hook. If it is ever
  enabled between now and then, self-signup silently fails with `no_invite` — so T5 must be struck
  from the old todo, not just skipped.
- **Old T10 (apply the RLS set) now includes this plan's changes.** The pending file gains three
  policy edits (S4). Apply it once, after S4, not before.

Old T0 (SMTP + `{{ .Token }}` templates) is still the prerequisite for **any** OTP sign-in, invited
or not. Nothing in this plan can be tested end to end on a real device until it is done.

---

## Task list

Full task bodies in `tasks/signup-todo.md`.

### Phase 1: Backend — a client can have no coach
- [ ] S1: Nullable `trainer_id` on `client_profiles` and `routines`
- [ ] S2: `create_profile` RPC
- [ ] S3: Delete `hook_require_invite`, keep `link_auth_user`
- [ ] S4: Three policy edits in the pending RLS file

### Checkpoint A: backend replays offline

### Phase 2: Frontend — the new identity state
- [ ] S5: `needsProfile` — a null identity stops being fatal, and the kind rides in metadata
- [ ] S6: `POST /session/profile` in both transports
- [ ] S7: `/welcome` as the front door, and `/otp` carrying the choice through

### Checkpoint B: /welcome is the front door, and a new address comes out of it with a profile

### Phase 3: Frontend — the coachless client
- [ ] S8: `trainerId: string \| null`, and `GET /trainer` answers null
- [ ] S9: `hasCoach()` and the surfaces it hides
- [ ] S10: An individual sets their own goals, macros and habits

### Checkpoint C: an individual can train for a week without a coach

### Phase 4: Coming together
- [ ] S11: `invite_client` adopts a coachless account
- [ ] S12: Sign-in and OTP copy, and the way in for a new user
- [ ] S13: Seed and mock fixtures — one individual, one self-signed coach
- [ ] S14: Docs — `ARCHITECTURE.md`, `BACKEND_DATA_SCHEMA.md`, backend `README.md`, old-todo T5 struck

### Checkpoint D: complete

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `create_profile` is DEFINER — a bug there is an account-takeover bug | **High** | It never takes an identity as a parameter: `auth.uid()` and the email off `auth.users`. Two refusals (existing `auth_user_id`, existing email) before any write. S2's acceptance criteria test both, and the offline replay covers the "second call by the same uid" case. |
| Dropping NOT NULL is one-way in practice | Med | Nothing in the migration destroys data; reverting needs backfilling `trainer_id` for any individual who signed up. Note it in the migration header. |
| A `.single()` somewhere else assumes a trainer row | Med | S8 greps for `.single()` on `v_trainer_profiles` / `trainer_profiles` and for every `useSession().trainer` reader before changing the type. Making `TrainerProfile \| null` the type is what forces the compiler to find the rest. |
| Migration drift — the folder is not the remote | **High** | The standing trap in project memory `backend_schema`. Every backend task checks `list_migrations` first and applies by MCP under the file's name. |
| Someone enables the Before User Created hook after S3 | Med | S3 deletes the function, so enabling it in the dashboard fails to resolve rather than silently blocking signups. S14 strikes old T5. |
| `create_routine`'s `trainer_id` fallback is `(select id from trainer_profiles limit 1)` | Med | Under RLS that returns nothing for an individual, so trainer_id lands null — right answer for the wrong reason. S1 makes it explicit rather than leaving it to RLS. |
| The role choice is lost between picking it and verifying the code | Med | It rides in `auth.users.raw_user_meta_data` via `options.data`, so it survives leaving the app, a cold start and a device switch. When it is missing for any reason, recovery mode on `/welcome` asks again — the flow degrades to the first draft's behaviour rather than failing. |
| Coach self-signup is ungated: anyone can be a coach | Low | Accepted. A coach with no clients can do nothing to anyone else; `is_trainer_of` gates every cross-user read. |
| A user signs up as an individual, then their coach invites them, then they sign in on a stale cache | Low | `persistence.ts` caches `{authUserId, userId, role}`; the ids do not change on adoption, only `trainerId`, which is not cached. RTK Query refetches `/clients/:id` on mount. |

---

## Open questions

- **Can an individual be adopted by a coach without being asked?** As planned, yes — the coach types
  the address and the account attaches, and the client finds out by seeing a coach appear. That is
  the lazy version and it matches how invites already work for new addresses. If it needs consent,
  that is a pending flag on `client_profiles` and an accept banner, and it belongs in its own task.
- **What does a coach see of the history an individual built alone?** Everything, immediately —
  `owns_client` is uniform. Worth confirming that is intended before S11 ships.
- **Should the seeded `t-001` keep `tracks` null?** It is deliberately null today so the first-run
  card is reachable in dev. A self-signed-up coach lands in the same state, which is now the real
  first-run path rather than a dev-only one.
