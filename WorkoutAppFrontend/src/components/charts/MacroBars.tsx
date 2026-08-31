import { StyleSheet, View } from 'react-native';

import { ProgressBar, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { MacroTargets } from '@/types/models';
import { grams, pct } from '@/utils/format';

export interface MacroBarsProps {
  consumed: MacroTargets;
  targets: MacroTargets;
  /** `compact` drops the percentage column — used inside dense trainer rows. */
  compact?: boolean;
}

const MACROS = [
  { key: 'protein', label: 'Protein', color: colors.protein },
  { key: 'carbs', label: 'Carbs', color: colors.carbs },
  { key: 'fat', label: 'Fat', color: colors.fat },
] as const;

export function MacroBars({ consumed, targets, compact }: MacroBarsProps) {
  return (
    <View style={styles.container}>
      {MACROS.map((macro) => {
        const value = consumed[macro.key];
        const target = targets[macro.key];
        return (
          <View key={macro.key} style={styles.row}>
            <View style={[styles.labelCol, compact && styles.labelColCompact]}>
              <View style={[styles.swatch, { backgroundColor: macro.color }]} />
              <Text variant="label" tone="secondary">
                {macro.label}
              </Text>
            </View>
            <View style={styles.barCol}>
              <ProgressBar value={value} target={target} color={macro.color} height={7} />
            </View>
            <View style={[styles.valueCol, compact && styles.valueColCompact]}>
              <Text variant="label" numberOfLines={1}>
                {grams(value)}
              </Text>
              {!compact ? (
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  / {grams(target)} · {pct(value, target)}%
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  labelCol: {
    width: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  barCol: {
    flex: 1,
  },
  labelColCompact: {
    width: 62,
  },
  valueCol: {
    width: 92,
    alignItems: 'flex-end',
  },
  valueColCompact: {
    width: 44,
  },
});
