/**
 * MessagingFAB + Chat Sheet – floating action button that opens a WhatsApp-style chat.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand, FontSizes, MIN_TOUCH, Radius, Shadow, Spacing } from '@/constants/theme';
import { useApp, type Message } from '@/context/AppContext';
import { useTheme } from '@/hooks/use-theme';

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatMessageDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface BubbleProps {
  message: Message;
}

function Bubble({ message }: BubbleProps) {
  const theme = useTheme();
  const isUser = message.sender === 'user';

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowRight : styles.bubbleRowLeft]}>
      {!isUser && (
        <View style={[styles.trainerAvatar, { backgroundColor: Brand.primary + '22' }]}>
          <Text style={{ fontSize: 14 }}>💪</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: Brand.primary }]
            : [styles.trainerBubble, { backgroundColor: theme.backgroundElement }],
        ]}>
        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : theme.text }]}>
          {message.text}
        </Text>
        <Text style={[styles.bubbleTime, { color: isUser ? '#ffffff99' : theme.textTertiary }]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

interface ChatSheetProps {
  visible: boolean;
  onClose: () => void;
}

function ChatSheet({ visible, onClose }: ChatSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { state, sendMessage } = useApp();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendMessage(text);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, sendMessage]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.chatContainer, { backgroundColor: theme.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={[styles.chatHeader, { backgroundColor: theme.backgroundCard, borderBottomColor: theme.border, paddingTop: insets.top }]}>
          <Pressable onPress={onClose} style={styles.chatBackBtn}>
            <Text style={[styles.chatBackText, { color: Brand.primary }]}>← Back</Text>
          </Pressable>
          <View style={styles.chatHeaderInfo}>
            <Text style={{ fontSize: 20 }}>💪</Text>
            <View>
              <Text style={[styles.chatTrainerName, { color: theme.text }]}>{state.trainerName}</Text>
              <Text style={[styles.chatStatus, { color: Brand.success }]}>● Online</Text>
            </View>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={state.messages}
          keyExtractor={m => m.id}
          contentContainerStyle={[styles.messageList, { paddingBottom: insets.bottom + 80 }]}
          renderItem={({ item }) => <Bubble message={item} />}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.dateHeader}>
              <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dateText, { color: theme.textTertiary }]}>Today</Text>
              <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
            </View>
          }
        />

        {/* Input bar */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: theme.backgroundCard,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, Spacing.three),
          },
        ]}>
          <TextInput
            style={[styles.chatInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Message..."
            placeholderTextColor={theme.textTertiary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              { backgroundColor: input.trim() ? Brand.primary : theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
            ]}>
            <Text style={[styles.sendIcon, { color: input.trim() ? '#fff' : theme.textTertiary }]}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MessagingFAB() {
  const theme = useTheme();
  const { state } = useApp();
  const [chatOpen, setChatOpen] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const unread = state.messages.filter(m => m.sender === 'trainer').length;

  const handlePress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, damping: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 8 }),
    ]).start();
    setChatOpen(true);
  }, [scale]);

  return (
    <>
      <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
        <Pressable onPress={handlePress} style={[styles.fabButton, { backgroundColor: Brand.primary, ...Shadow.lg }]}>
          <Text style={styles.fabIcon}>💬</Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      <ChatSheet visible={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.six,
    right: Spacing.five,
    zIndex: 100,
  },
  fabButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#DC2626',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  chatContainer: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  chatBackBtn: {
    minWidth: 60,
    minHeight: MIN_TOUCH,
    justifyContent: 'center',
  },
  chatBackText: {
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  chatTrainerName: {
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  chatStatus: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  messageList: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: Spacing.two,
    gap: Spacing.two,
    alignItems: 'flex-end',
  },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  trainerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '75%',
    padding: Spacing.three,
    gap: Spacing.one,
    borderRadius: Radius.lg,
  },
  userBubble: {
    borderBottomRightRadius: Radius.sm,
  },
  trainerBubble: {
    borderBottomLeftRadius: Radius.sm,
  },
  bubbleText: {
    fontSize: FontSizes.base,
    lineHeight: FontSizes.base * 1.4,
  },
  bubbleTime: {
    fontSize: FontSizes.xs,
    alignSelf: 'flex-end',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  dateLine: { flex: 1, height: 1 },
  dateText: { fontSize: FontSizes.xs, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    fontSize: FontSizes.base,
    maxHeight: 100,
    minHeight: MIN_TOUCH,
  },
  sendButton: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 20,
    fontWeight: '700',
  },
});
