/**
 * Tab 4: Progress – The Vault
 * Media gallery, metrics charts, weekly check-in, and messaging FAB.
 */
import { useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetricsChart, type DataPoint } from '@/components/progress/MetricsChart';
import { MessagingFAB } from '@/components/progress/MessagingFAB';
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

// ─── Mock gallery data ────────────────────────────────────────────────────────
const GALLERY_ITEMS = [
  { id: '1', emoji: '🍗', label: 'Chicken & Rice', date: 'Aug 1', aspect: 1 },
  { id: '2', emoji: '🥗', label: 'Salad Bowl', date: 'Jul 31', aspect: 1.2 },
  { id: '3', emoji: '💪', label: 'Week 12 Front', date: 'Jul 28', aspect: 0.8 },
  { id: '4', emoji: '🍳', label: 'Breakfast', date: 'Jul 30', aspect: 1 },
  { id: '5', emoji: '🐟', label: 'Salmon Plate', date: 'Jul 29', aspect: 1.1 },
  { id: '6', emoji: '💪', label: 'Week 12 Side', date: 'Jul 28', aspect: 0.8 },
  { id: '7', emoji: '🥤', label: 'Post-Workout', date: 'Jul 27', aspect: 1 },
  { id: '8', emoji: '🥩', label: 'Steak Dinner', date: 'Jul 26', aspect: 1.2 },
];

// ─── Gallery ─────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const COL_GAP = 8;
const COL_W = (Math.min(SCREEN_W, MaxContentWidth) - Spacing.five * 2 - COL_GAP) / 2;

function GalleryGrid() {
  const theme = useTheme();
  // Split into two columns
  const col1 = GALLERY_ITEMS.filter((_, i) => i % 2 === 0);
  const col2 = GALLERY_ITEMS.filter((_, i) => i % 2 === 1);

  function GalleryItem({ item }: { item: typeof GALLERY_ITEMS[0] }) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.galleryItem,
          {
            backgroundColor: theme.backgroundElement,
            height: COL_W * item.aspect,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Text style={styles.galleryEmoji}>{item.emoji}</Text>
        <View style={[styles.galleryLabel, { backgroundColor: '#00000055' }]}>
          <Text style={styles.galleryLabelText}>{item.label}</Text>
          <Text style={styles.galleryDate}>{item.date}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.masonryContainer}>
      <View style={[styles.masonryCol, { width: COL_W }]}>
        {col1.map(item => <GalleryItem key={item.id} item={item} />)}
      </View>
      <View style={[styles.masonryCol, { width: COL_W }]}>
        {col2.map(item => <GalleryItem key={item.id} item={item} />)}
      </View>
    </View>
  );
}

