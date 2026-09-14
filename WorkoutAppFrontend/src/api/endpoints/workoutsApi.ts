import { baseApi } from '../baseApi';

import type { Exercise, WorkoutLog } from '@/types/models';

/**
 * Training is read from the client's routine (`routinesApi`); this module only
 * covers what actually happened — the logs — and the exercise library.
 */
export const workoutsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkoutLogs: build.query<WorkoutLog[], { clientId: string; limit?: number }>({
      query: ({ clientId, limit = 50 }) => ({ url: '/workouts/logs', params: { clientId, limit } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'WorkoutLog', id: clientId }],
    }),

    getWorkoutLog: build.query<WorkoutLog, string>({
      query: (id) => ({ url: `/workouts/logs/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'WorkoutLog', id }],
    }),

    getExercises: build.query<Exercise[], void>({
      query: () => ({ url: '/exercises' }),
    }),

    /** Saves today's workout. One per day: a second save edits the first. */
    saveWorkoutLog: build.mutation<WorkoutLog, Omit<WorkoutLog, 'id' | 'completedAt'>>({
      query: (body) => ({ url: '/workouts/logs', method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'WorkoutLog', id: arg.clientId },
        'Alert',
        'ClientOverview',
        'TrainerSummary',
        'Compliance',
      ],
    }),
  }),
});

export const {
  useGetWorkoutLogsQuery,
  useGetWorkoutLogQuery,
  useGetExercisesQuery,
  useSaveWorkoutLogMutation,
} = workoutsApi;
