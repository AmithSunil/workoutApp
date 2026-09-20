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
import { useGetWorkoutLogsQuery } from '@/api/endpoints/workoutsApi';
import {
  useGetClientOverviewQuery,
  useGetTrainerQuery,
  useGetWeeklyComplianceQuery,
  useRevokeInviteMutation,
} from '@/api/endpoints/trainerApi';
import { BarSeries, LineChart, MacroBars, type BarDatum } from '@/components/charts';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { GoalsEditor } from '@/components/trainer/GoalsEditor';
import { HabitEditor } from '@/components/trainer/HabitEditor';
import { Paywall } from '@/components/billing/Paywall';
import { RoutineCard, RoutinePickerSheet } from '@/components/routines';
import { PhotoGallery } from '@/components/progress/PhotoGallery';
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
import { useSubscription } from '@/hooks/useSubscription';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clientDetailTabChanged, type UiState } from '@/store/slices/uiSlice';
import { colors, radius, spacing, statusColor, statusLabel } from '@/theme';
import { TODAY, monthDay } from '@/utils/date';
import { shows, type TrackingDomain } from '@/utils/tracking';
import { GOAL_LABEL } from '@/utils/goal';
import type { ClientProfile } from '@/types/models';
import { grams, kcal, kg, pct, signed } from '@/utils/format';
import { shareInvite } from '@/utils/invite';

type DetailTab = UiState['clientDetailTab'];

/** Tabs, each tagged with the half of the product it belongs to. */
const TABS: Array<{ value: DetailTab; label: string; domain: TrackingDomain }> = [
  { value: 'metrics', label: 'Metrics', domain: 'both' },
  { value: 'nutrition', label: 'Nutrition', domain: 'nutrition' },
  { value: 'workouts', label: 'Workouts', domain: 'workout' },
  { value: 'plan', label: 'Plan', domain: 'workout' },
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

  const tracking = useTracking();
  const tabs = TABS.filter((t) => shows(tracking.mode, t.domain));
  // The stored tab can belong to a half the coach has since switched off.
  const activeTab = tabs.some((t) => t.value === tab) ? tab : tabs[0].value;

  // Reachable by deep link as well as from the roster, so it carries the same
  // gate rather than trusting the screen that sent the coach here.
  const { active } = useSubscription();

  const clientId = id ?? '';
  const overview = useGetClientOverviewQuery(clientId, { skip: !clientId || !active });
  const threads = useGetThreadsQuery();

  const summary = overview.data;
  const client = summary?.client;
  const thread = (threads.data ?? []).find((t) => t.clientId === clientId);

  if (!active) return <Paywall />;

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
      {client.invited ? <InviteCard client={client} /> : null}

      {/* Pinned header context */}
      <View style={styles.tiles}>
        <StatTile
          label="Weight"
          value={kg(summary.latestWeightKg)}
          hint={`${signed(summary.weightChange30d)} kg / 30d`}
          icon="scale-outline"
          tone={summary.weightChange30d <= 0 ? 'success' : 'warning'}
        />
        {tracking.workout ? (
          <StatTile
            label="Sessions / 7d"
            value={`${summary.sessionsLast7}`}
            icon="barbell"
            tone="primary"
          />
        ) : null}
        {tracking.nutrition ? (
          <StatTile
            label="Logged / 7d"
            value={`${summary.loggedDaysLast7}d`}
            hint={`${kcal(summary.avgCaloriesLast7)} avg`}
            icon="restaurant"
            tone={summary.loggedDaysLast7 >= 6 ? 'success' : 'warning'}
          />
        ) : null}
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
            Goal {kg(client.targetWeightKg, 0)} · {GOAL_LABEL[client.goal]}
          </Text>
        </View>
      </View>

      <SegmentedControl<DetailTab>
        value={activeTab}
        onChange={(v) => dispatch(clientDetailTabChanged(v))}
        segments={tabs}
        size="sm"
      />

      {activeTab === 'metrics' ? (
        <MetricsTab clientId={clientId} targetWeightKg={client.targetWeightKg ?? undefined} />
      ) : null}
      {activeTab === 'nutrition' ? (
        <NutritionTab client={client} currentWeightKg={summary.latestWeightKg} />
      ) : null}
      {activeTab === 'workouts' ? <WorkoutsTab clientId={clientId} /> : null}
      {activeTab === 'plan' ? <PlanTab clientId={clientId} clientName={client.name} /> : null}
    </Screen>
  );
}

/* ---------------------------------------------------------------- invite */

/**
 * Nobody has signed in as this client yet. Everything below still works — the
 * coach can set goals, habits and a routine now and the client finds them on
 * day one.
 */
