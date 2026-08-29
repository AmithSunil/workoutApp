import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, EmptyState, Screen, SectionHeader, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ClientProfile, RoutineDay, Weekday } from '@/types/models';
import type { RoutineDayInput } from '@/api/handlers';
import { WEEKDAY_LABEL, byWeekday } from '@/utils/date';
import { plural } from '@/utils/format';

import { AssignSheet } from './AssignSheet';
import { ExercisePickerSheet } from './ExercisePickerSheet';
import { RoutineDayEditor } from './RoutineDayEditor';
import { WeekdayStrip } from './WeekdayStrip';
import {
  draftDay,
  draftDaysFrom,
  draftFromExercise,
  routineTotals,
  toRoutineDays,
  withExercises,
  type DraftDay,
} from './draft';

export interface RoutineFormValue {
  title: string;
  notes?: string;
  days: RoutineDayInput[];
}

export interface RoutineBuilderProps {
  screenTitle: string;
  /** Seed for editing an existing routine; omit to build a new one. */
  initial?: { title: string; notes?: string; days: RoutineDay[] };
  submitLabel: string;
  submitting: boolean;
  error: string | null;
  /** Rendered under the header — used to warn about customised clients. */
  notice?: ReactNode;
  onSubmit: (value: RoutineFormValue) => void;
  /** Client picker, offered while creating so a routine can ship assigned. */
  assignment?: {
    clients: ClientProfile[];
    selectedIds: string[];
    onToggle: (clientId: string) => void;
  };
}

/**
 * Create and edit share one form.
 *
 * The draft lives in component state rather than Redux: it is a form, not
 * shared app state, and abandoning it should leave nothing behind. Only the
 * finished routine is sent.
 */
