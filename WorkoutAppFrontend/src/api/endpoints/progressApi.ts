import { baseApi } from '../baseApi';

import type { BodyMetric, Habit, ISODate, ProgressPhoto } from '@/types/models';

export const progressApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBodyMetrics: build.query<BodyMetric[], { clientId: string }>({
      query: ({ clientId }) => ({ url: '/metrics', params: { clientId } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'Metric', id: clientId }],
    }),

    logBodyMetric: build.mutation<BodyMetric, Omit<BodyMetric, 'id'>>({
      query: (body) => ({ url: '/metrics', method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Metric', id: arg.clientId },
        'ClientOverview',
        'Compliance',
      ],
    }),

    getProgressPhotos: build.query<ProgressPhoto[], { clientId: string }>({
      query: ({ clientId }) => ({ url: '/photos', params: { clientId } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'Photo', id: clientId }],
    }),

    getHabits: build.query<Habit[], { clientId: string }>({
      query: ({ clientId }) => ({ url: '/habits', params: { clientId } }),
      providesTags: (_r, _e, { clientId }) => [{ type: 'Habit', id: clientId }],
    }),

    toggleHabit: build.mutation<Habit, { id: string; clientId: string; date: ISODate }>({
      query: ({ id, date }) => ({ url: `/habits/${id}/toggle`, method: 'POST', body: { date } }),
      // Optimistic: ticking a habit must feel instant, not network-bound.
      async onQueryStarted({ id, clientId, date }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          progressApi.util.updateQueryData('getHabits', { clientId }, (draft) => {
            const habit = draft.find((h) => h.id === id);
            if (!habit) return;
            habit.completedDates = habit.completedDates.includes(date)
              ? habit.completedDates.filter((d) => d !== date)
              : [...habit.completedDates, date];
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),

    createHabit: build.mutation<Habit, Pick<Habit, 'clientId' | 'title' | 'icon' | 'createdBy'>>({
      query: (body) => ({ url: '/habits', method: 'POST', body }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Habit', id: arg.clientId }],
    }),

    /** The coach editing a habit they set. `clientId` is for the cache tag only. */
    updateHabit: build.mutation<
      Habit,
      { id: string; clientId: string; patch: Partial<Pick<Habit, 'title' | 'icon'>> }
    >({
      query: ({ id, patch }) => ({ url: `/habits/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Habit', id: arg.clientId }],
    }),

    deleteHabit: build.mutation<{ id: string }, { id: string; clientId: string }>({
      query: ({ id }) => ({ url: `/habits/${id}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, arg) => [{ type: 'Habit', id: arg.clientId }],
    }),
  }),
});

export const {
  useGetBodyMetricsQuery,
  useLogBodyMetricMutation,
  useGetProgressPhotosQuery,
  useGetHabitsQuery,
  useToggleHabitMutation,
  useCreateHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
} = progressApi;
