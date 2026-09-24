import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Weekday } from '@/types/models';
import { WEEKDAY_ABBR, WEEKDAY_LABEL, WEEK_ORDER } from '@/utils/date';

export interface WeekdayStripProps {
  /** Weekdays that have a training day. Everything else is a rest day. */
  trainingDays: Weekday[];
  active: Weekday | null;
  onPress: (weekday: Weekday) => void;
  /**
   * Builder mode: rest days are tappable and become training days. Off in the
   * read-only views, where tapping a rest day should do nothing.
   */
  allowRestPress?: boolean;
}

/**
 * The whole week, always seven columns.
 *
 * Rest days are rendered rather than omitted — "Tuesday is a rest day" is a
 * real part of a programme, and a four-day split reads as a shape at a glance
 * only if the gaps are visible.
 */
export function WeekdayStrip({
  trainingDays,
  active,
  onPress,
  allowRestPress,
}: WeekdayStripProps) {
  return (
    <View style={styles.row}>
      {WEEK_ORDER.map((weekday) => {
        const training = trainingDays.includes(weekday);
        const isActive = active === weekday;
        const pressable = training || allowRestPress;

        return (
          <Pressable
            key={weekday}
            disabled={!pressable}
            onPress={() => onPress(weekday)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: !pressable }}
            accessibilityLabel={
              training
                ? `${WEEKDAY_LABEL[weekday]} training day`
                : allowRestPress
                  ? `Add a training day on ${WEEKDAY_LABEL[weekday]}`
                  : `${WEEKDAY_LABEL[weekday]} rest day`
            }
            style={({ pressed }) => [
              styles.cell,
              training && styles.cellTraining,
              isActive && styles.cellActive,
              pressed && pressable && styles.pressed,
            ]}>
            <Text
              variant="micro"
              color={
                isActive ? colors.textOnPrimary : training ? colors.text : colors.textTertiary
              }>
              {WEEKDAY_ABBR[weekday]}
            </Text>
            <View
              style={[
                styles.marker,
                training && styles.markerTraining,
                isActive && styles.markerActive,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 58,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  cellTraining: {
    backgroundColor: colors.surface,
  },
  cellActive: {
    backgroundColor: colors.surfaceInk,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
  markerTraining: {
    backgroundColor: colors.primary,
  },
  markerActive: {
    backgroundColor: colors.primaryGlow,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
  },
});
