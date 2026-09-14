import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useGetTrainerQuery, useUpdateTrainerMutation } from '@/api/endpoints/trainerApi';
import { signOutEverywhere } from '@/auth';
import { Avatar, Button, Card, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { TrackingPicker } from '@/components/trainer/TrackingPicker';
import { routes } from '@/navigation/routes';
import { colors, spacing } from '@/theme';

/**
 * The coach's own account screen, reached from the dashboard avatar.
 *
 * The tracking choice lives here because it is the one setting that changes
 * what the rest of the app shows them — everything else on this screen is
 * read-only identity.
 */
export default function TrainerProfileScreen() {
  const router = useRouter();
  const { data: trainer } = useGetTrainerQuery();
  const [updateTrainer, state] = useUpdateTrainerMutation();

  if (!trainer) {
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
          <Avatar name={trainer.name} uri={trainer.avatarUrl} size={56} />
          <View style={styles.identityText}>
            <Text variant="h2" numberOfLines={1}>
              {trainer.name}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={2}>
              {trainer.headline}
            </Text>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {trainer.email} · {trainer.clientIds.length} clients
            </Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="What you coach" caption="Changes what this app shows you" />
      <Card>
        <TrackingPicker
          value={trainer.tracks}
          busy={state.isLoading}
          onChange={(tracks) => void updateTrainer({ tracks })}
        />
        {state.isError ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text variant="caption" tone="danger" style={styles.bannerText}>
              Could not save that. Check your connection and try again.
            </Text>
          </View>
        ) : null}
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bannerText: {
    flex: 1,
  },
  signOut: {
    marginTop: spacing.xl,
  },
});
