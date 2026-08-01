/**
 * Tab 3: Workouts – Asynchronous Execution / Digital Clipboard
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseCard } from '@/components/workouts/ExerciseCard';
import { RPESlider } from '@/components/workouts/RPESlider';
import {
  BottomTabInset,
  Brand,
  FontSizes,
  MaxContentWidth,
  MIN_TOUCH,
  Radius,
  Shadow,
  Spacing,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

export default function WorkoutsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, completeWorkout } = useApp();
  const { workout } = state;
  const [notesExpanded, setNotesExpanded] = useState(false);

  const handleComplete = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeWorkout();
  }, [completeWorkout]);

  const platformPadding = Platform.select({
    android: { paddingTop: insets.top },
    web: { paddingTop: Spacing.six },
    default: {},
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={{ bottom: insets.bottom + BottomTabInset + Spacing.six }}
      contentContainerStyle={[styles.contentContainer, platformPadding]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>
        {/* ── Workout Header ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={[styles.phaseBadge, { backgroundColor: Brand.primary + '1A' }]}>
              <Text style={[styles.phaseText, { color: Brand.primary }]}>💪 Today's Session</Text>
            </View>
            {workout.completed && (
              <View style={[styles.completedBadge, { backgroundColor: '#16A34A22' }]}>
                <Text style={{ color: '#16A34A', fontSize: FontSizes.sm, fontWeight: '700' }}>
                  ✓ Completed
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.workoutTitle, { color: theme.text }]}>{workout.title}</Text>
          <Text style={[styles.exerciseCount, { color: theme.textSecondary }]}>
            {workout.exercises.length} exercises
          </Text>

          {/* Trainer notes */}
          <Pressable
            onPress={() => setNotesExpanded(e => !e)}
            style={[styles.notesToggle, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Text style={[styles.notesToggleText, { color: theme.textSecondary }]}>
              📋 Trainer Notes {notesExpanded ? '↑' : '↓'}
            </Text>
          </Pressable>

          {notesExpanded && (
            <View
              style={[styles.notesCard, { backgroundColor: theme.backgroundCard, borderColor: Brand.primary + '44' }]}>
              <Text style={[styles.notesText, { color: theme.text }]}>{workout.trainerNotes}</Text>
            </View>
          )}
        </View>

        {/* ── Exercise Cards ── */}
        <View style={styles.exerciseList}>
          {workout.exercises.map((exercise) => (
            <View key={exercise.id}>
              <ExerciseCard exercise={exercise} />
            </View>
          ))}
        </View>

        {/* ── Session Finisher ── */}
        <View style={[styles.finisherCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border, ...Shadow.md }]}>
          <Text style={[styles.finisherTitle, { color: theme.text }]}>Session Complete?</Text>
          <RPESlider />

          <Pressable
            onPress={handleComplete}
            disabled={workout.completed}
            style={({ pressed }) => [
              styles.completeButton,
              {
                backgroundColor: workout.completed ? '#16A34A' : Brand.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={styles.completeButtonText}>
              {workout.completed ? '✓ Workout Logged!' : 'Complete Workout'}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.five,
    gap: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radius.full,
  },
  phaseText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  completedBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radius.full,
  },
  workoutTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
  },
  exerciseCount: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  notesToggle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  notesToggleText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  notesCard: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  notesText: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.6,
  },
  exerciseList: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.four,
  },
  finisherCard: {
    marginHorizontal: Spacing.five,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.five,
    marginBottom: Spacing.two,
  },
  finisherTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
  },
  completeButton: {
    height: MIN_TOUCH + 8,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
});
