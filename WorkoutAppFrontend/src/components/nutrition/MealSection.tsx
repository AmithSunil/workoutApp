import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Divider, Text } from '@/components/ui';
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
  onAdd: (slot: MealSlot) => void;
  onRemove?: (entry: FoodEntry) => void;
  readOnly?: boolean;
}

export function MealSection({ slot, entries, onAdd, onRemove, readOnly }: MealSectionProps) {
  const meta = MEAL_META[slot];
  const total = entries.reduce((sum, e) => sum + e.calories, 0);

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconWrap}>
            <Ionicons name={meta.icon} size={15} color={colors.textSecondary} />
          </View>
          <View>
            <Text variant="h2">{meta.label}</Text>
            <Text variant="micro" tone="tertiary">
              {entries.length === 0 ? 'Nothing logged' : `${entries.length} item${entries.length > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text variant="bodyStrong">{kcal(total)}</Text>
          {!readOnly ? (
            <Pressable
              onPress={() => onAdd(slot)}
              hitSlop={8}
              accessibilityLabel={`Add to ${meta.label}`}
              style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
              <Ionicons name="add" size={17} color={colors.textOnPrimary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {entries.length > 0 ? (
        <View style={styles.entries}>
          {entries.map((entry, i) => (
            <View key={entry.id}>
              {i > 0 ? <Divider inset={spacing.lg} /> : null}
              <View style={styles.entry}>
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
                    {entry.servings === 1 ? '1 serving' : `${entry.servings} servings`} ·{' '}
                    {grams(entry.protein)}P {grams(entry.carbs)}C {grams(entry.fat)}F ·{' '}
                    {clockTime(entry.loggedAt)}
                  </Text>
                </View>
                <Text variant="label" tone="secondary">
                  {kcal(entry.calories)}
                </Text>
                {onRemove && !readOnly ? (
                  <Pressable onPress={() => onRemove(entry)} hitSlop={8}>
                    <Ionicons name="close-circle" size={17} color={colors.borderStrong} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  entries: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSunken,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  entryText: {
    flex: 1,
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
