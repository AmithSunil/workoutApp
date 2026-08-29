import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Renders the value — e.g. seconds as "1m 30s". Defaults to the raw number. */
  format?: (value: number) => string;
  /** Tints the value, used to carry RPE's severity colour. */
  accent?: string;
  /** Disambiguates the accessibility label when several steppers share a screen. */
  contextLabel?: string;
}

/**
 * Compact −/+ control for a single prescription field.
 *
 * Steppers rather than text inputs: every value here is bounded and coarse, and
 * a coach editing six exercises should never have to dismiss a keyboard.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  accent,
  contextLabel,
}: StepperProps) {
  const suffix = contextLabel ? ` for ${contextLabel}` : '';
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={styles.container}>
      <Text variant="micro" tone="tertiary" numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.control}>
        <Pressable
          onPress={() => !atMin && onChange(Math.max(min, value - step))}
          disabled={atMin}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}${suffix}`}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Ionicons
            name="remove"
            size={14}
            color={atMin ? colors.borderStrong : colors.textSecondary}
          />
        </Pressable>

        <Text variant="bodyStrong" align="center" color={accent} style={styles.value}>
          {format ? format(value) : value}
        </Text>

        <Pressable
          onPress={() => !atMax && onChange(Math.min(max, value + step))}
          disabled={atMax}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}${suffix}`}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Ionicons
            name="add"
            size={14}
            color={atMax ? colors.borderStrong : colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    height: 36,
    paddingHorizontal: 2,
  },
  button: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
    minWidth: 34,
  },
});
