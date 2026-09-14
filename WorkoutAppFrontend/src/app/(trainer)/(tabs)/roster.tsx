import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { ClientRosterItem } from '@/components/trainer/ClientRosterItem';
import { Card, Chip, EmptyState, Screen, SkeletonCard, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activeClientChanged } from '@/store/slices/sessionSlice';
import { rosterFilterChanged, rosterQueryChanged } from '@/store/slices/uiSlice';
import { colors, radius, spacing } from '@/theme';
import type { ComplianceStatus } from '@/types/models';
import { GOAL_LABEL } from '@/utils/goal';

const FILTERS: Array<{ value: 'all' | ComplianceStatus; label: string; accent?: string }> = [
  { value: 'all', label: 'All' },
  { value: 'green', label: 'On track', accent: colors.statusGreen },
  { value: 'yellow', label: 'Needs a nudge', accent: colors.statusYellow },
  { value: 'red', label: 'At risk', accent: colors.statusRed },
];

/** Searchable directory with traffic-light compliance at a glance. */
export default function RosterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const query = useAppSelector((s) => s.ui.rosterQuery);
  const filter = useAppSelector((s) => s.ui.rosterFilter);

  const clients = useGetClientsQuery();

  const counts = useMemo(() => {
    const base = { all: 0, green: 0, yellow: 0, red: 0 };
    for (const c of clients.data ?? []) {
      base.all += 1;
      base[c.compliance.status] += 1;
    }
    return base;
  }, [clients.data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (clients.data ?? [])
      .filter((c) => (filter === 'all' ? true : c.compliance.status === filter))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || GOAL_LABEL[c.goal].toLowerCase().includes(q) : true))
      .sort((a, b) => a.compliance.score - b.compliance.score);
  }, [clients.data, filter, query]);

  const open = (clientId: string) => {
    dispatch(activeClientChanged(clientId));
    router.push(routes.trainer.clientDetail(clientId));
  };

  return (
    <Screen
      title="Clients"
      subtitle={`${counts.all} active · ${counts.red + counts.yellow} need attention`}
      refreshControl={
        <RefreshControl refreshing={clients.isFetching} onRefresh={() => void clients.refetch()} />
      }>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={(t) => dispatch(rosterQueryChanged(t))}
          placeholder="Search by name or goal"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => dispatch(rosterQueryChanged(''))} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.borderStrong} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            accent={f.accent}
            count={counts[f.value]}
            selected={filter === f.value}
            onPress={() => dispatch(rosterFilterChanged(f.value))}
          />
        ))}
      </ScrollView>

      {clients.isLoading ? (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="people-outline"
            title="No clients match"
            message="Try clearing the search or switching the compliance filter."
            actionLabel="Reset filters"
            onAction={() => {
              dispatch(rosterQueryChanged(''));
              dispatch(rosterFilterChanged('all'));
            }}
          />
        </Card>
      ) : (
        <>
          <Text variant="micro" tone="tertiary">
            SORTED BY LOWEST ADHERENCE FIRST
          </Text>
          {filtered.map((client) => (
            <ClientRosterItem key={client.id} client={client} onPress={() => open(client.id)} />
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  filters: {
    gap: spacing.sm,
    paddingVertical: 2,
  },
});
