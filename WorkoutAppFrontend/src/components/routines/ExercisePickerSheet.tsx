import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useGetExercisesQuery } from '@/api/endpoints/workoutsApi';
import { Button, Chip, EmptyState, PressableScale, Sheet, Skeleton, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { Exercise, MuscleGroup } from '@/types/models';

export interface ExercisePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (exercise: Exercise) => void;
  /** Exercises already on this day — shown ticked so doubles are deliberate. */
  addedExerciseIds: string[];
  /** Names the day being filled, e.g. "Add to Monday". */
  title?: string;
}

type Filter = MuscleGroup | 'all';

const FILTERS: Filter[] = [
  'all',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full body',
  'conditioning',
];

/**
 * Exercise library picker. Stays open after each add so building a six-exercise
 * routine is six taps rather than six round-trips through the sheet.
 */
export function ExercisePickerSheet({
  visible,
  onClose,
  onAdd,
  addedExerciseIds,
  title = 'Add exercises',
}: ExercisePickerSheetProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const { data: exercises = [], isLoading } = useGetExercisesQuery(undefined, { skip: !visible });

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (filter !== 'all' && exercise.muscleGroup !== filter) return false;
      if (!needle) return true;
      return `${exercise.name} ${exercise.equipment}`.toLowerCase().includes(needle);
    });
  }, [exercises, query, filter]);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([['all', exercises.length]]);
    for (const exercise of exercises) {
      map.set(exercise.muscleGroup, (map.get(exercise.muscleGroup) ?? 0) + 1);
    }
    return map;
  }, [exercises]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} height="86%">
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Squat, row, plank…"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={16} color={colors.borderStrong} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}>
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
            accent={colors.surfaceInk}
            selected={filter === value}
            count={counts.get(value) ?? 0}
            onPress={() => setFilter(value)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loading}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} height={52} radius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No matching exercises"
              message="Try a shorter word, or clear the muscle-group filter."
              compact
            />
          }
          renderItem={({ item }) => {
            const added = addedExerciseIds.includes(item.id);
            return (
              <PressableScale
                onPress={() => onAdd(item)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                style={[styles.row]}>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.meta}>
                    {item.muscleGroup} · {item.equipment}
                  </Text>
                </View>
                <View style={[styles.addButton, added && styles.addButtonAdded]}>
                  <Ionicons
                    name={added ? 'checkmark' : 'add'}
                    size={18}
                    color={added ? colors.textOnPrimary : colors.primaryText}
                  />
                </View>
              </PressableScale>
            );
          }}
        />
      )}

      <Button
        label={
          addedExerciseIds.length > 0
            ? `Done · ${addedExerciseIds.length} on this day`
            : 'Done'
        }
        size="lg"
        fullWidth
        onPress={onClose}
        style={styles.done}
      />
    </Sheet>
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
  filtersScroll: {
    flexGrow: 0,
    flexShrink: 0,
    marginHorizontal: -spacing.xl,
  },
  filters: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  meta: {
    textTransform: 'capitalize',
  },
  loading: {
    gap: spacing.sm,
  },
  list: {
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonAdded: {
    backgroundColor: colors.success,
  },
  done: {
    marginTop: spacing.sm,
  },
});
