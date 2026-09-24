import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useGetNutritionDayQuery } from '@/api/endpoints/nutritionApi';
import {
  useGetBodyMetricsQuery,
  useGetHabitsQuery,
  useToggleHabitMutation,
} from '@/api/endpoints/progressApi';
import { useGetClientRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery } from '@/api/endpoints/workoutsApi';
import { CalorieGauge, MacroBars, Sparkline } from '@/components/charts';
import { TrainerIndicator } from '@/components/common/TrainerIndicator';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { WeighInPrompt } from '@/components/progress/WeighInPrompt';
import { TodayCard } from '@/components/workouts/TodayCard';
import {
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import { TODAY, WEEKDAY_LABEL, diffInDays, longDate, weekdayOf } from '@/utils/date';
import { firstName, kg, signed, volume } from '@/utils/format';

const DISCOVER = [
  {
    id: 'd1',
    title: 'Progressive overload, simply',
    caption: '4 min read · Training',
    emoji: '📈',
    tint: colors.primarySoft,
  },
  {
    id: 'd2',
    title: 'High-protein meals under 500 kcal',
    caption: '12 recipes · Nutrition',
    emoji: '🍳',
    tint: colors.successSoft,
  },
  {
    id: 'd3',
    title: 'Deload weeks: when and why',
    caption: '6 min read · Recovery',
    emoji: '🧘',
    tint: colors.warningSoft,
  },
  {
    id: 'd4',
    title: 'Sleep and body composition',
    caption: '5 min read · Habits',
    emoji: '🌙',
    tint: colors.fatSoft,
  },
];

/** Client home: everything due today, in the order the day happens. */
export default function ExploreScreen() {
  const router = useRouter();
  const { clientId, client, trainer } = useSession();
  const tracking = useTracking();

  const nutrition = useGetNutritionDayQuery(
    { clientId: clientId ?? '', date: TODAY },
    { skip: !clientId }
  );
  const routines = useGetClientRoutinesQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const logs = useGetWorkoutLogsQuery({ clientId: clientId ?? '', limit: 20 }, { skip: !clientId });
  const habits = useGetHabitsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const metrics = useGetBodyMetricsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const [toggleHabit] = useToggleHabitMutation();

  const refreshing =
    nutrition.isFetching || routines.isFetching || habits.isFetching || metrics.isFetching;

  const refetchAll = useCallback(() => {
    void nutrition.refetch();
    void routines.refetch();
    void logs.refetch();
    void habits.refetch();
    void metrics.refetch();
  }, [nutrition, routines, logs, habits, metrics]);

  // Newest assignment is the current programme; today is whichever day of it
  // matches today's weekday. No dated sessions — the routine simply repeats.
  const routine = routines.data?.[0];
  const today = weekdayOf();
  const todayDay = routine?.days.find((d) => d.weekday === today) ?? null;
  const loggedToday = logs.data?.some((l) => l.date === TODAY) ?? false;
  const weekLogs = logs.data?.filter((l) => diffInDays(TODAY, l.date) < 7) ?? [];
  const weekVolume = weekLogs.reduce((sum, l) => sum + l.totalVolumeKg, 0);
  const weightSeries = (metrics.data ?? []).slice(-30).map((m) => m.weightKg);
  const latestWeight = metrics.data?.[metrics.data.length - 1];
  const weekAgo = metrics.data?.find((m) => diffInDays(TODAY, m.date) <= 7);
  const weightDelta = latestWeight && weekAgo ? latestWeight.weightKg - weekAgo.weightKg : 0;

  if (!client) {
    return (
      <Screen title="Today">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  return (
    <Screen
      title={`Hi, ${firstName(client.name)}`}
      subtitle={longDate(TODAY)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}>
      {trainer ? <TrainerIndicator trainer={trainer} href={routes.client.chat()} /> : null}

      <WeighInPrompt clientId={client.id} startWeightKg={client.startWeightKg} />

      {/* Today's nutrition at a glance */}
      {tracking.nutrition ? (
        <Card onPress={() => router.push(routes.client.log())}>
          <View style={styles.gaugeRow}>
            {nutrition.data ? (
              <CalorieGauge
                consumed={nutrition.data.consumed.calories}
                target={nutrition.data.targets.calories}
                size={150}
                strokeWidth={13}
              />
            ) : (
              <View style={styles.gaugePlaceholder} />
            )}
            <View style={styles.gaugeSide}>
              <Text variant="micro" tone="tertiary">
                TODAY'S MACROS
              </Text>
              {nutrition.data ? (
                <MacroBars
                  consumed={nutrition.data.consumed}
                  targets={nutrition.data.targets}
                  compact
                />
              ) : null}
            </View>
          </View>
          <View style={styles.cardFooter}>
            <Text variant="label" tone="primary">
              Log a meal
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </View>
        </Card>
      ) : null}

      {/* Quick stats */}
      <View style={styles.tiles}>
        <StatTile
          label="Day streak"
          value={`${client.compliance.streakDays}`}
          icon="flame"
          tone="warning"
        />
        {tracking.workout ? (
          <>
            <StatTile
              label="Sessions / 7d"
              value={`${weekLogs.length}`}
              icon="barbell"
              tone="primary"
            />
            <StatTile
              label="Volume / 7d"
              value={volume(weekVolume)}
              icon="stats-chart"
              tone="success"
            />
          </>
        ) : null}
      </View>

      {/* Today's training */}
      {tracking.workout ? (
        <>
          <SectionHeader
            title="Training"
            caption={loggedToday ? 'Done' : todayDay ? WEEKDAY_LABEL[today] : 'Rest day'}
            actionLabel="All workouts"
            onAction={() => router.push(routes.client.workouts())}
          />
          {todayDay && routine ? (
            <TodayCard
              day={todayDay}
              routineTitle={routine.title}
              done={loggedToday}
              onStart={() => router.push(routes.client.train(routine.assignmentId))}
            />
          ) : (
            <Card>
              <EmptyState
                icon={
                  loggedToday ? 'checkmark-circle' : routine ? 'bed-outline' : 'calendar-outline'
                }
                title={loggedToday ? 'Workout logged' : routine ? 'Rest day' : 'No routine yet'}
                message={
                  loggedToday
                    ? "You've trained today. Open your workouts to review or edit it."
                    : routine
                      ? 'Nothing programmed for today. Move a little, eat well, sleep more.'
                      : 'Your coach will give you a routine — it will show up here.'
                }
                compact
              />
            </Card>
          )}
        </>
      ) : null}

      {/* Habits */}
      {habits.data && habits.data.length > 0 ? (
        <HabitChecklist
          habits={habits.data}
          onToggle={(habit) =>
            void toggleHabit({
              id: habit.id,
              clientId: habit.clientId,
              date: TODAY,
            })
          }
        />
      ) : null}

      {/* Weight trend teaser */}
      {weightSeries.length > 1 && latestWeight ? (
        <Card onPress={() => router.push(routes.client.progress())}>
          <View style={styles.weightRow}>
            <View style={styles.weightText}>
              <Text variant="micro" tone="tertiary">
                BODY WEIGHT · 30 DAYS
              </Text>
              <Text variant="title">{kg(latestWeight.weightKg)}</Text>
              <Text
                variant="caption"
                tone={weightDelta === 0 ? 'secondary' : weightDelta < 0 ? 'success' : 'warning'}>
                {signed(weightDelta)} kg this week · goal {kg(client.targetWeightKg, 0)}
              </Text>
            </View>
            <Sparkline values={weightSeries} width={110} height={46} />
          </View>
        </Card>
      ) : null}

      {/* Discovery */}
      <SectionHeader title="Explore" caption="Picked for your goal" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.discoverStrip}>
        {DISCOVER.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.discoverCard, pressed && styles.pressed]}>
            <View style={[styles.discoverIcon, { backgroundColor: item.tint }]}>
              <Text style={styles.discoverEmoji}>{item.emoji}</Text>
            </View>
            <Text variant="label" numberOfLines={2}>
              {item.title}
            </Text>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {item.caption}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  gaugePlaceholder: {
    width: 150,
    height: 150,
  },
  gaugeSide: {
    flex: 1,
    gap: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  weightText: {
    flex: 1,
    gap: 1,
  },
  discoverStrip: {
    gap: spacing.md,
    paddingVertical: 2,
  },
  discoverCard: {
    width: 168,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  discoverIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  discoverEmoji: {
    fontSize: 18,
  },
  pressed: {
    opacity: 0.75,
  },
});
