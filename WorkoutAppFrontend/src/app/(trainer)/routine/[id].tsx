import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  useAssignRoutineMutation,
  useDeleteRoutineMutation,
  useDuplicateRoutineMutation,
  useGetRoutineAssignmentsQuery,
  useGetRoutineQuery,
} from '@/api/endpoints/routinesApi';
import { useGetClientsQuery } from '@/api/endpoints/trainerApi';
import {
  AssignSheet,
  RoutineDayView,
  WeekdayStrip,
  routineTotals,
} from '@/components/routines';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { routes } from '@/navigation/routes';
import { colors, spacing, statusColor } from '@/theme';
import type { AssignedRoutine, ClientProfile, Weekday } from '@/types/models';
import { byWeekday } from '@/utils/date';
import { plural, restLabel } from '@/utils/format';

/**
 * One library routine: the week as written, and who is following it.
 *
 * Each assigned client links through to their own copy, which is where a
 * per-client adjustment is made — never here, where it would hit everyone.
 */
export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const routineId = id ?? '';
  const routine = useGetRoutineQuery(routineId, { skip: !routineId });
  const assignments = useGetRoutineAssignmentsQuery({ routineId }, { skip: !routineId });
  const clients = useGetClientsQuery();

  const [assignRoutine, { isLoading: assigning }] = useAssignRoutineMutation();
  const [duplicateRoutine, { isLoading: duplicating }] = useDuplicateRoutineMutation();
  const [deleteRoutine, { isLoading: deleting }] = useDeleteRoutineMutation();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [active, setActive] = useState<Weekday | null>(null);

  const data = routine.data;

  const rows = useMemo(
    () =>
      (assignments.data ?? []).map((assignment) => ({
        assignment,
        client: (clients.data ?? []).find((c) => c.id === assignment.clientId),
      })),
    [assignments.data, clients.data]
  );

  if (routine.isLoading || !data) {
    return (
      <Screen title="Routine" showBack tabBarPadding={false}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </Screen>
    );
  }

  const sorted = [...data.days].sort(byWeekday);
  const activeWeekday: Weekday = active ?? sorted[0]?.weekday ?? 'mon';
  const activeDay = sorted.find((day) => day.weekday === activeWeekday) ?? null;

  const totals = routineTotals(data.days);
  const allExercises = data.days.flatMap((day) => day.exercises);
  const avgRest = Math.round(
    allExercises.reduce((sum, e) => sum + e.restSeconds, 0) / Math.max(allExercises.length, 1)
  );

  const openAssign = () => {
    setSelectedIds(data.assignedClientIds);
    setAssignError(null);
    setAssignOpen(true);
  };

  return (
    <Screen
      title={data.title}
      subtitle={`${plural(totals.days, 'training day')} · ${plural(totals.exercises, 'exercise')} · ${plural(totals.sets, 'set')}`}
      showBack
      tabBarPadding={false}
      headerRight={
        <Button
          label="Edit"
          size="sm"
          variant="secondary"
          onPress={() => router.push(routes.trainer.routineEdit(data.id))}
        />
      }>
      <View style={styles.tiles}>
        <StatTile label="Days / week" value={`${totals.days}`} icon="calendar-outline" tone="primary" />
        <StatTile label="Avg rest" value={restLabel(avgRest)} icon="time-outline" />
        <StatTile label="Working sets" value={`${totals.sets}`} icon="barbell-outline" />
      </View>

      {data.notes ? (
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <Text variant="caption" tone="secondary" style={styles.noteText}>
              {data.notes}
            </Text>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="The week" caption="Tap a day to see what it prescribes" />
      <WeekdayStrip
        trainingDays={sorted.map((day) => day.weekday)}
        active={activeWeekday}
        onPress={setActive}
      />
      <RoutineDayView day={activeDay} weekday={activeWeekday} />

      <SectionHeader
        title="Assigned to"
        caption={
          rows.length === 0
            ? 'Nobody sees this routine yet'
            : `${plural(rows.length, 'client')} following it`
        }
        actionLabel="Edit"
        onAction={openAssign}
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            icon="person-add-outline"
            title="Not assigned"
            message="Pick the clients who should see this routine in their app."
            actionLabel="Assign to clients"
            onAction={openAssign}
            compact
          />
        ) : (
          rows.map(({ assignment, client }, index) => (
            <View key={assignment.assignmentId}>
              {index > 0 ? <Divider /> : null}
              <AssignedClientRow
                assignment={assignment}
                client={client}
                onPress={() => router.push(routes.trainer.assignment(assignment.assignmentId))}
              />
            </View>
          ))
        )}
      </Card>

      <View style={styles.footerActions}>
        <Button
          label="Duplicate"
          icon="copy-outline"
          variant="secondary"
          loading={duplicating}
          style={styles.footerButton}
          onPress={() => {
            void duplicateRoutine(data.id)
              .unwrap()
              .then((copy) => router.replace(routes.trainer.routineDetail(copy.id)));
          }}
        />
        <Button
          label={confirmingDelete ? 'Tap to confirm' : 'Delete'}
          icon={confirmingDelete ? 'alert-circle-outline' : 'trash-outline'}
          variant={confirmingDelete ? 'danger' : 'secondary'}
          loading={deleting}
          style={styles.footerButton}
          onPress={() => {
            // Two-tap confirm rather than a modal alert: a blocking browser
            // dialog would freeze the web build the smoke test drives.
            if (!confirmingDelete) {
              setConfirmingDelete(true);
              return;
            }
            void deleteRoutine(data.id)
              .unwrap()
              .then(() => router.replace(routes.trainer.routines()));
          }}
        />
      </View>
      {confirmingDelete ? (
        <Text variant="micro" tone="tertiary" align="center">
          Deleting removes this routine from {plural(rows.length, 'client')}, customised copies
          included.
        </Text>
      ) : null}

      <AssignSheet
        visible={assignOpen}
        onClose={() => setAssignOpen(false)}
        clients={clients.data ?? []}
        selectedIds={selectedIds}
        saving={assigning}
        error={assignError}
        onToggle={(clientId) =>
          setSelectedIds((prev) =>
            prev.includes(clientId) ? prev.filter((c) => c !== clientId) : [...prev, clientId]
          )
        }
        onConfirm={() => {
          setAssignError(null);
          void assignRoutine({ id: data.id, clientIds: selectedIds })
            .unwrap()
            .then(() => setAssignOpen(false))
            // Unticking someone whose only routine this is would empty their
            // app, so the server refuses it — say so rather than closing.
            .catch(() =>
              setAssignError(
                'Someone you unticked has no other routine. A client keeps their last one until another is assigned.'
              )
            );
        }}
      />
    </Screen>
  );
}

function AssignedClientRow({
  assignment,
  client,
  onPress,
}: {
  assignment: AssignedRoutine;
  client?: ClientProfile;
  onPress: () => void;
}) {
  const name = client?.name ?? 'Client';

  return (
    <View style={styles.clientRow}>
      <Avatar
        name={name}
        uri={client?.avatarUrl}
        size={36}
        status={client?.compliance.status}
      />
      <View style={styles.clientText}>
        <Text variant="body" numberOfLines={1}>
          {name}
        </Text>
        {assignment.customised ? (
          <Text variant="micro" tone="warning" numberOfLines={1}>
            Customised · {plural(assignment.days.length, 'day')}
          </Text>
        ) : (
          <Text
            variant="micro"
            color={client ? statusColor(client.compliance.status) : colors.textTertiary}
            numberOfLines={1}>
            Following the template
          </Text>
        )}
      </View>
      <Button label="Open" variant="secondary" size="sm" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.primarySoft,
  },
  noteRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  noteText: {
    flex: 1,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  clientText: {
    flex: 1,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
