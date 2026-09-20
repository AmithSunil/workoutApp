import type { ClientProfile } from '@/types/models';

type Goal = ClientProfile['goal'];

export const GOAL_LABEL: Record<Goal, string> = {
  cut: 'Fat loss',
  bulk: 'Muscle gain',
  recomp: 'Recomp',
  performance: 'Performance',
};

export const GOAL_SEGMENTS = (Object.keys(GOAL_LABEL) as Goal[]).map((value) => ({
  value,
  label: GOAL_LABEL[value],
}));

/** Inside this much of the target there is no direction left to name. */
const RECOMP_BAND_KG = 1;

/**
 * The direction a target weight implies from where the client stands today.
 *
 * `performance` is never derived: it is the one goal that has nothing to do
 * with the scale, so it only ever arrives from the coach choosing it.
 */
export const deriveGoal = (currentKg: number, targetKg: number): Goal =>
  Math.abs(targetKg - currentKg) <= RECOMP_BAND_KG
    ? 'recomp'
    : targetKg < currentKg
      ? 'cut'
      : 'bulk';

/**
 * A client the coach added before knowing their body numbers. The client fills
 * them in once, on first sign-in (`(client)/onboarding`).
 */
export const needsIntake = (client: Pick<ClientProfile, 'heightCm' | 'startWeightKg'>): boolean =>
  client.heightCm === null || client.startWeightKg === null;
