# Architecture

A single React Native (Expo) codebase serving two products — a client app and a
trainer app — over one shared data layer.

## Layers

```
src/app/          Routing only. Screens compose features; they hold no data logic.
src/api/          Transport + endpoints. The only place that knows how data is fetched.
src/store/        Redux Toolkit store, slices for local state, typed hooks.
src/components/   Presentational + connected components, grouped by feature.
src/theme/        Design tokens. No hex value or magic number lives outside this folder.
src/types/        The domain model shared by both roles.
src/utils/        Pure helpers (dates, formatting).
src/navigation/   Route helpers — every path string in the app is defined here.
src/mock-api/     Generated JSON fixtures (see tools/generate-mock-data.js).
```

The dependency rule is one-directional: `app → components → api/store → types/utils`.
Nothing in `components/` imports from `app/`, and nothing outside `src/api` imports
`mockDb`.

## Role-based routing

```
src/app/_layout.tsx              Redux Provider, session hydration, root Stack
src/app/index.tsx                Role gate (auth handshake in production)
src/app/(client)/_layout.tsx     Guard: bounces non-clients
  (tabs)/_layout.tsx             explore · log · workouts · progress + persistent chat FAB
  chat.tsx, session/[id].tsx, routine/[id].tsx
src/app/(trainer)/_layout.tsx    Guard: bounces non-trainers
  (tabs)/_layout.tsx             dashboard (triage) · roster · routines · messages
  client/[id].tsx, thread/[id].tsx
  routine/new.tsx, routine/[id].tsx, routine/edit/[id].tsx
  assignment/[id].tsx
src/app/workout-log/[id].tsx     Shared by both roles
```

Each group layout reads `session.role` from Redux and `<Redirect>`s before any
screen in its subtree renders, so a client can never reach a trainer route by
deep link and vice versa.

## Data layer

Every read and write goes through **RTK Query**, split by feature area with
`injectEndpoints`:

| Module | Owns |
| --- | --- |
| `api/endpoints/nutritionApi` | Days, entries, food search, AI suggestions |
| `api/endpoints/workoutsApi` | Programme, sessions, logs, exercise library |
| `api/endpoints/routinesApi` | Routine templates, assignments, per-client customisation |
| `api/endpoints/progressApi` | Body metrics, photos, habits |
| `api/endpoints/messagingApi` | Threads, messages, read receipts |
| `api/endpoints/trainerApi` | Roster, summary, alerts, check-ins, compliance |

`api/mockBaseQuery.ts` is a drop-in replacement for `fetchBaseQuery`: same
argument shape (`{ url, method, params, body }`), simulated latency, real HTTP
status codes. It dispatches to URL-shaped handlers in `api/handlers.ts` which
mutate an in-memory database seeded from `src/mock-api/*.json`.

**Swapping to a real backend is a one-line change** in `api/baseApi.ts`:

```ts
baseQuery: fetchBaseQuery({ baseUrl: process.env.EXPO_PUBLIC_API_URL })
```

Nothing above the transport changes — every `injectEndpoints` call, cache tag and
component stays as it is. `api/handlers.ts`, `api/mockDb.ts` and `src/mock-api/`
are then deleted.

Because writes mutate the in-memory db, they behave like a real server: log a
meal and the trainer's compliance numbers move; miss four days of logging and a
red-flag alert appears on the triage dashboard.

## Routines vs sessions

Two things describe training, and they are deliberately separate:

- A **`WorkoutSession`** is dated. It is a concrete instance the client starts,
  logs and completes, and it drives the compliance numbers.
- A **`Routine`** carries **no dates at all**. It is a weekly template the
  trainer writes once — days pinned to *weekdays*, each with exercises stating
  target sets, a rep *range* and rest — and assigns to any number of clients.

A weekday with no `RoutineDay` is a rest day: the absence *is* the rest day, so
a four-day split is simply four entries and the week reads as a shape.

`RoutineExercise` states intent (`sets: 4, repMin: 8, repMax: 12`) rather than
enumerating `PrescribedSet[]` the way `ProgrammedExercise` does. That keeps the
builder to one row per exercise, which is how coaches actually write programmes.

## Assignment and per-client customisation

`Routine.assignedClientIds` is **derived**, not stored — the source of truth is
the `RoutineAssignment` table, one row per (routine, client) pair. Handlers
recompute the field on read via `withAssignments`, so the two can never drift.

Each assignment holds `customDays`, which is **copy-on-write**:

- `null` — the client follows the library template, and edits to it reach them.
- a full day snapshot — taken the first time the trainer changes anything for
  that client. From then on the template no longer reaches them, which is what
  "change it for this client only" has to mean. `POST /assignments/:id/reset`
  drops the snapshot and puts them back on the template.

Both roles read the resolved `AssignedRoutine` (`GET /assignments`), never a
`Routine`, so the client's app and the trainer's view of that client cannot
disagree about the prescription. The trainer edits a client's copy on
`assignment/[id]`; the library template is edited on `routine/edit/[id]`, which
warns first about how many clients have diverged.

Customising adjusts prescriptions and the exercises within a day. The day set
itself is fixed by the template, so a client's copy stays comparable with it.

`RoutineDayView` and `RoutineExerciseRow` render the prescription for both
roles, so what the coach wrote and what the client reads can never drift apart.

## What lives in Redux vs RTK Query

RTK Query owns anything the server owns. Plain slices own only what it doesn't:

- `sessionSlice` — who is signed in, which client is being viewed, the active
  date. Persisted to AsyncStorage (`store/persistence.ts`).
- `workoutDraftSlice` — the in-progress workout. Sets are edited many times a
  second mid-session; only the finished log is POSTed.
