import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useGetWorkoutLogQuery } from '@/api/endpoints/workoutsApi';
import { Card, Divider, Screen, SkeletonCard, StatTile, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { longDate } from '@/utils/date';
import { plural, volume } from '@/utils/format';

/**
 * Read-only detail of a completed session. Reachable from both sides — the
 * client reviewing their history and the trainer auditing a log.
 */
export default function WorkoutLogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: log, isLoading } = useGetWorkoutLogQuery(id ?? '', { skip: !id });

  if (isLoading || !log) {
    return (
      <Screen title="Session" showBack tabBarPadding={false}>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  const totalSets = log.exercises.reduce((s, e) => s + e.sets.length, 0);
  const totalReps = log.exercises.reduce(
    (s, e) => s + e.sets.reduce((r, set) => r + set.reps, 0),
    0
  );

  return (
    <Screen title={log.title} subtitle={longDate(log.date)} showBack tabBarPadding={false}>
      <View style={styles.tiles}>
        <StatTile label="Duration" value={`${log.durationMinutes}m`} icon="time-outline" />
        <StatTile label="Volume" value={volume(log.totalVolumeKg)} icon="stats-chart" tone="primary" />
        <StatTile label="Sets" value={`${totalSets}`} icon="repeat" />
        <StatTile label="Reps" value={`${totalReps}`} icon="fitness-outline" />
      </View>

      {log.notes ? (
        <Card>
          <View style={styles.noteHeader}>
            <Ionicons name="chatbox-ellipses-outline" size={15} color={colors.textSecondary} />
            <Text variant="label" tone="secondary">
              Client note
            </Text>
          </View>
          <Text variant="body">“{log.notes}”</Text>
        </Card>
      ) : null}

      <Text variant="micro" tone="tertiary">
        {plural(log.exercises.length, 'EXERCISE').toUpperCase()}
      </Text>

      {log.exercises.map((exercise) => (
        <Card key={exercise.id} padded={false}>
          <View style={styles.exHeader}>
            <View style={styles.exText}>
              <Text variant="h2" numberOfLines={1}>
                {exercise.name}
              </Text>
              <Text variant="micro" tone="tertiary">
                {exercise.muscleGroup} · {plural(exercise.sets.length, 'set')}
              </Text>
            </View>
            <View style={styles.exVolume}>
              <Text variant="label" tone="secondary">
                {volume(exercise.sets.reduce((s, set) => s + set.weightKg * set.reps, 0))}
              </Text>
            </View>
          </View>

          {exercise.sets.map((set, i) => (
            <View key={set.id}>
              {i > 0 ? <Divider inset={spacing.lg} /> : null}
              <View style={styles.setRow}>
                <Text variant="label" tone="tertiary" style={styles.setIndex}>
                  {i + 1}
                </Text>
                <Text variant="body" style={styles.setCell}>
                  {set.weightKg > 0 ? `${set.weightKg} kg` : 'Bodyweight'}
                </Text>
                <Text variant="body" style={styles.setCell}>
                  × {set.reps}
                </Text>
                <Ionicons
                  name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={set.completed ? colors.success : colors.borderStrong}
                />
              </View>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  exText: {
    flex: 1,
  },
  exVolume: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  setIndex: {
    width: 20,
  },
  setCell: {
    flex: 1,
  },
});
