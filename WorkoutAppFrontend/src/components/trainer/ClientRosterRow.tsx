import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts';
import { Avatar, Card, Text } from '@/components/ui';
import { colors, radius, spacing, statusColor, statusLabel } from '@/theme';
import type { ClientProfile } from '@/types/models';
import { timeAgo } from '@/utils/date';

export interface ClientRosterRowProps {
  client: ClientProfile;
  /** Trailing weight readings, rendered as an inline trend. */
  trend?: number[];
  onPress: () => void;
}

const GOAL_LABEL: Record<ClientProfile['goal'], string> = {
  cut: 'Fat loss',
  bulk: 'Muscle gain',
  recomp: 'Recomp',
  performance: 'Performance',
};

export function ClientRosterRow({ client, trend, onPress }: ClientRosterRowProps) {
  const status = client.compliance.status;
  const tint = statusColor(status);

  return (
    <Card padded={false} onPress={onPress} variant="flat" style={styles.card}>
      <View style={styles.row}>
        <Avatar name={client.name} uri={client.avatarUrl} size={44} status={status} />

        <View style={styles.text}>
          <Text variant="h2" numberOfLines={1}>
            {client.name}
          </Text>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {GOAL_LABEL[client.goal]} ·{' '}
            {client.compliance.lastLoggedAt
              ? `logged ${timeAgo(client.compliance.lastLoggedAt)}`
              : 'never logged'}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.pill, { backgroundColor: `${tint}1A` }]}>
              <Text variant="micro" color={tint}>
                {statusLabel(status)} · {client.compliance.score}%
              </Text>
            </View>
            {client.compliance.streakDays > 0 ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={10} color={colors.warning} />
                <Text variant="micro" tone="tertiary">
                  {client.compliance.streakDays}d
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.right}>
          {trend && trend.length > 1 ? (
            <Sparkline values={trend} color={tint} width={58} height={26} />
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </View>
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
  text: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 3,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
