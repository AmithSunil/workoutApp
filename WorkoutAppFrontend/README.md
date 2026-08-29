# Apex — dual-sided coaching platform

A React Native (Expo) app that serves personal trainers and their clients from
one codebase, with role-based routing deciding which product a signed-in user
sees.

## Getting started

```bash
npm install
npx expo start          # then press i / a, or scan the QR code with Expo Go
```

On launch you land on a role gate. Pick **Maya Fernandes** to use the trainer
side, or any of the eight clients to use the client side — **Aditya Rao** has the
richest history. Tap the avatar in any header to switch profiles.

## Scripts

| Command | Does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm run mock-data` | Regenerates `src/mock-api/*.json` (deterministic) |
| `npm run verify` | Typechecks, bundles for **native**, then drives both roles in a headless browser and fails on any runtime error |

## Client interface

- **Explore** — today at a glance: calorie gauge, macro bars, today's session
  with a start CTA, habit checklist, weight trend, and a discovery strip.
- **Log** — circular calorie gauge and macro progress bars, a quick-add carousel
  of the client's most-logged foods, a food search sheet, and an AI parser that
  turns "two eggs on toast with half an avocado" into an editable confirmation
  card. Nothing the model produces is written until the client confirms it.
- **Workouts** — the programme the trainer published, a weekly load chart, and
  live session logging: per-set weight and reps, large completion targets, and a
  1–10 RPE slider with plain-language anchors.
- **Progress** — an interactive body-weight chart (drag to inspect any day) with
  a 7-day trend overlay and goal line, a progress-photo timeline grouped into
  shoots, and habit consistency.
- A chat FAB is pinned above the tab bar on every tab, and a persistent coach
  indicator sits at the top of the home screen.

## Trainer interface

- **Triage** — the command centre: active clients, check-ins due, unread
  messages, red flags and average adherence, a roster pulse strip, then the
  automated alerts ordered by severity (missed logs, RPE spikes, weight stalls,
  calorie misses) each with Message and Dismiss, the pending check-in queue, and
  a watchlist of anyone under 80%.
- **Clients** — searchable roster with traffic-light status dots, adherence
  score, streak and an inline weight sparkline, filterable by compliance and
  sorted worst-first.
- **Client detail** — pinned header stats over four nested tabs: Metrics (weight
  and body-fat charts, photos), Nutrition (weekly caloric compliance bars plus an
  adherence table and recent days), Workouts (audit trail with a high-strain
  warning), Plan (tick habits on the client's behalf, review programming).
- **Messages** — every thread, unread first, with an attachment picker that
  attaches a specific workout log or nutrition day to a message. The client sees
  it as a contextual card above the text, so feedback lands next to the data it
  refers to.

## Stack

Expo SDK 57 · React Native 0.86 · expo-router · TypeScript (strict) · Redux
Toolkit + RTK Query · react-native-svg · react-native-reanimated

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the folder contract, the data layer
and how to point the app at a real backend.

## Mock API

All data is served from `src/mock-api/*.json` through a mock transport that
mimics `fetchBaseQuery` — same request shape, simulated latency, real status
codes. Writes mutate an in-memory database, so the two sides stay in sync inside
a session: log a meal as a client and the trainer's compliance numbers move;
finish a session at RPE 9 and a red flag appears on the triage dashboard.

Regenerate the dataset with `npm run mock-data`. It is seeded, so the output is
byte-identical every run.
