import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useGetRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { RoutineCard, routineTotals } from '@/components/routines';
import {
  Card,
  EmptyState,
  PressableScale,
  Screen,
  ScreenTitle,
  SectionHeader,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
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
      refreshControl={
        <RefreshControl refreshing={routines.isFetching} onRefresh={() => void routines.refetch()} />
      }>
      <ScreenTitle
        eyebrow="Build a week once, assign to anyone"
        title="Routines"
        action={{
          icon: 'add',
          label: 'New routine',
          onPress: () => router.push(routes.trainer.routineBuilder()),
        }}
      />

      <Card style={styles.big}>
        <StatRow
          items={[
            { label: 'Templates', value: `${list.length}` },
            {
              label: 'Clients covered',
              value: `${assignedClientCount}/${clients.data?.length ?? 0}`,
            },
            { label: 'Sets written', value: `${prescribedSets}` },
          ]}
        />
      </Card>

      <View style={styles.section}>
        <SectionHeader title="Library" caption="Newest changes first" />

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
          <>
            {list.map((routine) => (
              <RoutineCard
                key={routine.id}
                title={routine.title}
                days={routine.days}
                assignedTo={routine.assignedClientIds
                  .map((id) => clientsById.get(id))
                  .filter((client): client is ClientProfile => Boolean(client))}
                onPress={() => router.push(routes.trainer.routineDetail(routine.id))}
              />
            ))}
            <PressableScale
              onPress={() => router.push(routes.trainer.routineBuilder())}
              accessibilityRole="button"
              style={styles.newCard}>
              <Ionicons name="add" size={20} color={colors.textSecondary} />
              <Text variant="bodyStrong" tone="secondary">
                Build a new routine
              </Text>
            </PressableScale>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: {
    padding: spacing.xl,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  newCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});
