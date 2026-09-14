import { useRouter, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { Avatar } from '@/components/ui';

export interface ProfileButtonProps {
  name: string;
  avatarUrl?: string;
  size?: number;
  /** The account screen this avatar opens. */
  href: Href;
}

/**
 * Header avatar, linking to the signed-in user's own account screen.
 *
 * Signing out lives on that screen rather than behind this button: `Alert` is
 * a no-op on web, so a confirm dialog here left the avatar doing nothing at all
 * in the browser.
 */
export function ProfileButton({ name, avatarUrl, size = 40, href }: ProfileButtonProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(href)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Profile">
      <Avatar name={name} uri={avatarUrl} size={size} />
    </Pressable>
  );
}
