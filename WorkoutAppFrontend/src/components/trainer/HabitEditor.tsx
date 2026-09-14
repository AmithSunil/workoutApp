import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  useCreateHabitMutation,
  useDeleteHabitMutation,
  useUpdateHabitMutation,
} from '@/api/endpoints/progressApi';
import { Button, EmptyState, Input, Sheet, Text } from '@/components/ui';
import { HABIT_ICONS } from '@/components/progress/HabitChecklist';
import { colors, radius, spacing } from '@/theme';
import type { Habit } from '@/types/models';

export interface HabitEditorProps {
  visible: boolean;
  onClose: () => void;
  clientId: string;
  habits: Habit[];
}

const ICON_KEYS = Object.keys(HABIT_ICONS);

/**
 * The coach's daily checklist for one client: add, rename, re-icon, remove.
 *
 * Edits save on blur rather than behind a Save button — there is one field per
 * habit and nothing to validate across them, so a dirty-state machine would be
 * more code than the feature.
 */
export function HabitEditor({ visible, onClose, clientId, habits }: HabitEditorProps) {
  const [createHabit, creating] = useCreateHabitMutation();
  const [updateHabit] = useUpdateHabitMutation();
  const [deleteHabit] = useDeleteHabitMutation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    void createHabit({ clientId, title, icon: ICON_KEYS[0], createdBy: 'trainer' })
      .unwrap()
      .then(() => setDraft(''));
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Daily habits" height="80%">
      <Text variant="caption" tone="secondary" style={styles.hint}>
        These are the goals your client ticks off each day. Renaming one keeps its history.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {habits.length === 0 ? (
          <EmptyState icon="list-outline" title="No habits yet" compact />
        ) : (
          habits.map((habit) => (
            <View key={habit.id} style={styles.row}>
              <Input
                defaultValue={habit.title}
                placeholder="Habit"
                returnKeyType="done"
                containerStyle={styles.field}
                onEndEditing={(e) => {
                  const title = e.nativeEvent.text.trim();
                  if (title && title !== habit.title) {
                    void updateHabit({ id: habit.id, clientId, patch: { title } });
                  }
                }}
              />

              <View style={styles.icons}>
                {ICON_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => void updateHabit({ id: habit.id, clientId, patch: { icon: key } })}
                    accessibilityRole="button"
                    accessibilityLabel={`Use the ${key} icon`}
                    style={[styles.iconChip, habit.icon === key && styles.iconChipActive]}>
                    <Ionicons
                      name={HABIT_ICONS[key]}
                      size={15}
                      color={habit.icon === key ? colors.primary : colors.textTertiary}
                    />
                  </Pressable>
                ))}
                <Pressable
                  onPress={() => void deleteHabit({ id: habit.id, clientId })}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${habit.title}`}
                  hitSlop={8}
                  style={styles.remove}>
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        <View style={styles.row}>
          <Input
            label="NEW HABIT"
            value={draft}
            onChangeText={setDraft}
            placeholder="e.g. 10k steps"
            returnKeyType="done"
            onSubmitEditing={add}
          />
          <Button
            label="Add habit"
            icon="add"
            variant="secondary"
            fullWidth
            disabled={!draft.trim() || creating.isLoading}
            onPress={add}
          />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.sm,
  },
  field: {
    flex: 1,
  },
  icons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipActive: {
    backgroundColor: colors.primarySoft,
  },
  remove: {
    marginLeft: 'auto',
    padding: spacing.xs,
  },
});
