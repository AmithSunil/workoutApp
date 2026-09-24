import { Redirect, Stack } from 'expo-router';

import { useGetClientQuery } from '@/api/endpoints/trainerApi';
import { Paywall } from '@/components/billing/Paywall';
import { useSubscription } from '@/hooks/useSubscription';
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
  // A coached client is covered by the seat their coach pays for and is never
  // asked. Only someone training on their own needs a plan of their own.
  // ponytail: until S8 widens ClientProfile.trainerId to `string | null` this
  // is always true, so no client is gated yet -- which is right, because no
  // coachless client can exist either. S8 turns this on by itself.
  const plan = useSubscription({
    hasCoach: profile.data ? profile.data.trainerId !== null : true,
  });

  if (status !== 'signedIn') return <Redirect href={routes.welcome()} />;
  if (role === 'trainer') return <Redirect href={routes.trainer.dashboard()} />;
  if (role !== 'client') return <Redirect href={routes.welcome()} />;

  // ponytail: one blank frame on a cold start with no cache. Screens below
  // assume a complete profile, so nothing renders until we know. A failed read
  // (offline) falls through: each screen already handles its own errors.
  if (profile.isLoading) return null;
  const intake = !!profile.data && needsIntake(profile.data);

  // After intake, not before: let someone finish setting themselves up on the
  // trial, and meet the wall when the fourteen days are gone.
  if (!intake && !plan.active) {
    return (
      <Paywall
        title="Your trial has ended"
        message="Everything you have logged is still here. Pick a plan to carry on training."
      />
    );
  }

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
        <Stack.Screen name="routine/[id]" />
      </Stack.Protected>
    </Stack>
  );
}
