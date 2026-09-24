import { Redirect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import {
  useAddFoodEntriesMutation,
  useAddFoodEntryMutation,
  useGetFrequentFoodsQuery,
  useGetNutritionDayQuery,
  useGetNutritionRangeQuery,
  useRemoveFoodEntryMutation,
} from '@/api/endpoints/nutritionApi';
import { CalorieGauge, MacroBars } from '@/components/charts';
import { DateStrip } from '@/components/common/DateStrip';
import { AiConfirmationCard } from '@/components/nutrition/AiConfirmationCard';
import { FoodPickerSheet } from '@/components/nutrition/FoodPickerSheet';
import { MealSection } from '@/components/nutrition/MealSection';
import { QuickAddCarousel } from '@/components/nutrition/QuickAddCarousel';
import { Card, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activeDateChanged } from '@/store/slices/sessionSlice';
import { pendingMealSlotChanged } from '@/store/slices/uiSlice';
import { colors, spacing } from '@/theme';
import type { AiFoodSuggestion, FoodEntry, FoodItem, MealSlot } from '@/types/models';
import { TODAY, friendlyDate, longDate } from '@/utils/date';
import { kcal } from '@/utils/format';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Nutrition logging: gauge, quick-add, AI parse, and the meal ledger. */
/** Only reachable while the client's coach tracks nutrition — a deep link lands on home. */
export default function LogRoute() {
  return useTracking().nutrition ? <LogScreen /> : <Redirect href={routes.client.explore()} />;
}

function LogScreen() {
  const dispatch = useAppDispatch();
  const { clientId } = useSession();
  const activeDate = useAppSelector((s) => s.session.activeDate);
  const pendingSlot = useAppSelector((s) => s.ui.pendingMealSlot);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiFoodSuggestion | null>(null);

  const day = useGetNutritionDayQuery(
    { clientId: clientId ?? '', date: activeDate },
    { skip: !clientId }
  );
  const range = useGetNutritionRangeQuery({ clientId: clientId ?? '', days: 14 }, { skip: !clientId });
  const { data: frequent = [] } = useGetFrequentFoodsQuery();

  const [addEntry] = useAddFoodEntryMutation();
  const [addEntries, addEntriesState] = useAddFoodEntriesMutation();
  const [removeEntry] = useRemoveFoodEntryMutation();

  const markedDates = useMemo(
    () => (range.data ?? []).filter((d) => d.consumed.calories > 0).map((d) => d.date),
    [range.data]
  );

  const entriesBySlot = useMemo(() => {
    const map: Record<MealSlot, FoodEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const entry of day.data?.entries ?? []) map[entry.slot].push(entry);
    return map;
  }, [day.data]);

  const openPicker = useCallback(
    (slot: MealSlot) => {
      dispatch(pendingMealSlotChanged(slot));
      setPickerOpen(true);
    },
    [dispatch]
  );

  const quickAdd = useCallback(
    (food: FoodItem, servings = 1, slot: MealSlot = pendingSlot, source: FoodEntry['source'] = 'quick-add') => {
      if (!clientId) return;
      void addEntry({
        clientId,
        date: activeDate,
        slot,
        foodId: food.id,
        name: food.name,
        servings,
        calories: Math.round(food.calories * servings),
        protein: Math.round(food.protein * servings),
        carbs: Math.round(food.carbs * servings),
        fat: Math.round(food.fat * servings),
        source,
      });
    },
    [addEntry, activeDate, clientId, pendingSlot]
  );

  const confirmAi = useCallback(() => {
    if (!clientId || !aiSuggestion) return;
    void addEntries({
      clientId,
      date: activeDate,
      entries: aiSuggestion.items.map((item) => ({
        clientId,
        date: activeDate,
        slot: pendingSlot,
        foodId: `ai-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.name,
        servings: item.servings,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source: 'ai' as const,
      })),
    }).then(() => setAiSuggestion(null));
  }, [addEntries, activeDate, aiSuggestion, clientId, pendingSlot]);

  /** Infers the meal slot from the time of day for one-tap quick adds. */
  const slotForNow = (): MealSlot => {
    const hour = new Date().getHours();
    if (hour < 11) return 'breakfast';
    if (hour < 16) return 'lunch';
    if (hour < 21) return 'dinner';
    return 'snack';
  };

  return (
    <>
      <Screen
        title="Nutrition"
        subtitle={activeDate === TODAY ? longDate(TODAY) : longDate(activeDate)}
        refreshControl={
          <RefreshControl refreshing={day.isFetching} onRefresh={() => void day.refetch()} />
        }>
        <DateStrip
          value={activeDate}
          onChange={(date) => dispatch(activeDateChanged(date))}
          markedDates={markedDates}
        />

        {day.isLoading || !day.data ? (
          <SkeletonCard lines={5} />
        ) : (
          <Card>
            <View style={styles.gaugeWrap}>
              <CalorieGauge
                consumed={day.data.consumed.calories}
                target={day.data.targets.calories}
              />
            </View>
            <View style={styles.macros}>
              <MacroBars consumed={day.data.consumed} targets={day.data.targets} />
            </View>
            <View style={styles.summary}>
              <Text variant="micro" tone="tertiary">
                {friendlyDate(activeDate).toUpperCase()} ·{' '}
                {kcal(day.data.consumed.calories)} of {kcal(day.data.targets.calories)} kcal logged
              </Text>
            </View>
          </Card>
        )}

        {aiSuggestion ? (
          <AiConfirmationCard
            suggestion={aiSuggestion}
            busy={addEntriesState.isLoading}
            onConfirm={confirmAi}
            onDismiss={() => setAiSuggestion(null)}
            onRemoveItem={(index) =>
              setAiSuggestion((prev) =>
                prev ? { ...prev, items: prev.items.filter((_, i) => i !== index) } : prev
              )
            }
          />
        ) : null}

        <SectionHeader title="Quick add" caption="Your most-logged foods" />
        <QuickAddCarousel
          foods={frequent}
          onAdd={(food) => quickAdd(food, 1, slotForNow())}
          onBrowse={() => openPicker(slotForNow())}
        />

        <SectionHeader title="Meals" caption="Tap + to add to a meal" />
        {SLOTS.map((slot) => (
          <MealSection
            key={slot}
            slot={slot}
            entries={entriesBySlot[slot]}
            onAdd={openPicker}
            onRemove={(entry) =>
              clientId &&
              void removeEntry({ id: entry.id, clientId, date: activeDate })
            }
          />
        ))}
      </Screen>

      <FoodPickerSheet
        visible={pickerOpen}
        slot={pendingSlot}
        onClose={() => setPickerOpen(false)}
        onPickFood={(food, servings) => quickAdd(food, servings, pendingSlot, 'search')}
        onPickAi={(suggestion) => {
          setAiSuggestion(suggestion);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gaugeWrap: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  macros: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summary: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
