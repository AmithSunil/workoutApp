import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, SegmentedControl, Text } from '@/components/ui';
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

/**
 * The one control behind the tracking choice, shared by profile and first run.
 * A first choice (value null) saves on tap; switching an existing choice asks
 * first, inline — Alert.alert is a no-op on web.
 */
export function TrackingPicker({ value, onChange, busy }: TrackingPickerProps) {
  const [pending, setPending] = useState<TrackingMode | null>(null);
  const shown = pending ?? value ?? 'both';

  return (
    <View style={styles.root}>
      <SegmentedControl<TrackingMode>
        segments={SEGMENTS}
        value={shown}
        onChange={(mode) => {
          if (busy) return;
          if (mode === value) setPending(null);
          else if (value === null) onChange(mode);
          else setPending(mode);
        }}
      />
      <Text variant="caption" tone="secondary">
        {BLURB[shown]}
      </Text>
      {pending ? (
        <View style={styles.confirm} accessibilityRole="alert">
          <Text variant="caption" tone="danger">
            Switch from {LABEL[value ?? 'both']} to {LABEL[pending]}? This changes what you and
            all your clients see.
          </Text>
          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" size="sm" style={styles.action} onPress={() => setPending(null)} />
            <Button
              label="Switch"
              size="sm"
              style={styles.action}
              onPress={() => {
                onChange(pending);
                setPending(null);
              }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.value, s.label])) as Record<TrackingMode, string>;

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  confirm: {
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
