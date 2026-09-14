import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, EmptyState, Sheet, Text } from '@/components/ui';
import { colors, radius, spacing, statusColor } from '@/theme';
import type { ClientProfile } from '@/types/models';
import { GOAL_LABEL } from '@/utils/goal';

export interface AssignSheetProps {
  visible: boolean;
  onClose: () => void;
  clients: ClientProfile[];
  /** Selection is owned by the parent so the sheet can be cancelled cleanly. */
  selectedIds: string[];
  onToggle: (clientId: string) => void;
  onConfirm: () => void;
  saving?: boolean;
  /** Wording differs between assigning a new routine and editing an assignment. */
  confirmLabel?: string;
  /** Shown above the confirm button when the save was refused. */
  error?: string | null;
}

/**
 * Client multi-select. The selection is a complete replacement of the routine's
 * assignment list, so unticking someone removes it from their app — the confirm
 * label says "Save assignment" rather than "Assign" for exactly that reason.
 */
export function AssignSheet({
  visible,
  onClose,
  clients,
  selectedIds,
  onToggle,
  onConfirm,
  saving,
  confirmLabel,
  error,
}: AssignSheetProps) {
  const count = selectedIds.length;

  return (
    <Sheet visible={visible} onClose={onClose} title="Assign to clients" height="78%">
      <Text variant="caption" tone="secondary" style={styles.intro}>
        Everyone ticked here sees this routine in their app. Unticking removes it.
      </Text>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="people-outline" title="No clients yet" compact />}
        renderItem={({ item }) => {
          const selected = selectedIds.includes(item.id);
          return (
            <Pressable
              onPress={() => onToggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Assign to ${item.name}`}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.pressed,
              ]}>
              <Avatar
                name={item.name}
                uri={item.avatarUrl}
                size={38}
                status={item.compliance.status}
              />
              <View style={styles.rowText}>
                <Text variant="body" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text
                  variant="micro"
                  color={statusColor(item.compliance.status)}
                  numberOfLines={1}>
                  {GOAL_LABEL[item.goal]} · {item.compliance.score}% adherence
                </Text>
              </View>
              <View style={[styles.check, selected && styles.checkSelected]}>
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}

      <Button
        label={confirmLabel ?? (count === 0 ? 'Save assignment' : `Save assignment (${count})`)}
        fullWidth
        loading={saving}
        onPress={onConfirm}
        style={styles.confirm}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: {
    paddingTop: spacing.sm,
  },
  list: {
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  rowSelected: {
    borderColor: colors.primarySoftBorder,
    backgroundColor: colors.primarySoft,
  },
  rowText: {
    flex: 1,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  confirm: {
    marginTop: spacing.sm,
  },
});
