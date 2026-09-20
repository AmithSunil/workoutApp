import type { Href } from 'expo-router';

import type { ProfileInput } from '@/api/handlers';
import type { UserRole } from '@/types/models';

/**
 * Every navigation target in the app, in one place.
 *
 * Screens never hand-write path strings — they call these helpers. Renaming a
 * route file becomes a single-line change here instead of a repo-wide grep, and
 * typed-routes generation stays contained to this module.
 */
const href = (path: string): Href => path as unknown as Href;

/**
 * Stands in for an assignment id on the training screen: a one-off workout the
 * client picks themselves, for a day they want to train something else. It
 * changes nothing about the routine — only what gets logged today.
 */
export const CUSTOM_TRAIN_ID = 'custom';

export const routes = {
  /**
   * The front door, and the only way in: which kind of account, then a code.
   * There is no password screen — nothing this app creates has a password.
   */
  welcome: () => href('/welcome'),
  /**
   * Passwordless sign-in: email, then a 6-digit code.
   *
   * With `signup`, the choice made at the front door rides along in the query
   * and from there into the account's metadata, so a new user is never asked
   * twice. Without it this is the invited-client path, unchanged.
   */
  otp: (signup?: ProfileInput) =>
    href(
      signup
        ? `/otp?kind=${signup.kind}&name=${encodeURIComponent(signup.name)}`
        : '/otp',
    ),
  /** The redirect gate — where "back" lands when there is no history. */
  home: () => href('/'),

  client: {
    explore: () => href('/(client)/(tabs)/explore'),
    profile: () => href('/(client)/(tabs)/profile'),
    /** First-run setup for a client the coach added without body numbers. */
    onboarding: () => href('/(client)/onboarding'),
    routineBuilder: () => href('/(client)/routine/new'),
    log: () => href('/(client)/(tabs)/log'),
    workouts: () => href('/(client)/(tabs)/workouts'),
    progress: () => href('/(client)/(tabs)/progress'),
    chat: () => href('/(client)/chat'),
    /** Today's workout: the day of this assignment that falls on today. */
    train: (assignmentId: string) => href(`/(client)/train/${assignmentId}`),
    /** Today only: an empty workout the client fills from the exercise library. */
    trainCustom: () => href(`/(client)/train/${CUSTOM_TRAIN_ID}`),
    /** Keyed by assignment id — a client only ever opens their own copy. */
    routine: (assignmentId: string) => href(`/(client)/routine/${assignmentId}`),
  },

  trainer: {
    dashboard: () => href('/(trainer)/(tabs)/dashboard'),
    roster: () => href('/(trainer)/(tabs)/roster'),
    messages: () => href('/(trainer)/(tabs)/messages'),
    routines: () => href('/(trainer)/(tabs)/routines'),
    profile: () => href('/(trainer)/(tabs)/profile'),
    invite: () => href('/(trainer)/invite'),
    routineBuilder: () => href('/(trainer)/routine/new'),
    routineDetail: (routineId: string) => href(`/(trainer)/routine/${routineId}`),
    routineEdit: (routineId: string) => href(`/(trainer)/routine/edit/${routineId}`),
    /** One client's copy of a routine, where it can be customised for them. */
    assignment: (assignmentId: string) => href(`/(trainer)/assignment/${assignmentId}`),
    clientDetail: (clientId: string) => href(`/(trainer)/client/${clientId}`),
    thread: (threadId: string) => href(`/(trainer)/thread/${threadId}`),
  },

  workoutLog: (logId: string) => href(`/workout-log/${logId}`),
} as const;

/** Where a signed-in user lands, given the role the backend resolved for them. */
export const homeFor = (role: UserRole): Href =>
  role === 'trainer' ? routes.trainer.dashboard() : routes.client.explore();
