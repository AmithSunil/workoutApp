/**
 * PostgREST rows → the domain models in `src/types/models.ts`.
 *
 * The backend is normalised and snake_case; the app is nested and camelCase.
 * This file is the whole of that translation, and it is the direct descendant
 * of `WorkoutAppBackend/seed/verify.mjs`, which round-trips every seeded record
 * through exactly these reshapes and deep-compares the result against the
 * fixture it came from. If a mapping here changes, that check is what proves it.
 *
 * Two conversions are not optional:
 *
 *  - **Timestamps.** PostgREST renders `timestamptz` as `2026-08-29T19:45:00+00:00`;
 *    the app's fixtures, its sorts and its date helpers all assume the `…Z`
 *    form. Every timestamp goes through `iso()`.
 *  - **Numerics.** `numeric` arrives as a JSON number, but with the column's
 *    scale still attached (`4303.00`, `1.50`). `num()` normalises it and passes
 *    null through, so a nullable measurement never becomes `NaN`.
 */
import type {
  AiFoodSuggestion,
  AssignedRoutine,
  BodyMetric,
  CheckIn,
  ClientProfile,
  Exercise,
  FoodEntry,
  FoodItem,
  Habit,
  Message,
  MessageAttachment,
  NutritionDay,
  ProgressPhoto,
  RedFlagAlert,
  Routine,
  RoutineDay,
  RoutineExercise,
  Thread,
  TrainerProfile,
  TrainerSummary,
  WorkoutLog,
  WorkoutSession,
} from '@/types/models';

/* ------------------------------------------------------------------ scalars */

type Nullable<T> = T | null;

/** Postgres `numeric` carries its scale into JSON; normalise and keep nulls. */
const num = (v: unknown): number => Number(v ?? 0);
const numOrUndefined = (v: unknown): number | undefined =>
  v === null || v === undefined ? undefined : Number(v);

/** `timestamptz` → the `…Z` ISO form the rest of the app assumes. */
const iso = (v: Nullable<string>): string => (v ? new Date(v).toISOString() : '');
const isoOrNull = (v: Nullable<string>): string | null => (v ? new Date(v).toISOString() : null);

/** Postgres nulls are the app's absent optional fields, not `null` values. */
const opt = (v: Nullable<string>): string | undefined => v ?? undefined;

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/* --------------------------------------------------------------- row shapes */

export interface UserRow {
  name: string;
  email: string;
  avatar_url: string;
}

export interface TrainerProfileRow extends UserRow {
  id: string;
  headline: string;
  client_ids: string[];
}

export interface ClientProfileRow {
  id: string;
  trainer_id: string;
  goal: ClientProfile['goal'];
  height_cm: number;
  start_weight_kg: number;
  target_weight_kg: number;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  joined_at: string;
  compliance_score: number;
  compliance_status: ClientProfile['compliance']['status'];
  last_logged_at: Nullable<string>;
  compliance_streak_days: number;
  users: UserRow;
}

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: Exercise['muscleGroup'];
  equipment: string;
}

export interface FoodRow {
  id: string;
  name: string;
  brand: Nullable<string>;
  serving_label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  frequent: boolean;
}

export interface AiSuggestionRow {
  id: string;
  transcript: string;
  confidence: number;
  items: AiFoodSuggestion['items'];
}

export interface FoodEntryRow {
  id: string;
  client_id: string;
  date: string;
  slot: FoodEntry['slot'];
  food_id: Nullable<string>;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: FoodEntry['source'];
  logged_at: string;
}

export interface NutritionDayRow {
  client_id: string;
  date: string;
  target_calories: number;
  target_protein: number;
  target_carbs: number;
  target_fat: number;
  consumed_calories: number;
  consumed_protein: number;
  consumed_carbs: number;
  consumed_fat: number;
  food_entries: FoodEntryRow[];
}

export interface PrescribedSetRow {
  position: number;
  reps: number;
  target_weight_kg: Nullable<number>;
}

export interface SessionExerciseRow {
  id: string;
  exercise_id: string;
  name: string;
  muscle_group: Exercise['muscleGroup'];
  notes: Nullable<string>;
  position: number;
  prescribed_sets: PrescribedSetRow[];
}

export interface WorkoutSessionRow {
  id: string;
  client_id: string;
  title: string;
  scheduled_for: string;
  estimated_minutes: number;
  focus: Exercise['muscleGroup'];
  status: WorkoutSession['status'];
  session_exercises: SessionExerciseRow[];
}

export interface LoggedSetRow {
  id: string;
  position: number;
  reps: number;
  weight_kg: number;
  completed: boolean;
}

