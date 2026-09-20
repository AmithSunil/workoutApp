import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGetTrainerQuery, useInviteClientMutation } from '@/api/endpoints/trainerApi';
import { errorMessage } from '@/api/types';
import { Button, Card, Input, Screen, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { spacing } from '@/theme';
import { deriveGoal } from '@/utils/goal';
import { shareInvite } from '@/utils/invite';

const NUMBERS = [
  { key: 'heightCm', label: 'HEIGHT (cm)' },
  { key: 'startWeightKg', label: 'CURRENT WEIGHT (kg)' },
  { key: 'targetWeightKg', label: 'GOAL WEIGHT (kg)' },
] as const;

type NumberKey = (typeof NUMBERS)[number]['key'];

/** Blank is "not set"; anything else must be a positive number. */
const parse = (text: string): number | null | undefined => {
  if (!text.trim()) return undefined;
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * Adding a client. The invite is the client row: once saved they are on the
 * roster, the coach can set up goals, habits and a routine, and the client
 * signs in later with a code sent to this address.
 *
 * Numbers are optional. Height and current weight together skip the client's
 * setup screen; anything left blank the client fills in on first sign-in.
 */
export default function InviteClientScreen() {
  const router = useRouter();
  const trainer = useGetTrainerQuery();
  const [invite, state] = useInviteClientMutation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [withNumbers, setWithNumbers] = useState(false);
  const [numbers, setNumbers] = useState<Record<NumberKey, string>>({
    heightCm: '',
    startWeightKg: '',
    targetWeightKg: '',
  });

  const parsed = {
    heightCm: withNumbers ? parse(numbers.heightCm) : undefined,
    startWeightKg: withNumbers ? parse(numbers.startWeightKg) : undefined,
    targetWeightKg: withNumbers ? parse(numbers.targetWeightKg) : undefined,
  };
  const badNumber = Object.values(parsed).some((v) => v === null);
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const canSubmit = name.trim().length > 0 && emailOk && !badNumber && !state.isLoading;
  const skipsSetup = parsed.heightCm != null && parsed.startWeightKg != null;

  const submit = () => {
    if (!canSubmit) return;
    const { heightCm, startWeightKg, targetWeightKg } = parsed;
    void invite({
      name: name.trim(),
      email: email.trim(),
      profile: withNumbers
        ? {
            heightCm: heightCm ?? undefined,
            startWeightKg: startWeightKg ?? undefined,
            targetWeightKg: targetWeightKg ?? undefined,
            goal:
              startWeightKg && targetWeightKg ? deriveGoal(startWeightKg, targetWeightKg) : undefined,
          }
        : undefined,
    })
      .unwrap()
      .then((client) => {
        router.replace(routes.trainer.clientDetail(client.id));
        void shareInvite(client, trainer.data?.name ?? 'Your coach');
      })
      // Shown inline below.
      .catch(() => undefined);
  };

  return (
    <Screen title="Add a client" subtitle="They sign in with a code — no password" showBack tabBarPadding={false}>
      <Card>
        <View style={styles.form}>
          <Input
            label="NAME"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Jane Doe"
            autoCapitalize="words"
            returnKeyType="next"
          />
          <Input
            label="EMAIL"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="jane@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            error={email.trim() && !emailOk ? 'Enter a full email address' : null}
          />
          <Text variant="caption" tone="secondary">
            They must sign in with exactly this address — the invite you share says so.
          </Text>
        </View>
      </Card>

      <Card>
        <View style={styles.form}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text variant="h2">Their numbers</Text>
              <Text variant="caption" tone="secondary">
                {withNumbers
                  ? skipsSetup
                    ? 'With height and current weight, they skip setup and land straight on today.'
                    : 'Anything you leave blank, they fill in on first sign-in.'
                  : 'Optional. Leave it to them and they fill it in on first sign-in.'}
              </Text>
            </View>
            <Button
              label={withNumbers ? 'Skip' : 'Add now'}
              variant="ghost"
              size="sm"
              onPress={() => setWithNumbers((v) => !v)}
            />
          </View>

          {withNumbers
            ? NUMBERS.map((field) => (
                <Input
                  key={field.key}
                  label={field.label}
                  value={numbers[field.key]}
                  onChangeText={(text) => setNumbers((n) => ({ ...n, [field.key]: text }))}
                  keyboardType="decimal-pad"
                  error={parsed[field.key] === null ? 'Enter a positive number' : null}
                />
              ))
            : null}
        </View>
      </Card>

      {state.isError ? (
        <Text variant="caption" tone="danger" accessibilityRole="alert">
          {errorMessage(state.error, 'Could not add that client. Try again.')}
        </Text>
      ) : null}

      <Button
        label="Add and share invite"
        icon="share-outline"
        size="lg"
        fullWidth
        disabled={!canSubmit}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
});
