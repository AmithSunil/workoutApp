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
      style={styles.bleed}
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
            style={styles.day}>
            <Text variant="micro" tone={active ? 'default' : 'tertiary'}>
              {weekdayInitial(date)}
            </Text>
            <View style={[styles.num, active && styles.numActive]}>
              <Text
                variant="bodyStrong"
                color={active ? colors.textInverse : isToday ? colors.primaryText : colors.text}>
                {parseISODate(date).getDate()}
              </Text>
            </View>
            <View style={[styles.dot, marked.has(date) && styles.dotMarked]} />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Edge to edge: the strip scrolls under the screen gutters.
  bleed: {
    marginHorizontal: -spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  day: {
    width: 48,
    alignItems: 'center',
    gap: spacing.xs,
  },
  num: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numActive: {
    backgroundColor: colors.surfaceInk,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: radius.pill,
  },
  dotMarked: {
    backgroundColor: colors.primary,
  },
});
