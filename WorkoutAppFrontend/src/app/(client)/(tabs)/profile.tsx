import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { SignOutButton } from '@/components/auth/SignOutButton';
import { PlanSummary } from '@/components/billing/PlanSummary';
import {
  Avatar,
  Card,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatRow,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import { kg } from '@/utils/format';
import { GOAL_LABEL } from '@/utils/goal';

/** The client's own account screen. */
export default function ClientProfileScreen() {
  const router = useRouter();
  const { client, trainer } = useSession();

  if (!client) {
    return (
      <Screen>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Identity — centred, the one place the app is about the person */}
      <View style={styles.identity}>
        <Avatar name={client.name} uri={client.avatarUrl} size={92} />
        <View style={styles.identityText}>
          <Text variant="title" align="center" numberOfLines={1}>
            {client.name}
          </Text>
          <Text variant="caption" tone="secondary" align="center" numberOfLines={1}>
            {client.email}
          </Text>
        </View>
        <View style={styles.goalPill}>
          <Ionicons name="flag" size={13} color={colors.primaryText} />
          <Text variant="label" tone="primary">
            {GOAL_LABEL[client.goal]}
          </Text>
        </View>
      </View>

      <Card style={styles.big}>
        <StatRow
          items={[
            { label: 'Start', value: kg(client.startWeightKg) },
            { label: 'Target', value: kg(client.targetWeightKg, 0) },
            { label: 'Day streak', value: `${client.compliance.streakDays}`, icon: 'flame' },
          ]}
        />
      </Card>

      {trainer ? (
        <View style={styles.section}>
          <SectionHeader title="Your coach" />
          <Card onPress={() => router.push(routes.client.chat())} style={styles.row}>
            <Avatar name={trainer.name} uri={trainer.avatarUrl} size={48} />
            <View style={styles.flex}>
              <Text variant="h2" numberOfLines={1}>
                {trainer.name}
              </Text>
              <Text variant="caption" tone="secondary">
                Message your coach
              </Text>
            </View>
            <View style={styles.chatIcon}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.primaryText} />
            </View>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <PlanSummary forRole="client" />
      </View>

      <SignOutButton style={styles.signOut} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.md,
  },
  identityText: {
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  big: {
    padding: spacing.xl,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  chatIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOut: {
    marginTop: spacing.lg,
  },
});
