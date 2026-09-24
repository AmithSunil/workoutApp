import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Sparkline } from '@/components/charts';
import { Avatar, Text } from '@/components/ui';
import { colors, radius, spacing, statusColor, statusLabel } from '@/theme';
import type { ClientProfile } from '@/types/models';
import { timeAgo } from '@/utils/date';
import { GOAL_LABEL } from '@/utils/goal';

export interface ClientRosterRowProps {
  client: ClientProfile;
  /** Trailing weight readings, rendered as an inline trend. */
  trend?: number[];
  onPress: () => void;
}

/**
 * One client as a list row — meant to sit inside a shared card, separated by
 * hairlines, rather than being a card of its own. Status reads from the avatar
 * dot and the coloured score; the label goes to screen readers.
 */
export function ClientRosterRow({ client, trend, onPress }: ClientRosterRowProps) {
  const status = client.compliance.status;
  const tint = statusColor(status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        client.invited
          ? `${client.name}, invite pending`
          : `${client.name}, ${statusLabel(status)}, ${client.compliance.score}% adherence`
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar
        name={client.name}
        uri={client.avatarUrl}
        size={48}
        status={client.invited ? undefined : status}
      />

      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {client.name}
        </Text>
        <View style={styles.meta}>
          <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.metaText}>
            {client.invited
              ? client.email
              : `${GOAL_LABEL[client.goal]} · ${
                  client.compliance.lastLoggedAt
                    ? `logged ${timeAgo(client.compliance.lastLoggedAt)}`
                    : 'never logged'
                }`}
          </Text>
          {!client.invited && client.compliance.streakDays > 0 ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={11} color={colors.primary} />
              <Text variant="caption" tone="tertiary">
                {client.compliance.streakDays}d
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {client.invited ? (
        <View style={styles.pending}>
          <Text variant="micro" tone="primary">
            Invited
          </Text>
        </View>
      ) : (
        <View style={styles.right}>
          <Text variant="bodyStrong" color={tint}>
            {client.compliance.score}%
          </Text>
          {trend && trend.length > 1 ? (
            <Sparkline values={trend} color={tint} width={52} height={20} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  metaText: {
    flexShrink: 1,
  },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pending: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primarySoft,
  },
});
