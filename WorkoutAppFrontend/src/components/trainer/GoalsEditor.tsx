import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useUpdateClientMutation } from '@/api/endpoints/trainerApi';
import { Button, Input, SegmentedControl, Sheet, Text } from '@/components/ui';
import { spacing } from '@/theme';
import type { ClientProfile } from '@/types/models';
import { GOAL_SEGMENTS, deriveGoal } from '@/utils/goal';

export interface GoalsEditorProps {
  client: ClientProfile;
  /** Latest weigh-in. Falls back to the joining weight; null for an invited client with neither. */
  currentWeightKg: number | null;
  onClose: () => void;
}

/** Every field is one positive number, so one list drives the form and the save. */
const FIELDS = [
  { key: 'weight', label: 'Goal weight', unit: 'kg', decimal: true },
  { key: 'calories', label: 'Calories', unit: 'kcal', decimal: false },
  { key: 'protein', label: 'Protein', unit: 'g', decimal: false },
  { key: 'carbs', label: 'Carbs', unit: 'g', decimal: false },
  { key: 'fat', label: 'Fat', unit: 'g', decimal: false },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];

/**
 * The coach setting one client's goals: where the scale should land, what they
 * eat to get there, and which of the two the programme is actually about.
 *
 * Unlike `HabitEditor` this saves behind a button rather than on blur. Macros
 * are set as a set, and a half-applied one — new protein against yesterday's
 * calorie target — is a number the client would actually be held to in between.
 *
 * Mounted only while open, so every open re-seeds from the server copy and
 * there is no draft state to reset.
 */
export function GoalsEditor({ client, currentWeightKg, onClose }: GoalsEditorProps) {
  const [updateClient, saving] = useUpdateClientMutation();
  const [draft, setDraft] = useState<Record<FieldKey, string>>({
    weight: client.targetWeightKg === null ? '' : String(client.targetWeightKg),
    calories: String(client.targets.calories),
    protein: String(client.targets.protein),
    carbs: String(client.targets.carbs),
    fat: String(client.targets.fat),
  });
  const [goal, setGoal] = useState(client.goal);
  // The goal tracks the goal weight until the coach states one of their own —
  // after that it is theirs for the rest of the sheet, or it would snap back
  // under them the next time they corrected a digit.
  const [pinned, setPinned] = useState(false);

  const current = currentWeightKg ?? client.startWeightKg;

  const values = FIELDS.map((f) => Number(draft[f.key].trim() || NaN));
  const bad = values.map(
    (n, i) => !(Number.isFinite(n) && n > 0) || (!FIELDS[i].decimal && !Number.isInteger(n))
  );
  const [weight, calories, protein, carbs, fat] = values;

  const edit = (key: FieldKey, text: string) => {
    setDraft((d) => ({ ...d, [key]: text }));
    if (key !== 'weight' || pinned) return;
    const target = Number(text.trim() || NaN);
    if (current !== null && Number.isFinite(target) && target > 0) setGoal(deriveGoal(current, target));
  };

  const save = () => {
    if (bad.some(Boolean)) return;
    void updateClient({
      id: client.id,
      patch: { goal, targetWeightKg: weight, targets: { calories, protein, carbs, fat } },
    })
      .unwrap()
      .then(onClose)
      // The inline error below reports it; an unhandled rejection would not.
      .catch(() => undefined);
  };

  const field = (key: FieldKey, style?: object) => {
    const i = FIELDS.findIndex((f) => f.key === key);
    const f = FIELDS[i];
    return (
      <Input
        label={f.label}
        suffix={f.unit}
        value={draft[key]}
        onChangeText={(text) => edit(key, text)}
        keyboardType={f.decimal ? 'decimal-pad' : 'number-pad'}
        returnKeyType="done"
        selectTextOnFocus
        containerStyle={style}
        error={bad[i] ? (f.decimal ? 'Enter a number' : 'Whole number') : null}
      />
    );
  };

  // The macros imply a calorie number of their own; say so when it drifts
  // from the target the coach typed, rather than silently saving both.
  const macroKcal = [protein, carbs, fat].every(Number.isFinite)
    ? Math.round(protein * 4 + carbs * 4 + fat * 9)
    : null;
  const drift = macroKcal !== null && Number.isFinite(calories) ? macroKcal - calories : 0;

  return (
    <Sheet visible onClose={onClose} title="Goals" height="88%">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}>
        <Text variant="caption" tone="secondary">
          Days already logged keep the targets they were held to. New ones apply from today.
        </Text>

        {/* Where the scale should land, and what that makes the programme */}
        <View style={styles.group}>
          <Text variant="h2">Body</Text>
          {field('weight')}
          <View style={styles.goal}>
            <SegmentedControl
              value={goal}
              segments={GOAL_SEGMENTS}
              size="sm"
              onChange={(value) => {
                setGoal(value);
                setPinned(true);
              }}
            />
            <Text variant="caption" tone="tertiary">
              {current === null
                ? 'No weigh-in yet, so pick the goal yourself.'
                : pinned
                  ? `Set by you · ${current.toFixed(1)} kg today`
                  : `Follows the goal weight against ${current.toFixed(1)} kg today. Tap one to fix it.`}
            </Text>
          </View>
        </View>

        {/* What they eat to get there */}
        <View style={styles.group}>
          <Text variant="h2">Daily targets</Text>
          {field('calories')}
          <View style={styles.row}>
            {field('protein', styles.cell)}
            {field('carbs', styles.cell)}
            {field('fat', styles.cell)}
          </View>
          {macroKcal !== null ? (
            <Text variant="caption" tone={Math.abs(drift) > 50 ? 'warning' : 'tertiary'}>
              Macros add up to {macroKcal.toLocaleString('en-US')} kcal
              {Math.abs(drift) > 50
                ? ` — ${Math.abs(drift)} ${drift > 0 ? 'over' : 'under'} the calorie target`
                : ''}
            </Text>
          ) : null}
        </View>

        {saving.isError ? (
          <Text variant="caption" tone="danger">
            Could not save that. Check the numbers and try again.
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Save goals"
          size="lg"
          fullWidth
          loading={saving.isLoading}
          disabled={bad.some(Boolean) || saving.isLoading}
          onPress={save}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  group: {
    gap: spacing.md,
  },
  goal: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cell: {
    flex: 1,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
