import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { CheckIn, ClientProfile } from '@/types/models';
import { monthDay } from '@/utils/date';
import { kcal, pct, signed } from '@/utils/format';

export interface CheckInCardProps {
  checkIn: CheckIn;
  client?: ClientProfile;
  onReview?: () => void;
  onOpenClient?: () => void;
  busy?: boolean;
}

/** Weekly check-in summary — the unit of work in a coach's review queue. */
export function CheckInCard({ checkIn, client, onReview, onOpenClient, busy }: CheckInCardProps) {
  const caloriePct = pct(checkIn.avgCalories, checkIn.targetCalories);
  const onTarget = Math.abs(caloriePct - 100) <= 8;

  return (
    <Card>
      <View style={styles.header}>
        {client ? <Avatar name={client.name} uri={client.avatarUrl} size={38} /> : null}
        <View style={styles.headerText}>
          <Text variant="h2" numberOfLines={1}>
            {client?.name ?? 'Client'}
          </Text>
          <Text variant="micro" tone="tertiary">
            Week of {monthDay(checkIn.weekOf)}
          </Text>
        </View>
        {checkIn.status === 'pending' ? (
          <View style={styles.pending}>
            <Text variant="micro" tone="warning">
              PENDING
            </Text>
          </View>
        ) : (
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        )}
      </View>

      <View style={styles.metrics}>
        <Metric
          label="Weight"
          value={`${signed(checkIn.weightChangeKg)} kg`}
          tone={checkIn.weightChangeKg === 0 ? 'secondary' : 'default'}
        />
        <Metric
          label="Avg kcal"
          value={kcal(checkIn.avgCalories)}
          hint={`${caloriePct}%`}
          tone={onTarget ? 'success' : 'warning'}
        />
        <Metric
          label="Sessions"
          value={`${checkIn.sessionsCompleted}/${checkIn.sessionsPlanned}`}
          tone={checkIn.sessionsCompleted >= checkIn.sessionsPlanned - 1 ? 'success' : 'warning'}
        />
        <Metric
          label="Avg RPE"
          value={checkIn.avgRpe ? checkIn.avgRpe.toFixed(1) : '—'}
          tone={checkIn.avgRpe >= 8.5 ? 'danger' : 'secondary'}
        />
      </View>

      {checkIn.clientNote ? (
        <View style={styles.note}>
          <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.textTertiary} />
          <Text variant="caption" tone="secondary" style={styles.noteText}>
            “{checkIn.clientNote}”
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        {onOpenClient ? (
          <Button
            label="Open client"
            variant="secondary"
            size="sm"
            onPress={onOpenClient}
            style={styles.action}
          />
        ) : null}
        {onReview && checkIn.status === 'pending' ? (
          <Button
            label="Mark reviewed"
            size="sm"
            icon="checkmark"
            loading={busy}
            onPress={onReview}
            style={styles.action}
          />
        ) : null}
      </View>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}) {
  return (
    <View style={styles.metric}>
      <Text variant="micro" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyStrong" tone={tone === 'default' ? 'default' : tone} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text variant="micro" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  pending: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  metrics: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    paddingVertical: spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  note: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  noteText: {
    flex: 1,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
});
