import { Redirect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import type { AiItem } from '@/components/nutrition/AiConfirmationCard';
import { FoodPickerSheet, type PickerStart } from '@/components/nutrition/FoodPickerSheet';
import { MEAL_META, MealSection } from '@/components/nutrition/MealSection';
import { NutritionSummary } from '@/components/nutrition/NutritionSummary';
import { pickMealPhoto } from '@/components/nutrition/mealPhoto';
import { QuickAddCarousel } from '@/components/nutrition/QuickAddCarousel';
import { PressableScale, Screen, SectionHeader, SkeletonCard, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { activeDateChanged } from '@/store/slices/sessionSlice';
import { pendingMealSlotChanged } from '@/store/slices/uiSlice';
import { colors, radius, spacing } from '@/theme';
import type { FoodEntry, FoodItem, MealSlot } from '@/types/models';
import { TODAY, friendlyDate, longDate } from '@/utils/date';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** The four ways in, one tap each. Snap is first and filled: it's the fastest. */
const LOG_ACTIONS = [
  { label: 'Snap', icon: 'camera', start: 'camera', hint: 'Take a photo of your meal' },
  { label: 'Upload', icon: 'images', start: 'library', hint: 'Upload a photo of your meal' },
  { label: 'Describe', icon: 'chatbubble-ellipses', start: 'describe', hint: 'Describe your meal' },
  { label: 'Search', icon: 'search', start: 'search', hint: 'Search foods' },
] as const;

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
  const [pickerStart, setPickerStart] = useState<PickerStart>('search');
  const [photoError, setPhotoError] = useState<string | null>(null);

  const day = useGetNutritionDayQuery(
    { clientId: clientId ?? '', date: activeDate },
    { skip: !clientId }
  );
  const range = useGetNutritionRangeQuery({ clientId: clientId ?? '', days: 14 }, { skip: !clientId });
  const { data: frequent = [] } = useGetFrequentFoodsQuery();

  const [addEntry] = useAddFoodEntryMutation();
  const [addEntries] = useAddFoodEntriesMutation();
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
    (slot: MealSlot, start: PickerStart = 'search') => {
      dispatch(pendingMealSlotChanged(slot));
      setPickerStart(start);
      setPickerOpen(true);
    },
    [dispatch]
  );

  /** Camera / library straight from the screen — the sheet opens already analysing. */
  const snap = async (camera: boolean) => {
    setPhotoError(null);
    const picked = await pickMealPhoto(camera);
    if (typeof picked === 'string') setPhotoError(picked);
    else if (picked) openPicker(slotForNow(), picked);
  };

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

  const confirmAi = useCallback((items: AiItem[]): Promise<boolean> => {
    if (!clientId || items.length === 0) return Promise.resolve(false);
    return addEntries({
      clientId,
      date: activeDate,
      entries: items.map((item) => ({
        clientId,
        date: activeDate,
        slot: pendingSlot,
        // Not a catalogue food: '' reaches Postgres as a null food_id.
        foodId: '',
        // ponytail: the weight rides in the name; add a grams column if anything needs to query it.
        name: `${item.name} · ${item.grams} g`,
        servings: 1,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        source: 'ai' as const,
      })),
      // False keeps the review open, so the re-weighed items aren't lost.
    }).then((r) => !r.error);
  }, [addEntries, activeDate, clientId, pendingSlot]);

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

        <View style={styles.section}>
          <SectionHeader title="Log a meal" caption={`Adds to ${MEAL_META[slotForNow()].label}`} />
          <View style={styles.actions}>
            {LOG_ACTIONS.map((a, i) => (
              <PressableScale
                key={a.label}
                onPress={() =>
                  a.start === 'camera' || a.start === 'library'
                    ? void snap(a.start === 'camera')
                    : openPicker(slotForNow(), a.start)
                }
                accessibilityRole="button"
                accessibilityLabel={a.hint}
                style={[styles.action, i === 0 && styles.actionPrimary]}>
                <Ionicons
                  name={a.icon}
                  size={24}
                  color={i === 0 ? colors.textOnPrimary : colors.primaryText}
                />
                <Text variant="label" color={i === 0 ? colors.textOnPrimary : colors.text}>
                  {a.label}
                </Text>
              </PressableScale>
            ))}
          </View>
          {photoError ? (
            <Text variant="caption" tone="danger">
              {photoError}
            </Text>
          ) : null}
        </View>

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
        start={pickerStart}
        onLogAi={confirmAi}
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
});
