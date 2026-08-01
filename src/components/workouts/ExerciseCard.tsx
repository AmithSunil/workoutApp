/**
 * ExerciseCard – a single exercise with video placeholder, cues, logging grid,
 * and historical context badge.
 */
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Brand, FontSizes, MIN_TOUCH, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp, type Exercise } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  const theme = useTheme();
  const { updateExerciseSet, updateEndurance } = useApp();
  const [cuesExpanded, setCuesExpanded] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundCard, borderColor: theme.border, ...Shadow.sm }]}>
      {/* ── Video Placeholder ── */}
      <View style={[styles.videoThumb, { backgroundColor: theme.backgroundElement }]}>
        <Text style={styles.videoPlay}>▶</Text>
        <View style={[styles.lastWeekBadge, { backgroundColor: theme.backgroundSelected }]}>
          <Text style={[styles.lastWeekText, { color: theme.textSecondary }]}>
            Last week: {exercise.lastWeekNote}
          </Text>
        </View>
      </View>

      {/* ── Exercise Name & Cues ── */}
      <View style={styles.nameRow}>
        <Text style={[styles.exerciseName, { color: theme.text }]}>{exercise.name}</Text>
        <Pressable onPress={() => setCuesExpanded(e => !e)} style={styles.cuesToggle}>
          <Text style={[styles.cuesToggleText, { color: Brand.primary }]}>
            {cuesExpanded ? 'Hide cues ↑' : 'View cues ↓'}
          </Text>
        </Pressable>
      </View>

      {cuesExpanded && (
        <View style={[styles.cuesContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          {exercise.cues.map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <View style={[styles.cueDot, { backgroundColor: Brand.primary }]} />
              <Text style={[styles.cueText, { color: theme.textSecondary }]}>{cue}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Logging Grid or Endurance Inputs ── */}
      {exercise.isEndurance ? (
        <View style={styles.enduranceGrid}>
          <View style={styles.enduranceField}>
            <Text style={[styles.enduranceLabel, { color: theme.textSecondary }]}>Distance (km)</Text>
            <TextInput
              style={[styles.enduranceInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={theme.textTertiary}
              value={exercise.distance}
              onChangeText={v => updateEndurance(exercise.id, 'distance', v)}
            />
          </View>
          <View style={styles.enduranceField}>
            <Text style={[styles.enduranceLabel, { color: theme.textSecondary }]}>Duration (min)</Text>
            <TextInput
              style={[styles.enduranceInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              value={exercise.duration}
              onChangeText={v => updateEndurance(exercise.id, 'duration', v)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.loggingGrid}>
          {/* Grid header */}
          <View style={[styles.gridHeader, { borderBottomColor: theme.border }]}>
            {['Set', 'Target', 'Reps', 'Weight'].map(h => (
              <Text key={h} style={[styles.gridHeaderText, { color: theme.textTertiary }]}>{h}</Text>
            ))}
          </View>
          {/* Grid rows */}
          {exercise.sets.map((set, idx) => (
            <View key={idx} style={[styles.gridRow, { borderBottomColor: theme.border }]}>
              <View style={[styles.setBadge, { backgroundColor: Brand.primary + '1A' }]}>
                <Text style={[styles.setNumber, { color: Brand.primary }]}>{set.setNumber}</Text>
              </View>
              <Text style={[styles.targetReps, { color: theme.textSecondary }]}>
                {set.targetReps}
              </Text>
              <TextInput
                style={[styles.gridInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={theme.textTertiary}
                value={set.actualReps}
                onChangeText={v => updateExerciseSet(exercise.id, idx, 'actualReps', v)}
                maxLength={3}
              />
              <TextInput
                style={[styles.gridInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={theme.textTertiary}
                value={set.weight}
                onChangeText={v => updateExerciseSet(exercise.id, idx, 'weight', v)}
                maxLength={5}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  videoThumb: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  videoPlay: {
    fontSize: 32,
    color: '#FFFFFF88',
  },
  lastWeekBadge: {
    position: 'absolute',
    bottom: Spacing.two,
    right: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  lastWeekText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  exerciseName: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    flex: 1,
  },
  cuesToggle: {
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
    paddingLeft: Spacing.three,
  },
  cuesToggleText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  cuesContainer: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  cueDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  cueText: {
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.5,
    flex: 1,
  },
  loggingGrid: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.four,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  gridHeaderText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  setBadge: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: MIN_TOUCH - 8,
    borderRadius: Radius.sm,
  },
  setNumber: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  targetReps: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSizes.base,
    fontWeight: '500',
  },
  gridInput: {
    flex: 1,
    height: MIN_TOUCH - 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  enduranceGrid: {
    flexDirection: 'row',
    gap: Spacing.four,
    padding: Spacing.four,
  },
  enduranceField: {
    flex: 1,
    gap: Spacing.two,
  },
  enduranceLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  enduranceInput: {
    height: 80,
    borderRadius: Radius.lg,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: FontSizes['2xl'],
    fontWeight: '700',
  },
});
