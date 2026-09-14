import { StyleSheet, View } from 'react-native';

import { SegmentedControl, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { TrackingMode } from '@/types/models';

const SEGMENTS: Array<{ value: TrackingMode; label: string }> = [
  { value: 'workout', label: 'Workouts' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'both', label: 'Both' },
];

const BLURB: Record<TrackingMode, string> = {
  workout: 'Sessions, routines and adherence. Your clients can still log food — you just will not see it, and no nutrition goals or flags are tracked for them.',
  nutrition: 'Intake, macros and weight. Your clients can still log workouts — you just will not see them, and no training goals or flags are tracked for them.',
  both: 'The full picture: training and intake side by side.',
};

export interface TrackingPickerProps {
  value: TrackingMode | null;
  onChange: (mode: TrackingMode) => void;
  busy?: boolean;
}

/** The one control behind the tracking choice, shared by profile and first run. */
export function TrackingPicker({ value, onChange, busy }: TrackingPickerProps) {
  return (
    <View style={styles.root}>
      <SegmentedControl<TrackingMode>
        segments={SEGMENTS}
        value={value ?? 'both'}
        onChange={(mode) => {
          if (!busy && mode !== value) onChange(mode);
        }}
      />
      <Text variant="caption" tone="secondary">
        {BLURB[value ?? 'both']}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
});