- `uiSlice` — roster search and filter, selected nested tab, pending meal slot.

## Design system

`src/theme/tokens.ts` defines colour, spacing, radius, elevation, motion and the
type scale. `src/components/ui/` wraps them into primitives — `Text` is the only
text component in the app, so the type scale stays auditable in one file.

The system is light and energetic, and deliberately uncluttered. Its rules, and
why they live in tokens rather than per screen:

- **Neutral canvas, white cards, one blaze-orange accent.** `#F4F5F7` ground,
  `#DD4410` primary (fills, icons, rings; 4.3:1 under white text) and
  `primaryText` `#B23508` for accent text on light surfaces (5.3:1) — `Text`'s
  `tone="primary"` resolves to it. Energy comes from that one accent and heavy
  display type (Inter 800 on `title`/`display`/metrics), never from extra cards,
  gradients or icons. `surfaceInk` is the single dark surface — today's workout
  hero — used at most once per screen. Text bottoms out at `#111318`.
- **Rounding is a token, never a local decision.** The `radius` scale
  (`xs: 10` … `xxl: 36`, plus `pill`) is deliberately generous — nothing in the
  product is square-cornered, and even the smallest step is visibly soft, so a
  surface that looks boxy is using the wrong token rather than needing a new
  one. Raising or lowering the softness of the whole product is one file. A
  component that needs a rounded corner takes it from `radius`; a literal number
  in a stylesheet is a bug, and anything meant to be circular or fully round
  (dots, badges, avatars, tracks, circular buttons) uses `radius.pill` rather
  than half its own height.
- **Depth is a wide, low-opacity shadow, not a rule.** `elevation.card` and
  `elevation.floating` keep their blur radius much larger than their offset —
  that ratio is what stops the shadow reading as a hard line under the card.
  Borders are for grouping, not for lift.
- **One family, no synthetic weights.** Inter throughout — a neutral,
  high-x-height UI face built for screens, which keeps small labels legible and
  leaves the rounded shapes to carry the softness on their own. Inter tracks
  loose at large sizes, which is why the display and metric variants carry
  negative tracking while body sizes sit at 0.
  React Native ignores `fontWeight` on a custom font, so a weight is a
  *different family name* — `fonts` maps them (400/500/600/700, plus 800 for
  hero readouts) and `fontFor(group, weight)` resolves the `weight` prop on
  `Text`. A raw `fontWeight` in a stylesheet is silently a no-op; set
  `fontFamily` instead.
- **Numbers get tabular figures rather than a second family.** `metric` and
  `metricLg` carry `fontVariant: ['tabular-nums']`, which is what keeps columns
  of loads and totals aligned without pulling in a monospace face.
- **Motion is fast and lives on the UI thread.** Every tappable surface (card,
  button, chip, tile, FAB) goes through `PressableScale` (Reanimated shared
  value, scale to `motion.pressScale` 0.97 in ~120ms, strong ease-out) rather
  than a `({ pressed })` opacity callback. Full-bleed list rows inside a card
  keep a pressed highlight instead — a scaling row looks detached from its card.
  `Sheet` fades its backdrop and springs the panel up, exits faster than it
  enters; `SegmentedControl` slides one thumb. Tab switches never animate.
  Curves live in `motion.easeOut` / `motion.easeDrawer`; `ease-in` is never used.
  Reduced motion is Reanimated's default `ReduceMotion.System` (snaps).
- **Fonts gate the first paint.** `src/app/_layout.tsx` holds the splash screen
  until `useFonts` settles, so no screen paints in a fallback face and reflows.
  A font *error* also counts as settled — a missing file must not wedge the app.

Charts are hand-built on `react-native-svg` (`components/charts/`) rather than a
chart library, which keeps the visual language consistent with the rest of the
system and avoids a dependency that would need re-styling anyway.

## Verification

`npm run verify` (`tools/verify.js`) runs three stages, cross-platform:

1. **Typecheck** — TypeScript in strict mode across the whole tree.
2. **Native bundle** — `expo export --platform android`. This stage is not
   optional: Metro's *web* target silently shims Node builtins that native does
   not, so a web-only check will pass on an import that crashes on device. That
   is exactly how `react-native-svg`'s undeclared `buffer` import slipped
   through the first time.
3. **Browser walkthrough** — bundles for web, serves it (`tools/serve.js`) and
   drives both role shells in headless Chromium (`tools/screenshot.js`), failing
   on any console error or uncaught exception and writing screenshots to
   `shots/`. Skipped gracefully when no Chromium binary is found; point
   `CHROME_PATH` at one to enable it.

### Why `buffer` is a direct dependency

`react-native-svg@15.13.0` does `import { Buffer } from 'buffer'` in
`src/utils/fetchData.ts` without declaring `buffer` in its own dependencies.
Metro resolves it on web and fails on native. `buffer` is therefore pinned in
`package.json` on purpose — do not remove it as an unused dependency. It can go
once react-native-svg ships a version that declares or drops the import.

## Known constraints of the demo build

- Avatars and progress photos reference remote placeholder services
  (`i.pravatar.cc`, `picsum.photos`). Offline, avatars fall back to monograms
  and photo tiles to gradients. Swap `avatarUrl` / `uri` in the mock data for
  real assets.
- `TODAY` in `src/utils/date.ts` is pinned to the dataset's anchor date so the
  demo is reproducible. Replace it with `new Date()` when a live backend lands.
- The AI food parser matches typed text against fixtures in
  `mock-api/aiSuggestions.json`; the confirmation-card flow around it is the
  real, production-shaped interaction.
