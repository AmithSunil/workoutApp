import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Habit, ISODate } from '@/types/models';
import { TODAY, lastNDays } from '@/utils/date';

export interface HabitChecklistProps {
  habits: Habit[];
  date?: ISODate;
  onToggle: (habit: Habit) => void;
  /** Renders the trailing 7-day dot grid next to each row. */
  showHistory?: boolean;
  readOnly?: boolean;
}

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  water: 'water-outline',
  walk: 'walk-outline',
  moon: 'moon-outline',
  nutrition: 'nutrition-outline',
  body: 'body-outline',
  'phone-portrait': 'phone-portrait-outline',
};

export function HabitChecklist({
  habits,
  date = TODAY,
  onToggle,
  showHistory = true,
  readOnly,
}: HabitChecklistProps) {
  const week = lastNDays(7, date);
  const doneToday = habits.filter((h) => h.completedDates.includes(date)).length;

  return (
    <Card padded={false}>
      <View style={styles.header}>
        <View>
          <Text variant="h2">Daily habits</Text>
          <Text variant="micro" tone="tertiary">
            {doneToday} of {habits.length} done
          </Text>
        </View>
        <View style={styles.ring}>
          <Text variant="label" tone={doneToday === habits.length ? 'success' : 'secondary'}>
            {habits.length ? Math.round((doneToday / habits.length) * 100) : 0}%
          </Text>
        </View>
      </View>

      {habits.map((habit) => {
        const done = habit.completedDates.includes(date);
        return (
          <Pressable
            key={habit.id}
            onPress={() => !readOnly && onToggle(habit)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            style={({ pressed }) => [styles.row, pressed && !readOnly && styles.pressed]}>
            <View style={[styles.check, done && styles.checkDone]}>
              {done ? <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} /> : null}
            </View>

            <View style={styles.icon}>
              <Ionicons
                name={ICONS[habit.icon] ?? 'ellipse-outline'}
                size={15}
                color={done ? colors.success : colors.textTertiary}
              />
            </View>

            <View style={styles.text}>
              <Text variant="body" numberOfLines={1} style={done ? styles.doneText : undefined}>
                {habit.title}
              </Text>
              {habit.createdBy === 'trainer' ? (
                <Text variant="micro" tone="tertiary">
                  Set by your coach
                </Text>
              ) : null}
            </View>

            {showHistory ? (
              <View style={styles.history}>
                {week.map((d) => (
                  <View
                    key={d}
                    style={[
                      styles.dot,
                      habit.completedDates.includes(d) && styles.dotDone,
                      d === date && styles.dotToday,
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  ring: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  icon: {
    width: 26,
    alignItems: 'center',
  },
  text: {
    flex: 1,
  },
  doneText: {
    color: colors.textSecondary,
  },
  history: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  dotToday: {
    transform: [{ scale: 1.35 }],
  },
});
