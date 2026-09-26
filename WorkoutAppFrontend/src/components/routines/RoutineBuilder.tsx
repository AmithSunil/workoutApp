import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import {
  ACTION_BAR_SPACE,
  ActionBar,
  Avatar,
  Button,
  Card,
  EmptyState,
  PressableScale,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';
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

  const submit = () =>
    onSubmit({ title: title.trim(), notes: notes.trim() || undefined, days: toRoutineDays(days) });

  return (
    <>
      <Screen showBack tabBarPadding={false} contentStyle={styles.roomForBar}>
        {/* The name is the title — typed straight into the header */}
        <View style={styles.hello}>
          <Text variant="micro" tone="tertiary">
            {screenTitle.toUpperCase()}
            {totals.exercises
              ? ` · ${plural(totals.days, 'day')} · ${plural(totals.exercises, 'exercise')} · ${plural(totals.sets, 'set')}`
              : ''}
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Name this routine"
            placeholderTextColor={colors.textTertiary}
            style={styles.titleInput}
            accessibilityLabel="Routine name"
            returnKeyType="done"
          />
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Add a note for your clients (optional)"
            placeholderTextColor={colors.textTertiary}
            style={styles.notesInput}
            accessibilityLabel="Note for the client"
            multiline
          />
        </View>

        {notice}

        <View style={styles.section}>
          <SectionHeader title="The week" caption="Tap a day to train on it — the rest are rest days" />
          <WeekdayStrip
            trainingDays={days.map((day) => day.weekday)}
            active={active}
            onPress={pressWeekday}
            allowRestPress
          />
        </View>

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
              message="Make it a training day to start adding exercises."
              actionLabel="Train on this day"
              onAction={() => pressWeekday(active)}
              compact
            />
          </Card>
        )}

        {assignment ? (
          <View style={styles.section}>
            <SectionHeader title="Assign" caption="Optional — you can do this later" />
            <PressableScale
              onPress={() => setAssignOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose clients"
              style={styles.assignRow}>
              {assignedNames.length > 0 ? (
                <View style={styles.faces}>
                  {(assignment.selectedIds ?? []).slice(0, 3).map((id, i) => {
                    const c = assignment.clients.find((x) => x.id === id);
                    return c ? (
                      <View key={id} style={[styles.face, i > 0 && styles.faceOverlap]}>
                        <Avatar name={c.name} uri={c.avatarUrl} size={28} />
                      </View>
                    ) : null;
                  })}
                </View>
              ) : (
                <View style={styles.assignIcon}>
                  <Ionicons name="person-add" size={16} color={colors.primaryText} />
                </View>
              )}
              <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
                {assignedNames.length === 0
                  ? 'Choose clients'
                  : assignedNames.length === 1
                    ? assignedNames[0]
                    : `${assignedNames.length} clients`}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </PressableScale>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text variant="caption" tone="danger" style={styles.flex}>
              {error}
            </Text>
          </View>
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

      <ActionBar note={submitting ? null : hint}>
        <Button
          label={submitLabel}
          size="lg"
          disabled={!canSave}
          loading={submitting}
          onPress={submit}
          style={styles.flex}
        />
      </ActionBar>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  roomForBar: {
    paddingBottom: ACTION_BAR_SPACE,
  },
  hello: {
    gap: spacing.xs,
  },
  titleInput: {
    fontFamily: fonts.extrabold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  notesInput: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    height: 60,
  },
  assignIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  faceOverlap: {
    marginLeft: -spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
  },
});
