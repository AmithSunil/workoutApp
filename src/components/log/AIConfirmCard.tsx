/**
 * AIConfirmCard – bottom-sheet card that shows AI-identified food with portion adjusters.
 * Simulates AI analysis with a loading shimmer, then shows the result card.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, Animated } from 'react-native';

import { Brand, FontSizes, MIN_TOUCH, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp, type LoggedMeal } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

// Mock AI results pool
const MOCK_RESULTS = [
  { name: 'Grilled Chicken Breast + Rice', calories: 510, protein: 46, carbs: 54, fat: 11, emoji: '🍗' },
  { name: 'Avocado Toast + Eggs', calories: 420, protein: 22, carbs: 32, fat: 24, emoji: '🥑' },
  { name: 'Mixed Salad with Salmon', calories: 380, protein: 34, carbs: 12, fat: 18, emoji: '🥗' },
  { name: 'Pasta Bolognese', calories: 620, protein: 36, carbs: 68, fat: 16, emoji: '🍝' },
  { name: 'Greek Yogurt Bowl', calories: 310, protein: 28, carbs: 36, fat: 6, emoji: '🫙' },
];

function ShimmerBar({ width }: { width: string | number }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={{ width: width as any }}>
      <Animated.View style={[styles.shimmerBar, { width: '100%', opacity }]} />
    </View>
  );
}

interface AIConfirmCardProps {
  visible: boolean;
  inputText?: string;
  onClose: () => void;
}

export function AIConfirmCard({ visible, inputText, onClose }: AIConfirmCardProps) {
  const theme = useTheme();
  const { logMeal } = useApp();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(MOCK_RESULTS[0]);
  const [servings, setServings] = useState(1);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setServings(1);
      const pick = MOCK_RESULTS[Math.floor(Math.random() * MOCK_RESULTS.length)];
      setResult(pick);
      const t = setTimeout(() => setLoading(false), 2200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const adjustedMacros = {
    calories: Math.round(result.calories * servings),
    protein: Math.round(result.protein * servings),
    carbs: Math.round(result.carbs * servings),
    fat: Math.round(result.fat * servings),
  };

  const handleConfirm = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logMeal({ name: result.name, ...adjustedMacros });
    onClose();
  }, [result, adjustedMacros, logMeal, onClose]);

  const handleServingsChange = useCallback((delta: number) => {
    setServings(s => Math.max(0.5, Math.min(5, parseFloat((s + delta).toFixed(1)))));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, { backgroundColor: theme.backgroundCard }]}>
          <Pressable>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: theme.border }]} />

            {loading ? (
              /* ── Loading Shimmer ── */
              <View style={styles.loadingContent}>
                <Text style={[styles.loadingLabel, { color: theme.textSecondary }]}>
                  🤖 Analysing your meal...
                </Text>
                <View style={styles.shimmerGroup}>
                  <ShimmerBar width="70%" />
                  <ShimmerBar width="50%" />
                  <ShimmerBar width="85%" />
                  <ShimmerBar width="40%" />
                </View>
              </View>
            ) : (
              /* ── Result ── */
              <View style={styles.resultContent}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultEmoji}>{result.emoji}</Text>
                  <View style={styles.resultTitleBlock}>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>{result.name}</Text>
                    <View style={[styles.aiBadge, { backgroundColor: Brand.primary + '1A' }]}>
                      <Text style={[styles.aiBadgeText, { color: Brand.primary }]}>AI Identified</Text>
                    </View>
                  </View>
                </View>

                {/* Servings stepper */}
                <View style={[styles.servingsRow, { borderColor: theme.border }]}>
                  <Text style={[styles.servingsLabel, { color: theme.textSecondary }]}>Servings</Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => handleServingsChange(-0.5)}
                      style={[styles.stepBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.servingsValue, { color: theme.text }]}>{servings}</Text>
                    <Pressable
                      onPress={() => handleServingsChange(0.5)}
                      style={[styles.stepBtn, { backgroundColor: theme.backgroundElement }]}>
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Macros row */}
                <View style={styles.macrosRow}>
                  {[
                    { label: 'Calories', value: adjustedMacros.calories, unit: 'kcal', color: Brand.primary },
                    { label: 'Protein', value: adjustedMacros.protein, unit: 'g', color: theme.protein },
                    { label: 'Carbs', value: adjustedMacros.carbs, unit: 'g', color: theme.carbs },
                    { label: 'Fat', value: adjustedMacros.fat, unit: 'g', color: theme.fat },
                  ].map(m => (
                    <View key={m.label} style={styles.macroCell}>
                      <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
                      <Text style={[styles.macroUnit, { color: theme.textTertiary }]}>{m.unit}</Text>
                      <Text style={[styles.macroLabel, { color: theme.textSecondary }]}>{m.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Confirm button */}
                <Pressable
                  onPress={handleConfirm}
                  style={({ pressed }) => [
                    styles.confirmButton,
                    { backgroundColor: Brand.primary, opacity: pressed ? 0.85 : 1 },
                  ]}>
                  <Text style={styles.confirmText}>Confirm & Log</Text>
                </Pressable>

                <Pressable onPress={onClose} style={styles.cancelLink}>
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </Pressable>
              </View>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  card: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    paddingBottom: Spacing.nine,
    ...Shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    alignSelf: 'center',
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
  },
  loadingContent: {
    padding: Spacing.six,
    gap: Spacing.five,
  },
  loadingLabel: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  shimmerGroup: {
    gap: Spacing.three,
  },
  shimmerBar: {
    height: 16,
    borderRadius: Radius.sm,
    backgroundColor: '#E5E7EB',
  },
  resultContent: {
    padding: Spacing.six,
    gap: Spacing.five,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  resultEmoji: {
    fontSize: 36,
  },
  resultTitleBlock: {
    flex: 1,
    gap: Spacing.one,
  },
  resultTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  aiBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  servingsLabel: {
    fontSize: FontSizes.base,
    fontWeight: '500',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  stepBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: FontSizes.xl,
    fontWeight: '300',
    lineHeight: FontSizes.xl * 1.2,
  },
  servingsValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'center',
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCell: {
    alignItems: 'center',
    gap: 2,
  },
  macroValue: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
  },
  macroUnit: {
    fontSize: FontSizes.xs,
    marginTop: -2,
  },
  macroLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '500',
  },
  confirmButton: {
    height: MIN_TOUCH + 8,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  cancelText: {
    fontSize: FontSizes.sm,
    fontWeight: '500',
  },
});
