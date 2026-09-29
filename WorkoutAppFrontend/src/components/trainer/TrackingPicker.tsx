import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, PressableScale, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { TrackingMode } from '@/types/models';

const OPTIONS: Array<{
  value: TrackingMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  blurb: string;
}> = [
  { value: 'workout', label: 'Workouts', icon: 'barbell-outline', blurb: 'Routines, sessions and adherence. Food logs stay hidden.' },
  { value: 'nutrition', label: 'Nutrition', icon: 'nutrition-outline', blurb: 'Intake, macros and weight. Workout logs stay hidden.' },
  { value: 'both', label: 'Both', icon: 'layers-outline', blurb: 'The full picture: training and intake side by side.' },
];

const LABEL = Object.fromEntries(OPTIONS.map((o) => [o.value, o.label])) as Record<TrackingMode, string>;

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
  const selected = pending ?? value;

  const pick = (mode: TrackingMode) => {
    if (busy) return;
    if (mode === value) setPending(null);
    else if (value === null) onChange(mode);
    else setPending(mode);
  };

  return (
    <View style={styles.root} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const on = o.value === selected;
        return (
          <PressableScale
            key={o.value}
            scaleTo={0.98}
            onPress={() => pick(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: busy }}
            style={[styles.option, on && styles.optionOn]}
          >
            <View style={[styles.icon, on && styles.iconOn]}>
              <Ionicons name={o.icon} size={20} color={on ? colors.primaryText : colors.textTertiary} />
            </View>
            <View style={styles.copy}>
              <Text variant="label">
                {o.label}
                {o.value === value ? '  · current' : ''}
              </Text>
              <Text variant="caption" tone="secondary">
                {o.blurb}
              </Text>
            </View>
            <Ionicons
              name={on ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={on ? colors.primary : colors.borderStrong}
            />
          </PressableScale>
        );
      })}

      {pending && value ? (
        <View style={styles.confirm} accessibilityRole="alert">
          <Text variant="caption" tone="danger">
            Switch from {LABEL[value]} to {LABEL[pending]}? This changes what you and all your
            clients see.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              size="sm"
              style={styles.action}
              onPress={() => setPending(null)}
            />
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

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  iconOn: {
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  confirm: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
