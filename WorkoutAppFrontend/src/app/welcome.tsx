import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCreateProfileMutation } from '@/api/endpoints/trainerApi';
import { refreshIdentity, signOutEverywhere, toAuthFailure } from '@/auth';
import { DevQuickSignIn } from '@/components/auth/DevQuickSignIn';
import { Button, Input, Text } from '@/components/ui';
import { homeFor, routes } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signOutReasonDismissed } from '@/store/slices/sessionSlice';
import { colors, palette, radius, spacing } from '@/theme';

/**
 * The front door, and the recovery screen for an account with no profile.
 *
 * One screen, two modes, keyed on `status` — they are the same question asked
 * at two moments, and splitting them into two files would duplicate the whole
 * layout for one differing paragraph.
 *
 * It writes no session state: `createProfile` changes what the backend would
 * answer, and `refreshIdentity()` makes Supabase re-emit the session so the
 * bootstrap in `useAuthSession` resolves it again — the same path a sign-in
 * takes. `src/auth/*` stays the only writer (project memory `architecture`).
 *
 * It is also the only way in: there is no password screen, because nothing
 * this app creates has a password — `create_profile` never sets one.
 *
 * The choice is asked *before* sign-in, and rides along in the emailed code's
 * metadata, so an answered signup never reaches the recovery mode below: the
 * bootstrap creates the profile and lands them on their own home. Recovery is
 * for the cases that arrive with no answer — "I have a coach" when no invite is
 * waiting, or a session from an older build.
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);
  const email = useAppSelector((s) => s.session.email);
  // Why the last session ended, when it ended for a reason worth explaining.
  // This screen is where a sign-out lands now, so it is where that is shown.
  const signedOutReason = useAppSelector((s) => s.session.signedOutReason);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createProfile, { isLoading }] = useCreateProfileMutation();

  const message = error ?? signedOutReason;

  const clearMessage = () => {
    if (error) setError(null);
    if (signedOutReason) dispatch(signOutReasonDismissed());
  };

  const choose = async (kind: 'individual' | 'coach') => {
    if (!name.trim() || isLoading) return;
    clearMessage();
    try {
      await createProfile({ kind, name: name.trim() }).unwrap();
      await refreshIdentity();
      // No navigation here: the resolved identity flips `status`, and the
      // redirect at the top of this screen sends them to their own home.
    } catch (caught) {
      setError(toAuthFailure(caught).message);
    }
  };

  if (status === 'signedIn' && role) return <Redirect href={homeFor(role)} />;

  const recovering = status === 'needsProfile';

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
              {recovering
                ? 'One more thing: how will you be using Apex?'
                : 'Coach a roster, or train yourself. Same app, either way.'}
            </Text>
          </View>

          {recovering ? (
            <View style={styles.form}>
              {email ? (
                <Text variant="caption" tone="secondary" align="center">
                  Signed in as {email}
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
                editable={!isLoading}
              />

              {message ? (
                <View style={styles.banner} accessibilityRole="alert">
                  <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text variant="caption" tone="danger" style={styles.bannerText}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <Button
                label="I'm a coach"
                size="lg"
                fullWidth
                disabled={!name.trim() || isLoading}
                loading={isLoading}
                onPress={() => void choose('coach')}
              />
              <Button
                label="I'm training on my own"
                variant="secondary"
                size="lg"
                fullWidth
                disabled={!name.trim() || isLoading}
                onPress={() => void choose('individual')}
              />

              <Text variant="caption" tone="secondary" align="center">
                Have a coach? They need to add this exact address to their roster — ask them, then
                sign in again. You can train on your own in the meantime.
              </Text>

              <Button
                label="Sign out"
                variant="ghost"
                fullWidth
                disabled={isLoading}
                onPress={() => void signOutEverywhere()}
              />
            </View>
          ) : (
            <View style={styles.form}>
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
              />

              <Button
                label="I'm a coach"
                size="lg"
                fullWidth
                disabled={!name.trim()}
                onPress={() => router.push(routes.otp({ kind: 'coach', name: name.trim() }))}
              />
              <Button
                label="I'm training on my own"
                variant="secondary"
                size="lg"
                fullWidth
                disabled={!name.trim()}
                onPress={() => router.push(routes.otp({ kind: 'individual', name: name.trim() }))}
              />
              {/* No name needed: their coach already typed it into the roster. */}
              <Button
                label="I have a coach"
                variant="ghost"
                fullWidth
                onPress={() => router.push(routes.otp())}
              />

              {message ? (
                <View style={styles.banner} accessibilityRole="alert">
                  <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                  <Text variant="caption" tone="danger" style={styles.bannerText}>
                    {message}
                  </Text>
                </View>
              ) : null}

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
