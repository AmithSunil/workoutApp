/**
 * The app's auth surface. Screens import from here and never from
 * `@supabase/supabase-js` or `@/utils/supabase` — the same containment rule
 * that keeps `mockDb` inside `src/api/*`.
 */
export { DEV_PASSWORD, signInWithPassword, signOutEverywhere } from './authService';
export { AuthFailure, authMessage, toAuthFailure } from './errors';
export type { AuthFailureKind } from './errors';
export { resolveIdentity } from './identity';
export type { AppIdentity } from './identity';
export { useAuthSession } from './useAuthSession';
