/**
 * URL-pattern matching, shared by both transports.
 *
 * The mock and the Supabase transport publish the same table of `METHOD /path`
 * patterns; keeping the matcher in one place is what guarantees they agree on
 * which route a request lands on, rather than on two copies that can drift.
 */
export interface RouteLike<H> {
  method: string;
  pattern: string;
  handler: H;
}

export interface RouteMatch<H> {
  handler: H;
  params: Record<string, string>;
}

/** Resolves `GET /clients/c-001` against `GET /clients/:id`. */
export const matchRoute = <H>(
  table: ReadonlyArray<RouteLike<H>>,
  method: string,
  path: string,
): RouteMatch<H> | null => {
  const segments = path.split('/').filter(Boolean);

  for (const route of table) {
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

    if (matched) return { handler: route.handler, params };
  }

  return null;
};
