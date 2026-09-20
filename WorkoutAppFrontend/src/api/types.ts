/**
 * The transport contract.
 *
 * Both `mockBaseQuery` and `supabaseBaseQuery` speak exactly this, and it is
 * deliberately the shape `fetchBaseQuery` uses — the endpoints above were
 * written as if they were talking to HTTP, and they still are in every sense
 * that matters to them.
 */
export interface ApiRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface ApiError {
  /** HTTP status, or 0 when the request never reached the server. */
  status: number;
  data: { message: string };
}

/** The server's own words for a failed request, for screens that show them. */
export const errorMessage = (error: unknown, fallback: string): string =>
  (error as Partial<ApiError> | undefined)?.data?.message || fallback;
