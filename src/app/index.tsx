/**
 * Tab 1: Home – The Daily Dashboard
 * Answers: "What do I have left to do today?"
 *
 * Editorial aesthetic: massive day name header, dominant calorie ring,
 * flat macro bars, ruled checklist rows, blockquote trainer note.
 */
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/home/CalorieRing';
import { DailyChecklist } from '@/components/home/DailyChecklist';
import { MacroBar } from '@/components/home/MacroBar';
import { TrainerPin } from '@/components/home/TrainerPin';
import {
  BottomTabInset,
  FontSizes,
  MaxContentWidth,
  Spacing,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
}

function getDateLine() {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const { macroLog, macroTarget } = state;

  const platformPadding = Platform.select({
    android: { paddingTop: insets.top },
    web: { paddingTop: Spacing.six },
    default: {},
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={{
        top: 0,
        bottom: insets.bottom + BottomTabInset + Spacing.six,
      }}
      contentContainerStyle={[styles.contentContainer, platformPadding]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.inner}>
        {/* ── Header — Editorial masthead ── */}
        <View style={styles.header}>
          <Text style={[styles.dayName, { color: theme.text }]}>{getDayName()}</Text>
          <Text style={[styles.dateLine, { color: theme.textSecondary }]}>{getDateLine()}</Text>
        </View>

        {/* ── Calorie Ring ── */}
        <View style={styles.ringSection}>
          <CalorieRing
            consumed={macroLog.calories}
            target={macroTarget.calories}
          />
        </View>

        {/* ── Macro Bars — flat section, 1px dividers ── */}
        <View style={styles.macroSection}>
          <MacroBar
            label="Protein"
            consumed={macroLog.protein}
            target={macroTarget.protein}
            color={theme.protein}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MacroBar
            label="Carbs"
            consumed={macroLog.carbs}
            target={macroTarget.carbs}
            color={theme.carbs}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <MacroBar
            label="Fat"
            consumed={macroLog.fat}
            target={macroTarget.fat}
            color={theme.fat}
          />
        </View>

        {/* ── Daily Checklist ── */}
        <DailyChecklist />

        {/* ── Trainer Pin ── */}
        <TrainerPin />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
    gap: Spacing.seven,
    paddingBottom: Spacing.nine,
  },
  header: {
    gap: Spacing.one,
  },
  dayName: {
    fontSize: FontSizes['4xl'],
    fontWeight: '900',
    letterSpacing: -1,
  },
  dateLine: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  ringSection: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  macroSection: {
    gap: Spacing.four,
  },
  divider: {
    height: 1,
  },
});
