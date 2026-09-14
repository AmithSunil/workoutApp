import { useState } from 'react';

import {
  useGetBodyMetricsQuery,
  useLogBodyMetricMutation,
} from '@/api/endpoints/progressApi';
import { LogWeightSheet } from '@/components/progress/LogWeightSheet';
import { Card, EmptyState } from '@/components/ui';
import { TODAY, monthDay, startOfWeek } from '@/utils/date';

export interface WeighInPromptProps {
  clientId: string;
  /** Seeds the stepper when they have never logged a weight. */
  startWeightKg: number;
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
      <Card>
        <EmptyState
          icon="scale-outline"
          title={monday === TODAY ? 'Weigh-in day' : 'Weigh-in still open'}
          message={
            monday === TODAY
              ? 'Mondays are your weigh-in. Same time, before breakfast, and the trend stays comparable.'
              : `Nothing logged since Monday ${monthDay(monday)}. Weigh in today and the week still counts.`
          }
          actionLabel="Log weight"
          onAction={() => setOpen(true)}
          compact
        />
      </Card>

      <LogWeightSheet
        visible={open}
        date={TODAY}
        initialWeightKg={logged[logged.length - 1]?.weightKg ?? startWeightKg}
        busy={logging.isLoading}
        onClose={() => setOpen(false)}
        onSubmit={({ date, weightKg }) => {
          void logWeight({ clientId, date, weightKg }).then(() => setOpen(false));
        }}
      />
    </>
  );
}
