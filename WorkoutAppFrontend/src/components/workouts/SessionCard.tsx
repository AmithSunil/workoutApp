import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { WorkoutSession } from '@/types/models';
import { friendlyDate } from '@/utils/date';
import { plural } from '@/utils/format';

export interface SessionCardProps {
  session: WorkoutSession;
  onStart?: () => void;
  onPress?: () => void;
  /** Highlights the session as the one due today. */
  featured?: boolean;
}

const STATUS_META = {
  scheduled: { label: 'Scheduled', color: colors.textSecondary, icon: 'calendar-outline' },
  'in-progress': { label: 'In progress', color: colors.primary, icon: 'play-circle-outline' },
  completed: { label: 'Completed', color: colors.success, icon: 'checkmark-circle' },
  missed: { label: 'Missed', color: colors.danger, icon: 'alert-circle-outline' },
} as const;

export function SessionCard({ session, onStart, onPress, featured }: SessionCardProps) {
  const meta = STATUS_META[session.status];
  const totalSets = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);

  return (
    <Card onPress={onPress} style={featured ? styles.featured : undefined}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.statusRow}>
            <Ionicons name={meta.icon} size={12} color={meta.color} />
            <Text variant="micro" color={meta.color}>
              {meta.label.toUpperCase()} · {friendlyDate(session.scheduledFor).toUpperCase()}
            </Text>
          </View>
          <Text variant="h1" numberOfLines={1} style={styles.title}>
            {session.title}
          </Text>
          <Text variant="caption" tone="secondary">
            {plural(session.exercises.length, 'exercise')} · {totalSets} sets ·{' '}
            {session.estimatedMinutes} min
          </Text>
        </View>
        <View style={styles.focus}>
          <Ionicons name="barbell-outline" size={17} color={colors.primary} />
        </View>
      </View>

      <View style={styles.preview}>
        {session.exercises.slice(0, 4).map((ex) => (
          <View key={ex.id} style={styles.pill}>
            <Text variant="micro" tone="secondary" numberOfLines={1}>
              {ex.name}
            </Text>
          </View>
        ))}
        {session.exercises.length > 4 ? (
          <View style={styles.pill}>
            <Text variant="micro" tone="tertiary">
              +{session.exercises.length - 4}
            </Text>
          </View>
        ) : null}
      </View>

      {onStart && session.status !== 'completed' ? (
        <Button
          label={session.status === 'in-progress' ? 'Resume session' : 'Start session'}
          icon="play"
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
