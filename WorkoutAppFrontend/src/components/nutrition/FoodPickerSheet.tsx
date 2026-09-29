import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { useParseMealMutation, useSearchFoodsQuery } from '@/api/endpoints/nutritionApi';
import { errorMessage } from '@/api/types';
import {
  Button,
  Chip,
  EmptyState,
  PressableScale,
  SegmentedControl,
  Sheet,
  Skeleton,
  Text,
} from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { AiFoodSuggestion, FoodItem, MealSlot } from '@/types/models';
import { grams, kcal } from '@/utils/format';

import { AiConfirmationCard, type AiItem } from './AiConfirmationCard';
import { MEAL_META } from './MealSection';
import { pickMealPhoto, type MealPhoto } from './mealPhoto';

/** What the sheet opens on: a tab, or a photo already taken — which starts analysing at once. */
export type PickerStart = 'search' | 'describe' | MealPhoto;

export interface FoodPickerSheetProps {
  visible: boolean;
  start: PickerStart;
  slot: MealSlot;
  /** The meal row at the top of the sheet — lets the user fix a guessed slot. */
  onSlotChange: (slot: MealSlot) => void;
  onClose: () => void;
  onPickFood: (food: FoodItem, servings: number) => void;
  /** Resolves true once saved; the sheet closes itself then. */
  onLogAi: (items: AiItem[]) => Promise<boolean>;
}

type Mode = 'search' | 'ai';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
/** How long a row shows its ✓ after being added. */
const ADDED_MS = 1400;
const EXAMPLES = ['2 idli with sambar', 'chicken biryani and raita', 'protein shake'];

/**
 * Every way into the log, with as few taps as possible:
 *
 * - Search: tapping a food row adds it straight away; the row flashes a ✓ and
 *   the footer counts what has gone in, so several foods land in one visit.
 * - AI: a photo starts analysing the moment it is taken — no extra button —
 *   and the review (sliders + one "Log to Lunch" button) happens right here in
 *   the sheet. A description works the same way, and a detail typed on the
 *   review ("cooked in ghee") re-runs it with the same photo.
 *
 * The meal is pre-set from the time of day and stays editable at the top.
 */
