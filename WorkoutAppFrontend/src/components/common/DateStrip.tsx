import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ISODate } from '@/types/models';
import { TODAY, lastNDays, parseISODate, weekdayInitial } from '@/utils/date';

export interface DateStripProps {
  value: ISODate;
  onChange: (date: ISODate) => void;
  days?: number;
  /** Dates that already have data — rendered with a completion dot. */
  markedDates?: ISODate[];
}

/** Horizontal day selector anchored on today, scrolled to the end by default. */
export function DateStrip({ value, onChange, days = 14, markedDates = [] }: DateStripProps) {
  const dates = lastNDays(days);
  const marked = new Set(markedDates);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      // Anchor to today. `contentOffset` is iOS-only, so scroll on layout instead.
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
      {dates.map((date) => {
        const active = date === value;
        const isToday = date === TODAY;
        return (
          <Pressable
            key={date}
            onPress={() => onChange(date)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.day, active && styles.dayActive]}>
            <Text variant="micro" tone={active ? 'inverse' : 'tertiary'}>
              {weekdayInitial(date)}
            </Text>
            <Text
              variant="bodyStrong"
              color={active ? colors.textInverse : isToday ? colors.primary : colors.text}>
              {parseISODate(date).getDate()}
            </Text>
            <View
              style={[
                styles.dot,
                marked.has(date) && {
                  backgroundColor: active ? colors.textInverse : colors.primary,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: 2,
  },
  day: {
    width: 46,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  dayActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'transparent',
    marginTop: 2,
  },
});
