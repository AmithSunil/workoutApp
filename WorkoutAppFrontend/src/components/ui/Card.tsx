import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { colors, elevation, radius, spacing } from '@/theme';

export interface CardProps extends ViewProps {
  children: ReactNode;
  padded?: boolean;
  /** `flat` drops the shadow — use inside scrollable lists of many cards. */
  variant?: 'raised' | 'flat' | 'outlined';
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  children,
  padded = true,
  variant = 'raised',
  onPress,
  style,
  ...rest
}: CardProps) {
  const composed = [
    styles.base,
    padded && styles.padded,
    variant === 'raised' && elevation.card,
    variant === 'outlined' && styles.outlined,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.985} style={composed} {...rest}>
        {children}
      </PressableScale>
    );
  }

  return (
    <View style={composed} {...rest}>
      {children}
    </View>
  );
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text variant="h2">{title}</Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  outlined: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});
