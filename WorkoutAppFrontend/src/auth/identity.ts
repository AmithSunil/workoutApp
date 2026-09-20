import { supabase } from '@/utils/supabase';
import type { UserRole } from '@/types/models';

import { AuthFailure, authMessage, toAuthFailure } from './errors';

/**
 * Who the signed-in Supabase account is, in the app's own terms.
 *
 * Supabase Auth issues a uuid; every table in this product keys off the text
 * ids the fixtures use (`t-001`, `c-001`). `users.auth_user_id` bridges the two,
 * and the two SECURITY DEFINER helpers below are the only way to cross it from
 * the client — the raw `users` row is not readable until RLS knows who you are.
 */
export interface AppIdentity {
  /** The app's own id for this person: `t-001`, `c-001`, … */
  userId: string;
  role: UserRole;
}

const isRole = (value: unknown): value is UserRole => value === 'client' || value === 'trainer';

/**
 * Asks the backend who the current access token belongs to.
 *
 * Both RPCs read `auth.uid()` server-side, so this is only meaningful once a
 * session exists. Two nulls mean the account has no profile at all — since
 * self-signup that is an ordinary state (they have not chosen a role yet), so
 * it comes back as `null` for the caller to route on rather than as a failure.
 * One null and one answer is a different thing entirely: a half-linked account,
 * which is a fault and still throws `unlinked`.
 */
const ask = () => Promise.all([supabase.rpc('app_user_id'), supabase.rpc('app_role')]);

export const resolveIdentity = async (): Promise<AppIdentity | null> => {
  let [idResult, roleResult] = await ask();

  // Signing in on top of an existing session revokes the old token while these
  // two calls are in flight, so one of them can go out with it and come back
  // 401 (seen on the first OTP sign-in). The new session has settled by the
  // time we ask again; a second failure is a real one.
  if (idResult.error || roleResult.error) [idResult, roleResult] = await ask();

  if (idResult.error) throw toAuthFailure(idResult.error);
  if (roleResult.error) throw toAuthFailure(roleResult.error);

  const userId = idResult.data;
  const role = roleResult.data;

  if (userId == null && role == null) return null;

  if (typeof userId !== 'string' || !userId || !isRole(role)) {
    throw new AuthFailure('unlinked', authMessage('unlinked'));
  }

  return { userId, role };
};
