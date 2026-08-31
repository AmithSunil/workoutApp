import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useGetRolesQuery } from '@/api/endpoints/trainerApi';
import { DEV_PASSWORD, signInWithPassword, toAuthFailure } from '@/auth';
import { Avatar, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export interface DevQuickSignInProps {
  disabled?: boolean;
  onError: (message: string) => void;
}

/**
 * The old demo role switcher, rebuilt on real credentials.
 *
 * It still shows every fixture user so both sides of the product stay one tap
 * apart, but a tap now performs an actual `signInWithPassword` against the
 * seeded dev account, so the app runs on a real token and RLS applies exactly
 * as it will in production. Render it only behind `__DEV__` — the accounts it
 * uses share one published password and are deleted before real users exist.
 */
export function DevQuickSignIn({ disabled, onError }: DevQuickSignInProps) {
  const { data, isLoading } = useGetRolesQuery();
  const [pending, setPending] = useState<string | null>(null);

  const signIn = async (email: string) => {
    setPending(email);
    try {
      await signInWithPassword(email, DEV_PASSWORD);
      // The auth listener takes it from here; `pending` stays set so the row
      // reads as busy for the moment before the redirect.
    } catch (error) {
      setPending(null);
      onError(toAuthFailure(error).message);
    }
  };

  if (isLoading || !data) {
    return (
      <View style={styles.loading}>
        <Skeleton height={56} radius={radius.sm} />
        <Skeleton height={56} radius={radius.sm} />
      </View>
    );
  }

  const people = [
    { id: data.trainer.id, name: data.trainer.name, email: data.trainer.email, tag: 'TRAINER' },
    ...data.clients.map((c) => ({ id: c.id, name: c.name, email: c.email, tag: 'CLIENT' })),
  ];

  return (
    <View style={styles.root}>
      <View style={styles.headingRow}>
        <View style={styles.rule} />
        <Text variant="micro" tone="tertiary">
          DEV SIGN-IN
        </Text>
        <View style={styles.rule} />
      </View>

      <Text variant="caption" tone="tertiary" align="center" style={styles.note}>
        Development build only. Each row signs in for real with the seeded account.
      </Text>

      <View style={styles.list}>
        {people.map((person) => {
          const busy = pending === person.email;
          return (
            <Pressable
              key={person.id}
              onPress={() => void signIn(person.email)}
              disabled={disabled || pending !== null}
              style={({ pressed }) => [
                styles.row,
                pressed && styles.pressed,
                (disabled || (pending !== null && !busy)) && styles.rowDisabled,
              ]}>
              <Avatar name={person.name} size={34} />
              <View style={styles.rowText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {person.name}
                </Text>
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {person.tag} · {person.email}
                </Text>
              </View>
              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  loading: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  note: {
    maxWidth: 280,
    alignSelf: 'center',
  },
  list: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowDisabled: {
    opacity: 0.45,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
