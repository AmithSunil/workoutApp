import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useCompleteIntakeMutation, useGetClientQuery } from '@/api/endpoints/trainerApi';
import { errorMessage } from '@/api/types';
import { Button, Card, Input, Screen, SkeletonCard, Text } from '@/components/ui';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';
import { spacing } from '@/theme';
import type { ClientProfile } from '@/types/models';
import { TODAY } from '@/utils/date';
import { deriveGoal } from '@/utils/goal';

type NumberKey = 'heightCm' | 'startWeightKg' | 'targetWeightKg';

const NUMBERS: Array<{ key: NumberKey; label: string; placeholder: string }> = [
  { key: 'heightCm', label: 'HEIGHT (cm)', placeholder: '170' },
  { key: 'startWeightKg', label: 'CURRENT WEIGHT (kg)', placeholder: '72.5' },
  { key: 'targetWeightKg', label: 'GOAL WEIGHT (kg)', placeholder: '68' },
];

const positive = (text: string): number | null => {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() && Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * First sign-in for a client the coach added without their body numbers.
 *
 * One scroll, not a wizard: only the numbers the coach left blank, plus free
 * text for health and diet. Goals, macros and habits stay the coach's — the
 * notes go to them as the first chat message, and completing this raises an
 * alert so they set real targets.
 */
export default function OnboardingScreen() {
  const clientId = useAppSelector((s) => s.session.userId) ?? '';
  const { data: client } = useGetClientQuery(clientId, { skip: !clientId });

  if (!client) {
    return (
      <Screen title="Welcome" tabBarPadding={false}>
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  return <IntakeForm client={client} />;
}

function IntakeForm({ client }: { client: ClientProfile }) {
  const router = useRouter();
  const tracking = useTracking();
  const [complete, state] = useCompleteIntakeMutation();

  // Only what the coach has not already set.
  const fields = NUMBERS.filter((f) => client[f.key] === null);
  const [draft, setDraft] = useState<Record<NumberKey, string>>({
    heightCm: '',
    startWeightKg: '',
    targetWeightKg: '',
  });
  const [notes, setNotes] = useState('');

  const value = (key: NumberKey) => client[key] ?? positive(draft[key]);
  const ready = fields.every((f) => positive(draft[f.key]) !== null);

  const submit = () => {
    const weight = value('startWeightKg');
    const target = value('targetWeightKg');
    if (!ready || weight === null || target === null) return;
    void complete({
      clientId: client.id,
      input: {
        heightCm: value('heightCm') ?? undefined,
        startWeightKg: weight,
        targetWeightKg: target,
        // Only used when this form supplied the goal weight; the server keeps
        // the coach's goal otherwise.
        goal: deriveGoal(weight, target),
        notes: notes.trim() || undefined,
        date: TODAY,
      },
    })
      .unwrap()
      .then(() => router.replace(routes.client.explore()))
      .catch(() => undefined);
  };

  return (
    <Screen
      title={`Welcome, ${client.name.split(' ')[0]}`}
      subtitle="A few numbers and you're in"
      tabBarPadding={false}>
      {fields.length > 0 ? (
        <Card>
          <View style={styles.form}>
            <Text variant="caption" tone="secondary">
              Your coach uses these to set your targets.
            </Text>
            {fields.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                value={draft[f.key]}
                placeholder={f.placeholder}
                keyboardType="decimal-pad"
                onChangeText={(text) => setDraft((d) => ({ ...d, [f.key]: text }))}
                error={draft[f.key].trim() && positive(draft[f.key]) === null ? 'Enter a positive number' : null}
              />
            ))}
          </View>
        </Card>
      ) : null}

      <Card>
        <View style={styles.form}>
          <Input
            label="ANYTHING YOUR COACH SHOULD KNOW? (OPTIONAL)"
            value={notes}
            onChangeText={setNotes}
            placeholder={
              tracking.nutrition
                ? 'Injuries, health conditions, foods you avoid, dietary preferences…'
                : 'Injuries, health conditions, anything that limits training…'
            }
            multiline
          />
          <Text variant="caption" tone="tertiary">
            This goes to your coach as a message, not into your profile.
          </Text>
        </View>
      </Card>

      {state.isError ? (
        <Text variant="caption" tone="danger" accessibilityRole="alert">
          {errorMessage(state.error, 'Could not save that. Check your connection and try again.')}
        </Text>
      ) : null}

      <Button
        label="Start"
        size="lg"
        fullWidth
        disabled={!ready}
        loading={state.isLoading}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
  },
});
