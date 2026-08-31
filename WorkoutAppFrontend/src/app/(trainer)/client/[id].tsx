import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetNutritionRangeQuery } from '@/api/endpoints/nutritionApi';
import {
  useGetBodyMetricsQuery,
  useGetHabitsQuery,
  useGetProgressPhotosQuery,
  useToggleHabitMutation,
} from '@/api/endpoints/progressApi';
import {
  useCreateAssignmentMutation,
  useGetClientRoutinesQuery,
  useGetRoutinesQuery,
} from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery, useGetWorkoutSessionsQuery } from '@/api/endpoints/workoutsApi';
import {
  useGetClientOverviewQuery,
  useGetWeeklyComplianceQuery,
} from '@/api/endpoints/trainerApi';
import { BarSeries, LineChart, MacroBars, type BarDatum } from '@/components/charts';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { RoutineCard, RoutinePickerSheet } from '@/components/routines';
import { PhotoGallery } from '@/components/progress/PhotoGallery';
import { SessionCard } from '@/components/workouts/SessionCard';
import { WorkoutLogRow } from '@/components/workouts/WorkoutLogRow';
import {
  Avatar,
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
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clientDetailTabChanged, type UiState } from '@/store/slices/uiSlice';
import { colors, radius, spacing, statusColor, statusLabel } from '@/theme';
import { TODAY, monthDay } from '@/utils/date';
import { kcal, kg, pct, signed } from '@/utils/format';

type DetailTab = UiState['clientDetailTab'];

const TABS: Array<{ value: DetailTab; label: string }> = [
  { value: 'metrics', label: 'Metrics' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'workouts', label: 'Workouts' },
  { value: 'plan', label: 'Plan' },
];

/**
 * Everything a coach needs about one client, split into nested tabs so the
 * header context (who, status, headline numbers) stays pinned while they dig in.
 */
