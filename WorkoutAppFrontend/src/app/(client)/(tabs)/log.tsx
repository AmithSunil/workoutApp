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
import { DateStrip } from '@/components/common/DateStrip';
import { AiConfirmationCard } from '@/components/nutrition/AiConfirmationCard';
import { FoodPickerSheet } from '@/components/nutrition/FoodPickerSheet';
import { MEAL_META, MealSection } from '@/components/nutrition/MealSection';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { QuickAddCarousel } from '@/components/nutrition/QuickAddCarousel';
import { Button, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activeDateChanged } from '@/store/slices/sessionSlice';
import { pendingMealSlotChanged } from '@/store/slices/uiSlice';
import { spacing } from '@/theme';
import type { AiFoodSuggestion, FoodEntry, FoodItem, MealSlot } from '@/types/models';
import { TODAY, friendlyDate, longDate } from '@/utils/date';

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
        refreshControl={
          <RefreshControl refreshing={day.isFetching} onRefresh={() => void day.refetch()} />
        }>
        <View style={styles.hello}>
          <Text variant="micro" tone="tertiary">
            {longDate(activeDate).toUpperCase()}
          </Text>
          <Text variant="display">
            {activeDate === TODAY ? 'Today' : friendlyDate(activeDate)}
          </Text>
        </View>

        <DateStrip
          value={activeDate}
          onChange={(date) => dispatch(activeDateChanged(date))}
          markedDates={markedDates}
        />

        {day.isLoading || !day.data ? (
          <SkeletonCard lines={5} />
        ) : (
          <NutritionSummary
            day={day.data}
            label={activeDate === TODAY ? 'kcal left today' : 'kcal left'}
          />
        )}

        <Button
          label="Log food"
          icon="add"
          size="lg"
          fullWidth
          onPress={() => openPicker(slotForNow())}
        />

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

        <View style={styles.section}>
          <SectionHeader
            title="Quick add"
            caption={`One tap adds to ${MEAL_META[slotForNow()].label}`}
          />
          <QuickAddCarousel
            foods={frequent}
            onAdd={(food) => quickAdd(food, 1, slotForNow())}
            onBrowse={() => openPicker(slotForNow())}
          />
        </View>

        <View style={styles.section}>
          <SectionHeader title="Meals" />
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
        </View>
      </Screen>

      <FoodPickerSheet
        visible={pickerOpen}
        slot={pendingSlot}
        onSlotChange={(slot) => dispatch(pendingMealSlotChanged(slot))}
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
  hello: {
    gap: spacing.xs,
    paddingTop: spacing.lg,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
