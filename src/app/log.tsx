/**
 * Tab 2: Log – The Nutrition Hub
 * High-efficiency, flat, high-contrast interface for meal logging.
 */
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AIConfirmCard } from '@/components/log/AIConfirmCard';
import { QuickAddCarousel } from '@/components/log/QuickAddCarousel';
import {
  BottomTabInset,
  Brand,
  FontSizes,
  MaxContentWidth,
  MIN_TOUCH,
  Radius,
  Spacing,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

type LogMode = null | 'camera' | 'upload' | 'text';

export default function LogScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [mode, setMode] = useState<LogMode>(null);
  const [textInput, setTextInput] = useState('');
  const [showAICard, setShowAICard] = useState(false);

  const handleCameraPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAICard(true);
  };

  const handleUploadPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowAICard(true);
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMode(null);
    setShowAICard(true);
  };

  const platformPadding = Platform.select({
    android: { paddingTop: insets.top },
    web: { paddingTop: Spacing.six },
    default: {},
  });

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.flex}
        contentInset={{ bottom: insets.bottom + BottomTabInset + Spacing.six }}
        contentContainerStyle={[styles.contentContainer, platformPadding]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>LOG</Text>
            <Text style={[styles.calorieCounter, { color: theme.textSecondary }]}>
              {state.macroLog.calories.toLocaleString()} / {state.macroTarget.calories.toLocaleString()} kcal
            </Text>
          </View>

          {/* ── Action Buttons — stacked, flat, high-contrast ── */}
          <View style={styles.actions}>
            {/* Primary: Snap a Photo */}
            <Pressable
              onPress={handleCameraPress}
              style={({ pressed }) => [
                styles.actionButton,
                styles.actionPrimary,
                { opacity: pressed ? 0.85 : 1 },
              ]}>
              <Text style={styles.actionPrimaryLabel}>SNAP A PHOTO</Text>
              <Text style={styles.actionPrimaryArrow}>→</Text>
            </Pressable>

            {/* Secondary: Upload */}
            <Pressable
              onPress={handleUploadPress}
              style={({ pressed }) => [
                styles.actionButton,
                { borderColor: theme.border, backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Text style={[styles.actionLabel, { color: theme.text }]}>UPLOAD</Text>
              <Text style={[styles.actionArrow, { color: theme.textTertiary }]}>→</Text>
            </Pressable>

            {/* Secondary: Type it Out */}
            <Pressable
              onPress={() => setMode(mode === 'text' ? null : 'text')}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  borderColor: mode === 'text' ? Brand.primary : theme.border,
                  backgroundColor: theme.background,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Text
                style={[
                  styles.actionLabel,
                  { color: mode === 'text' ? Brand.primary : theme.text },
                ]}>
                TYPE IT OUT
              </Text>
              <Text style={[styles.actionArrow, { color: theme.textTertiary }]}>→</Text>
            </Pressable>

            {/* Text input */}
            {mode === 'text' && (
              <View style={[styles.textInputCard, { borderColor: theme.border }]}>
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  placeholder="e.g. two scrambled eggs and whole wheat toast"
                  placeholderTextColor={theme.textTertiary}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                  autoFocus
                />
                <Pressable
                  onPress={handleTextSubmit}
                  style={({ pressed }) => [
                    styles.analyzeButton,
                    { backgroundColor: Brand.primary, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <Text style={styles.analyzeButtonText}>ANALYZE →</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ── Quick Add Carousel ── */}
          <View style={styles.carouselSection}>
            <QuickAddCarousel />
          </View>

          {/* ── Recently Logged ── */}
          {state.loggedMeals.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>TODAY'S LOG</Text>
              <View style={[styles.recentList, { borderTopColor: theme.border }]}>
                {state.loggedMeals.slice(0, 5).map(meal => (
                  <View
                    key={meal.id}
                    style={[styles.loggedMealRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.loggedMealName, { color: theme.text }]}>
                      {meal.name}
                    </Text>
                    <Text style={[styles.loggedMealCals, { color: theme.textSecondary }]}>
                      {meal.calories} kcal
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* AI Confirm Card Modal */}
      <AIConfirmCard
        visible={showAICard}
        inputText={textInput}
        onClose={() => {
          setShowAICard(false);
          setTextInput('');
          setMode(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    gap: Spacing.seven,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.nine,
  },
  header: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.one,
  },
  headerTitle: {
    fontSize: FontSizes['4xl'],
    fontWeight: '900',
    letterSpacing: -1,
  },
  calorieCounter: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  actions: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
    minHeight: MIN_TOUCH + 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  actionPrimary: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  actionPrimaryLabel: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  actionPrimaryArrow: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '300',
  },
  actionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  actionArrow: {
    fontSize: FontSizes.lg,
    fontWeight: '300',
  },
  textInputCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  textInput: {
    fontSize: FontSizes.base,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  analyzeButton: {
    height: MIN_TOUCH,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  carouselSection: {},
  recentSection: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  recentList: {
    borderTopWidth: 1,
  },
  loggedMealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  loggedMealName: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    flex: 1,
  },
  loggedMealCals: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
});
