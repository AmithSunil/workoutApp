import { Redirect, Stack } from 'expo-router';

import { routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';

/**
 * Client shell. Guards the whole subtree: without a resolved client session,
 * nothing below this renders. The check is on `status` as well as `role`
 * because a role with no token behind it is no longer a reachable state — the
 * only writer of both is the auth bootstrap.
 */
export default function ClientLayout() {
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);

  if (status !== 'signedIn') return <Redirect href={routes.signIn()} />;
  if (role === 'trainer') return <Redirect href={routes.trainer.dashboard()} />;
  if (role !== 'client') return <Redirect href={routes.signIn()} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="train/[id]" />
      <Stack.Screen name="routine/new" />
      <Stack.Screen name="routine/[id]" />
    </Stack>
  );
}
