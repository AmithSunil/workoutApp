import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGetBodyMetricsQuery, useGetHabitsQuery } from '@/api/endpoints/progressApi';

import { DeleteAccountButton } from '@/components/auth/DeleteAccountButton';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { PlanSummary } from '@/components/billing/PlanSummary';
import { HabitChecklist } from '@/components/progress/HabitChecklist';
import { GoalsEditor } from '@/components/trainer/GoalsEditor';
import { HabitEditor } from '@/components/trainer/HabitEditor';
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
import type { ClientProfile } from '@/types/models';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import { grams, kcal, kg } from '@/utils/format';
import { hasCoach } from '@/utils/coach';
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

      {trainer && hasCoach(client) ? (
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

      {hasCoach(client) ? null : <SelfCoaching client={client} />}

      <View style={styles.section}>
        <PlanSummary forRole="client" />
      </View>

      <SignOutButton style={styles.signOut} />
      <DeleteAccountButton role="client" />
    </Screen>
  );
}

/**
 * With no coach, the client owns what a coach would set: goals, macros and
 * habits. Same editors the coach uses, pointed at their own row.
 */
function SelfCoaching({ client }: { client: ClientProfile }) {
  const [editing, setEditing] = useState<'goals' | 'habits' | null>(null);
  const metrics = useGetBodyMetricsQuery({ clientId: client.id });
  const habits = useGetHabitsQuery({ clientId: client.id });
  const latest = metrics.data?.[metrics.data.length - 1]?.weightKg ?? null;
  const close = () => setEditing(null);

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title="Your targets" actionLabel="Edit" onAction={() => setEditing('goals')} />
        <Card style={styles.big}>
          <StatRow
            items={[
              { label: 'kcal', value: kcal(client.targets.calories) },
              { label: 'Protein', value: grams(client.targets.protein) },
              { label: 'Carbs', value: grams(client.targets.carbs) },
              { label: 'Fat', value: grams(client.targets.fat) },
            ]}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Daily habits" actionLabel="Edit" onAction={() => setEditing('habits')} />
        {habits.data && habits.data.length > 0 ? (
          <HabitChecklist habits={habits.data} headless readOnly onToggle={() => undefined} />
        ) : (
          <Card>
            <Text variant="caption" tone="secondary">
              No habits yet. Add the daily goals you want to tick off.
            </Text>
          </Card>
        )}
      </View>

      {/* Mounted only while open so it always re-seeds from the server copy. */}
      {editing === 'goals' ? (
        <GoalsEditor client={client} currentWeightKg={latest} onClose={close} />
      ) : null}
      <HabitEditor
        visible={editing === 'habits'}
        onClose={close}
        clientId={client.id}
        habits={habits.data ?? []}
        by="client"
      />
    </>
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
