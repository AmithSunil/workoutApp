import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useGetNutritionDayQuery } from '@/api/endpoints/nutritionApi';
import { useGetWorkoutLogQuery } from '@/api/endpoints/workoutsApi';
import { Skeleton, Text } from '@/components/ui';
import { rpeColor } from '@/components/workouts/RpeSlider';
import { colors, radius, spacing } from '@/theme';
import type { MessageAttachment } from '@/types/models';
import { friendlyDate } from '@/utils/date';
import { kcal, pct, volume } from '@/utils/format';

export interface AttachmentCardProps {
  attachment: MessageAttachment;
  clientId: string;
  /** Inverts the palette when the card sits inside an outgoing bubble. */
  onDark?: boolean;
}

/**
 * Contextual feedback card. A trainer's "your protein was low here" only lands
 * when the log it refers to is attached to the message itself.
 */
export function AttachmentCard({ attachment, clientId, onDark }: AttachmentCardProps) {
  if (attachment.kind === 'workout') {
    return <WorkoutAttachment logId={attachment.logId} onDark={onDark} />;
  }
  if (attachment.kind === 'nutrition') {
    return <NutritionAttachment clientId={clientId} date={attachment.date} onDark={onDark} />;
  }
  return null;
}

function Shell({
  icon,
  label,
  onDark,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onDark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, onDark && styles.cardDark]}>
      <View style={styles.head}>
        <Ionicons name={icon} size={12} color={onDark ? colors.textInverse : colors.textSecondary} />
        <Text variant="micro" color={onDark ? colors.textInverse : colors.textSecondary}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}

function WorkoutAttachment({ logId, onDark }: { logId: string; onDark?: boolean }) {
  const { data: log, isLoading } = useGetWorkoutLogQuery(logId);

  if (isLoading || !log) {
    return (
      <Shell icon="barbell-outline" label="WORKOUT LOG" onDark={onDark}>
        <Skeleton height={34} />
      </Shell>
    );
  }

  return (
    <Shell icon="barbell-outline" label="WORKOUT LOG" onDark={onDark}>
      <Text variant="label" color={onDark ? colors.textInverse : colors.text} numberOfLines={1}>
        {log.title}
      </Text>
      <View style={styles.metrics}>
        <View style={[styles.rpeChip, { backgroundColor: rpeColor(log.rpe) }]}>
          <Text variant="micro" color={colors.textInverse}>
            RPE {log.rpe}
          </Text>
        </View>
        <Text variant="micro" color={onDark ? colors.textInverse : colors.textSecondary}>
          {friendlyDate(log.date)} · {log.durationMinutes} min · {volume(log.totalVolumeKg)}
        </Text>
      </View>
    </Shell>
  );
}

function NutritionAttachment({
  clientId,
  date,
  onDark,
}: {
  clientId: string;
  date: string;
  onDark?: boolean;
}) {
  const { data: day, isLoading } = useGetNutritionDayQuery({ clientId, date });

  if (isLoading || !day) {
    return (
      <Shell icon="restaurant-outline" label="NUTRITION DAY" onDark={onDark}>
        <Skeleton height={34} />
      </Shell>
    );
  }

  const share = pct(day.consumed.calories, day.targets.calories);

  return (
    <Shell icon="restaurant-outline" label="NUTRITION DAY" onDark={onDark}>
      <Text variant="label" color={onDark ? colors.textInverse : colors.text}>
        {friendlyDate(day.date)} · {kcal(day.consumed.calories)} kcal
      </Text>
      <View style={styles.metrics}>
        <View
          style={[
            styles.rpeChip,
            { backgroundColor: share > 110 ? colors.warning : colors.success },
          ]}>
          <Text variant="micro" color={colors.textInverse}>
            {share}% of target
          </Text>
        </View>
        <Text variant="micro" color={onDark ? colors.textInverse : colors.textSecondary}>
          {Math.round(day.consumed.protein)}P · {Math.round(day.consumed.carbs)}C ·{' '}
          {Math.round(day.consumed.fat)}F
        </Text>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
    minWidth: 210,
  },
  cardDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor: 'rgba(255,255,255,0.24)',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  rpeChip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
