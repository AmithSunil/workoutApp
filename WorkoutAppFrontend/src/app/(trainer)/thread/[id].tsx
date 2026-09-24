import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useGetThreadQuery } from '@/api/endpoints/messagingApi';
import { useGetNutritionRangeQuery } from '@/api/endpoints/nutritionApi';
import { useGetClientQuery } from '@/api/endpoints/trainerApi';
import { useGetWorkoutLogsQuery } from '@/api/endpoints/workoutsApi';
import { ThreadView } from '@/components/messaging/ThreadView';
import { Avatar, EmptyState, PressableScale, Screen, SegmentedControl, Sheet, Skeleton, Text } from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { useTracking } from '@/hooks/useTracking';
import { routes } from '@/navigation/routes';
import { colors, radius, spacing, statusLabel } from '@/theme';
import type { MessageAttachment } from '@/types/models';
import { friendlyDate, monthDay } from '@/utils/date';
import { kcal, pct, volume } from '@/utils/format';
import { shows } from '@/utils/tracking';

type AttachTab = 'workout' | 'nutrition';

const ATTACH_TABS: Array<{ value: AttachTab; label: string }> = [
  { value: 'workout', label: 'Workout logs' },
  { value: 'nutrition', label: 'Nutrition days' },
];

/**
 * Trainer-side conversation. The differentiator over a generic chat is the
 * attachment picker: feedback is delivered next to the log it refers to.
 */
export default function TrainerThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { userId } = useSession();

  const tracking = useTracking();
  const attachSegments = ATTACH_TABS.filter((t) => shows(tracking.mode, t.value));

  const [pickerOpen, setPickerOpen] = useState(false);
  const [storedTab, setAttachTab] = useState<AttachTab>('workout');
  const attachTab = attachSegments.some((t) => t.value === storedTab)
    ? storedTab
    : attachSegments[0].value;
  const [pending, setPending] = useState<MessageAttachment | null>(null);

  const threadId = id ?? '';
  const { data: thread } = useGetThreadQuery(threadId, { skip: !threadId });
  const clientId = thread?.clientId ?? '';
  const { data: client } = useGetClientQuery(clientId, { skip: !clientId });
  const logs = useGetWorkoutLogsQuery({ clientId, limit: 12 }, { skip: !clientId });
  const days = useGetNutritionRangeQuery({ clientId, days: 10 }, { skip: !clientId });

  if (!thread || !client || !userId) {
    return (
      <Screen title="Conversation" showBack tabBarPadding={false}>
        <Skeleton height={64} radius={16} />
      </Screen>
    );
  }

  return (
    <>
      <Screen
        title={client.name}
        subtitle={`${statusLabel(client.compliance.status)} · ${client.compliance.score}% adherence`}
        showBack
        scroll={false}
        tabBarPadding={false}
        headerRight={
          <Pressable
            onPress={() => router.push(routes.trainer.clientDetail(client.id))}
            hitSlop={8}>
            <Avatar
              name={client.name}
              uri={client.avatarUrl}
              size={40}
              status={client.compliance.status}
            />
          </Pressable>
        }>
        <ThreadView
          threadId={thread.id}
          clientId={client.id}
          senderId={userId}
          as="trainer"
          onAttach={() => setPickerOpen(true)}
          pendingAttachment={pending}
          onClearAttachment={() => setPending(null)}
        />
      </Screen>

      <Sheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Attach a log"
        height="70%">
        <Text variant="caption" tone="secondary" style={styles.hint}>
          The client sees this as a card above your message, so feedback lands next to the data it
          refers to.
        </Text>

        <SegmentedControl<AttachTab>
          value={attachTab}
          onChange={setAttachTab}
          segments={attachSegments}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {attachTab === 'workout' ? (
            (logs.data ?? []).length === 0 ? (
              <EmptyState icon="barbell-outline" title="No sessions to attach" compact />
            ) : (
              (logs.data ?? []).map((log) => (
                <PressableScale
                  key={log.id}
                  onPress={() => {
                    setPending({ kind: 'workout', logId: log.id });
                    setPickerOpen(false);
                  }}
                  style={[styles.row]}>
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="barbell" size={15} color={colors.textInverse} />
                  </View>
                  <View style={styles.rowText}>
                    <Text variant="body" numberOfLines={1}>
                      {log.title}
                    </Text>
                    <Text variant="micro" tone="tertiary">
                      {friendlyDate(log.date)} · {log.durationMinutes} min ·{' '}
                      {volume(log.totalVolumeKg)}
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </PressableScale>
              ))
            )
          ) : (days.data ?? []).length === 0 ? (
            <EmptyState icon="restaurant-outline" title="No logged days to attach" compact />
          ) : (
            (days.data ?? []).map((day) => {
              const share = pct(day.consumed.calories, day.targets.calories);
              return (
                <PressableScale
                  key={day.date}
                  onPress={() => {
                    setPending({ kind: 'nutrition', date: day.date });
                    setPickerOpen(false);
                  }}
                  style={[styles.row]}>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          Math.abs(share - 100) <= 8 ? colors.success : colors.warning,
                      },
                    ]}>
                    <Text variant="micro" color={colors.textInverse}>
                      {share}%
                    </Text>
                  </View>
                  <View style={styles.rowText}>
                    <Text variant="body" numberOfLines={1}>
                      {monthDay(day.date)}
                    </Text>
                    <Text variant="micro" tone="tertiary">
                      {kcal(day.consumed.calories)} kcal · {Math.round(day.consumed.protein)}P ·{' '}
                      {Math.round(day.consumed.carbs)}C · {Math.round(day.consumed.fat)}F
                    </Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                </PressableScale>
              );
            })
          )}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  hint: {
    paddingBottom: spacing.md,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  badge: {
    minWidth: 42,
    height: 38,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
});
