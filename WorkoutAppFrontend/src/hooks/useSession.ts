import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetClientQuery, useGetTrainerQuery } from '@/api/endpoints/trainerApi';
import { useAppSelector } from '@/store/hooks';
import type { ClientProfile } from '@/types/models';

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

/**
 * The thread between a client and their current coach, if there is one. A
 * client adopted by a new coach can still see an old coach's thread, so the
 * coach has to match too. No coach, no thread.
 */
export function useClientThread(client?: Pick<ClientProfile, 'id' | 'trainerId'>) {
  const coach = client?.trainerId;
  const { data: threads = [] } = useGetThreadsQuery(undefined, { skip: !coach });
  return threads.find((t) => t.clientId === client?.id && t.trainerId === coach) ?? null;
}
