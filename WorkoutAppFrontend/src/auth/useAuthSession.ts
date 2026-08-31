import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

import { baseApi } from '@/api/baseApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearIdentity, loadIdentity, saveIdentity } from '@/store/persistence';
import { signedIn, signedOut, type SignedInPayload } from '@/store/slices/sessionSlice';

import { getStoredSession, signOutEverywhere, subscribeToAuthChanges } from './authService';
import { authMessage, toAuthFailure } from './errors';
import { resolveIdentity } from './identity';

/**
 * Keeps the session slice in step with Supabase Auth, for the lifetime of the app.
 *
 * Mounted once, by the root layout, above everything that reads the session.
 * Until it reports `ready`, nothing below it renders — otherwise the first
 * navigation decision would be made against `status: 'unknown'` and a returning
 * user would watch the sign-in screen flash past.
 */
export function useAuthSession(): { ready: boolean } {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.session.status);
  /** Read through a ref so `adopt` does not have to be rebuilt on every change. */
  const signedInUserId = useRef<string | null>(null);

  /**
   * Cached server data belongs to whoever fetched it. Switching accounts has to
   * drop it, or the next user is served the previous one's rows out of cache
   * before the first request even goes out.
   */
  const enter = useCallback(
    (payload: SignedInPayload) => {
      if (signedInUserId.current && signedInUserId.current !== payload.userId) {
        dispatch(baseApi.util.resetApiState());
      }
      signedInUserId.current = payload.userId;
      dispatch(signedIn(payload));
    },
    [dispatch],
  );

  const leave = useCallback(
    (reason?: string) => {
      if (signedInUserId.current) dispatch(baseApi.util.resetApiState());
      signedInUserId.current = null;
      dispatch(signedOut(reason ? { reason } : undefined));
    },
    [dispatch],
  );

  const adopt = useCallback(
    async (session: Session | null, cancelled: () => boolean) => {
      if (!session) {
        await clearIdentity();
        if (!cancelled()) leave();
        return;
      }

      const authUserId = session.user.id;
      const email = session.user.email ?? null;

      // A cached answer for this exact account gets the user onto their own
      // screens without waiting for a round trip. It is still verified below.
      const cached = await loadIdentity();
      const hasCache = cached?.authUserId === authUserId;
      if (cached && hasCache && !cancelled()) {
        enter({ role: cached.role, userId: cached.userId, authUserId, email });
      }

      try {
        const identity = await resolveIdentity();
        if (cancelled()) return;
        enter({ ...identity, authUserId, email });
        void saveIdentity({ ...identity, authUserId });
      } catch (error) {
        const failure = toAuthFailure(error);

        // An account with no profile behind it can never load a screen, so the
        // Supabase session goes too — otherwise every launch retries forever.
        if (failure.kind === 'unlinked') {
          await clearIdentity();
          await signOutEverywhere();
          if (!cancelled()) leave(failure.message);
          return;
        }

        // Anything else is transient. A cached identity carries the app through
        // an offline launch; without one there is nothing to render against.
        if (!hasCache && !cancelled()) {
          leave(authMessage(failure.kind));
        }
      }
    },
    [enter, leave],
  );

  useEffect(() => {
    let done = false;
    const cancelled = () => done;

    // Cold start. `getStoredSession` only hits the network when the stored
    // token has expired, so this is fast in the ordinary case.
    getStoredSession()
      .then((session) => adopt(session, cancelled))
      .catch((error: unknown) => {
        if (!cancelled()) leave(toAuthFailure(error).message);
      });

    const unsubscribe = subscribeToAuthChanges(({ session }) => {
      // supabase-js runs this callback while holding its auth lock; awaiting
      // another Supabase call inside it deadlocks the client. Deferring to a
      // fresh task is the documented way out.
      setTimeout(() => {
        if (!cancelled()) void adopt(session, cancelled);
      }, 0);
    });

    return () => {
      done = true;
      unsubscribe();
    };
  }, [adopt, leave]);

  return { ready: status !== 'unknown' };
}
