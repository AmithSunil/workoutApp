import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

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
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [composed, pressed && styles.pressed]}
        {...rest}>
        {children}
      </Pressable>
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
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.997 }],
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
