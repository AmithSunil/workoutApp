import { Platform, Share } from 'react-native';

/**
 * Where an invited client gets the app: the PWA, i.e. wherever this web build
 * is being served from, so it follows the domain with no config.
 * ponytail: native builds still use the placeholder -- swap in the Play Store
 * listing when there is one.
 */
export const INVITE_LINK =
  Platform.OS === 'web' && typeof window !== 'undefined'
    ? window.location.origin
    : 'https://corda.fit';

/**
 * Opens the coach's own share sheet (WhatsApp, email, SMS…). No backend email:
 * the message comes from someone the client knows, and it names the exact
 * address to sign in with — the one thing that decides whether sign-in works.
 */
export const shareInvite = (
  client: { email: string },
  coachName: string
): Promise<'copied' | undefined> => {
  const message =
    `Hi! ${coachName} has added you as a client on Corda.\n\n` +
    `1. Get the app: ${INVITE_LINK}\n` +
    `2. Tap "Coach invited you?" and sign in with ${client.email} — you'll get a 6-digit code by email.`;
  // No share sheet in this browser: copy it instead, so the button still does something.
  if (Platform.OS === 'web' && !navigator.share) {
    return navigator.clipboard.writeText(message).then(
      () => 'copied' as const,
      () => undefined
    );
  }
  return Share.share({ message }).then(
    () => undefined,
    () => undefined
  );
};
