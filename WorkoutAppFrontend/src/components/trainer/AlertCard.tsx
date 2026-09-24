import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Text } from '@/components/ui';
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
  critical: { fg: colors.danger, bg: colors.dangerSoft, label: 'Critical' },
  warning: { fg: colors.warning, bg: colors.warningSoft, label: 'Warning' },
  info: { fg: colors.primaryText, bg: colors.primarySoft, label: 'FYI' },
};

/** One automated red flag, with the two actions a coach actually takes next. */
export function AlertCard({ alert, client, onPress, onResolve, onMessage }: AlertCardProps) {
  const severity = SEVERITY[alert.severity];

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.top}>
        {client ? (
          <Avatar name={client.name} uri={client.avatarUrl} size={40} />
        ) : (
          <View style={[styles.icon, { backgroundColor: severity.bg }]}>
            <Ionicons name={KIND_ICON[alert.kind]} size={18} color={severity.fg} />
          </View>
        )}
        <View style={styles.text}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {client?.name ?? 'Client'}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: severity.fg }]} />
            <Text variant="micro" color={severity.fg}>
              {severity.label}
            </Text>
            <Text variant="micro" tone="tertiary">
              · {timeAgo(alert.raisedAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.message}>
        <Text variant="h2" numberOfLines={2}>
          {alert.title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {alert.detail}
        </Text>
      </View>

      {onResolve || onMessage ? (
        <View style={styles.actions}>
          {onResolve ? (
            <Button label="Dismiss" variant="secondary" size="sm" onPress={onResolve} />
          ) : null}
          {onMessage ? (
            <Button label="Message" variant="ghost" size="sm" icon="chatbubble-outline" onPress={onMessage} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
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
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  message: {
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
