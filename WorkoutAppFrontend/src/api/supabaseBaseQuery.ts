/**
 * The live transport: the same `{ url, method, params, body }` contract as
 * `mockBaseQuery`, resolved against Supabase instead of an in-memory database.
 *
 * Keeping the URL shape is what makes the swap a one-line change in
 * `baseApi.ts`. Every `injectEndpoints` call, every cache tag and every screen
 * is written against this contract and cannot tell the two apart.
 *
 * Requests carry the signed-in user's access token automatically: supabase-js
 * attaches it to every call, and `src/auth` is what put it there. Nothing in
 * this layer knows who is asking — under the real RLS policies these same
 * queries simply return fewer rows.
 */
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

import { matchRoute } from './matchRoute';
import { ApiHttpError } from './supabase/httpError';
import { supabaseRoutes } from './supabase/routes';
import type { ApiError, ApiRequest } from './types';

/** Network failures surface as a TypeError from fetch, with no status of their own. */
const isNetworkError = (error: unknown): boolean =>
  error instanceof TypeError ||
  (error instanceof Error && /fetch|network/i.test(error.message));

export const supabaseBaseQuery = (): BaseQueryFn<ApiRequest, unknown, ApiError> => {
  return async ({ url, method = 'GET', params = {}, body }) => {
    const path = url.split('?')[0];
    const match = matchRoute(supabaseRoutes, method, path);

    if (!match) {
      return { error: { status: 404, data: { message: `No route for ${method} ${path}` } } };
    }

    try {
      const data = await match.handler({ params: match.params, query: params, body });
      return { data: data ?? null };
    } catch (error) {
      if (error instanceof ApiHttpError) {
        return { error: { status: error.status, data: { message: error.message } } };
      }
      if (isNetworkError(error)) {
        return {
          error: { status: 0, data: { message: 'Could not reach the server.' } },
        };
      }
      return {
        error: {
          status: 500,
          data: { message: (error as Error)?.message ?? 'Unexpected server error' },
        },
      };
    }
  };
};
