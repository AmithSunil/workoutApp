import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { useGetPlansQuery, useGetSubscriptionQuery } from '@/api/endpoints/billingApi';
import { Card, SectionHeader, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, spacing } from '@/theme';
import { price, statusLine } from '@/utils/plan';

/**
 * The plan row on a profile screen: which plan, how it stands, and a tap
 * through to `/plans`, where changing and cancelling already live.
 *
 * Renders nothing when there is no subscription to speak of — a coached client
 * is covered by their coach's seat and has no row of their own, so a "plan"
 * entry on their profile would be a dead end. The heading is part of this
 * component for that reason: left on the screen it would be a section title
 * with nothing under it.
 */
export function PlanSummary({ forRole }: { forRole: 'trainer' | 'client' }) {
  const router = useRouter();
  const sub = useGetSubscriptionQuery();
  const plans = useGetPlansQuery();
  const clients = useGetClientsQuery(undefined, { skip: forRole !== 'trainer' });

  if (!sub.data) return null;
  const plan = plans.data?.find((p) => p.code === sub.data!.planCode);

  return (
    <>
      <SectionHeader title="Subscription" caption="Tap to change or cancel" />
      <Card onPress={() => router.push(routes.plans())}>
        <View style={styles.row}>
          <View style={styles.text}>
            <Text variant="label" tone="secondary">
              Plan
            </Text>
            <Text variant="h2" numberOfLines={1}>
              {plan?.name ?? sub.data.planCode}
              {plan && plan.pricePaise > 0 ? (
                <Text variant="caption" tone="secondary">{`  ${price(plan.pricePaise)} / month`}</Text>
              ) : null}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {statusLine(sub.data, forRole === 'trainer' ? clients.data?.length : undefined)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
