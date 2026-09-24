import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { colors, palette, radius, spacing } from '@/theme';
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
 *
 * The one ink surface on the client home — the day's single most important
 * action gets the contrast; everything around it stays light.
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
              color={done ? colors.success : colors.primaryGlow}
            />
            <Text variant="micro" color={done ? colors.success : colors.primaryGlow}>
              {done ? 'LOGGED TODAY' : `${WEEKDAY_LABEL[day.weekday].toUpperCase()} · TODAY`}
            </Text>
          </View>
          <Text variant="title" color={colors.textInverse} numberOfLines={1} style={styles.title}>
            {day.name || WEEKDAY_LABEL[day.weekday]}
          </Text>
          <Text variant="caption" color={palette.grey400}>
            {routineTitle} · {plural(day.exercises.length, 'exercise')} · {sets} sets
          </Text>
        </View>
        <View style={styles.focus}>
          <Ionicons name="barbell" size={18} color={colors.primaryGlow} />
        </View>
      </View>

      <View style={styles.preview}>
        {day.exercises.slice(0, 4).map((ex) => (
          <View key={ex.id} style={styles.pill}>
            <Text variant="micro" color={palette.grey300} numberOfLines={1}>
              {ex.name}
            </Text>
          </View>
        ))}
        {day.exercises.length > 4 ? (
          <View style={styles.pill}>
            <Text variant="micro" color={palette.grey500}>
              +{day.exercises.length - 4}
            </Text>
          </View>
        ) : null}
      </View>

      {onStart ? (
        <Button
          label={done ? "Edit today's workout" : 'Start workout'}
          size="lg"
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
    backgroundColor: colors.surfaceInk,
    padding: spacing.xl,
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
    marginTop: spacing.xs,
  },
  focus: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.grey800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  pill: {
    backgroundColor: palette.grey800,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    maxWidth: 150,
  },
  cta: {
    marginTop: spacing.xl,
  },
});
