import { useRouter } from 'expo-router';
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
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';
import {
  TODAY,
  WEEKDAY_LABEL,
  addDays,
  diffInDays,
  startOfWeek,
  weekdayInitial,
  weekdayOf,
} from '@/utils/date';
import { volume } from '@/utils/format';

type Tab = 'upcoming' | 'history';

/** Training hub: what's on today, and an auditable record of what's been done. */
export default function WorkoutsScreen() {
  const router = useRouter();
  const { clientId } = useSession();
  const [tab, setTab] = useState<Tab>('upcoming');

  // A coach who tracks nutrition only writes no programme, so the client does.
  const selfPlanned = !useTracking().workout;

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
      };
    });
  }, [logs.data]);

  const totalVolume = weekLogs.reduce((sum, l) => sum + l.totalVolumeKg, 0);
  const avgMinutes = weekLogs.length
    ? Math.round(weekLogs.reduce((s, l) => s + l.durationMinutes, 0) / weekLogs.length)
    : 0;

  return (
    <Screen
      title="Workouts"
      subtitle={selfPlanned ? 'Your routine, planned by you' : 'Your routine, written by your coach'}
      refreshControl={
        <RefreshControl
          refreshing={routines.isFetching || logs.isFetching}
          onRefresh={() => {
            void routines.refetch();
            void logs.refetch();
          }}
        />
      }>
      <View style={styles.tiles}>
        <StatTile label="Sessions / 7d" value={`${weekLogs.length}`} icon="checkmark-done" tone="primary" />
        <StatTile label="Volume / 7d" value={volume(totalVolume)} icon="stats-chart" tone="success" />
        <StatTile
          label="Avg session"
          value={avgMinutes ? `${avgMinutes}m` : '—'}
          icon="time-outline"
        />
      </View>

      <Card>
        <View style={styles.chartHeader}>
          <View>
            <Text variant="h2">This week's load</Text>
            <Text variant="micro" tone="tertiary">
              Volume in hundreds of kg · minutes below each bar
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
          <SectionHeader
            title="Today"
            caption={todayLog ? 'Done' : todayDay ? WEEKDAY_LABEL[today] : 'Rest day'}
          />
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
            <Card>
              <EmptyState
                icon={current ? 'bed-outline' : 'calendar-outline'}
                title={current ? 'Rest day' : 'No routine yet'}
                message={
                  current
                    ? 'Nothing programmed for today. Move a little, eat well, sleep more.'
                    : selfPlanned
                      ? 'Plan a routine below and your training week takes shape here.'
                      : "Your coach hasn't given you a routine yet. Message them if you're unsure."
                }
                compact
              />
            </Card>
          )}

          {todayLog ? null : (
            <Button
              label="Train something else today"
              icon="swap-horizontal"
              variant="secondary"
              fullWidth
              onPress={() => router.push(routes.client.trainCustom())}
            />
          )}

          {selfPlanned ? (
            <Button
              label="Plan a routine"
              icon="add"
              fullWidth
              onPress={() => router.push(routes.client.routineBuilder())}
            />
          ) : null}

          {(routines.data ?? []).length > 0 ? (
            <>
              <SectionHeader
                title="Your routines"
                caption={selfPlanned ? 'Planned by you' : 'Written for you by your coach'}
              />
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
                message="Start a workout from your routine and it will appear here."
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
