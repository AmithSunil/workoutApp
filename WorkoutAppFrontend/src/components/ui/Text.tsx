import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, fontFor, typography, type TypographyVariant } from '@/theme';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  /** Token name from the colour palette, or any raw colour string. */
  tone?: 'default' | 'secondary' | 'tertiary' | 'inverse' | 'primary' | 'success' | 'warning' | 'danger';
  color?: string;
  align?: TextStyle['textAlign'];
  weight?: TextStyle['fontWeight'];
}

const toneMap: Record<NonNullable<TextProps['tone']>, string> = {
  default: colors.text,
  secondary: colors.textSecondary,
  tertiary: colors.textTertiary,
  inverse: colors.textInverse,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

/**
 * The only text primitive in the app. Screens never import RN's `Text`
 * directly — that keeps type scale and colour usage auditable in one place.
 *
 * Custom fonts ignore `fontWeight` on native, so a `weight` prop is re-resolved
 * onto the concrete Inter file for the variant's family.
 */
export const Text = memo(function Text({
  variant = 'body',
  tone = 'default',
  color,
  align,
  weight,
  style,
  ...rest
}: TextProps) {
  const { family, ...spec } = typography[variant];

  return (
    <RNText
      style={[
        spec as unknown as TextStyle,
        { color: color ?? toneMap[tone] },
        align ? { textAlign: align } : null,
        weight ? { fontFamily: fontFor(family, weight) } : null,
        style,
      ]}
      {...rest}
    />
  );
});
