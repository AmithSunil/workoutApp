import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Sheet, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import { friendlyDate, lastNDays } from '@/utils/date';
import type { ISODate } from '@/types/models';

export interface LogWeightSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { date: ISODate; weightKg: number }) => void;
  initialWeightKg: number;
  date: ISODate;
  busy?: boolean;
}

export function LogWeightSheet({
  visible,
  onClose,
  onSubmit,
  initialWeightKg,
  date,
  busy,
}: LogWeightSheetProps) {
  const [weight, setWeight] = useState(initialWeightKg.toFixed(1));
  const [selectedDate, setSelectedDate] = useState<ISODate>(date);

  useEffect(() => {
    if (visible) {
      setWeight(initialWeightKg.toFixed(1));
      setSelectedDate(date);
    }
  }, [visible, initialWeightKg, date]);

  const value = Number(weight);
  const valid = Number.isFinite(value) && value > 20 && value < 400;

  const nudge = (delta: number) =>
    setWeight((prev) => (Number(prev) + delta).toFixed(1));

  return (
    <Sheet visible={visible} onClose={onClose} title="Log weight" height="52%">
      <View style={styles.body}>
        <View style={styles.stepper}>
          <Pressable onPress={() => nudge(-0.1)} style={styles.stepBtn} hitSlop={8}>
            <Text variant="h1" tone="secondary">
              −
            </Text>
          </Pressable>
          <View style={styles.valueWrap}>
            <TextInput
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              style={styles.value}
              selectTextOnFocus
            />
            <Text variant="h2" tone="tertiary">
              kg
            </Text>
          </View>
          <Pressable onPress={() => nudge(0.1)} style={styles.stepBtn} hitSlop={8}>
            <Text variant="h1" tone="secondary">
              +
            </Text>
          </Pressable>
        </View>

        <Text variant="label" tone="secondary">
          Date
        </Text>
        <View style={styles.dates}>
          {lastNDays(5).reverse().map((d) => (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              style={[styles.date, d === selectedDate && styles.dateActive]}>
              <Text variant="micro" tone={d === selectedDate ? 'inverse' : 'secondary'}>
                {friendlyDate(d)}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          label="Save weight"
          fullWidth
          disabled={!valid}
          loading={busy}
          onPress={() => onSubmit({ date: selectedDate, weightKg: Number(value.toFixed(1)) })}
          style={styles.cta}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  value: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.text,
    minWidth: 120,
    textAlign: 'center',
    padding: 0,
  },
  dates: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  date: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  dateActive: {
    backgroundColor: colors.primary,
  },
  cta: {
    marginTop: spacing.sm,
  },
});
