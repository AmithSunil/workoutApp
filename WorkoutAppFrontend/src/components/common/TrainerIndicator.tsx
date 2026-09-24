import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, PressableScale, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { TrainerProfile } from '@/types/models';

export interface TrainerIndicatorProps {
  trainer: TrainerProfile;
  /** Renders the connection state — mirrors the coach's presence in production. */
  online?: boolean;
  href?: Href;
  compact?: boolean;
}

/**
 * Persistent "your coach is watching" strip. Present on every client screen so
 * the relationship never feels like an app-only experience.
 */
export function TrainerIndicator({
  trainer,
  online = true,
  href,
  compact,
}: TrainerIndicatorProps) {
  const router = useRouter();

  if (compact) {
    return (
      <PressableScale
        onPress={href ? () => router.push(href) : undefined}
        style={styles.compact}
        accessibilityRole="button"
        accessibilityLabel={`Message your coach, ${trainer.name}`}>
        <Avatar name={trainer.name} uri={trainer.avatarUrl} size={44} />
        {online ? <View style={styles.dot} /> : null}
      </PressableScale>
    );
  }

  return (
    <PressableScale
      onPress={href ? () => router.push(href) : undefined}
      style={[styles.row]}>
      <View>
        <Avatar name={trainer.name} uri={trainer.avatarUrl} size={38} />
        {online ? <View style={styles.dot} /> : null}
      </View>
      <View style={styles.text}>
        <Text variant="micro" tone="tertiary">
          YOUR COACH
        </Text>
        <Text variant="label" numberOfLines={1}>
          {trainer.name}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  compact: {
    padding: 2,
  },
  text: {
    flex: 1,
  },
  dot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
});
