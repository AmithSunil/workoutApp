import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import {
  useCreateHabitMutation,
  useDeleteHabitMutation,
  useUpdateHabitMutation,
} from '@/api/endpoints/progressApi';
import { Button, Card, EmptyState, PressableScale, Sheet, Text } from '@/components/ui';
import { HABIT_ICONS } from '@/components/progress/HabitChecklist';
import { colors, fonts, radius, spacing } from '@/theme';
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
    <Sheet visible={visible} onClose={onClose} title="Daily habits" height="84%">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}>
        <Text variant="caption" tone="secondary">
          What your client ticks off each day. Changes save as you go, and renaming one keeps its
          history.
        </Text>

        {/* Add first — it's the most common reason to open this */}
        <View style={styles.addRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Add a habit, e.g. 10k steps"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={add}
            style={styles.addInput}
            accessibilityLabel="New habit"
          />
          <PressableScale
            onPress={add}
            disabled={!draft.trim() || creating.isLoading}
            accessibilityRole="button"
            accessibilityLabel="Add habit"
            style={[styles.addButton, !draft.trim() && styles.addButtonOff]}>
            <Ionicons
              name="add"
              size={22}
              color={draft.trim() ? colors.textOnPrimary : colors.textTertiary}
            />
          </PressableScale>
        </View>

        {habits.length === 0 ? (
          <EmptyState icon="list-outline" title="No habits yet" compact />
        ) : (
          <Card padded={false}>
            {habits.map((habit, i) => (
              <View key={habit.id} style={[styles.habit, i > 0 && styles.habitRule]}>
                <View style={styles.titleRow}>
                  <View style={styles.currentIcon}>
                    <Ionicons
                      name={HABIT_ICONS[habit.icon] ?? 'ellipse-outline'}
                      size={18}
                      color={colors.primaryText}
                    />
                  </View>
                  <TextInput
                    defaultValue={habit.title}
                    placeholder="Habit"
                    placeholderTextColor={colors.textTertiary}
                    returnKeyType="done"
                    style={styles.titleInput}
                    accessibilityLabel={`Rename ${habit.title}`}
                    onEndEditing={(e) => {
                      const title = e.nativeEvent.text.trim();
                      if (title && title !== habit.title) {
                        void updateHabit({ id: habit.id, clientId, patch: { title } });
                      }
                    }}
                  />
                  <Pressable
                    onPress={() => void deleteHabit({ id: habit.id, clientId })}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${habit.title}`}
                    hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.textTertiary} />
                  </Pressable>
                </View>

                <View style={styles.icons}>
                  {ICON_KEYS.map((key) => {
                    const on = habit.icon === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() =>
                          void updateHabit({ id: habit.id, clientId, patch: { icon: key } })
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`Use the ${key} icon`}
                        hitSlop={4}
                        style={[styles.iconChip, on && styles.iconChipActive]}>
                        <Ionicons
                          name={HABIT_ICONS[key]}
                          size={15}
                          color={on ? colors.primaryText : colors.textTertiary}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Done" variant="secondary" size="lg" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonOff: {
    backgroundColor: colors.surfaceMuted,
  },
  habit: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  habitRule: {
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.divider,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currentIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInput: {
    flex: 1,
    paddingVertical: spacing.xs,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  icons: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: 36 + spacing.md,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  iconChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  footer: {
    paddingTop: spacing.md,
  },
});
