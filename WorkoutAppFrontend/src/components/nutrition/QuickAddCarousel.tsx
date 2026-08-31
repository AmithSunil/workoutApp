import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, elevation, radius, spacing } from '@/theme';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}>
      {foods.map((food) => (
        <Pressable
          key={food.id}
          onPress={() => onAdd(food)}
          accessibilityRole="button"
          accessibilityLabel={`Quick add ${food.name}`}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <View style={styles.emojiWrap}>
            <Text style={styles.emoji}>{food.emoji}</Text>
          </View>
          <Text variant="label" numberOfLines={1}>
            {food.name}
          </Text>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {kcal(food.calories)} kcal · {food.servingLabel}
          </Text>
          <View style={styles.plus}>
            <Ionicons name="add" size={13} color={colors.textOnPrimary} />
          </View>
        </Pressable>
      ))}

      {onBrowse ? (
        <Pressable
          onPress={onBrowse}
          style={({ pressed }) => [styles.card, styles.browse, pressed && styles.pressed]}>
          <View style={[styles.emojiWrap, styles.browseIcon]}>
            <Ionicons name="search" size={17} color={colors.primary} />
          </View>
          <Text variant="label" tone="primary">
            Browse all
          </Text>
          <Text variant="micro" tone="tertiary">
            Search or use AI
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  card: {
    width: 126,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: 2,
    ...elevation.card,
  },
  browse: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primarySoftBorder,
    backgroundColor: colors.primarySoft,
  },
  browseIcon: {
    backgroundColor: colors.surface,
  },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emoji: {
    fontSize: 18,
  },
  plus: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
