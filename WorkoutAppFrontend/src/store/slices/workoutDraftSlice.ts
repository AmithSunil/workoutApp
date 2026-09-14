import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import type { ISODate, LoggedExercise, MuscleGroup, RoutineDay, WorkoutLog } from '@/types/models';

/**
 * The in-progress workout the client is logging.
 *
 * Deliberately local, not server state: sets are edited many times a second
 * while the user is mid-workout, and only the finished log is POSTed.
 *
 * It is seeded from a `RoutineDay` — the day of the client's routine that falls
 * on today. A routine prescribes intent ("4 sets of 8-12"), so the sets are
 * expanded here: `sets` rows at the bottom of the rep range, no target weight,
 * which is the honest starting point for someone about to type real numbers in.
 */
export interface WorkoutDraftState {
  dayId: string | null;
  /** Set when the draft is an edit of a workout already logged today. */
  logId: string | null;
  clientId: string | null;
  title: string;
  date: ISODate | null;
  startedAt: number | null;
  exercises: LoggedExercise[];
  notes: string;
}

const initialState: WorkoutDraftState = {
  dayId: null,
  logId: null,
  clientId: null,
  title: '',
  date: null,
  startedAt: null,
  exercises: [],
  notes: '',
};

const workoutDraftSlice = createSlice({
  name: 'workoutDraft',
  initialState,
  reducers: {
    workoutStarted(
      state,
      action: PayloadAction<{
        day: RoutineDay;
        title: string;
        clientId: string;
        date: ISODate;
      }>
    ) {
      const { day, title, clientId, date } = action.payload;
      state.dayId = day.id;
      state.logId = null;
      state.clientId = clientId;
      state.title = title;
      state.date = date;
      state.startedAt = Date.now();
      state.notes = '';
      state.exercises = day.exercises.map((re) => ({
        id: nanoid(),
        exerciseId: re.exerciseId,
        name: re.name,
        muscleGroup: re.muscleGroup,
        sets: Array.from({ length: re.sets }, () => ({
          id: nanoid(),
          reps: re.repMin,
          weightKg: 0,
          completed: false,
        })),
      }));
    },

    /**
     * Re-opens the workout already logged for a day. A log is `LoggedExercise[]`
     * already, so it seeds verbatim — sets come back ticked, exactly as saved.
     *
     * The clock is wound back by the logged duration rather than restarted, so
     * finishing an edit cannot overwrite a 50-minute session with 2 minutes.
     */
    workoutResumed(state, action: PayloadAction<{ log: WorkoutLog; clientId: string }>) {
      const { log, clientId } = action.payload;
      state.dayId = log.id;
      state.logId = log.id;
      state.clientId = clientId;
      state.title = log.title;
      state.date = log.date;
      state.startedAt = Date.now() - log.durationMinutes * 60_000;
      state.notes = log.notes ?? '';
      state.exercises = log.exercises;
    },

    setUpdated(
      state,
      action: PayloadAction<{
        exerciseId: string;
        setId: string;
        patch: Partial<{ reps: number; weightKg: number; completed: boolean }>;
      }>
    ) {
      const ex = state.exercises.find((e) => e.id === action.payload.exerciseId);
      const set = ex?.sets.find((s) => s.id === action.payload.setId);
      if (set) Object.assign(set, action.payload.patch);
    },

    setToggled(state, action: PayloadAction<{ exerciseId: string; setId: string }>) {
      const ex = state.exercises.find((e) => e.id === action.payload.exerciseId);
      const set = ex?.sets.find((s) => s.id === action.payload.setId);
      if (set) set.completed = !set.completed;
    },

    setAdded(state, action: PayloadAction<{ exerciseId: string }>) {
      const ex = state.exercises.find((e) => e.id === action.payload.exerciseId);
      if (!ex) return;
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        id: nanoid(),
        reps: last?.reps ?? 10,
        weightKg: last?.weightKg ?? 0,
        completed: false,
      });
    },

    setRemoved(state, action: PayloadAction<{ exerciseId: string; setId: string }>) {
      const ex = state.exercises.find((e) => e.id === action.payload.exerciseId);
      if (!ex || ex.sets.length <= 1) return;
      ex.sets = ex.sets.filter((s) => s.id !== action.payload.setId);
    },

    exerciseAdded(
      state,
      action: PayloadAction<{ exerciseId: string; name: string; muscleGroup: MuscleGroup }>
    ) {
      state.exercises.push({
        id: nanoid(),
        exerciseId: action.payload.exerciseId,
        name: action.payload.name,
        muscleGroup: action.payload.muscleGroup,
        sets: [{ id: nanoid(), reps: 10, weightKg: 0, completed: false }],
      });
    },


    exerciseRemoved(state, action: PayloadAction<{ exerciseId: string }>) {
      state.exercises = state.exercises.filter((e) => e.id !== action.payload.exerciseId);
    },

    notesChanged(state, action: PayloadAction<string>) {
      state.notes = action.payload;
    },

    workoutDiscarded() {
      return initialState;
    },
  },
});

export const {
  workoutStarted,
  workoutResumed,
  setUpdated,
  setToggled,
  setAdded,
  setRemoved,
  exerciseAdded,
  exerciseRemoved,
  notesChanged,
  workoutDiscarded,
} = workoutDraftSlice.actions;

export default workoutDraftSlice.reducer;
