import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import { Avatar, Card, EmptyState, Screen, SkeletonCard, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing } from '@/theme';
import { relativeTime } from '@/utils/date';

/** Messaging hub: every client conversation, unread first. */
export default function MessagesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const threads = useGetThreadsQuery();
  const clients = useGetClientsQuery();

  const clientById = useMemo(
    () => Object.fromEntries((clients.data ?? []).map((c) => [c.id, c])),
    [clients.data]
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (threads.data ?? [])
      .map((thread) => ({ thread, client: clientById[thread.clientId] }))
      .filter(({ client }) => (q ? (client?.name ?? '').toLowerCase().includes(q) : true))
      .sort((a, b) => {
        if (a.thread.unreadForTrainer !== b.thread.unreadForTrainer) {
          return b.thread.unreadForTrainer - a.thread.unreadForTrainer;
        }
        return a.thread.lastMessageAt < b.thread.lastMessageAt ? 1 : -1;
      });
  }, [threads.data, clientById, query]);

  const totalUnread = (threads.data ?? []).reduce((s, t) => s + t.unreadForTrainer, 0);

  return (
    <Screen
      title="Messages"
      subtitle={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
      refreshControl={
        <RefreshControl refreshing={threads.isFetching} onRefresh={() => void threads.refetch()} />
      }>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search conversations"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
        />
      </View>

      {threads.isLoading ? (
        <>
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="chatbubbles-outline"
            title="No conversations"
            message="Threads appear here once a client is onboarded."
            compact
          />
        </Card>
      ) : (
        <Card padded={false}>
          {rows.map(({ thread, client }, i) => (
            <Pressable
              key={thread.id}
              onPress={() => router.push(routes.trainer.thread(thread.id))}
              style={({ pressed }) => [
                styles.row,
                i > 0 && styles.rowBordered,
                pressed && styles.pressed,
              ]}>
              <Avatar
                name={client?.name ?? 'Client'}
                uri={client?.avatarUrl}
                size={44}
                status={client?.compliance.status}
              />
              <View style={styles.text}>
                <View style={styles.titleRow}>
                  <Text
                    variant={thread.unreadForTrainer > 0 ? 'bodyStrong' : 'body'}
                    numberOfLines={1}
                    style={styles.name}>
                    {client?.name ?? 'Client'}
                  </Text>
                  <Text variant="micro" tone="tertiary">
                    {relativeTime(thread.lastMessageAt)}
                  </Text>
                </View>
                <Text
                  variant="caption"
                  tone={thread.unreadForTrainer > 0 ? 'default' : 'secondary'}
                  numberOfLines={1}>
                  {thread.lastMessagePreview}
                </Text>
              </View>
              {thread.unreadForTrainer > 0 ? (
                <View style={styles.badge}>
                  <Text variant="micro" color={colors.textInverse}>
                    {thread.unreadForTrainer}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              )}
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowBordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
