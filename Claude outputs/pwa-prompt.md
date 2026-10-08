Make WorkoutAppFrontend an installable PWA. Web only — do not touch native behaviour, Supabase, or edge functions. Use the Ponytail skill: no new dependencies (no Workbox, no next-pwa, no expo-pwa plugins), fewest files, shortest diff.

Read first: `ARCHITECTURE.md`, `CLAUDE.md`, `app.json`, `src/app/_layout.tsx`, `src/app/plans.tsx`, `src/app/(client)/train/[id].tsx`, `src/theme/tokens.ts`.

Context you need:
- `app.json` already has `web.output: "static"` (expo-router static export, ~40 prerendered routes). There is no `public/` folder and no `src/app/+html.tsx` yet.
- Background colour is `#F8F9FC`, adaptive-icon background `#F0F2FE`. Take colours from `src/theme/tokens.ts`, don't invent new ones.
- Source icon: `assets/images/icon.png`. Splash: `assets/images/splash-icon.png`.
- Supabase session on web uses supabase-js default storage (localStorage) — leave `src/utils/supabase.ts` alone.
- `Alert.alert` is a no-op on react-native-web. The repo's pattern is a second-tap confirm or a `Sheet` (see `src/components/auth/DeleteAccountButton.tsx`, `src/app/(trainer)/client/[id].tsx`).

## 1. Manifest + icons

- Create `public/manifest.json`: `name: "Apex Coaching"`, `short_name: "Apex"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` and `theme_color` from tokens, icons 192, 512, and a 512 `purpose: "maskable"`.
- Generate the PNGs into `public/icons/` from `assets/images/icon.png` with whatever is already available (sharp via `npx`, ImageMagick, or python Pillow). The maskable one needs the logo inside the central ~80% safe zone on the `#F0F2FE` background. Also make a 180×180 `apple-touch-icon.png`.

## 2. `src/app/+html.tsx`

Copy the default expo-router `+html.tsx` (ScrollViewStyleReset etc.) and add to `<head>`:
- `<link rel="manifest" href="/manifest.json">`
- `<meta name="theme-color">` (same value as the manifest)
- `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
- `apple-mobile-web-app-capable=yes`, `mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=default`, `apple-mobile-web-app-title=Apex`
- viewport: `width=device-width, initial-scale=1, viewport-fit=cover` (so safe-area insets work on notched iPhones in standalone mode)
- a body background of `#F8F9FC`, so there's no white flash
- an inline script that registers `/sw.js` only when `'serviceWorker' in navigator` and `location.hostname !== 'localhost'` (don't fight the dev server's hot reload)

## 3. `public/sw.js` — hand-written, about 30 lines

- `CACHE = 'apex-v1'`. Bump it by hand on releases that change the shell, and leave a `ponytail:` comment saying so.
- install: precache `/`, `/manifest.json` and the icons, then `skipWaiting()`. activate: delete other caches, then `clients.claim()`.
- fetch: **only same-origin GET**. Never touch requests to `*.supabase.co`, `rzp.io`, `razorpay.com`, or anything cross-origin. Let them go straight to the network: they carry auth tokens and live data.
  - navigations (`request.mode === 'navigate'`): network first, fall back to the cached response for that path, then to cached `/`.
  - `/_expo/static/` (content-hashed bundles) and `/assets/`: cache first, then store on fetch.
  - everything else: plain network.
- No offline data, no background sync, no push. Leave a `ponytail:` comment naming them as the upgrade path.

## 4. Web blockers in existing screens

a) **Razorpay checkout in `src/app/plans.tsx` `buy()`**: `WebBrowser.openBrowserAsync(shortUrl)` runs after `await checkout(...)`, so on the web it's a popup opened outside the user gesture. iOS Safari and standalone PWAs block it. Fix with the smallest branch: on `Platform.OS === 'web'`, do `window.location.assign(shortUrl)` instead. Native stays exactly as it is.
   - Check that when the user comes back to `/plans`, the page still detects the new plan, since the `awaiting` state is lost on a full page navigation. The simplest fix is to stash the awaited plan code in `sessionStorage` before leaving and re-read it on mount, web only. If the existing `/subscription` refetch on mount already covers it, say so and skip the stash.
   - Do NOT change the edge functions. Note in your summary whether Razorpay subscription links send users back to the app on their own (`callback_url` isn't set today), and how they'd get back if not.

b) **`src/app/(client)/train/[id].tsx`**: three `Alert.alert` calls (lines ~133, ~153, ~157), all dead on the web.
   - "Nothing logged" and "Could not save" are messages: show them inline with the existing `Text` primitive, the way other screens show errors.
   - "Discard workout?" is a confirm: use the repo's second-tap pattern.
   - Same fix on native and web. Don't fork by platform.

c) `grep -rn "Alert.alert" src` once more and fix any other live call the same way. Comments that only mention it are fine.

## 5. Hosting config

- Add one SPA fallback so dynamic routes work on a hard reload (`/client/[id]`, `/train/[id]`, `/routine/[id]`, `/routine/edit/[id]`, `/assignment/[id]`, `/thread/[id]`, `/workout-log/[id]`).
- I haven't picked a host. Add `public/_redirects` with `/*  /index.html  200` (Netlify and Cloudflare Pages both read it) and nothing else. In your summary, mention what Vercel would need instead.
- Make sure `sw.js` is served with `Cache-Control: no-cache`. Use a `public/_headers` file (Netlify/Cloudflare format) that also gives `/_expo/static/*` a 1-year immutable cache.

## 6. Build only (no tests — the standing rule for this repo)

- `npx tsc --noEmit` must be clean.
- `npx expo export --platform android` first, then `--platform web`, with `EXPO_PUBLIC_API_TRANSPORT=mock EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 EXPO_PUBLIC_SUPABASE_KEY=local-dev-anon-key`. The local VM kills commands at ~180s, so run the export in the cloud container as described in project memory `verification.md`.
- Confirm that `dist/` contains `manifest.json`, `sw.js`, `icons/`, `_redirects` and `_headers`, and that `dist/index.html` has the manifest link and the SW registration.

## Out of scope — don't do

Push notifications, offline logging, install-prompt UI, changing `android.package`, store/EAS config, analytics.

## Finish with

The list of changed and added files, the Razorpay return-path note from 4a, and the manual steps left for me:
- pick a host and set the prod `EXPO_PUBLIC_SUPABASE_*` build env
- set the Supabase Auth Site URL and redirect URLs to the prod domain
- test "Add to Home Screen" on one Android and one iPhone
