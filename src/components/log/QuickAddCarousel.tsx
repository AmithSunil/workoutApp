/**
 * QuickAddCarousel – plain-text horizontal scroll of frequent meals.
 * No cards, no shadows, no emoji, no bounce. Raw + icon in brand accent.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useApp, type FrequentMeal } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

interface MealChipProps {
  meal: FrequentMeal;
  onAdd: (meal: FrequentMeal) => void;
}

function MealChip({ meal, onAdd }: MealChipProps) {
  const theme = useTheme();
  const [added, setAdded] = useState(false);

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAdded(true);
    onAdd(meal);
    setTimeout(() => setAdded(false), 1200);
  }, [meal, onAdd]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.backgroundCard,
          borderColor: theme.border,
          opacity: pressed ? 0.6 : added ? 0.5 : 1,
        },
      ]}>
      <View style={styles.chipContent}>
        <Text
          style={[styles.chipName, { color: theme.text }]}
          numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={[styles.chipCals, { color: theme.textSecondary }]}>
          {meal.calories} kcal
        </Text>
      </View>
      <Text style={[styles.addIcon, { color: added ? theme.textTertiary : Brand.primary }]}>
        {added ? '✓' : '+'}
      </Text>
    </Pressable>
  );
}

export function QuickAddCarousel() {
  const theme = useTheme();
  const { state, logQuickMeal } = useApp();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>QUICK ADD</Text>
      <FlatList
        data={state.frequentMeals}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <MealChip meal={item} onAdd={logQuickMeal} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.five,
  },
  listContent: {
    paddingHorizontal: Spacing.five,
  },
  separator: {
    width: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    width: 180,
  },
  chipContent: {
    flex: 1,
    gap: 2,
  },
  chipName: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  chipCals: {
    fontSize: FontSizes.xs,
    fontWeight: '400',
  },
  addIcon: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
});
