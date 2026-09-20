# Billing: subscriptions for coaches and individuals

Built 2026-09-20. Razorpay Subscriptions (auto-debit mandate), tiers by roster size, 14-day trial
for individuals. Separate from `tasks/signup-todo.md` (S1–S14), which is still open at S8.

Workspace rule as ever: **build only; tests on request.**

## The one rule

Entitlement is a single comparison, in Postgres (`plan_active()`) and in the app (`planActive()`):

```
current_period_end is null  -> never expires (the free coach tier, and the grandfathered fixtures)
current_period_end > now()  -> paid up
```

`status` (`trialing | active | past_due | cancelled`) is **copy, not a gate**. Someone who cancels
mid-cycle keeps the app until the date they paid for and lapses on their own when it passes — so
there is no sweep job, no `pg_cron`, and nothing to go wrong at midnight.

## Pricing — PLACEHOLDER

Amounts are a guess to make the screens real. The tier *shape* is the decision; change
`plans.price_paise` on the remote when the numbers are settled — no app release, no migration.

| code | role | price (placeholder) | seats |
|---|---|---|---|
| `coach_free` | trainer | ₹0 | 2 |
| `coach_starter` | trainer | ₹999/mo | 15 |
| `coach_pro` | trainer | ₹2,499/mo | 50 |
| `coach_elite` | trainer | ₹4,999/mo | unlimited |
| `solo` | client | ₹299/mo | n/a, 14-day trial |

A coached client never pays and is never asked — they are the seat their coach is paying for.

## What is built

**Backend** — `supabase/migrations/20260920000001_billing.sql`
- `plans` and `subscriptions` (one row per user, `user_id` is the PK).
- `plan_active()`, `seat_limit()`, `start_subscription()`.
- `owns_client()` re-created with `plan_active()` inside its trainer branch. **That one line is the
  whole roster gate**: the pending RLS set routes ~20 tables through `owns_client()`, so a lapsed
  coach loses clients, logs, sets, metrics, nutrition and every child table together. The client
  branch is untouched, which is why nobody's data goes anywhere.
- `invite_client()` refuses past the seat cap and when the plan has lapsed (`PT402`). **This gate
  works today**, before the RLS set is applied — it is what stops a coach minting seats they have
  not paid for whatever the app is showing them.
- `create_profile()` starts a coach on `coach_free` and an individual on a 14-day `solo` trial.
- Existing users are grandfathered onto perpetual rows; `seed/auth_dev_users.sql` does the same for
  a fresh offline replay, where the migration's backfill runs before the fixtures exist.
- Write grants on both tables are revoked from `authenticated` — Supabase hands them out by default
  and RLS would otherwise be the only thing between a client and their own `plan_code`.

**Edge functions** — `supabase/functions/`
- `razorpay` (JWT): `{action:'subscribe', planCode}` creates the subscription and returns its
  hosted `short_url`; `{action:'cancel'}` cancels at cycle end.
- `razorpay-webhook` (no JWT, HMAC-verified): `subscription.charged` → active + new period end;
  `.halted`/`.pending` → past_due, date untouched; `.cancelled`/`.completed` → cancelled.
  The webhook is the only thing that moves money-backed state.

**Frontend**
- `GET /plans`, `GET /subscription`, `POST /subscription/checkout`, `POST /subscription/cancel` in
  both transports. The mock activates instantly, so the paywall is testable offline.
- `src/app/plans.tsx` — the price list for both roles, `useSubscription()`, `<Paywall/>`.
- Gated: trainer roster, dashboard and client detail; the client shell for individuals (after
  intake, so the trial is usable).
- `PlanSummary` is the plan row on both profile screens — plan, price, status, tap through to
  `/plans`. It renders nothing (heading included) for a coached client, who has no plan of their
  own. Cancelling lives on `/plans` only, and takes two taps: `Alert.alert` is dead on web, so the
  button confirms itself.
