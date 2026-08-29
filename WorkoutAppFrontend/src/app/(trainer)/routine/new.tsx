import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useCreateRoutineMutation } from '@/api/endpoints/routinesApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { RoutineBuilder } from '@/components/routines';
import { routes } from '@/navigation/routes';

/** Create a routine. The form itself lives in `RoutineBuilder`, shared with edit. */
export default function NewRoutineScreen() {
  const router = useRouter();
  const clients = useGetClientsQuery();
  const [createRoutine, { isLoading }] = useCreateRoutineMutation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <RoutineBuilder
      screenTitle="New routine"
      submitLabel="Save routine"
      submitting={isLoading}
      error={error}
      assignment={{
        clients: clients.data ?? [],
        selectedIds,
        onToggle: (clientId) =>
          setSelectedIds((prev) =>
            prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
          ),
      }}
      onSubmit={(value) => {
        setError(null);
        void createRoutine({ ...value, assignedClientIds: selectedIds })
          .unwrap()
          // Replace, not push: backing out of a saved routine should land on
          // the library, not an empty builder for a routine that now exists.
          .then((routine) => router.replace(routes.trainer.routineDetail(routine.id)))
          .catch(() => setError('Could not save this routine. Check the name and try again.'));
      }}
    />
  );
}