export interface LoggedExerciseRow {
  id: string;
  exercise_id: string;
  name: string;
  muscle_group: Exercise['muscleGroup'];
  position: number;
  logged_sets: LoggedSetRow[];
}

export interface WorkoutLogRow {
  id: string;
  client_id: string;
  session_id: Nullable<string>;
  title: string;
  date: string;
  duration_minutes: number;
  rpe: number;
  total_volume_kg: number;
  notes: Nullable<string>;
  completed_at: string;
  logged_exercises: LoggedExerciseRow[];
}

export interface RoutineExerciseRow {
  id: string;
  exercise_id: string;
  name: string;
  muscle_group: Exercise['muscleGroup'];
  sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  target_rpe: number;
  notes: Nullable<string>;
  position: number;
}

export interface RoutineDayRow {
  id: string;
  weekday: RoutineDay['weekday'];
  name: Nullable<string>;
  focus: Exercise['muscleGroup'];
  notes: Nullable<string>;
  position: number;
  routine_exercises?: RoutineExerciseRow[];
  routine_assignment_exercises?: RoutineExerciseRow[];
}

export interface RoutineRow {
  id: string;
  trainer_id: string;
  title: string;
  notes: Nullable<string>;
  created_at: string;
  updated_at: string;
  routine_days: RoutineDayRow[];
  routine_assignments?: Array<{ client_id: string; assigned_at: string }>;
}

export interface AssignmentRow {
  id: string;
  routine_id: string;
  client_id: string;
  customised: boolean;
  assigned_at: string;
  updated_at: string;
  routines: RoutineRow;
  routine_assignment_days: RoutineDayRow[];
}

export interface BodyMetricRow {
  id: string;
  client_id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: Nullable<number>;
  waist_cm: Nullable<number>;
}

export interface ProgressPhotoRow {
  id: string;
  client_id: string;
  date: string;
  pose: ProgressPhoto['pose'];
  uri: string;
  weight_kg: Nullable<number>;
}

export interface HabitRow {
  id: string;
  client_id: string;
  title: string;
  icon: string;
  cadence: 'daily';
  created_by: Habit['createdBy'];
  habit_completions: Array<{ date: string }>;
}

export interface ThreadRow {
  id: string;
  client_id: string;
  trainer_id: string;
  last_message_preview: string;
  last_message_at: Nullable<string>;
  unread_for_trainer: number;
  unread_for_client: number;
}

export interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  attachment_kind: Nullable<MessageAttachment['kind']>;
  attachment_log_id: Nullable<string>;
  attachment_date: Nullable<string>;
  attachment_uri: Nullable<string>;
  sent_at: string;
  read_at: Nullable<string>;
}

export interface AlertRow {
  id: string;
  client_id: string;
  kind: RedFlagAlert['kind'];
  severity: RedFlagAlert['severity'];
  title: string;
  detail: string;
  raised_at: string;
  resolved: boolean;
}

export interface CheckInRow {
  id: string;
  client_id: string;
  week_of: string;
  submitted_at: string;
  status: CheckIn['status'];
  weight_change_kg: number;
  avg_calories: number;
  target_calories: number;
  sessions_completed: number;
  sessions_planned: number;
  avg_rpe: number;
  client_note: string;
}

export interface TrainerSummaryRow {
  active_clients: number;
  pending_check_ins: number;
  unread_messages: number;
  critical_alerts: number;
  weekly_compliance_avg: number;
}

/* ----------------------------------------------------------------- mappers */

export const toTrainerProfile = (r: TrainerProfileRow): TrainerProfile => ({
  id: r.id,
  role: 'trainer',
  name: r.name,
  email: r.email,
  avatarUrl: r.avatar_url,
  headline: r.headline,
  clientIds: r.client_ids,
});

export const toClientProfile = (r: ClientProfileRow): ClientProfile => ({
  id: r.id,
  role: 'client',
  name: r.users.name,
  email: r.users.email,
  avatarUrl: r.users.avatar_url,
  trainerId: r.trainer_id,
  goal: r.goal,
  heightCm: num(r.height_cm),
  startWeightKg: num(r.start_weight_kg),
  targetWeightKg: num(r.target_weight_kg),
  targets: {
    calories: r.target_calories,
    protein: r.target_protein,
    carbs: r.target_carbs,
    fat: r.target_fat,
  },
  joinedAt: r.joined_at,
  compliance: {
    // The stored status, not one re-derived from the score. The backend owns
    // this rollup (plan 7.1); deriving it here would put two answers in the app.
    status: r.compliance_status,
    score: r.compliance_score,
    lastLoggedAt: isoOrNull(r.last_logged_at),
    streakDays: r.compliance_streak_days,
  },
});

