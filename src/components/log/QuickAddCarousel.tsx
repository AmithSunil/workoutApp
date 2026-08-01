import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, Animated } from 'react-native';

import { Brand, FontSizes, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp, type FrequentMeal } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

interface MealChipProps {
  meal: FrequentMeal;
  onAdd: (meal: FrequentMeal) => void;
}

function MealChip({ meal, onAdd }: MealChipProps) {
  const theme = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const [added, setAdded] = useState(false);

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, damping: 10 }),
      Animated.spring(scale, { toValue: 1.05, useNativeDriver: true, damping: 8 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12 }),
    ]).start();
    setAdded(true);
    onAdd(meal);
    setTimeout(() => setAdded(false), 1500);
  }, [meal, onAdd, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.chip,
          {
            backgroundColor: added ? Brand.primary : theme.backgroundCard,
            borderColor: added ? Brand.primary : theme.border,
            ...Shadow.sm,
          },
        ]}>
        <Text style={styles.emoji}>{meal.emoji}</Text>
        <Text style={[styles.chipName, { color: added ? '#fff' : theme.text }]} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={[styles.chipCals, { color: added ? '#ffffffCC' : theme.textSecondary }]}>
          {meal.calories} kcal
        </Text>
        <View style={[styles.addButton, { backgroundColor: added ? '#ffffff33' : Brand.primary + '1A' }]}>
          <Text style={[styles.addIcon, { color: added ? '#fff' : Brand.primary }]}>
            {added ? '✓' : '+'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function QuickAddCarousel() {
  const theme = useTheme();
  const { state, logQuickMeal } = useApp();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Add</Text>
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
    fontSize: FontSizes.md,
    fontWeight: '700',
    paddingHorizontal: Spacing.five,
  },
  listContent: {
    paddingHorizontal: Spacing.five,
    paddingBottom: Spacing.two,
  },
  separator: {
    width: Spacing.three,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingRight: Spacing.two,
    borderRadius: Radius.xl,
    borderWidth: 1,
    width: 180,
  },
  emoji: {
    fontSize: 22,
  },
  chipName: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  chipCals: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
});
