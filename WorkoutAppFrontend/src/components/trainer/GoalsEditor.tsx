import { Fragment, useState } from 'react';
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
  { key: 'weight', label: 'GOAL WEIGHT', unit: 'kg', decimal: true },
  { key: 'calories', label: 'CALORIES', unit: 'kcal', decimal: false },
  { key: 'protein', label: 'PROTEIN', unit: 'g', decimal: false },
  { key: 'carbs', label: 'CARBS', unit: 'g', decimal: false },
  { key: 'fat', label: 'FAT', unit: 'g', decimal: false },
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

  return (
    <Sheet visible onClose={onClose} title="Goals" height="86%">
      <Text variant="caption" tone="secondary" style={styles.hint}>
        What this client is working towards. Days already logged keep the targets they were held
        to — the new ones apply from today.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {FIELDS.map((field, i) => (
          <Fragment key={field.key}>
            <Input
              label={`${field.label} (${field.unit})`}
              value={draft[field.key]}
              onChangeText={(text) => edit(field.key, text)}
              keyboardType={field.decimal ? 'decimal-pad' : 'number-pad'}
              returnKeyType="done"
              selectTextOnFocus
              error={bad[i] ? (field.decimal ? 'Enter a number' : 'Enter a whole number') : null}
            />

            {field.key === 'weight' ? (
              <View style={styles.goal}>
                <Text variant="label" tone="secondary">
                  GOAL
                </Text>
                <SegmentedControl
                  value={goal}
                  segments={GOAL_SEGMENTS}
                  size="sm"
                  onChange={(value) => {
                    setGoal(value);
                    setPinned(true);
                  }}
                />
                <Text variant="micro" tone="tertiary">
                  {current === null
                    ? 'No weigh-in yet, so pick the goal yourself.'
                    : pinned
                      ? `Set by you — ${current.toFixed(1)} kg today.`
                      : `Follows the goal weight against the ${current.toFixed(1)} kg they weigh today. Pick one to fix it.`}
                </Text>
              </View>
            ) : null}
          </Fragment>
        ))}

        <Button
          label="Save goals"
          icon="checkmark"
          fullWidth
          loading={saving.isLoading}
          disabled={bad.some(Boolean) || saving.isLoading}
          onPress={save}
        />

        {saving.isError ? (
          <Text variant="caption" tone="danger">
            Could not save that. Check the numbers and try again.
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  goal: {
    gap: spacing.sm,
  },
});
