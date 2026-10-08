import type { ClientProfile } from '@/types/models';

/**
 * Whether this client has a coach. Someone who signed up on their own, or was
 * removed from a roster, has none. The one rule for coachless UI -- screens
 * call this rather than reading `trainerId` themselves. An unloaded profile
 * counts as coachless, so nothing coach-shaped flashes in before it arrives.
 */
export const hasCoach = (c?: Pick<ClientProfile, 'trainerId'> | null) => c?.trainerId != null;
