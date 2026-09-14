/**
 * Domain model shared by both sides of the product.
 * These mirror the shape the BaaS layer is expected to return, so swapping the
 * mock transport for a live one requires no changes above the API layer.
 */

export type UserRole = 'client' | 'trainer';

export type ISODate = string; // YYYY-MM-DD
export type ISODateTime = string; // full ISO 8601

export interface User {
  id: string;
  role: UserRole;
  name: string;
  avatarUrl: string;
  email: string;
}

/** What a coach tracks. `null` means the choice has not been made yet. */
export type TrackingMode = 'workout' | 'nutrition' | 'both';

export interface TrainerProfile extends User {
  role: 'trainer';
  headline: string;
  clientIds: string[];
  tracks: TrackingMode | null;
}

export type ComplianceStatus = 'green' | 'yellow' | 'red';

export interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ClientProfile extends User {
  role: 'client';
  trainerId: string;
  goal: 'cut' | 'recomp' | 'bulk' | 'performance';
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  targets: MacroTargets;
  joinedAt: ISODate;
  /** Rolled up by the backend; drives the roster traffic lights. */
  compliance: {
    status: ComplianceStatus;
    /** 0–100 over the trailing 7 days. */
    score: number;
    lastLoggedAt: ISODateTime | null;
    streakDays: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Nutrition                                                                   */
/* -------------------------------------------------------------------------- */

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  emoji: string;
  /** Surfaced in the quick-add carousel when true. */
  frequent?: boolean;
}

export interface FoodEntry {
  id: string;
  clientId: string;
  date: ISODate;
  slot: MealSlot;
  foodId: string;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Set when the entry originated from the AI parser rather than search. */
  source: 'search' | 'quick-add' | 'ai';
  loggedAt: ISODateTime;
}

export interface NutritionDay {
  date: ISODate;
  clientId: string;
  targets: MacroTargets;
  consumed: MacroTargets;
  entries: FoodEntry[];
}

/** A parsed, not-yet-committed suggestion from the AI food parser. */
export interface AiFoodSuggestion {
  id: string;
  transcript: string;
  confidence: number;
  items: Array<{
    name: string;
    servings: number;
    servingLabel: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    emoji: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* Training                                                                    */
/* -------------------------------------------------------------------------- */

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'full body'
  | 'conditioning';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
}

export interface LoggedSet {
  id: string;
  reps: number;
  weightKg: number;
  completed: boolean;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  sets: LoggedSet[];
}

/**
 * A completed workout. Training is prescribed by the client's routine, which
 * carries no dates, so a log stands on its own date and references no schedule.
 */
export interface WorkoutLog {
  id: string;
  clientId: string;
  title: string;
  date: ISODate;
  durationMinutes: number;
  totalVolumeKg: number;
  notes?: string;
  exercises: LoggedExercise[];
  completedAt: ISODateTime;
}

/** Training weeks are Monday-first here, matching `startOfWeek` in utils/date. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/**
 * One exercise as it is *prescribed* inside a routine.
 *
 * Deliberately not `ProgrammedExercise`: a routine states intent ("4 sets of
 * 8-12, rest 90s") rather than enumerating concrete sets, which is how
 * coaches actually write programmes and what keeps the builder to one row per
 * exercise.
 */
export interface RoutineExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  /** Number of working sets. */
  sets: number;
  /** Target rep range. `repMin === repMax` renders as a single number. */
  repMin: number;
  repMax: number;
  /** Rest between sets, in seconds. */
  restSeconds: number;
  /** Coaching cue shown under the prescription. */
  notes?: string;
}

/**
 * One training day of a routine, pinned to a weekday.
 *
 * A weekday with no `RoutineDay` is a rest day — the absence *is* the rest day,
 * so a four-day split is simply four entries here.
 */
export interface RoutineDay {
  id: string;
  weekday: Weekday;
  /** Coach's label for the day, e.g. "Push". Falls back to the weekday name. */
  name?: string;
  focus: MuscleGroup;
  notes?: string;
  exercises: RoutineExercise[];
}

/**
 * A reusable weekly training template owned by a trainer.
 *
 * Routines carry no dates. Days are weekdays, not calendar days: the routine
 * says "Monday is Upper Body", never "Upper Body on 14 September". A client is
 * *assigned* a routine and simply sees it in their app.
 */
export interface Routine {
  id: string;
  trainerId: string;
  title: string;
  notes?: string;
  /** At most one day per weekday, returned in Monday-first order. */
  days: RoutineDay[];
  /** Denormalised from the assignment table by the backend. */
  assignedClientIds: string[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * The link between a routine and one client.
 *
 * `customDays` is copy-on-write: null while the client follows the template
 * verbatim, and a full snapshot of the days from the moment the trainer tweaks
 * anything for them. After that the template no longer reaches this client,
 * which is the point — one client's adjustment must never leak to the others.
 */
export interface RoutineAssignment {
  id: string;
  routineId: string;
  clientId: string;
  customDays: RoutineDay[] | null;
  assignedAt: ISODateTime;
  updatedAt: ISODateTime;
}

/**
 * A routine resolved for one client — what they actually see.
 *
 * Both roles read this rather than a `Routine`, so the client's app and the
 * trainer's view of that client can never disagree about the prescription.
 */
export interface AssignedRoutine {
  assignmentId: string;
  routineId: string;
  clientId: string;
  title: string;
  notes?: string;
  /** Effective days: the client's customised copy when there is one. */
  days: RoutineDay[];
  customised: boolean;
  assignedAt: ISODateTime;
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export interface BodyMetric {
  id: string;
  clientId: string;
  date: ISODate;
  weightKg: number;
}

export interface ProgressPhoto {
  id: string;
  clientId: string;
  date: ISODate;
  pose: 'front' | 'side' | 'back';
  uri: string;
  weightKg: number;
}

export interface Habit {
  id: string;
  clientId: string;
  title: string;
  icon: string;
  cadence: 'daily';
  /** Dates on which the habit was ticked off. */
  completedDates: ISODate[];
  createdBy: 'trainer' | 'client';
}

/* -------------------------------------------------------------------------- */
/* Communication                                                               */
/* -------------------------------------------------------------------------- */

export type MessageAttachment =
  | { kind: 'workout'; logId: string }
  | { kind: 'nutrition'; date: ISODate }
  | { kind: 'photo'; uri: string };

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  sentAt: ISODateTime;
  readAt: ISODateTime | null;
  attachment?: MessageAttachment;
}

export interface Thread {
  id: string;
  clientId: string;
  trainerId: string;
  lastMessagePreview: string;
  lastMessageAt: ISODateTime;
  unreadForTrainer: number;
  unreadForClient: number;
}

/* -------------------------------------------------------------------------- */
/* Trainer triage                                                              */
/* -------------------------------------------------------------------------- */

export type AlertKind =
  | 'missed-logs'
  | 'weight-stall'
  | 'calorie-deficit-miss'
  | 'check-in-due';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface RedFlagAlert {
  id: string;
  clientId: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  raisedAt: ISODateTime;
  resolved: boolean;
}

export interface CheckIn {
  id: string;
  clientId: string;
  weekOf: ISODate;
  submittedAt: ISODateTime;
  status: 'pending' | 'reviewed';
  weightChangeKg: number;
  avgCalories: number;
  targetCalories: number;
  sessionsCompleted: number;
  sessionsPlanned: number;
  clientNote: string;
}

/** Denormalised numbers the triage dashboard header renders. */
export interface TrainerSummary {
  activeClients: number;
  pendingCheckIns: number;
  unreadMessages: number;
  criticalAlerts: number;
  weeklyComplianceAvg: number;
}
