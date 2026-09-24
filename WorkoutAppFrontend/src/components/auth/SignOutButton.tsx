import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, type ViewStyle } from 'react-native';

import { signOutEverywhere } from '@/auth';
import { Card, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, spacing } from '@/theme';

/** Signs out straight away — no confirmation, by choice. */
export function SignOutButton({ style }: { style?: ViewStyle }) {
  const router = useRouter();

  return (
    <Card
      onPress={() => {
        void signOutEverywhere().then(() => router.replace(routes.welcome()));
      }}
      style={style ? [styles.row, style] : styles.row}
      accessibilityRole="button">
      <Ionicons name="log-out-outline" size={18} color={colors.danger} />
      <Text variant="bodyStrong" tone="danger">
        Sign out
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
