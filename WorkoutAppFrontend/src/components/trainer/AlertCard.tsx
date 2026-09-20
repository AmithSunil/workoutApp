import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { AlertKind, AlertSeverity, ClientProfile, RedFlagAlert } from '@/types/models';
import { timeAgo } from '@/utils/date';

export interface AlertCardProps {
  alert: RedFlagAlert;
  client?: ClientProfile;
  onPress?: () => void;
  onResolve?: () => void;
  onMessage?: () => void;
}

const KIND_ICON: Record<AlertKind, keyof typeof Ionicons.glyphMap> = {
  'missed-logs': 'calendar-clear-outline',
  'weight-stall': 'trending-down-outline',
  'calorie-deficit-miss': 'restaurant-outline',
  'check-in-due': 'clipboard-outline',
  'intake-complete': 'person-add-outline',
};

const SEVERITY: Record<AlertSeverity, { fg: string; bg: string; label: string }> = {
  critical: { fg: colors.danger, bg: colors.dangerSoft, label: 'CRITICAL' },
  warning: { fg: colors.warning, bg: colors.warningSoft, label: 'WARNING' },
  info: { fg: colors.primary, bg: colors.primarySoft, label: 'FYI' },
};

/** One automated red flag, with the two actions a coach actually takes next. */
export function AlertCard({ alert, client, onPress, onResolve, onMessage }: AlertCardProps) {
  const severity = SEVERITY[alert.severity];

  return (
    <Card padded={false} onPress={onPress} style={[styles.card, { borderLeftColor: severity.fg }]}>
      <View style={styles.body}>
        <View style={[styles.icon, { backgroundColor: severity.bg }]}>
          <Ionicons name={KIND_ICON[alert.kind]} size={16} color={severity.fg} />
        </View>

        <View style={styles.text}>
          <View style={styles.metaRow}>
            <Text variant="micro" color={severity.fg}>
              {severity.label}
            </Text>
            <Text variant="micro" tone="tertiary">
              · {timeAgo(alert.raisedAt)}
            </Text>
          </View>
          <Text variant="h2" numberOfLines={1}>
            {alert.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {alert.detail}
          </Text>

          {client ? (
            <View style={styles.clientRow}>
              <Avatar name={client.name} uri={client.avatarUrl} size={20} />
              <Text variant="micro" tone="secondary">
                {client.name}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {onResolve || onMessage ? (
        <View style={styles.actions}>
          {onMessage ? (
            <Pressable onPress={onMessage} style={styles.action} hitSlop={6}>
              <Ionicons name="chatbubble-outline" size={13} color={colors.primary} />
              <Text variant="label" tone="primary">
                Message
              </Text>
            </Pressable>
          ) : null}
          {onResolve ? (
            <Pressable onPress={onResolve} style={styles.action} hitSlop={6}>
              <Ionicons name="checkmark-done" size={14} color={colors.textSecondary} />
              <Text variant="label" tone="secondary">
                Dismiss
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 3,
  },
  body: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
});
