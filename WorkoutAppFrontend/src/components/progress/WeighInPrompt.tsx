import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  useGetBodyMetricsQuery,
  useLogBodyMetricMutation,
} from '@/api/endpoints/progressApi';
import { LogWeightSheet } from '@/components/progress/LogWeightSheet';
import { Button, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { TODAY, monthDay, startOfWeek } from '@/utils/date';

export interface WeighInPromptProps {
  clientId: string;
  /** Seeds the stepper when they have never logged a weight. */
  startWeightKg: number | null;
}

/**
 * Monday is weigh-in day. This card appears that morning and stays until a
 * weight lands somewhere in the week, so missing the Monday means being asked
 * on Tuesday rather than being let off until the next one.
 *
 * It always offers *today's* date. Backdating a weigh-in that was never taken
 * would put an invented number in the trend — the sheet's own date chips are
 * there for a weight they really did take earlier in the week.
 */
export function WeighInPrompt({ clientId, startWeightKg }: WeighInPromptProps) {
  const metrics = useGetBodyMetricsQuery({ clientId });
  const [logWeight, logging] = useLogBodyMetricMutation();
  const [open, setOpen] = useState(false);

  const monday = startOfWeek(TODAY);
  const logged = metrics.data ?? [];
  const done = logged.some((m) => m.date >= monday);

  if (metrics.isLoading || done) return null;

  return (
    <>
      <Card style={styles.banner}>
        <View style={styles.icon}>
          <Ionicons name="scale-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <Text variant="bodyStrong">
            {monday === TODAY ? 'Weigh-in day' : 'Weigh-in still open'}
          </Text>
          <Text variant="caption" tone="secondary">
            {monday === TODAY
              ? 'Before breakfast keeps the trend honest.'
              : `Nothing since Mon ${monthDay(monday)} — today still counts.`}
          </Text>
        </View>
        <Button label="Log" size="sm" onPress={() => setOpen(true)} />
      </Card>

      <LogWeightSheet
        visible={open}
        date={TODAY}
        initialWeightKg={logged[logged.length - 1]?.weightKg ?? startWeightKg ?? 75}
        busy={logging.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={({ date, weightKg }) => {
          void logWeight({ clientId, date, weightKg }).then(() => setOpen(false));
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
