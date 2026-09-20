/**
 * Request handlers for the mock transport.
 *
 * Each entry maps an HTTP verb + path pattern onto a pure function over the
 * in-memory database. Keeping them URL-shaped means the day this app points at a
 * real BaaS, only `mockBaseQuery` is deleted — every `injectEndpoints` call and
 * every component stays exactly as it is.
 */
import { db, findClient, nextId } from './mockDb';

import type {
  BodyMetric,
  CheckIn,
  ClientProfile,
  ComplianceStatus,
  FoodEntry,
  Habit,
  ISODate,
  AssignedRoutine,
  MacroTargets,
  Message,
  NutritionDay,
  Routine,
  RoutineAssignment,
  RoutineDay,
  RoutineExercise,
  TrainerProfile,
  TrainerSummary,
  Weekday,
  WorkoutLog,
} from '@/types/models';
import { TODAY, addDays, byWeekday, diffInDays, startOfWeek } from '@/utils/date';

export class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

type Params = Record<string, string>;
type Query = Record<string, string | number | boolean | undefined>;

export interface MockRequest {
  url: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  params: Params;
  query: Query;
  body: unknown;
}

type Handler = (req: MockRequest) => unknown;

const emptyMacros = (): MacroTargets => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

const sumMacros = (entries: FoodEntry[]): MacroTargets =>
  entries.reduce<MacroTargets>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    emptyMacros()
  );

const requireClient = (clientId: string): ClientProfile => {
  const client = findClient(clientId);
  if (!client) throw new MockHttpError(404, `Client ${clientId} not found`);
  return client;
};

const requireRoutine = (routineId: string): Routine => {
  const routine = db.routines.find((r) => r.id === routineId);
  if (!routine) throw new MockHttpError(404, `Routine ${routineId} not found`);
  return routine;
};

const requireAssignment = (assignmentId: string): RoutineAssignment => {
  const assignment = db.routineAssignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new MockHttpError(404, `Assignment ${assignmentId} not found`);
  return assignment;
};

/** Assignment membership is the source of truth; the field on the routine is a
 *  denormalised read convenience, recomputed rather than stored, so the two can
 *  never drift. */
const withAssignments = (routine: Routine): Routine => ({
  ...routine,
  assignedClientIds: db.routineAssignments
    .filter((a) => a.routineId === routine.id)
    .map((a) => a.clientId),
});

/** Mints ids and puts the days in the order the week actually runs. */
const mintDays = (days: RoutineDayInput[]): RoutineDay[] =>
  [...days].sort(byWeekday).map((day) => ({
    ...day,
    id: nextId('rd'),
    exercises: day.exercises.map((exercise) => ({ ...exercise, id: nextId('rx') })),
  }));

const validateDays = (days: RoutineDayInput[] | undefined): RoutineDayInput[] => {
  if (!days?.length) throw new MockHttpError(400, 'A routine needs at least one training day');
  const seen = new Set<Weekday>();
  for (const day of days) {
    if (seen.has(day.weekday)) {
      throw new MockHttpError(400, `Two training days are both set to ${day.weekday}`);
    }
    seen.add(day.weekday);
    if (!day.exercises?.length) {
      throw new MockHttpError(400, 'Every training day needs at least one exercise');
    }
  }
  return days;
};

/** Flattens an assignment into what the client actually sees. */
const resolveAssignment = (assignment: RoutineAssignment): AssignedRoutine => {
  const routine = requireRoutine(assignment.routineId);
  return {
    assignmentId: assignment.id,
    routineId: routine.id,
    clientId: assignment.clientId,
    title: routine.title,
    notes: routine.notes,
    days: assignment.customDays ?? routine.days,
    customised: assignment.customDays !== null,
    assignedAt: assignment.assignedAt,
  };
};

/**
 * Puts one client on one routine — the only way a client's routine changes.
 *
 * A client follows exactly one routine, so assigning a different one
 * de-allocates the current one, customisation included. Re-assigning the one
 * they already follow is a no-op rather than an error, so it never silently
 * discards a customisation the trainer just made.
 */
