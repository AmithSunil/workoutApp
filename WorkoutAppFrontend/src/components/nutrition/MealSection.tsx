import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, PressableScale, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { FoodEntry, MealSlot } from '@/types/models';
import { clockTime } from '@/utils/date';
import { grams, kcal } from '@/utils/format';

export const MEAL_META: Record<MealSlot, { label: string; icon: keyof typeof Ionicons.glyphMap; emoji: string }> = {
  breakfast: { label: 'Breakfast', icon: 'sunny-outline', emoji: '🌅' },
  lunch: { label: 'Lunch', icon: 'partly-sunny-outline', emoji: '🥗' },
  dinner: { label: 'Dinner', icon: 'moon-outline', emoji: '🍽️' },
  snack: { label: 'Snacks', icon: 'nutrition-outline', emoji: '🍎' },
};

export interface MealSectionProps {
  slot: MealSlot;
  entries: FoodEntry[];
  /** Omit for a read-only view (the coach's). */
  onAdd?: (slot: MealSlot) => void;
  onRemove?: (entry: FoodEntry) => void;
  readOnly?: boolean;
}

export function MealSection({ slot, entries, onAdd, onRemove, readOnly }: MealSectionProps) {
  const meta = MEAL_META[slot];
  const total = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <Card padded={false}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h2">{meta.label}</Text>
          <Text variant="caption" tone="tertiary">
            {entries.length === 0
              ? 'Nothing logged yet'
              : `${kcal(total)} kcal · ${entries.length} item${entries.length > 1 ? 's' : ''}`}
          </Text>
        </View>
        {onAdd && !readOnly ? (
          <PressableScale
            onPress={() => onAdd(slot)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Add to ${meta.label}`}
            style={styles.add}>
            <Ionicons name="add" size={20} color={colors.primaryText} />
          </PressableScale>
        ) : null}
      </View>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <View style={styles.entryText}>
            <View style={styles.entryTitle}>
              <Text variant="body" numberOfLines={1} style={styles.entryName}>
                {entry.name}
              </Text>
              {entry.source === 'ai' ? (
                <Ionicons name="sparkles" size={11} color={colors.primary} />
              ) : null}
            </View>
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {entry.servings === 1 ? '1 serving' : `${entry.servings} servings`} · P{' '}
              {grams(entry.protein)} · C {grams(entry.carbs)} · F {grams(entry.fat)} ·{' '}
              {clockTime(entry.loggedAt)}
            </Text>
          </View>
          <Text variant="label">{kcal(entry.calories)}</Text>
          {onRemove && !readOnly ? (
            <Pressable
              onPress={() => onRemove(entry)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${entry.name}`}>
              <Ionicons name="close" size={16} color={colors.textTertiary} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  add: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  entryText: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  entryName: {
    flexShrink: 1,
  },
});
