import type { RoutineDayInput } from '@/api/handlers';
import type {
  Exercise,
  MuscleGroup,
  RoutineDay,
  RoutineExercise,
  Weekday,
} from '@/types/models';
import { byWeekday } from '@/utils/date';

/**
 * A routine exercise while it is still being authored.
 *
 * Carries a local `key` instead of an `id`: ids are minted server-side, and a
 * draft row needs a stable React key from the moment it is added — including
 * for rows removed before the routine is saved.
 */
export interface DraftExercise extends Omit<RoutineExercise, 'id'> {
  key: string;
}

/** One training day being authored. */
export interface DraftDay extends Omit<RoutineDay, 'id' | 'exercises'> {
  key: string;
  exercises: DraftExercise[];
  /**
   * Set once the coach picks a focus by hand. Until then focus follows whatever
   * they are actually programming, so the common case needs no input at all.
   * Local to the builder — stripped before the draft is posted.
   */
  focusPinned?: boolean;
}

/**
 * What a newly added exercise is prescribed at before the coach touches it.
 * A hypertrophy-default block: a routine saved without touching a single
 * stepper is still a sane prescription.
 */
export const DEFAULT_PRESCRIPTION = {
  sets: 3,
  repMin: 8,
  repMax: 12,
  restSeconds: 90,
  targetRpe: 8,
} as const;

export const LIMITS = {
  sets: { min: 1, max: 10, step: 1 },
  reps: { min: 1, max: 30, step: 1 },
  rest: { min: 0, max: 300, step: 15 },
  rpe: { min: 1, max: 10, step: 1 },
} as const;

let sequence = 0;
const nextKey = (prefix: string): string => {
  sequence += 1;
  return `${prefix}-${sequence}`;
};

export const draftFromExercise = (exercise: Exercise): DraftExercise => ({
  key: nextKey('dx'),
  exerciseId: exercise.id,
  name: exercise.name,
  muscleGroup: exercise.muscleGroup,
  ...DEFAULT_PRESCRIPTION,
});

export const draftDay = (weekday: Weekday): DraftDay => ({
  key: nextKey('dd'),
  weekday,
  focus: 'full body',
  exercises: [],
});

/** Adds an exercise to a day, keeping the auto-derived focus honest. */
export const withExercises = (day: DraftDay, exercises: DraftExercise[]): DraftDay => ({
  ...day,
  exercises,
  focus: day.focusPinned ? day.focus : suggestFocus(exercises),
});

/** Seeds the builder from a saved routine, for editing a template or a client's copy. */
export const draftDaysFrom = (days: RoutineDay[]): DraftDay[] =>
  [...days].sort(byWeekday).map((day) => ({
    key: nextKey('dd'),
    weekday: day.weekday,
    name: day.name,
    focus: day.focus,
    focusPinned: true,
    notes: day.notes,
    exercises: day.exercises.map((exercise) => ({ ...exercise, key: nextKey('dx') })),
  }));

/** Strips the local keys so the draft can be posted. */
export const toRoutineDays = (days: DraftDay[]): RoutineDayInput[] =>
  [...days]
    .sort(byWeekday)
    .map(({ key: _key, focusPinned: _pinned, exercises, ...day }) => ({
      ...day,
      exercises: exercises.map(({ key: _exerciseKey, ...exercise }) => exercise),
    }));

/** Total prescribed working sets across whatever is passed in. */
export const totalSets = (exercises: Array<{ sets: number }>): number =>
  exercises.reduce((sum, e) => sum + e.sets, 0);

/** The three numbers every routine surface quotes. */
export const routineTotals = (days: Array<{ exercises: Array<{ sets: number }> }>) => {
  const exercises = days.reduce((sum, day) => sum + day.exercises.length, 0);
  return {
    days: days.length,
    exercises,
    sets: days.reduce((sum, day) => sum + totalSets(day.exercises), 0),
  };
};

/**
 * The focus a day's exercises imply, used until the coach picks one.
 * Three or more muscle groups in one day is a full-body day.
 */
export const suggestFocus = (exercises: Array<{ muscleGroup: MuscleGroup }>): MuscleGroup => {
  if (exercises.length === 0) return 'full body';
  const tally = new Map<MuscleGroup, number>();
  for (const exercise of exercises) {
    tally.set(exercise.muscleGroup, (tally.get(exercise.muscleGroup) ?? 0) + 1);
  }
  if (tally.size >= 3) return 'full body';
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0][0];
};
