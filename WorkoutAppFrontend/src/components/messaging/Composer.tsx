import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { MessageAttachment } from '@/types/models';

export interface ComposerProps {
  onSend: (body: string, attachment?: MessageAttachment) => void;
  /** Trainer-only: opens the log picker so feedback can cite a specific session. */
  onAttach?: () => void;
  pendingAttachment?: MessageAttachment | null;
  onClearAttachment?: () => void;
  placeholder?: string;
  sending?: boolean;
}

export function Composer({
  onSend,
  onAttach,
  pendingAttachment,
  onClearAttachment,
  placeholder = 'Write a message…',
  sending,
}: ComposerProps) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const canSend = value.trim().length > 0 && !sending;

  const submit = () => {
    if (!canSend) return;
    onSend(value.trim(), pendingAttachment ?? undefined);
    setValue('');
  };

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || spacing.md }]}>
      {pendingAttachment ? (
        <View style={styles.pending}>
          <Ionicons
            name={pendingAttachment.kind === 'workout' ? 'barbell-outline' : 'restaurant-outline'}
            size={13}
            color={colors.primary}
          />
          <Text variant="micro" tone="primary" style={styles.pendingText}>
            {pendingAttachment.kind === 'workout'
              ? 'Workout log attached'
              : `Nutrition day attached`}
          </Text>
          <Pressable onPress={onClearAttachment} hitSlop={8}>
            <Ionicons name="close" size={13} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        {onAttach ? (
          <Pressable onPress={onAttach} style={styles.attach} accessibilityLabel="Attach a log">
            <Ionicons name="add" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <TextInput
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          multiline
          maxLength={1000}
        />

        <Pressable
          onPress={submit}
          disabled={!canSend}
          style={[styles.send, !canSend && styles.sendDisabled]}
          accessibilityLabel="Send message">
          <Ionicons name="arrow-up" size={18} color={colors.textOnPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  pending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  pendingText: {
    maxWidth: 200,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  attach: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 110,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.borderStrong,
  },
});