export const toExercise = (r: ExerciseRow): Exercise => ({
  id: r.id,
  name: r.name,
  muscleGroup: r.muscle_group,
  equipment: r.equipment,
});

export const toFoodItem = (r: FoodRow): FoodItem => ({
  id: r.id,
  name: r.name,
  brand: opt(r.brand),
  servingLabel: r.serving_label,
  calories: r.calories,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  emoji: r.emoji,
  frequent: r.frequent,
});

export const toAiSuggestion = (r: AiSuggestionRow): AiFoodSuggestion => ({
  id: r.id,
  transcript: r.transcript,
  confidence: num(r.confidence),
  items: r.items,
});

export const toFoodEntry = (r: FoodEntryRow): FoodEntry => ({
  id: r.id,
  clientId: r.client_id,
  date: r.date,
  slot: r.slot,
  foodId: r.food_id ?? '',
  name: r.name,
  servings: num(r.servings),
  calories: r.calories,
  protein: r.protein,
  carbs: r.carbs,
  fat: r.fat,
  source: r.source,
  loggedAt: iso(r.logged_at),
});

export const toNutritionDay = (r: NutritionDayRow): NutritionDay => ({
  date: r.date,
  clientId: r.client_id,
  targets: {
    calories: r.target_calories,
    protein: r.target_protein,
    carbs: r.target_carbs,
    fat: r.target_fat,
  },
  consumed: {
    calories: r.consumed_calories,
    protein: r.consumed_protein,
    carbs: r.consumed_carbs,
    fat: r.consumed_fat,
  },
  entries: [...(r.food_entries ?? [])]
    .sort((a, b) => (a.logged_at < b.logged_at ? -1 : 1))
    .map(toFoodEntry),
});

export const toWorkoutSession = (r: WorkoutSessionRow): WorkoutSession => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  scheduledFor: r.scheduled_for,
  estimatedMinutes: r.estimated_minutes,
  focus: r.focus,
  status: r.status,
  exercises: [...(r.session_exercises ?? [])].sort(byPosition).map((x) => ({
    id: x.id,
    exerciseId: x.exercise_id,
    name: x.name,
    muscleGroup: x.muscle_group,
    notes: opt(x.notes),
    sets: [...(x.prescribed_sets ?? [])].sort(byPosition).map((s) => ({
      reps: s.reps,
      targetWeightKg: s.target_weight_kg === null ? null : Number(s.target_weight_kg),
    })),
  })),
});

export const toWorkoutLog = (r: WorkoutLogRow): WorkoutLog => ({
  id: r.id,
  clientId: r.client_id,
  // An ad-hoc workout has no scheduled session; the model declares a string.
  sessionId: r.session_id ?? '',
  title: r.title,
  date: r.date,
  durationMinutes: r.duration_minutes,
  rpe: num(r.rpe),
  totalVolumeKg: num(r.total_volume_kg),
  notes: opt(r.notes),
  completedAt: iso(r.completed_at),
  exercises: [...(r.logged_exercises ?? [])].sort(byPosition).map((x) => ({
    id: x.id,
    exerciseId: x.exercise_id,
    name: x.name,
    muscleGroup: x.muscle_group,
    sets: [...(x.logged_sets ?? [])].sort(byPosition).map((s) => ({
      id: s.id,
      reps: s.reps,
      weightKg: num(s.weight_kg),
      completed: s.completed,
    })),
  })),
});

const toRoutineExercise = (r: RoutineExerciseRow): RoutineExercise => ({
  id: r.id,
  exerciseId: r.exercise_id,
  name: r.name,
  muscleGroup: r.muscle_group,
  sets: r.sets,
  repMin: r.rep_min,
  repMax: r.rep_max,
  restSeconds: r.rest_seconds,
  targetRpe: num(r.target_rpe),
  notes: opt(r.notes),
});

/**
 * Days come back Monday-first from the weekday enum's own ordering, which is
 * why these sort on `position` only as a tiebreaker — the enum is the schedule.
 */
const toRoutineDays = (rows: RoutineDayRow[] | undefined): RoutineDay[] =>
  [...(rows ?? [])].sort(byPosition).map((d) => ({
    id: d.id,
    weekday: d.weekday,
    name: opt(d.name),
    focus: d.focus,
    notes: opt(d.notes),
    exercises: [...(d.routine_exercises ?? d.routine_assignment_exercises ?? [])]
      .sort(byPosition)
      .map(toRoutineExercise),
  }));

