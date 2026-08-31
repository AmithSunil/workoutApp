import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UserRole } from '@/types/models';
import { TODAY } from '@/utils/date';

/**
 * Who is using the app right now.
 *
 * This slice is written only by the auth bootstrap in `src/auth/useAuthSession`
 * — never by a screen. It holds the *resolved* identity: the Supabase account
 * plus the app-side user it maps to, which is what the route guards and every
 * `useSession()` consumer read.
 */
export type AuthStatus =
  /** Cold start: the stored session has not been inspected yet. */
  | 'unknown'
  /** No usable session. The sign-in screen is the only reachable route. */
  | 'signedOut'
  /** A Supabase session exists and has been resolved to an app user. */
  | 'signedIn';

export interface SessionState {
  status: AuthStatus;
  role: UserRole | null;
  /** The app's own id for the signed-in user (`t-001` / `c-001`). */
  userId: string | null;
  /** The Supabase Auth uuid behind it. */
  authUserId: string | null;
  email: string | null;
  /** Client whose data the current screens read — self for clients, selection for trainers. */
  activeClientId: string | null;
  /** Date the client-side logging screens are scoped to. */
  activeDate: string;
  /**
   * Why the last session ended, when it ended for a reason worth explaining
   * (an unlinked account, an unreachable backend). Shown once on the sign-in
   * screen; a deliberate sign-out leaves it null.
   */
  signedOutReason: string | null;
}

export interface SignedInPayload {
  role: UserRole;
  userId: string;
  authUserId: string;
  email: string | null;
}

const initialState: SessionState = {
  status: 'unknown',
  role: null,
  userId: null,
  authUserId: null,
  email: null,
  activeClientId: null,
  activeDate: TODAY,
  signedOutReason: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    /**
     * Identity resolved. Dispatched twice per cold start in the common case —
     * once optimistically from cache, once from the backend — so it must be
     * idempotent: re-signing-in the same user preserves what they were looking
     * at, and only a different user resets the active client.
     */
    signedIn(state, action: PayloadAction<SignedInPayload>) {
      const { role, userId, authUserId, email } = action.payload;
      const sameUser = state.status === 'signedIn' && state.userId === userId;

      state.status = 'signedIn';
      state.role = role;
      state.userId = userId;
      state.authUserId = authUserId;
      state.email = email;
      state.signedOutReason = null;

      if (!sameUser) {
        state.activeClientId = role === 'client' ? userId : null;
        state.activeDate = TODAY;
      }
    },

    signedOut(state, action: PayloadAction<{ reason?: string } | undefined>) {
      state.status = 'signedOut';
      state.role = null;
      state.userId = null;
      state.authUserId = null;
      state.email = null;
      state.activeClientId = null;
      state.activeDate = TODAY;
      state.signedOutReason = action.payload?.reason ?? null;
    },

    /** Clears the one-shot explanation after the sign-in screen has shown it. */
    signOutReasonDismissed(state) {
      state.signedOutReason = null;
    },

    activeClientChanged(state, action: PayloadAction<string | null>) {
      state.activeClientId = action.payload;
    },

    activeDateChanged(state, action: PayloadAction<string>) {
      state.activeDate = action.payload;
    },
  },
});

export const {
  signedIn,
  signedOut,
  signOutReasonDismissed,
  activeClientChanged,
  activeDateChanged,
} = sessionSlice.actions;

export default sessionSlice.reducer;
