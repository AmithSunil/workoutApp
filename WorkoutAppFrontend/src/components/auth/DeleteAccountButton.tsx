import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useDeleteAccountMutation } from '@/api/endpoints/trainerApi';
import { signOutEverywhere } from '@/auth';
import { Button, Sheet, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';

const WHAT_HAPPENS = {
  trainer:
    'Your profile, routine templates and chats are deleted. Your clients keep their accounts, ' +
    'history and the programme you assigned, and carry on training on their own.',
  client: 'Your workouts, meals, weigh-ins, progress and chats are deleted.',
} as const;

/**
 * Permanently deletes the signed-in account. Confirms in a Sheet — Alert.alert
 * is a no-op on web. What goes and what stays is decided server-side
 * (delete_account); this only says so.
 */
export function DeleteAccountButton({ role }: { role: keyof typeof WHAT_HAPPENS }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteAccount, state] = useDeleteAccountMutation();

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={styles.link} hitSlop={8}>
        <Text variant="caption" tone="danger" align="center">
          Delete account
        </Text>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Delete your account?" height="46%">
        <View style={styles.body}>
          <Text tone="secondary">
            {WHAT_HAPPENS[role]} Any paid plan is cancelled straight away. This cannot be undone.
          </Text>
          {state.isError ? (
            <Text variant="caption" tone="danger">
              Could not delete your account. Try again.
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              style={styles.action}
              disabled={state.isLoading}
              onPress={() => setOpen(false)}
            />
            <Button
              label="Delete"
              variant="danger"
              style={styles.action}
              loading={state.isLoading}
              onPress={() =>
                void deleteAccount()
                  .unwrap()
                  .then(signOutEverywhere)
                  .then(() => router.replace(routes.welcome()))
                  .catch(() => undefined)
              }
            />
          </View>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  body: {
    gap: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  action: {
    flex: 1,
  },
});
