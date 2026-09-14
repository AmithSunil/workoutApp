import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { RoutineExercise } from '@/types/models';
import { restLabel, setsAndReps } from '@/utils/format';

export interface RoutineExerciseRowProps {
  exercise: RoutineExercise;
  index: number;
}

/**
 * One prescribed exercise, read-only. The same row serves the trainer reviewing
 * a template and the client reading their assignment, so the prescription reads
 * identically on both sides — no translation step to get wrong.
 */
export function RoutineExerciseRow({ exercise, index }: RoutineExerciseRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.index}>
        <Text variant="label" tone="secondary">
          {index + 1}
        </Text>
      </View>

      <View style={styles.body}>
        <Text variant="h2" numberOfLines={2}>
          {exercise.name}
        </Text>
        <Text variant="micro" tone="tertiary">
          {exercise.muscleGroup}
        </Text>

        <View style={styles.chips}>
          <View style={[styles.chip, styles.primaryChip]}>
            <Text variant="label" tone="primary">
              {setsAndReps(exercise.sets, exercise.repMin, exercise.repMax)}
            </Text>
          </View>

          <View style={styles.chip}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text variant="micro" tone="secondary">
              {restLabel(exercise.restSeconds)} rest
            </Text>
          </View>

        </View>

        {exercise.notes ? (
          <Text variant="caption" tone="secondary" style={styles.notes}>
            {exercise.notes}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  index: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  primaryChip: {
    backgroundColor: colors.primarySoft,
  },
  notes: {
    marginTop: spacing.sm,
  },
});
