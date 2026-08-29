import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from './Text';
import { colors, motion, radius, spacing } from '@/theme';
import { ratio } from '@/utils/format';

export interface ProgressBarProps {
  value: number;
  target: number;
  color?: string;
  trackColor?: string;
  height?: number;
  label?: string;
  /** Right-hand caption, e.g. "142 / 180 g". */
  caption?: string;
  /** Marks the 100% point when the bar can exceed it. */
  showOverflow?: boolean;
}

/** Horizontal macro / compliance bar with an animated fill. */
export function ProgressBar({
  value,
  target,
  color = colors.primary,
  trackColor = colors.surfaceMuted,
  height = 8,
  label,
  caption,
  showOverflow = true,
}: ProgressBarProps) {
  const filled = ratio(value, target);
  const over = target > 0 && value > target;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(filled, { duration: motion.slow });
  }, [filled, progress]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={styles.container}>
      {(label || caption) && (
        <View style={styles.labelRow}>
          {label ? (
            <Text variant="label" tone="secondary">
              {label}
            </Text>
          ) : null}
          {caption ? (
            <Text variant="label" tone={over && showOverflow ? 'warning' : 'default'}>
              {caption}
            </Text>
          ) : null}
        </View>
      )}
      <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            fillStyle,
            styles.fill,
            { borderRadius: height / 2, backgroundColor: over && showOverflow ? colors.warning : color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.pill,
  },
  fill: {
    height: '100%',
  },
});
