import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';
import { restLabel } from '@/utils/format';

import { LIMITS, type DraftExercise } from './draft';
import { Stepper } from './Stepper';

export interface PrescriptionEditorProps {
  exercise: DraftExercise;
  index: number;
  onChange: (patch: Partial<DraftExercise>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

/**
 * The editable half of a routine: one card per exercise, every field a bounded
 * stepper.
 *
 * Rep min and max are kept ordered here rather than validated on save — pushing
 * min past max simply drags max along, so the coach can never build a routine
 * that reads "12–8".
 */
export function PrescriptionEditor({
  exercise,
  index,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PrescriptionEditorProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.index}>
          <Text variant="label" tone="secondary">
            {index + 1}
          </Text>
        </View>
        <View style={styles.headerText}>
          <Text variant="h2" numberOfLines={2}>
            {exercise.name}
          </Text>
          <Text variant="caption" tone="tertiary" style={styles.muscle}>
            {exercise.muscleGroup}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={onMoveUp}
            disabled={!onMoveUp}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Move ${exercise.name} up`}
            style={styles.iconButton}>
            <Ionicons
              name="chevron-up"
              size={18}
              color={onMoveUp ? colors.textSecondary : colors.borderStrong}
            />
          </Pressable>
          <Pressable
            onPress={onMoveDown}
            disabled={!onMoveDown}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Move ${exercise.name} down`}
            style={styles.iconButton}>
            <Ionicons
              name="chevron-down"
              size={18}
              color={onMoveDown ? colors.textSecondary : colors.borderStrong}
            />
          </Pressable>
          <Pressable
            onPress={onRemove}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${exercise.name}`}
            style={styles.iconButton}>
            <Ionicons name="trash-outline" size={17} color={colors.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.cell}>
          <Stepper
            label="Sets"
            value={exercise.sets}
            min={LIMITS.sets.min}
            max={LIMITS.sets.max}
            onChange={(sets) => onChange({ sets })}
            contextLabel={exercise.name}
          />
        </View>
        <View style={styles.cell}>
          <Stepper
            label="Min reps"
            value={exercise.repMin}
            min={LIMITS.reps.min}
            max={LIMITS.reps.max}
            onChange={(repMin) =>
              onChange({ repMin, repMax: Math.max(repMin, exercise.repMax) })
            }
            contextLabel={exercise.name}
          />
        </View>
        <View style={styles.cell}>
          <Stepper
            label="Max reps"
            value={exercise.repMax}
            min={LIMITS.reps.min}
            max={LIMITS.reps.max}
            onChange={(repMax) =>
              onChange({ repMax, repMin: Math.min(repMax, exercise.repMin) })
            }
            contextLabel={exercise.name}
          />
        </View>
        <View style={styles.cellWide}>
          <Stepper
            label="Rest"
            value={exercise.restSeconds}
            min={LIMITS.rest.min}
            max={LIMITS.rest.max}
            step={LIMITS.rest.step}
            format={restLabel}
            onChange={(restSeconds) => onChange({ restSeconds })}
            contextLabel={exercise.name}
          />
        </View>
      </View>

      <TextInput
        value={exercise.notes ?? ''}
        onChangeText={(notes) => onChange({ notes })}
        placeholder="Coaching cue (optional) — e.g. pause one second at the bottom"
        placeholderTextColor={colors.textTertiary}
        style={styles.notes}
        multiline
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  card: {
    padding: spacing.xl,
  },
  muscle: {
    textTransform: 'capitalize',
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  cell: {
    flexGrow: 1,
    flexBasis: 88,
  },
  cellWide: {
    flexGrow: 1,
    flexBasis: 140,
  },
  notes: {
    marginTop: spacing.md,
    minHeight: 44,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    fontFamily: fonts.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
