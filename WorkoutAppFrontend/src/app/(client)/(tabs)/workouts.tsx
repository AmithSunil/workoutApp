import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useGetClientRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery } from '@/api/endpoints/workoutsApi';
import { BarSeries, type BarDatum } from '@/components/charts';
import { RoutineCard } from '@/components/routines';
import { TodayCard } from '@/components/workouts/TodayCard';
import { WorkoutLogRow } from '@/components/workouts/WorkoutLogRow';
import {
  Button,
  Card,
  EmptyState,
  PressableScale,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import {
  TODAY,
  addDays,
  diffInDays,
  startOfWeek,
  weekdayInitial,
  weekdayOf,
} from '@/utils/date';
import { volume } from '@/utils/format';

/** History shows this many sessions until the user asks for all of them. */
const HISTORY_PREVIEW = 5;

/** Only reachable while the client's coach tracks workouts — a deep link lands on home. */
export default function WorkoutsRoute() {
  return useTracking().workout ? <WorkoutsScreen /> : <Redirect href={routes.client.explore()} />;
}

/** Training hub: what's on today, and an auditable record of what's been done. */
function WorkoutsScreen() {
  const router = useRouter();
  const { clientId } = useSession();
  const [showAllHistory, setShowAllHistory] = useState(false);

  const logs = useGetWorkoutLogsQuery({ clientId: clientId ?? '', limit: 40 }, { skip: !clientId });
  const routines = useGetClientRoutinesQuery({ clientId: clientId ?? '' }, { skip: !clientId });

  // The newest assignment is the current programme: a routine runs until the
  // trainer assigns a different one, and `GET /assignments` is newest-first.
  const current = routines.data?.[0];
  const today = weekdayOf();
  const todayDay = current?.days.find((day) => day.weekday === today) ?? null;
  // One workout per day: once today is logged the Today section shows it, and
  // every route into the logger becomes an edit of that log.
  const todayLog = (logs.data ?? []).find((l) => l.date === TODAY);
  const editToday = () =>
    router.push(current ? routes.client.train(current.assignmentId) : routes.client.trainCustom());

  const weekLogs = useMemo(
    () => (logs.data ?? []).filter((l) => diffInDays(TODAY, l.date) < 7),
    [logs.data]
  );

  /** Volume per day for the current week — the simplest useful load view. */
  const weekBars = useMemo<BarDatum[]>(() => {
    const monday = startOfWeek(TODAY);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const log = (logs.data ?? []).find((l) => l.date === date);
      return {
        key: date,
        label: weekdayInitial(date),
        value: log ? Math.round(log.totalVolumeKg / 100) : 0,
        caption: log ? `${log.durationMinutes}m` : '',
        // Rest days read as empty track, not a sliver of brand colour.
        color: log ? undefined : colors.surfaceMuted,
      };
    });
  }, [logs.data]);

  const totalVolume = weekLogs.reduce((sum, l) => sum + l.totalVolumeKg, 0);
  const avgMinutes = weekLogs.length
    ? Math.round(weekLogs.reduce((s, l) => s + l.durationMinutes, 0) / weekLogs.length)
    : 0;

  const history = logs.data ?? [];
  const shownHistory = showAllHistory ? history : history.slice(0, HISTORY_PREVIEW);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={routines.isFetching || logs.isFetching}
          onRefresh={() => {
            void routines.refetch();
            void logs.refetch();
          }}
        />
      }>
      <View style={styles.hello}>
        <Text variant="micro" tone="tertiary">
          YOUR TRAINING
        </Text>
        <Text variant="display">Workouts</Text>
      </View>

      {/* Today — the one thing to do on this screen */}
      <View style={styles.section}>
        <SectionHeader title="Today" />
        {routines.isLoading || logs.isLoading ? (
          <SkeletonCard lines={3} />
        ) : todayLog ? (
          <>
            <WorkoutLogRow
              log={todayLog}
              onPress={() => router.push(routes.workoutLog(todayLog.id))}
            />
            <Button
              label="Edit today's workout"
              icon="create-outline"
              variant="secondary"
              fullWidth
              onPress={editToday}
            />
          </>
        ) : todayDay && current ? (
          <TodayCard
            day={todayDay}
            routineTitle={current.title}
            onStart={editToday}
            onPress={() => router.push(routes.client.routine(current.assignmentId))}
          />
        ) : (
          <Card style={styles.restRow}>
            <View style={styles.restIcon}>
              <Ionicons
                name={current ? 'moon-outline' : 'calendar-clear-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </View>
            <View style={styles.flex}>
              <Text variant="h2">{current ? 'Rest day' : 'No routine yet'}</Text>
              <Text variant="caption" tone="secondary">
                {current
                  ? 'Nothing programmed. Move a little, sleep more.'
                  : 'Your coach will send one soon.'}
              </Text>
            </View>
          </Card>
        )}

        {todayLog ? null : (
          <PressableScale
            onPress={() => router.push(routes.client.trainCustom())}
            accessibilityRole="button"
            style={styles.altLink}>
            <Ionicons name="swap-horizontal" size={16} color={colors.primaryText} />
            <Text variant="label" tone="primary">
              Train something else today
            </Text>
          </PressableScale>
        )}
      </View>

      {/* This week — headline numbers over the daily load */}
      <View style={styles.section}>
        <SectionHeader title="This week" />
        <Card style={styles.big}>
          <StatRow
            items={[
              { label: 'Sessions', value: `${weekLogs.length}` },
              { label: 'Volume', value: volume(totalVolume) },
              { label: 'Avg session', value: avgMinutes ? `${avgMinutes}m` : '—' },
            ]}
          />
          <View style={styles.chart}>
            <BarSeries data={weekBars} height={88} />
          </View>
          <Text variant="micro" tone="tertiary" align="center" style={styles.chartNote}>
            Daily volume · minutes under each bar
          </Text>
        </Card>
      </View>

      {/* Programme */}
      {(routines.data ?? []).length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Your routine" caption="Written for you by your coach" />
          {(routines.data ?? []).map((assigned) => (
            <RoutineCard
              key={assigned.assignmentId}
              title={assigned.title}
              days={assigned.days}
              showAssignment={false}
              onPress={() => router.push(routes.client.routine(assigned.assignmentId))}
            />
          ))}
        </View>
      ) : null}

      {/* History */}
      <View style={styles.section}>
        <SectionHeader
          title="History"
          caption={history.length ? `${history.length} sessions logged` : undefined}
          actionLabel={
            history.length > HISTORY_PREVIEW ? (showAllHistory ? 'Show less' : 'Show all') : undefined
          }
          onAction={() => setShowAllHistory((v) => !v)}
        />
        {logs.isLoading ? (
          <SkeletonCard lines={3} />
        ) : history.length === 0 ? (
          <Card>
            <EmptyState
              icon="barbell-outline"
              title="No sessions logged"
              message="Start a workout from your routine and it will appear here."
              compact
            />
          </Card>
        ) : (
          shownHistory.map((log) => (
            <WorkoutLogRow
              key={log.id}
              log={log}
              onPress={() => router.push(routes.workoutLog(log.id))}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  chart: {
    marginTop: spacing.xl,
  },
  chartNote: {
    marginTop: spacing.md,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  restIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  altLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
