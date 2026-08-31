import { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import {
  useGetMessagesQuery,
  useMarkThreadReadMutation,
  useSendMessageMutation,
} from '@/api/endpoints/messagingApi';
import { EmptyState, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { MessageAttachment } from '@/types/models';
import { friendlyDate } from '@/utils/date';

import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';

export interface ThreadViewProps {
  threadId: string;
  clientId: string;
  /** Id of the signed-in user — decides which bubbles are outgoing. */
  senderId: string;
  as: 'client' | 'trainer';
  onAttach?: () => void;
  pendingAttachment?: MessageAttachment | null;
  onClearAttachment?: () => void;
}

/**
 * The conversation surface, shared by the client's chat screen and the
 * trainer's messaging hub so both sides always render messages identically.
 */
export function ThreadView({
  threadId,
  clientId,
  senderId,
  as,
  onAttach,
  pendingAttachment,
  onClearAttachment,
}: ThreadViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { data: messages = [], isLoading } = useGetMessagesQuery(threadId);
  const [sendMessage, sendState] = useSendMessageMutation();
  const [markRead] = useMarkThreadReadMutation();

  useEffect(() => {
    void markRead({ threadId, as });
  }, [threadId, as, markRead]);

  useEffect(() => {
    const timer = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
    return () => clearTimeout(timer);
  }, [messages.length]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loading}>
            <Skeleton height={54} radius={16} width="70%" />
            <Skeleton height={40} radius={16} width="55%" style={styles.right} />
            <Skeleton height={68} radius={16} width="78%" />
          </View>
        ) : messages.length === 0 ? (
          <EmptyState
            icon="chatbubbles-outline"
            title="No messages yet"
            message="Say hello — questions about the plan, food or a niggle all belong here."
          />
        ) : (
          messages.map((message, index) => {
            const prev = messages[index - 1];
            const showDay = !prev || prev.sentAt.slice(0, 10) !== message.sentAt.slice(0, 10);
            return (
              <View key={message.id}>
                {showDay ? (
                  <View style={styles.dayRow}>
                    <View style={styles.dayPill}>
                      <Text variant="micro" tone="secondary">
                        {friendlyDate(message.sentAt.slice(0, 10))}
                      </Text>
                    </View>
                  </View>
                ) : null}
                <MessageBubble
                  message={message}
                  outgoing={message.senderId === senderId}
                  clientId={clientId}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      <Composer
        sending={sendState.isLoading}
        onAttach={onAttach}
        pendingAttachment={pendingAttachment}
        onClearAttachment={onClearAttachment}
        placeholder={as === 'trainer' ? 'Reply to your client…' : 'Message your coach…'}
        onSend={(body, attachment) => {
          void sendMessage({ threadId, senderId, body, attachment }).then(() =>
            onClearAttachment?.()
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  loading: {
    gap: spacing.md,
  },
  right: {
    alignSelf: 'flex-end',
  },
  dayRow: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dayPill: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
});