export const toRoutine = (r: RoutineRow): Routine => ({
  id: r.id,
  trainerId: r.trainer_id,
  title: r.title,
  notes: opt(r.notes),
  days: toRoutineDays(r.routine_days),
  // Membership is the source of truth; this array is derived on every read so
  // the routine and its assignments can never disagree.
  assignedClientIds: [...(r.routine_assignments ?? [])]
    .sort((a, b) => (a.assigned_at < b.assigned_at ? 1 : -1))
    .map((a) => a.client_id),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export const toAssignedRoutine = (r: AssignmentRow): AssignedRoutine => ({
  assignmentId: r.id,
  routineId: r.routine_id,
  clientId: r.client_id,
  title: r.routines.title,
  notes: opt(r.routines.notes),
  // Copy-on-write: the client's own snapshot once they have been forked off the
  // template, the template itself until then.
  days: r.customised
    ? toRoutineDays(r.routine_assignment_days)
    : toRoutineDays(r.routines.routine_days),
  customised: r.customised,
  assignedAt: iso(r.assigned_at),
});

export const toBodyMetric = (r: BodyMetricRow): BodyMetric => ({
  id: r.id,
  clientId: r.client_id,
  date: r.date,
  weightKg: num(r.weight_kg),
  bodyFatPct: numOrUndefined(r.body_fat_pct),
  waistCm: numOrUndefined(r.waist_cm),
});

export const toProgressPhoto = (r: ProgressPhotoRow): ProgressPhoto => ({
  id: r.id,
  clientId: r.client_id,
  date: r.date,
  pose: r.pose,
  uri: r.uri,
  weightKg: num(r.weight_kg),
});

export const toHabit = (r: HabitRow): Habit => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  icon: r.icon,
  cadence: r.cadence,
  createdBy: r.created_by,
  completedDates: (r.habit_completions ?? []).map((c) => c.date).sort(),
});

export const toThread = (r: ThreadRow): Thread => ({
  id: r.id,
  clientId: r.client_id,
  trainerId: r.trainer_id,
  lastMessagePreview: r.last_message_preview,
  lastMessageAt: iso(r.last_message_at),
  unreadForTrainer: r.unread_for_trainer,
  unreadForClient: r.unread_for_client,
});

/** Columns plus a check constraint on the way out, a union on the way in. */
const toAttachment = (r: MessageRow): MessageAttachment | undefined => {
  switch (r.attachment_kind) {
    case 'workout':
      return { kind: 'workout', logId: r.attachment_log_id ?? '' };
    case 'nutrition':
      return { kind: 'nutrition', date: r.attachment_date ?? '' };
    case 'photo':
      return { kind: 'photo', uri: r.attachment_uri ?? '' };
    default:
      return undefined;
  }
};

export const toMessage = (r: MessageRow): Message => ({
  id: r.id,
  threadId: r.thread_id,
  senderId: r.sender_id,
  body: r.body,
  sentAt: iso(r.sent_at),
  readAt: isoOrNull(r.read_at),
  attachment: toAttachment(r),
});

/** The inverse, for `POST /threads/:id/messages`. */
export const fromAttachment = (
  attachment: MessageAttachment | undefined,
): Pick<
  MessageRow,
  'attachment_kind' | 'attachment_log_id' | 'attachment_date' | 'attachment_uri'
> => ({
  attachment_kind: attachment?.kind ?? null,
  attachment_log_id: attachment?.kind === 'workout' ? attachment.logId : null,
  attachment_date: attachment?.kind === 'nutrition' ? attachment.date : null,
  attachment_uri: attachment?.kind === 'photo' ? attachment.uri : null,
});

export const toAlert = (r: AlertRow): RedFlagAlert => ({
  id: r.id,
  clientId: r.client_id,
  kind: r.kind,
  severity: r.severity,
  title: r.title,
  detail: r.detail,
  raisedAt: iso(r.raised_at),
  resolved: r.resolved,
});

export const toCheckIn = (r: CheckInRow): CheckIn => ({
  id: r.id,
  clientId: r.client_id,
  weekOf: r.week_of,
  submittedAt: iso(r.submitted_at),
  status: r.status,
  weightChangeKg: num(r.weight_change_kg),
  avgCalories: r.avg_calories,
  targetCalories: r.target_calories,
  sessionsCompleted: r.sessions_completed,
  sessionsPlanned: r.sessions_planned,
  avgRpe: num(r.avg_rpe),
  clientNote: r.client_note,
});

export const toTrainerSummary = (r: TrainerSummaryRow): TrainerSummary => ({
  activeClients: r.active_clients,
  pendingCheckIns: r.pending_check_ins,
  unreadMessages: r.unread_messages,
  criticalAlerts: r.critical_alerts,
  weeklyComplianceAvg: r.weekly_compliance_avg,
});
