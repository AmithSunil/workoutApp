import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { colors, radius, spacing } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const bg: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surface,
  ghost: colors.primarySoft,
  danger: colors.danger,
};

const fg: Record<Variant, string> = {
  primary: colors.textOnPrimary,
  secondary: colors.text,
  ghost: colors.primaryText,
  danger: colors.textInverse,
};

/** Solid fills get a darker rim + a lit top edge; flat ones a hairline. */
const edge: Record<Variant, string> = {
  primary: colors.primaryPressed,
  secondary: colors.border,
  ghost: colors.primarySoft,
  danger: colors.dangerPressed,
};

/** Solid fills are a soft top-lit gradient rather than one flat slab. */
const gradient: Partial<Record<Variant, [string, string]>> = {
  primary: [colors.primaryTop, colors.primary],
  danger: [colors.dangerTop, colors.danger],
};

const heights: Record<Size, number> = { sm: 36, md: 46, lg: 52 };
const paddings: Record<Size, number> = { sm: spacing.md, md: spacing.lg, lg: spacing.xl };
/** Rounded rectangle, not a pill — softer than square, calmer than a capsule. */
const corners: Record<Size, number> = { sm: radius.xs, md: radius.sm, lg: radius.md };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  disabled,
  loading,
  fullWidth,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const solid = variant === 'primary' || variant === 'danger';
  // Disabled is a quiet neutral, not a washed-out brand colour.
  const muted = disabled && !loading;
  const content = muted ? colors.textTertiary : fg[variant];
  const iconSize = size === 'sm' ? 15 : 17;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: muted ? colors.surfaceMuted : bg[variant],
          borderColor: muted ? colors.surfaceMuted : edge[variant],
          height: heights[size],
          paddingHorizontal: paddings[size],
          borderRadius: corners[size],
        },
        solid && !muted && styles.lift,
        fullWidth && styles.fullWidth,
        style,
      ]}>
      {solid && !muted ? (
        <>
          {/* Own radius instead of overflow:hidden — clipping would eat the iOS shadow. */}
          <LinearGradient
            colors={gradient[variant]!}
            style={[StyleSheet.absoluteFill, { borderRadius: corners[size] - 1, pointerEvents: 'none' }]}
          />
          <View
            style={[styles.highlight, { borderRadius: corners[size], pointerEvents: 'none' }]}
          />
        </>
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={content} />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' ? (
            solid && !muted && size !== 'sm' ? (
              // On a solid fill the icon sits in its own soft chip.
              <View style={styles.iconChip}>
                <Ionicons name={icon} size={iconSize - 1} color={content} />
              </View>
            ) : (
              <Ionicons name={icon} size={iconSize} color={content} />
            )
          ) : null}
          <Text
            variant="button"
            color={content}
            numberOfLines={1}
            style={size === 'sm' ? styles.smLabel : size === 'lg' ? styles.lgLabel : undefined}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons name={icon} size={iconSize} color={content} />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  /** Tight, tinted contact shadow — sits on the surface, doesn't float. */
  lift: {
    boxShadow: '0 6px 12px rgba(194, 58, 11, 0.3)', // primaryPressed @ 30%
  },
  highlight: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: 1,
    borderColor: colors.highlight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  iconChip: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.onPrimarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  lgLabel: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
