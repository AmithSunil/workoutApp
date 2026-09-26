import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetNutritionRangeQuery } from '@/api/endpoints/nutritionApi';
import {
  useGetBodyMetricsQuery,
  useGetHabitsQuery,
  useGetProgressPhotosQuery,
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
  useRemoveClientMutation,
  useRevokeInviteMutation,
} from '@/api/endpoints/trainerApi';
import { BarSeries, LineChart, type BarDatum } from '@/components/charts';
import { DateStrip } from '@/components/common/DateStrip';
import { MEAL_META, MealSection } from '@/components/nutrition/MealSection';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
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
  Sheet,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clientDetailTabChanged, type UiState } from '@/store/slices/uiSlice';
import { colors, elevation, radius, spacing, statusColor, statusLabel } from '@/theme';
import { TODAY, friendlyDate, monthDay } from '@/utils/date';
import { shows, type TrackingDomain } from '@/utils/tracking';
import { GOAL_LABEL } from '@/utils/goal';
import type { ClientProfile, MealSlot } from '@/types/models';
import { grams, kcal, kg, pct, signed } from '@/utils/format';
import { shareInvite } from '@/utils/invite';

type DetailTab = UiState['clientDetailTab'];

/** Sessions shown before "Show all". */
const HISTORY_PREVIEW = 5;

