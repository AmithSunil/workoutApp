/**
 * In-memory mock database.
 *
 * Seeded from `src/mock-api/*.json` and mutated in place for the lifetime of the
 * app process, so writes made in the UI (a logged meal, a ticked habit, a sent
 * message) are visible to every later read — exactly like a real backend, minus
 * the persistence. Nothing outside `src/api` should import this module.
 */
import alertsSeed from '@/mock-api/alerts.json';
import aiSeed from '@/mock-api/aiSuggestions.json';
import bodyMetricsSeed from '@/mock-api/bodyMetrics.json';
import checkInsSeed from '@/mock-api/checkIns.json';
import exercisesSeed from '@/mock-api/exercises.json';
import foodsSeed from '@/mock-api/foods.json';
import habitsSeed from '@/mock-api/habits.json';
import messagesSeed from '@/mock-api/messages.json';
import nutritionSeed from '@/mock-api/nutritionLogs.json';
import photosSeed from '@/mock-api/progressPhotos.json';
import threadsSeed from '@/mock-api/threads.json';
import usersSeed from '@/mock-api/users.json';
import sessionsSeed from '@/mock-api/workoutSessions.json';
import logsSeed from '@/mock-api/workoutLogs.json';

import type {
  AiFoodSuggestion,
  BodyMetric,
  CheckIn,
  ClientProfile,
  Exercise,
  FoodItem,
  Habit,
  Message,
  NutritionDay,
  ProgressPhoto,
  RedFlagAlert,
  Routine,
  RoutineAssignment,
  Thread,
  TrainerProfile,
  WorkoutLog,
  WorkoutSession,
} from '@/types/models';

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export interface MockDb {
  trainer: TrainerProfile;
  clients: ClientProfile[];
  foods: FoodItem[];
  exercises: Exercise[];
  nutritionDays: NutritionDay[];
  sessions: WorkoutSession[];
  routines: Routine[];
  routineAssignments: RoutineAssignment[];
  workoutLogs: WorkoutLog[];
  bodyMetrics: BodyMetric[];
  photos: ProgressPhoto[];
  habits: Habit[];
  threads: Thread[];
  messages: Message[];
  alerts: RedFlagAlert[];
  checkIns: CheckIn[];
  aiSuggestions: AiFoodSuggestion[];
}

const seed = usersSeed as unknown as { trainer: TrainerProfile; clients: ClientProfile[] };

export const db: MockDb = {
  trainer: clone(seed.trainer),
  clients: clone(seed.clients),
  foods: clone(foodsSeed) as unknown as FoodItem[],
  exercises: clone(exercisesSeed) as unknown as Exercise[],
  nutritionDays: clone(nutritionSeed) as unknown as NutritionDay[],
  sessions: clone(sessionsSeed) as unknown as WorkoutSession[],
  // Routines ship unseeded — the library starts empty and fills as the
  // trainer builds templates. Add a `mock-api/routines.json` seed here the
  // same way as the others if the demo should open with a stocked library.
  routines: [],
  routineAssignments: [],
  workoutLogs: clone(logsSeed) as unknown as WorkoutLog[],
  bodyMetrics: clone(bodyMetricsSeed) as unknown as BodyMetric[],
  photos: clone(photosSeed) as unknown as ProgressPhoto[],
  habits: clone(habitsSeed) as unknown as Habit[],
  threads: clone(threadsSeed) as unknown as Thread[],
  messages: clone(messagesSeed) as unknown as Message[],
  alerts: clone(alertsSeed) as unknown as RedFlagAlert[],
  checkIns: clone(checkInsSeed) as unknown as CheckIn[],
  aiSuggestions: clone(aiSeed) as unknown as AiFoodSuggestion[],
};

/** Monotonic id factory so records created at runtime never collide with seeds. */
let counter = 0;
export const nextId = (prefix: string): string => {
  counter += 1;
  return `${prefix}-live-${counter.toString().padStart(4, '0')}`;
};

export const findClient = (clientId: string): ClientProfile | undefined =>
  db.clients.find((c) => c.id === clientId);
