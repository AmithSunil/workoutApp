import { useGetPlansQuery, useGetSubscriptionQuery } from '@/api/endpoints/billingApi';
import { useAppSelector } from '@/store/hooks';
import { planActive } from '@/utils/plan';

/**
 * Whether the signed-in user may operate, and on what.
 *
 * Who needs a plan at all is one rule: a coach, or a client with nobody
 * coaching them. A coached client is covered by the seat their coach is paying
 * for, so they are never gated — and are never even asked, because `needsPlan`
 * is false and the query below still resolves to their (absent) row harmlessly.
 *
 * `active` is optimistic while the row is loading: a paywall that flashes over
 * a paid-up roster every cold start is worse than a screen that arrives half a
 * second late.
 */
export function useSubscription(opts?: { hasCoach?: boolean }) {
  const role = useAppSelector((s) => s.session.role);
  const needsPlan = role === 'trainer' || opts?.hasCoach === false;

  const sub = useGetSubscriptionQuery(undefined, { skip: !needsPlan });
  const plans = useGetPlansQuery(undefined, { skip: !needsPlan });

  const subscription = sub.data ?? null;
  const plan = plans.data?.find((p) => p.code === subscription?.planCode);
  const loading = sub.isLoading || plans.isLoading;

  return {
    subscription,
    plan,
    needsPlan,
    loading,
    // Gate only on an answer we actually have. `sub.data === undefined` covers
    // loading AND a failed request -- a dropped connection used to put a
    // paywall over a paid-up roster, which is the one wrong way to be wrong.
    // A genuine "no subscription" arrives as null, and that does gate.
    active: !needsPlan || sub.data === undefined || planActive(subscription),
  };
}