/** Weekly bar colours — distinct hues, so "over" and "under" never read alike. */
const LEGEND = [
  { color: colors.success, label: 'Within 8%' },
  { color: colors.warning, label: 'Over' },
  { color: colors.carbs, label: 'Under' },
];

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
  const weightTrendGood = summary.weightChange30d <= 0;

  return (
    <Screen
      showBack
      tabBarPadding={false}
      headerRight={client.invited ? null : <ClientMenu client={client} />}>
      {/* Who — centred, with status stated in words and colour */}
      <View style={styles.hero}>
        <Avatar
          name={client.name}
          uri={client.avatarUrl}
          size={88}
          status={client.invited ? undefined : client.compliance.status}
        />
        <View style={styles.heroText}>
          <Text variant="title" align="center" numberOfLines={1}>
            {client.name}
          </Text>
          <Text variant="caption" tone="secondary" align="center" numberOfLines={1}>
            {GOAL_LABEL[client.goal]} · goal {kg(client.targetWeightKg, 0)}
          </Text>
        </View>
        {client.invited ? null : (
          <View style={[styles.statusPill, { backgroundColor: `${tint}1F` }]}>
            <View style={[styles.statusDot, { backgroundColor: tint }]} />
            <Text variant="label" color={tint}>
              {statusLabel(client.compliance.status)} · {client.compliance.score}% adherence
            </Text>
          </View>
        )}
      </View>

      {client.invited ? (
        <InviteCard client={client} />
      ) : (
        <Button
          label="Message"
          icon="chatbubble-ellipses"
          fullWidth
          disabled={!thread}
          onPress={() => thread && router.push(routes.trainer.thread(thread.id))}
        />
      )}

      {/* Snapshot — the last month in three numbers */}
      <Card style={styles.big}>
        <StatRow
          items={[
            {
              label: 'Weight',
              value: kg(summary.latestWeightKg),
              hint: `${signed(summary.weightChange30d)} kg / 30d`,
              hintColor: weightTrendGood ? colors.success : colors.warning,
            },
            ...(tracking.workout
              ? [{ label: 'Sessions / 7d', value: `${summary.sessionsLast7}` }]
              : []),
            ...(tracking.nutrition
              ? [
                  {
                    label: 'Logged / 7d',
                    value: `${summary.loggedDaysLast7}d`,
                    hint: `${kcal(summary.avgCaloriesLast7)} kcal avg`,
                  },
                ]
              : []),
          ]}
        />
      </Card>

      <View style={styles.tabs}>
        <SegmentedControl<DetailTab>
          value={activeTab}
          onChange={(v) => dispatch(clientDetailTabChanged(v))}
          segments={tabs}
        />
      </View>

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
    <Card style={styles.big}>
      <Text variant="h2">Invite pending</Text>
      <Text variant="caption" tone="secondary" style={styles.inviteCopy}>
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

/**
 * Detaches, never deletes: the client keeps their account and history and
 * carries on as an individual. Lives behind the header's ⋯ menu and confirms
 * in a Sheet — Alert.alert is a no-op on web.
 */
function ClientMenu({ client }: { client: ClientProfile }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [remove, removing] = useRemoveClientMutation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const first = client.name.split(' ')[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More actions"
        onPress={() => setMenuOpen(true)}
        hitSlop={12}
        style={styles.menuButton}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
      </Pressable>

      {/* ponytail: one item, so a plain transparent Modal; a shared Menu primitive when a second screen needs one */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} accessibilityLabel="Dismiss">
          <Card style={[styles.menu, { top: insets.top + spacing.sm + 44 }]}>
            <Pressable
              accessibilityRole="menuitem"
              onPress={() => {
                setMenuOpen(false);
                setOpen(true);
              }}
              style={styles.menuItem}>
              <Ionicons name="person-remove-outline" size={18} color={colors.danger} />
              <Text variant="bodyStrong" tone="danger">
                Remove from roster
              </Text>
            </Pressable>
          </Card>
        </Pressable>
      </Modal>

      <Sheet visible={open} onClose={() => setOpen(false)} title={`Remove ${first}?`} height="42%">
        <View style={styles.removeSheet}>
          <Text tone="secondary">
            {first} leaves your roster and you lose access to their logs and progress. They keep
            their account and history, and continue training on their own.
          </Text>
          {removing.isError ? (
            <Text variant="caption" tone="danger">
              Could not remove this client. Try again.
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              style={styles.action}
              disabled={removing.isLoading}
              onPress={() => setOpen(false)}
            />
            <Button
              label="Remove"
              variant="danger"
              style={styles.action}
              loading={removing.isLoading}
              onPress={() =>
                void remove(client.id)
                  .unwrap()
                  .then(() => {
                    setOpen(false);
                    router.replace(routes.trainer.roster());
                  })
                  .catch(() => undefined)
              }
            />
          </View>
        </View>
      </Sheet>
    </>
  );
}

/* ------------------------------------------------------------------ tabs */

function MetricsTab({ clientId, targetWeightKg }: { clientId: string; targetWeightKg?: number }) {
  const metrics = useGetBodyMetricsQuery({ clientId });
  const photos = useGetProgressPhotosQuery({ clientId });
  const habits = useGetHabitsQuery({ clientId });
  const [editingHabits, setEditingHabits] = useState(false);

  const series = (metrics.data ?? []).map((m) => ({ date: m.date, value: m.weightKg }));

  if (metrics.isLoading) return <SkeletonCard lines={5} />;

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title="Body weight" caption="Drag across the chart to inspect any day" />
        <Card style={styles.big}>
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
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Habits"
          caption="The daily goals you set — ticked off by them"
          actionLabel="Edit"
          onAction={() => setEditingHabits(true)}
        />
        {habits.data && habits.data.length > 0 ? (
          <HabitChecklist
            habits={habits.data}
            headless
            readOnly
            onToggle={() => undefined}
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
      </View>

      <HabitEditor
        visible={editingHabits}
        onClose={() => setEditingHabits(false)}
        clientId={clientId}
        habits={habits.data ?? []}
      />

      <View style={styles.section}>
        {(photos.data ?? []).length > 0 ? (
          <PhotoGallery photos={photos.data ?? []} limit={2} />
        ) : (
          <>
            <SectionHeader title="Photos" caption="Shared by the client" />
            <Card>
              <EmptyState icon="camera-outline" title="No photos shared" compact />
            </Card>
          </>
        )}
      </View>
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
  const [date, setDate] = useState(TODAY);
  const [weekKey, setWeekKey] = useState<string>();
  const [showFood, setShowFood] = useState(false);
  const day = days.data?.find((d) => d.date === date);
  const logged = useMemo(
    () => (days.data ?? []).filter((d) => d.entries.length > 0).map((d) => d.date),
    [days.data]
  );

  const bars = useMemo<BarDatum[]>(
    () =>
      (compliance.data ?? []).map((row) => {
        const share = pct(row.avgCalories, row.targetCalories);
        return {
          key: row.weekOf,
          label: monthDay(row.weekOf),
          value: row.avgCalories,
          caption: row.loggedDays ? `${share}%` : '—',
          color:
            share === 0
              ? colors.border
              : Math.abs(share - 100) <= 8
                ? colors.success
                : share > 100
                  ? colors.warning
                  : colors.carbs,
        };
      }),
    [compliance.data]
  );

  const target = client.targets.calories;
  // Tapped week, else the latest one.
  const week =
    compliance.data?.find((r) => r.weekOf === weekKey) ?? compliance.data?.[compliance.data.length - 1];

  if (compliance.isLoading || days.isLoading) return <SkeletonCard lines={5} />;

  return (
    <>
      <View style={styles.section}>
        <SectionHeader
          title="Targets"
          caption={`${GOAL_LABEL[client.goal]} · goal weight ${kg(client.targetWeightKg, 0)}`}
          actionLabel="Edit"
          onAction={() => setEditingGoals(true)}
        />
        <Card style={styles.big}>
          <StatRow
            items={[
              { label: 'kcal', value: kcal(client.targets.calories) },
              { label: 'Protein', value: grams(client.targets.protein) },
              { label: 'Carbs', value: grams(client.targets.carbs) },
              { label: 'Fat', value: grams(client.targets.fat) },
            ]}
          />
        </Card>
      </View>

      {/* Mounted only while open so it always re-seeds from the server copy. */}
      {editingGoals ? (
        <GoalsEditor
          client={client}
          currentWeightKg={currentWeightKg}
          onClose={() => setEditingGoals(false)}
        />
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Daily log" caption={date === TODAY ? 'Today' : friendlyDate(date)} />
        <DateStrip
          value={date}
          onChange={(d) => {
            setDate(d);
            setShowFood(false);
          }}
          markedDates={logged}
        />
        {!day || day.entries.length === 0 ? (
          <Card>
            <EmptyState icon="restaurant-outline" title="Nothing logged this day" compact />
          </Card>
        ) : (
          <>
            <NutritionSummary day={day} label="kcal left" />
            <Pressable
              onPress={() => setShowFood((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: showFood }}
              style={styles.foodToggle}>
              <Text variant="label" tone="primary">
                {showFood ? 'Hide food' : `Show food · ${day.entries.length} item${day.entries.length > 1 ? 's' : ''}`}
              </Text>
              <Ionicons
                name={showFood ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.primaryText}
              />
            </Pressable>
            {showFood
              ? (Object.keys(MEAL_META) as MealSlot[]).map((slot) => {
                  const entries = day.entries.filter((e) => e.slot === slot);
                  return entries.length ? (
                    <MealSection key={slot} slot={slot} entries={entries} readOnly />
                  ) : null;
                })
              : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader
          title="Weekly compliance"
          caption={`Tap a week for detail · line is today's ${kcal(target)} kcal target`}
        />
        <Card style={styles.big}>
          {week ? (
            <View style={styles.weekHead}>
              <Text variant="micro" tone="tertiary">
                WEEK OF {monthDay(week.weekOf).toUpperCase()}
              </Text>
              {week.loggedDays ? (
                <>
                  <Text variant="metricLg">
                    {kcal(week.avgCalories)}
                    <Text variant="label" tone="tertiary">
                      {' '}
                      kcal / day
                    </Text>
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {pct(week.avgCalories, week.targetCalories)}% of {kcal(week.targetCalories)} ·{' '}
                    {week.avgProtein}g protein · {week.loggedDays}/7 days logged
                  </Text>
                </>
              ) : (
                <Text variant="bodyStrong" tone="secondary">
                  Nothing logged this week
                </Text>
              )}
            </View>
          ) : null}
          <BarSeries
            data={bars}
            height={140}
            target={target}
            activeKey={week?.weekOf}
            onPressBar={(d) => setWeekKey(d.key)}
          />
          <View style={styles.legendRow}>
            {LEGEND.map((l) => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: l.color }]} />
                <Text variant="micro" tone="tertiary">
                  {l.label}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Week by week" />
        <Card style={styles.big}>
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
          {[...(compliance.data ?? [])].reverse().map((row, i) => (
            <View key={row.weekOf} style={[styles.tableRow, i > 0 && styles.tableRowRule]}>
              <Text variant="label" style={styles.colWeek}>
                {monthDay(row.weekOf)}
              </Text>
              <Text
                variant="label"
                tone={row.loggedDays >= 6 ? 'success' : row.loggedDays >= 4 ? 'warning' : 'danger'}
                style={styles.colNum}>
                {row.loggedDays}/7
              </Text>
              <Text variant="label" style={styles.colNum}>
                {kcal(row.avgCalories)}
              </Text>
              <Text variant="label" style={styles.colNum}>
                {row.avgProtein}g
              </Text>
            </View>
          ))}
        </Card>
      </View>

    </>
  );
}

function WorkoutsTab({ clientId }: { clientId: string }) {
  const router = useRouter();
  const logs = useGetWorkoutLogsQuery({ clientId, limit: 30 });
  const [showAll, setShowAll] = useState(false);

  if (logs.isLoading) return <SkeletonCard lines={4} />;

  const all = logs.data ?? [];
  const shown = showAll ? all : all.slice(0, HISTORY_PREVIEW);

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Sessions"
        caption={all.length ? `${all.length} logged · newest first` : 'Audit trail, newest first'}
        actionLabel={all.length > HISTORY_PREVIEW ? (showAll ? 'Show less' : 'Show all') : undefined}
        onAction={() => setShowAll((v) => !v)}
      />
      {all.length === 0 ? (
        <Card>
          <EmptyState icon="barbell-outline" title="No sessions logged yet" compact />
        </Card>
      ) : (
        shown.map((log) => (
          <WorkoutLogRow
            key={log.id}
            log={log}
            onPress={() => router.push(routes.workoutLog(log.id))}
          />
        ))
      )}
    </View>
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
    <View style={styles.section}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  heroText: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  big: {
    padding: spacing.xl,
  },
  menuButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    ...elevation.card,
  },
  menuBackdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: spacing.xl,
    padding: spacing.xs,
    ...elevation.floating,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  removeSheet: {
    gap: spacing.lg,
  },
  tabs: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
  inviteCopy: {
    marginTop: spacing.xs,
  },
  foodToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  weekHead: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
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
  tableHead: {
    flexDirection: 'row',
    paddingBottom: spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  tableRowRule: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  colWeek: {
    flex: 1.2,
  },
  colNum: {
    flex: 1,
    textAlign: 'right',
  },
});
