import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signInWithPassword, toAuthFailure } from '@/auth';
import { DevQuickSignIn } from '@/components/auth/DevQuickSignIn';
import { Button, Input, Text } from '@/components/ui';
import { homeFor } from '@/navigation/routes';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { signOutReasonDismissed } from '@/store/slices/sessionSlice';
import { colors, palette, radius, spacing } from '@/theme';

/**
 * The app's front door.
 *
 * It owns no session state of its own: a successful `signInWithPassword` fires
 * the Supabase auth listener, the bootstrap in `useAuthSession` resolves the
 * account to an app user, and the redirect below fires once `status` flips.
 * That is deliberately the only path in — the guard on each shell subtree
 * bounces here, and nothing writes a role without a token behind it.
 */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);
  const signedOutReason = useAppSelector((s) => s.session.signedOutReason);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput | null>(null);

  const message = formError ?? signedOutReason;
  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  const clearMessage = () => {
    if (formError) setFormError(null);
    if (signedOutReason) dispatch(signOutReasonDismissed());
  };

  const submit = async () => {
    if (!canSubmit) return;
    clearMessage();
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
      // Leave `submitting` set: the redirect below unmounts this screen as soon
      // as the listener has resolved the identity, and re-enabling the button
      // in between would invite a second sign-in.
    } catch (error) {
      setSubmitting(false);
      setFormError(toAuthFailure(error).message);
    }
  };

  if (status === 'signedIn' && role) return <Redirect href={homeFor(role)} />;

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
            {
              paddingTop: insets.top + spacing.giant,
              paddingBottom: insets.bottom + spacing.xxxl,
            },
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
              Sign in to pick up your coaching, from either side of it.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
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
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Input
              label="PASSWORD"
              icon="lock-closed-outline"
              inputRef={passwordRef}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                clearMessage();
              }}
              placeholder="Your password"
              password
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              editable={!submitting}
              onSubmitEditing={() => void submit()}
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
              label="Sign in"
              size="lg"
              fullWidth
              onPress={() => void submit()}
              disabled={!canSubmit}
              loading={submitting}
              style={styles.submit}
            />
          </View>

          {__DEV__ ? <DevQuickSignIn disabled={submitting} onError={setFormError} /> : null}
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
  submit: {
    marginTop: spacing.xs,
  },
});