- **No payments SDK and no new dependency.** Checkout is Razorpay's own hosted page opened with
  `expo-web-browser`, which was already installed — so web and android take the identical path and
  no card detail ever touches this app.

## Deployed 2026-09-20

Applied and deployed against project `vxytcykmeskjdyxtrjco` (WorkoutApp, ap-southeast-1):

- **Migration applied** as `billing`. Verified on the remote: 5 plan rows, `owns_client()` carries
  the `plan_active()` clause with `security definer` intact, `t-001` grandfathered to `coach_pro`
  perpetual (`plan_active` true, `seat_limit` 50), and the 10 coached clients correctly have no
  subscription row of their own.
- **Both edge functions deployed**: `razorpay` (verify_jwt **on**) and `razorpay-webhook`
  (verify_jwt **off** — the HMAC is its auth).

## Razorpay plan objects — created 2026-09-20 (TEST mode)

Created against test key `rzp_test_TeHqTzR1Q3zB21` and written into `plans.razorpay_plan_id`.
All monthly, interval 1, INR, `notes.plan_code` carries the app-side code.

| code | razorpay_plan_id | amount (paise) |
|---|---|---|
| `coach_starter` | `plan_TeI1LjQpGhreWP` | 99900 |
| `coach_pro`     | `plan_TeI1N43kp9mDdV` | 249900 |
| `coach_elite`   | `plan_TeI1O2buKlQDde` | 499900 |
| `solo`          | `plan_TeI1P6UpZiKWQl` | 29900 |

`coach_free` stays null on purpose — nothing to sell.

**These are TEST plan ids.** Live mode is a different Razorpay account namespace: going live means
creating four more plan objects with the live key and re-running the same UPDATE. The `plans` table
is the swap point — no migration, no app release.

`api.razorpay.com` had to be added to the network allowlist before any of this could run.

## Wiring verified 2026-09-20

Sneha set the secrets and registered the webhook. Checked from here:

- **Webhook registered and active** (Razorpay `GET /v1/webhooks`): id `TeIXVcD80aMVKp`, url
  `https://vxytcykmeskjdyxtrjco.supabase.co/functions/v1/razorpay-webhook`, `active: true`,
  `secret_exists: true`. All five events the function handles are on.
  Extra events are also enabled — `subscription.authenticated`, `.activated`, `.paused`,
  `.resumed`, `.updated` and the `refund.*` set. They hit the function's `default:` branch and
  return 200 `ignored`. Harmless; no code needed.
- **`RAZORPAY_WEBHOOK_SECRET` is set in Supabase.** Probed by signing `{}` with the literal string
  `"undefined"` — the value `Deno.env.get` yields when a secret is missing. It answered 401
  `bad signature`, so a real secret is in place. A garbage signature is also correctly 401.
- **`razorpay` function works end to end up to the Razorpay call**: signed in as the seeded dev
  trainer, `{action:'cancel'}` returned 404 `Nothing to cancel`. That exercises JWT verification,
  the `app_user_id()` RPC under the caller's token, and the service-role read of `subscriptions`.

- **`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` are set in Supabase and authenticate.** Confirmed with
  a temporary read-only `rzp-check` edge function that did a `GET /v1/plans?count=1` with the env
  vars as stored in the project: `keyIdPresent` true, `keySecretPresent` true, prefix `rzp_test…`,
  `razorpayStatus` 200. It wrote nothing and created nothing. Now redeployed as an inert 410 stub
  — **delete `rzp-check` in the dashboard** when convenient (MCP has no delete for functions).

The whole chain is wired. The only thing not exercised is a real mandate, which needs a human at a
checkout page.

## Checkout path proven 2026-09-20

`{action:'subscribe', planCode:'coach_pro'}` as the seeded dev trainer returned
`https://rzp.io/rzp/bw0gBf9m`. Both sides agree:

- Razorpay: `sub_TeImQkOK1saUVQ`, `status: created`, `plan_TeI1N43kp9mDdV` (the coach_pro plan
  object), `paid_count` 0, `total_count` 120, `notes.user_id` = `t-001`.
