import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import {
  useGetAlertsQuery,
  useGetCheckInsQuery,
  useGetClientsQuery,
  useGetTrainerQuery,
  useGetTrainerSummaryQuery,
  useResolveAlertMutation,
  useReviewCheckInMutation,
  useUpdateTrainerMutation,
} from '@/api/endpoints/trainerApi';
import { ProfileButton } from '@/components/common/ProfileButton';
import { AlertCard } from '@/components/trainer/AlertCard';
import { CheckInCard } from '@/components/trainer/CheckInCard';
import { TrackingPicker } from '@/components/trainer/TrackingPicker';
import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
  StatusDot,
  Text,
} from '@/components/ui';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch } from '@/store/hooks';
import { activeClientChanged } from '@/store/slices/sessionSlice';
import { colors, radius, spacing, statusColor } from '@/theme';
import { ALERT_DOMAIN, shows } from '@/utils/tracking';
import { TODAY, longDate, timeAgo } from '@/utils/date';
import { firstName } from '@/utils/format';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
};

/**
 * Triage: the coach's first screen of the day. Ordered by what needs a decision
 * — automated red flags first, then the review queue, then everyone else.
 */
export default function TriageDashboard() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { data: trainer } = useGetTrainerQuery();
  const summary = useGetTrainerSummaryQuery();
  const alerts = useGetAlertsQuery();
  const clients = useGetClientsQuery();
  const checkIns = useGetCheckInsQuery({ status: 'pending' });
  const threads = useGetThreadsQuery();
  const [resolveAlert] = useResolveAlertMutation();
  const [reviewCheckIn, reviewState] = useReviewCheckInMutation();
  const [updateTrainer, trackingState] = useUpdateTrainerMutation();
  const tracking = useTracking();

  // A coach only triages the half of the product they track.
  const visibleAlerts = useMemo(
    () => (alerts.data ?? []).filter((a) => shows(tracking.mode, ALERT_DOMAIN[a.kind])),
    [alerts.data, tracking.mode]
  );

  const clientById = useMemo(
    () => Object.fromEntries((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data]
  );

  const needsAttention = useMemo(
    () =>
      (clients.data ?? [])
        .filter((c) => c.compliance.status !== 'green')
        .sort((a, b) => a.compliance.score - b.compliance.score),
    [clients.data]
  );

  const openClient = (clientId: string) => {
    dispatch(activeClientChanged(clientId));
    router.push(routes.trainer.clientDetail(clientId));
  };

  const messageClient = (clientId: string) => {
    const thread = (threads.data ?? []).find((t) => t.clientId === clientId);
    if (thread) router.push(routes.trainer.thread(thread.id));
  };

  const refreshing = summary.isFetching || alerts.isFetching || clients.isFetching;

  return (
    <Screen
      title={trainer ? `${greeting()}, ${firstName(trainer.name)}` : 'Triage'}
      subtitle={longDate(TODAY)}
      headerRight={
        trainer ? (
          <ProfileButton
            name={trainer.name}
            avatarUrl={trainer.avatarUrl}
            href={routes.trainer.profile()}
          />
        ) : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            void summary.refetch();
            void alerts.refetch();
            void clients.refetch();
            void checkIns.refetch();
          }}
        />
      }>
      {/* First run: the tracking choice a sign-up flow would have asked for. */}
      {tracking.chosen ? null : (
        <Card>
          <Text variant="h2">What do you coach?</Text>
          <Text variant="caption" tone="secondary" style={styles.setupCopy}>
            This decides what Apex shows you. You can change it any time from your profile.
          </Text>
          <TrackingPicker
            value={null}
            busy={trackingState.isLoading}
            onChange={(tracks) => void updateTrainer({ tracks })}
          />
        </Card>
      )}

      {/* Command-centre KPIs */}
      <View style={styles.tiles}>
        <StatTile
          label="Active clients"
          value={`${summary.data?.activeClients ?? '—'}`}
          icon="people"
          tone="primary"
          onPress={() => router.push(routes.trainer.roster())}
        />
        <StatTile
          label="Check-ins due"
          value={`${summary.data?.pendingCheckIns ?? '—'}`}
          icon="clipboard"
          tone="warning"
        />
      </View>
      <View style={styles.tiles}>
        <StatTile
          label="Unread"
          value={`${summary.data?.unreadMessages ?? '—'}`}
          icon="chatbubbles"
          tone="default"
          onPress={() => router.push(routes.trainer.messages())}
        />
        <StatTile
          label="Red flags"
          value={`${visibleAlerts.filter((a) => a.severity === 'critical').length}`}
          icon="warning"
          tone="danger"
        />
        <StatTile
          label="Avg adherence"
          value={`${summary.data?.weeklyComplianceAvg ?? '—'}%`}
          icon="trending-up"
          tone="success"
        />
      </View>

      {/* Roster pulse strip */}
      <Card padded={false} style={styles.pulseCard}>
        <View style={styles.pulseHeader}>
          <Text variant="h2">Roster pulse</Text>
          <Pressable onPress={() => router.push(routes.trainer.roster())} hitSlop={8}>
            <Text variant="label" tone="primary">
              See all
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pulseStrip}>
          {(clients.data ?? []).map((client) => (
            <Pressable
              key={client.id}
              onPress={() => openClient(client.id)}
              style={({ pressed }) => [styles.pulseItem, pressed && styles.pressed]}>
              <Avatar
                name={client.name}
                uri={client.avatarUrl}
                size={44}
                status={client.compliance.status}
              />
              <Text variant="micro" numberOfLines={1} style={styles.pulseName}>
                {firstName(client.name)}
              </Text>
              <Text
                variant="micro"
                color={statusColor(client.compliance.status)}
                numberOfLines={1}>
                {client.compliance.score}%
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      {/* Automated red flags */}
      <SectionHeader
        title="Needs a decision"
        caption={`${visibleAlerts.length} open flag${visibleAlerts.length === 1 ? '' : 's'}`}
      />
      {alerts.isLoading ? (
        <SkeletonCard lines={3} />
      ) : visibleAlerts.length === 0 ? (
        <Card>
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="Inbox zero"
            message="No missed logs, strain spikes or stalls to act on right now."
            compact
          />
        </Card>
      ) : (
        visibleAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            client={clientById[alert.clientId]}
            onPress={() => openClient(alert.clientId)}
            onMessage={() => messageClient(alert.clientId)}
            onResolve={() => void resolveAlert(alert.id)}
          />
        ))
      )}

      {/* Review queue */}
      <SectionHeader
        title="Pending check-ins"
        caption="Weekly reviews waiting on you"
      />
      {checkIns.isLoading ? (
        <SkeletonCard lines={3} />
      ) : (checkIns.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard-outline"
            title="All reviewed"
            message="Every check-in submitted this week has been actioned."
            compact
          />
        </Card>
      ) : (
        (checkIns.data ?? []).map((checkIn) => (
          <CheckInCard
            key={checkIn.id}
            checkIn={checkIn}
            client={clientById[checkIn.clientId]}
            busy={reviewState.isLoading}
            onOpenClient={() => openClient(checkIn.clientId)}
            onReview={() => void reviewCheckIn(checkIn.id)}
          />
        ))
      )}

      {/* Watchlist */}
      {needsAttention.length > 0 ? (
        <>
          <SectionHeader title="Watchlist" caption="Below 80% adherence" />
          <Card padded={false}>
            {needsAttention.map((client, i) => (
              <Pressable
                key={client.id}
                onPress={() => openClient(client.id)}
                style={({ pressed }) => [
                  styles.watchRow,
                  i > 0 && styles.watchRowBordered,
                  pressed && styles.pressed,
                ]}>
                <StatusDot status={client.compliance.status} />
                <View style={styles.watchText}>
                  <Text variant="body" numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text variant="micro" tone="tertiary" numberOfLines={1}>
                    {client.compliance.score}% adherence ·{' '}
                    {client.compliance.lastLoggedAt
                      ? `last logged ${timeAgo(client.compliance.lastLoggedAt)}`
                      : 'never logged'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  setupCopy: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pulseCard: {
    paddingVertical: spacing.lg,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pulseStrip: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  pulseItem: {
    alignItems: 'center',
    gap: 3,
    width: 56,
  },
  pulseName: {
    marginTop: spacing.xs,
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  watchRowBordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  watchText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
