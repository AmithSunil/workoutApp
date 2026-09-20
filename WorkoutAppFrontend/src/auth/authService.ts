import type { Session } from '@supabase/supabase-js';

import type { ProfileInput } from '@/api/handlers';
import { supabase } from '@/utils/supabase';

import { toAuthFailure } from './errors';

/**
 * Everything that talks to Supabase Auth.
 *
 * The rule that only `src/api/*` may reach the transport has a sibling here:
 * only `src/auth/*` may reach `supabase.auth`. Screens import from `@/auth` and
 * never see a Supabase type, which is what keeps the provider swappable.
 */

/**
 * Shared password for the seeded fixture accounts. Deliberately not a secret —
 * these nine accounts exist so a dev build can sign in without SMTP, and they
 * are deleted before this project sees a real user (see the backend's
 * `seed/auth_dev_users.sql`). Only ever used behind `__DEV__`.
 */
export const DEV_PASSWORD = 'apex-dev-2026';

/** Signs in with email and password. Throws an `AuthFailure` on any problem. */
export const signInWithPassword = async (email: string, password: string): Promise<Session> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw toAuthFailure(error);
  if (!data.session) throw toAuthFailure(new Error('No session returned'));

  return data.session;
};

/**
 * Emails a 6-digit sign-in code.
 *
 * `shouldCreateUser` stays at its default (true) on purpose: neither an invited
 * client nor a new signup has an auth account until this call, so `false` would
 * lock both out. Signup is open since migration 20260918000003 — the gate that
 * used to refuse strangers is gone.
 *
 * `signup` is the choice made at the front door. Supabase writes `options.data`
 * into the account's metadata **only when it creates the account**, and ignores
 * it for an address that already exists — which is exactly the behaviour this
 * relies on: a returning user cannot change their own role by arriving with a
 * different link.
 */
export const sendSignInCode = async (email: string, signup?: ProfileInput): Promise<void> => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: signup ? { data: { kind: signup.kind, name: signup.name } } : undefined,
  });
  if (error) throw toAuthFailure(error);
};

/** Exchanges the emailed code for a session. The auth listener takes it from there. */
export const verifySignInCode = async (email: string, code: string): Promise<Session> => {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: 'email',
  });
  if (error) throw toAuthFailure(error);
  if (!data.session) throw toAuthFailure(new Error('No session returned'));
  return data.session;
};

/**
 * Ends the session everywhere this device knows about it. Never throws — a
 * sign-out that fails on the network still has to clear the local session, and
 * the caller has no useful recovery either way.
 */
export const signOutEverywhere = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
  } catch {
    // Local state is cleared by the SIGNED_OUT event or by the caller.
  }
};

/**
 * Makes Supabase re-emit the current session, which puts it back through the
 * identity resolve in `useAuthSession`.
 *
 * How a screen says "what the backend would answer about me has changed"
 * without writing the session slice itself — the one writer rule holds, and
 * the refreshed session travels the same path a fresh sign-in does.
 */
export const refreshIdentity = async (): Promise<void> => {
  const { error } = await supabase.auth.refreshSession();
  if (error) throw toAuthFailure(error);
};

/** The session restored from storage on cold start, if there is one. */
export const getStoredSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAuthFailure(error);
  return data.session;
};

export type AuthChange = { session: Session | null };

/**
 * Subscribes to sign-in / sign-out / token-refresh.
 *
 * `INITIAL_SESSION` is filtered out on purpose: cold start is handled once by
 * `getStoredSession`, and letting both paths resolve the identity would fire
 * two RPC round trips for the same account on every launch.
 */
export const subscribeToAuthChanges = (onChange: (change: AuthChange) => void): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    onChange({ session });
  });

  return () => data.subscription.unsubscribe();
};
