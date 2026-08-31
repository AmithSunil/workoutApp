/**
 * The offline transport: resolves requests against the in-memory mock database
 * instead of the network.
 *
 * It is no longer the default — `baseApi` reaches for Supabase unless
 * `EXPO_PUBLIC_API_TRANSPORT=mock` says otherwise — but it is kept, and kept
 * working, for two reasons: `tools/verify.js` drives the whole app headlessly
 * with no network and no live data, and it is the fastest way to tell a
 * frontend bug from a backend one.
 *
 * Its route table in `handlers.ts` is the specification both transports
 * implement; `src/api/supabase/routes.ts` mirrors it entry for entry.
 */
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

import { MockHttpError, routes } from './handlers';
import { matchRoute } from './matchRoute';
import type { ApiError, ApiRequest } from './types';

/** Simulated round-trip so loading states are exercised in development. */
const LATENCY_MS: [min: number, max: number] = [140, 380];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockBaseQuery = (): BaseQueryFn<ApiRequest, unknown, ApiError> => {
  return async ({ url, method = 'GET', params = {}, body }) => {
    const [min, max] = LATENCY_MS;
    await sleep(min + Math.random() * (max - min));

    const path = url.split('?')[0];
    const match = matchRoute(routes, method, path);
    if (!match) {
      return { error: { status: 404, data: { message: `No mock route for ${method} ${path}` } } };
    }

    try {
      // Structured-clone the response so consumers can never mutate the mock db.
      const data = JSON.parse(
        JSON.stringify(
          match.handler({ url, method, params: match.params, query: params, body }) ?? null,
        ),
      );
      return { data };
    } catch (err) {
      if (err instanceof MockHttpError) {
        return { error: { status: err.status, data: { message: err.message } } };
      }
      return {
        error: { status: 500, data: { message: (err as Error)?.message ?? 'Mock server error' } },
      };
    }
  };
};

export type { ApiError, ApiRequest } from './types';
