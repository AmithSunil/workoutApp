import { Redirect, Stack } from 'expo-router';

import { useGetClientQuery } from '@/api/endpoints/trainerApi';
import { routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';
import { needsIntake } from '@/utils/goal';

/**
 * Client shell. Guards the whole subtree: without a resolved client session,
 * nothing below this renders. The check is on `status` as well as `role`
 * because a role with no token behind it is no longer a reachable state — the
 * only writer of both is the auth bootstrap.
 *
 * It also holds a client the coach added without body numbers on the setup
 * screen until they are filled in. That gate hides screens rather than
 * redirecting: a `<Redirect>` returned *instead of* this Stack can never reach
 * a screen inside it, so it re-fires on every render and wedges the navigator
 * ("Maximum update depth exceeded"). Only redirect out of this group, never
 * into it. The guard reads the same cached `GET /clients/:id` every client
 * screen uses, so `complete_intake` invalidating it is what lets them through.
 */
export default function ClientLayout() {
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);
  const userId = useAppSelector((s) => s.session.userId);
  const isClient = status === 'signedIn' && role === 'client' && !!userId;
  const profile = useGetClientQuery(userId ?? '', { skip: !isClient });

  if (status !== 'signedIn') return <Redirect href={routes.welcome()} />;
  if (role === 'trainer') return <Redirect href={routes.trainer.dashboard()} />;
  if (role !== 'client') return <Redirect href={routes.welcome()} />;

  // ponytail: one blank frame on a cold start with no cache. Screens below
  // assume a complete profile, so nothing renders until we know. A failed read
  // (offline) falls through: each screen already handles its own errors.
  if (profile.isLoading) return null;
  const intake = !!profile.data && needsIntake(profile.data);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={intake}>
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!intake}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="train/[id]" />
        <Stack.Screen name="routine/new" />
        <Stack.Screen name="routine/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