const createAssignment = (routineId: string, clientId: string): RoutineAssignment => {
  requireRoutine(routineId);
  requireClient(clientId);
  const existing = db.routineAssignments.find(
    (a) => a.routineId === routineId && a.clientId === clientId
  );
  if (existing) return existing;
  db.routineAssignments = db.routineAssignments.filter((a) => a.clientId !== clientId);
  const now = new Date().toISOString();
  const assignment: RoutineAssignment = {
    id: nextId('ra'),
    routineId,
    clientId,
    customDays: null,
    assignedAt: now,
    updatedAt: now,
  };
  db.routineAssignments.unshift(assignment);
  return assignment;
};

const ensureNutritionDay = (clientId: string, date: ISODate): NutritionDay => {
  let day = db.nutritionDays.find((d) => d.clientId === clientId && d.date === date);
  if (!day) {
    day = {
      date,
      clientId,
      targets: requireClient(clientId).targets,
      consumed: emptyMacros(),
      entries: [],
    };
    db.nutritionDays.push(day);
  }
  return day;
};

const recompute = (day: NutritionDay): NutritionDay => {
  day.consumed = sumMacros(day.entries);
  return day;
};

/** Derives a traffic-light status from trailing logging + training adherence. */
const deriveStatus = (client: ClientProfile): ComplianceStatus => {
  const score = client.compliance.score;
  if (score >= 80) return 'green';
  if (score >= 55) return 'yellow';
  return 'red';
};

/** Invited clients have never logged anything; they don't count yet. */
const activeClients = () => db.clients.filter((c) => !c.invited);

const trainerSummary = (): TrainerSummary => ({
  activeClients: activeClients().length,
  pendingCheckIns: db.checkIns.filter((c) => c.status === 'pending').length,
  unreadMessages: db.threads.reduce((sum, t) => sum + t.unreadForTrainer, 0),
  criticalAlerts: db.alerts.filter((a) => !a.resolved && a.severity === 'critical').length,
  weeklyComplianceAvg: Math.round(
    activeClients().reduce((sum, c) => sum + c.compliance.score, 0) /
      Math.max(activeClients().length, 1)
  ),
});

/** Weekly caloric compliance rows used by the trainer's client-detail tab. */
const weeklyCompliance = (clientId: string, weeks: number) => {
  const client = requireClient(clientId);
  const thisWeek = startOfWeek(TODAY);
  return Array.from({ length: weeks }, (_, i) => {
    const weekOf = addDays(thisWeek, -(weeks - 1 - i) * 7);
    const days = db.nutritionDays.filter(
      (d) => d.clientId === clientId && d.date >= weekOf && d.date < addDays(weekOf, 7)
    );
    const logged = days.length;
    const avgCalories = logged
      ? Math.round(days.reduce((s, d) => s + d.consumed.calories, 0) / logged)
      : 0;
    const avgProtein = logged
      ? Math.round(days.reduce((s, d) => s + d.consumed.protein, 0) / logged)
      : 0;
    const sessions = db.workoutLogs.filter(
      (l) => l.clientId === clientId && l.date >= weekOf && l.date < addDays(weekOf, 7)
    );
    return {
      weekOf,
      loggedDays: logged,
      avgCalories,
      avgProtein,
      targetCalories: client.targets.calories,
      targetProtein: client.targets.protein,
      sessionsCompleted: sessions.length,
      sessionsPlanned: 5,
    };
  });
};

/** Stable descending comparator — returning a non-zero value for equal dates
 *  would reorder same-day records (progress photos, for example). */
const byDateDesc = <T extends { date: ISODate }>(a: T, b: T) =>
  a.date === b.date ? 0 : a.date < b.date ? 1 : -1;

