/**
 * Round-trip check: pull every record back through PostgREST, rebuild the
 * nested shape src/types/models.ts declares, and deep-compare with the fixture
 * the row was seeded from. Anything the normalisation lost shows up here.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert';

const DIR = process.env.MOCK_DIR;
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const read = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));

async function get(path) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const num = (v) => (v === null || v === undefined ? v : Number(v));
const iso = (v) => (v ? new Date(v).toISOString() : v);
const byPos = (a, b) => a.position - b.position;

let checked = 0;
const fail = [];
const cmp = (label, got, want) => {
  checked++;
  try { assert.deepStrictEqual(got, want); }
  catch { fail.push({ label, got, want }); }
};

// --- workout logs ----------------------------------------------------------
{
  const rows = await get('workout_logs?select=*,logged_exercises(*,logged_sets(*))&limit=1000');
  const db = new Map(rows.map((r) => [r.id, r]));
  for (const f of read('workoutLogs.json')) {
    const r = db.get(f.id);
    if (!r) { fail.push({ label: `workout_log ${f.id}`, got: 'missing', want: 'present' }); continue; }
    cmp(`workout_log ${f.id}`, {
      id: r.id, clientId: r.client_id, sessionId: r.session_id, title: r.title,
      date: r.date, durationMinutes: r.duration_minutes,
      totalVolumeKg: num(r.total_volume_kg), notes: r.notes ?? undefined,
      completedAt: iso(r.completed_at),
      exercises: r.logged_exercises.sort(byPos).map((x) => ({
        id: x.id, exerciseId: x.exercise_id, name: x.name, muscleGroup: x.muscle_group,
        sets: x.logged_sets.sort(byPos).map((s) => ({
          id: s.id, reps: s.reps, weightKg: num(s.weight_kg), completed: s.completed,
        })),
      })),
    }, {
      id: f.id, clientId: f.clientId, sessionId: f.sessionId, title: f.title,
      date: f.date, durationMinutes: f.durationMinutes,
      totalVolumeKg: f.totalVolumeKg, notes: f.notes, completedAt: iso(f.completedAt),
      exercises: f.exercises.map((x) => ({
        id: x.id, exerciseId: x.exerciseId, name: x.name, muscleGroup: x.muscleGroup,
        sets: x.sets.map((s) => ({ id: s.id, reps: s.reps, weightKg: s.weightKg, completed: s.completed })),
      })),
    });
  }
}

// --- workout sessions ------------------------------------------------------
{
  const rows = await get('workout_sessions?select=*,session_exercises(*,prescribed_sets(*))&limit=1000');
  const db = new Map(rows.map((r) => [r.id, r]));
  for (const f of read('workoutSessions.json')) {
    const r = db.get(f.id);
    if (!r) { fail.push({ label: `session ${f.id}`, got: 'missing', want: 'present' }); continue; }
    cmp(`session ${f.id}`, {
      id: r.id, clientId: r.client_id, title: r.title, scheduledFor: r.scheduled_for,
      estimatedMinutes: r.estimated_minutes, focus: r.focus, status: r.status,
      exercises: r.session_exercises.sort(byPos).map((x) => ({
        id: x.id, exerciseId: x.exercise_id, name: x.name, muscleGroup: x.muscle_group,
        sets: x.prescribed_sets.sort(byPos).map((s) => ({ reps: s.reps, targetWeightKg: num(s.target_weight_kg) })),
      })),
    }, {
      id: f.id, clientId: f.clientId, title: f.title, scheduledFor: f.scheduledFor,
      estimatedMinutes: f.estimatedMinutes, focus: f.focus, status: f.status,
      exercises: f.exercises.map((x) => ({
        id: x.id, exerciseId: x.exerciseId, name: x.name, muscleGroup: x.muscleGroup,
        sets: x.sets.map((s) => ({ reps: s.reps, targetWeightKg: s.targetWeightKg })),
      })),
    });
  }
}

// --- nutrition days --------------------------------------------------------
{
  const rows = await get('nutrition_days?select=*,food_entries(*)&limit=1000');
  const db = new Map(rows.map((r) => [`${r.client_id}|${r.date}`, r]));
  for (const f of read('nutritionLogs.json')) {
    const r = db.get(`${f.clientId}|${f.date}`);
    if (!r) { fail.push({ label: `nutrition ${f.clientId} ${f.date}`, got: 'missing', want: 'present' }); continue; }
    const sortById = (a, b) => a.id.localeCompare(b.id);
    cmp(`nutrition ${f.clientId} ${f.date}`, {
      date: r.date, clientId: r.client_id,
      targets: { calories: r.target_calories, protein: r.target_protein, carbs: r.target_carbs, fat: r.target_fat },
      entries: r.food_entries.sort(sortById).map((e) => ({
        id: e.id, clientId: e.client_id, date: e.date, slot: e.slot, foodId: e.food_id,
        name: e.name, servings: num(e.servings), calories: e.calories, protein: e.protein,
        carbs: e.carbs, fat: e.fat, source: e.source, loggedAt: iso(e.logged_at),
      })),
    }, {
      date: f.date, clientId: f.clientId, targets: f.targets,
      entries: [...f.entries].sort(sortById).map((e) => ({
        id: e.id, clientId: e.clientId, date: e.date, slot: e.slot, foodId: e.foodId,
        name: e.name, servings: e.servings, calories: e.calories, protein: e.protein,
        carbs: e.carbs, fat: e.fat, source: e.source, loggedAt: iso(e.loggedAt),
      })),
    });
  }
}

// --- flat tables -----------------------------------------------------------
{
  const rows = await get('body_metrics?select=*&limit=2000');
  const db = new Map(rows.map((r) => [r.id, r]));
  for (const f of read('bodyMetrics.json')) {
    const r = db.get(f.id);
    if (!r) { fail.push({ label: `metric ${f.id}`, got: 'missing', want: 'present' }); continue; }
    cmp(`metric ${f.id}`, {
      id: r.id, clientId: r.client_id, date: r.date, weightKg: num(r.weight_kg),
    }, {
      id: f.id, clientId: f.clientId, date: f.date, weightKg: f.weightKg,
    });
  }
}
{
  const rows = await get('habits?select=*,habit_completions(date)&limit=200');
  const db = new Map(rows.map((r) => [r.id, r]));
  for (const f of read('habits.json')) {
    const r = db.get(f.id);
    if (!r) { fail.push({ label: `habit ${f.id}`, got: 'missing', want: 'present' }); continue; }
    cmp(`habit ${f.id} completedDates`,
      r.habit_completions.map((c) => c.date).sort(),
      [...f.completedDates].sort());
  }
}

console.log(`${checked} records compared, ${fail.length} mismatched`);
for (const f of fail.slice(0, 5)) {
  console.log('\n---', f.label);
  console.log('db  ', JSON.stringify(f.got).slice(0, 400));
  console.log('file', JSON.stringify(f.want).slice(0, 400));
}
process.exit(fail.length ? 1 : 0);
