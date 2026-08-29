import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useGetAssignmentQuery } from '@/api/endpoints/routinesApi';
import { RoutineDayView, WeekdayStrip, routineTotals } from '@/components/routines';
import {
  Card,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
  StatTile,
  Text,
} from '@/components/ui';
import { useSession } from '@/hooks/useSession';
import { colors, spacing } from '@/theme';
import type { Weekday } from '@/types/models';
import { byWeekday } from '@/utils/date';
import { plural, restLabel } from '@/utils/format';

/**
 * A routine as the client reads it — their own copy, week laid out, nothing
 * editable.
 *
 * The assignment's owner is checked here as well as on the list screen, so a
 * stale deep link to a routine since un-assigned shows an explanation rather
 * than somebody else's programme.
 */
export default function ClientRoutineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clientId } = useSession();
  const [active, setActive] = useState<Weekday | null>(null);

  const assignment = useGetAssignmentQuery(id ?? '', { skip: !id });
  const data = assignment.data;

  if (assignment.isLoading) {
    return (
      <Screen title="Routine" showBack tabBarPadding={false}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={5} />
      </Screen>
    );
  }

  if (!data || !clientId || data.clientId !== clientId) {
    return (
      <Screen title="Routine" showBack tabBarPadding={false}>
        <Card>
          <EmptyState
            icon="lock-closed-outline"
            title="Not available"
            message="This routine isn't assigned to you any more. Check your programme, or message your coach."
          />
        </Card>
      </Screen>
    );
  }

  const days = [...data.days].sort(byWeekday);
  const activeWeekday: Weekday = active ?? days[0]?.weekday ?? 'mon';
  const activeDay = days.find((day) => day.weekday === activeWeekday) ?? null;

  const totals = routineTotals(days);
  const allExercises = days.flatMap((day) => day.exercises);
  const avgRest = Math.round(
    allExercises.reduce((sum, e) => sum + e.restSeconds, 0) / Math.max(allExercises.length, 1)
  );
  const peakRpe = allExercises.reduce((max, e) => Math.max(max, e.targetRpe), 0);

  return (
    <Screen
      title={data.title}
      subtitle={`${plural(totals.days, 'training day')} a week · from your coach`}
      showBack
      tabBarPadding={false}>
      <View style={styles.tiles}>
        <StatTile
          label="Days / week"
          value={`${totals.days}`}
          icon="calendar-outline"
          tone="primary"
        />
        <StatTile label="Working sets" value={`${totals.sets}`} icon="barbell-outline" />
        <StatTile
          label="Peak RPE"
          value={`${peakRpe}`}
          hint={`${restLabel(avgRest)} rest`}
          icon="speedometer-outline"
          tone={peakRpe >= 9 ? 'danger' : 'success'}
        />
      </View>

      {data.notes ? (
        <Card style={styles.noteCard}>
          <View style={styles.noteRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
            <View style={styles.noteText}>
              <Text variant="micro" tone="primary">
                FROM YOUR COACH
              </Text>
              <Text variant="caption" tone="secondary">
                {data.notes}
              </Text>
            </View>
          </View>
        </Card>
      ) : null}

      <SectionHeader title="Your week" caption="Tap a day to see it" />
      <WeekdayStrip
        trainingDays={days.map((day) => day.weekday)}
        active={activeWeekday}
        onPress={setActive}
      />
      <RoutineDayView day={activeDay} weekday={activeWeekday} />

      <Text variant="micro" tone="tertiary" align="center">
        RPE is how hard the set should feel — RPE 8 means about two reps left in the tank.
      </Text>
    </Screen>
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
    gap: 2,
  },
});
