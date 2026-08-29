import { useGetBodyMetricsQuery } from '@/api/endpoints/progressApi';
import type { ClientProfile } from '@/types/models';

import { ClientRosterRow } from './ClientRosterRow';

export interface ClientRosterItemProps {
  client: ClientProfile;
  onPress: () => void;
}

/**
 * Connected wrapper for a roster row.
 *
 * The weight sparkline needs that client's metrics, so the row owns the query
 * rather than the list pre-loading eight clients' history up front — RTK Query
 * dedupes and caches it, and the row renders fine while it is in flight.
 */
export function ClientRosterItem({ client, onPress }: ClientRosterItemProps) {
  const { data: metrics } = useGetBodyMetricsQuery({ clientId: client.id });
  const trend = (metrics ?? []).slice(-14).map((m) => m.weightKg);

  return <ClientRosterRow client={client} trend={trend} onPress={onPress} />;
}
