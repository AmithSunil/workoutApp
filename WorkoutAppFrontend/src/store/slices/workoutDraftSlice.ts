import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

import type { ISODate, LoggedExercise, MuscleGroup, WorkoutSession } from '@/types/models';

/**
 * The in-progress workout the client is logging.
 *
 * Deliberately local, not server state: sets are edited many times a second
 * while the user is mid-session, and only the finished log is POSTed.
 */
export interface WorkoutDraftState {
  sessionId: string | null;
  clientId: string | null;
  title: string;
  date: ISODate | null;
  startedAt: number | null;
  exercises: LoggedExercise[];
  rpe: number;
  notes: string;
}

const initialState: WorkoutDraftState = {
  sessionId: null,
  clientId: null,
  title: '',
  date: null,
  startedAt: null,
  exercises: [],
  rpe: 7,
  notes: '',
};

const workoutDraftSlice = createSlice({
  name: 'workoutDraft',
  initialState,
  reducers: {
    workoutStarted(
      state,
      action: PayloadAction<{ session: WorkoutSession; clientId: string; date: ISODate }>
    ) {
      const { session, clientId, date } = action.payload;
      state.sessionId = session.id;
      state.clientId = clientId;
      state.title = session.title;
      state.date = date;
      state.startedAt = Date.now();
      state.rpe = 7;
      state.notes = '';
      state.exercises = session.exercises.map((pe) => ({
        id: nanoid(),
        exerciseId: pe.exerciseId,
        name: pe.name,
        muscleGroup: pe.muscleGroup,
        sets: pe.sets.map((s) => ({
          id: nanoid(),
          reps: s.reps,
          weightKg: s.targetWeightKg ?? 0,
          completed: false,
        })),
      }));
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

    rpeChanged(state, action: PayloadAction<number>) {
      state.rpe = action.payload;
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
  setUpdated,
  setToggled,
  setAdded,
  setRemoved,
  exerciseAdded,
  rpeChanged,
  notesChanged,
  workoutDiscarded,
} = workoutDraftSlice.actions;

export default workoutDraftSlice.reducer;
