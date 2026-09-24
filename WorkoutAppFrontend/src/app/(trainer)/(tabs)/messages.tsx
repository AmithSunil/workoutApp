import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { useGetThreadsQuery } from '@/api/endpoints/messagingApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  ScreenTitle,
  SectionHeader,
  SkeletonCard,
  Text,
} from '@/components/ui';
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
      // A new client's thread exists from the invite; it is not a conversation yet.
      .filter((thread) => thread.lastMessageAt)
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

  const unreadRows = rows.filter(({ thread }) => thread.unreadForTrainer > 0);
  const readRows = rows.filter(({ thread }) => thread.unreadForTrainer === 0);

  const renderRows = (list: typeof rows) => (
    <Card padded={false} style={styles.list}>
      {list.map(({ thread, client }, i) => {
        const unread = thread.unreadForTrainer > 0;
        return (
          <View key={thread.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={() => router.push(routes.trainer.thread(thread.id))}
              accessibilityRole="button"
              accessibilityLabel={`${client?.name ?? 'Client'}${unread ? `, ${thread.unreadForTrainer} unread` : ''}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Avatar
                name={client?.name ?? 'Client'}
                uri={client?.avatarUrl}
                size={48}
                status={client?.compliance.status}
              />
              <View style={styles.text}>
                <View style={styles.titleRow}>
                  <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
                    {client?.name ?? 'Client'}
                  </Text>
                  <Text variant="caption" color={unread ? colors.primaryText : colors.textTertiary}>
                    {relativeTime(thread.lastMessageAt)}
                  </Text>
                </View>
                <View style={styles.titleRow}>
                  <Text
                    variant="caption"
                    tone={unread ? 'default' : 'tertiary'}
                    numberOfLines={1}
                    style={styles.name}>
                    {thread.lastMessagePreview}
                  </Text>
                  {unread ? (
                    <View style={styles.badge}>
                      <Text variant="micro" color={colors.textOnPrimary}>
                        {thread.unreadForTrainer}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          </View>
        );
      })}
    </Card>
  );

  return (
    <Screen
      refreshControl={
        <RefreshControl refreshing={threads.isFetching} onRefresh={() => void threads.refetch()} />
      }>
      <ScreenTitle
        eyebrow={totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
        title="Messages"
      />

      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search conversations"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
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
        <>
          {unreadRows.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title="Unread" />
              {renderRows(unreadRows)}
            </View>
          ) : null}
          {readRows.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader title={unreadRows.length > 0 ? 'Earlier' : 'Conversations'} />
              {renderRows(readRows)}
            </View>
          ) : null}
        </>
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
    paddingHorizontal: spacing.lg,
    height: 50,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 0,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  list: {
    paddingVertical: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: colors.divider,
    marginLeft: spacing.lg + 48 + spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
});