- DB: same id stored in `razorpay_subscription_id`; `plan_code` still `coach_pro`, `status` still
  `active`, `current_period_end` still null, `plan_active()` true, `seat_limit()` 50.

`coach_pro` was chosen deliberately — it is the tier t-001 was already grandfathered onto, so the
only column that changed is `razorpay_subscription_id`. No entitlement or seat-cap change.

Known no-op: `razorpay_customer_id` stays null. Razorpay does not return `customer_id` on
subscription create (it is assigned at authentication) and the webhook never backfills it. The
column is currently unused, so this costs nothing — wire it in the webhook if it is ever needed.

## CORS fix 2026-09-20

`supabase/functions/razorpay/index.ts` had no CORS and no OPTIONS handler, so every browser call
died on preflight: *"No 'Access-Control-Allow-Origin' header is present"* from `localhost:8081`.
The old code answered the preflight with 405 `Method not allowed`.

Fixed at the single place every response already went through — the `json()` helper — plus one
early return for OPTIONS. Deployed (version 8) and verified: preflight now 204 with the three
headers, and a POST from `Origin: http://localhost:8081` carries them too.

`Access-Control-Allow-Origin: *` is deliberate. The auth here is the JWT in the Authorization
header, not an ambient cookie, and there is no `Allow-Credentials`, so a hostile origin has nothing
to replay. An origin allowlist would need a new entry for every dev port and deploy domain.

`razorpay-webhook` is **not** given CORS: Razorpay posts to it server-to-server, no browser
involved.

## Found while verifying: Cancel breaks on an abandoned checkout — FIXED 2026-09-20, see below

Start checkout, close the browser without paying, then tap Cancel -> the app shows a raw 502
*"Subscription cannot be cancelled since no billing cycle is going on"*. Razorpay refuses to cancel
a subscription still in status `created`, but the row already holds its
`razorpay_subscription_id`, so the cancel branch calls Razorpay and surfaces the error verbatim.

Reachable by any user who opens checkout and changes their mind. Not caused by the CORS work — it
was always there, just unreachable until a subscription existed.

Fixed in the audit below: the cancel branch asks Razorpay for the subscription's status first and
only calls cancel when something is actually billing.

## The one decision left

**Paying that link converts t-001 from perpetual to dated.** `subscription.charged` sets
`current_period_end` to a real date, so the grandfathered fixture would start expiring (~1 month,
then lapse). That is the whole point of the test, but it is a one-way change from this session:
writes to `subscriptions` are refused here by the auto-mode classifier, so restoring
`current_period_end = null` afterwards has to be done by hand.

- Want the full webhook proof: pay it with test card `4111 1111 1111 1111`, any future expiry, any
  CVV, and approve the mandate. Then set `current_period_end` back to null if the perpetual fixture
  matters.
- Want t-001 left alone: skip it. Everything except webhook *delivery* is already verified, and the
  webhook is registered, active and HMAC-checked.

## Still to do

1. Decide on the checkout test above.
2. **Delete the `rzp-check` function** in the dashboard (inert 410 stub, but litter).
3. **Going live**: four new plan objects under the live key, the same UPDATE on
   `plans.razorpay_plan_id`, live secrets, and a second webhook on the live account.

## Deliberately skipped

- **Proration and mid-cycle upgrades.** Choosing a bigger tier starts a new Razorpay subscription;
  the old one is not cancelled automatically. Add it when someone actually upgrades mid-cycle.
- **Invoice history, receipts, GST.** Razorpay's own dashboard and its emails cover these until
  there is a reason to bring them in-app.
- **Dunning copy.** `past_due` shows one line; Razorpay does the retrying and the emailing.
- **A downgrade path that sheds clients.** The plans screen refuses to sell a tier smaller than the
  roster rather than deciding which clients to drop — that is a product decision, not a bug.
- **Annual plans.** One more row in `plans` and one more plan object in Razorpay, if wanted.

## Verified (offline Postgres 16, whole chain + seed + pending RLS)