export function RoutineBuilder({
  screenTitle,
  initial,
  submitLabel,
  submitting,
  error,
  notice,
  onSubmit,
  assignment,
}: RoutineBuilderProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [days, setDays] = useState<DraftDay[]>(() =>
    initial ? draftDaysFrom(initial.days) : [draftDay('mon')]
  );
  const [active, setActive] = useState<Weekday>(() => {
    const first = initial ? [...initial.days].sort(byWeekday)[0] : undefined;
    return first?.weekday ?? 'mon';
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const activeDay = days.find((day) => day.weekday === active) ?? null;
  const totals = routineTotals(days);
  const emptyDays = days.filter((day) => day.exercises.length === 0);
  const canSave = title.trim().length > 0 && days.length > 0 && emptyDays.length === 0 && !submitting;

  const patchDay = (next: DraftDay) =>
    setDays((prev) => prev.map((day) => (day.weekday === next.weekday ? next : day)));

  const pressWeekday = (weekday: Weekday) => {
    // Tapping a rest day turns it into a training day; tapping a training day
    // just brings it into view. Removal is explicit, from inside the day.
    setDays((prev) =>
      prev.some((day) => day.weekday === weekday)
        ? prev
        : [...prev, draftDay(weekday)].sort(byWeekday)
    );
    setActive(weekday);
  };

  const removeActiveDay = () => setDays((prev) => prev.filter((day) => day.weekday !== active));

  const hint = !title.trim()
    ? 'Give the routine a name to save.'
    : days.length === 0
      ? 'Add at least one training day to save.'
      : emptyDays.length > 0
        ? `${emptyDays.map((day) => WEEKDAY_LABEL[day.weekday]).join(', ')} ${
            emptyDays.length === 1 ? 'has' : 'have'
          } no exercises yet.`
        : null;

  const assignedNames = (assignment?.selectedIds ?? [])
    .map((id) => assignment?.clients.find((c) => c.id === id)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Screen
      title={screenTitle}
      subtitle={
        totals.exercises
          ? `${plural(totals.days, 'day')} · ${plural(totals.exercises, 'exercise')} · ${plural(totals.sets, 'set')}`
          : 'Pick the training days, then fill each one'
      }
      showBack
      tabBarPadding={false}
      headerRight={
        <Button
          label="Save"
          size="sm"
          disabled={!canSave}
          loading={submitting}
          onPress={() => onSubmit({ title: title.trim(), notes: notes.trim() || undefined, days: toRoutineDays(days) })}
        />
      }>
      {notice}

      <Card>
        <Text variant="micro" tone="tertiary">
          ROUTINE NAME
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Beginner Skinny"
          placeholderTextColor={colors.textTertiary}
          style={styles.titleInput}
          accessibilityLabel="Routine name"
          returnKeyType="done"
        />

        <Text variant="micro" tone="tertiary" style={styles.fieldLabel}>
          NOTE FOR THE CLIENT (OPTIONAL)
        </Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Four training days a week. Keep the rest days genuinely restful."
          placeholderTextColor={colors.textTertiary}
          style={styles.notesInput}
          accessibilityLabel="Note for the client"
          multiline
        />
      </Card>

      <SectionHeader
        title="The week"
        caption="Tap a day to add it — untapped days are rest days"
      />
      <WeekdayStrip
        trainingDays={days.map((day) => day.weekday)}
        active={active}
        onPress={pressWeekday}
        allowRestPress
      />

      {activeDay ? (
        <RoutineDayEditor
          key={activeDay.key}
          day={activeDay}
          onChange={patchDay}
          onRemove={removeActiveDay}
          onAddExercise={() => setPickerOpen(true)}
        />
      ) : (
        <Card>
          <EmptyState
            icon="moon-outline"
            title={`${WEEKDAY_LABEL[active]} is a rest day`}
            message="Tap it above to turn it into a training day."
            actionLabel="Make it a training day"
            onAction={() => pressWeekday(active)}
            compact
          />
        </Card>
      )}

      {assignment ? (
        <>
          <SectionHeader title="Assign" caption="Optional — you can do this later" />
          <Pressable
            onPress={() => setAssignOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose clients"
            style={({ pressed }) => [styles.assignRow, pressed && styles.pressed]}>
            <Ionicons name="people-outline" size={17} color={colors.primary} />
            <Text variant="body" numberOfLines={1} style={styles.assignText}>
              {assignedNames.length === 0
                ? 'Choose clients'
                : assignedNames.length === 1
                  ? assignedNames[0]
                  : `${assignedNames.length} clients selected`}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        </>
      ) : null}

      {error ? (
        <Card style={styles.errorCard}>
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </Card>
      ) : null}

      <Button
        label={submitLabel}
        icon="checkmark"
        fullWidth
        size="lg"
        disabled={!canSave}
        loading={submitting}
        onPress={() =>
          onSubmit({ title: title.trim(), notes: notes.trim() || undefined, days: toRoutineDays(days) })
        }
      />
      {hint && !submitting ? (
        <Text variant="micro" tone="tertiary" align="center">
          {hint}
        </Text>
      ) : null}

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        addedExerciseIds={(activeDay?.exercises ?? []).map((e) => e.exerciseId)}
        title={`Add to ${WEEKDAY_LABEL[active]}`}
        onAdd={(exercise) =>
          setDays((prev) =>
            prev.map((day) =>
              day.weekday === active
                ? withExercises(day, [...day.exercises, draftFromExercise(exercise)])
                : day
            )
          )
        }
      />

      {assignment ? (
        <AssignSheet
          visible={assignOpen}
          onClose={() => setAssignOpen(false)}
          clients={assignment.clients}
          selectedIds={assignment.selectedIds}
          onToggle={assignment.onToggle}
          onConfirm={() => setAssignOpen(false)}
          confirmLabel="Done"
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleInput: {
    marginTop: spacing.xs,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    marginTop: spacing.lg,
  },
  notesInput: {
    marginTop: spacing.sm,
    minHeight: 56,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    textAlignVertical: 'top',
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  assignText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
  },
});
