import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './Text';
import { colors, radius, spacing } from '@/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Overrides the selected background — used for traffic-light filters. */
  accent?: string;
  count?: number;
}

export function Chip({ label, selected, onPress, icon, accent, count }: ChipProps) {
  const activeColor = accent ?? colors.primary;
  const body = (
    <View
      style={[
        styles.chip,
        selected && { backgroundColor: activeColor, borderColor: activeColor },
      ]}>
      {icon ? (
        <Ionicons
          name={icon}
          size={13}
          color={selected ? colors.textInverse : colors.textSecondary}
        />
      ) : null}
      <Text variant="label" color={selected ? colors.textInverse : colors.textSecondary}>
        {label}
      </Text>
      {count !== undefined ? (
        <View style={[styles.count, selected && styles.countSelected]}>
          <Text variant="micro" color={selected ? colors.textInverse : colors.textTertiary}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  count: {
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  countSelected: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  pressed: {
    opacity: 0.7,
  },
});
