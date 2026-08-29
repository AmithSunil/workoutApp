import { useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import {
  useGetBodyMetricsQuery,
  useGetHabitsQuery,
  useGetProgressPhotosQuery,
  useLogBodyMetricMutation,
  useToggleHabitMutation,
} from '@/api/endpoints/progressApi';
import { LineChart, type LinePoint } from '@/components/charts';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { LogWeightSheet } from '@/components/progress/LogWeightSheet';
import { PhotoGallery } from '@/components/progress/PhotoGallery';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { colors, spacing } from '@/theme';
import { TODAY, diffInDays } from '@/utils/date';
import { kg, pct, signed } from '@/utils/format';

type Range = '30' | '90' | 'all';

/** Body-composition trend, photo timeline and habit consistency. */
export default function ProgressScreen() {
  const { clientId, client } = useSession();
  const [range, setRange] = useState<Range>('90');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<LinePoint | null>(null);

  const metrics = useGetBodyMetricsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const photos = useGetProgressPhotosQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const habits = useGetHabitsQuery({ clientId: clientId ?? '' }, { skip: !clientId });
  const [logWeight, logWeightState] = useLogBodyMetricMutation();
  const [toggleHabit] = useToggleHabitMutation();

  const series = useMemo<LinePoint[]>(() => {
    const all = metrics.data ?? [];
    const windowed =
      range === 'all' ? all : all.filter((m) => diffInDays(TODAY, m.date) < Number(range));
    return windowed.map((m) => ({ date: m.date, value: m.weightKg }));
  }, [metrics.data, range]);

  const latest = metrics.data?.[metrics.data.length - 1];
  const first = metrics.data?.[0];
  const totalChange = latest && first ? latest.weightKg - first.weightKg : 0;
  const toGoal = latest && client ? latest.weightKg - client.targetWeightKg : 0;
  const goalProgress =
    client && latest
      ? pct(
          Math.abs(client.startWeightKg - latest.weightKg),
          Math.abs(client.startWeightKg - client.targetWeightKg)
        )
      : 0;

  return (
    <>
      <Screen
        title="Progress"
        subtitle="Trends, photos and consistency"
        refreshControl={
          <RefreshControl
            refreshing={metrics.isFetching}
            onRefresh={() => void metrics.refetch()}
          />
        }>
        {metrics.isLoading || !client ? (
          <SkeletonCard lines={5} />
        ) : (
          <Card>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text variant="micro" tone="tertiary">
                  {selected ? 'SELECTED' : 'CURRENT WEIGHT'}
                </Text>
                <Text variant="display" style={styles.weight}>
                  {kg(selected?.value ?? latest?.weightKg ?? client.startWeightKg)}
                </Text>
                <Text
                  variant="caption"
                  tone={totalChange <= 0 ? 'success' : 'warning'}
                  numberOfLines={2}>
                  {signed(totalChange)} kg since start · {Math.abs(toGoal).toFixed(1)} kg to goal
                </Text>
              </View>
              <View style={styles.rangeControl}>
                <SegmentedControl<Range>
                  value={range}
                  onChange={setRange}
                  size="sm"
                  segments={[
                    { value: '30', label: '30d' },
                    { value: '90', label: '90d' },
                    { value: 'all', label: 'All' },
                  ]}
                />
              </View>
            </View>

            {series.length > 1 ? (
              <LineChart
                data={series}
                height={210}
                target={client.targetWeightKg}
                targetLabel={`Goal ${client.targetWeightKg}kg`}
                unit=" kg"
                onSelect={setSelected}
              />
            ) : (
              <EmptyState
                icon="analytics-outline"
                title="Not enough data yet"
                message="Log your weight a few more times to see a trend."
                compact
              />
            )}

            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, { backgroundColor: colors.primary }]} />
                <Text variant="micro" tone="tertiary">
                  Daily
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendLine, styles.legendDashed]} />
                <Text variant="micro" tone="tertiary">
                  7-day average
                </Text>
              </View>
              <Text variant="micro" tone="tertiary">
                Touch and drag the chart
              </Text>
            </View>

            <View style={styles.goalRow}>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${Math.min(goalProgress, 100)}%` }]} />
              </View>
              <Text variant="label" tone="secondary">
                {Math.min(goalProgress, 100)}%
              </Text>
            </View>

            <Button
              label="Log today's weight"
              icon="add"
              variant="ghost"
              fullWidth
              onPress={() => setSheetOpen(true)}
              style={styles.cta}
            />
          </Card>
        )}

        <SectionHeader title="Photos" caption="Compare like-for-like every two weeks" />
        {photos.isLoading ? (
          <SkeletonCard lines={2} />
        ) : (photos.data ?? []).length > 0 ? (
          <PhotoGallery photos={photos.data ?? []} onAdd={() => undefined} />
        ) : (
          <Card>
            <EmptyState
              icon="camera-outline"
              title="No photos yet"
              message="Same light, same pose, same time of day — that's what makes them useful."
              compact
            />
          </Card>
        )}

        <SectionHeader title="Consistency" caption="Last 7 days per habit" />
        {habits.data && habits.data.length > 0 ? (
          <HabitChecklist
            habits={habits.data}
            onToggle={(habit) =>
              void toggleHabit({ id: habit.id, clientId: habit.clientId, date: TODAY })
            }
          />
        ) : null}
      </Screen>

      <LogWeightSheet
        visible={sheetOpen}
        date={TODAY}
        initialWeightKg={latest?.weightKg ?? client?.startWeightKg ?? 75}
        busy={logWeightState.isLoading}
        onClose={() => setSheetOpen(false)}
        onSubmit={({ date, weightKg }) => {
          if (!clientId) return;
          void logWeight({ clientId, date, weightKg }).then(() => setSheetOpen(false));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  weight: {
    letterSpacing: -1,
  },
  rangeControl: {
    width: 138,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 14,
    height: 2,
    borderRadius: 1,
  },
  legendDashed: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  goalTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
