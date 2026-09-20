import { Share } from 'react-native';

/**
 * Where an invited client gets the app.
 * ponytail: one constant until there is a store listing — swap in the Play
 * Store / EAS link then.
 */
export const INVITE_LINK = 'https://apexcoaching.fit/app';

/**
 * Opens the coach's own share sheet (WhatsApp, email, SMS…). No backend email:
 * the message comes from someone the client knows, and it names the exact
 * address to sign in with — the one thing that decides whether sign-in works.
 */
export const shareInvite = (client: { name: string; email: string }, coachName: string) =>
  Share.share({
    message:
      `Hi ${client.name.split(' ')[0]}, ${coachName} has added you as a client on Apex Coaching.\n\n` +
      `1. Get the app: ${INVITE_LINK}\n` +
      `2. Tap "Coach invited you?" and sign in with ${client.email} — you'll get a 6-digit code by email.`,
  }).catch(() => undefined);
