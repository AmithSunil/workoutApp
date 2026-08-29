import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { useGetClientRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery, useGetWorkoutSessionsQuery } from '@/api/endpoints/workoutsApi';
import { BarSeries, type BarDatum } from '@/components/charts';
import { RoutineCard } from '@/components/routines';
import { SessionCard } from '@/components/workouts/SessionCard';
import { WorkoutLogRow } from '@/components/workouts/WorkoutLogRow';
import {
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';
import { TODAY, diffInDays, startOfWeek, addDays, weekdayInitial } from '@/utils/date';
import { volume } from '@/utils/format';

type Tab = 'upcoming' | 'history';

/** Training hub: what's next, and an auditable record of what's been done. */
export default function WorkoutsScreen() {
  const router = useRouter();
  const { clientId } = useSession();
  const [tab, setTab] = useState<Tab>('upcoming');

  const sessions = useGetWorkoutSessionsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const logs = useGetWorkoutLogsQuery({ clientId: clientId ?? '', limit: 40 }, { skip: !clientId });
  const routines = useGetClientRoutinesQuery({ clientId: clientId ?? '' }, { skip: !clientId });

  const todaySession = sessions.data?.find((s) => s.scheduledFor === TODAY);
  const upcoming = useMemo(
    () => (sessions.data ?? []).filter((s) => s.scheduledFor > TODAY).slice(0, 6),
    [sessions.data]
  );

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
        caption: log ? `${log.rpe}` : '',
      };
    });
  }, [logs.data]);

  const totalVolume = weekLogs.reduce((sum, l) => sum + l.totalVolumeKg, 0);
  const avgRpe = weekLogs.length
    ? (weekLogs.reduce((s, l) => s + l.rpe, 0) / weekLogs.length).toFixed(1)
    : '—';

  return (
    <Screen
      title="Workouts"
      subtitle="Your programme, written by your coach"
      refreshControl={
        <RefreshControl
          refreshing={sessions.isFetching || logs.isFetching}
          onRefresh={() => {
            void sessions.refetch();
            void logs.refetch();
          }}
        />
      }>
      <View style={styles.tiles}>
        <StatTile label="Sessions / 7d" value={`${weekLogs.length}`} icon="checkmark-done" tone="primary" />
        <StatTile label="Volume / 7d" value={volume(totalVolume)} icon="stats-chart" tone="success" />
        <StatTile
          label="Avg RPE"
          value={avgRpe}
          icon="speedometer"
          tone={Number(avgRpe) >= 8.5 ? 'danger' : 'default'}
        />
      </View>

      <Card>
        <View style={styles.chartHeader}>
          <View>
            <Text variant="h2">This week's load</Text>
            <Text variant="micro" tone="tertiary">
              Volume in hundreds of kg · number below each bar is RPE
            </Text>
          </View>
        </View>
        <BarSeries data={weekBars} height={96} />
      </Card>

      <SegmentedControl<Tab>
        value={tab}
        onChange={setTab}
        segments={[
          { value: 'upcoming', label: 'Programme' },
          { value: 'history', label: `History (${logs.data?.length ?? 0})` },
        ]}
      />

      {tab === 'upcoming' ? (
        <>
          {(routines.data ?? []).length > 0 ? (
            <>
              <SectionHeader title="Your routines" caption="Written for you by your coach" />
              {(routines.data ?? []).map((assigned) => (
                <RoutineCard
                  key={assigned.assignmentId}
                  title={assigned.title}
                  days={assigned.days}
                  showAssignment={false}
                  onPress={() => router.push(routes.client.routine(assigned.assignmentId))}
                />
              ))}
            </>
          ) : null}

          {todaySession ? (
            <>
              <SectionHeader title="Today" caption="Due now" />
              <SessionCard
                session={todaySession}
                featured
                onStart={() => router.push(routes.client.session(todaySession.id))}
              />
            </>
          ) : null}

          <SectionHeader title="Coming up" caption="Next sessions in your block" />
          {sessions.isLoading ? (
            <SkeletonCard lines={3} />
          ) : upcoming.length === 0 ? (
            <Card>
              <EmptyState
                icon="calendar-outline"
                title="Nothing scheduled yet"
                message="Your coach hasn't published the next block. Message them if you're unsure."
                compact
              />
            </Card>
          ) : (
            upcoming.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onStart={() => router.push(routes.client.session(session.id))}
              />
            ))
          )}
        </>
      ) : (
        <>
          <SectionHeader title="Completed sessions" caption="Newest first" />
          {logs.isLoading ? (
            <SkeletonCard lines={3} />
          ) : (logs.data ?? []).length === 0 ? (
            <Card>
              <EmptyState
                icon="barbell-outline"
                title="No sessions logged"
                message="Start a workout from your programme and it will appear here."
                compact
              />
            </Card>
          ) : (
            (logs.data ?? []).map((log) => (
              <WorkoutLogRow
                key={log.id}
                log={log}
                onPress={() => router.push(routes.workoutLog(log.id))}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  chartHeader: {
    marginBottom: spacing.md,
  },
});
