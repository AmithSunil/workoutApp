import { createApi } from '@reduxjs/toolkit/query/react';

import { mockBaseQuery } from './mockBaseQuery';

/**
 * The single API slice. Feature areas attach their own endpoints via
 * `injectEndpoints`, which keeps this file free of domain knowledge and lets
 * each feature own its cache keys.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: mockBaseQuery(),
  tagTypes: [
    'Client',
    'ClientList',
    'ClientOverview',
    'NutritionDay',
    'Food',
    'WorkoutSession',
    'Routine',
    'RoutineAssignment',
    'WorkoutLog',
    'Metric',
    'Photo',
    'Habit',
    'Thread',
    'Message',
    'Alert',
    'CheckIn',
    'TrainerSummary',
    'Compliance',
  ] as const,
  /** Mock data is cheap to refetch; short cache keeps the demo feeling live. */
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});
