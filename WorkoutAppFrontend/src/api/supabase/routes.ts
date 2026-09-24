/**
 * The Supabase transport's route table.
 *
 * Every entry mirrors one entry in `handlers.ts`, verb for verb and path for
 * path, and returns the identical domain shape. That is the whole contract:
 * `src/api/endpoints/*` and every screen above it cannot tell which transport
 * answered, which is what makes the two interchangeable at runtime.
 *
 * Two kinds of call, following the backend's own division of labour:
 *
 *  - **Reads and single-row writes are PostgREST**, reshaped by `rows.ts`.
 *  - **Writes that span tables are RPCs.** Their `*_json` renderers already
 *    return the app's camelCase nested shapes, so an RPC result is passed
 *    through untouched — reshaping it would be undoing the backend's work.
 *
 * Under the pending RLS policies these same calls simply return less: the RPCs
 * are SECURITY INVOKER and the selects are ordinary reads, so nothing here has
 * to know who is asking.
 */
import { supabase } from '@/utils/supabase';
import type { ClientGoalPatch, ClientInvite, IntakeInput, ProfileInput } from '../handlers';
import type { ISODate, MacroTargets, TrainerProfile } from '@/types/models';
import { TODAY, addDays, diffInDays, startOfWeek } from '@/utils/date';

import { ApiHttpError, fromPostgrest } from './httpError';
import {
  toAiSuggestion,
  toAlert,
  toAssignedRoutine,
  toBodyMetric,
  toCheckIn,
  toClientProfile,
  toExercise,
  toFoodItem,
  toHabit,
  toMessage,
  toNutritionDay,
  toProgressPhoto,
  toRoutine,
  toPlan,
  toSubscription,
  toThread,
  toTrainerProfile,
  toTrainerSummary,
  toWorkoutLog,
  fromAttachment,
  type AiSuggestionRow,
  type AlertRow,
  type AssignmentRow,
  type BodyMetricRow,
  type CheckInRow,
  type ClientProfileRow,
  type ExerciseRow,
  type FoodRow,
  type HabitRow,
  type MessageRow,
  type NutritionDayRow,
  type ProgressPhotoRow,
  type RoutineRow,
  type PlanRow,
  type SubscriptionRow,
  type ThreadRow,
  type TrainerProfileRow,
  type TrainerSummaryRow,
  type WorkoutLogRow,
} from './rows';

export interface SupabaseRequest {
  params: Record<string, string>;
  query: Record<string, string | number | boolean | undefined>;
  body: unknown;
}

type Handler = (req: SupabaseRequest) => Promise<unknown>;

/* ------------------------------------------------------------- plumbing */

interface Result<T> {
  data: T | null;
  error: { code?: string; message: string; details: string; hint: string } | null;
}

/** Unwraps a PostgREST response, translating its error vocabulary into ours. */
const rows = async <T>(result: PromiseLike<Result<T[]>>): Promise<T[]> => {
  const { data, error } = await result;
  if (error) throw fromPostgrest(error as never);
  return data ?? [];
};

/** Same, for a query that must match exactly one row. */
const row = async <T>(result: PromiseLike<Result<T>>, missing: string): Promise<T> => {
  const { data, error } = await result;
  if (error) throw fromPostgrest(error as never);
  if (data === null) throw new ApiHttpError(404, missing);
  return data;
};

/**
 * Calls a write RPC. The result is already the shape the app expects — these
 * are the `*_json` renderers the backend built for exactly this purpose.
 */
const rpc = async (fn: string, args: Record<string, unknown> = {}): Promise<unknown> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw fromPostgrest(error);
  return data;
};

/**
 * `functions.invoke` reports any non-2xx as one opaque error, so the function's
 * own `{ message }` -- "That plan covers 2 clients and you have 8" -- was being
 * thrown away and replaced with a gateway error the user could do nothing
 * about. Read it back off the response it is still holding.
 */
const fnError = async (error: unknown): Promise<ApiHttpError> => {
  const res = (error as { context?: Response }).context;
  try {
    const body = await res?.clone().json();
    if (body?.message) return new ApiHttpError(res?.status ?? 502, String(body.message));
  } catch {
    /* not JSON, or no response at all -- fall through */
  }
  return new ApiHttpError(502, 'Could not reach the payment gateway');
};

