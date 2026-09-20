import type { AlertKind, TrackingMode } from '@/types/models';

/**
 * What a coach has chosen to track, and what that hides.
 *
 * One rule, applied everywhere: a piece of the trainer UI declares the domain
 * it belongs to, and `shows()` decides. `null` (the choice not yet made) and
 * `'both'` behave identically, so nothing disappears before a coach has picked.
 *
 * The client side is deliberately unaffected — a client keeps logging whatever
 * they like; their coach simply is not reviewing that half.
 */
export type TrackingDomain = TrackingMode;

export const shows = (mode: TrackingMode | null | undefined, domain: TrackingDomain): boolean =>
  domain === 'both' || mode == null || mode === 'both' || mode === domain;

/** Which half of the product each red flag belongs to. */
export const ALERT_DOMAIN: Record<AlertKind, TrackingDomain> = {
  'missed-logs': 'nutrition',
  'calorie-deficit-miss': 'nutrition',
  'weight-stall': 'both',
  'check-in-due': 'both',
  'intake-complete': 'both',
};

export const TRACKING_LABEL: Record<TrackingMode, string> = {
  workout: 'Workouts only',
  nutrition: 'Nutrition only',
  both: 'Workouts & nutrition',
};
