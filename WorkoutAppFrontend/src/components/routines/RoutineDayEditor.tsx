import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, Chip, EmptyState, Text } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';
import type { MuscleGroup } from '@/types/models';
import { WEEKDAY_LABEL } from '@/utils/date';
import { plural } from '@/utils/format';

import { PrescriptionEditor } from './PrescriptionEditor';
import { totalSets, withExercises, type DraftDay, type DraftExercise } from './draft';

export interface RoutineDayEditorProps {
  day: DraftDay;
  onChange: (day: DraftDay) => void;
  /** Omitted when the day set is fixed — customising a client's copy. */
  onRemove?: () => void;
  onAddExercise: () => void;
}

const FOCUS_OPTIONS: MuscleGroup[] = [
  'full body',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'conditioning',
];

/** Everything editable about one training day. */
export function RoutineDayEditor({
  day,
  onChange,
  onRemove,
  onAddExercise,
}: RoutineDayEditorProps) {
  const patchExercise = (key: string, patch: Partial<DraftExercise>) =>
    onChange({
      ...day,
      exercises: day.exercises.map((e) => (e.key === key ? { ...e, ...patch } : e)),
    });

  // Focus tracks the exercises until the coach pins one, so removing the last
  // leg movement stops the day claiming to be a leg day.
  const removeExercise = (key: string) =>
    onChange(withExercises(day, day.exercises.filter((e) => e.key !== key)));

  const move = (index: number, delta: number) => {
    const exercises = [...day.exercises];
    const [moved] = exercises.splice(index, 1);
    exercises.splice(index + delta, 0, moved);
    onChange({ ...day, exercises });
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">{WEEKDAY_LABEL[day.weekday]}</Text>
            <Text variant="caption" tone="secondary">
              {plural(day.exercises.length, 'exercise')} ·{' '}
              {plural(totalSets(day.exercises), 'set')}
            </Text>
          </View>
          {onRemove ? (
            <Button
              label="Make rest day"
              icon="moon-outline"
              variant="secondary"
              size="sm"
              onPress={onRemove}
            />
          ) : null}
        </View>

        <Text variant="label" tone="secondary" style={styles.fieldLabel}>
          Day name
        </Text>
        <TextInput
          value={day.name ?? ''}
          onChangeText={(name) => onChange({ ...day, name })}
          placeholder={`e.g. Push — defaults to "${day.focus}"`}
          placeholderTextColor={colors.textTertiary}
          style={styles.nameInput}
          accessibilityLabel={`Name for ${WEEKDAY_LABEL[day.weekday]}`}
          returnKeyType="done"
        />

        <Text variant="label" tone="secondary" style={styles.fieldLabel}>
          Focus
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.focusRow}>
          {FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={day.focus === option}
              onPress={() => onChange({ ...day, focus: option, focusPinned: true })}
            />
          ))}
        </ScrollView>

        <Text variant="label" tone="secondary" style={styles.fieldLabel}>
          Note for this day
        </Text>
        <TextInput
          value={day.notes ?? ''}
          onChangeText={(notes) => onChange({ ...day, notes })}
          placeholder="Warm up with two lighter sets before the first working set."
          placeholderTextColor={colors.textTertiary}
          style={styles.notesInput}
          accessibilityLabel={`Note for ${WEEKDAY_LABEL[day.weekday]}`}
          multiline
        />
      </Card>

      {day.exercises.length === 0 ? (
        <Card>
          <EmptyState
            icon="barbell-outline"
            title="Nothing on this day yet"
            message="Pull exercises from the library, then dial in the prescription for each one."
            actionLabel="Add exercises"
            onAction={onAddExercise}
            compact
          />
        </Card>
      ) : (
        <>
          {day.exercises.map((exercise, index) => (
            <PrescriptionEditor
              key={exercise.key}
              exercise={exercise}
              index={index}
              onChange={(patch) => patchExercise(exercise.key, patch)}
              onRemove={() => removeExercise(exercise.key)}
              onMoveUp={index > 0 ? () => move(index, -1) : undefined}
              onMoveDown={index < day.exercises.length - 1 ? () => move(index, 1) : undefined}
            />
          ))}
          <Button
            label="Add another exercise"
            icon="add"
            variant="ghost"
            fullWidth
            onPress={onAddExercise}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  fieldLabel: {
    marginTop: spacing.lg,
  },
  nameInput: {
    marginTop: spacing.xs,
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.bold,
    color: colors.text,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.border,
  },
  focusRow: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxs,
  },
  notesInput: {
    marginTop: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    fontFamily: fonts.regular,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
