import * as Haptics from 'expo-haptics';
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, Animated } from 'react-native';

import { Brand, FontSizes, MIN_TOUCH, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

const ICONS: Record<string, string> = {
  workout: '🏋️',
  nutrition: '🍽️',
  hydration: '💧',
  checkin: '📊',
};

interface ChecklistCardProps {
  id: string;
  label: string;
  subtitle?: string;
  completed: boolean;
  type: 'workout' | 'nutrition' | 'hydration' | 'checkin';
}

function ChecklistCard({ id, label, subtitle, completed, type }: ChecklistCardProps) {
  const theme = useTheme();
  const { toggleChecklistItem } = useApp();
  const scale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(completed ? 1 : 0)).current;

  const handlePress = useCallback(async () => {
    // Haptic feedback
    if (!completed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Bounce animation
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, damping: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8 }),
    ]).start();

    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1.3, useNativeDriver: true, damping: 8 }),
      Animated.spring(checkScale, { toValue: completed ? 0 : 1, useNativeDriver: true, damping: 10 }),
    ]).start();

    toggleChecklistItem(id);
  }, [completed, id, toggleChecklistItem, scale, checkScale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: completed ? theme.backgroundElement : theme.backgroundCard,
            borderColor: completed ? 'transparent' : theme.border,
            ...(completed ? {} : Shadow.sm),
            opacity: pressed ? 0.9 : 1,
          },
        ]}>
        {/* Radio button */}
        <View style={[styles.radioOuter, {
          borderColor: completed ? Brand.primary : theme.border,
          backgroundColor: completed ? Brand.primary : 'transparent',
        }]}>
          {completed && (
            <Animated.Text style={[styles.checkmark, { transform: [{ scale: checkScale }], opacity: checkScale }]}>✓</Animated.Text>
          )}
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.label,
              { color: completed ? theme.textSecondary : theme.text },
              completed && styles.strikethrough,
            ]}
            numberOfLines={1}>
            {ICONS[type]} {label}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.textTertiary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        {/* Completion badge */}
        {completed && (
          <View style={[styles.doneBadge, { backgroundColor: Brand.success + '22' }]}>
            <Text style={[styles.doneText, { color: Brand.success }]}>Done</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function DailyChecklist() {
  const { state } = useApp();
  const theme = useTheme();
  const total = state.checklist.length;
  const done = state.checklist.filter(c => c.completed).length;

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Tasks</Text>
        <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
          {done}/{total} complete
        </Text>
      </View>
      <View style={styles.list}>
        {state.checklist.map(item => (
          <ChecklistCard key={item.id} {...item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  list: {
    gap: Spacing.two,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: MIN_TOUCH,
    gap: Spacing.three,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontSize: FontSizes.xs,
    fontWeight: '400',
  },
  doneBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.full,
  },
  doneText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
});
