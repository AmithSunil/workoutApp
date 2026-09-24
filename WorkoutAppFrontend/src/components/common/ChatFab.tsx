import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, Text, TAB_BAR_HEIGHT } from '@/components/ui';
import { colors, elevation, radius, spacing } from '@/theme';

export interface ChatFabProps {
  href: Href;
  unread?: number;
  label?: string;
}

/** Persistent floating action button giving the client one tap to their coach. */
export function ChatFab({ href, unread = 0, label = 'Message coach' }: ChatFabProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      scaleTo={0.94}
      style={[styles.fab, { bottom: TAB_BAR_HEIGHT + insets.bottom + spacing.md }]}>
      <Ionicons name="chatbubble-ellipses" size={22} color={colors.textOnPrimary} />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text variant="micro" color={colors.textInverse}>
            {unread}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: spacing.xl,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInk,
    ...elevation.floating,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surfaceInk,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
