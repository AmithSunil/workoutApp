/**
 * Tab 2: Log – The Nutrition Hub
 */
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Alert,
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
  Shadow,
  Spacing,
} from '@/constants/theme';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

type LogMode = null | 'camera' | 'upload' | 'text';

interface ActionButtonProps {
  emoji: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isPrimary?: boolean;
}

function ActionButton({ emoji, title, subtitle, onPress, isPrimary }: ActionButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : [styles.actionButtonSecondary, { borderColor: theme.border, backgroundColor: theme.backgroundCard }],
        pressed && styles.pressed,
      ]}>
      <Text style={styles.actionEmoji}>{emoji}</Text>
      <View style={styles.actionTextBlock}>
        <Text style={[styles.actionTitle, { color: isPrimary ? '#fff' : theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.actionSubtitle, { color: isPrimary ? '#ffffffBB' : theme.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
      <Text style={{ color: isPrimary ? '#ffffffBB' : theme.textTertiary, fontSize: 18 }}>→</Text>
    </Pressable>
  );
}

export default function LogScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [mode, setMode] = useState<LogMode>(null);
  const [textInput, setTextInput] = useState('');
  const [showAICard, setShowAICard] = useState(false);

  const handleCameraPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Simulate camera opening then processing
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
            <Text style={[styles.headerTitle, { color: theme.text }]}>Log a Meal</Text>
            <View style={[styles.calorieBadge, { backgroundColor: Brand.primary + '1A' }]}>
              <Text style={[styles.calorieBadgeText, { color: Brand.primary }]}>
                {state.macroLog.calories} / {state.macroTarget.calories} kcal
              </Text>
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.actions}>
            <ActionButton
              emoji="📷"
              title="Snap a Photo"
              subtitle="AI identifies your meal instantly"
              onPress={handleCameraPress}
              isPrimary
            />
            <View style={styles.secondaryRow}>
              <Pressable
                onPress={handleUploadPress}
                style={({ pressed }) => [
                  styles.halfButton,
                  { backgroundColor: theme.backgroundCard, borderColor: theme.border },
                  pressed && styles.pressed,
                  Shadow.sm,
                ]}>
                <Text style={styles.halfButtonEmoji}>🖼️</Text>
                <Text style={[styles.halfButtonTitle, { color: theme.text }]}>Upload</Text>
                <Text style={[styles.halfButtonSub, { color: theme.textSecondary }]}>From gallery</Text>
              </Pressable>

              <Pressable
                onPress={() => setMode(mode === 'text' ? null : 'text')}
                style={({ pressed }) => [
                  styles.halfButton,
                  {
                    backgroundColor: mode === 'text' ? Brand.primary + '1A' : theme.backgroundCard,
                    borderColor: mode === 'text' ? Brand.primary : theme.border,
                  },
                  pressed && styles.pressed,
                  Shadow.sm,
                ]}>
                <Text style={styles.halfButtonEmoji}>✏️</Text>
                <Text style={[styles.halfButtonTitle, { color: mode === 'text' ? Brand.primary : theme.text }]}>
                  Type it Out
                </Text>
                <Text style={[styles.halfButtonSub, { color: theme.textSecondary }]}>
                  Natural language
                </Text>
              </Pressable>
            </View>

            {/* Text input */}
            {mode === 'text' && (
              <View style={[styles.textInputCard, { backgroundColor: theme.backgroundCard, borderColor: theme.border }]}>
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
                  style={[styles.analyzeButton, { backgroundColor: Brand.primary }]}>
                  <Text style={styles.analyzeButtonText}>Analyze →</Text>
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
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Log</Text>
              {state.loggedMeals.slice(0, 5).map(meal => (
                <View key={meal.id} style={[styles.loggedMealRow, { borderBottomColor: theme.border }]}>
                  <Text style={[styles.loggedMealName, { color: theme.text }]}>{meal.name}</Text>
                  <Text style={[styles.loggedMealCals, { color: theme.textSecondary }]}>
                    {meal.calories} kcal
                  </Text>
                </View>
              ))}
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
  },
  header: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
  },
  calorieBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 1,
    borderRadius: Radius.full,
  },
  calorieBadgeText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    borderRadius: Radius.xl,
    minHeight: MIN_TOUCH + 16,
  },
  actionButtonPrimary: {
    backgroundColor: Brand.primary,
  },
  actionButtonSecondary: {
    borderWidth: 1,
    ...Shadow.sm,
  },
  actionEmoji: {
    fontSize: 28,
  },
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  actionSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  halfButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing.one,
    minHeight: MIN_TOUCH + 16,
  },
  halfButtonEmoji: {
    fontSize: 24,
  },
  halfButtonTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  halfButtonSub: {
    fontSize: FontSizes.xs,
  },
  textInputCard: {
    borderRadius: Radius.xl,
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
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  carouselSection: {},
  recentSection: {
    paddingHorizontal: Spacing.five,
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginBottom: Spacing.one,
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
    fontWeight: '500',
    flex: 1,
  },
  loggedMealCals: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
});