- Paid coach: 8 clients / 144 logs / 2290 sets / 504 metrics — identical to the numbers recorded in
  the pending RLS file before billing existed.
- Lapsed coach: 0 of all of them, and 0 rows written.
- Client c-001 throughout: 1 profile, 44 logs, 1 thread. Unchanged, unaffected.
- Client cannot write `subscriptions` (permission denied — the grant, not the policy).
- Free tier at 8 clients refuses a ninth (`PT402 Your plan covers 2 clients`); on Pro the same
  invite succeeds; lapsed refuses whatever the cap (`PT402 Your plan has expired`).
- New coach → `coach_free`, perpetual, `tracks` null. New individual → `solo`, trialing, 14 days,
  coachless; inactive the moment the trial date passes, while the coach stays active.
- Individual reads their own subscription (1 row) and still edits their own macros.
- `npx tsc --noEmit` clean; `expo export --platform android` (6.1MB) then `--platform web` both
  succeed, with `/plans` among the prerendered routes.

`tests/rls.sql` gained six billing cases and **now runs to completion** -- 66 cases, first full run
since the S4 edits. Getting there meant fixing two things that predate this work:

- **The seed never advanced `id_sequences`** (the standing trap in project memory `backend_schema`).
  `20260831000006` has the right block but runs at migration time, before the rows exist, so it
  advances the counters past nothing. `next_id('c')` therefore minted `c-001` on the first RPC write
  after any fresh seed. `seed.sql` and `seed/chunks/seed_07.sql` now end with a counter bump, and
  `seed.mjs` emits it, so a regenerated seed keeps it. It is derived from the schema rather than a
  prefix->table list -- that hardcoded list in `20260831000006` is exactly what went stale when `c`
  and `t` were added later.
- **`invite_client` reported every unique violation as a duplicate email**, which is what hid the
  above: a primary-key collision came back as "That email already has an account" for an address
  nobody had used. It now checks the constraint name and re-raises anything that is not the email.

`restored_clients` reads 9, not 8: the onboarding section invites two clients and revokes one before
the billing cases run.


# Audit and fixes — 2026-09-20

A read of the whole billing path against what the functions actually do. Eight defects, five of
them money or access. Everything below is applied, deployed and checked against the live project.

## 1. Opening checkout granted the plan (critical, and it had already happened)

`razorpay/index.ts` wrote `plan_code` to the row the moment a subscription object was created —
before the mandate, before a rupee. A `coach_free` row is perpetual (`current_period_end is null`),
so tapping Elite and closing the browser left a **free, never-expiring row with unlimited seats**.
`seat_limit()` reads `plan_code`, so the cap went with it.

Found live: `t-001` was sitting on `coach_starter`/`cancelled`, down from the grandfathered
`coach_pro`/50 seats, with `current_period_end` still null. Restored by migration
`20260920000003`, guarded on `current_period_end is null` so it cannot touch a row that has ever
been charged.

**The function no longer writes `plan_code`, `status` or `current_period_end` for a paid tier at
all.** It writes `razorpay_subscription_id` and nothing else. The webhook sets `plan_code` from
`entity.plan_id`, looked up in `plans.razorpay_plan_id` — the plan Razorpay says it charged, not
the plan the app hoped for. The free tier is the one exception: no money moves, so no webhook will
ever speak for it.

## 2. Upgrading billed twice, for ever

Subscribing while a live mandate existed created a second Razorpay subscription and overwrote the
stored id. The old mandate kept charging and its `subscription.charged` events no longer matched
any row, so the double billing was also invisible. Now: the existing subscription is cancelled at
cycle end first, and the new one is created with `start_at` set to the paid-through date, so the
next charge lands when the old period ends instead of on top of it.

## 3. Any signed-in user could read everyone's billing

`subscriptions` was left on the dev-posture `using (true)` select policy. Worse, the transport's
`GET /subscription` has no `user_id` filter *by design* — it leans on RLS — so `.maybeSingle()`
would have errored for everyone the moment a second person subscribed. The pending set's
`subscriptions_self_read` is pulled forward into `20260920000003`. `plans` stays public; it is a
price list.

