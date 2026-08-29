import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { useGetWorkoutSessionQuery, useSaveWorkoutLogMutation } from '@/api/endpoints/workoutsApi';
import { ExerciseLogCard } from '@/components/workouts/ExerciseLogCard';
import { RpeSlider } from '@/components/workouts/RpeSlider';
import { Button, Card, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  notesChanged,
  rpeChanged,
  setAdded,
  setRemoved,
  setToggled,
  setUpdated,
  workoutDiscarded,
  workoutStarted,
} from '@/store/slices/workoutDraftSlice';
import { colors, radius, spacing } from '@/theme';
import { TODAY } from '@/utils/date';
import { volume } from '@/utils/format';

/**
 * Active workout logging. The draft lives in Redux (not RTK Query) because sets
 * are edited constantly; only the completed log is POSTed on finish.
 */
export default function ActiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { clientId } = useSession();

  const draft = useAppSelector((s) => s.workoutDraft);
  const { data: session, isLoading } = useGetWorkoutSessionQuery(id ?? '', { skip: !id });
  const [saveLog, saveState] = useSaveWorkoutLogMutation();
  const [elapsed, setElapsed] = useState(0);

  // Seed the draft the first time this session is opened.
  useEffect(() => {
    if (session && clientId && draft.sessionId !== session.id) {
      dispatch(workoutStarted({ session, clientId, date: TODAY }));
    }
  }, [session, clientId, draft.sessionId, dispatch]);

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
    if (!clientId || !session) return;
    if (stats.doneSets === 0) {
      Alert.alert('Nothing logged', 'Tick at least one set before finishing this session.');
      return;
    }
    void saveLog({
      clientId,
      sessionId: session.id,
      title: draft.title,
      date: TODAY,
      durationMinutes: Math.max(1, Math.round(elapsed / 60)),
      rpe: draft.rpe,
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
    Alert.alert('Discard session?', 'Anything you have logged will be lost.', [
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

  if (isLoading || !session) {
    return (
      <Screen title="Session" showBack tabBarPadding={false}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Screen
      title={draft.title || session.title}
      subtitle={`${stats.doneSets} of ${stats.totalSets} sets complete`}
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

      {draft.exercises.map((exercise, index) => (
        <ExerciseLogCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          onChangeSet={(setId, patch) =>
            dispatch(setUpdated({ exerciseId: exercise.id, setId, patch }))
          }
          onToggleSet={(setId) => dispatch(setToggled({ exerciseId: exercise.id, setId }))}
          onAddSet={() => dispatch(setAdded({ exerciseId: exercise.id }))}
          onRemoveSet={(setId) => dispatch(setRemoved({ exerciseId: exercise.id, setId }))}
        />
      ))}

      <SectionHeader title="Finish up" caption="Strain and notes go to your coach" />

      <Card>
        <RpeSlider value={draft.rpe} onChange={(v) => dispatch(rpeChanged(v))} />
      </Card>

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
        label="Finish session"
        icon="checkmark-circle"
        fullWidth
        size="lg"
        loading={saveState.isLoading}
        onPress={finish}
      />
      <Button label="Discard" variant="ghost" fullWidth onPress={discard} />
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
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
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