// ─── Weekly Check-In Modal ────────────────────────────────────────────────────
function CheckInModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState('');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');

  const steps = ['Weight', 'Questionnaire', 'Photos'];

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else {
      Alert.alert('✓ Check-In Saved!', 'Your weekly data has been recorded. Great work!');
      setStep(0);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.checkinContainer, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.checkinHeader, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose}>
            <Text style={[styles.checkinClose, { color: theme.textSecondary }]}>✕</Text>
          </Pressable>
          <Text style={[styles.checkinTitle, { color: theme.text }]}>Weekly Check-In</Text>
          <Text style={[styles.checkinStep, { color: Brand.primary }]}>{step + 1}/{steps.length}</Text>
        </View>

        {/* Step indicators */}
        <View style={styles.stepIndicators}>
          {steps.map((s, i) => (
            <View key={s} style={[
              styles.stepIndicator,
              { backgroundColor: i <= step ? Brand.primary : theme.backgroundElement },
            ]}>
              <Text style={[styles.stepIndicatorText, { color: i <= step ? '#fff' : theme.textTertiary }]}>
                {i + 1}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView style={styles.checkinScroll} contentContainerStyle={styles.checkinContent}>
          {step === 0 && (
            <View style={styles.checkinStep0}>
              <Text style={[styles.checkinPrompt, { color: theme.text }]}>What's your weight today?</Text>
              <Text style={[styles.checkinHint, { color: theme.textSecondary }]}>
                Weigh yourself first thing in the morning, after using the bathroom.
              </Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={[styles.weightInput, { color: theme.text, borderColor: Brand.primary }]}
                  keyboardType="decimal-pad"
                  placeholder="82.5"
                  placeholderTextColor={theme.textTertiary}
                  value={weight}
                  onChangeText={setWeight}
                />
                <Text style={[styles.weightUnit, { color: theme.textSecondary }]}>kg</Text>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.checkinStep1}>
              <Text style={[styles.checkinPrompt, { color: theme.text }]}>Quick debrief</Text>
              <View style={styles.questionBlock}>
                <Text style={[styles.questionText, { color: theme.text }]}>
                  How did your energy feel this week? Any notable highs or lows?
                </Text>
                <TextInput
                  style={[styles.questionInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  multiline
                  numberOfLines={4}
                  placeholder="Type your answer..."
                  placeholderTextColor={theme.textTertiary}
                  value={q1}
                  onChangeText={setQ1}
                  textAlignVertical="top"
                />
              </View>
              <View style={styles.questionBlock}>
                <Text style={[styles.questionText, { color: theme.text }]}>
                  Any soreness, discomfort, or areas of concern to report?
                </Text>
                <TextInput
                  style={[styles.questionInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
                  multiline
                  numberOfLines={4}
                  placeholder="All good, or describe anything..."
                  placeholderTextColor={theme.textTertiary}
                  value={q2}
                  onChangeText={setQ2}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.checkinStep2}>
              <Text style={[styles.checkinPrompt, { color: theme.text }]}>Progress Photos</Text>
              <Text style={[styles.checkinHint, { color: theme.textSecondary }]}>
                Use the ghosted overlay of last week's photos for perfect alignment.
              </Text>
              <View style={styles.photoGrid}>
                {['Front', 'Side', 'Back'].map(angle => (
                  <Pressable
                    key={angle}
                    style={[styles.photoSlot, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                    <Text style={styles.photoIcon}>📸</Text>
                    <Text style={[styles.photoLabel, { color: theme.textSecondary }]}>{angle}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.checkinFooter, { paddingBottom: Math.max(insets.bottom, Spacing.five) }]}>
          <Pressable
            onPress={handleNext}
            style={[styles.nextButton, { backgroundColor: Brand.primary }]}>
            <Text style={styles.nextButtonText}>
              {step < steps.length - 1 ? 'Continue →' : 'Submit Check-In ✓'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Progress Screen ──────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state } = useApp();
  const [checkInOpen, setCheckInOpen] = useState(false);
  const weightData: DataPoint[] = state.weightHistory.map(w => ({ date: w.date, value: w.weight }));
  const adherenceData: DataPoint[] = state.adherenceHistory.map(a => ({ date: a.date, value: a.value }));

  const platformPadding = Platform.select({
    android: { paddingTop: insets.top },
    web: { paddingTop: Spacing.six },
    default: {},
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInset={{ bottom: insets.bottom + BottomTabInset + 80 }}
        contentContainerStyle={[styles.contentContainer, platformPadding]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.inner}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Progress</Text>
            <Pressable
              onPress={() => setCheckInOpen(true)}
              style={({ pressed }) => [
                styles.checkInButton,
                { backgroundColor: Brand.primary, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Text style={styles.checkInButtonText}>📊 Weekly Check-In</Text>
            </Pressable>
          </View>

          {/* ── Metrics Charts ── */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Metrics</Text>
            <MetricsChart
              title="Bodyweight"
              data={weightData}
              color={Brand.primary}
              unit="kg"
              latestLabel="This week"
            />
            <MetricsChart
              title="Adherence"
              data={adherenceData}
              color="#16A34A"
              unit="%"
              latestLabel="Plan adherence"
            />
          </View>

          {/* ── Media Gallery ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Media Gallery</Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                {GALLERY_ITEMS.length} items
              </Text>
            </View>
            <GalleryGrid />
          </View>
        </View>
      </ScrollView>

      {/* Floating messaging button */}
      <MessagingFAB />

      {/* Weekly check-in modal */}
      <CheckInModal visible={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inner: {
    flex: 1,
    maxWidth: MaxContentWidth,
    paddingTop: Spacing.five,
    gap: Spacing.seven,
  },
  header: {
    paddingHorizontal: Spacing.five,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  screenTitle: {
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
  },
  checkInButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two + 2,
    borderRadius: Radius.xl,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  checkInButtonText: {
    color: '#fff',
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  section: {
    gap: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.five,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    paddingHorizontal: Spacing.five,
  },
  sectionCount: {
    fontSize: FontSizes.sm,
  },
  // Gallery
  masonryContainer: {
    flexDirection: 'row',
    gap: COL_GAP,
    paddingHorizontal: Spacing.five,
  },
  masonryCol: {
    gap: COL_GAP,
  },
  galleryItem: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryEmoji: {
    fontSize: 40,
  },
  galleryLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.two,
  },
  galleryLabelText: {
    color: '#fff',
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  galleryDate: {
    color: '#ffffff99',
    fontSize: 10,
  },
  // Check-in modal
  checkinContainer: {
    flex: 1,
  },
  checkinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
  },
  checkinClose: {
    fontSize: FontSizes.lg,
    fontWeight: '300',
    width: 44,
    textAlign: 'center',
  },
  checkinTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  checkinStep: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    width: 44,
    textAlign: 'right',
  },
  stepIndicators: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    justifyContent: 'center',
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  checkinScroll: { flex: 1 },
  checkinContent: {
    padding: Spacing.five,
    gap: Spacing.five,
  },
  checkinPrompt: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.two,
  },
  checkinHint: {
    fontSize: FontSizes.sm,
    lineHeight: FontSizes.sm * 1.5,
    marginBottom: Spacing.four,
  },
  checkinStep0: { gap: Spacing.two },
  checkinStep1: { gap: Spacing.five },
  checkinStep2: { gap: Spacing.four },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  weightInput: {
    fontSize: 64,
    fontWeight: '800',
    borderBottomWidth: 3,
    paddingBottom: Spacing.two,
    minWidth: 160,
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: FontSizes['2xl'],
    fontWeight: '600',
    marginTop: 16,
  },
  questionBlock: {
    gap: Spacing.two,
  },
  questionText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    lineHeight: FontSizes.base * 1.4,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    fontSize: FontSizes.base,
    minHeight: 100,
  },
  photoGrid: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 3 / 4,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  photoIcon: {
    fontSize: 28,
  },
  photoLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  checkinFooter: {
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.three,
  },
  nextButton: {
    height: MIN_TOUCH + 8,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
