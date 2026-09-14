import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Card, Divider, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { LoggedExercise, LoggedSet } from '@/types/models';

export interface ExerciseLogCardProps {
  exercise: LoggedExercise;
  index: number;
  onChangeSet: (setId: string, patch: Partial<Pick<LoggedSet, 'reps' | 'weightKg'>>) => void;
  onToggleSet: (setId: string) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  /** Drops the whole exercise from this workout. Absent means it cannot be. */
  onRemove?: () => void;
}

/**
 * One exercise, one card. Weight and reps are directly editable and each set has
 * a large completion target — the client is using this mid-set, one-handed.
 */
export function ExerciseLogCard({
  exercise,
  index,
  onChangeSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onRemove,
}: ExerciseLogCardProps) {
  const done = exercise.sets.filter((s) => s.completed).length;
  const complete = done === exercise.sets.length;

  return (
    <Card padded={false}>
      <View style={styles.header}>
        <View style={[styles.index, complete && styles.indexDone]}>
          {complete ? (
            <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
          ) : (
            <Text variant="label" tone="secondary">
              {index + 1}
            </Text>
          )}
        </View>
        <View style={styles.headerText}>
          <Text variant="h2" numberOfLines={1}>
            {exercise.name}
          </Text>
          <Text variant="micro" tone="tertiary">
            {exercise.muscleGroup} · {done}/{exercise.sets.length} sets
          </Text>
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${exercise.name}`}
            hitSlop={10}
            style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
            <Ionicons name="close" size={15} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.columns}>
        <Text variant="micro" tone="tertiary" style={styles.colSet}>
          SET
        </Text>
        <Text variant="micro" tone="tertiary" style={styles.colField}>
          KG
        </Text>
        <Text variant="micro" tone="tertiary" style={styles.colField}>
          REPS
        </Text>
        <View style={styles.colAction} />
      </View>

      {exercise.sets.map((set, i) => (
        <View key={set.id}>
          {i > 0 ? <Divider inset={spacing.lg} /> : null}
          <View style={[styles.setRow, set.completed && styles.setRowDone]}>
            <Text variant="label" tone="secondary" style={styles.colSet}>
              {i + 1}
            </Text>

            <View style={styles.colField}>
              <TextInput
                value={set.weightKg ? String(set.weightKg) : ''}
                onChangeText={(t) => onChangeSet(set.id, { weightKg: Number(t.replace(/[^0-9.]/g, '')) || 0 })}
                keyboardType="decimal-pad"
                style={styles.field}
                placeholder="—"
                placeholderTextColor={colors.textTertiary}
                selectTextOnFocus
              />
            </View>

            <View style={styles.colField}>
              <TextInput
                value={String(set.reps)}
                onChangeText={(t) => onChangeSet(set.id, { reps: Number(t.replace(/[^0-9]/g, '')) || 0 })}
                keyboardType="number-pad"
                style={styles.field}
                selectTextOnFocus
              />
            </View>

            <View style={styles.colAction}>
              <Pressable
                onPress={() => onToggleSet(set.id)}
                hitSlop={8}
                accessibilityLabel={`Mark set ${i + 1} ${set.completed ? 'incomplete' : 'complete'}`}
                style={[styles.check, set.completed && styles.checkDone]}>
                <Ionicons
                  name="checkmark"
                  size={15}
                  color={set.completed ? colors.textOnPrimary : colors.borderStrong}
                />
              </Pressable>
              <Pressable onPress={() => onRemoveSet(set.id)} hitSlop={8}>
                <Ionicons name="remove-circle-outline" size={16} color={colors.borderStrong} />
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      <Pressable onPress={onAddSet} style={({ pressed }) => [styles.addSet, pressed && styles.pressed]}>
        <Ionicons name="add" size={15} color={colors.primary} />
        <Text variant="label" tone="primary">
          Add set
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  remove: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePressed: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexDone: {
    backgroundColor: colors.success,
  },
  headerText: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    gap: spacing.md,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  setRowDone: {
    backgroundColor: colors.successSoft,
  },
  colSet: {
    width: 24,
  },
  colField: {
    flex: 1,
  },
  colAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 62,
    justifyContent: 'flex-end',
  },
  field: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  check: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  addSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
});
