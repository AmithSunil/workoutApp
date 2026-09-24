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
  ProgressBar,
  Screen,
  SectionHeader,
  SegmentedControl,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { colors, radius, spacing } from '@/theme';
import { TODAY, diffInDays, monthDay } from '@/utils/date';
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
  // Never null once onboarding is done, which `(client)/_layout` guarantees.
  const start = client?.startWeightKg ?? null;
  const goalKg = client?.targetWeightKg ?? null;
  const toGoal = latest && goalKg !== null ? latest.weightKg - goalKg : 0;
  const goalProgress =
    latest && start !== null && goalKg !== null
      ? pct(Math.abs(start - latest.weightKg), Math.abs(start - goalKg))
      : 0;

  return (
    <>
      <Screen
        refreshControl={
          <RefreshControl
            refreshing={metrics.isFetching}
            onRefresh={() => void metrics.refetch()}
          />
        }>
        <View style={styles.hello}>
          <Text variant="micro" tone="tertiary">
            YOUR PROGRESS
          </Text>
          <Text variant="display">Progress</Text>
        </View>

        {/* Weight — the number, its trend, and the one action */}
        {metrics.isLoading || !client ? (
          <SkeletonCard lines={5} />
        ) : (
          <View style={styles.section}>
            <SectionHeader title="Body weight" />
            <Card style={styles.big}>
              <View style={styles.header}>
                <View style={styles.flex}>
                  <Text variant="metricLg">
                    {kg(selected?.value ?? latest?.weightKg ?? client.startWeightKg)}
                  </Text>
                  <Text
                    variant="caption"
                    tone={selected ? 'secondary' : totalChange <= 0 ? 'success' : 'warning'}>
                    {selected
                      ? `On ${monthDay(selected.date)}`
                      : `${signed(totalChange)} kg since you started`}
                  </Text>
                </View>
              </View>

              <SegmentedControl<Range>
                value={range}
                onChange={setRange}
                size="sm"
                segments={[
                  { value: '30', label: '30 days' },
                  { value: '90', label: '90 days' },
                  { value: 'all', label: 'All time' },
                ]}
              />

              <View style={styles.chart}>
                {series.length > 1 ? (
                  <LineChart
                    data={series}
                    height={200}
                    target={goalKg ?? undefined}
                    targetLabel={goalKg === null ? undefined : `Goal ${goalKg}kg`}
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
              </View>

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
                <Text variant="micro" tone="tertiary" style={styles.legendHint}>
                  Drag to inspect
                </Text>
              </View>

              <Button
                label="Log weight"
                icon="add"
                fullWidth
                onPress={() => setSheetOpen(true)}
                style={styles.cta}
              />
            </Card>
          </View>
        )}

        {/* Goal — start, now, target on one line, and how far along */}
        {client && start !== null && goalKg !== null ? (
          <View style={styles.section}>
            <SectionHeader
              title="Goal"
              caption={`${Math.abs(toGoal).toFixed(1)} kg to go`}
            />
            <Card style={styles.big}>
              <StatRow
                items={[
                  { label: 'Start', value: kg(start) },
                  { label: 'Now', value: kg(latest?.weightKg ?? start) },
                  { label: 'Goal', value: kg(goalKg, 0) },
                ]}
              />
              <View style={styles.goalRow}>
                <View style={styles.flex}>
                  <ProgressBar value={Math.min(goalProgress, 100)} target={100} height={8} />
                </View>
                <Text variant="label">{Math.min(goalProgress, 100)}%</Text>
              </View>
            </Card>
          </View>
        ) : null}

        {/* Photos */}
        <View style={styles.section}>
          {photos.isLoading ? (
            <SkeletonCard lines={2} />
          ) : (photos.data ?? []).length > 0 ? (
            <PhotoGallery photos={photos.data ?? []} onAdd={() => undefined} limit={2} />
          ) : (
            <>
              <SectionHeader title="Photos" />
              <Card>
                <EmptyState
                  icon="camera-outline"
                  title="No photos yet"
                  message="Same light, same pose, same time of day — that's what makes them useful."
                  compact
                />
              </Card>
            </>
          )}
        </View>

        {/* Habits */}
        {habits.data && habits.data.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Habits" caption="Your last 7 days" />
            <HabitChecklist
              habits={habits.data}
              headless
              onToggle={(habit) =>
                void toggleHabit({ id: habit.id, clientId: habit.clientId, date: TODAY })
              }
            />
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  chart: {
    marginTop: spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendLine: {
    width: 14,
    height: 2,
    borderRadius: radius.pill,
  },
  legendDashed: {
    backgroundColor: colors.textTertiary,
    opacity: 0.6,
  },
  legendHint: {
    marginLeft: 'auto',
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cta: {
    marginTop: spacing.xl,
  },
});
