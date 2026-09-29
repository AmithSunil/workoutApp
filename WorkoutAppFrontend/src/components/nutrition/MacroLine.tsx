import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

const MACROS = [
  { key: 'protein', label: 'protein', color: colors.protein },
  { key: 'carbs', label: 'carbs', color: colors.carbs },
  { key: 'fat', label: 'fat', color: colors.fat },
] as const;

export interface MacroLineProps {
  protein: number;
  carbs: number;
  fat: number;
  variant?: 'micro' | 'caption';
  /** Text colour; the dots keep the macro colours. */
  color?: string;
}

/**
 * "● 12g protein  ● 30g carbs  ● 5g fat" — the one way a macro split reads
 * anywhere in the app. Words, not P/C/F, and the same three colours as the
 * summary bars so the dot alone says which macro it is.
 */
export function MacroLine({ protein, carbs, fat, variant = 'micro', color = colors.textSecondary }: MacroLineProps) {
  const values = { protein, carbs, fat };
  return (
    <View style={styles.row}>
      {MACROS.map((m) => (
        <View key={m.key} style={styles.macro}>
          <View style={[styles.dot, { backgroundColor: m.color }]} />
          <Text variant={variant} color={color} style={styles.value}>
            {Math.round(values[m.key])}g {m.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: spacing.md,
    rowGap: spacing.xxs,
  },
  macro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});