export const routes: Array<{ method: MockRequest['method']; pattern: string; handler: Handler }> = [
  /* ------------------------------------------------------------- identity */
  { method: 'GET', pattern: '/session/roles', handler: () => ({ trainer: db.trainer, clients: db.clients }) },
  { method: 'GET', pattern: '/trainer', handler: () => db.trainer },
  {
    method: 'PATCH',
    pattern: '/trainer',
    handler: ({ body }) => {
      Object.assign(db.trainer, body as Partial<TrainerProfile>);
      return db.trainer;
    },
  },
  { method: 'GET', pattern: '/clients', handler: () => db.clients.map((c) => ({ ...c, compliance: { ...c.compliance, status: deriveStatus(c) } })) },
  { method: 'GET', pattern: '/clients/:id', handler: ({ params }) => requireClient(params.id) },
  {
    method: 'PATCH',
    pattern: '/clients/:id',
    handler: ({ params, body }) => {
      const client = requireClient(params.id);
      Object.assign(client, body as ClientGoalPatch);
      // nutrition_days snapshot the targets live on the day they were created,
      // so a past day keeps what the client was actually held to; today and
      // anything already opened ahead of it follow the new numbers.
      for (const day of db.nutritionDays) {
        if (day.clientId === client.id && day.date >= TODAY) day.targets = { ...client.targets };
      }
      return client;
    },
  },

  {
    method: 'POST',
    pattern: '/clients/invite',
    handler: ({ body }) => {
      const { name, email, profile } = body as ClientInvite;
      const address = email.trim().toLowerCase();
      if (!name.trim()) throw new MockHttpError(400, 'A client needs a name');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
        throw new MockHttpError(400, 'That email address doesn’t look right');
      }
      if ([db.trainer, ...db.clients].some((u) => u.email.toLowerCase() === address)) {
        throw new MockHttpError(409, 'That email already has an account');
      }
      const client: ClientProfile = {
        id: nextId('c'),
        role: 'client',
        name: name.trim(),
        email: address,
        avatarUrl: '',
        trainerId: db.trainer.id,
        goal: profile?.goal ?? 'recomp',
        heightCm: profile?.heightCm ?? null,
        startWeightKg: profile?.startWeightKg ?? null,
        targetWeightKg: profile?.targetWeightKg ?? null,
        targets: { ...STARTER_MACROS },
        joinedAt: TODAY,
        invited: true,
        compliance: { status: 'yellow', score: 0, lastLoggedAt: null, streakDays: 0 },
      };
      db.clients.push(client);
      db.trainer.clientIds.push(client.id);
      db.threads.push({
        id: `th-${client.id}`,
        clientId: client.id,
        trainerId: db.trainer.id,
        lastMessagePreview: '',
        lastMessageAt: '',
        unreadForTrainer: 0,
        unreadForClient: 0,
      });
      if (client.startWeightKg !== null) {
        db.bodyMetrics.push({ id: nextId('bm'), clientId: client.id, date: TODAY, weightKg: client.startWeightKg });
      }
      return client;
    },
  },
  {
    // Mirrors create_profile (migration 20260918000002). The real transport
    // reads the caller's uid and email off the token; the mock has no auth at
    // all, so it just mints the row the same way and hands the id back.
    method: 'POST',
    pattern: '/session/profile',
    handler: ({ body }) => {
      const { kind, name } = body as ProfileInput;
      if (!name?.trim()) throw new MockHttpError(400, 'A profile needs a name');
      // The mock has exactly one coach, and signing up as one makes you them.
      if (kind === 'coach') return { id: db.trainer.id };
      if (kind !== 'individual') throw new MockHttpError(400, `Unknown profile kind: ${kind}`);

      const client: ClientProfile = {
        id: nextId('c'),
        role: 'client',
        name: name.trim(),
        email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@example.com`,
        avatarUrl: '',
        // ponytail: the mock's one trainer until ClientProfile.trainerId widens
        // to `string | null` in S8 -- then this becomes null and the mock can
        // actually exercise the coachless paths (S13's fixture depends on it).
        trainerId: db.trainer.id,
        goal: 'recomp',
        heightCm: null,
        startWeightKg: null,
        targetWeightKg: null,
        targets: { ...STARTER_MACROS },
        joinedAt: TODAY,
        compliance: { status: 'yellow', score: 0, lastLoggedAt: null, streakDays: 0 },
      };
      db.clients.push(client);
      return { id: client.id };
    },
  },
  {
    method: 'DELETE',
    pattern: '/clients/:id/invite',
    handler: ({ params }) => {
      const client = findClient(params.id);
      if (!client?.invited) throw new MockHttpError(404, `No pending invite for ${params.id}`);
      db.clients = db.clients.filter((c) => c.id !== client.id);
      db.trainer.clientIds = db.trainer.clientIds.filter((id) => id !== client.id);
      db.threads = db.threads.filter((t) => t.clientId !== client.id);
      db.bodyMetrics = db.bodyMetrics.filter((m) => m.clientId !== client.id);
      return { id: client.id };
    },
  },
  {
    // Mirrors complete_intake (migration 20260915000005).
    method: 'POST',
    pattern: '/clients/:id/intake',
    handler: ({ params, body }) => {
      const client = requireClient(params.id);
      const input = body as IntakeInput;
      if (client.heightCm !== null && client.startWeightKg !== null) {
        throw new MockHttpError(409, 'Setup is already done');
      }
      const height = client.heightCm ?? input.heightCm ?? 0;
      const weight = client.startWeightKg ?? input.startWeightKg ?? 0;
      const target = client.targetWeightKg ?? input.targetWeightKg ?? 0;
      if (height <= 0 || weight <= 0 || target <= 0) {
        throw new MockHttpError(400, 'Height, weight and goal weight must be positive numbers');
      }
      if (client.targetWeightKg === null && input.goal) client.goal = input.goal;
      if (client.startWeightKg === null) {
        db.bodyMetrics = db.bodyMetrics.filter((m) => !(m.clientId === client.id && m.date === input.date));
        db.bodyMetrics.push({ id: nextId('bm'), clientId: client.id, date: input.date, weightKg: weight });
      }
      Object.assign(client, { heightCm: height, startWeightKg: weight, targetWeightKg: target });
      delete client.invited;
      db.alerts.push({
        id: nextId('al'),
        clientId: client.id,
        kind: 'intake-complete',
        severity: 'info',
        title: `${client.name} finished setup`,
        detail: 'Still on starter macros — set their calorie and macro targets.',
        raisedAt: new Date().toISOString(),
        resolved: false,
      });
      const thread = db.threads.find((t) => t.clientId === client.id);
      const notes = input.notes?.trim();
      if (thread && notes) {
        const sentAt = new Date().toISOString();
        db.messages.push({ id: nextId('m'), threadId: thread.id, senderId: client.id, body: notes, sentAt, readAt: null });
        Object.assign(thread, { lastMessagePreview: notes, lastMessageAt: sentAt });
        thread.unreadForTrainer += 1;
      }
      return null;
    },
  },

  /* ------------------------------------------------------------- nutrition */
  {
    method: 'GET',
    pattern: '/nutrition/days',
    handler: ({ query }) => {
      const clientId = String(query.clientId);
      const days = Number(query.days ?? 30);
      const from = addDays(TODAY, -(days - 1));
      return db.nutritionDays
        .filter((d) => d.clientId === clientId && d.date >= from)
        .sort(byDateDesc);
    },
  },
  {
    method: 'GET',
    pattern: '/nutrition/days/:date',
    handler: ({ params, query }) => {
      const clientId = String(query.clientId);
      return recompute(ensureNutritionDay(clientId, params.date));
    },
  },
  {
    method: 'POST',
    pattern: '/nutrition/entries',
    handler: ({ body }) => {
      const input = body as Omit<FoodEntry, 'id' | 'loggedAt'>;
      const day = ensureNutritionDay(input.clientId, input.date);
      const entry: FoodEntry = {
        ...input,
        id: nextId('fe'),
        loggedAt: new Date().toISOString(),
      };
      day.entries.push(entry);
      return recompute(day);
    },
  },
  {
    method: 'POST',
    pattern: '/nutrition/entries/batch',
    handler: ({ body }) => {
      const input = body as { entries: Array<Omit<FoodEntry, 'id' | 'loggedAt'>> };
      let day: NutritionDay | null = null;
      for (const raw of input.entries) {
        day = ensureNutritionDay(raw.clientId, raw.date);
        day.entries.push({ ...raw, id: nextId('fe'), loggedAt: new Date().toISOString() });
      }
      if (!day) throw new MockHttpError(400, 'No entries supplied');
      return recompute(day);
    },
  },
  {
    method: 'DELETE',
    pattern: '/nutrition/entries/:id',
    handler: ({ params, query }) => {
      const day = db.nutritionDays.find(
        (d) => d.clientId === String(query.clientId) && d.date === String(query.date)
      );
      if (!day) throw new MockHttpError(404, 'Day not found');
      day.entries = day.entries.filter((e) => e.id !== params.id);
      return recompute(day);
    },
  },
  { method: 'GET', pattern: '/foods', handler: ({ query }) => {
      const q = String(query.q ?? '').trim().toLowerCase();
      const list = q
        ? db.foods.filter((f) => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(q))
        : db.foods;
      return list.slice(0, 40);
    },
  },
  { method: 'GET', pattern: '/foods/frequent', handler: () => db.foods.filter((f) => f.frequent) },
  { method: 'GET', pattern: '/ai/suggestions', handler: () => db.aiSuggestions },

  /* -------------------------------------------------------------- training */
  { method: 'GET', pattern: '/exercises', handler: () => db.exercises },
  {
    method: 'GET',
    pattern: '/workouts/logs',
    handler: ({ query }) => {
      const clientId = String(query.clientId);
      const limit = Number(query.limit ?? 50);
      return db.workoutLogs.filter((l) => l.clientId === clientId).sort(byDateDesc).slice(0, limit);
    },
  },
  {
    method: 'GET',
    pattern: '/workouts/logs/:id',
    handler: ({ params }) => {
      const log = db.workoutLogs.find((l) => l.id === params.id);
      if (!log) throw new MockHttpError(404, 'Workout log not found');
      return log;
    },
  },
  {
    method: 'POST',
    pattern: '/workouts/logs',
    handler: ({ body }) => {
      const input = body as Omit<WorkoutLog, 'id' | 'completedAt'>;
      // One workout per day: saving again edits the day's log rather than
      // adding a second one, and keeps its id so links to it still resolve.
      const existing = db.workoutLogs.find(
        (l) => l.clientId === input.clientId && l.date === input.date
      );
      const log: WorkoutLog = {
        ...input,
        id: existing?.id ?? nextId('wl'),
        completedAt: new Date().toISOString(),
      };
      db.workoutLogs = [log, ...db.workoutLogs.filter((l) => l.id !== log.id)];
      return log;
    },
  },

  /* -------------------------------------------------------------- routines */
  {
    method: 'GET',
    pattern: '/routines',
    handler: () =>
      [...db.routines]
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .map(withAssignments),
  },
  {
    method: 'GET',
    pattern: '/routines/:id',
    handler: ({ params }) => withAssignments(requireRoutine(params.id)),
  },
  {
    method: 'POST',
    pattern: '/routines',
    handler: ({ body }) => {
      const input = body as RoutineInput;
      const title = input.title?.trim();
      if (!title) throw new MockHttpError(400, 'A routine needs a title');
      validateDays(input.days);
      for (const clientId of input.assignedClientIds ?? []) requireClient(clientId);

      const now = new Date().toISOString();
      const routine: Routine = {
        id: nextId('rt'),
        trainerId: db.trainer.id,
        title,
        notes: input.notes?.trim() || undefined,
        days: mintDays(input.days),
        assignedClientIds: [],
        createdAt: now,
        updatedAt: now,
      };
      db.routines.unshift(routine);
      for (const clientId of new Set(input.assignedClientIds ?? [])) {
        createAssignment(routine.id, clientId);
      }
      return withAssignments(routine);
    },
  },
  {
    method: 'PATCH',
    pattern: '/routines/:id',
    handler: ({ params, body }) => {
      const routine = requireRoutine(params.id);
      const input = body as Partial<RoutineInput>;
      if (input.title !== undefined) {
        const title = input.title.trim();
        if (!title) throw new MockHttpError(400, 'A routine needs a title');
        routine.title = title;
      }
      if (input.notes !== undefined) routine.notes = input.notes.trim() || undefined;
      if (input.days !== undefined) {
        // Editing the template only moves clients who are still following it.
        // A customised assignment holds its own snapshot and is untouched here.
        routine.days = mintDays(validateDays(input.days));
      }
      routine.updatedAt = new Date().toISOString();
      return withAssignments(routine);
    },
  },
  {
    method: 'POST',
    pattern: '/routines/:id/assign',
    handler: ({ params, body }) => {
      const routine = requireRoutine(params.id);
      const { clientIds } = body as { clientIds: string[] };
      // Reject the whole assignment if any client is unknown, rather than
      // silently dropping one and leaving the coach thinking it landed.
      for (const clientId of clientIds) requireClient(clientId);

      // Additive: a client left out of the list keeps the routine they have.
      // Moving someone off this one means assigning them a different one.
      for (const clientId of new Set(clientIds)) createAssignment(routine.id, clientId);

      routine.updatedAt = new Date().toISOString();
      return withAssignments(routine);
    },
  },
  {
    method: 'POST',
    pattern: '/routines/:id/duplicate',
    handler: ({ params }) => {
      const source = requireRoutine(params.id);
      const now = new Date().toISOString();
      const copy: Routine = {
        ...source,
        id: nextId('rt'),
        title: `${source.title} (copy)`,
        days: source.days.map((day) => ({
          ...day,
          id: nextId('rd'),
          exercises: day.exercises.map((exercise) => ({ ...exercise, id: nextId('rx') })),
        })),
        /** A copy starts unassigned — duplicating is for editing, not re-issuing. */
        assignedClientIds: [],
        createdAt: now,
        updatedAt: now,
      };
      db.routines.unshift(copy);
      return copy;
    },
  },
  {
    method: 'DELETE',
    pattern: '/routines/:id',
    handler: ({ params }) => {
      const routine = requireRoutine(params.id);
      db.routines = db.routines.filter((r) => r.id !== routine.id);
      // Cascade: an assignment without its routine has nothing to resolve to.
      db.routineAssignments = db.routineAssignments.filter((a) => a.routineId !== routine.id);
      return { id: routine.id };
    },
  },

  /* ----------------------------------------------------------- assignments */
  {
    method: 'GET',
    pattern: '/assignments',
    handler: ({ query }) => {
      // Filtered by client for "what does this person follow", by routine for
      // "who follows this template" — the two directions the UI asks in.
      const clientId = query.clientId ? String(query.clientId) : undefined;
      const routineId = query.routineId ? String(query.routineId) : undefined;
      return db.routineAssignments
        .filter((a) => (!clientId || a.clientId === clientId) && (!routineId || a.routineId === routineId))
        .sort((a, b) => (a.assignedAt < b.assignedAt ? 1 : -1))
        .map(resolveAssignment);
    },
  },
  {
    method: 'GET',
    pattern: '/assignments/:id',
    handler: ({ params }) => resolveAssignment(requireAssignment(params.id)),
  },
  {
    method: 'POST',
    pattern: '/assignments',
    handler: ({ body }) => {
      const { routineId, clientId } = body as { routineId: string; clientId: string };
      return resolveAssignment(createAssignment(routineId, clientId));
    },
  },
  {
    method: 'PATCH',
    pattern: '/assignments/:id',
    handler: ({ params, body }) => {
      const assignment = requireAssignment(params.id);
      const { days } = body as { days: RoutineDayInput[] };
      // First edit forks this client off the template for good; every later
      // edit just replaces their snapshot.
      assignment.customDays = mintDays(validateDays(days));
      assignment.updatedAt = new Date().toISOString();
      return resolveAssignment(assignment);
    },
  },
  {
    method: 'POST',
    pattern: '/assignments/:id/reset',
    handler: ({ params }) => {
      const assignment = requireAssignment(params.id);
      assignment.customDays = null;
      assignment.updatedAt = new Date().toISOString();
      return resolveAssignment(assignment);
    },
  },
  {
    method: 'DELETE',
    pattern: '/assignments/:id',
    handler: ({ params }) => {
      const assignment = requireAssignment(params.id);
      db.routineAssignments = db.routineAssignments.filter((a) => a.id !== assignment.id);
      return { id: assignment.id };
    },
  },

  /* -------------------------------------------------------------- progress */
  {
    method: 'GET',
    pattern: '/metrics',
    handler: ({ query }) =>
      db.bodyMetrics
        .filter((m) => m.clientId === String(query.clientId))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
  },
  {
    method: 'POST',
    pattern: '/metrics',
    handler: ({ body }) => {
      const input = body as Omit<BodyMetric, 'id'>;
      const existing = db.bodyMetrics.find(
        (m) => m.clientId === input.clientId && m.date === input.date
      );
      if (existing) {
        Object.assign(existing, input);
        return existing;
      }
      const metric: BodyMetric = { ...input, id: nextId('bm') };
      db.bodyMetrics.push(metric);
      return metric;
    },
  },
  {
    method: 'GET',
    pattern: '/photos',
    handler: ({ query }) =>
      db.photos.filter((p) => p.clientId === String(query.clientId)).sort(byDateDesc),
  },
  {
    method: 'GET',
    pattern: '/habits',
    handler: ({ query }) => db.habits.filter((h) => h.clientId === String(query.clientId)),
  },
  {
    method: 'POST',
    pattern: '/habits/:id/toggle',
    handler: ({ params, body }) => {
      const habit = db.habits.find((h) => h.id === params.id);
      if (!habit) throw new MockHttpError(404, 'Habit not found');
      const { date } = body as { date: ISODate };
      habit.completedDates = habit.completedDates.includes(date)
        ? habit.completedDates.filter((d) => d !== date)
        : [...habit.completedDates, date];
      return habit;
    },
  },
  {
    method: 'POST',
    pattern: '/habits',
    handler: ({ body }) => {
      const input = body as Pick<Habit, 'clientId' | 'title' | 'icon' | 'createdBy'>;
      const title = input.title?.trim();
      if (!title) throw new MockHttpError(400, 'A habit needs a title');
      const habit: Habit = {
        ...input,
        title,
        id: nextId('h'),
        cadence: 'daily',
        completedDates: [],
      };
      db.habits.push(habit);
      return habit;
    },
  },

  {
    method: 'PATCH',
    pattern: '/habits/:id',
    handler: ({ params, body }) => {
      const habit = db.habits.find((h) => h.id === params.id);
      if (!habit) throw new MockHttpError(404, 'Habit not found');
      const patch = body as Partial<Pick<Habit, 'title' | 'icon'>>;
      if (patch.title !== undefined) {
        const title = patch.title.trim();
        if (!title) throw new MockHttpError(400, 'A habit needs a title');
        habit.title = title;
      }
      if (patch.icon !== undefined) habit.icon = patch.icon;
      return habit;
    },
  },
  {
    method: 'DELETE',
    pattern: '/habits/:id',
    handler: ({ params }) => {
      const i = db.habits.findIndex((h) => h.id === params.id);
      if (i === -1) throw new MockHttpError(404, 'Habit not found');
      db.habits.splice(i, 1);
      return { id: params.id };
    },
  },

  /* --------------------------------------------------------- communication */
  {
    method: 'GET',
    pattern: '/threads',
    handler: () =>
      [...db.threads].sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1)),
  },
  {
    method: 'GET',
    pattern: '/threads/:id',
    handler: ({ params }) => {
      const thread = db.threads.find((t) => t.id === params.id);
      if (!thread) throw new MockHttpError(404, 'Thread not found');
      return thread;
    },
  },
  {
    method: 'GET',
    pattern: '/threads/:id/messages',
    handler: ({ params }) =>
      db.messages
        .filter((m) => m.threadId === params.id)
        .sort((a, b) => (a.sentAt < b.sentAt ? -1 : 1)),
  },
  {
    method: 'POST',
    pattern: '/threads/:id/messages',
    handler: ({ params, body }) => {
      const input = body as Pick<Message, 'senderId' | 'body' | 'attachment'>;
      const message: Message = {
        id: nextId('m'),
        threadId: params.id,
        senderId: input.senderId,
        body: input.body,
        attachment: input.attachment,
        sentAt: new Date().toISOString(),
        readAt: null,
      };
      db.messages.push(message);
      const thread = db.threads.find((t) => t.id === params.id);
      if (thread) {
        thread.lastMessagePreview = message.body;
        thread.lastMessageAt = message.sentAt;
        if (input.senderId === db.trainer.id) thread.unreadForClient += 1;
        else thread.unreadForTrainer += 1;
      }
      return message;
    },
  },
  {
    method: 'POST',
    pattern: '/threads/:id/read',
    handler: ({ params, body }) => {
      const { as } = body as { as: 'trainer' | 'client' };
      const thread = db.threads.find((t) => t.id === params.id);
      if (!thread) throw new MockHttpError(404, 'Thread not found');
      if (as === 'trainer') thread.unreadForTrainer = 0;
      else thread.unreadForClient = 0;
      return thread;
    },
  },

  /* ---------------------------------------------------------- trainer ops */
  { method: 'GET', pattern: '/trainer/summary', handler: () => trainerSummary() },
  {
    method: 'GET',
    pattern: '/trainer/alerts',
    handler: () =>
      db.alerts
        .filter((a) => !a.resolved)
        .sort((a, b) => {
          const rank = { critical: 0, warning: 1, info: 2 } as const;
          if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
          return a.raisedAt < b.raisedAt ? 1 : -1;
        }),
  },
  {
    method: 'POST',
    pattern: '/trainer/alerts/:id/resolve',
    handler: ({ params }) => {
      const alert = db.alerts.find((a) => a.id === params.id);
      if (!alert) throw new MockHttpError(404, 'Alert not found');
      alert.resolved = true;
      return alert;
    },
  },
  {
    method: 'GET',
    pattern: '/trainer/checkins',
    handler: ({ query }) => {
      const status = query.status ? String(query.status) : undefined;
      const clientId = query.clientId ? String(query.clientId) : undefined;
      return db.checkIns.filter(
        (c) => (!status || c.status === status) && (!clientId || c.clientId === clientId)
      );
    },
  },
  {
    method: 'POST',
    pattern: '/trainer/checkins/:id/review',
    handler: ({ params }) => {
      const checkIn = db.checkIns.find((c) => c.id === params.id) as CheckIn | undefined;
      if (!checkIn) throw new MockHttpError(404, 'Check-in not found');
      checkIn.status = 'reviewed';
      return checkIn;
    },
  },
  {
    method: 'GET',
    pattern: '/trainer/clients/:id/compliance',
    handler: ({ params, query }) => weeklyCompliance(params.id, Number(query.weeks ?? 6)),
  },
  {
    method: 'GET',
    pattern: '/trainer/clients/:id/overview',
    handler: ({ params }) => {
      const client = requireClient(params.id);
      const metrics = db.bodyMetrics
        .filter((m) => m.clientId === client.id)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      const logs = db.workoutLogs.filter((l) => l.clientId === client.id).sort(byDateDesc);
      const nutrition = db.nutritionDays.filter((n) => n.clientId === client.id).sort(byDateDesc);
      const latest = metrics[metrics.length - 1];
      const monthAgo = metrics.find((m) => diffInDays(TODAY, m.date) <= 30);
      return {
        client,
        latestWeightKg: latest?.weightKg ?? client.startWeightKg,
        weightChange30d:
          latest && monthAgo ? Number((latest.weightKg - monthAgo.weightKg).toFixed(1)) : 0,
        sessionsLast7: logs.filter((l) => diffInDays(TODAY, l.date) < 7).length,
        loggedDaysLast7: nutrition.filter((n) => diffInDays(TODAY, n.date) < 7).length,
        avgCaloriesLast7: (() => {
          const recent = nutrition.filter((n) => diffInDays(TODAY, n.date) < 7);
          return recent.length
            ? Math.round(recent.reduce((s, n) => s + n.consumed.calories, 0) / recent.length)
            : 0;
        })(),
        openAlerts: db.alerts.filter((a) => a.clientId === client.id && !a.resolved).length,
      };
    },
  },
];

/** One day of a routine as it arrives from the builder; ids are minted server-side. */
export interface RoutineDayInput extends Omit<RoutineDay, 'id' | 'exercises'> {
  exercises: Array<Omit<RoutineExercise, 'id'>>;
}

/** Body accepted by `POST /routines` and, partially, by `PATCH /routines/:id`. */
export interface RoutineInput {
  title: string;
  notes?: string;
  days: RoutineDayInput[];
  assignedClientIds?: string[];
}

/**
 * What a coach may change about a client: where they are headed and what they
 * eat to get there. Compliance, height and the joined date are not theirs.
 */
/** Mirrors the column defaults in migration 20260915000003. */
const STARTER_MACROS: MacroTargets = { calories: 2000, protein: 150, carbs: 200, fat: 65 };

/** `POST /clients/invite`. Height + start weight together let the client skip intake. */
export interface ClientInvite {
  name: string;
  email: string;
  profile?: Partial<Pick<ClientProfile, 'heightCm' | 'startWeightKg' | 'targetWeightKg' | 'goal'>>;
}

/** `POST /session/profile`. Self-signup: what the server cannot read off the token. */
export interface ProfileInput {
  kind: 'individual' | 'coach';
  name: string;
}

/** `POST /clients/:id/intake`. Fields the coach already set are ignored. */
export interface IntakeInput {
  heightCm?: number;
  startWeightKg?: number;
  targetWeightKg?: number;
  goal?: ClientProfile['goal'];
  notes?: string;
  /** The device's today — the first weigh-in lands on it. */
  date: ISODate;
}

export type ClientGoalPatch = Partial<Pick<ClientProfile, 'goal' | 'targetWeightKg' | 'targets'>>;

export interface ClientOverview {
  client: ClientProfile;
  /** Null for a client with no weigh-in and no starting weight yet. */
  latestWeightKg: number | null;
  weightChange30d: number;
  sessionsLast7: number;
  loggedDaysLast7: number;
  avgCaloriesLast7: number;
  openAlerts: number;
}

export interface WeeklyComplianceRow {
  weekOf: ISODate;
  loggedDays: number;
  avgCalories: number;
  avgProtein: number;
  targetCalories: number;
  targetProtein: number;
  sessionsCompleted: number;
  sessionsPlanned: number;
}
