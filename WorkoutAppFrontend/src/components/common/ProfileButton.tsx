import { useRouter } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { Avatar } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { useAppDispatch } from '@/store/hooks';
import { clearSession } from '@/store/persistence';
import { signedOut } from '@/store/slices/sessionSlice';

export interface ProfileButtonProps {
  name: string;
  avatarUrl?: string;
  size?: number;
}

/**
 * Header avatar that doubles as the sign-out affordance. In production this
 * opens a profile screen; in the demo build it returns to the role gate so both
 * sides of the product stay reachable.
 */
export function ProfileButton({ name, avatarUrl, size = 40 }: ProfileButtonProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const onPress = () =>
    Alert.alert(name, 'Switch to a different profile?', [
      { text: 'Stay signed in', style: 'cancel' },
      {
        text: 'Switch profile',
        style: 'destructive',
        onPress: () => {
          dispatch(signedOut());
          void clearSession();
          router.replace(routes.roleSelect());
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
