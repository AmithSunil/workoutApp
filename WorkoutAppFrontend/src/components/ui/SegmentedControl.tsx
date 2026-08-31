import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, elevation, radius, spacing } from '@/theme';

export interface SegmentedControlProps<T extends string> {
  segments: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

/** Inset pill switcher used for date ranges and nested trainer tabs. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.track, size === 'sm' && styles.trackSm]}>
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, active && styles.segmentActive]}>
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
    padding: 3,
    gap: 2,
  },
  trackSm: {
    padding: 2,
  },
  segment: {
    flex: 1,
    minWidth: 40,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...elevation.card,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
  },
});
