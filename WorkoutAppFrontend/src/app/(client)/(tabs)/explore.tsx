import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useGetNutritionDayQuery } from '@/api/endpoints/nutritionApi';
import {
  useGetBodyMetricsQuery,
  useGetHabitsQuery,
  useToggleHabitMutation,
} from '@/api/endpoints/progressApi';
import { useGetClientRoutinesQuery } from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery } from '@/api/endpoints/workoutsApi';
import { Sparkline } from '@/components/charts';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { WeighInPrompt } from '@/components/progress/WeighInPrompt';
import { TodayCard } from '@/components/workouts/TodayCard';
import {
  Card,
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
  longDate,
  startOfWeek,
  weekdayInitial,
  weekdayOf,
} from '@/utils/date';
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

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Client home: everything due today, in the order the day happens. */
export default function ExploreScreen() {
  const router = useRouter();
  const { clientId, client } = useSession();
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

  // Mon → Sun of this calendar week, marked where a workout was logged.
  const monday = startOfWeek(TODAY);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const trainedDates = new Set(logs.data?.map((l) => l.date));

  if (!client) {
    return (
      <Screen>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}>
      {/* Greeting — scrolls with the page */}
      <View style={styles.hello}>
        <View style={styles.helloText}>
          <Text variant="micro" tone="tertiary">
            {longDate(TODAY).toUpperCase()}
          </Text>
          <Text variant="display">
            {greeting()},{'\n'}
            {firstName(client.name)}
          </Text>
        </View>
      </View>

      {/* Nutrition — one number that matters, the macros beneath */}
      {tracking.nutrition ? (
        <View style={styles.section}>
          <SectionHeader
            title="Nutrition"
            actionLabel="Log a meal"
            onAction={() => router.push(routes.client.log())}
          />
          <NutritionSummary day={nutrition.data} onPress={() => router.push(routes.client.log())} />
        </View>
      ) : null}

      <WeighInPrompt clientId={client.id} startWeightKg={client.startWeightKg} />

      {/* Training — the day's one big action */}
      {tracking.workout ? (
        <View style={styles.section}>
          <SectionHeader
            title="Today's training"
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
            <Card onPress={() => router.push(routes.client.workouts())} style={styles.restRow}>
              <View style={styles.restIcon}>
                <Ionicons
                  name={
                    loggedToday ? 'checkmark' : routine ? 'moon-outline' : 'calendar-clear-outline'
                  }
                  size={20}
                  color={loggedToday ? colors.success : colors.textSecondary}
                />
              </View>
              <View style={styles.flex}>
                <Text variant="h2">
                  {loggedToday ? 'Workout logged' : routine ? 'Rest day' : 'No routine yet'}
                </Text>
                <Text variant="caption" tone="secondary">
                  {loggedToday
                    ? 'Nice work. Tap to review or edit it.'
                    : routine
                      ? 'Move a little, eat well, sleep more.'
                      : 'Your coach will send one soon.'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Card>
          )}
        </View>
      ) : null}

      {/* This week — streak, the days trained, the headline numbers */}
      <View style={styles.section}>
        <SectionHeader title="This week" />
        <Card style={styles.big}>
          <View style={styles.weekDays}>
            {week.map((date) => {
              const trained = trainedDates.has(date);
              const isToday = date === TODAY;
              return (
                <View key={date} style={styles.weekDay}>
                  <Text variant="micro" tone={isToday ? 'default' : 'tertiary'}>
                    {weekdayInitial(date)}
                  </Text>
                  <View
                    style={[
                      styles.dayDot,
                      trained && styles.dayDotDone,
                      isToday && !trained && styles.dayDotToday,
                    ]}>
                    {trained ? (
                      <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
          <StatRow
            style={styles.stats}
            items={[
              { label: 'Day streak', value: `${client.compliance.streakDays}`, icon: 'flame' },
              ...(tracking.workout
                ? [
                    { label: 'Sessions', value: `${weekLogs.length}` },
                    { label: 'Volume', value: volume(weekVolume) },
                  ]
                : []),
            ]}
          />
        </Card>
      </View>

      {/* Habits */}
      {habits.data && habits.data.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title="Habits"
            caption={`${habits.data.filter((h) => h.completedDates.includes(TODAY)).length} of ${habits.data.length} done today`}
          />
          <HabitChecklist
            habits={habits.data}
            headless
            onToggle={(habit) =>
              void toggleHabit({
                id: habit.id,
                clientId: habit.clientId,
                date: TODAY,
              })
            }
          />
        </View>
      ) : null}

      {/* Weight trend */}
      {weightSeries.length > 1 && latestWeight ? (
        <View style={styles.section}>
          <SectionHeader
            title="Body weight"
            actionLabel="Progress"
            onAction={() => router.push(routes.client.progress())}
          />
          <Card onPress={() => router.push(routes.client.progress())} style={styles.big}>
            <View style={styles.weightRow}>
              <View style={styles.flex}>
                <Text variant="metric">{kg(latestWeight.weightKg)}</Text>
                <Text
                  variant="caption"
                  tone={weightDelta === 0 ? 'secondary' : weightDelta < 0 ? 'success' : 'warning'}>
                  {signed(weightDelta)} kg this week
                </Text>
                <Text variant="caption" tone="tertiary">
                  Goal {kg(client.targetWeightKg, 0)}
                </Text>
              </View>
              <Sparkline values={weightSeries} width={132} height={56} />
            </View>
          </Card>
        </View>
      ) : null}

      {/* Discovery */}
      <View style={styles.section}>
        <SectionHeader title="For you" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.discoverStrip}>
          {DISCOVER.map((item) => (
            <PressableScale key={item.id} style={styles.discoverCard}>
              <View style={[styles.discoverArt, { backgroundColor: item.tint }]}>
                <Text style={styles.discoverEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.discoverText}>
                <Text variant="bodyStrong" numberOfLines={2}>
                  {item.title}
                </Text>
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {item.caption}
                </Text>
              </View>
            </PressableScale>
          ))}
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hello: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  helloText: {
    flex: 1,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  big: {
    padding: spacing.xl,
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
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDay: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  dayDot: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotDone: {
    backgroundColor: colors.primary,
  },
  dayDotToday: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  stats: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  bleed: {
    marginHorizontal: -spacing.xl,
  },
  discoverStrip: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xs,
  },
  discoverCard: {
    width: 208,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  discoverArt: {
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  discoverText: {
    padding: spacing.lg,
    gap: spacing.xs,
  },
});
