import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from './Text';
import { colors, elevation, radius, spacing } from '@/theme';

/** Height to reserve under scrolling content so the bar never covers it. */
export const ACTION_BAR_SPACE = 140;

export interface ActionBarProps {
  children: ReactNode;
  /** One line above the buttons — why Save is disabled, what is missing. */
  note?: string | null;
}

/**
 * The commit bar pinned to the bottom of an editing screen. Save stays in
 * reach however long the form gets; pair it with `contentStyle={{ paddingBottom:
 * ACTION_BAR_SPACE }}` on the Screen. Render it as a sibling after `<Screen>`.
 */
export function ActionBar({ children, note }: ActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.md }]}>
      {note ? (
        <Text variant="caption" tone="warning" align="center">
          {note}
        </Text>
      ) : null}
      <View style={styles.buttons}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...elevation.floating,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
