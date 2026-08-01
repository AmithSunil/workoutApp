/**
 * RPESlider – Rate of Perceived Exertion slider (1-10).
 */
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, FontSizes, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

function getRpeColor(value: number): string {
  if (value <= 3) return '#16A34A';
  if (value <= 6) return '#F59E0B';
  if (value <= 8) return '#F97316';
  return '#DC2626';
}

function getRpeLabel(value: number): string {
  if (value <= 2) return 'Very Easy';
  if (value <= 4) return 'Easy';
  if (value <= 6) return 'Moderate';
  if (value <= 8) return 'Hard';
  if (value === 9) return 'Very Hard';
  return 'Max Effort';
}

export function RPESlider() {
  const theme = useTheme();
  const { state, setRpe } = useApp();
  const rpe = state.workout.rpe;

  const handlePress = useCallback(async (value: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRpe(value);
  }, [setRpe]);

  const color = getRpeColor(rpe);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={[styles.title, { color: theme.text }]}>Rate of Perceived Exertion</Text>
        <View style={[styles.valueBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.valueText, { color }]}>{rpe}/10 · {getRpeLabel(rpe)}</Text>
        </View>
      </View>

      <View style={styles.dots}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
          const isActive = n <= rpe;
          const dotColor = isActive ? getRpeColor(n) : theme.backgroundElement;
          return (
            <Pressable
              key={n}
              onPress={() => handlePress(n)}
              style={[styles.dot, { backgroundColor: dotColor, borderColor: isActive ? dotColor : theme.border }]}>
              <Text style={[styles.dotLabel, { color: isActive ? '#fff' : theme.textTertiary }]}>
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.scaleLabels}>
        <Text style={[styles.scaleLabel, { color: theme.textTertiary }]}>Easy</Text>
        <Text style={[styles.scaleLabel, { color: theme.textTertiary }]}>Max</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  valueBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
  },
  valueText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
    justifyContent: 'space-between',
  },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: MIN_TOUCH - 8,
  },
  dotLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
});
