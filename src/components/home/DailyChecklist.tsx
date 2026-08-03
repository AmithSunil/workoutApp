/**
 * DailyChecklist – strict ruled-notebook rows with native radio buttons.
 * No cards, no shadows, no bounce animations. Deliberate and heavy.
 */
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontSizes, MIN_TOUCH, Spacing } from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

interface ChecklistRowProps {
  id: string;
  label: string;
  subtitle?: string;
  completed: boolean;
}

function ChecklistRow({ id, label, subtitle, completed }: ChecklistRowProps) {
  const theme = useTheme();
  const { toggleChecklistItem } = useApp();

  const handlePress = useCallback(async () => {
    if (!completed) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleChecklistItem(id);
  }, [completed, id, toggleChecklistItem]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}>
      {/* Radio button — solid fill when checked */}
      <View
        style={[
          styles.radio,
          {
            borderColor: completed ? theme.text : theme.borderStrong,
            backgroundColor: completed ? theme.text : 'transparent',
          },
        ]}>
        {completed && (
          <Text style={[styles.checkmark, { color: theme.background }]}>✓</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            { color: completed ? theme.textTertiary : theme.text },
            completed && styles.strikethrough,
          ]}
          numberOfLines={1}>
          {label}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: theme.textTertiary }]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </Pressable>
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>TODAY'S TASKS</Text>
        <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
          {done}/{total}
        </Text>
      </View>
      <View style={[styles.list, { borderTopColor: theme.border }]}>
        {state.checklist.map(item => (
          <ChecklistRow key={item.id} {...item} />
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
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  list: {
    borderTopWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    borderBottomWidth: 1,
    minHeight: MIN_TOUCH,
    gap: Spacing.three,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '800',
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
});
