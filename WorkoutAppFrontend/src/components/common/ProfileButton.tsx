import { useRouter } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { signOutEverywhere } from '@/auth';
import { Avatar } from '@/components/ui';
import { routes } from '@/navigation/routes';

export interface ProfileButtonProps {
  name: string;
  avatarUrl?: string;
  size?: number;
}

/**
 * Header avatar that doubles as the sign-out affordance.
 *
 * It only ends the Supabase session. Clearing the session slice, the cached
 * identity and the RTK Query cache is the auth listener's job — doing it here
 * too would mean two places that have to agree on what signing out means.
 */
export function ProfileButton({ name, avatarUrl, size = 40 }: ProfileButtonProps) {
  const router = useRouter();

  const onPress = () =>
    Alert.alert(name, 'Sign out of this account?', [
      { text: 'Stay signed in', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => {
          void signOutEverywhere().then(() => router.replace(routes.signIn()));
        },
      },
    ]);

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Profile and sign out">
      <Avatar name={name} uri={avatarUrl} size={size} />
    </Pressable>
  );
}
