import { Redirect, Stack } from 'expo-router';

import { routes } from '@/navigation/routes';
import { useAppSelector } from '@/store/hooks';
import { colors } from '@/theme';

/** Trainer shell, guarded the same way as the client subtree. */
export default function TrainerLayout() {
  const status = useAppSelector((s) => s.session.status);
  const role = useAppSelector((s) => s.session.role);

  if (status !== 'signedIn') return <Redirect href={routes.signIn()} />;
  if (role === 'client') return <Redirect href={routes.client.explore()} />;
  if (role !== 'trainer') return <Redirect href={routes.signIn()} />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="client/[id]" />
      <Stack.Screen name="routine/new" />
      <Stack.Screen name="routine/[id]" />
      <Stack.Screen name="routine/edit/[id]" />
      <Stack.Screen name="assignment/[id]" />
      <Stack.Screen name="thread/[id]" />
    </Stack>
  );
}
