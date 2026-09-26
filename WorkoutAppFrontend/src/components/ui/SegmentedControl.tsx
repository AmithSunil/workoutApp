import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from './Text';
import { colors, motion, radius, spacing } from '@/theme';

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const PAD = 3;

export interface SegmentedControlProps<T extends string> {
  segments: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/**
 * Inset pill switcher used for date ranges and nested trainer tabs. One thumb
 * slides between equal-width segments (translateX, UI thread), so the
 * selection reads as moving rather than blinking. Snaps under reduced motion.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const segWidth = trackWidth > 0 ? (trackWidth - PAD * 2) / segments.length : 0;
  const x = useSharedValue(0);
  const placed = useSharedValue(false);

  useEffect(() => {
    if (!segWidth) return;
    // First placement jumps; later changes glide.
    x.set(placed.get() ? withTiming(index * segWidth, { duration: motion.normal, easing: EASE_IN_OUT }) : index * segWidth);
    placed.set(true);
  }, [index, segWidth, x, placed]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={styles.track}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      {segWidth ? (
        <Animated.View style={[styles.thumb, { width: segWidth }, thumbStyle]} />
      ) : null}
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, size === 'sm' && styles.segmentSm]}>
            <Text
              variant={size === 'sm' ? 'micro' : 'label'}
              tone={active ? 'default' : 'secondary'}
              numberOfLines={1}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    padding: PAD,
  },
  thumb: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    boxShadow: '0 2px 10px rgba(17, 19, 24, 0.08)',
  },
  segment: {
    flex: 1,
    minWidth: 40,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSm: {
    paddingVertical: spacing.sm - 2,
  },
});
