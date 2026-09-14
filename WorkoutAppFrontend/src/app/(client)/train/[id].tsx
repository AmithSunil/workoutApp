import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { useGetAssignmentQuery } from '@/api/endpoints/routinesApi';
import { useGetWorkoutLogsQuery, useSaveWorkoutLogMutation } from '@/api/endpoints/workoutsApi';
import { ExercisePickerSheet } from '@/components/routines';
import { ExerciseLogCard } from '@/components/workouts/ExerciseLogCard';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { CUSTOM_TRAIN_ID, routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  exerciseAdded,
  exerciseRemoved,
  notesChanged,
  setAdded,
  setRemoved,
  setToggled,
  setUpdated,
  workoutDiscarded,
  workoutResumed,
  workoutStarted,
} from '@/store/slices/workoutDraftSlice';
import { colors, radius, spacing } from '@/theme';
import type { LoggedExercise, RoutineDay } from '@/types/models';
import { TODAY, WEEKDAY_LABEL, weekdayOf } from '@/utils/date';
import { volume } from '@/utils/format';

/**
 * Active workout logging. The draft lives in Redux (not RTK Query) because sets
 * are edited constantly; only the completed log is POSTed on finish.
 *
 * The id in the route is the client's routine *assignment*, and the workout is
 * whichever day of it falls on today — there are no dated sessions, so the
 * routine is the week until the trainer changes it.
 *
 * `CUSTOM_TRAIN_ID` instead of an assignment id means the client is training
 * something else today: the same screen, seeded from an empty day they fill
 * from the exercise library. One day only by construction — only the log is
 * written, and the routine is never read, let alone changed.
 *
 * There is one workout per day. If today is already logged this screen opens
 * that log for editing instead of prescribing the day again, and saving
 * replaces it — which is why no route or button anywhere offers a second one.
 */
/** A custom workout names itself after whatever the client actually trained. */
const customTitle = (exercises: LoggedExercise[]): string => {
  const groups = exercises.filter((e) => e.sets.some((s) => s.completed)).map((e) => e.muscleGroup);
  const top = [...groups].sort(
    (a, b) => groups.filter((g) => g === b).length - groups.filter((g) => g === a).length
  )[0];
  return top ? `${top[0].toUpperCase()}${top.slice(1)} (custom)` : 'Custom workout';
};