const str = (v: unknown): string => String(v ?? '');
const int = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* -------------------------------------------------------------- selects */

const CLIENT = '*,users(name,email,avatar_url,auth_user_id)';
const LOG = '*,logged_exercises(*,logged_sets(*))';
const NUTRITION = '*,food_entries(*)';
const HABIT = '*,habit_completions(date)';
const ROUTINE = '*,routine_days(*,routine_exercises(*)),routine_assignments(client_id,assigned_at)';
// One literal, not a concatenation: supabase-js parses the select string at
// the type level, and a computed string collapses the row type to unknown.
const ASSIGNMENT =
  '*,routines(*,routine_days(*,routine_exercises(*))),routine_assignment_days(*,routine_assignment_exercises(*))';

const clients = () =>
  rows<ClientProfileRow>(supabase.from('client_profiles').select(CLIENT).order('id'));

/** `MacroTargets` flattened onto the target_* columns both tables share. */
const macroColumns = (t: MacroTargets) => ({
  target_calories: t.calories,
  target_protein: t.protein,
  target_carbs: t.carbs,
  target_fat: t.fat,
});

const trainerProfile = () =>
  row<TrainerProfileRow>(
    supabase.from('v_trainer_profiles').select('*').limit(1).single(),
    'No trainer profile is visible to this account',
  );


/* ---------------------------------------------------------------- routes */

