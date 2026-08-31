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
 * session exists. A null answer means the account has no linked profile — a
 * real state (a client can be on a roster before they ever sign in), not a bug,
 * so it gets its own failure kind rather than a generic error.
 */
export const resolveIdentity = async (): Promise<AppIdentity> => {
  const [idResult, roleResult] = await Promise.all([
    supabase.rpc('app_user_id'),
    supabase.rpc('app_role'),
  ]);

  if (idResult.error) throw toAuthFailure(idResult.error);
  if (roleResult.error) throw toAuthFailure(roleResult.error);

  const userId = idResult.data;
  const role = roleResult.data;

  if (typeof userId !== 'string' || !userId || !isRole(role)) {
    throw new AuthFailure('unlinked', authMessage('unlinked'));
  }

  return { userId, role };
};
