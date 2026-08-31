import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, spacing } from '@/theme';

export interface StatTileProps {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  hint?: string;
  onPress?: () => void;
}

const toneStyles = {
  default: { bg: colors.surfaceMuted, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
} as const;

/** Compact KPI used across the triage dashboard and client detail header. */
export function StatTile({ label, value, icon, tone = 'default', hint, onPress }: StatTileProps) {
  const t = toneStyles[tone];

  // `View` silently ignores a function style, which would strip the card
  // entirely — so only the pressable branch uses the callback form.
  const body = (
    <>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
          <Ionicons name={icon} size={15} color={t.fg} />
        </View>
      ) : null}
      <Text variant="metric" style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text variant="micro" color={t.fg} numberOfLines={1} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }

  return <View style={styles.tile}>{body}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: 22,
    lineHeight: 26,
  },
  hint: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
