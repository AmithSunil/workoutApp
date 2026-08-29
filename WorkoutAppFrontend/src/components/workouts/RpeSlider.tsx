import Slider from '@react-native-community/slider';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, palette, radius, spacing } from '@/theme';

export interface RpeSliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/** Descriptor shown under the number — RPE means nothing without the anchor text. */
export const RPE_DESCRIPTORS: Record<number, string> = {
  1: 'Barely any effort',
  2: 'Very easy',
  3: 'Easy — could go all day',
  4: 'Light, warm-up pace',
  5: 'Moderate, 5+ reps left',
  6: 'Somewhat hard, 4 reps left',
  7: 'Hard, 3 reps left',
  8: 'Very hard, 2 reps left',
  9: 'Near maximal, 1 rep left',
  10: 'Maximal — nothing left',
};

export const rpeColor = (value: number): string => {
  if (value <= 4) return palette.green500;
  if (value <= 6) return palette.teal500;
  if (value <= 8) return palette.amber500;
  return palette.red500;
};

/**
 * 1–10 Rate of Perceived Exertion. Doubles as the strain signal the trainer's
 * triage dashboard reads, so it is required before a session can be saved.
 */
export function RpeSlider({ value, onChange, disabled }: RpeSliderProps) {
  const tint = rpeColor(value);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text variant="label" tone="secondary">
            How hard was that?
          </Text>
          <Text variant="micro" tone="tertiary">
            Rate of Perceived Exertion
          </Text>
        </View>
        <View style={[styles.valueChip, { backgroundColor: tint }]}>
          <Text variant="h1" color={colors.textInverse}>
            {value}
          </Text>
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        minimumTrackTintColor={tint}
        maximumTrackTintColor={colors.surfaceMuted}
        thumbTintColor={tint}
      />

      <View style={styles.ticks}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            onPress={() => !disabled && onChange(n)}
            hitSlop={6}
            style={styles.tick}
            accessibilityLabel={`Set RPE ${n}`}>
            <Text variant="micro" tone={n === value ? 'default' : 'tertiary'}>
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={[styles.descriptor, { borderColor: tint }]}>
        <View style={[styles.descriptorDot, { backgroundColor: tint }]} />
        <Text variant="label" numberOfLines={1}>
          {RPE_DESCRIPTORS[value]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueChip: {
    minWidth: 48,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  ticks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginTop: -spacing.sm,
  },
  tick: {
    width: 20,
    alignItems: 'center',
  },
  descriptor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  descriptorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
