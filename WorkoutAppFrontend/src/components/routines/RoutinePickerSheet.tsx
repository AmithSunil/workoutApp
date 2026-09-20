import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Sheet, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Routine } from '@/types/models';
import { WEEK_ORDER } from '@/utils/date';
import { plural } from '@/utils/format';

import { routineTotals } from './draft';

export interface RoutinePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  routines: Routine[];
  /** The routine this client follows — shown ticked and not re-assignable. */
  assignedRoutineIds: string[];
  onPick: (routineId: string) => void;
  /** Id currently being assigned, so the row can show a spinner. */
  busyRoutineId?: string | null;
  clientName: string;
}

/**
 * Pick a routine from the library for one client — the assignment flow that
 * starts on the client's profile rather than on the routine.
 *
 * A client follows exactly one routine, so picking one here replaces the one
 * they have; the sheet says so rather than leaving the trainer to find out.
 */
export function RoutinePickerSheet({
  visible,
  onClose,
  routines,
  assignedRoutineIds,
  onPick,
  busyRoutineId,
  clientName,
}: RoutinePickerSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={`Assign to ${clientName}`} height="76%">
      <Text variant="caption" tone="secondary" style={styles.intro}>
        Pick a routine from your library — it replaces the one {clientName} is following now.
        You can tailor it for them afterwards without touching anyone else&apos;s copy.
      </Text>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No routines in your library"
            message="Build one from the Routines tab, then come back to assign it."
            compact
          />
        }
        renderItem={({ item }) => {
          const already = assignedRoutineIds.includes(item.id);
          const busy = busyRoutineId === item.id;
          const totals = routineTotals(item.days);
          const trainingDays = item.days.map((day) => day.weekday);

          return (
            <Pressable
              disabled={already || busy}
              onPress={() => onPick(item.id)}
              accessibilityRole="button"
              accessibilityState={{ disabled: already }}
              accessibilityLabel={`Assign ${item.title}`}
              style={({ pressed }) => [
                styles.row,
                already && styles.rowAssigned,
                pressed && !already && styles.pressed,
              ]}>
              <View style={styles.rowText}>
                <Text variant="body" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {plural(totals.days, 'day')} · {plural(totals.exercises, 'exercise')} ·{' '}
                  {plural(totals.sets, 'set')}
                </Text>
                <View style={styles.week}>
                  {WEEK_ORDER.map((weekday) => (
                    <View
                      key={weekday}
                      style={[
                        styles.pip,
                        trainingDays.includes(weekday) && styles.pipTraining,
                      ]}
                    />
                  ))}
                </View>
              </View>

              {busy ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <View style={[styles.action, already && styles.actionAssigned]}>
                  <Ionicons
                    name={already ? 'checkmark' : 'add'}
                    size={16}
                    color={already ? colors.success : colors.textOnPrimary}
                  />
                </View>
              )}
            </Pressable>
          );
        }}
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
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'transparent',
  },
  rowAssigned: {
    borderColor: colors.successSoft,
    backgroundColor: colors.successSoft,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  week: {
    flexDirection: 'row',
    gap: 3,
    marginTop: spacing.sm,
  },
  pip: {
    width: 14,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  pipTraining: {
    backgroundColor: colors.primary,
  },
  action: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionAssigned: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
});
