/**
 * Auth failures, in the app's own vocabulary.
 *
 * Supabase reports every credential problem as one opaque "Invalid login
 * credentials" string, and everything else as whatever the network layer threw.
 * Screens should never render those verbatim, so the mapping lives here and the
 * sign-in screen only ever shows a `message` that came through this file.
 */

/** Why a sign-in attempt (or a session restore) could not complete. */
export type AuthFailureKind =
  /** Email/password did not match an account. */
  | 'credentials'
  /** The account exists in Supabase Auth but no app profile is linked to it. */
  | 'unlinked'
  /** The account exists but its email has never been confirmed. */
  | 'unconfirmed'
  /** Too many attempts, too fast. */
  | 'rateLimited'
  /** The backend could not be reached at all. */
  | 'offline'
  /** Anything we have not specifically accounted for. */
  | 'unknown';

export class AuthFailure extends Error {
  readonly kind: AuthFailureKind;

  constructor(kind: AuthFailureKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AuthFailure';
    this.kind = kind;
  }
}

const MESSAGES: Record<AuthFailureKind, string> = {
  credentials: 'That email and password don’t match an account.',
  unlinked: 'This account isn’t linked to a profile yet. Ask your coach to finish setting it up.',
  unconfirmed: 'Confirm your email address before signing in.',
  rateLimited: 'Too many attempts. Wait a moment and try again.',
  offline: 'Can’t reach the server. Check your connection and try again.',
  unknown: 'Something went wrong signing in. Try again.',
};

const classify = (raw: string): AuthFailureKind => {
  const text = raw.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid credentials')) {
    return 'credentials';
  }
  if (text.includes('email not confirmed')) return 'unconfirmed';
  if (text.includes('rate limit') || text.includes('too many requests')) return 'rateLimited';
  if (
    text.includes('failed to fetch') ||
    text.includes('network request failed') ||
    text.includes('networkerror') ||
    text.includes('fetch failed')
  ) {
    return 'offline';
  }
  return 'unknown';
};

/**
 * Turns anything thrown by supabase-js into an `AuthFailure` carrying a message
 * that is safe to show a user. Already-classified failures pass straight through.
 */
export const toAuthFailure = (error: unknown): AuthFailure => {
  if (error instanceof AuthFailure) return error;

  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error);
  const kind = classify(raw);
  return new AuthFailure(kind, MESSAGES[kind], { cause: error });
};

/** The user-facing copy for a kind, for callers constructing a failure directly. */
export const authMessage = (kind: AuthFailureKind): string => MESSAGES[kind];
