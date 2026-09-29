import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { AiFoodSuggestion } from '@/types/models';
import { kcal } from '@/utils/format';

import { MacroLine } from './MacroLine';

export type AiItem = AiFoodSuggestion['items'][number];

/** Macros for `amount` grams, scaled linearly from the model's own estimate. */
export const scaleItem = (item: AiItem, amount: number): AiItem => {
  const f = item.grams > 0 ? amount / item.grams : 0;
  return {
    ...item,
    grams: amount,
    calories: Math.round(item.calories * f),
    protein: Math.round(item.protein * f),
    carbs: Math.round(item.carbs * f),
    fat: Math.round(item.fat * f),
  };
};

export interface AiConfirmationCardProps {
  suggestion: AiFoodSuggestion;
  /** "Lunch" — the button says where the food is going. */
  slotLabel: string;
  /** The items as the client left them — re-weighed, minus any slid to zero or removed. */
  onConfirm: (items: AiItem[]) => void;
  busy?: boolean;
}

/**
 * The review step for AI food parsing, sized to fill the rest of the sheet:
 * the items scroll, the total and the one button stay pinned at the bottom.
 * Nothing is written until the client taps it. Each item has a weight slider
 * that rescales its macros live; sliding to 0 or tapping ✕ drops it.
 *
 * Mount with `key={suggestion.id}` — the weights are local state seeded once.
 */
export function AiConfirmationCard({ suggestion, slotLabel, onConfirm, busy }: AiConfirmationCardProps) {
  const [amounts, setAmounts] = useState(() => suggestion.items.map((i) => i.grams));
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set());

  const rows = suggestion.items
    .map((item, index) => ({ index, item, scaled: scaleItem(item, amounts[index]) }))
    .filter((r) => !removed.has(r.index));
  const kept = rows.map((r) => r.scaled).filter((i) => i.grams > 0);
  const totals = kept.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const setAmount = (index: number, value: number) => {
    const next = Math.round(value);
    // Continuous slider, integer state: React skips the render when the gram doesn't change.
    setAmounts((prev) => (prev[index] === next ? prev : prev.map((a, i) => (i === index ? next : a))));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.items}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="tertiary">
          Slide each item to match how much you had.
        </Text>
        {rows.map(({ index, item, scaled }) => (
          <View key={index} style={[styles.item, scaled.grams === 0 && styles.itemOff]}>
            <View style={styles.itemHead}>
              <View style={styles.emojiWrap}>
                <Text style={styles.emoji}>{item.emoji}</Text>
              </View>
              <View style={styles.itemText}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.name}
                </Text>
                <MacroLine protein={scaled.protein} carbs={scaled.carbs} fat={scaled.fat} />
              </View>
              <View style={styles.kcal}>
                <Text variant="bodyStrong" style={styles.num}>
                  {kcal(scaled.calories)}
                </Text>
                <Text variant="micro" tone="tertiary">
                  kcal
                </Text>
              </View>
              <Pressable
                onPress={() => setRemoved((prev) => new Set(prev).add(index))}
                hitSlop={10}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}>
                <Ionicons name="close" size={14} color={colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.sliderRow}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={Math.max(Math.round(item.grams * 3), 100)}
                // Seeded once and never fed back: a controlled RN slider fights the thumb.
                value={item.grams}
                onValueChange={(v) => setAmount(index, v)}
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.border}
                thumbTintColor={colors.primary}
                accessibilityLabel={`${item.name} amount in grams`}
              />
              <Text variant="label" style={[styles.num, styles.amount]}>
                {scaled.grams} g
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totals}>
          <View style={styles.totalsMacros}>
            <MacroLine protein={totals.protein} carbs={totals.carbs} fat={totals.fat} variant="caption" />
          </View>
          <Text variant="h2" style={styles.num}>
            {kcal(totals.calories)} kcal
          </Text>
        </View>
        <Button
          label={kept.length === 0 ? 'Nothing to log' : `Log to ${slotLabel}`}
          icon="checkmark"
          size="lg"
          fullWidth
          onPress={() => onConfirm(kept)}
          loading={busy}
          disabled={kept.length === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  items: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  item: {
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemOff: {
    opacity: 0.45,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emojiWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  itemText: {
    flex: 1,
    gap: spacing.xxs,
  },
  kcal: {
    alignItems: 'flex-end',
  },
  num: {
    fontVariant: ['tabular-nums'],
  },
  remove: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  slider: {
    flex: 1,
    height: 36,
  },
  amount: {
    minWidth: 56,
    textAlign: 'right',
  },
  footer: {
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  totalsMacros: {
    flex: 1,
  },
  totals: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
