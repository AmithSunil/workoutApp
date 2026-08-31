import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, Divider, EmptyState, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { RoutineDay, Weekday } from '@/types/models';
import { WEEKDAY_LABEL } from '@/utils/date';
import { plural } from '@/utils/format';

import { RoutineExerciseRow } from './RoutineExerciseRow';
import { totalSets } from './draft';

export interface RoutineDayViewProps {
  /** Null renders the rest-day card for `weekday`. */
  day: RoutineDay | null;
  weekday: Weekday;
}

/** One day of a routine, read-only. Shared by the trainer and client views. */
export function RoutineDayView({ day, weekday }: RoutineDayViewProps) {
  if (!day) {
    return (
      <Card>
        <EmptyState
          icon="moon-outline"
          title={`${WEEKDAY_LABEL[weekday]} is a rest day`}
          message="Nothing prescribed. Recovery is part of the programme."
          compact
        />
      </Card>
    );
  }

  // An unnamed day falls back to its focus for the title, so the focus must
  // then drop out of the line below it rather than being printed twice.
  const named = Boolean(day.name?.trim());

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="micro" tone="primary">
            {WEEKDAY_LABEL[day.weekday].toUpperCase()}
          </Text>
          <Text
            variant="h1"
            numberOfLines={2}
            style={[styles.title, !named && styles.titleFallback]}>
            {named ? day.name : day.focus}
          </Text>
          <Text variant="caption" tone="secondary">
            {named ? `${day.focus} · ` : ''}
            {plural(day.exercises.length, 'exercise')} ·{' '}
            {plural(totalSets(day.exercises), 'set')}
          </Text>
        </View>
      </View>

      {day.notes ? (
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textSecondary} />
          <Text variant="caption" tone="secondary" style={styles.noteText}>
            {day.notes}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {day.exercises.map((exercise, index) => (
          <View key={exercise.id}>
            {index > 0 ? <Divider /> : null}
            <RoutineExerciseRow exercise={exercise} index={index} />
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    marginTop: 2,
  },
  titleFallback: {
    textTransform: 'capitalize',
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.xs,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  noteText: {
    flex: 1,
  },
  list: {
    marginTop: spacing.xs,
  },
});
