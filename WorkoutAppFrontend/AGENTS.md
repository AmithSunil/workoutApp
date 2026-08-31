# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# WorkoutAppFrontend

Dual-sided fitness platform. Read `ARCHITECTURE.md` before making structural changes.

Rules that matter here:

- **No hard-coded colours, spacing or font sizes.** Import from `@/theme`.
- **No raw `Text` from react-native in screens.** Use `Text` from `@/components/ui`.
- **No path strings in screens.** Add a helper to `src/navigation/routes.ts`.
- **Server data goes through RTK Query**, never a slice. Slices are for session,
  UI and the in-progress workout draft only.
- **Only `src/api/*` may import `mockDb` or the Supabase client.** Components
  talk to endpoints. Two transports sit behind one URL contract: Supabase by
  default, the mock when `EXPO_PUBLIC_API_TRANSPORT=mock`. `handlers.ts` is the
  spec; `src/api/supabase/routes.ts` mirrors it entry for entry, and both go
  through the shared matcher in `src/api/matchRoute.ts`.
- **A `.select()` string must be one literal** — supabase-js parses it at the
  type level and a concatenated string collapses the row type to `unknown`.
- **Only `src/auth/*` may touch `supabase.auth`**, and only the auth bootstrap
  writes the session slice. Screens import from `@/auth` and never see a
  Supabase type. Never `await` a Supabase call inside `onAuthStateChange` —
  it runs under the client's auth lock and deadlocks.
- `tabBar` render props are called as plain functions by react-navigation —
  never call a hook inside `AppTabBar`; safe-area values arrive in props.
- A web bundle passing proves nothing about native — Metro shims Node builtins
  on web only. `npm run verify` bundles for android for exactly this reason.
- `buffer` is a deliberate direct dependency: `react-native-svg` imports it
  without declaring it. Don't prune it.
- Run `npm run verify` before calling a change done.
