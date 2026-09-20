import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  useCustomiseAssignmentMutation,
  useGetAssignmentQuery,
  useResetAssignmentMutation,
} from '@/api/endpoints/routinesApi';
import { useGetClientQuery } from '@/api/endpoints/trainerApi';
import {
  ExercisePickerSheet,
  RoutineDayEditor,
  RoutineDayView,
  WeekdayStrip,
  draftDaysFrom,
  draftFromExercise,
  routineTotals,
  toRoutineDays,
  withExercises,
  type DraftDay,
} from '@/components/routines';
import {
  Button,
  Card,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, spacing } from '@/theme';
import type { Weekday } from '@/types/models';
import { WEEKDAY_LABEL, byWeekday } from '@/utils/date';
import { firstName, plural, restLabel } from '@/utils/format';

/**
 * One client's copy of a routine.
 *
 * This is the only place a routine is tailored to a person. Saving here forks
 * the client off the template for good — their copy stops tracking library
 * edits — which is exactly what "change it for this client only" has to mean.
 *
 * The day set is fixed: a customisation adjusts the prescription and the
 * exercises within the week the template laid out, so the client and the
 * template stay comparable.
 */
export default function AssignmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const assignmentId = id ?? '';
  const assignment = useGetAssignmentQuery(assignmentId, { skip: !assignmentId });
  const client = useGetClientQuery(assignment.data?.clientId ?? '', {
    skip: !assignment.data?.clientId,
  });

  const [customise, { isLoading: saving }] = useCustomiseAssignmentMutation();
  const [reset, { isLoading: resetting }] = useResetAssignmentMutation();

  const [draft, setDraft] = useState<DraftDay[] | null>(null);
  const [active, setActive] = useState<Weekday | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const data = assignment.data;

  if (assignment.isLoading || !data) {
    return (
      <Screen title="Routine" showBack tabBarPadding={false}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </Screen>
    );
  }

  const name = client.data?.name ?? 'this client';
  const editing = draft !== null;

  const templateDays = [...data.days].sort(byWeekday);
  /** Whichever set is on screen — the saved copy, or the draft being edited. */
  const shown: Array<{ weekday: Weekday; exercises: Array<{ sets: number; restSeconds: number }> }> =
    draft ?? templateDays;

  const activeWeekday: Weekday = active ?? shown[0]?.weekday ?? 'mon';
  const draftDay = draft?.find((day) => day.weekday === activeWeekday) ?? null;
  const viewDay = templateDays.find((day) => day.weekday === activeWeekday) ?? null;

  const totals = routineTotals(shown);
  const allExercises = shown.flatMap((day) => day.exercises);
  const avgRest = Math.round(
    allExercises.reduce((sum, e) => sum + e.restSeconds, 0) / Math.max(allExercises.length, 1)
  );
  const emptyDays = editing ? (draft ?? []).filter((day) => day.exercises.length === 0) : [];
  const canSave = editing && emptyDays.length === 0 && !saving;

  const save = () => {
    if (!draft) return;
    setError(null);
    void customise({ id: assignmentId, days: toRoutineDays(draft) })
      .unwrap()
      .then(() => setDraft(null))
      .catch(() => setError('Could not save these changes. Every day needs at least one exercise.'));
  };

  return (
    <Screen
      title={data.title}
      subtitle={`For ${name}${data.customised ? ' · customised' : ''}`}
      showBack
      tabBarPadding={false}
      headerRight={
        editing ? (
          <Button label="Save" size="sm" disabled={!canSave} loading={saving} onPress={save} />
        ) : (
          <Button
            label="Customise"
            size="sm"
            variant="secondary"
            onPress={() => setDraft(draftDaysFrom(data.days))}
          />
        )
      }>
      {editing ? (
        <Card style={styles.editingCard}>
          <View style={styles.noteRow}>
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text variant="caption" tone="secondary" style={styles.noteText}>
              You are editing {firstName(name)}&apos;s copy. Nobody else on this routine is
              affected, and this copy will stop following later edits to the template.
            </Text>
          </View>
        </Card>
      ) : data.customised ? (
        <Card style={styles.customisedCard}>
          <View style={styles.noteRow}>
            <Ionicons name="git-branch-outline" size={15} color={colors.warning} />
            <View style={styles.noteText}>
              <Text variant="h2">Tailored for {firstName(name)}</Text>
              <Text variant="caption" tone="secondary">
                This copy has been changed for them and no longer follows the library template.
              </Text>
            </View>
          </View>
          <Button
            label="Reset to template"
            icon="refresh-outline"
            variant="secondary"
            size="sm"
            loading={resetting}
            style={styles.resetButton}
            onPress={() => void reset(assignmentId)}
          />
        </Card>
      ) : (
        <View style={styles.tiles}>
          <StatTile
            label="Days / week"
            value={`${totals.days}`}
            icon="calendar-outline"
            tone="primary"
          />
          <StatTile label="Working sets" value={`${totals.sets}`} icon="barbell-outline" />
          <StatTile label="Avg rest" value={restLabel(avgRest)} icon="time-outline" />
        </View>
      )}

      {data.notes && !editing ? (
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <Text variant="caption" tone="secondary" style={styles.noteText}>
              {data.notes}
            </Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader
        title="The week"
        caption={editing ? 'Adjust any day — the day set stays as the template set it' : 'What they see, day by day'}
      />
      <WeekdayStrip
        trainingDays={shown.map((day) => day.weekday)}
        active={activeWeekday}
        onPress={setActive}
      />

      {editing && draft && draftDay ? (
        <RoutineDayEditor
          key={activeWeekday}
          day={draftDay}
          onChange={(next) =>
            setDraft(draft.map((day) => (day.weekday === next.weekday ? next : day)))
          }
          onAddExercise={() => setPickerOpen(true)}
        />
      ) : editing ? null : (
        <RoutineDayView day={viewDay} weekday={activeWeekday} />
      )}

      {error ? (
        <Card style={styles.errorCard}>
          <Text variant="caption" tone="danger">
            {error}
          </Text>
        </Card>
      ) : null}

      {editing ? (
        <>
          <Button
            label="Save for this client"
            icon="checkmark"
            fullWidth
            size="lg"
            disabled={!canSave}
            loading={saving}
            onPress={save}
          />
          {emptyDays.length > 0 ? (
            <Text variant="micro" tone="tertiary" align="center">
              {emptyDays.map((day) => WEEKDAY_LABEL[day.weekday]).join(', ')}{' '}
              {emptyDays.length === 1 ? 'has' : 'have'} no exercises left.
            </Text>
          ) : null}
          <Button
            label="Discard changes"
            variant="ghost"
            fullWidth
            onPress={() => {
              setDraft(null);
              setError(null);
            }}
          />
        </>
      ) : (
        <>
          <Button
            label="Open the template"
            icon="albums-outline"
            variant="secondary"
            fullWidth
            onPress={() => router.push(routes.trainer.routineDetail(data.routineId))}
          />
          <Text variant="micro" tone="tertiary" align="center">
            {firstName(name)} follows one routine at a time. Assigning a different
            one from their profile replaces this
            {data.customised ? ', customisation included' : ''}.
          </Text>
        </>
      )}

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        addedExerciseIds={(draftDay?.exercises ?? []).map((e) => e.exerciseId)}
        title={`Add to ${WEEKDAY_LABEL[activeWeekday]}`}
        onAdd={(exercise) =>
          setDraft((prev) =>
            (prev ?? []).map((day) =>
              day.weekday === activeWeekday
                ? withExercises(day, [...day.exercises, draftFromExercise(exercise)])
                : day
            )
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.primarySoft,
  },
  editingCard: {
    backgroundColor: colors.primarySoft,
  },
  customisedCard: {
    backgroundColor: colors.warningSoft,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteText: {
    flex: 1,
    gap: 2,
  },
  resetButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  errorCard: {
    backgroundColor: colors.dangerSoft,
  },
});
