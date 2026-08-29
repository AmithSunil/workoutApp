import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { useGetNutritionDayQuery } from '@/api/endpoints/nutritionApi';
import { useGetBodyMetricsQuery, useGetHabitsQuery, useToggleHabitMutation } from '@/api/endpoints/progressApi';
import { useGetWorkoutLogsQuery, useGetWorkoutSessionsQuery } from '@/api/endpoints/workoutsApi';
import { CalorieGauge, MacroBars, Sparkline } from '@/components/charts';
import { ProfileButton } from '@/components/common/ProfileButton';
import { TrainerIndicator } from '@/components/common/TrainerIndicator';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { SessionCard } from '@/components/workouts/SessionCard';
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
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import { TODAY, diffInDays, longDate } from '@/utils/date';
import { firstName, kg, signed } from '@/utils/format';

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

  const nutrition = useGetNutritionDayQuery(
    { clientId: clientId ?? '', date: TODAY },
    { skip: !clientId }
  );
  const sessions = useGetWorkoutSessionsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const logs = useGetWorkoutLogsQuery({ clientId: clientId ?? '', limit: 20 }, { skip: !clientId });
  const habits = useGetHabitsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const metrics = useGetBodyMetricsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const [toggleHabit] = useToggleHabitMutation();

  const refreshing =
    nutrition.isFetching || sessions.isFetching || habits.isFetching || metrics.isFetching;

  const refetchAll = useCallback(() => {
    void nutrition.refetch();
    void sessions.refetch();
    void logs.refetch();
    void habits.refetch();
    void metrics.refetch();
  }, [nutrition, sessions, logs, habits, metrics]);

  const todaySession = sessions.data?.find((s) => s.scheduledFor === TODAY);
  const nextSession = sessions.data?.find((s) => s.scheduledFor > TODAY);
  const weekLogs = logs.data?.filter((l) => diffInDays(TODAY, l.date) < 7) ?? [];
  const avgRpe = weekLogs.length
    ? (weekLogs.reduce((s, l) => s + l.rpe, 0) / weekLogs.length).toFixed(1)
    : '—';
  const weightSeries = (metrics.data ?? []).slice(-30).map((m) => m.weightKg);
  const latestWeight = metrics.data?.[metrics.data.length - 1];
  const weekAgo = metrics.data?.find((m) => diffInDays(TODAY, m.date) <= 7);
  const weightDelta =
    latestWeight && weekAgo ? latestWeight.weightKg - weekAgo.weightKg : 0;

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
      headerRight={<ProfileButton name={client.name} avatarUrl={client.avatarUrl} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} />}>
      {trainer ? (
        <TrainerIndicator trainer={trainer} href={routes.client.chat()} />
      ) : null}

      {/* Today's nutrition at a glance */}
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

      {/* Quick stats */}
      <View style={styles.tiles}>
        <StatTile
          label="Day streak"
          value={`${client.compliance.streakDays}`}
          icon="flame"
          tone="warning"
        />
        <StatTile
          label="Sessions / 7d"
          value={`${weekLogs.length}`}
          icon="barbell"
          tone="primary"
        />
        <StatTile
          label="Avg RPE"
          value={avgRpe}
          icon="speedometer"
          tone={Number(avgRpe) >= 8.5 ? 'danger' : 'success'}
        />
      </View>

      {/* Today's training */}
      <SectionHeader
        title="Training"
        caption={todaySession ? 'Scheduled for today' : 'Nothing scheduled today'}
        actionLabel="All workouts"
        onAction={() => router.push(routes.client.workouts())}
      />
      {todaySession ? (
        <SessionCard
          session={todaySession}
          featured
          onStart={() => router.push(routes.client.session(todaySession.id))}
        />
      ) : nextSession ? (
        <SessionCard
          session={nextSession}
          onPress={() => router.push(routes.client.workouts())}
        />
      ) : (
        <Card>
          <EmptyState
            icon="bed-outline"
            title="Rest day"
            message="No session programmed. Move a little, eat well, sleep more."
            compact
          />
        </Card>
      )}

      {/* Habits */}
      {habits.data && habits.data.length > 0 ? (
        <HabitChecklist
          habits={habits.data}
          onToggle={(habit) =>
            void toggleHabit({ id: habit.id, clientId: habit.clientId, date: TODAY })
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
