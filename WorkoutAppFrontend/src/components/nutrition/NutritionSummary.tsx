import { StyleSheet, View } from 'react-native';

import { CalorieGauge } from '@/components/charts';
import { Card, ProgressBar, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { NutritionDay } from '@/types/models';
import { grams, kcal } from '@/utils/format';

const MACROS = [
  { key: 'protein', label: 'Protein', color: colors.protein },
  { key: 'carbs', label: 'Carbs', color: colors.carbs },
  { key: 'fat', label: 'Fat', color: colors.fat },
] as const;

export interface NutritionSummaryProps {
  /** Undefined while loading — the card keeps its shape and shows a dash. */
  day?: NutritionDay;
  /** Caption under the big number; defaults to "kcal left today". */
  label?: string;
  onPress?: () => void;
}

/**
 * One number that matters (calories left), a small ring beside it, and the
 * three macros beneath. Shared by the client home and the log screen so the
 * day reads the same in both places.
 */
export function NutritionSummary({ day, label = 'kcal left today', onPress }: NutritionSummaryProps) {
  const remaining = day ? day.targets.calories - day.consumed.calories : 0;
  const over = remaining < 0;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.kcalRow}>
        <View style={styles.flex}>
          <Text variant="metricLg" color={over ? colors.warning : colors.text}>
            {day ? kcal(Math.abs(remaining)) : '—'}
          </Text>
          <Text variant="label" tone="secondary">
            {over ? 'kcal over target' : label}
          </Text>
          {day ? (
            <Text variant="caption" tone="tertiary">
              {kcal(day.consumed.calories)} eaten · {kcal(day.targets.calories)} goal
            </Text>
          ) : null}
        </View>
        {day ? (
          <CalorieGauge
            consumed={day.consumed.calories}
            target={day.targets.calories}
            size={76}
            strokeWidth={9}
            bare
          />
        ) : null}
      </View>
      {day ? (
        <View style={styles.macros}>
          {MACROS.map((m) => (
            <View key={m.key} style={styles.macro}>
              <Text variant="micro" tone="tertiary">
                {m.label.toUpperCase()}
              </Text>
              <Text variant="bodyStrong">
                {grams(day.consumed[m.key])}
                <Text variant="caption" tone="tertiary">
                  {' '}
                  / {grams(day.targets[m.key])}
                </Text>
              </Text>
              <ProgressBar
                value={day.consumed[m.key]}
                target={day.targets[m.key]}
                color={m.color}
                height={5}
              />
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  macros: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  macro: {
    flex: 1,
    gap: spacing.xs,
  },
});
