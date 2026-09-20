import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateProfileMutation } from '@/api/endpoints/trainerApi';
import {
  refreshIdentity,
  sendSignInCode,
  signOutEverywhere,
  toAuthFailure,
  verifySignInCode,
} from '@/auth';
import { DevQuickSignIn } from '@/components/auth/DevQuickSignIn';
import { Button, Input, Text } from '@/components/ui';
import { homeFor } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signOutReasonDismissed } from '@/store/slices/sessionSlice';
import { colors, palette, radius, spacing } from '@/theme';

/** Supabase refuses a second code for the same address inside a minute. */
const RESEND_SECONDS = 60;

/**
 * The one way in: email, then the code, and only then — if the backend says
 * this account is nobody — which kind of account it should be.
 *
 * The role question used to come first, at the front door. It could not: the
 * app does not know who is asking until it has the address, and for most
 * people arriving the answer is already on the server. An invited client would
 * be asked whether they coach or train alone, having been put on a roster by
 * the coach who invited them — the reported bug. So the question moved to the
 * end, where it is asked of the only people it applies to: an address with no
 * profile and no invite behind it. Everyone else is routed by `app_role()`
 * over a real token and never sees it.
 *
 * Three phases, derived from state rather than held in a phase enum:
 *   no code sent  → address
 *   code sent     → the six digits
 *   needsProfile  → name + which kind (the only screen that asks)
 *
 * It writes no session state. A verified code fires the auth listener, and
 * `createProfile` changes only what the backend would answer — `refreshIdentity()`
 * makes Supabase re-emit the session so the bootstrap resolves it again, the
 * same path a sign-in takes. `src/auth/*` stays the only writer.
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);
  const accountEmail = useAppSelector((s) => s.session.email);
  // Why the last session ended, when it ended for a reason worth explaining.
  const signedOutReason = useAppSelector((s) => s.session.signedOutReason);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // An OTP is single-use: re-submitting a code that already worked answers 403
  // "token has expired or is invalid", which reads as a wrong code.
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [createProfile, { isLoading: creating }] = useCreateProfileMutation();

  useEffect(() => {
    if (signedOutReason) setBusy(false);
  }, [signedOutReason]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const message = error ?? signedOutReason;

  const clearMessage = () => {
    if (error) setError(null);
    if (signedOutReason) dispatch(signOutReasonDismissed());
  };

  const send = async () => {
    if (!emailOk || busy || cooldown > 0) return;
    clearMessage();
    setBusy(true);
    try {
      await sendSignInCode(email);
      setSentTo(email.trim().toLowerCase());
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (caught) {
      setError(toAuthFailure(caught).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (!sentTo || value.length !== 6 || busy || verified) return;
    clearMessage();
    setBusy(true);
    try {
      await verifySignInCode(sentTo, value);
      setVerified(true);
      // Stay busy: the bootstrap either redirects away or switches this screen
      // into its last phase.
    } catch (caught) {
      setBusy(false);
      setError(toAuthFailure(caught).message);
    }
  };

  const choose = async (kind: 'individual' | 'coach') => {
    if (!name.trim() || creating) return;
    clearMessage();
    try {
      await createProfile({ kind, name: name.trim() }).unwrap();
      await refreshIdentity();
      // No navigation here: the resolved identity flips `status`, and the
      // redirect below sends them to their own home.
    } catch (caught) {
      setError(toAuthFailure(caught).message);
    }
  };

  if (status === 'signedIn' && role) return <Redirect href={homeFor(role)} />;

  const asking = status === 'needsProfile';
  const working = busy || creating;

  const tagline = asking
    ? 'One more thing: how will you be using Apex?'
    : sentTo
      ? `We sent a 6-digit code to ${sentTo}.`
      : 'Coach a roster, or train yourself. Same app, either way.';

  const banner = message ? (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
      <Text variant="caption" tone="danger" style={styles.bannerText}>
        {message}
      </Text>
    </View>
  ) : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[palette.indigo50, colors.background]}
        style={[styles.gradient, { height: 320 + insets.top }]}
      />

      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.giant, paddingBottom: insets.bottom + spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Ionicons name="barbell" size={22} color={colors.textOnPrimary} />
            </View>
            <Text variant="display" style={styles.title}>
              Apex
            </Text>
            <Text variant="body" tone="secondary" align="center" style={styles.tagline}>
              {tagline}
            </Text>
          </View>

          {asking ? (
            <View style={styles.form}>
              {accountEmail ? (
                <Text variant="caption" tone="secondary" align="center">
                  Signed in as {accountEmail}
                </Text>
              ) : null}

              <Input
                label="YOUR NAME"
                icon="person-outline"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  clearMessage();
                }}
                placeholder="What should we call you?"
                autoCapitalize="words"
                autoComplete="name"
                editable={!creating}
              />

              {banner}

              <Button
                label="I'm a coach"
                size="lg"
                fullWidth
                disabled={!name.trim() || creating}
                loading={creating}
                onPress={() => void choose('coach')}
              />
              <Button
                label="I'm training on my own"
                variant="secondary"
                size="lg"
                fullWidth
                disabled={!name.trim() || creating}
                onPress={() => void choose('individual')}
              />

              {/* Reaching this phase with a coach means the address they used is
                  not the one on the roster — the invite would have claimed it. */}
              <Text variant="caption" tone="secondary" align="center">
                Have a coach? They need to add this exact address to their roster — ask them, then
                sign in again. You can train on your own in the meantime.
              </Text>

              <Button
                label="Sign out"
                variant="ghost"
                fullWidth
                disabled={creating}
                onPress={() => void signOutEverywhere()}
              />
            </View>
          ) : sentTo ? (
            <View style={styles.form}>
              <Input
                key="code"
                label="CODE"
                icon="keypad-outline"
                value={code}
                onChangeText={(text) => {
                  const digits = text.replace(/\D/g, '').slice(0, 6);
                  setCode(digits);
                  clearMessage();
                  if (digits.length === 6) void verify(digits);
                }}
                placeholder="123456"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                editable={!working}
              />

              {banner}

              <Button
                label="Continue"
                size="lg"
                fullWidth
                disabled={code.length !== 6 || verified}
                loading={working}
                onPress={() => void verify(code)}
              />
              <Button
                label={cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
                variant="ghost"
                fullWidth
                disabled={cooldown > 0 || working || verified}
                onPress={() => void send()}
              />
              <Button
                label="Use a different email"
                variant="ghost"
                fullWidth
                disabled={verified}
                onPress={() => {
                  clearMessage();
                  setSentTo(null);
                  setCode('');
                }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <Input
                key="email"
                label="EMAIL"
                icon="mail-outline"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearMessage();
                }}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                editable={!working}
                onSubmitEditing={() => void send()}
              />

              {banner}

              <Button
                label="Email me a code"
                size="lg"
                fullWidth
                disabled={!emailOk || cooldown > 0}
                loading={working}
                onPress={() => void send()}
              />

              <Text variant="caption" tone="secondary" align="center">
                No password. If your coach has added you, use the address they added — you will land
                on their roster.
              </Text>

              {/* The seeded fixtures are the only accounts with a password, and
                  this is the only screen left that can reach them. */}
              {__DEV__ ? <DevQuickSignIn onError={setError} /> : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    letterSpacing: -1,
  },
  tagline: {
    maxWidth: 300,
  },
  form: {
    gap: spacing.lg,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  bannerText: {
    flex: 1,
  },
});
