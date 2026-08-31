import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useGetAiSuggestionsQuery, useSearchFoodsQuery } from '@/api/endpoints/nutritionApi';
import { Button, EmptyState, SegmentedControl, Sheet, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { AiFoodSuggestion, FoodItem, MealSlot } from '@/types/models';
import { grams, kcal } from '@/utils/format';

import { MEAL_META } from './MealSection';

export interface FoodPickerSheetProps {
  visible: boolean;
  slot: MealSlot;
  onClose: () => void;
  onPickFood: (food: FoodItem, servings: number) => void;
  onPickAi: (suggestion: AiFoodSuggestion) => void;
}

type Mode = 'search' | 'ai';

/**
 * Two ways into the same log: exact search for people who know what they ate,
 * and a free-text AI parser for everyone else. The AI path always routes
 * through the confirmation card rather than writing directly.
 */
export function FoodPickerSheet({
  visible,
  slot,
  onClose,
  onPickFood,
  onPickAi,
}: FoodPickerSheetProps) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [transcript, setTranscript] = useState('');
  const [servings, setServings] = useState<Record<string, number>>({});

  const { data: foods = [], isLoading } = useSearchFoodsQuery(query, { skip: !visible });
  const { data: aiSuggestions = [] } = useGetAiSuggestionsQuery(undefined, { skip: !visible });

  /** Picks the fixture whose transcript best overlaps what the user typed. */
  const matchedSuggestion = useMemo<AiFoodSuggestion | null>(() => {
    if (!transcript.trim() || aiSuggestions.length === 0) return null;
    const words = transcript.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    let best = aiSuggestions[0];
    let bestScore = -1;
    for (const s of aiSuggestions) {
      const score = words.filter((w) => s.transcript.toLowerCase().includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return { ...best, transcript: transcript.trim() };
  }, [transcript, aiSuggestions]);

  const bump = (id: string, delta: number) =>
    setServings((prev) => ({
      ...prev,
      [id]: Math.max(0.5, Number(((prev[id] ?? 1) + delta).toFixed(1))),
    }));

  return (
    <Sheet visible={visible} onClose={onClose} title={`Add to ${MEAL_META[slot].label}`} height="82%">
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        segments={[
          { value: 'search', label: 'Search foods' },
          { value: 'ai', label: '✨ Describe it' },
        ]}
      />

      {mode === 'search' ? (
        <>
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
                  message="Try a shorter word, or describe the meal with AI instead."
                  compact
                />
              }
              renderItem={({ item }) => {
                const count = servings[item.id] ?? 1;
                return (
                  <View style={styles.foodRow}>
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
                        {grams(item.protein * count)}P
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
                    <Pressable
                      onPress={() => {
                        onPickFood(item, count);
                        setServings((prev) => ({ ...prev, [item.id]: 1 }));
                      }}
                      style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
                      accessibilityLabel={`Add ${item.name}`}>
                      <Ionicons name="add" size={16} color={colors.textOnPrimary} />
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </>
      ) : (
        <View style={styles.aiPane}>
          <Text variant="caption" tone="secondary">
            Type what you ate in plain English — the parser will break it into items and macros for
            you to confirm.
          </Text>
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            placeholder="e.g. two eggs on toast with half an avocado"
            placeholderTextColor={colors.textTertiary}
            style={styles.aiInput}
            multiline
          />
          <View style={styles.examples}>
            {['protein shake and almonds', 'chicken burrito bowl with extra rice'].map((example) => (
              <Pressable key={example} onPress={() => setTranscript(example)} style={styles.example}>
                <Ionicons name="sparkles-outline" size={12} color={colors.primary} />
                <Text variant="micro" tone="primary" numberOfLines={1}>
                  {example}
                </Text>
              </Pressable>
            ))}
          </View>
          <Button
            label="Parse with AI"
            icon="sparkles"
            fullWidth
            disabled={!matchedSuggestion}
            onPress={() => {
              if (matchedSuggestion) {
                onPickAi(matchedSuggestion);
                setTranscript('');
              }
            }}
          />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
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
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  aiPane: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  aiInput: {
    minHeight: 96,
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
    gap: spacing.sm,
  },
  example: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
