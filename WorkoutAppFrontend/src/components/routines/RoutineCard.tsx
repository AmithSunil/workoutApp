import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';
import type { ClientProfile, RoutineDay } from '@/types/models';
import { WEEKDAY_ABBR, WEEK_ORDER } from '@/utils/date';
import { plural } from '@/utils/format';

import { routineTotals } from './draft';

export interface RoutineCardProps {
  title: string;
  days: RoutineDay[];
  /** Resolved from the roster by the parent so the card stays presentational. */
  assignedTo?: ClientProfile[];
  /** Small tag in the corner — "Customised" on a client's own copy. */
  badge?: string;
  onPress?: () => void;
  /** Hidden on the client's side, where assignment means nothing. */
  showAssignment?: boolean;
}

const MAX_FACES = 4;

/**
 * A routine at a glance. The week runs across the card as seven marks, so a
 * four-day split reads as a shape before any of the text is read.
 */
export function RoutineCard({
  title,
  days,
  assignedTo = [],
  badge,
  onPress,
  showAssignment = true,
}: RoutineCardProps) {
  const totals = routineTotals(days);
  const trainingDays = days.map((day) => day.weekday);

  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="h1" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" tone="secondary">
            {plural(totals.days, 'day')} · {plural(totals.exercises, 'exercise')} ·{' '}
            {plural(totals.sets, 'set')}
          </Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text variant="micro" tone="warning">
              {badge}
            </Text>
          </View>
        ) : (
          <View style={styles.icon}>
            <Ionicons name="calendar-outline" size={17} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.week}>
        {WEEK_ORDER.map((weekday) => {
          const training = trainingDays.includes(weekday);
          return (
            <View key={weekday} style={[styles.dayPip, training && styles.dayPipTraining]}>
              <Text variant="micro" color={training ? colors.primary : colors.textTertiary}>
                {WEEKDAY_ABBR[weekday].charAt(0)}
              </Text>
            </View>
          );
        })}
      </View>

      {showAssignment ? (
        <View style={styles.footer}>
          {assignedTo.length === 0 ? (
            <>
              <Ionicons name="person-add-outline" size={13} color={colors.textTertiary} />
              <Text variant="micro" tone="tertiary">
                Not assigned yet
              </Text>
            </>
          ) : (
            <>
              <View style={styles.faces}>
                {assignedTo.slice(0, MAX_FACES).map((client, i) => (
                  <View key={client.id} style={[styles.face, i > 0 && styles.faceOverlap]}>
                    <Avatar name={client.name} uri={client.avatarUrl} size={22} />
                  </View>
                ))}
              </View>
              <Text variant="micro" tone="secondary" numberOfLines={1}>
                {assignedTo.length === 1
                  ? `Assigned to ${assignedTo[0].name}`
                  : `Assigned to ${assignedTo.length} clients`}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  week: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  dayPip: {
    flex: 1,
    height: 28,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPipTraining: {
    backgroundColor: colors.primarySoft,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  faceOverlap: {
    marginLeft: -spacing.sm,
  },
});
