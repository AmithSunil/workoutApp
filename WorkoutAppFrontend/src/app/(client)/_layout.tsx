import { Redirect, Stack } from 'expo-router';

import { routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';

/**
 * Client shell. Guards the whole subtree: anyone whose session is not a client
 * session is bounced back to the role gate before a screen renders.
 */
export default function ClientLayout() {
  const role = useAppSelector((s) => s.session.role);

  if (role === 'trainer') return <Redirect href={routes.trainer.dashboard()} />;
  if (role !== 'client') return <Redirect href={routes.roleSelect()} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chat" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="session/[id]" />
      <Stack.Screen name="routine/[id]" />
    </Stack>
  );
}
