import type { PostgrestError } from '@supabase/supabase-js';

/**
 * A transport-level failure expressed in the status codes the app already
 * speaks. `mockBaseQuery` answers with `{ status, data: { message } }` and the
 * screens branch on that, so the Supabase transport has to reach the same
 * vocabulary rather than leak PostgREST's.
 */
export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

/**
 * PostgREST's error codes, mapped back to HTTP.
 *
 * The backend raises `PT404` for "no such row" and a bare `raise exception`
 * (SQLSTATE P0001) for a validation failure, deliberately mirroring the mock's
 * 404 and 400. `PGRST116` is what `.single()` returns when it matched no rows —
 * the same thing by another name. Everything else is a real 500.
 */
export const fromPostgrest = (error: PostgrestError): ApiHttpError => {
  const code = error.code ?? '';

  if (code === 'PGRST116') return new ApiHttpError(404, error.message);
  if (/^PT\d{3}$/.test(code)) return new ApiHttpError(Number(code.slice(2)), error.message);
  if (code === 'P0001') return new ApiHttpError(400, error.message);
  // 42501 is insufficient_privilege — under RLS this is a row the caller may
  // not touch, which is an authorisation failure and not a server fault.
  if (code === '42501') return new ApiHttpError(403, error.message);

  return new ApiHttpError(500, error.message);
};
