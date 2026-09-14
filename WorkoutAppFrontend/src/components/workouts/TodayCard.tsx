import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { RoutineDay } from '@/types/models';
import { WEEKDAY_LABEL } from '@/utils/date';
import { plural } from '@/utils/format';

export interface TodayCardProps {
  /** Today's day of the client's routine. */
  day: RoutineDay;
  /** The routine it comes from, shown above the day's own name. */
  routineTitle: string;
  /** Today is already logged. One workout per day, so the CTA becomes an edit. */
  done?: boolean;
  onStart?: () => void;
  onPress?: () => void;
}

/**
 * Today's training, read straight off the client's routine.
 *
 * There are no dated sessions: the routine is the week and it repeats until the
 * trainer changes it, so "today" is just the day whose weekday matches.
 */
export function TodayCard({ day, routineTitle, done, onStart, onPress }: TodayCardProps) {
  const sets = day.exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <Card onPress={onPress} style={styles.featured}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.statusRow}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'today-outline'}
              size={12}
              color={done ? colors.success : colors.primary}
            />
            <Text variant="micro" color={done ? colors.success : colors.primary}>
              {done ? 'LOGGED TODAY' : `${WEEKDAY_LABEL[day.weekday].toUpperCase()} · TODAY`}
            </Text>
          </View>
          <Text variant="h1" numberOfLines={1} style={styles.title}>
            {day.name || WEEKDAY_LABEL[day.weekday]}
          </Text>
          <Text variant="caption" tone="secondary">
            {routineTitle} · {plural(day.exercises.length, 'exercise')} · {sets} sets
          </Text>
        </View>
        <View style={styles.focus}>
          <Ionicons name="barbell-outline" size={17} color={colors.primary} />
        </View>
      </View>

      <View style={styles.preview}>
        {day.exercises.slice(0, 4).map((ex) => (
          <View key={ex.id} style={styles.pill}>
            <Text variant="micro" tone="secondary" numberOfLines={1}>
              {ex.name}
            </Text>
          </View>
        ))}
        {day.exercises.length > 4 ? (
          <View style={styles.pill}>
            <Text variant="micro" tone="tertiary">
              +{day.exercises.length - 4}
            </Text>
          </View>
        ) : null}
      </View>

      {onStart ? (
        <Button
          label={done ? "Edit today's workout" : 'Start workout'}
          icon="play"
          variant={done ? 'secondary' : 'primary'}
          fullWidth
          onPress={onStart}
          style={styles.cta}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  featured: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primarySoftBorder,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    marginTop: 2,
  },
  focus: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  pill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    maxWidth: 150,
  },
  cta: {
    marginTop: spacing.lg,
  },
});
