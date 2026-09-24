import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { colors, radius, spacing } from '@/theme';

export interface ScreenTitleProps {
  /** Small caps line above the title — a date, a count, a context. */
  eyebrow?: string;
  title: string;
  /** One round primary action beside the title (add a client, new routine). */
  action?: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void };
}

/** The large in-content page title used by every tab screen. */
export function ScreenTitle({ eyebrow, title, action }: ScreenTitleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? (
          <Text variant="micro" tone="tertiary">
            {eyebrow.toUpperCase()}
          </Text>
        ) : null}
        <Text variant="display">{title}</Text>
      </View>
      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.action}>
          <Ionicons name={action.icon} size={20} color={colors.textOnPrimary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  action: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
