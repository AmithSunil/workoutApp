import { memo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

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
  return (
    <RNText
      style={[
        typography[variant] as TextStyle,
        { color: color ?? toneMap[tone] },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
      {...rest}
    />
  );
});