## 4. A client could buy `coach_free`

`planCode` comes off the request and the plan's role was never checked against the caller's. With
the free branch added in fix 1 that is a perpetual coach row for nothing. The function now refuses
a plan whose `role` is not the caller's.

## 5. The free tier was unreachable, and downgrades were unpoliced

Free had no button, so a coach who cancelled had **no way back into the app at all** — and the seat
cap only ever bit at invite time, so dropping to free with forty clients would have kept all forty
visible for ever. Both ends fixed: free is choosable (two-tap, it ends a paid period), and the
function refuses any plan whose cap is below the roster the coach already has — `409 "That plan
covers 2 clients and you have 10."`, mirrored in the mock transport and already mirrored in the UI.

Known corner, not fixed: a lapsed coach over the free cap cannot reach free and cannot shed clients
either, because the roster is behind the paywall. Pay, or support removes a client. Say the word if
that should be an unlock instead.

## 6. Cancel after an abandoned checkout (the open rough edge above)

`cancelAtRazorpay()` reads the subscription's status first and only cancels what is actually
billing. A `created` subscription is not an error any more: the dead id is cleared, the plan is
left alone, and Cancel stops offering itself.

## 7. Smaller ones

- Webhook: `current_end` missing on a charge wrote **1970** and lapsed someone who had just paid.
  The date is now left alone when it is absent.
- Webhook: a charge that matches no row (a stale checkout tab paid after a second one replaced the
  id) was answered `200 ok` and the money vanished. It now falls back to `notes.user_id` and adopts
  the id. **Charges only** — a cancellation of a superseded subscription must never be applied to
  the live one.
- `razorpay`: a user with no subscription row would have paid into a zero-row update. It inserts an
  already-expired row first, so the charge has something to land on.
- `razorpay`: a stale id from another Razorpay account (test ids after the switch to live keys)
  used to make subscribing impossible. A 404 from the pre-cancel is ignored; nothing else is.
- Transport: `functions.invoke` collapses every non-2xx into one opaque error, so the function's own
  message was replaced by "Could not reach the payment gateway". `fnError()` reads it back.
- `useSubscription`: a failed request put a paywall over a paid-up roster. It now gates only on an
  answer it actually has (`sub.data === undefined` covers loading *and* error; a real "no
  subscription" arrives as `null` and does gate).
- `statusLine`: an expired trial said "Trial — 0 days left" for ever. It says "Trial ended".
- `plans.tsx`: every Choose button span while any one was loading; a cancelled plan showed "Your
  plan" with no way to re-take it; the Cancel button keyed off the literal string `coach_free`
  instead of the price; the post-checkout refetch fired while the web checkout tab was still open
  (`refetchOnFocus`, `setupListeners` was already wired).

## Verified live, 2026-09-20

Signed in as the dev trainer against `vxytcykmeskjdyxtrjco`:

| check | result |
|---|---|
| `GET /subscriptions` under RLS | exactly 1 row, t-001's own |
| `{action:'cancel'}` with no id | 404 `Nothing to cancel` |
| trainer asks for `solo` | 403 `That plan is not for this account` |
| trainer with 10 clients asks for `coach_free` | 409 `That plan covers 2 clients and you have 10.` |
| unknown plan | 404 |
| subscribe to `coach_elite`, then read the row | `short_url` returned; **`plan_code` still `coach_pro`, `current_period_end` still null** |
| cancel that abandoned checkout | 200 `{ok:true}`, id cleared, plan untouched |

`npx tsc --noEmit` clean. Fixture left exactly as it started: `coach_pro`, active, perpetual, no
subscription id.

## Still open

Unchanged from above: the checkout mandate test, deleting `rzp-check`, and going live. `plan_code`
now moving only on `subscription.charged` means the mandate test is also the proof that the webhook
sets the plan — worth doing in that order.
