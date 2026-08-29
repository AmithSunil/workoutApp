import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  useGetRoutineAssignmentsQuery,
  useGetRoutineQuery,
  useUpdateRoutineMutation,
} from '@/api/endpoints/routinesApi';
import { RoutineBuilder } from '@/components/routines';
import { Card, Screen, SkeletonCard, Text } from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, spacing } from '@/theme';
import { plural } from '@/utils/format';

/**
 * Edit a library template.
 *
 * Clients still following the template pick the change up immediately; anyone
 * whose copy has been customised keeps theirs, which the notice spells out
 * before the trainer starts typing.
 */
export default function EditRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const routineId = id ?? '';
  const routine = useGetRoutineQuery(routineId, { skip: !routineId });
  const assignments = useGetRoutineAssignmentsQuery({ routineId }, { skip: !routineId });
  const [updateRoutine, { isLoading }] = useUpdateRoutineMutation();
  const [error, setError] = useState<string | null>(null);

  // The builder seeds its state once, so it must not mount before the routine
  // has loaded — otherwise it would seed itself from an empty draft.
  if (routine.isLoading || !routine.data) {
    return (
      <Screen title="Edit routine" showBack tabBarPadding={false}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </Screen>
    );
  }

  const customised = (assignments.data ?? []).filter((a) => a.customised);
  const following = (assignments.data ?? []).length - customised.length;

  return (
    <RoutineBuilder
      screenTitle="Edit routine"
      initial={{
        title: routine.data.title,
        notes: routine.data.notes,
        days: routine.data.days,
      }}
      submitLabel="Save changes"
      submitting={isLoading}
      error={error}
      notice={
        customised.length > 0 ? (
          <Card style={styles.notice}>
            <View style={styles.noticeText}>
              <Text variant="h2">Some clients have their own version</Text>
              <Text variant="caption" tone="secondary">
                {plural(customised.length, 'client')}{' '}
                {customised.length === 1 ? 'has' : 'have'} a customised copy and will keep it.
                This change reaches the {plural(following, 'client')} still following the
                template.
              </Text>
            </View>
          </Card>
        ) : null
      }
      onSubmit={(value) => {
        setError(null);
        void updateRoutine({ id: routineId, patch: value })
          .unwrap()
          .then(() => router.replace(routes.trainer.routineDetail(routineId)))
          .catch(() => setError('Could not save these changes. Check the name and try again.'));
      }}
    />
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: colors.warningSoft,
  },
  noticeText: {
    gap: spacing.xs,
  },
});