export const supabaseRoutes: Array<{
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  pattern: string;
  handler: Handler;
}> = [
  /* ------------------------------------------------------------- identity */
  {
    method: 'GET',
    pattern: '/session/roles',
    handler: async () => {
      const [trainerRow, clientRows] = await Promise.all([trainerProfile(), clients()]);
      return { trainer: toTrainerProfile(trainerRow), clients: clientRows.map(toClientProfile) };
    },
  },
  {
    method: 'GET',
    pattern: '/trainer',
    handler: async () => toTrainerProfile(await trainerProfile()),
  },
  {
    // The coach's own profile is a single row, so this stays plain PostgREST.
    // The id comes from the view read rather than the request, so a caller can
    // only ever patch the trainer row RLS already showed them.
    method: 'PATCH',
    pattern: '/trainer',
    handler: async ({ body }) => {
      const patch = body as Partial<Pick<TrainerProfile, 'tracks' | 'headline'>>;
      const current = await trainerProfile();
      await row(
        supabase.from('trainer_profiles').update(patch).eq('id', current.id).select('id').single(),
        `Trainer ${current.id} not found`,
      );
      // `trainer_profiles` carries neither the user columns nor the derived
      // client_ids, so the patched view row is assembled rather than re-read.
      return toTrainerProfile({ ...current, ...patch });
    },
  },
  {
    method: 'GET',
    pattern: '/clients',
    handler: async () => (await clients()).map(toClientProfile),
  },
  {
    method: 'GET',
    pattern: '/clients/:id',
    handler: async ({ params }) =>
      toClientProfile(
        await row<ClientProfileRow>(
          supabase.from('client_profiles').select(CLIENT).eq('id', params.id).single(),
          `Client ${params.id} not found`,
        ),
      ),
  },
  {
    // The coach setting this client's goals. A single-row write, so plain
    // PostgREST; `client_profiles_trainer_writes` in the pending RLS set
    // already restricts it to their own clients.
    method: 'PATCH',
    pattern: '/clients/:id',
    handler: async ({ body, params }) => {
      const patch = body as ClientGoalPatch;
      const t = patch.targets;
      const updated = await row<ClientProfileRow>(
        supabase
          .from('client_profiles')
          .update({
            ...(patch.goal === undefined ? {} : { goal: patch.goal }),
            ...(patch.targetWeightKg === undefined
              ? {}
              : { target_weight_kg: patch.targetWeightKg }),
            ...(t ? macroColumns(t) : {}),
          })
          .eq('id', params.id)
          .select(CLIENT)
          .single(),
        `Client ${params.id} not found`,
      );

      // nutrition_days snapshot the targets live on the day they were created,
      // so a past day keeps what the client was actually held to; today and
      // anything already opened ahead of it follow the new numbers.
      if (t) {
        await rows(
          supabase
            .from('nutrition_days')
            .update(macroColumns(t))
            .eq('client_id', params.id)
            .gte('date', TODAY)
            .select('id'),
        );
      }

      return toClientProfile(updated);
    },
  },

  {
    // The invite IS the client row (migration 20260915000003): users +
    // client_profiles + thread in one RPC, then read back like any client.
    method: 'POST',
    pattern: '/clients/invite',
    handler: async ({ body }) => {
      const { name, email, profile } = body as ClientInvite;
      const id = str(await rpc('invite_client', { p_name: name, p_email: email, p_profile: profile ?? null }));
      return toClientProfile(
        await row<ClientProfileRow>(
          supabase.from('client_profiles').select(CLIENT).eq('id', id).single(),
          `Client ${id} not found`,
        ),
      );
    },
  },
  {
    // Self-signup (migration 20260918000002). create_profile reads auth.uid()
    // and the address from auth.users itself, so the body carries only the two
    // things the server cannot know: which way in, and what to call them.
    method: 'POST',
    pattern: '/session/profile',
    handler: async ({ body }) => {
      const { kind, name } = body as ProfileInput;
      return { id: str(await rpc('create_profile', { p_kind: kind, p_name: name })) };
    },
  },
  {
    method: 'DELETE',
    pattern: '/clients/:id/invite',
    handler: async ({ params }) => {
      await rpc('revoke_invite', { p_client_id: params.id });
      return { id: params.id };
    },
  },
  {
    // The server acts on the signed-in client (app_user_id()); the id in the
    // path is for the mock, which has no notion of who is asking.
    method: 'POST',
    pattern: '/clients/:id/intake',
    handler: async ({ body }) => {
      const input = body as IntakeInput;
      await rpc('complete_intake', {
        p_height: input.heightCm ?? null,
        p_weight: input.startWeightKg ?? null,
        p_target: input.targetWeightKg ?? null,
        p_goal: input.goal ?? null,
        p_notes: input.notes ?? null,
        p_date: input.date,
      });
      return null;
    },
  },

  /* ------------------------------------------------------------ nutrition */
  {
    method: 'GET',
    pattern: '/nutrition/days',
    handler: async ({ query }) => {
      const from = addDays(TODAY, -(int(query.days, 30) - 1));
      const data = await rows<NutritionDayRow>(
        supabase
          .from('nutrition_days')
          .select(NUTRITION)
          .eq('client_id', str(query.clientId))
          .gte('date', from)
          .order('date', { ascending: false }),
      );
      return data.map(toNutritionDay);
    },
  },
  {
    // Created on first read, not first write — the day view opens before
    // anything has been logged, and the targets are snapshotted at that moment.
    method: 'GET',
    pattern: '/nutrition/days/:date',
    handler: ({ params, query }) =>
      rpc('get_or_create_nutrition_day', {
        p_client_id: str(query.clientId),
        p_date: params.date,
      }),
  },
  {
    method: 'POST',
    pattern: '/nutrition/entries',
    handler: ({ body }) => rpc('add_food_entries', { p_entries: [body] }),
  },
  {
    method: 'POST',
    pattern: '/nutrition/entries/batch',
    handler: ({ body }) =>
      rpc('add_food_entries', { p_entries: (body as { entries: unknown[] }).entries }),
  },
  {
    method: 'DELETE',
    pattern: '/nutrition/entries/:id',
    handler: ({ params }) => rpc('delete_food_entry', { p_id: params.id }),
  },
  {
    method: 'GET',
    pattern: '/foods',
    handler: async ({ query }) => {
      const q = str(query.q).trim();
      let builder = supabase.from('foods').select('*');
      // The mock matches on name or brand; `or` keeps that one round trip.
      if (q) builder = builder.or(`name.ilike.%${q}%,brand.ilike.%${q}%`);
      return (await rows<FoodRow>(builder.order('id').limit(40))).map(toFoodItem);
    },
  },
  {
    method: 'GET',
    pattern: '/foods/frequent',
    handler: async () =>
      (
        await rows<FoodRow>(supabase.from('foods').select('*').eq('frequent', true).order('id'))
      ).map(toFoodItem),
  },
  {
    method: 'GET',
    pattern: '/ai/suggestions',
    handler: async () =>
      (
        await rows<AiSuggestionRow>(
          supabase.from('ai_food_suggestions').select('*').order('id'),
        )
      ).map(toAiSuggestion),
  },

  /* ------------------------------------------------------------- training */
  {
    method: 'GET',
    pattern: '/exercises',
    handler: async () =>
      (await rows<ExerciseRow>(supabase.from('exercises').select('*').order('id'))).map(toExercise),
  },
  {
    method: 'GET',
    pattern: '/workouts/logs',
    handler: async ({ query }) =>
      (
        await rows<WorkoutLogRow>(
          supabase
            .from('workout_logs')
            .select(LOG)
            .eq('client_id', str(query.clientId))
            .order('date', { ascending: false })
            .limit(int(query.limit, 50)),
        )
      ).map(toWorkoutLog),
  },
  {
    method: 'GET',
    pattern: '/workouts/logs/:id',
    handler: async ({ params }) =>
      toWorkoutLog(
        await row<WorkoutLogRow>(
          supabase.from('workout_logs').select(LOG).eq('id', params.id).single(),
          'Workout log not found',
        ),
      ),
  },
  {
    // Spans four tables, so it is one RPC rather than a client-side sequence
    // that could half-succeed.
    method: 'POST',
    pattern: '/workouts/logs',
    handler: ({ body }) => rpc('create_workout_log', { p_input: body }),
  },

  /* ------------------------------------------------------------- routines */
  {
    method: 'GET',
    pattern: '/routines',
    handler: async () =>
      (
        await rows<RoutineRow>(
          supabase.from('routines').select(ROUTINE).order('updated_at', { ascending: false }),
        )
      ).map(toRoutine),
  },
  {
    method: 'GET',
    pattern: '/routines/:id',
    handler: async ({ params }) =>
      toRoutine(
        await row<RoutineRow>(
          supabase.from('routines').select(ROUTINE).eq('id', params.id).single(),
          `Routine ${params.id} not found`,
        ),
      ),
  },
  {
    method: 'POST',
    pattern: '/routines',
    handler: ({ body }) => rpc('create_routine', { p_input: body }),
  },
  {
    method: 'PATCH',
    pattern: '/routines/:id',
    handler: ({ params, body }) => rpc('update_routine', { p_id: params.id, p_patch: body }),
  },
  {
    method: 'POST',
    pattern: '/routines/:id/assign',
    handler: ({ params, body }) =>
      rpc('assign_routine', {
        p_id: params.id,
        p_client_ids: (body as { clientIds: string[] }).clientIds,
      }),
  },
  {
    method: 'POST',
    pattern: '/routines/:id/duplicate',
    handler: ({ params }) => rpc('duplicate_routine', { p_id: params.id }),
  },
  {
    method: 'DELETE',
    pattern: '/routines/:id',
    handler: async ({ params }) => {
      // Assignments cascade in the schema, so this is genuinely one statement.
      await row(
        supabase.from('routines').delete().eq('id', params.id).select('id').single(),
        `Routine ${params.id} not found`,
      );
      return { id: params.id };
    },
  },

  /* ---------------------------------------------------------- assignments */
  {
    method: 'GET',
    pattern: '/assignments',
    handler: async ({ query }) => {
      let builder = supabase.from('routine_assignments').select(ASSIGNMENT);
      if (query.clientId) builder = builder.eq('client_id', str(query.clientId));
      if (query.routineId) builder = builder.eq('routine_id', str(query.routineId));
      const data = await rows<AssignmentRow>(builder.order('assigned_at', { ascending: false }));
      return data.map(toAssignedRoutine);
    },
  },
  {
    method: 'GET',
    pattern: '/assignments/:id',
    handler: async ({ params }) =>
      toAssignedRoutine(
        await row<AssignmentRow>(
          supabase.from('routine_assignments').select(ASSIGNMENT).eq('id', params.id).single(),
          `Assignment ${params.id} not found`,
        ),
      ),
  },
  {
    method: 'POST',
    pattern: '/assignments',
    handler: ({ body }) => {
      const { routineId, clientId } = body as { routineId: string; clientId: string };
      return rpc('create_assignment', { p_routine_id: routineId, p_client_id: clientId });
    },
  },
  {
    method: 'PATCH',
    pattern: '/assignments/:id',
    handler: ({ params, body }) =>
      rpc('customise_assignment', {
        p_id: params.id,
        p_days: (body as { days: unknown[] }).days,
      }),
  },
  {
    method: 'POST',
    pattern: '/assignments/:id/reset',
    handler: ({ params }) => rpc('reset_assignment', { p_id: params.id }),
  },
  {
    method: 'DELETE',
    pattern: '/assignments/:id',
    handler: async ({ params }) => {
      await row(
        supabase.from('routine_assignments').delete().eq('id', params.id).select('id').single(),
        `Assignment ${params.id} not found`,
      );
      return { id: params.id };
    },
  },

  /* ------------------------------------------------------------- progress */
  {
    method: 'GET',
    pattern: '/metrics',
    handler: async ({ query }) =>
      (
        await rows<BodyMetricRow>(
          supabase
            .from('body_metrics')
            .select('*')
            .eq('client_id', str(query.clientId))
            .order('date'),
        )
      ).map(toBodyMetric),
  },
  {
    method: 'POST',
    pattern: '/metrics',
    handler: async ({ body }) => {
      const input = body as {
        clientId: string;
        date: ISODate;
        weightKg: number;
      };
      // One weigh-in per day: re-logging replaces, which is what the unique
      // constraint on (client_id, date) already says.
      return toBodyMetric(
        await row<BodyMetricRow>(
          supabase
            .from('body_metrics')
            .upsert(
              {
                client_id: input.clientId,
                date: input.date,
                weight_kg: input.weightKg,
              },
              { onConflict: 'client_id,date' },
            )
            .select('*')
            .single(),
          'Could not save the metric',
        ),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/photos',
    handler: async ({ query }) =>
      (
        await rows<ProgressPhotoRow>(
          supabase
            .from('progress_photos')
            .select('*')
            .eq('client_id', str(query.clientId))
            .order('date', { ascending: false }),
        )
      ).map(toProgressPhoto),
  },
  {
    method: 'GET',
    pattern: '/habits',
    handler: async ({ query }) =>
      (
        await rows<HabitRow>(
          supabase
            .from('habits')
            .select(HABIT)
            .eq('client_id', str(query.clientId))
            .order('id'),
        )
      ).map(toHabit),
  },
  {
    method: 'POST',
    pattern: '/habits/:id/toggle',
    handler: ({ params, body }) =>
      rpc('toggle_habit', { p_id: params.id, p_date: (body as { date: ISODate }).date }),
  },
  {
    method: 'POST',
    pattern: '/habits',
    handler: async ({ body }) => {
      const input = body as { clientId: string; title: string; icon: string; createdBy: string };
      return toHabit(
        await row<HabitRow>(
          supabase
            .from('habits')
            .insert({
              client_id: input.clientId,
              title: input.title,
              icon: input.icon,
              created_by: input.createdBy,
            })
            .select(HABIT)
            .single(),
          'Could not create the habit',
        ),
      );
    },
  },

  {
    // Single-row writes, so plain PostgREST like the insert above.
    method: 'PATCH',
    pattern: '/habits/:id',
    handler: async ({ params, body }) => {
      const patch = body as Partial<{ title: string; icon: string }>;
      return toHabit(
        await row<HabitRow>(
          supabase.from('habits').update(patch).eq('id', params.id).select(HABIT).single(),
          `Habit ${params.id} not found`,
        ),
      );
    },
  },
  {
    method: 'DELETE',
    pattern: '/habits/:id',
    handler: async ({ params }) => {
      await row(
        supabase.from('habits').delete().eq('id', params.id).select('id').single(),
        `Habit ${params.id} not found`,
      );
      return { id: params.id };
    },
  },

  /* -------------------------------------------------------- communication */
  {
    method: 'GET',
    pattern: '/threads',
    handler: async () =>
      (
        await rows<ThreadRow>(
          supabase
            .from('threads')
            .select('*')
            .order('last_message_at', { ascending: false, nullsFirst: false }),
        )
      ).map(toThread),
  },
  {
    method: 'GET',
    pattern: '/threads/:id',
    handler: async ({ params }) =>
      toThread(
        await row<ThreadRow>(
          supabase.from('threads').select('*').eq('id', params.id).single(),
          'Thread not found',
        ),
      ),
  },
  {
    method: 'GET',
    pattern: '/threads/:id/messages',
    handler: async ({ params }) =>
      (
        await rows<MessageRow>(
          supabase.from('messages').select('*').eq('thread_id', params.id).order('sent_at'),
        )
      ).map(toMessage),
  },
  {
    // A plain insert: the thread's preview and both unread counters are
    // maintained by triggers, so sending from one device is unread on every other.
    method: 'POST',
    pattern: '/threads/:id/messages',
    handler: async ({ params, body }) => {
      const input = body as {
        senderId: string;
        body: string;
        attachment?: Parameters<typeof fromAttachment>[0];
      };
      return toMessage(
        await row<MessageRow>(
          supabase
            .from('messages')
            .insert({
              thread_id: params.id,
              sender_id: input.senderId,
              body: input.body,
              ...fromAttachment(input.attachment),
            })
            .select('*')
            .single(),
          'Could not send the message',
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/threads/:id/read',
    handler: ({ params, body }) =>
      rpc('mark_thread_read', {
        p_thread_id: params.id,
        p_as: (body as { as: 'trainer' | 'client' }).as,
      }),
  },

  /* ---------------------------------------------------------- trainer ops */
  {
    method: 'GET',
    pattern: '/trainer/summary',
    handler: async () =>
      toTrainerSummary(
        await row<TrainerSummaryRow>(
          supabase.from('v_trainer_summary').select('*').limit(1).single(),
          'No trainer summary is visible to this account',
        ),
      ),
  },
  {
    method: 'GET',
    pattern: '/trainer/alerts',
    handler: async () =>
      (
        await rows<AlertRow>(
          supabase
            .from('red_flag_alerts')
            .select('*')
            .eq('resolved', false)
            // `severity` is an enum declared critical → warning → info, so
            // ordering on the column already ranks by urgency.
            .order('severity')
            .order('raised_at', { ascending: false }),
        )
      ).map(toAlert),
  },
  {
    method: 'POST',
    pattern: '/trainer/alerts/:id/resolve',
    handler: async ({ params }) =>
      toAlert(
        await row<AlertRow>(
          supabase
            .from('red_flag_alerts')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', params.id)
            .select('*')
            .single(),
          'Alert not found',
        ),
      ),
  },
  {
    method: 'GET',
    pattern: '/trainer/checkins',
    handler: async ({ query }) => {
      let builder = supabase.from('check_ins').select('*');
      if (query.status) builder = builder.eq('status', str(query.status));
      if (query.clientId) builder = builder.eq('client_id', str(query.clientId));
      return (await rows<CheckInRow>(builder.order('id'))).map(toCheckIn);
    },
  },
  {
    method: 'POST',
    pattern: '/trainer/checkins/:id/review',
    handler: async ({ params }) =>
      toCheckIn(
        await row<CheckInRow>(
          supabase
            .from('check_ins')
            .update({ status: 'reviewed' })
            .eq('id', params.id)
            .select('*')
            .single(),
          'Check-in not found',
        ),
      ),
  },
  {
    /**
     * Weekly rollups are computed here, not in the database.
     *
     * The headline score is refreshed by pg_cron (refresh_compliance); this
     * per-week table stays here: two ranged reads and the arithmetic, over the
     * window actually on screen.
     */
    method: 'GET',
    pattern: '/trainer/clients/:id/compliance',
    handler: async ({ params, query }) => {
      const weeks = int(query.weeks, 6);
      const thisWeek = startOfWeek(TODAY);
      const from = addDays(thisWeek, -(weeks - 1) * 7);

      const [client, days, logs] = await Promise.all([
        row<ClientProfileRow>(
          supabase.from('client_profiles').select(CLIENT).eq('id', params.id).single(),
          `Client ${params.id} not found`,
        ),
        rows<{ date: string; consumed_calories: number; consumed_protein: number }>(
          supabase
            .from('nutrition_days')
            .select('date,consumed_calories,consumed_protein')
            .eq('client_id', params.id)
            .gt('consumed_calories', 0) // opening a day creates an empty row
            .gte('date', from),
        ),
        rows<{ date: string }>(
          supabase
            .from('workout_logs')
            .select('date')
            .eq('client_id', params.id)
            .gte('date', from),
        ),
      ]);

      const mean = (values: number[]) =>
        values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

      return Array.from({ length: weeks }, (_, i) => {
        const weekOf = addDays(thisWeek, -(weeks - 1 - i) * 7);
        const end = addDays(weekOf, 7);
        const inWeek = days.filter((d) => d.date >= weekOf && d.date < end);
        const sessions = logs.filter((l) => l.date >= weekOf && l.date < end);

        return {
          weekOf,
          loggedDays: inWeek.length,
          avgCalories: Math.round(mean(inWeek.map((d) => d.consumed_calories))),
          avgProtein: Math.round(mean(inWeek.map((d) => d.consumed_protein))),
          targetCalories: client.target_calories,
          targetProtein: client.target_protein,
          sessionsCompleted: sessions.length,
          sessionsPlanned: 5,
        };
      });
    },
  },
  {
    /** The client-detail header: four trailing-window numbers over three reads. */
    method: 'GET',
    pattern: '/trainer/clients/:id/overview',
    handler: async ({ params }) => {
      const [clientRow, metrics, logs, nutrition, openAlerts] = await Promise.all([
        row<ClientProfileRow>(
          supabase.from('client_profiles').select(CLIENT).eq('id', params.id).single(),
          `Client ${params.id} not found`,
        ),
        rows<BodyMetricRow>(
          supabase
            .from('body_metrics')
            .select('*')
            .eq('client_id', params.id)
            .order('date'),
        ),
        rows<{ date: string }>(
          supabase.from('workout_logs').select('date').eq('client_id', params.id),
        ),
        rows<{ date: string; consumed_calories: number }>(
          supabase
            .from('nutrition_days')
            .select('date,consumed_calories')
            .eq('client_id', params.id),
        ),
        (async () => {
          const { count, error } = await supabase
            .from('red_flag_alerts')
            .select('id', { count: 'exact', head: true })
            .eq('client_id', params.id)
            .eq('resolved', false);
          if (error) throw fromPostgrest(error);
          return count ?? 0;
        })(),
      ]);

      const client = toClientProfile(clientRow);
      const latest = metrics.length ? toBodyMetric(metrics[metrics.length - 1]) : undefined;
      const monthAgoRow = metrics.find((m) => diffInDays(TODAY, m.date) <= 30);
      const monthAgo = monthAgoRow ? toBodyMetric(monthAgoRow) : undefined;

      const recentLogs = logs.filter((l) => diffInDays(TODAY, l.date) < 7);
      const recentDays = nutrition.filter((n) => diffInDays(TODAY, n.date) < 7);
      const mean = (values: number[]) =>
        values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;

      return {
        client,
        latestWeightKg: latest?.weightKg ?? client.startWeightKg,
        weightChange30d:
          latest && monthAgo ? Number((latest.weightKg - monthAgo.weightKg).toFixed(1)) : 0,
        sessionsLast7: recentLogs.length,
        loggedDaysLast7: recentDays.length,
        avgCaloriesLast7: Math.round(mean(recentDays.map((n) => n.consumed_calories))),
        openAlerts,
      };
    },
  },
  /* ------------------------------------------------------------- billing */
  {
    method: 'GET',
    pattern: '/plans',
    handler: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('code, role, name, price_paise, max_clients, position')
        .order('position');
      if (error) throw fromPostgrest(error);
      return (data as PlanRow[]).map(toPlan);
    },
  },
  {
    // Null, not a 404, for an account with no row: "no subscription" is a
    // state the paywall renders, not an error a screen has to catch. RLS
    // (subscriptions_self_read) is what scopes this to the caller -- there is
    // no id in the path, deliberately, so nobody can ask about someone else.
    method: 'GET',
    pattern: '/subscription',
    handler: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('user_id, plan_code, status, current_period_end')
        .maybeSingle();
      if (error) throw fromPostgrest(error);
      return data ? toSubscription(data as SubscriptionRow) : null;
    },
  },
  {
    // The two calls that need the Razorpay secret, so they live in an edge
    // function rather than an RPC. What comes back is Razorpay's own hosted
    // checkout URL; the app opens it in a browser and the webhook, not this
    // response, is what activates the plan.
    method: 'POST',
    pattern: '/subscription/checkout',
    handler: async ({ body }) => {
      const { planCode } = body as { planCode: string };
      const { data, error } = await supabase.functions.invoke('razorpay', {
        body: { action: 'subscribe', planCode },
      });
      if (error) throw await fnError(error);
      return data as { shortUrl: string | null };
    },
  },
  {
    method: 'POST',
    pattern: '/subscription/cancel',
    handler: async () => {
      const { error } = await supabase.functions.invoke('razorpay', {
        body: { action: 'cancel' },
      });
      if (error) throw await fnError(error);
      return null;
    },
  },
];
