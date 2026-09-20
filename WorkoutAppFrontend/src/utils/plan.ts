import type { Plan, Subscription } from '@/types/models';

/**
 * The one entitlement rule, mirroring `plan_active()` in Postgres.
 *
 * Keeping it a pure function of the subscription — rather than a flag the
 * server sets — means the app cannot drift out of step with the database over
 * a stale cache: the same row answers the same way on both sides.
 */
export const planActive = (sub: Subscription | null | undefined): boolean =>
  !!sub && (sub.currentPeriodEnd === null || new Date(sub.currentPeriodEnd) > new Date());

/** Days left, for the trial banner. Null when the plan never expires. */
export const daysLeft = (sub: Subscription | null | undefined): number | null => {
  if (!sub?.currentPeriodEnd) return null;
  const ms = new Date(sub.currentPeriodEnd).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
};

/** ₹1,499 — never "₹1499.00". Free plans say so in words. */
export const price = (paise: number): string =>
  paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}`;

export const seatsLabel = (plan: Plan | undefined): string =>
  !plan ? '' : plan.maxClients === null ? 'Unlimited clients' : `Up to ${plan.maxClients} clients`;

/**
 * The one line that says where a subscription stands. Lives here rather than in
 * a screen because three places render it now — the plans screen, and the plan
 * row on each profile — and three copies of this ternary would drift.
 *
 * `seats` is the coach's roster count, shown only when there is nothing more
 * pressing to say.
 */
export const statusLine = (
  sub: Subscription | null | undefined,
  seats?: number,
): string => {
  if (!sub) return 'No plan yet';
  const left = daysLeft(sub);
  if (sub.status === 'trialing') {
    // A trial that has run out still says `trialing` -- nothing rewrites it,
    // because nothing sweeps. Without this it reads "0 days left" forever.
    if (!planActive(sub)) return 'Trial ended';
    if (left !== null) return `Trial — ${left} ${left === 1 ? 'day' : 'days'} left`;
  }
  if (sub.status === 'past_due') return 'Payment failed. Razorpay is retrying.';
  if (sub.status === 'cancelled') {
    return planActive(sub) ? 'Cancelled — runs to the end of this period' : 'Cancelled';
  }
  if (!planActive(sub)) return 'Expired';
  if (seats !== undefined) return `${seats} ${seats === 1 ? 'client' : 'clients'} on your roster`;
  return 'Active';
};
