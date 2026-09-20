/**
 * Auth failures, in the app's own vocabulary.
 *
 * Supabase reports every credential problem as one opaque "Invalid login
 * credentials" string, and everything else as whatever the network layer threw.
 * Screens should never render those verbatim, so the mapping lives here and the
 * auth screens only ever show a `message` that came through this file.
 */

/** Why a sign-in attempt (or a session restore) could not complete. */
export type AuthFailureKind =
  /** Email/password did not match an account. */
  | 'credentials'
  /**
   * The account exists in Supabase Auth but no app profile is linked to it,
   * and one *should* have been -- half an identity came back. A real fault.
   */
  | 'unlinked'
  /**
   * The account is verified but has no profile at all, which since self-signup
   * (migration 20260918000002) is an ordinary state, not a failure: they have
   * simply not said yet whether they are a coach or training on their own.
   */
  | 'needsProfile'
  /** The account exists but its email has never been confirmed. */
  | 'unconfirmed'
  /** Too many attempts, too fast. */
  | 'rateLimited'
  /** A sign-in code that is wrong or has expired. */
  | 'otpInvalid'
  /** Nobody has invited this address (the backend's signup hook said no). */
  | 'noInvite'
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
  needsProfile: 'Tell us how you’ll be using the app to finish setting up your account.',
  unconfirmed: 'Confirm your email address before signing in.',
  rateLimited: 'Too many attempts. Wait a moment and try again.',
  otpInvalid: 'That code is wrong or has expired. Check the latest email, or send a new one.',
  noInvite:
    'That email isn’t on a coach’s roster. Use the exact address your coach invited, or ask them to add you.',
  offline: 'Can’t reach the server. Check your connection and try again.',
  unknown: 'Something went wrong signing in. Try again.',
};

const classify = (raw: string): AuthFailureKind => {
  const text = raw.toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid credentials')) {
    return 'credentials';
  }
  if (text.includes('email not confirmed')) return 'unconfirmed';
  if (
    text.includes('rate limit') ||
    text.includes('too many requests') ||
    text.includes('for security purposes')
  ) {
    return 'rateLimited';
  }
  // `no_invite` is the message hook_require_invite returns (migration 20260915000004).
  if (text.includes('no_invite') || text.includes('signups not allowed')) return 'noInvite';
  // Supabase's one wording for both a wrong and an expired code.
  if (text.includes('token has expired or is invalid')) return 'otpInvalid';
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