export default function TrainScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { clientId } = useSession();

  const custom = id === CUSTOM_TRAIN_ID;
  const draft = useAppSelector((s) => s.workoutDraft);
  const { data: routine, isLoading } = useGetAssignmentQuery(id ?? '', { skip: !id || custom });
  // Seven days is plenty to find today's, and the tab has the list cached.
  const logs = useGetWorkoutLogsQuery({ clientId: clientId ?? '', limit: 7 }, { skip: !clientId });
  const todayLog = logs.data?.find((l) => l.date === TODAY);
  const editing = todayLog !== undefined;
  const [saveLog, saveState] = useSaveWorkoutLogMutation();
  const [elapsed, setElapsed] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = weekdayOf();
  const routineDay = routine?.days.find((d) => d.weekday === today) ?? null;

  // A custom workout is just an empty day for today, so it seeds, logs and
  // finishes down the same path. Its id carries the date, so tomorrow's custom
  // workout starts fresh instead of resuming today's draft.
  const day = useMemo<RoutineDay | null>(
    () =>
      custom
        ? { id: `custom-${TODAY}`, weekday: today, focus: 'full body', exercises: [] }
        : routineDay,
    [custom, today, routineDay]
  );
  const title = custom
    ? 'Custom workout'
    : routineDay?.name || `${routine?.title ?? 'Workout'} · ${WEEKDAY_LABEL[today]}`;

  // Seed the draft the first time today is opened: from the log if the day is
  // already done, otherwise from the routine day (or the empty custom one).
  useEffect(() => {
    if (!clientId || logs.isLoading) return;
    if (todayLog) {
      if (draft.logId !== todayLog.id) dispatch(workoutResumed({ log: todayLog, clientId }));
      return;
    }
    if (day && draft.dayId !== day.id) {
      dispatch(workoutStarted({ day, title, clientId, date: TODAY }));
    }
  }, [todayLog, logs.isLoading, day, title, clientId, draft.dayId, draft.logId, dispatch]);

  useEffect(() => {
    if (!draft.startedAt) return;
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (draft.startedAt ?? Date.now())) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [draft.startedAt]);

  const stats = useMemo(() => {
    const sets = draft.exercises.flatMap((e) => e.sets);
    const done = sets.filter((s) => s.completed);
    return {
      totalSets: sets.length,
      doneSets: done.length,
      volume: done.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
    };
  }, [draft.exercises]);

  const finish = () => {
    if (!clientId || (!day && !editing)) return;
    if (stats.doneSets === 0) {
      Alert.alert('Nothing logged', 'Tick at least one set before finishing this workout.');
      return;
    }
    void saveLog({
      clientId,
      title: custom && !editing ? customTitle(draft.exercises) : draft.title,
      date: TODAY,
      durationMinutes: Math.max(1, Math.round(elapsed / 60)),
      totalVolumeKg: Math.round(stats.volume),
      notes: draft.notes.trim() || undefined,
      exercises: draft.exercises.map((e) => ({
        ...e,
        sets: e.sets.filter((s) => s.completed),
      })),
    })
      .unwrap()
      .then(() => {
        dispatch(workoutDiscarded());
        router.replace(routes.client.workouts());
      })
      .catch(() => Alert.alert('Could not save', 'Something went wrong. Try again.'));
  };

  const discard = () =>
    Alert.alert('Discard workout?', 'Anything you have logged will be lost.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          dispatch(workoutDiscarded());
          router.back();
        },
      },
    ]);

  if (isLoading || logs.isLoading) {
    return (
      <Screen title="Workout" showBack tabBarPadding={false}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  // Reachable by deep link, or by leaving the app open past midnight into a
  // rest day. Nothing to log, so say so rather than opening an empty logger.
  if (!day && !editing) {
    return (
      <Screen title="Workout" showBack tabBarPadding={false}>
        <Card>
          <EmptyState
            icon="bed-outline"
            title="Rest day"
            message={`${WEEKDAY_LABEL[today]} isn't a training day in this routine.`}
            actionLabel="Train something else"
            onAction={() => router.replace(routes.client.trainCustom())}
          />
        </Card>
      </Screen>
    );
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Screen
      title={draft.title || title}
      subtitle={
        editing
          ? `Logged today · ${stats.doneSets} of ${stats.totalSets} sets`
          : `${stats.doneSets} of ${stats.totalSets} sets complete`
      }
      showBack
      tabBarPadding={false}>
      <Card style={styles.timerCard}>
        <View style={styles.timerRow}>
          <View style={styles.timerBlock}>
            <Text variant="micro" tone="tertiary">
              ELAPSED
            </Text>
            <Text variant="title" style={styles.timerValue}>
              {minutes}:{String(seconds).padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.timerDivider} />
          <View style={styles.timerBlock}>
            <Text variant="micro" tone="tertiary">
              VOLUME
            </Text>
            <Text variant="title" style={styles.timerValue}>
              {volume(stats.volume)}
            </Text>
          </View>
          <View style={styles.timerDivider} />
          <View style={styles.timerBlock}>
            <Text variant="micro" tone="tertiary">
              SETS
            </Text>
            <Text variant="title" style={styles.timerValue}>
              {stats.doneSets}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${stats.totalSets ? (stats.doneSets / stats.totalSets) * 100 : 0}%` },
            ]}
          />
        </View>
      </Card>

      {draft.exercises.length === 0 ? (
        <Card>
          <EmptyState
            icon="barbell-outline"
            title="Nothing added yet"
            message="Add the exercises you are training today — this is logged as a one-off and leaves your routine alone."
            compact
          />
        </Card>
      ) : null}

      {draft.exercises.map((exercise, index) => (
        <ExerciseLogCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          onRemove={() => dispatch(exerciseRemoved({ exerciseId: exercise.id }))}
          onChangeSet={(setId, patch) =>
            dispatch(setUpdated({ exerciseId: exercise.id, setId, patch }))
          }
          onToggleSet={(setId) => dispatch(setToggled({ exerciseId: exercise.id, setId }))}
          onAddSet={() => dispatch(setAdded({ exerciseId: exercise.id }))}
          onRemoveSet={(setId) => dispatch(setRemoved({ exerciseId: exercise.id, setId }))}
        />
      ))}

      <Button
        label="Add an exercise"
        icon="add"
        variant="secondary"
        fullWidth
        onPress={() => setPickerOpen(true)}
      />

      <SectionHeader title="Finish up" caption="Notes go to your coach" />

      <Card>
        <View style={styles.notesHeader}>
          <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
          <Text variant="label" tone="secondary">
            Session notes (optional)
          </Text>
        </View>
        <TextInput
          value={draft.notes}
          onChangeText={(t) => dispatch(notesChanged(t))}
          placeholder="Bar speed, niggles, sleep, anything your coach should know…"
          placeholderTextColor={colors.textTertiary}
          multiline
          style={styles.notes}
        />
      </Card>

      <Button
        label={editing ? 'Save changes' : 'Finish workout'}
        icon="checkmark-circle"
        fullWidth
        size="lg"
        loading={saveState.isLoading}
        onPress={finish}
      />
      <Button
        label={editing ? 'Cancel' : 'Discard'}
        variant="ghost"
        fullWidth
        onPress={editing ? () => router.back() : discard}
      />

      <ExercisePickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        addedExerciseIds={draft.exercises.map((e) => e.exerciseId)}
        title={custom ? 'Add to your workout' : 'Swap in an exercise'}
        onAdd={(exercise) =>
          dispatch(
            exerciseAdded({
              exerciseId: exercise.id,
              name: exercise.name,
              muscleGroup: exercise.muscleGroup,
            })
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  timerCard: {
    backgroundColor: colors.surface,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  timerValue: {
    letterSpacing: -0.5,
  },
  timerDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  notes: {
    minHeight: 78,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    textAlignVertical: 'top',
  },
});
