import { StyleSheet, View } from 'react-native';

import { Avatar, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { ThreadView } from '@/components/messaging/ThreadView';
import { useClientThread, useSession } from '@/hooks/useSession';
import { colors, radius, spacing } from '@/theme';

/** The client's single conversation with their coach. */
export default function ClientChatScreen() {
  const { clientId, trainer } = useSession();
  const thread = useClientThread(clientId);

  if (!trainer || !clientId) {
    return (
      <Screen title="Coach" showBack tabBarPadding={false}>
        <Skeleton height={64} radius={16} />
      </Screen>
    );
  }

  return (
    <Screen
      title={trainer.name}
      subtitle={trainer.headline}
      showBack
      scroll={false}
      tabBarPadding={false}
      headerRight={<Avatar name={trainer.name} uri={trainer.avatarUrl} size={38} />}>
      <View style={styles.status}>
        <View style={styles.dot} />
        <Text variant="micro" tone="secondary">
          Usually replies within a few hours
        </Text>
      </View>

      {thread ? (
        <ThreadView threadId={thread.id} clientId={clientId} senderId={clientId} as="client" />
      ) : (
        <EmptyState
          icon="chatbubbles-outline"
          title="No conversation yet"
          message="Your coach will start a thread once your onboarding is complete."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
});
