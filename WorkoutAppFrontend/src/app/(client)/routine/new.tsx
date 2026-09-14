import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateRoutineMutation } from '@/api/endpoints/routinesApi';
import { RoutineBuilder } from '@/components/routines';
import { useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';

/**
 * A client planning their own training, for when their coach tracks nutrition
 * only. Same builder the trainer uses, minus the client picker — it ships
 * assigned to the one person who can see it.
 *
 * ponytail: the routine is stored under the client's coach, because
 * `routines.trainer_id` is not null and there is nowhere else to hang it. It is
 * only ever reachable through the client's own assignment. Give routines a real
 * author column if a coach should be able to tell the two apart in their
 * library — and note the pending RLS set has no client-authored-routine policy.
 */
export default function ClientRoutineBuilderScreen() {
  const router = useRouter();
  const { clientId } = useSession();
  const [createRoutine, { isLoading }] = useCreateRoutineMutation();
  const [error, setError] = useState<string | null>(null);

  return (
    <RoutineBuilder
      screenTitle="Plan a routine"
      submitLabel="Save routine"
      submitting={isLoading}
      error={error}
      onSubmit={(value) => {
        if (!clientId) return;
        setError(null);
        void createRoutine({ ...value, assignedClientIds: [clientId] })
          .unwrap()
          // Back out of a saved routine and you land on the programme, not an
          // empty builder for something that now exists.
          .then(() => router.replace(routes.client.workouts()))
          .catch(() => setError('Could not save this routine. Check the name and try again.'));
      }}
    />
  );
}
