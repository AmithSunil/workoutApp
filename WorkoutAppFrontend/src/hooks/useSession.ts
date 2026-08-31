import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetClientQuery, useGetTrainerQuery } from '@/api/endpoints/trainerApi';
import { useAppSelector } from '@/store/hooks';

/**
 * Convenience view over the session slice plus the records it points at.
 * Screens use this instead of reaching into the store directly.
 *
 * `role` is only meaningful once `status` is `signedIn` — it is resolved from
 * `app_role()` over a real token, so the two flip together and the `isClient` /
 * `isTrainer` flags below check both.
 */
export function useSession() {
  const session = useAppSelector((s) => s.session);
  const clientId = session.activeClientId ?? undefined;
  const signedIn = session.status === 'signedIn';

  const { data: client } = useGetClientQuery(clientId ?? '', { skip: !clientId });
  const { data: trainer } = useGetTrainerQuery();

  return {
    ...session,
    client,
    trainer,
    /** The client whose data the current screens read. */
    clientId,
    isSignedIn: signedIn,
    isClient: signedIn && session.role === 'client',
    isTrainer: signedIn && session.role === 'trainer',
  };
}

/** The thread between the signed-in client and their coach, if there is one. */
export function useClientThread(clientId?: string) {
  const { data: threads = [] } = useGetThreadsQuery(undefined, { skip: !clientId });
  return threads.find((t) => t.clientId === clientId) ?? null;
}
