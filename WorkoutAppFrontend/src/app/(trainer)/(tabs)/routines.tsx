import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useGetRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { RoutineCard, routineTotals } from '@/components/routines';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
} from '@/components/ui';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';
import type { ClientProfile } from '@/types/models';

/**
 * The trainer's routine library.
 *
 * Routines are dateless weekly templates: built once, assigned to as many
 * clients as the coach likes, and tailored per client from the client's own
 * copy rather than here.
 */
export default function RoutinesScreen() {
  const router = useRouter();
  const routines = useGetRoutinesQuery();
  const clients = useGetClientsQuery();

  const clientsById = useMemo(() => {
    const map = new Map<string, ClientProfile>();
    for (const client of clients.data ?? []) map.set(client.id, client);
    return map;
  }, [clients.data]);

  const list = routines.data ?? [];

  /** Distinct clients holding at least one routine — the coverage number. */
  const assignedClientCount = useMemo(
    () => new Set(list.flatMap((routine) => routine.assignedClientIds)).size,
    [list]
  );

  const prescribedSets = useMemo(
    () => list.reduce((sum, routine) => sum + routineTotals(routine.days).sets, 0),
    [list]
  );

  return (
    <Screen
      title="Routines"
      subtitle="Build a week once, assign to anyone"
      refreshControl={
        <RefreshControl refreshing={routines.isFetching} onRefresh={() => void routines.refetch()} />
      }
      headerRight={
        <Button
          label="New"
          icon="add"
          size="sm"
          onPress={() => router.push(routes.trainer.routineBuilder())}
        />
      }>
      <View style={styles.tiles}>
        <StatTile label="Templates" value={`${list.length}`} icon="documents-outline" tone="primary" />
        <StatTile
          label="Clients covered"
          value={`${assignedClientCount}`}
          hint={`of ${clients.data?.length ?? 0}`}
          icon="people-outline"
          tone={assignedClientCount > 0 ? 'success' : 'warning'}
        />
        <StatTile label="Sets written" value={`${prescribedSets}`} icon="barbell-outline" />
      </View>

      <SectionHeader title="Your library" caption="Newest changes first" />

      {routines.isLoading ? (
        <>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard-outline"
            title="No routines yet"
            message="Build a training week — pick the days, add exercises with target sets, reps and rest — then assign it to as many clients as you like."
            actionLabel="Build your first routine"
            onAction={() => router.push(routes.trainer.routineBuilder())}
          />
        </Card>
      ) : (
        list.map((routine) => (
          <RoutineCard
            key={routine.id}
            title={routine.title}
            days={routine.days}
            assignedTo={routine.assignedClientIds
              .map((id) => clientsById.get(id))
              .filter((client): client is ClientProfile => Boolean(client))}
            onPress={() => router.push(routes.trainer.routineDetail(routine.id))}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
