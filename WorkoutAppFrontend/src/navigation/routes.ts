import type { Href } from 'expo-router';

/**
 * Every navigation target in the app, in one place.
 *
 * Screens never hand-write path strings — they call these helpers. Renaming a
 * route file becomes a single-line change here instead of a repo-wide grep, and
 * typed-routes generation stays contained to this module.
 */
const href = (path: string): Href => path as unknown as Href;

export const routes = {
  roleSelect: () => href('/'),

  client: {
    explore: () => href('/(client)/(tabs)/explore'),
    log: () => href('/(client)/(tabs)/log'),
    workouts: () => href('/(client)/(tabs)/workouts'),
    progress: () => href('/(client)/(tabs)/progress'),
    chat: () => href('/(client)/chat'),
    session: (sessionId: string) => href(`/(client)/session/${sessionId}`),
    /** Keyed by assignment id — a client only ever opens their own copy. */
    routine: (assignmentId: string) => href(`/(client)/routine/${assignmentId}`),
  },

  trainer: {
    dashboard: () => href('/(trainer)/(tabs)/dashboard'),
    roster: () => href('/(trainer)/(tabs)/roster'),
    messages: () => href('/(trainer)/(tabs)/messages'),
    routines: () => href('/(trainer)/(tabs)/routines'),
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
