import { baseApi } from '../baseApi';

import type { Exercise, WorkoutLog, WorkoutSession } from '@/types/models';

export const workoutsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getWorkoutSessions: build.query<WorkoutSession[], { clientId: string }>({
      query: ({ clientId }) => ({ url: '/workouts/sessions', params: { clientId } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'WorkoutSession', id: clientId }],
    }),

    getWorkoutSession: build.query<WorkoutSession, string>({
      query: (id) => ({ url: `/workouts/sessions/${id}` }),
      providesTags: (_r, _e, id) => [{ type: 'WorkoutSession', id }],
    }),

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

    saveWorkoutLog: build.mutation<WorkoutLog, Omit<WorkoutLog, 'id' | 'completedAt'>>({
      query: (body) => ({ url: '/workouts/logs', method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'WorkoutLog', id: arg.clientId },
        { type: 'WorkoutSession', id: arg.clientId },
        'Alert',
        'ClientOverview',
        'TrainerSummary',
        'Compliance',
      ],
    }),
  }),
});

export const {
  useGetWorkoutSessionsQuery,
  useGetWorkoutSessionQuery,
  useGetWorkoutLogsQuery,
  useGetWorkoutLogQuery,
  useGetExercisesQuery,
  useSaveWorkoutLogMutation,
} = workoutsApi;
