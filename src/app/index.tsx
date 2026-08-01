/**
 * Tab 1: Home – The Daily Dashboard
 * Answers: "What do I have left to do today?"
 */
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalorieRing } from '@/components/home/CalorieRing';
import { DailyChecklist } from '@/components/home/DailyChecklist';
import { MacroBar } from '@/components/home/MacroBar';
import { TrainerPin } from '@/components/home/TrainerPin';
import {
  BottomTabInset,
  Colors,
  FontSizes,
  MaxContentWidth,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
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
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>{formatDate()}</Text>
            <Text style={[styles.greetingText, { color: theme.text }]}>
              {getGreeting()} 👋
            </Text>
          </View>
          {/* Avatar */}
          <View style={[styles.avatarContainer, { backgroundColor: Colors.light.accent + '1A' }]}>
            <Text style={styles.avatarEmoji}>🏆</Text>
          </View>
        </View>

        {/* ── Calorie Ring ── */}
        <View style={styles.ringSection}>
          <CalorieRing
            consumed={macroLog.calories}
            target={macroTarget.calories}
          />
        </View>

        {/* ── Macro Bars ── */}
        <View style={[styles.macroCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
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
    gap: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
  greetingText: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    marginTop: 2,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  ringSection: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  macroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.five,
    gap: Spacing.four,
  },
  divider: {
    height: 1,
  },
});
