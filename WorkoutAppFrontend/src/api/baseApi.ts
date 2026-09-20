import { createApi } from '@reduxjs/toolkit/query/react';

import { mockBaseQuery } from './mockBaseQuery';
import { supabaseBaseQuery } from './supabaseBaseQuery';

/**
 * Which transport answers the app's requests.
 *
 * Supabase is the default. Setting `EXPO_PUBLIC_API_TRANSPORT=mock` in
 * `.env.local` swaps in the in-memory database instead — that is how
 * `tools/verify.js` drives the app with no network, and how a suspicious bug
 * gets bisected into "frontend" or "backend" in one restart. Both implement the
 * same `{ url, method, params, body }` contract, so nothing above this line
 * changes either way. Expo only reads env files at startup, so a change here
 * needs a dev-server restart.
 */
const useMock = process.env.EXPO_PUBLIC_API_TRANSPORT === 'mock';

/**
 * The single API slice. Feature areas attach their own endpoints via
 * `injectEndpoints`, which keeps this file free of domain knowledge and lets
 * each feature own its cache keys.
 */
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: useMock ? mockBaseQuery() : supabaseBaseQuery(),
  tagTypes: [
    'Client',
    'ClientList',
    'ClientOverview',
    'NutritionDay',
    'Food',
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
    'Trainer',
    'TrainerSummary',
    'Compliance',
    'Subscription',
  ] as const,
  /** Server data is cheap to refetch here; a short cache keeps screens live. */
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});
