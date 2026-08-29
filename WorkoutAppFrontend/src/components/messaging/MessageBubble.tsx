import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Message } from '@/types/models';
import { clockTime } from '@/utils/date';

import { AttachmentCard } from './AttachmentCard';

export interface MessageBubbleProps {
  message: Message;
  /** True when the signed-in user sent it. */
  outgoing: boolean;
  clientId: string;
  showTimestamp?: boolean;
}

export function MessageBubble({
  message,
  outgoing,
  clientId,
  showTimestamp = true,
}: MessageBubbleProps) {
  return (
    <View style={[styles.row, outgoing ? styles.rowOut : styles.rowIn]}>
      <View style={[styles.bubble, outgoing ? styles.out : styles.in]}>
        {message.attachment ? (
          <AttachmentCard attachment={message.attachment} clientId={clientId} onDark={outgoing} />
        ) : null}
        <Text variant="body" color={outgoing ? colors.textInverse : colors.text}>
          {message.body}
        </Text>
        {showTimestamp ? (
          <Text
            variant="micro"
            color={outgoing ? 'rgba(255,255,255,0.72)' : colors.textTertiary}
            style={styles.time}>
            {clockTime(message.sentAt)}
            {outgoing && message.readAt ? ' · Read' : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  rowIn: {
    justifyContent: 'flex-start',
  },
  rowOut: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '86%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  in: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xs,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  out: {
    backgroundColor: colors.primary,
    borderTopRightRadius: radius.xs,
  },
  time: {
    marginTop: 4,
    alignSelf: 'flex-end',
  },
});
