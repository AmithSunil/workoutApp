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
  ACTION_BAR_SPACE,
  ActionBar,
  Button,
  Card,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
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

  const discard = () => {
    setDraft(null);
    setError(null);
  };

  return (
    <>
      <Screen
        showBack
        tabBarPadding={false}
        contentStyle={editing ? styles.roomForBar : undefined}>
        <View style={styles.hello}>
          <Text variant="micro" tone="tertiary">
            FOR {name.toUpperCase()}
            {data.customised ? ' · CUSTOMISED' : ''}
          </Text>
          <Text variant="title" numberOfLines={2}>
            {data.title}
          </Text>
        </View>

        {editing ? (
          <View style={styles.banner}>
            <Ionicons name="create-outline" size={18} color={colors.primaryText} />
            <Text variant="caption" style={styles.flex}>
              Editing {firstName(name)}&apos;s copy. Nobody else on this routine is affected, and
              it stops following later edits to the template.
            </Text>
          </View>
        ) : (
          <>
            <Card style={styles.big}>
              <StatRow
                items={[
                  { label: 'Days / week', value: `${totals.days}` },
                  { label: 'Working sets', value: `${totals.sets}` },
                  { label: 'Avg rest', value: restLabel(avgRest) },
                ]}
              />
            </Card>

            {data.customised ? (
              <View style={[styles.banner, styles.bannerWarn]}>
                <Ionicons name="git-branch-outline" size={18} color={colors.warning} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong">Tailored for {firstName(name)}</Text>
                  <Text variant="caption" tone="secondary">
                    Changed for them — it no longer follows the library template.
                  </Text>
                </View>
                <Button
                  label="Reset"
                  variant="secondary"
                  size="sm"
                  loading={resetting}
                  onPress={() => void reset(assignmentId)}
                />
              </View>
            ) : null}

            <Button
              label={`Customise for ${firstName(name)}`}
              icon="create-outline"
              fullWidth
              onPress={() => setDraft(draftDaysFrom(data.days))}
            />
          </>
        )}

        {data.notes && !editing ? (
          <View style={styles.banner}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primaryText} />
            <Text variant="caption" style={styles.flex}>
              {data.notes}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="The week"
            caption={
              editing
                ? 'Adjust any day — the days themselves stay as the template set them'
                : 'What they see, day by day'
            }
          />
          <WeekdayStrip
            trainingDays={shown.map((day) => day.weekday)}
            active={activeWeekday}
            onPress={setActive}
          />
        </View>

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
          <View style={[styles.banner, styles.bannerDanger]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text variant="caption" tone="danger" style={styles.flex}>
              {error}
            </Text>
          </View>
        ) : null}

        {editing ? null : (
          <>
            <Button
              label="Open the template"
              icon="albums-outline"
              variant="secondary"
              fullWidth
              onPress={() => router.push(routes.trainer.routineDetail(data.routineId))}
            />
            <Text variant="caption" tone="tertiary" align="center">
              {firstName(name)} follows one routine at a time. Assigning a different one from
              their profile replaces this{data.customised ? ', customisation included' : ''}.
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

      {/* While editing, save and discard stay in reach however far down they are */}
      {editing ? (
        <ActionBar
          note={
            emptyDays.length > 0
              ? `${emptyDays.map((day) => WEEKDAY_LABEL[day.weekday]).join(', ')} ${
                  emptyDays.length === 1 ? 'has' : 'have'
                } no exercises left.`
              : null
          }>
          <Button label="Discard" variant="secondary" size="lg" onPress={discard} style={styles.barDiscard} />
          <Button
            label={`Save for ${firstName(name)}`}
            size="lg"
            disabled={!canSave}
            loading={saving}
            onPress={save}
            style={styles.flex}
          />
        </ActionBar>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hello: {
    gap: spacing.xs,
  },
  big: {
    padding: spacing.xl,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  bannerWarn: {
    backgroundColor: colors.warningSoft,
  },
  bannerDanger: {
    backgroundColor: colors.dangerSoft,
  },
  roomForBar: {
    paddingBottom: ACTION_BAR_SPACE,
  },
  barDiscard: {
    paddingHorizontal: spacing.xl,
  },
});
