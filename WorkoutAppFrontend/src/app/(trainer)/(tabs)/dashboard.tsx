import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import { Paywall } from '@/components/billing/Paywall';
import { AlertCard } from '@/components/trainer/AlertCard';
import { CheckInCard } from '@/components/trainer/CheckInCard';
import { TrackingPicker } from '@/components/trainer/TrackingPicker';
import {
  Avatar,
  Card,
  EmptyState,
  PressableScale,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch } from '@/store/hooks';
import { activeClientChanged } from '@/store/slices/sessionSlice';
import { clientDetailTabChanged } from '@/store/slices/uiSlice';
import { colors, palette, radius, spacing, statusColor } from '@/theme';
import { ALERT_DOMAIN, shows } from '@/utils/tracking';
import { TODAY, longDate, timeAgo } from '@/utils/date';
import { firstName } from '@/utils/format';

/** Each queue shows this many until the coach asks for the rest. */
const PREVIEW = 3;

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

  const { active } = useSubscription();

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
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAllCheckIns, setShowAllCheckIns] = useState(false);

  // Hooks run unconditionally; the early return is below them. Everything this
  // screen shows is derived from the roster, so a lapsed plan leaves it with
  // nothing true to say.
  const gated = !active;

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
        .filter((c) => !c.invited && c.compliance.status !== 'green')
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

  if (gated) return <Paywall />;

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length;
  const pendingCount = checkIns.data?.length ?? summary.data?.pendingCheckIns ?? 0;
  const unread = summary.data?.unreadMessages ?? 0;
  const todo = visibleAlerts.length + pendingCount;
  const shownAlerts = showAllAlerts ? visibleAlerts : visibleAlerts.slice(0, PREVIEW);
  const pending = checkIns.data ?? [];
  const shownCheckIns = showAllCheckIns ? pending : pending.slice(0, PREVIEW);

  return (
    <Screen
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
      <View style={styles.hello}>
        <Text variant="micro" tone="tertiary">
          {longDate(TODAY).toUpperCase()}
        </Text>
        <Text variant="display">
          {greeting()},{'\n'}
          {trainer ? firstName(trainer.name) : 'Coach'}
        </Text>
      </View>

      {/* First run: the tracking choice a sign-up flow would have asked for. */}
      {tracking.chosen ? null : (
        <Card style={styles.big}>
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

      {/* The day in one number — the only dark surface on the screen */}
      <Card style={styles.hero}>
        <Text variant="micro" color={colors.primaryGlow}>
          TODAY
        </Text>
        <Text variant="metricLg" color={colors.textInverse}>
          {todo}
        </Text>
        <Text variant="bodyStrong" color={palette.grey300}>
          {todo === 0
            ? "You're all caught up"
            : `${todo === 1 ? 'thing needs' : 'things need'} your attention`}
        </Text>
        <View style={styles.heroChips}>
          <HeroChip icon="warning" label={`${criticalCount} critical`} tone={criticalCount ? colors.danger : undefined} />
          <HeroChip icon="clipboard" label={`${pendingCount} check-in${pendingCount === 1 ? '' : 's'}`} />
          <HeroChip
            icon="chatbubbles"
            label={`${unread} unread`}
            onPress={() => router.push(routes.trainer.messages())}
          />
        </View>
      </Card>

      {/* Roster */}
      <View style={styles.section}>
        <SectionHeader
          title="Roster"
          actionLabel="See all"
          onAction={() => router.push(routes.trainer.roster())}
        />
        <Card padded={false} style={styles.rosterCard}>
          <StatRow
            items={[
              { label: 'Active clients', value: `${summary.data?.activeClients ?? '—'}` },
              { label: 'Avg adherence', value: `${summary.data?.weeklyComplianceAvg ?? '—'}%` },
            ]}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pulseStrip}
            style={styles.pulse}>
            {(clients.data ?? []).map((client) => (
              <PressableScale
                key={client.id}
                onPress={() => openClient(client.id)}
                style={styles.pulseItem}>
                <Avatar
                  name={client.name}
                  uri={client.avatarUrl}
                  size={48}
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
              </PressableScale>
            ))}
          </ScrollView>
        </Card>
      </View>

      {/* Automated red flags */}
      <View style={styles.section}>
        <SectionHeader
          title="Needs a decision"
          caption={`${visibleAlerts.length} open flag${visibleAlerts.length === 1 ? '' : 's'}`}
          actionLabel={
            visibleAlerts.length > PREVIEW ? (showAllAlerts ? 'Show less' : 'Show all') : undefined
          }
          onAction={() => setShowAllAlerts((v) => !v)}
        />
        {alerts.isLoading ? (
          <SkeletonCard lines={3} />
        ) : visibleAlerts.length === 0 ? (
          <Card>
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Inbox zero"
              message="No missed logs, stalls or calorie misses to act on right now."
              compact
            />
          </Card>
        ) : (
          shownAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              client={clientById[alert.clientId]}
              onPress={() => {
                // A finished setup needs targets, which live on the Nutrition tab.
                if (alert.kind === 'intake-complete') {
                  dispatch(clientDetailTabChanged(tracking.nutrition ? 'nutrition' : 'metrics'));
                }
                openClient(alert.clientId);
              }}
              onMessage={() => messageClient(alert.clientId)}
              onResolve={() => void resolveAlert(alert.id)}
            />
          ))
        )}
      </View>

      {/* Review queue */}
      <View style={styles.section}>
        <SectionHeader
          title="Check-ins"
          caption="Weekly reviews waiting on you"
          actionLabel={
            pending.length > PREVIEW ? (showAllCheckIns ? 'Show less' : 'Show all') : undefined
          }
          onAction={() => setShowAllCheckIns((v) => !v)}
        />
        {checkIns.isLoading ? (
          <SkeletonCard lines={3} />
        ) : pending.length === 0 ? (
          <Card>
            <EmptyState
              icon="clipboard-outline"
              title="All reviewed"
              message="Every check-in submitted this week has been actioned."
              compact
            />
          </Card>
        ) : (
          shownCheckIns.map((checkIn) => (
            <CheckInCard
              key={checkIn.id}
              checkIn={checkIn}
              client={clientById[checkIn.clientId]}
              busy={reviewState.isLoading && reviewState.originalArgs === checkIn.id}
              onOpenClient={() => openClient(checkIn.clientId)}
              onReview={() => void reviewCheckIn(checkIn.id)}
            />
          ))
        )}
      </View>

      {/* Watchlist */}
      {needsAttention.length > 0 ? (
        <View style={styles.section}>
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
                <Avatar
                  name={client.name}
                  uri={client.avatarUrl}
                  size={40}
                  status={client.compliance.status}
                />
                <View style={styles.watchText}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {client.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1}>
                    {client.compliance.lastLoggedAt
                      ? `Last logged ${timeAgo(client.compliance.lastLoggedAt)}`
                      : 'Never logged'}
                  </Text>
                </View>
                <Text variant="bodyStrong" color={statusColor(client.compliance.status)}>
                  {client.compliance.score}%
                </Text>
              </Pressable>
            ))}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

/** A small count on the dark hero; tappable when it leads somewhere. */
function HeroChip({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone?: string;
  onPress?: () => void;
}) {
  const body = (
    <>
      <Ionicons name={icon} size={13} color={tone ?? palette.grey400} />
      <Text variant="label" color={palette.grey300}>
        {label}
      </Text>
    </>
  );
  return onPress ? (
    <PressableScale onPress={onPress} accessibilityRole="button" style={styles.heroChip}>
      {body}
    </PressableScale>
  ) : (
    <View style={styles.heroChip}>{body}</View>
  );
}

const styles = StyleSheet.create({
  hello: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  big: {
    padding: spacing.xl,
  },
  setupCopy: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  hero: {
    backgroundColor: colors.surfaceInk,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  heroChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: palette.grey800,
  },
  rosterCard: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  pulse: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  pulseStrip: {
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  watchRowBordered: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  watchText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
