import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useGetTrainerQuery, useUpdateTrainerMutation } from '@/api/endpoints/trainerApi';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { PlanSummary } from '@/components/billing/PlanSummary';
import { Avatar, Card, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { TrackingPicker } from '@/components/trainer/TrackingPicker';
import { colors, radius, spacing } from '@/theme';

/**
 * The coach's own account screen, reached from the dashboard avatar.
 *
 * The tracking choice lives here because it is the one setting that changes
 * what the rest of the app shows them — everything else on this screen is
 * read-only identity.
 */
export default function TrainerProfileScreen() {
  const { data: trainer } = useGetTrainerQuery();
  const [updateTrainer, state] = useUpdateTrainerMutation();

  if (!trainer) {
    return (
      <Screen>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Identity — centred, matching the client's profile */}
      <View style={styles.identity}>
        <Avatar name={trainer.name} uri={trainer.avatarUrl} size={92} />
        <View style={styles.identityText}>
          <Text variant="title" align="center" numberOfLines={1}>
            {trainer.name}
          </Text>
          {trainer.headline ? (
            <Text variant="body" tone="secondary" align="center" numberOfLines={2}>
              {trainer.headline}
            </Text>
          ) : null}
          <Text variant="caption" tone="tertiary" align="center" numberOfLines={1}>
            {trainer.email}
          </Text>
        </View>
        <View style={styles.pill}>
          <Ionicons name="people" size={13} color={colors.primaryText} />
          <Text variant="label" tone="primary">
            {trainer.clientIds.length} client{trainer.clientIds.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="What you coach" caption="Changes what this app shows you" />
        <Card style={styles.big}>
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
      </View>

      <View style={styles.section}>
        <PlanSummary forRole="trainer" />
      </View>

      <SignOutButton style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  identityText: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  big: {
    padding: spacing.xl,
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
    marginTop: spacing.lg,
  },
});