export function FoodPickerSheet({
  visible,
  start,
  slot,
  onSlotChange,
  onClose,
  onPickFood,
  onLogAi,
}: FoodPickerSheetProps) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [servings, setServings] = useState<Record<string, number>>({});
  const [addedCount, setAddedCount] = useState(0);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [transcript, setTranscript] = useState('');
  const [photo, setPhoto] = useState<MealPhoto | null>(null);
  const [suggestion, setSuggestion] = useState<AiFoodSuggestion | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [logging, setLogging] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [parseMeal] = useParseMealMutation();
  // Bumped on every reset and every run, so a reply that lands after the user
  // closed the sheet or asked again is dropped instead of shown.
  const run = useRef(0);

  const analyse = async (withPhoto: MealPhoto | null, text: string) => {
    const mine = ++run.current;
    setAiError(null);
    setAnalysing(true);
    try {
      const result = await parseMeal({
        text: text.trim(),
        image: withPhoto && { base64: withPhoto.base64, mimeType: withPhoto.mimeType },
      }).unwrap();
      if (mine === run.current) setSuggestion(result);
    } catch (e) {
      if (mine === run.current) setAiError(errorMessage(e, 'Could not analyse that meal — try again.'));
    } finally {
      if (mine === run.current) setAnalysing(false);
    }
  };

  // Each visit starts clean, on the tab (or photo) it was opened for.
  useEffect(() => {
    if (!visible) return;
    run.current++;
    setAddedCount(0);
    setJustAdded(null);
    setTranscript('');
    setSuggestion(null);
    setAnalysing(false);
    setAiError(null);
    setMode(start === 'search' ? 'search' : 'ai');
    const startPhoto = typeof start === 'object' ? start : null;
    setPhoto(startPhoto);
    if (startPhoto) void analyse(startPhoto, '');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [visible, start]);

  const add = (item: FoodItem) => {
    onPickFood(item, servings[item.id] ?? 1);
    setServings((prev) => ({ ...prev, [item.id]: 1 }));
    setAddedCount((n) => n + 1);
    setJustAdded(item.id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(null), ADDED_MS);
  };

  const { data: foods = [], isLoading } = useSearchFoodsQuery(query, { skip: !visible });

  const choosePhoto = async (camera: boolean) => {
    setAiError(null);
    const picked = await pickMealPhoto(camera);
    if (typeof picked === 'string') return setAiError(picked);
    if (!picked) return;
    setPhoto(picked);
    void analyse(picked, transcript);
  };

  const log = async (items: AiItem[]) => {
    setLogging(true);
    const ok = await onLogAi(items);
    setLogging(false);
    if (ok) onClose();
    else setAiError('Could not save that — try again.');
  };

  const startOver = () => {
    run.current++;
    setSuggestion(null);
    setPhoto(null);
    setTranscript('');
    setAnalysing(false);
    setAiError(null);
  };

  const bump = (id: string, delta: number) =>
    setServings((prev) => ({
      ...prev,
      [id]: Math.max(0.5, Number(((prev[id] ?? 1) + delta).toFixed(1))),
    }));

  const errorRow = aiError ? (
    <View style={styles.error}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text variant="caption" tone="danger" style={styles.foodText}>
        {aiError}
      </Text>
    </View>
  ) : null;

  return (
    <Sheet visible={visible} onClose={onClose} title="Log food" height="90%">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.slotsScroll}
        contentContainerStyle={styles.slots}>
        {SLOTS.map((s) => (
          <Chip
            key={s}
            label={MEAL_META[s].label}
            selected={s === slot}
            accent={colors.surfaceInk}
            onPress={() => onSlotChange(s)}
          />
        ))}
      </ScrollView>

      {/* The tabs go once there is an AI result — the review owns the sheet until it's logged or dropped. */}
      {suggestion ? null : (
        <SegmentedControl<Mode>
          value={mode}
          onChange={setMode}
          segments={[
            { value: 'ai', label: '✨ Snap or describe' },
            { value: 'search', label: 'Search foods' },
          ]}
        />
      )}

      {mode === 'search' ? (
        <View style={styles.pane}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={16} color={colors.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Chicken, oats, protein bar…"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.borderStrong} />
              </Pressable>
            ) : null}
          </View>

          {isLoading ? (
            <View style={styles.loading}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} height={54} radius={12} />
              ))}
            </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <EmptyState
                  icon="search-outline"
                  title="No matches"
                  message="Try a shorter word, or snap / describe it instead."
                  compact
                />
              }
              renderItem={({ item }) => {
                const count = servings[item.id] ?? 1;
                const added = justAdded === item.id;
                return (
                  <PressableScale
                    onPress={() => add(item)}
                    scaleTo={0.985}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${item.name} to ${MEAL_META[slot].label}`}
                    style={styles.foodRow}>
                    <View style={styles.emojiWrap}>
                      <Text style={styles.emoji}>{item.emoji}</Text>
                    </View>
                    <View style={styles.foodText}>
                      <Text variant="body" numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="micro" tone="tertiary" numberOfLines={1}>
                        {item.brand ? `${item.brand} · ` : ''}
                        {item.servingLabel} · {kcal(item.calories * count)} kcal ·{' '}
                        {grams(item.protein * count)} protein
                      </Text>
                    </View>
                    <View style={styles.stepper}>
                      <Pressable onPress={() => bump(item.id, -0.5)} hitSlop={6} style={styles.stepBtn}>
                        <Ionicons name="remove" size={13} color={colors.textSecondary} />
                      </Pressable>
                      <Text variant="micro" style={styles.stepValue}>
                        {count}
                      </Text>
                      <Pressable onPress={() => bump(item.id, 0.5)} hitSlop={6} style={styles.stepBtn}>
                        <Ionicons name="add" size={13} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                    <View style={[styles.addBtn, added && styles.addBtnDone]}>
                      <Ionicons
                        name={added ? 'checkmark' : 'add'}
                        size={18}
                        color={added ? colors.textOnPrimary : colors.primaryText}
                      />
                    </View>
                  </PressableScale>
                );
              }}
            />
          )}

          {addedCount > 0 ? (
            <View style={styles.footer}>
              <View style={styles.footerText}>
                <Text variant="bodyStrong">
                  {addedCount} added to {MEAL_META[slot].label}
                </Text>
                <Text variant="caption" tone="tertiary">
                  Keep tapping to add more
                </Text>
              </View>
              <Button label="Done" onPress={onClose} />
            </View>
          ) : null}
        </View>
      ) : suggestion ? (
        <View style={styles.aiReview}>
          <View style={styles.refine}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.thumb} /> : null}
            <TextInput
              value={transcript}
              onChangeText={setTranscript}
              placeholder={photo ? 'Add a detail, e.g. cooked in ghee' : 'Describe the meal'}
              placeholderTextColor={colors.textTertiary}
              style={styles.refineInput}
              returnKeyType="send"
              onSubmitEditing={() => transcript.trim() && void analyse(photo, transcript)}
            />
            {transcript.trim() && transcript.trim() !== suggestion.transcript ? (
              <Pressable
                onPress={() => void analyse(photo, transcript)}
                style={styles.refineBtn}
                accessibilityRole="button"
                accessibilityLabel="Re-analyse with this detail">
                <Ionicons name="refresh" size={16} color={colors.primaryText} />
              </Pressable>
            ) : (
              <Pressable
                onPress={startOver}
                style={styles.refineBtn}
                accessibilityRole="button"
                accessibilityLabel="Start over">
                <Ionicons name="close" size={16} color={colors.primaryText} />
              </Pressable>
            )}
          </View>
          {errorRow}
          <AiConfirmationCard
            key={suggestion.id}
            suggestion={suggestion}
            slotLabel={MEAL_META[slot].label}
            busy={logging}
            onConfirm={(items) => void log(items)}
          />
        </View>
      ) : analysing ? (
        <View style={styles.analysing}>
          {photo ? (
            <View>
              <Image source={{ uri: photo.uri }} style={styles.photo} accessibilityLabel="Your meal photo" />
              <View style={styles.photoOverlay}>
                <ActivityIndicator color={colors.textInverse} />
                <Text variant="label" color={colors.textInverse}>
                  Reading your meal…
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.analysingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text variant="label" tone="secondary">
                Reading your meal…
              </Text>
            </View>
          )}
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={72} radius={radius.md} />
          ))}
        </View>
      ) : (
        <ScrollView
          style={styles.pane}
          contentContainerStyle={styles.aiPane}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.photoRow}>
            <PressableScale
              onPress={() => void choosePhoto(true)}
              accessibilityRole="button"
              style={styles.photoTile}>
              <Ionicons name="camera" size={26} color={colors.primaryText} />
              <Text variant="label" tone="primary">
                Take a photo
              </Text>
            </PressableScale>
            <PressableScale
              onPress={() => void choosePhoto(false)}
              accessibilityRole="button"
              style={[styles.photoTile, styles.photoTileAlt]}>
              <Ionicons name="images" size={26} color={colors.textSecondary} />
              <Text variant="label" tone="secondary">
                Upload one
              </Text>
            </PressableScale>
          </View>

          <Text variant="caption" tone="tertiary">
            Or type what you ate — add a detail like “cooked in ghee” before taking the photo and it’s used too.
          </Text>
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            placeholder="e.g. two eggs on toast with half an avocado"
            placeholderTextColor={colors.textTertiary}
            style={styles.aiInput}
            autoFocus={start === 'describe'}
            maxLength={1000}
            multiline
          />
          {transcript ? null : (
            <View style={styles.examples}>
              {EXAMPLES.map((example) => (
                <Pressable key={example} onPress={() => setTranscript(example)} style={styles.example}>
                  <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                  <Text variant="micro" tone="primary">
                    {example}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {errorRow}
          <Button
            label="Analyse"
            icon="sparkles"
            size="lg"
            fullWidth
            disabled={!transcript.trim()}
            onPress={() => void analyse(null, transcript)}
          />
        </ScrollView>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  slotsScroll: {
    flexGrow: 0,
    marginHorizontal: -spacing.xl,
    marginBottom: spacing.md,
  },
  slots: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  pane: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  footerText: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  loading: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  emojiWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 17,
  },
  foodText: {
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    gap: 2,
  },
  stepBtn: {
    width: 22,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 20,
    textAlign: 'center',
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: {
    backgroundColor: colors.success,
  },
  aiPane: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  aiReview: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoTile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  photoTileAlt: {
    backgroundColor: colors.surface,
  },
  aiInput: {
    minHeight: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
    textAlignVertical: 'top',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  examples: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  analysing: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  photoOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  analysingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceMuted,
  },
  refineInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  refineBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
