import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { sendSignInCode, toAuthFailure, verifySignInCode } from '@/auth';
import { Button, Input, Text } from '@/components/ui';
import { homeFor, routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signOutReasonDismissed } from '@/store/slices/sessionSlice';
import { colors, radius, spacing } from '@/theme';

/** Supabase refuses a second code for the same address inside a minute. */
const RESEND_SECONDS = 60;

/**
 * Passwordless sign-in: email, then the 6-digit code.
 *
 * Like the password screen it owns no session state — a verified code fires the
 * auth listener, which links and resolves the account, and the redirect below
 * follows `status`. The account is linked to the coach's roster row inside
 * account creation (migration 20260915000004), so the first identity check
 * already answers.
 */
export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Set when /welcome sent them here having already chosen. Absent on the
  // invited path, which is now the only way to reach this screen without one.
  const params = useLocalSearchParams<{ kind?: string; name?: string }>();
  const signup =
    (params.kind === 'individual' || params.kind === 'coach') && params.name?.trim()
      ? ({ kind: params.kind, name: params.name.trim() } as const)
      : undefined;
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);
  // A verified code whose account turns out unlinked is signed straight back
  // out by the auth bootstrap; its reason lands here, not in a thrown error.
  const signedOutReason = useAppSelector((s) => s.session.signedOutReason);
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // An OTP is single-use: re-submitting a code that already worked answers 403
  // "token has expired or is invalid", which reads as a wrong code.
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // The notice below is shown once, then they go on to whoever they actually are.
  const [acknowledged, setAcknowledged] = useState(false);

  /** The role the kind they picked would have produced, had the address been free. */
  const wantedRole = signup ? (signup.kind === 'coach' ? 'trainer' : 'client') : null;

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

  const back = () => {
    clearMessage();
    if (sentTo) setSentTo(null);
    else if (router.canGoBack()) router.back();
    else router.replace(routes.welcome());
  };

  const send = async () => {
    if (!emailOk || busy || cooldown > 0) return;
    clearMessage();
    setBusy(true);
    try {
      await sendSignInCode(email, signup);
      setSentTo(email.trim().toLowerCase());
      setCode('');
      setCooldown(RESEND_SECONDS);
    } catch (e) {
      setError(toAuthFailure(e).message);
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
      // Stay busy: the redirect unmounts this screen once the identity resolves.
    } catch (e) {
      setBusy(false);
      setError(toAuthFailure(e).message);
    }
  };

  // The kind picked at the front door can lose, and silence is the wrong answer.
  // Supabase applies `options.data` only when it *creates* an account, and an
  // invited roster row is linked inside creation (20260915000004), so an address
  // that already belongs to someone signs in as that someone — a client who
  // chose "I'm a coach" lands on the client home with no idea why.
  if (status === 'signedIn' && role) {
    if (wantedRole && role !== wantedRole && !acknowledged) {
      return (
        <View style={[styles.notice, { paddingTop: insets.top + spacing.giant }]}>
          <Text variant="display" style={styles.title}>
            You already have an account
          </Text>
          <Text variant="body" tone="secondary">
            {sentTo} is {role === 'trainer' ? 'a coach account' : 'a client account'}, so that is
            how you are signed in. One address, one account — to use Apex as
            {signup?.kind === 'coach' ? ' a coach' : ' an individual'} as well, sign up with a
            different email.
          </Text>
          <Button label="Continue" size="lg" fullWidth onPress={() => setAcknowledged(true)} />
        </View>
      );
    }
    return <Redirect href={homeFor(role)} />;
  }
  // Verified, but nobody yet: /welcome is the screen that asks which they are.
  if (status === 'needsProfile') return <Redirect href={routes.welcome()} />;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled">
        <Button
          label="Back"
          icon="chevron-back"
          variant="ghost"
          size="sm"
          style={styles.back}
          onPress={back}
        />

        <Text variant="display" style={styles.title}>
          {sentTo
            ? 'Check your email'
            : signup?.kind === 'coach'
              ? 'Create your coach account'
              : signup?.kind === 'individual'
                ? 'Set up your own training'
                : 'Sign in with a code'}
        </Text>
        <Text variant="body" tone="secondary">
          {sentTo
            ? `We sent a 6-digit code to ${sentTo}.`
            : signup
              ? 'Your email is your account — we’ll send you a 6-digit code, and there’s no password to remember.'
              : 'Use the email address your coach added you with. We’ll send you a 6-digit code — no password needed.'}
        </Text>

        <View style={styles.form}>
          {sentTo ? (
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
              editable={!busy}
            />
          ) : (
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
              editable={!busy}
              onSubmitEditing={() => void send()}
            />
          )}

          {message ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text variant="caption" tone="danger" style={styles.bannerText}>
                {message}
              </Text>
            </View>
          ) : null}

          {sentTo ? (
            <>
              <Button
                label="Sign in"
                size="lg"
                fullWidth
                disabled={code.length !== 6 || verified}
                loading={busy}
                onPress={() => void verify(code)}
              />
              <Button
                label={cooldown > 0 ? `Send a new code in ${cooldown}s` : 'Send a new code'}
                variant="ghost"
                fullWidth
                disabled={cooldown > 0 || busy || verified}
                onPress={() => void send()}
              />
            </>
          ) : (
            <Button
              label="Email me a code"
              size="lg"
              fullWidth
              disabled={!emailOk || cooldown > 0}
              loading={busy}
              onPress={() => void send()}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  notice: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  back: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    letterSpacing: -1,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
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
