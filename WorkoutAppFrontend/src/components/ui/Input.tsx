import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { colors, fonts, radius, spacing, typography } from '@/theme';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Message shown beneath the field; also turns the border red. */
  error?: string | null;
  /** Adds a show/hide toggle and starts obscured. */
  password?: boolean;
  inputRef?: React.RefObject<TextInput | null>;
  containerStyle?: ViewStyle;
}

/**
 * The single text field primitive. Inputs sit at `radius.sm` — the inset step —
 * so they read as recessed into the surface they sit on rather than as another
 * floating card, and the focus state is a soft indigo ring rather than a hard rule.
 */
export function Input({
  label,
  icon,
  error,
  password,
  inputRef,
  containerStyle,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={17}
            color={focused ? colors.primary : colors.textTertiary}
          />
        ) : null}

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={password && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />

        {password ? (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}>
            <Ionicons
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={17}
              color={colors.textTertiary}
            />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" tone="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  fieldFocused: {
    borderColor: colors.primarySoftBorder,
    backgroundColor: colors.primarySoft,
  },
  fieldError: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: typography.body.fontSize,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
