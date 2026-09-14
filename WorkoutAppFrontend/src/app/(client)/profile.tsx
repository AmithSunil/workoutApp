import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { signOutEverywhere } from '@/auth';
import { Avatar, Button, Card, Screen, SkeletonCard, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';
import { kg } from '@/utils/format';
import { GOAL_LABEL } from '@/utils/goal';

/** The client's own account screen, reached from the header avatar. */
export default function ClientProfileScreen() {
  const router = useRouter();
  const { client, trainer } = useSession();

  if (!client) {
    return (
      <Screen title="Profile" showBack tabBarPadding={false}>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  return (
    <Screen title="Profile" showBack tabBarPadding={false}>
      <Card>
        <View style={styles.identity}>
          <Avatar name={client.name} uri={client.avatarUrl} size={56} />
          <View style={styles.identityText}>
            <Text variant="h2" numberOfLines={1}>
              {client.name}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {client.email}
            </Text>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              Goal {GOAL_LABEL[client.goal]} · {kg(client.targetWeightKg, 0)}
              {trainer ? ` · coached by ${trainer.name}` : ''}
            </Text>
          </View>
        </View>
      </Card>

      <Button
        label="Sign out"
        icon="log-out-outline"
        variant="secondary"
        fullWidth
        style={styles.signOut}
        onPress={() => {
          void signOutEverywhere().then(() => router.replace(routes.signIn()));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  signOut: {
    marginTop: spacing.xl,
  },
});