export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const tab = useAppSelector((s) => s.ui.clientDetailTab);

  const clientId = id ?? '';
  const overview = useGetClientOverviewQuery(clientId, { skip: !clientId });
  const threads = useGetThreadsQuery();

  const summary = overview.data;
  const client = summary?.client;
  const thread = (threads.data ?? []).find((t) => t.clientId === clientId);

  if (overview.isLoading || !summary || !client) {
    return (
      <Screen title="Client" showBack tabBarPadding={false}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  const tint = statusColor(client.compliance.status);

  return (
    <Screen
      title={client.name}
      subtitle={`${statusLabel(client.compliance.status)} · ${client.compliance.score}% adherence`}
      showBack
      tabBarPadding={false}
      headerRight={
        <Avatar
          name={client.name}
          uri={client.avatarUrl}
          size={44}
          status={client.compliance.status}
        />
      }>
      {/* Pinned header context */}
      <View style={styles.tiles}>
        <StatTile
          label="Weight"
          value={kg(summary.latestWeightKg)}
          hint={`${signed(summary.weightChange30d)} kg / 30d`}
          icon="scale-outline"
          tone={summary.weightChange30d <= 0 ? 'success' : 'warning'}
        />
        <StatTile
          label="Sessions / 7d"
          value={`${summary.sessionsLast7}`}
          hint={`RPE ${summary.avgRpeLast7 || '—'}`}
          icon="barbell"
          tone={summary.avgRpeLast7 >= 8.5 ? 'danger' : 'primary'}
        />
        <StatTile
          label="Logged / 7d"
          value={`${summary.loggedDaysLast7}d`}
          hint={`${kcal(summary.avgCaloriesLast7)} avg`}
          icon="restaurant"
          tone={summary.loggedDaysLast7 >= 6 ? 'success' : 'warning'}
        />
      </View>

      <View style={styles.actions}>
        <Button
          label="Message"
          icon="chatbubble-ellipses-outline"
          variant="secondary"
          size="sm"
          style={styles.action}
          onPress={() => thread && router.push(routes.trainer.thread(thread.id))}
        />
        <View style={[styles.goalPill, { borderColor: tint }]}>
          <View style={[styles.goalDot, { backgroundColor: tint }]} />
          <Text variant="label" numberOfLines={1}>
            Goal {kg(client.targetWeightKg, 0)} · {client.goal}
          </Text>
        </View>
      </View>

      <SegmentedControl<DetailTab>
        value={tab}
        onChange={(v) => dispatch(clientDetailTabChanged(v))}
        segments={TABS}
        size="sm"
      />

      {tab === 'metrics' ? <MetricsTab clientId={clientId} targetWeightKg={client.targetWeightKg} /> : null}
      {tab === 'nutrition' ? <NutritionTab clientId={clientId} /> : null}
      {tab === 'workouts' ? <WorkoutsTab clientId={clientId} /> : null}
      {tab === 'plan' ? <PlanTab clientId={clientId} clientName={client.name} /> : null}
    </Screen>
  );
}

/* ------------------------------------------------------------------ tabs */

function MetricsTab({ clientId, targetWeightKg }: { clientId: string; targetWeightKg: number }) {
  const metrics = useGetBodyMetricsQuery({ clientId });
  const photos = useGetProgressPhotosQuery({ clientId });

  const series = (metrics.data ?? []).map((m) => ({ date: m.date, value: m.weightKg }));
  const bodyFat = (metrics.data ?? [])
    .filter((m) => m.bodyFatPct !== undefined)
    .map((m) => ({ date: m.date, value: m.bodyFatPct as number }));

  if (metrics.isLoading) return <SkeletonCard lines={5} />;

  return (
    <>
      <Card>
        <Text variant="h2">Body weight</Text>
        <Text variant="micro" tone="tertiary" style={styles.chartCaption}>
          Drag across the chart to inspect any day
        </Text>
        {series.length > 1 ? (
          <LineChart data={series} height={200} target={targetWeightKg} unit=" kg" />
        ) : (
          <EmptyState icon="analytics-outline" title="No weigh-ins yet" compact />
        )}
      </Card>

      {bodyFat.length > 1 ? (
        <Card>
          <Text variant="h2">Body fat estimate</Text>
          <Text variant="micro" tone="tertiary" style={styles.chartCaption}>
            Derived from weekly caliper entries
          </Text>
          <LineChart data={bodyFat} height={150} color={colors.fat} unit="%" showTrend={false} />
        </Card>
      ) : null}

      <SectionHeader title="Photos" caption="Shared by the client" />
      {(photos.data ?? []).length > 0 ? (
        <PhotoGallery photos={photos.data ?? []} />
      ) : (
        <Card>
          <EmptyState icon="camera-outline" title="No photos shared" compact />
        </Card>
      )}
    </>
  );
}

function NutritionTab({ clientId }: { clientId: string }) {
  const compliance = useGetWeeklyComplianceQuery({ clientId, weeks: 6 });
  const days = useGetNutritionRangeQuery({ clientId, days: 14 });

  const bars = useMemo<BarDatum[]>(
    () =>
      (compliance.data ?? []).map((row) => {
        const share = pct(row.avgCalories, row.targetCalories);
        return {
          key: row.weekOf,
          label: monthDay(row.weekOf).split(' ')[1],
          value: row.avgCalories,
          caption: `${share}%`,
          color:
            share === 0
              ? colors.border
              : Math.abs(share - 100) <= 8
                ? colors.success
                : share > 100
                  ? colors.warning
                  : colors.primary,
        };
      }),
    [compliance.data]
  );

  const target = compliance.data?.[0]?.targetCalories;

  if (compliance.isLoading) return <SkeletonCard lines={5} />;

  return (
    <>
      <Card>
        <Text variant="h2">Weekly caloric compliance</Text>
        <Text variant="micro" tone="tertiary" style={styles.chartCaption}>
          Average daily intake per week against a {kcal(target ?? 0)} kcal target
        </Text>
        <BarSeries data={bars} height={110} target={target} />
        <View style={styles.legendRow}>
          {[
            { color: colors.success, label: 'Within 8%' },
            { color: colors.warning, label: 'Over' },
            { color: colors.primary, label: 'Under' },
          ].map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: l.color }]} />
              <Text variant="micro" tone="tertiary">
                {l.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <Text variant="h2">Adherence detail</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text variant="micro" tone="tertiary" style={styles.colWeek}>
              WEEK
            </Text>
            <Text variant="micro" tone="tertiary" style={styles.colNum}>
              LOGGED
            </Text>
            <Text variant="micro" tone="tertiary" style={styles.colNum}>
              KCAL
            </Text>
            <Text variant="micro" tone="tertiary" style={styles.colNum}>
              PROTEIN
            </Text>
            <Text variant="micro" tone="tertiary" style={styles.colNum}>
              RPE
            </Text>
          </View>
          {[...(compliance.data ?? [])].reverse().map((row) => (
            <View key={row.weekOf} style={styles.tableRow}>
              <Text variant="caption" style={styles.colWeek}>
                {monthDay(row.weekOf)}
              </Text>
              <Text
                variant="caption"
                tone={row.loggedDays >= 6 ? 'success' : row.loggedDays >= 4 ? 'warning' : 'danger'}
                style={styles.colNum}>
                {row.loggedDays}/7
              </Text>
              <Text variant="caption" style={styles.colNum}>
                {kcal(row.avgCalories)}
              </Text>
              <Text variant="caption" style={styles.colNum}>
                {row.avgProtein}g
              </Text>
              <Text
                variant="caption"
                tone={row.avgRpe >= 8.5 ? 'danger' : 'default'}
                style={styles.colNum}>
                {row.avgRpe || '—'}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title="Recent days" caption="Last two weeks of logging" />
      {(days.data ?? []).slice(0, 7).map((day) => (
        <Card key={day.date}>
          <View style={styles.dayHeader}>
            <Text variant="h2">{monthDay(day.date)}</Text>
            <Text
              variant="label"
              tone={
                Math.abs(pct(day.consumed.calories, day.targets.calories) - 100) <= 10
                  ? 'success'
                  : 'warning'
              }>
              {kcal(day.consumed.calories)} / {kcal(day.targets.calories)} kcal
            </Text>
          </View>
          <MacroBars consumed={day.consumed} targets={day.targets} compact />
        </Card>
      ))}
    </>
  );
}

function WorkoutsTab({ clientId }: { clientId: string }) {
  const router = useRouter();
  const logs = useGetWorkoutLogsQuery({ clientId, limit: 30 });

  const highStrain = (logs.data ?? []).filter((l) => l.rpe >= 9);

  if (logs.isLoading) return <SkeletonCard lines={4} />;

  return (
    <>
      {highStrain.length >= 2 ? (
        <Card style={styles.warnCard}>
          <View style={styles.warnRow}>
            <Ionicons name="flame" size={17} color={colors.danger} />
            <View style={styles.warnText}>
              <Text variant="h2">Strain is trending high</Text>
              <Text variant="caption" tone="secondary">
                {highStrain.length} of the last {logs.data?.length} sessions were logged at RPE 9 or
                above. Consider a deload or a volume cut.
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Completed sessions" caption="Audit trail, newest first" />
      {(logs.data ?? []).length === 0 ? (
        <Card>
          <EmptyState icon="barbell-outline" title="No sessions logged yet" compact />
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
  );
}

function PlanTab({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const habits = useGetHabitsQuery({ clientId });
  const sessions = useGetWorkoutSessionsQuery({ clientId });
  const assignments = useGetClientRoutinesQuery({ clientId });
  const library = useGetRoutinesQuery();
  const [createAssignment] = useCreateAssignmentMutation();
  const [toggleHabit] = useToggleHabitMutation();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyRoutineId, setBusyRoutineId] = useState<string | null>(null);

  const upcoming = (sessions.data ?? []).filter((s) => s.scheduledFor >= TODAY).slice(0, 5);
  const assigned = assignments.data ?? [];

  return (
    <>
      <SectionHeader
        title="Assigned routines"
        caption="What this client sees in their app"
        actionLabel="Assign"
        onAction={() => setPickerOpen(true)}
      />
      {assigned.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard-outline"
            title="No routine assigned"
            message="Give them a routine from your library — you can tailor it for them afterwards without affecting anyone else."
            actionLabel="Assign a routine"
            onAction={() => setPickerOpen(true)}
            compact
          />
        </Card>
      ) : (
        assigned.map((assignment) => (
          <RoutineCard
            key={assignment.assignmentId}
            title={assignment.title}
            days={assignment.days}
            badge={assignment.customised ? 'Customised' : undefined}
            showAssignment={false}
            onPress={() => router.push(routes.trainer.assignment(assignment.assignmentId))}
          />
        ))
      )}

      <SectionHeader title="Daily checklist" caption="Tick off on the client's behalf" />
      {habits.data && habits.data.length > 0 ? (
        <HabitChecklist
          habits={habits.data}
          onToggle={(habit) => void toggleHabit({ id: habit.id, clientId, date: TODAY })}
        />
      ) : (
        <Card>
          <EmptyState icon="list-outline" title="No habits set" compact />
        </Card>
      )}

      <SectionHeader title="Scheduled sessions" caption="Next five on the calendar" />
      {upcoming.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title="Nothing scheduled"
            message="Scheduled sessions are separate from routines — a routine is the standing weekly plan."
            compact
          />
        </Card>
      ) : (
        upcoming.map((session) => <SessionCard key={session.id} session={session} />)
      )}

      <RoutinePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        routines={library.data ?? []}
        assignedRoutineIds={assigned.map((a) => a.routineId)}
        busyRoutineId={busyRoutineId}
        clientName={clientName}
        onPick={(routineId) => {
          setBusyRoutineId(routineId);
          void createAssignment({ routineId, clientId })
            .unwrap()
            // Land on the client's own copy: assigning and then tailoring it
            // for them is one continuous thought.
            .then((created) => {
              setPickerOpen(false);
              router.push(routes.trainer.assignment(created.assignmentId));
            })
            .finally(() => setBusyRoutineId(null));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  action: {
    minWidth: 120,
  },
  goalPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 34,
    backgroundColor: colors.surface,
  },
  goalDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  chartCaption: {
    marginBottom: spacing.md,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  table: {
    marginTop: spacing.md,
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  colWeek: {
    flex: 1.2,
  },
  colNum: {
    flex: 1,
    textAlign: 'right',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md,
  },
  warnCard: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.dangerSoft,
  },
  warnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  warnText: {
    flex: 1,
    gap: 2,
  },
});
