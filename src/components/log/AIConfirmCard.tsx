/**
 * AIConfirmCard – bottom-sheet that shows AI-identified food with portion adjusters.
 * Sharp radii, no shadows, monochromatic macros.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Animated } from 'react-native';

import { Brand, FontSizes, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useApp, type LoggedMeal } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

// Mock AI results pool
const MOCK_RESULTS = [
  { name: 'Grilled Chicken Breast + Rice', calories: 510, protein: 46, carbs: 54, fat: 11 },
  { name: 'Avocado Toast + Eggs', calories: 420, protein: 22, carbs: 32, fat: 24 },
  { name: 'Mixed Salad with Salmon', calories: 380, protein: 34, carbs: 12, fat: 18 },
  { name: 'Pasta Bolognese', calories: 620, protein: 36, carbs: 68, fat: 16 },
  { name: 'Greek Yogurt Bowl', calories: 310, protein: 28, carbs: 36, fat: 6 },
];

function ShimmerBar({ width }: { width: string | number }) {
  const theme = useTheme();
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
      <Animated.View
        style={[
          styles.shimmerBar,
          { width: '100%', opacity, backgroundColor: theme.backgroundElement },
        ]}
      />
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
        <View style={[styles.card, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <Pressable>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: theme.borderStrong }]} />

            {loading ? (
              /* ── Loading Shimmer ── */
              <View style={styles.loadingContent}>
                <Text style={[styles.loadingLabel, { color: theme.textSecondary }]}>
                  Analysing your meal...
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
                  <View style={styles.resultTitleBlock}>
                    <Text style={[styles.aiLabel, { color: theme.textTertiary }]}>
                      AI IDENTIFIED
                    </Text>
                    <Text style={[styles.resultTitle, { color: theme.text }]}>
                      {result.name}
                    </Text>
                  </View>
                </View>

                {/* Servings stepper */}
                <View style={[styles.servingsRow, { borderColor: theme.border }]}>
                  <Text style={[styles.servingsLabel, { color: theme.textSecondary }]}>
                    SERVINGS
                  </Text>
                  <View style={styles.stepper}>
                    <Pressable
                      onPress={() => handleServingsChange(-0.5)}
                      style={[styles.stepBtn, { borderColor: theme.border }]}>
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>−</Text>
                    </Pressable>
                    <Text style={[styles.servingsValue, { color: theme.text }]}>{servings}</Text>
                    <Pressable
                      onPress={() => handleServingsChange(0.5)}
                      style={[styles.stepBtn, { borderColor: theme.border }]}>
                      <Text style={[styles.stepBtnText, { color: theme.text }]}>+</Text>
                    </Pressable>
                  </View>
                </View>

                {/* Macros row */}
                <View style={styles.macrosRow}>
                  {[
                    { label: 'CALORIES', value: adjustedMacros.calories, unit: 'kcal' },
                    { label: 'PROTEIN', value: adjustedMacros.protein, unit: 'g' },
                    { label: 'CARBS', value: adjustedMacros.carbs, unit: 'g' },
                    { label: 'FAT', value: adjustedMacros.fat, unit: 'g' },
                  ].map(m => (
                    <View key={m.label} style={styles.macroCell}>
                      <Text style={[styles.macroValue, { color: theme.text }]}>{m.value}</Text>
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
                  <Text style={styles.confirmText}>CONFIRM & LOG</Text>
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
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    borderTopWidth: 1,
    paddingBottom: Spacing.nine,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
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
    height: 14,
    borderRadius: Radius.sm,
  },
  resultContent: {
    padding: Spacing.six,
    gap: Spacing.five,
  },
  resultHeader: {
    gap: Spacing.one,
  },
  resultTitleBlock: {
    gap: Spacing.one,
  },
  aiLabel: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
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
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
  stepBtn: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: Radius.sm,
    borderWidth: 1,
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
    fontWeight: '800',
  },
  macroUnit: {
    fontSize: FontSizes.xs,
    marginTop: -2,
  },
  macroLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  confirmButton: {
    height: MIN_TOUCH + 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: FontSizes.sm,
    fontWeight: '800',
    letterSpacing: 1.5,
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
