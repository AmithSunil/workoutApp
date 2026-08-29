import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useGetExercisesQuery } from '@/api/endpoints/workoutsApi';
import { Button, Chip, EmptyState, Sheet, Skeleton, Text } from '@/components/ui';
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
        contentContainerStyle={styles.filters}>
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={value === 'all' ? 'All' : value}
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
              <Pressable
                onPress={() => onAdd(item)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name}`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <View style={styles.rowText}>
                  <Text variant="body" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text variant="micro" tone="tertiary" numberOfLines={1}>
                    {item.muscleGroup} · {item.equipment}
                  </Text>
                </View>
                <View style={[styles.addButton, added && styles.addButtonAdded]}>
                  <Ionicons
                    name={added ? 'checkmark' : 'add'}
                    size={16}
                    color={added ? colors.success : colors.textOnPrimary}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Button label="Done" fullWidth onPress={onClose} style={styles.done} />
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
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  filters: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
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
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonAdded: {
    backgroundColor: colors.successSoft,
  },
  pressed: {
    opacity: 0.7,
  },
  done: {
    marginTop: spacing.sm,
  },
});
