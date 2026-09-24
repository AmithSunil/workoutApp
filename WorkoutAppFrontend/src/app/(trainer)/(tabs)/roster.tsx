import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { Paywall } from '@/components/billing/Paywall';
import { ClientRosterItem } from '@/components/trainer/ClientRosterItem';
import {
  Card,
  Chip,
  EmptyState,
  Screen,
  ScreenTitle,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
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

  // `active` below is already the un-invited clients; this one is the plan.
  const { active: planOk } = useSubscription();
  const clients = useGetClientsQuery(undefined, { skip: !planOk });
  // Invited clients have no compliance yet; they get their own group and stay
  // out of the counts and the traffic lights.
  const active = useMemo(() => (clients.data ?? []).filter((c) => !c.invited), [clients.data]);
  const invited = useMemo(() => (clients.data ?? []).filter((c) => c.invited), [clients.data]);

  const counts = useMemo(() => {
    const base = { all: 0, green: 0, yellow: 0, red: 0 };
    for (const c of active) {
      base.all += 1;
      base[c.compliance.status] += 1;
    }
    return base;
  }, [active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active
      .filter((c) => (filter === 'all' ? true : c.compliance.status === filter))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) || GOAL_LABEL[c.goal].toLowerCase().includes(q) : true))
      .sort((a, b) => a.compliance.score - b.compliance.score);
  }, [active, filter, query]);

  const open = (clientId: string) => {
    dispatch(activeClientChanged(clientId));
    router.push(routes.trainer.clientDetail(clientId));
  };

  // The gate. Server-side it is the client_profiles select policy (the pending
  // RLS set, old T10); this is the same rule rendered, so a lapsed coach sees a
  // reason rather than an empty roster.
  if (!planOk) return <Paywall />;

  const filterLabel = FILTERS.find((f) => f.value === filter)?.label ?? 'All';

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={clients.isFetching} onRefresh={() => void clients.refetch()} />
      }>
      <ScreenTitle
        eyebrow={`${counts.all} active · ${counts.red + counts.yellow} need attention`}
        title="Clients"
        action={{
          icon: 'person-add',
          label: 'Add a client',
          onPress: () => router.push(routes.trainer.invite()),
        }}
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
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
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            accent={f.accent ?? colors.surfaceInk}
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
      ) : active.length === 0 ? (
        <Card>
          <EmptyState
            icon="person-add-outline"
            title="No active clients yet"
            message="Add a client by email. They sign in with a code, no password."
            actionLabel="Add a client"
            onAction={() => router.push(routes.trainer.invite())}
          />
        </Card>
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
        <View style={styles.section}>
          <SectionHeader title={filterLabel} caption="Lowest adherence first" />
          <Card padded={false} style={styles.list}>
            {filtered.map((client, i) => (
              <View key={client.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <ClientRosterItem client={client} onPress={() => open(client.id)} />
              </View>
            ))}
          </Card>
        </View>
      )}

      {invited.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Invited" caption="Not signed in yet — set them up now" />
          <Card padded={false} style={styles.list}>
            {invited.map((client, i) => (
              <View key={client.id}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <ClientRosterItem client={client} onPress={() => open(client.id)} />
              </View>
            ))}
          </Card>
        </View>
      ) : null}
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
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  bleed: {
    marginHorizontal: -spacing.xl,
  },
  filters: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 2,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 48 + spacing.md,
  },
});
