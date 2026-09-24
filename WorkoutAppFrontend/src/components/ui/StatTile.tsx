import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
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
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        style={styles.tile}>
        {body}
      </PressableScale>
    );
  }

  return <View style={styles.tile}>{body}</View>;
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 90,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
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
});
