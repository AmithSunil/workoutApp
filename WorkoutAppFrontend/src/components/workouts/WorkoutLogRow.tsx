import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { WorkoutLog } from '@/types/models';
import { friendlyDate, monthDay } from '@/utils/date';
import { plural, volume } from '@/utils/format';

export interface WorkoutLogRowProps {
  log: WorkoutLog;
  onPress?: () => void;
}

export function WorkoutLogRow({ log, onPress }: WorkoutLogRowProps) {
  const [month, day] = monthDay(log.date).split(' ');

  return (
    <Card variant="flat" padded={false} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.date}>
          <Text variant="h2">{day}</Text>
          <Text variant="micro" tone="tertiary">
            {month.toUpperCase()}
          </Text>
        </View>

        <View style={styles.text}>
          <Text variant="h2" numberOfLines={1}>
            {log.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {friendlyDate(log.date)} · {log.durationMinutes} min · {volume(log.totalVolumeKg)}
          </Text>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {plural(log.exercises.length, 'exercise')} ·{' '}
            {log.exercises.reduce((s, e) => s + e.sets.length, 0)} sets
          </Text>
        </View>

        <View style={styles.right}>
          {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
        </View>
      </View>

      {log.notes ? (
        <View style={styles.note}>
          <Ionicons name="chatbox-ellipses-outline" size={12} color={colors.textTertiary} />
          <Text variant="micro" tone="secondary" numberOfLines={2} style={styles.noteText}>
            {log.notes}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  date: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  noteText: {
    flex: 1,
  },
});
