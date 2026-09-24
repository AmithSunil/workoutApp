import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PressableScale, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { FoodItem } from '@/types/models';
import { kcal } from '@/utils/format';

export interface QuickAddCarouselProps {
  foods: FoodItem[];
  onAdd: (food: FoodItem) => void;
  onBrowse?: () => void;
}

/**
 * Low-friction logging: the foods this client reaches for most, one tap away.
 * Removing search from the common path is the single biggest driver of
 * nutrition-logging adherence, which is what the trainer's compliance score reads.
 */
export function QuickAddCarousel({ foods, onAdd, onBrowse }: QuickAddCarouselProps) {
  // The tapped card flashes a ✓ so a one-tap add never feels like a missed tap.
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const add = (food: FoodItem) => {
    onAdd(food);
    setJustAdded(food.id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(null), 1400);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.content}>
      {foods.map((food) => (
        <PressableScale
          key={food.id}
          onPress={() => add(food)}
          accessibilityRole="button"
          accessibilityLabel={`Quick add ${food.name}`}
          style={styles.card}>
          <View style={styles.top}>
            <Text style={styles.emoji}>{food.emoji}</Text>
            <View style={[styles.plus, justAdded === food.id && styles.plusDone]}>
              <Ionicons
                name={justAdded === food.id ? 'checkmark' : 'add'}
                size={16}
                color={justAdded === food.id ? colors.textOnPrimary : colors.primaryText}
              />
            </View>
          </View>
          <Text variant="label" numberOfLines={1}>
            {food.name}
          </Text>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {kcal(food.calories)} kcal
          </Text>
        </PressableScale>
      ))}

      {onBrowse ? (
        <PressableScale
          onPress={onBrowse}
          accessibilityRole="button"
          style={[styles.card, styles.browse]}>
          <View style={styles.top}>
            <Ionicons name="search" size={22} color={colors.textSecondary} />
          </View>
          <Text variant="label">Browse all</Text>
          <Text variant="micro" tone="tertiary">
            Search or use AI
          </Text>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: {
    marginHorizontal: -spacing.xl,
  },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: 128,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: 2,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    height: 34,
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  plus: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusDone: {
    backgroundColor: colors.success,
  },
  browse: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});
