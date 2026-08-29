/**
 * A drop-in replacement for RTK Query's `fetchBaseQuery` that resolves requests
 * against the in-memory mock database instead of the network.
 *
 * The argument shape is intentionally identical to `fetchBaseQuery`, so pointing
 * the app at a live BaaS is a one-line change in `baseApi.ts`:
 *
 *   baseQuery: fetchBaseQuery({ baseUrl: process.env.EXPO_PUBLIC_API_URL })
 */
import type { BaseQueryFn } from '@reduxjs/toolkit/query';

import { MockHttpError, routes, type MockRequest } from './handlers';

export interface ApiRequest {
  url: string;
  method?: MockRequest['method'];
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface ApiError {
  status: number;
  data: { message: string };
}

/** Simulated round-trip so loading states are exercised in development. */
const LATENCY_MS: [min: number, max: number] = [140, 380];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const matchRoute = (method: MockRequest['method'], path: string) => {
  const segments = path.split('/').filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const patternSegments = route.pattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) continue;
    const params: Record<string, string> = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i++) {
      const p = patternSegments[i];
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segments[i]);
      else if (p !== segments[i]) {
        matched = false;
        break;
      }
    }
    if (matched) return { route, params };
  }
  return null;
};

export const mockBaseQuery = (): BaseQueryFn<ApiRequest, unknown, ApiError> => {
  return async ({ url, method = 'GET', params = {}, body }) => {
    const [min, max] = LATENCY_MS;
    await sleep(min + Math.random() * (max - min));

    const path = url.split('?')[0];
    const match = matchRoute(method, path);
    if (!match) {
      return { error: { status: 404, data: { message: `No mock route for ${method} ${path}` } } };
    }

    try {
      const request: MockRequest = { url, method, params: match.params, query: params, body };
      // Structured-clone the response so consumers can never mutate the mock db.
      const data = JSON.parse(JSON.stringify(match.route.handler(request) ?? null));
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
