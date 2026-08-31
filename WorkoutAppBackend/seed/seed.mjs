/**
 * Seeds a Supabase project from the app's mock fixtures.
 *
 * The fixtures in src/mock-api are the shape the frontend types declare, i.e.
 * deeply nested. The schema is normalised, so this script's real job is
 * flattening: routine/session/log nesting becomes child rows, and array order
 * is preserved in a `position` column.
 *
 * Usage:
 *   MOCK_DIR=../WorkoutAppFrontend/src/mock-api \
 *   SUPABASE_URL=... SUPABASE_KEY=... node seed.mjs
 *
 * Idempotent: every insert uses upsert (on_conflict on the primary key), so
 * re-running refreshes rather than duplicating.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MOCK_DIR = process.env.MOCK_DIR ?? '../WorkoutAppFrontend/src/mock-api';
const URL = (process.env.SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_KEY ?? '';

const EMIT = process.argv.includes('--emit-sql');

if (!EMIT && (!URL || !KEY)) {
  console.error('SUPABASE_URL and SUPABASE_KEY must be set (or pass --emit-sql).');
  process.exit(1);
}

const read = (name) => JSON.parse(readFileSync(join(MOCK_DIR, name), 'utf8'));

const BATCH = 500;
const skipped = [];

async function insert(table, rows, conflict = 'id') {
  if (!rows.length) {
    console.log(`  ${table.padEnd(30)} 0`);
    return;
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const res = await fetch(`${URL}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error(`\n! ${table} rows ${i}-${i + chunk.length}: ${res.status}`);
      console.error(await res.text());
      console.error('first row:', JSON.stringify(chunk[0]));
      process.exit(1);
    }
  }
  console.log(`  ${table.padEnd(30)} ${rows.length}`);
}

/** Keeps the last row per key — fixtures occasionally repeat a natural key. */
function dedupe(rows, keyFn, label) {
  const seen = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (seen.has(k)) skipped.push(`${label}: duplicate key ${k}`);
    seen.set(k, r);
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// 1. Users, profiles
// ---------------------------------------------------------------------------

const usersJson = read('users.json');
const trainer = usersJson.trainer;
const clients = usersJson.clients;

const users = [
  {
    id: trainer.id,
    role: 'trainer',
    name: trainer.name,
    email: trainer.email,
    avatar_url: trainer.avatarUrl ?? '',
  },
  ...clients.map((c) => ({
    id: c.id,
    role: 'client',
    name: c.name,
    email: c.email,
    avatar_url: c.avatarUrl ?? '',
  })),
];

const trainerProfiles = [{ id: trainer.id, headline: trainer.headline ?? '' }];

const clientProfiles = clients.map((c) => ({
  id: c.id,
  trainer_id: c.trainerId,
  goal: c.goal,
  height_cm: c.heightCm,
  start_weight_kg: c.startWeightKg,
  target_weight_kg: c.targetWeightKg,
  target_calories: c.targets.calories,
  target_protein: c.targets.protein,
  target_carbs: c.targets.carbs,
  target_fat: c.targets.fat,
  joined_at: c.joinedAt,
  compliance_score: c.compliance?.score ?? 0,
  compliance_status: c.compliance?.status ?? 'yellow',
  last_logged_at: c.compliance?.lastLoggedAt ?? null,
  compliance_streak_days: c.compliance?.streakDays ?? 0,
}));

const clientIds = new Set(clients.map((c) => c.id));

// ---------------------------------------------------------------------------
// 2. Reference libraries
// ---------------------------------------------------------------------------

const exercises = read('exercises.json').map((e) => ({
  id: e.id,
  name: e.name,
  muscle_group: e.muscleGroup,
  equipment: e.equipment ?? '',
}));
const exerciseIds = new Set(exercises.map((e) => e.id));

const foods = read('foods.json').map((f) => ({
  id: f.id,
  name: f.name,
  brand: f.brand ?? null,
  serving_label: f.servingLabel,
  calories: f.calories,
  protein: f.protein,
  carbs: f.carbs,
  fat: f.fat,
  emoji: f.emoji ?? '',
  frequent: f.frequent ?? false,
}));
const foodIds = new Set(foods.map((f) => f.id));

// ---------------------------------------------------------------------------
// 3. Sessions -> session_exercises -> prescribed_sets
// ---------------------------------------------------------------------------

const sessionsJson = read('workoutSessions.json').filter((s) => clientIds.has(s.clientId));
const sessions = sessionsJson.map((s) => ({
  id: s.id,
  client_id: s.clientId,
  title: s.title,
  scheduled_for: s.scheduledFor,
  estimated_minutes: s.estimatedMinutes ?? 60,
  focus: s.focus,
  status: s.status ?? 'scheduled',
}));
const sessionIds = new Set(sessions.map((s) => s.id));

const sessionExercises = [];
const prescribedSets = [];
for (const s of sessionsJson) {
  (s.exercises ?? []).forEach((ex, i) => {
    if (!exerciseIds.has(ex.exerciseId)) {
      skipped.push(`session_exercise ${ex.id}: unknown exercise ${ex.exerciseId}`);
      return;
    }
    sessionExercises.push({
      id: ex.id,
      session_id: s.id,
      exercise_id: ex.exerciseId,
      name: ex.name,
      muscle_group: ex.muscleGroup,
      notes: ex.notes ?? null,
      position: i,
    });
    (ex.sets ?? []).forEach((set, j) => {
      prescribedSets.push({
        session_exercise_id: ex.id,
        position: j,
        reps: set.reps,
        target_weight_kg: set.targetWeightKg ?? null,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Logs -> logged_exercises -> logged_sets
// ---------------------------------------------------------------------------

const logsJson = read('workoutLogs.json').filter((l) => clientIds.has(l.clientId));
const logs = logsJson.map((l) => {
  if (l.sessionId && !sessionIds.has(l.sessionId)) {
    skipped.push(`workout_log ${l.id}: session ${l.sessionId} not in fixtures, nulled`);
  }
  return {
    id: l.id,
    client_id: l.clientId,
    session_id: l.sessionId && sessionIds.has(l.sessionId) ? l.sessionId : null,
    title: l.title,
    date: l.date,
    duration_minutes: l.durationMinutes,
    rpe: l.rpe,
    total_volume_kg: l.totalVolumeKg ?? 0,
    notes: l.notes ?? null,
    completed_at: l.completedAt,
  };
});
const logIds = new Set(logs.map((l) => l.id));

const loggedExercises = [];
const loggedSets = [];
for (const l of logsJson) {
  (l.exercises ?? []).forEach((ex, i) => {
    if (!exerciseIds.has(ex.exerciseId)) {
      skipped.push(`logged_exercise ${ex.id}: unknown exercise ${ex.exerciseId}`);
      return;
    }
    loggedExercises.push({
      id: ex.id,
      workout_log_id: l.id,
      exercise_id: ex.exerciseId,
      name: ex.name,
      muscle_group: ex.muscleGroup,
      position: i,
    });
    (ex.sets ?? []).forEach((set, j) => {
      loggedSets.push({
        id: set.id,
        logged_exercise_id: ex.id,
        position: j,
        reps: set.reps,
        weight_kg: set.weightKg,
        completed: set.completed ?? true,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// 5. Nutrition days -> food_entries
// ---------------------------------------------------------------------------

const nutritionJson = read('nutritionLogs.json').filter((d) => clientIds.has(d.clientId));
const nutritionDays = dedupe(
  nutritionJson.map((d) => ({
    id: `nd-${d.clientId}-${d.date}`,
    client_id: d.clientId,
    date: d.date,
    target_calories: d.targets.calories,
    target_protein: d.targets.protein,
    target_carbs: d.targets.carbs,
    target_fat: d.targets.fat,
    // consumed_* is recomputed by the food_entries trigger; seeding it keeps
    // days that have no entries honest.
    consumed_calories: d.consumed.calories,
    consumed_protein: d.consumed.protein,
    consumed_carbs: d.consumed.carbs,
    consumed_fat: d.consumed.fat,
  })),
  (d) => d.id,
  'nutrition_days',
);

const foodEntries = [];
for (const d of nutritionJson) {
  for (const e of d.entries ?? []) {
    foodEntries.push({
      id: e.id,
      nutrition_day_id: `nd-${d.clientId}-${d.date}`,
      client_id: d.clientId,
      date: d.date,
      slot: e.slot,
      food_id: foodIds.has(e.foodId) ? e.foodId : null,
      name: e.name,
      servings: e.servings,
      calories: e.calories,
      protein: e.protein,
      carbs: e.carbs,
      fat: e.fat,
      source: e.source ?? 'search',
      logged_at: e.loggedAt,
    });
  }
}

// ---------------------------------------------------------------------------
// 6. Progress
// ---------------------------------------------------------------------------

const bodyMetrics = dedupe(
  read('bodyMetrics.json')
    .filter((m) => clientIds.has(m.clientId))
    .map((m) => ({
      id: m.id,
      client_id: m.clientId,
      date: m.date,
      weight_kg: m.weightKg,
      body_fat_pct: m.bodyFatPct ?? null,
      waist_cm: m.waistCm ?? null,
    })),
  (m) => `${m.client_id}|${m.date}`,
  'body_metrics',
);

const progressPhotos = read('progressPhotos.json')
  .filter((p) => clientIds.has(p.clientId))
  .map((p) => ({
    id: p.id,
    client_id: p.clientId,
    date: p.date,
    pose: p.pose,
    uri: p.uri,
    weight_kg: p.weightKg ?? null,
  }));

const habitsJson = read('habits.json').filter((h) => clientIds.has(h.clientId));
const habits = habitsJson.map((h) => ({
  id: h.id,
  client_id: h.clientId,
  title: h.title,
  icon: h.icon ?? '',
  cadence: h.cadence ?? 'daily',
  created_by: h.createdBy ?? 'client',
}));
const habitCompletions = dedupe(
  habitsJson.flatMap((h) => (h.completedDates ?? []).map((d) => ({ habit_id: h.id, date: d }))),
  (c) => `${c.habit_id}|${c.date}`,
  'habit_completions',
);

// ---------------------------------------------------------------------------
// 7. Messaging
// ---------------------------------------------------------------------------

const threadsJson = read('threads.json').filter((t) => clientIds.has(t.clientId));
const threads = threadsJson.map((t) => ({
  id: t.id,
  client_id: t.clientId,
  trainer_id: t.trainerId,
  last_message_preview: t.lastMessagePreview ?? '',
  last_message_at: t.lastMessageAt ?? null,
  unread_for_trainer: t.unreadForTrainer ?? 0,
  unread_for_client: t.unreadForClient ?? 0,
}));
const threadIds = new Set(threads.map((t) => t.id));

const messages = read('messages.json')
  .filter((m) => threadIds.has(m.threadId))
  .map((m) => {
    const a = m.attachment;
    const row = {
      id: m.id,
      thread_id: m.threadId,
      sender_id: m.senderId,
      body: m.body ?? '',
      attachment_kind: null,
      attachment_log_id: null,
      attachment_date: null,
      attachment_uri: null,
      sent_at: m.sentAt,
      read_at: m.readAt ?? null,
    };
    if (a?.kind === 'workout') {
      if (logIds.has(a.logId)) {
        row.attachment_kind = 'workout';
        row.attachment_log_id = a.logId;
      } else {
        skipped.push(`message ${m.id}: attachment log ${a.logId} missing, dropped`);
      }
    } else if (a?.kind === 'nutrition') {
      row.attachment_kind = 'nutrition';
      row.attachment_date = a.date;
    } else if (a?.kind === 'photo') {
      row.attachment_kind = 'photo';
      row.attachment_uri = a.uri;
    }
    return row;
  });

// ---------------------------------------------------------------------------
// 8. Triage
// ---------------------------------------------------------------------------

const alerts = read('alerts.json')
  .filter((a) => clientIds.has(a.clientId))
  .map((a) => ({
    id: a.id,
    client_id: a.clientId,
    kind: a.kind,
    severity: a.severity,
    title: a.title,
    detail: a.detail ?? '',
    raised_at: a.raisedAt,
    resolved: a.resolved ?? false,
    resolved_at: a.resolved ? (a.resolvedAt ?? a.raisedAt) : null,
  }));

const checkIns = dedupe(
  read('checkIns.json')
    .filter((c) => clientIds.has(c.clientId))
    .map((c) => ({
      id: c.id,
      client_id: c.clientId,
      week_of: c.weekOf,
      submitted_at: c.submittedAt,
      status: c.status,
      weight_change_kg: c.weightChangeKg,
      avg_calories: c.avgCalories,
      target_calories: c.targetCalories,
      sessions_completed: c.sessionsCompleted,
      sessions_planned: c.sessionsPlanned,
      avg_rpe: c.avgRpe,
      client_note: c.clientNote ?? '',
    })),
  (c) => `${c.client_id}|${c.week_of}`,
  'check_ins',
);

const aiSuggestions = read('aiSuggestions.json').map((s) => ({
  id: s.id,
  client_id: null,
  transcript: s.transcript,
  confidence: s.confidence,
  items: s.items ?? [],
}));

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/** Insertion order matters: parents before the rows that reference them. */
const TABLES = [
  ['users', users],
  ['trainer_profiles', trainerProfiles],
  ['client_profiles', clientProfiles],
  ['exercises', exercises],
  ['foods', foods],
  ['workout_sessions', sessions],
  ['session_exercises', sessionExercises],
  ['prescribed_sets', prescribedSets, 'session_exercise_id,position'],
  ['workout_logs', logs],
  ['logged_exercises', loggedExercises],
  ['logged_sets', loggedSets],
  ['nutrition_days', nutritionDays],
  ['food_entries', foodEntries],
  ['body_metrics', bodyMetrics],
  ['progress_photos', progressPhotos],
  ['habits', habits],
  ['habit_completions', habitCompletions, 'habit_id,date'],
  ['threads', threads],
  ['messages', messages],
  ['red_flag_alerts', alerts],
  ['check_ins', checkIns],
  ['ai_food_suggestions', aiSuggestions],
];

// --- SQL emitter -----------------------------------------------------------
// Fallback for environments that cannot reach the Supabase REST endpoint (an
// egress allowlist, say). `node seed.mjs --emit-sql [table ...]` writes upsert
// statements to seed.sql instead of inserting, for pasting into the SQL editor.

const literal = (v) =>
  v === null || v === undefined ? 'null'
  : typeof v === 'number' || typeof v === 'boolean' ? String(v)
  : typeof v === 'object' ? `'${JSON.stringify(v).replaceAll("'", "''")}'::jsonb`
  : `'${String(v).replaceAll("'", "''")}'`;

function toSql([name, rows, conflict = 'id']) {
  if (!rows?.length) return '';
  const cols = Object.keys(rows[0]);
  const keys = conflict.split(',');
  const update = cols.filter((c) => !keys.includes(c)).map((c) => `${c}=excluded.${c}`).join(',');
  const values = rows.map((r) => `(${cols.map((c) => literal(r[c])).join(',')})`).join(',\n');
  return `insert into ${name} (${cols.join(',')}) values\n${values}\n`
       + `on conflict (${conflict}) do update set ${update};\n\n`;
}

if (EMIT) {
  const only = process.argv.slice(2).filter((a) => a !== '--emit-sql');
  const wanted = only.length ? TABLES.filter(([n]) => only.includes(n)) : TABLES;
  const sql = wanted.map(toSql).join('');
  writeFileSync('seed.sql', sql);
  for (const [n, rows] of wanted) console.log(`  ${n.padEnd(30)} ${rows.length}`);
  console.log(`\nWrote seed.sql (${(sql.length / 1024).toFixed(1)} KB).`);
} else {
  console.log('Seeding', URL);
  for (const t of TABLES) await insert(t[0], t[1], t[2]);
}

if (skipped.length) {
  console.log(`\n${skipped.length} rows adjusted or skipped:`);
  const counts = new Map();
  for (const s of skipped) {
    const key = s.split(':')[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [k, v] of counts) console.log(`  ${k}: ${v}`);
  console.log('  e.g.', skipped[0]);
}
console.log('\nDone.');