function InviteCard({ client }: { client: ClientProfile }) {
  const router = useRouter();
  const trainer = useGetTrainerQuery();
  const [revoke, revoking] = useRevokeInviteMutation();
  // Alert.alert is a no-op on web, so the confirm is a second tap.
  const [confirming, setConfirming] = useState(false);

  return (
    <Card>
      <Text variant="h2">Invite pending</Text>
      <Text variant="caption" tone="secondary" style={styles.chartCaption}>
        {client.name.split(' ')[0]} signs in with {client.email}. Set up their goals, habits and
        routine now — they will be waiting on day one.
      </Text>
      <View style={styles.actions}>
        <Button
          label="Share invite"
          icon="share-outline"
          size="sm"
          style={styles.action}
          onPress={() => void shareInvite(client, trainer.data?.name ?? 'Your coach')}
        />
        <Button
          label={confirming ? 'Tap again to remove' : 'Remove'}
          icon="trash-outline"
          variant={confirming ? 'danger' : 'secondary'}
          size="sm"
          style={styles.action}
          loading={revoking.isLoading}
          onPress={() =>
            confirming
              ? void revoke(client.id)
                  .unwrap()
                  .then(() => router.replace(routes.trainer.roster()))
                  .catch(() => setConfirming(false))
              : setConfirming(true)
          }
        />
      </View>
      {revoking.isError ? (
        <Text variant="caption" tone="danger">
          Could not remove this invite. They may have just signed in.
        </Text>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ tabs */

function MetricsTab({ clientId, targetWeightKg }: { clientId: string; targetWeightKg?: number }) {
  const metrics = useGetBodyMetricsQuery({ clientId });
  const photos = useGetProgressPhotosQuery({ clientId });
  const habits = useGetHabitsQuery({ clientId });
  const [toggleHabit] = useToggleHabitMutation();
  const [editingHabits, setEditingHabits] = useState(false);

  const series = (metrics.data ?? []).map((m) => ({ date: m.date, value: m.weightKg }));

  if (metrics.isLoading) return <SkeletonCard lines={5} />;

  return (
    <>
      <Card>
        <Text variant="h2">Body weight</Text>
        <Text variant="micro" tone="tertiary" style={styles.chartCaption}>
          Drag across the chart to inspect any day
        </Text>
        {series.length > 1 ? (
          // ponytail: this target line is editable only from the Nutrition tab,
          // which `shows()` hides from a workout-only coach — they see the goal
          // but cannot set it. Give GoalsEditor a weight-only entry point here
          // if that combination ever turns up.
          <LineChart data={series} height={200} target={targetWeightKg} unit=" kg" />
        ) : (
          <EmptyState icon="analytics-outline" title="No weigh-ins yet" compact />
        )}
      </Card>

      <SectionHeader
        title="Daily habits"
        caption="The goals you set — tap to tick one off for them"
        actionLabel="Edit"
        onAction={() => setEditingHabits(true)}
      />
      {habits.data && habits.data.length > 0 ? (
        <HabitChecklist
          habits={habits.data}
          onToggle={(habit) => void toggleHabit({ id: habit.id, clientId, date: TODAY })}
        />
      ) : (
        <Card>
          <EmptyState
            icon="list-outline"
            title="No habits set"
            message="Set the daily goals this client ticks off."
            actionLabel="Add habits"
            onAction={() => setEditingHabits(true)}
            compact
          />
        </Card>
      )}

      <HabitEditor
        visible={editingHabits}
        onClose={() => setEditingHabits(false)}
        clientId={clientId}
        habits={habits.data ?? []}
      />

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

function NutritionTab({
  client,
  currentWeightKg,
}: {
  client: ClientProfile;
  currentWeightKg: number | null;
}) {
  const clientId = client.id;
  const compliance = useGetWeeklyComplianceQuery({ clientId, weeks: 6 });
  const days = useGetNutritionRangeQuery({ clientId, days: 14 });
  const [editingGoals, setEditingGoals] = useState(false);

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
      <SectionHeader
        title="Goals"
        caption="What you are holding this client to"
        actionLabel="Edit"
        onAction={() => setEditingGoals(true)}
      />
      <Card>
        <View style={styles.goals}>
          {[
            { label: 'GOAL', value: GOAL_LABEL[client.goal] },
            { label: 'GOAL WEIGHT', value: kg(client.targetWeightKg, 0) },
            { label: 'CALORIES', value: kcal(client.targets.calories) },
            { label: 'PROTEIN', value: grams(client.targets.protein) },
            { label: 'CARBS', value: grams(client.targets.carbs) },
            { label: 'FAT', value: grams(client.targets.fat) },
          ].map((goal) => (
            <View key={goal.label} style={styles.goal}>
              <Text variant="micro" tone="tertiary">
                {goal.label}
              </Text>
              <Text variant="h2">{goal.value}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Mounted only while open so it always re-seeds from the server copy. */}
      {editingGoals ? (
        <GoalsEditor
          client={client}
          currentWeightKg={currentWeightKg}
          onClose={() => setEditingGoals(false)}
        />
      ) : null}

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

  if (logs.isLoading) return <SkeletonCard lines={4} />;

  return (
    <>
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
  const assignments = useGetClientRoutinesQuery({ clientId });
  const library = useGetRoutinesQuery();
  const [createAssignment] = useCreateAssignmentMutation();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busyRoutineId, setBusyRoutineId] = useState<string | null>(null);

  const assigned = assignments.data ?? [];

  return (
    <>
      <SectionHeader
        title="Current routine"
        caption="Their training week, repeating until you assign another"
        actionLabel={assigned.length === 0 ? 'Assign' : 'Change'}
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
  goals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  goal: {
    // Five cells: the weight goal takes a full half-row of its own, the four
    // macros share the rest evenly.
    minWidth: '33%',
    gap: spacing.xxs,
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
});
