/* eslint-disable */
/**
 * Seeded generator for src/mock-api/*.json.
 *
 * Deterministic: running it twice produces byte-identical output, so the demo
 * dataset is reproducible and diffable. Run with `node tools/generate-mock-data.js`.
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'src', 'mock-api');
fs.mkdirSync(OUT, { recursive: true });

const TODAY = '2026-08-29';

/* ---------------------------------------------------------------- helpers */
let seed = 20260829;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const rfloat = (a, b, d = 1) => Number((a + rnd() * (b - a)).toFixed(d));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;

const d = (iso) => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const iso = (dt) => dt.toISOString().slice(0, 10);
const addDays = (isoStr, n) => {
  const dt = d(isoStr);
  dt.setUTCDate(dt.getUTCDate() + n);
  return iso(dt);
};
const at = (isoStr, h, m = 0) => `${isoStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
const dow = (isoStr) => d(isoStr).getUTCDay(); // 0 Sun

const write = (name, data) =>
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2) + '\n');

/* ------------------------------------------------------------------ users */
const trainer = {
  id: 't-001',
  role: 'trainer',
  name: 'Maya Fernandes',
  email: 'maya@apexcoaching.fit',
  avatarUrl: 'https://i.pravatar.cc/240?img=47',
  headline: 'Strength & body-composition coach',
  clientIds: [],
};

const clientSeeds = [
  { id: 'c-001', name: 'Aditya Rao', goal: 'recomp', h: 178, start: 84.2, target: 78, cal: 2450, status: 'green', avatar: 12 },
  { id: 'c-002', name: 'Leah Mercer', goal: 'cut', h: 165, start: 71.8, target: 64, cal: 1780, status: 'yellow', avatar: 5 },
  { id: 'c-003', name: 'Daniel Okafor', goal: 'bulk', h: 185, start: 79.4, target: 88, cal: 3200, status: 'green', avatar: 33 },
  { id: 'c-004', name: 'Priya Nair', goal: 'cut', h: 160, start: 66.5, target: 58, cal: 1650, status: 'red', avatar: 44 },
  { id: 'c-005', name: 'Tom Whitfield', goal: 'performance', h: 181, start: 88.0, target: 86, cal: 2900, status: 'yellow', avatar: 15 },
  { id: 'c-006', name: 'Sofia Duarte', goal: 'recomp', h: 170, start: 68.9, target: 65, cal: 2050, status: 'green', avatar: 20 },
  { id: 'c-007', name: 'Marcus Hale', goal: 'cut', h: 176, start: 95.3, target: 84, cal: 2200, status: 'red', avatar: 60 },
  { id: 'c-008', name: 'Ines Rossi', goal: 'performance', h: 168, start: 61.2, target: 62, cal: 2400, status: 'green', avatar: 26 },
];

const macroSplit = (cal, goal) => {
  const p = goal === 'bulk' ? 0.27 : goal === 'cut' ? 0.35 : 0.3;
  const f = goal === 'cut' ? 0.25 : 0.28;
  const c = 1 - p - f;
  return {
    calories: cal,
    protein: Math.round((cal * p) / 4),
    carbs: Math.round((cal * c) / 4),
    fat: Math.round((cal * f) / 9),
  };
};

const complianceScore = { green: () => rint(88, 97), yellow: () => rint(62, 76), red: () => rint(28, 49) };
const lastLogged = { green: 0, yellow: 1, red: 4 };

const clients = clientSeeds.map((s, i) => ({
  id: s.id,
  role: 'client',
  name: s.name,
  email: `${s.name.split(' ')[0].toLowerCase()}@example.com`,
  avatarUrl: `https://i.pravatar.cc/240?img=${s.avatar}`,
  trainerId: trainer.id,
  goal: s.goal,
  heightCm: s.h,
  startWeightKg: s.start,
  targetWeightKg: s.target,
  targets: macroSplit(s.cal, s.goal),
  joinedAt: addDays(TODAY, -(120 + i * 17)),
  compliance: {
    status: s.status,
    score: complianceScore[s.status](),
    lastLoggedAt: at(addDays(TODAY, -lastLogged[s.status]), 19, rint(0, 59)),
    streakDays: s.status === 'green' ? rint(9, 34) : s.status === 'yellow' ? rint(2, 6) : 0,
  },
}));
trainer.clientIds = clients.map((c) => c.id);

write('users.json', { trainer, clients });

/* -------------------------------------------------------------- exercises */
const exerciseSeeds = [
  ['Barbell Back Squat', 'legs', 'Barbell'],
  ['Front Squat', 'legs', 'Barbell'],
  ['Romanian Deadlift', 'legs', 'Barbell'],
  ['Conventional Deadlift', 'back', 'Barbell'],
  ['Bulgarian Split Squat', 'legs', 'Dumbbell'],
  ['Leg Press', 'legs', 'Machine'],
  ['Walking Lunge', 'legs', 'Dumbbell'],
  ['Leg Curl', 'legs', 'Machine'],
  ['Barbell Bench Press', 'chest', 'Barbell'],
  ['Incline Dumbbell Press', 'chest', 'Dumbbell'],
  ['Cable Fly', 'chest', 'Cable'],
  ['Weighted Dip', 'chest', 'Bodyweight'],
  ['Pull-up', 'back', 'Bodyweight'],
  ['Chest-Supported Row', 'back', 'Dumbbell'],
  ['Lat Pulldown', 'back', 'Cable'],
  ['Barbell Row', 'back', 'Barbell'],
  ['Seated Cable Row', 'back', 'Cable'],
  ['Overhead Press', 'shoulders', 'Barbell'],
  ['Lateral Raise', 'shoulders', 'Dumbbell'],
  ['Face Pull', 'shoulders', 'Cable'],
  ['Rear Delt Fly', 'shoulders', 'Dumbbell'],
  ['Barbell Curl', 'arms', 'Barbell'],
  ['Incline Dumbbell Curl', 'arms', 'Dumbbell'],
  ['Rope Pushdown', 'arms', 'Cable'],
  ['Skull Crusher', 'arms', 'Barbell'],
  ['Hanging Leg Raise', 'core', 'Bodyweight'],
  ['Cable Crunch', 'core', 'Cable'],
  ['Plank', 'core', 'Bodyweight'],
  ['Farmer Carry', 'full body', 'Dumbbell'],
  ['Assault Bike Intervals', 'conditioning', 'Machine'],
  ['Rowing Erg', 'conditioning', 'Machine'],
  ['Incline Treadmill Walk', 'conditioning', 'Machine'],
];
const exercises = exerciseSeeds.map(([name, muscleGroup, equipment], i) => ({
  id: `e-${String(i + 1).padStart(3, '0')}`,
  name,
  muscleGroup,
  equipment,
}));
const exByName = Object.fromEntries(exercises.map((e) => [e.name, e]));
write('exercises.json', exercises);

/* ------------------------------------------------------------------ foods */
const foodSeeds = [
  ['Greek Yogurt', 'Fage 0%', '170 g pot', 100, 18, 6, 0, '🥛', true],
  ['Rolled Oats', null, '60 g dry', 228, 8, 40, 4, '🥣', true],
  ['Whole Eggs', null, '2 large', 143, 13, 1, 10, '🥚', true],
  ['Egg Whites', null, '200 ml', 104, 22, 1, 0, '🍳', false],
  ['Banana', null, '1 medium', 105, 1, 27, 0, '🍌', true],
  ['Blueberries', null, '100 g', 57, 1, 14, 0, '🫐', false],
  ['Whey Protein', 'Optimum', '1 scoop', 120, 24, 3, 1, '🥤', true],
  ['Chicken Breast', null, '150 g cooked', 248, 46, 0, 5, '🍗', true],
  ['Lean Beef Mince', '5% fat', '150 g', 260, 38, 0, 12, '🥩', false],
  ['Salmon Fillet', null, '140 g', 280, 34, 0, 16, '🐟', false],
  ['Tinned Tuna', 'In brine', '110 g', 116, 26, 0, 1, '🐠', false],
  ['Paneer', null, '100 g', 265, 18, 3, 21, '🧀', false],
  ['Tofu, Firm', null, '150 g', 174, 19, 4, 10, '🍥', false],
  ['Basmati Rice', null, '180 g cooked', 234, 5, 51, 1, '🍚', true],
  ['Sweet Potato', null, '200 g baked', 180, 4, 41, 0, '🍠', false],
  ['Wholemeal Bread', null, '2 slices', 190, 8, 32, 3, '🍞', true],
  ['Wholewheat Pasta', null, '80 g dry', 284, 12, 56, 2, '🍝', false],
  ['Roti', null, '2 pieces', 190, 6, 36, 3, '🫓', true],
  ['Rajma Curry', null, '200 g', 236, 12, 34, 6, '🍛', false],
  ['Chana Masala', null, '200 g', 260, 13, 36, 8, '🥘', false],
  ['Mixed Salad', 'Olive oil', '1 bowl', 165, 3, 9, 13, '🥗', false],
  ['Broccoli', null, '150 g', 51, 4, 8, 1, '🥦', false],
  ['Avocado', null, 'Half', 160, 2, 9, 15, '🥑', false],
  ['Almonds', null, '30 g', 174, 6, 6, 15, '🌰', true],
  ['Peanut Butter', null, '2 tbsp', 188, 8, 6, 16, '🥜', true],
  ['Olive Oil', null, '1 tbsp', 119, 0, 0, 14, '🫒', false],
  ['Cottage Cheese', null, '200 g', 196, 24, 8, 8, '🧀', false],
  ['Protein Bar', 'Grenade', '60 g bar', 214, 21, 17, 8, '🍫', true],
  ['Dark Chocolate', '85%', '20 g', 120, 2, 6, 10, '🍫', false],
  ['Cappuccino', 'Semi-skim', '1 cup', 74, 4, 6, 4, '☕', true],
  ['Orange Juice', null, '250 ml', 112, 2, 26, 0, '🍊', false],
  ['Sports Drink', null, '500 ml', 130, 0, 33, 0, '🧃', false],
  ['Beer', 'Lager', '1 pint', 208, 2, 17, 0, '🍺', false],
  ['Margherita Pizza', 'Takeaway', '2 slices', 540, 22, 62, 22, '🍕', false],
  ['Chicken Burrito', 'Takeaway', '1 regular', 720, 42, 72, 28, '🌯', false],
  ['Idli & Sambar', null, '3 idli', 275, 10, 52, 3, '🍲', false],
  ['Masala Dosa', null, '1 dosa', 387, 8, 58, 14, '🥞', false],
  ['Apple', null, '1 medium', 95, 0, 25, 0, '🍎', true],
  ['Cashews', null, '30 g', 165, 5, 9, 13, '🥜', false],
  ['Skyr', 'Arla', '150 g', 96, 17, 6, 0, '🥛', false],
];
const foods = foodSeeds.map(([name, brand, servingLabel, calories, protein, carbs, fat, emoji, frequent], i) => ({
  id: `f-${String(i + 1).padStart(3, '0')}`,
  name,
  ...(brand ? { brand } : {}),
  servingLabel,
  calories,
  protein,
  carbs,
  fat,
  emoji,
  frequent: !!frequent,
}));
write('foods.json', foods);

const breakfastPool = ['Greek Yogurt', 'Rolled Oats', 'Whole Eggs', 'Banana', 'Blueberries', 'Wholemeal Bread', 'Cappuccino', 'Idli & Sambar', 'Skyr'];
const lunchPool = ['Chicken Breast', 'Basmati Rice', 'Mixed Salad', 'Roti', 'Rajma Curry', 'Tinned Tuna', 'Sweet Potato', 'Broccoli', 'Chana Masala'];
const dinnerPool = ['Salmon Fillet', 'Lean Beef Mince', 'Wholewheat Pasta', 'Paneer', 'Tofu, Firm', 'Basmati Rice', 'Broccoli', 'Mixed Salad', 'Chicken Breast'];
const snackPool = ['Whey Protein', 'Almonds', 'Peanut Butter', 'Protein Bar', 'Apple', 'Dark Chocolate', 'Cottage Cheese', 'Cashews'];
const treatPool = ['Margherita Pizza', 'Chicken Burrito', 'Beer', 'Masala Dosa'];

const foodByName = Object.fromEntries(foods.map((f) => [f.name, f]));
const scale = (f, servings) => ({
  calories: Math.round(f.calories * servings),
  protein: Math.round(f.protein * servings),
  carbs: Math.round(f.carbs * servings),
  fat: Math.round(f.fat * servings),
});

let entryId = 0;
const buildDay = (clientId, date, targets, adherence) => {
  const entries = [];
  const slots = [
    ['breakfast', breakfastPool, 8, rint(2, 3)],
    ['lunch', lunchPool, 13, rint(2, 4)],
    ['dinner', dinnerPool, 20, rint(2, 4)],
    ['snack', snackPool, 16, rint(1, 3)],
  ];
  for (const [slot, pool, hour, count] of slots) {
    const used = new Set();
    for (let i = 0; i < count; i++) {
      let name = pick(pool);
      let guard = 0;
      while (used.has(name) && guard++ < 8) name = pick(pool);
      used.add(name);
      const f = foodByName[name];
      const servings = chance(0.25) ? 1.5 : chance(0.15) ? 0.5 : 1;
      entryId += 1;
      entries.push({
        id: `fe-${String(entryId).padStart(5, '0')}`,
        clientId,
        date,
        slot,
        foodId: f.id,
        name: f.name,
        servings,
        ...scale(f, servings),
        source: chance(0.22) ? 'ai' : chance(0.3) ? 'quick-add' : 'search',
        loggedAt: at(date, hour, rint(0, 55)),
      });
    }
  }
  // Weekend blow-outs keep the compliance signal realistic.
  if ((dow(date) === 5 || dow(date) === 6) && chance(0.45)) {
    const f = foodByName[pick(treatPool)];
    entryId += 1;
    entries.push({
      id: `fe-${String(entryId).padStart(5, '0')}`,
      clientId,
      date,
      slot: 'dinner',
      foodId: f.id,
      name: f.name,
      servings: 1,
      ...scale(f, 1),
      source: 'ai',
      loggedAt: at(date, 21, rint(0, 55)),
    });
  }

  const raw = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Nudge totals toward the target band implied by the client's adherence.
  const factor = (targets.calories * adherence) / Math.max(raw.calories, 1);
  const k = Math.min(1.45, Math.max(0.6, factor));
  const scaled = entries.map((e) => ({
    ...e,
    calories: Math.round(e.calories * k),
    protein: Math.round(e.protein * k),
    carbs: Math.round(e.carbs * k),
    fat: Math.round(e.fat * k),
  }));
  const consumed = scaled.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  return { date, clientId, targets, consumed, entries: scaled };
};

const adherenceFor = (status) =>
  status === 'green' ? rfloat(0.93, 1.05, 3) : status === 'yellow' ? rfloat(0.8, 1.18, 3) : rfloat(0.62, 1.32, 3);

const logDaysFor = (status) => (status === 'green' ? 0.96 : status === 'yellow' ? 0.72 : 0.38);

const nutritionDays = [];
for (const c of clients) {
  const isPrimary = c.id === 'c-001';
  const span = isPrimary ? 45 : 28;
  for (let i = span - 1; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    if (i > 0 && !chance(logDaysFor(c.compliance.status))) continue;
    const day = buildDay(c.id, date, c.targets, adherenceFor(c.compliance.status));
    if (i === 0) {
      // Today is partially logged — dinner still to come for the demo client.
      if (isPrimary) {
        day.entries = day.entries.filter((e) => e.slot !== 'dinner');
        day.consumed = day.entries.reduce(
          (acc, e) => ({
            calories: acc.calories + e.calories,
            protein: acc.protein + e.protein,
            carbs: acc.carbs + e.carbs,
            fat: acc.fat + e.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
      }
    }
    if (!isPrimary) day.entries = [];
    nutritionDays.push(day);
  }
}
write('nutritionLogs.json', nutritionDays);

/* --------------------------------------------------------------- programs */
const templates = {
  'Lower Body — Strength': { focus: 'legs', minutes: 65, items: [['Barbell Back Squat', 4, 5, 105], ['Romanian Deadlift', 3, 8, 90], ['Bulgarian Split Squat', 3, 10, 22], ['Leg Curl', 3, 12, 40], ['Hanging Leg Raise', 3, 12, 0]] },
  'Upper Body — Push': { focus: 'chest', minutes: 55, items: [['Barbell Bench Press', 4, 6, 82.5], ['Incline Dumbbell Press', 3, 10, 30], ['Overhead Press', 3, 8, 45], ['Lateral Raise', 3, 15, 10], ['Rope Pushdown', 3, 12, 27.5]] },
  'Upper Body — Pull': { focus: 'back', minutes: 55, items: [['Pull-up', 4, 8, 0], ['Barbell Row', 4, 8, 70], ['Seated Cable Row', 3, 12, 60], ['Face Pull', 3, 15, 22.5], ['Incline Dumbbell Curl', 3, 12, 14]] },
  'Full Body — Power': { focus: 'full body', minutes: 60, items: [['Conventional Deadlift', 4, 3, 140], ['Front Squat', 3, 6, 80], ['Weighted Dip', 3, 8, 15], ['Chest-Supported Row', 3, 10, 26], ['Farmer Carry', 3, 1, 32]] },
  'Conditioning & Core': { focus: 'conditioning', minutes: 35, items: [['Assault Bike Intervals', 6, 1, 0], ['Rowing Erg', 3, 1, 0], ['Cable Crunch', 3, 15, 35], ['Plank', 3, 1, 0]] },
};
const templateNames = Object.keys(templates);
const weeklyPlan = [
  'Lower Body — Strength',
  'Upper Body — Push',
  'Conditioning & Core',
  'Upper Body — Pull',
  'Full Body — Power',
  'Conditioning & Core',
  null,
];

let peId = 0;
const buildSession = (clientId, date, templateName, status) => {
  const t = templates[templateName];
  const exercisesOut = t.items.map(([name, sets, reps, weight]) => {
    const ex = exByName[name];
    peId += 1;
    return {
      id: `pe-${String(peId).padStart(5, '0')}`,
      exerciseId: ex.id,
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      sets: Array.from({ length: sets }, () => ({
        reps,
        targetWeightKg: weight > 0 ? weight : null,
      })),
    };
  });
  return {
    id: `ws-${clientId}-${date}`,
    clientId,
    title: templateName,
    scheduledFor: date,
    estimatedMinutes: t.minutes,
    focus: t.focus,
    exercises: exercisesOut,
    status,
  };
};

const sessions = [];
const workoutLogs = [];
let logId = 0;
let lsId = 0;
let leId = 0;

for (const c of clients) {
  const isPrimary = c.id === 'c-001';
  const span = isPrimary ? 56 : 28;
  const showRate = c.compliance.status === 'green' ? 0.92 : c.compliance.status === 'yellow' ? 0.68 : 0.35;
  for (let i = span - 1; i >= -6; i--) {
    const date = addDays(TODAY, -i);
    const planned = weeklyPlan[(dow(date) + 6) % 7];
    if (!planned) continue;
    const future = i < 0;
    const today = i === 0;
    const attended = !future && !today && chance(showRate);
    const status = future ? 'scheduled' : today ? 'scheduled' : attended ? 'completed' : 'missed';
    const session = buildSession(c.id, date, planned, status);
    if (isPrimary || future || today || attended) sessions.push(session);
    if (!attended) continue;

    // Progressive overload drift, plus session-to-session noise.
    const weeksIn = Math.floor((span - i) / 7);
    const drift = 1 + weeksIn * 0.012;
    let volume = 0;
    const loggedExercises = session.exercises.map((pe) => {
      leId += 1;
      const sets = pe.sets.map((s) => {
        lsId += 1;
        const w = s.targetWeightKg ? Number((s.targetWeightKg * drift * rfloat(0.96, 1.04, 3)).toFixed(1)) : 0;
        const reps = Math.max(1, s.reps + (chance(0.25) ? rint(-1, 2) : 0));
        volume += w * reps;
        return { id: `ls-${String(lsId).padStart(6, '0')}`, reps, weightKg: w, completed: true };
      });
      return {
        id: `le-${String(leId).padStart(5, '0')}`,
        exerciseId: pe.exerciseId,
        name: pe.name,
        muscleGroup: pe.muscleGroup,
        sets,
      };
    });

    logId += 1;
    workoutLogs.push({
      id: `wl-${String(logId).padStart(5, '0')}`,
      clientId: c.id,
      sessionId: session.id,
      title: session.title,
      date,
      durationMinutes: session.estimatedMinutes + rint(-10, 12),
      totalVolumeKg: Math.round(volume),
      ...(chance(0.3)
        ? { notes: pick(['Felt strong, bar speed good.', 'Left knee a bit cranky on the last set.', 'Short on sleep — grinder.', 'Added a set, felt easy today.', 'Gym was packed, rushed the finisher.']) }
        : {}),
      exercises: loggedExercises,
      completedAt: at(date, rint(6, 20), rint(0, 59)),
    });
  }
}
sessions.sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
workoutLogs.sort((a, b) => (a.date < b.date ? 1 : -1));
write('workoutSessions.json', sessions);
write('workoutLogs.json', workoutLogs);

/* ---------------------------------------------------------- body metrics */
const metrics = [];
let bmId = 0;
for (const c of clients) {
  const span = 90;
  const total = c.targetWeightKg - c.startWeightKg;
  let w = c.startWeightKg;
  for (let i = span - 1; i >= 0; i--) {
    const date = addDays(TODAY, -i);
    const progress = (span - 1 - i) / (span - 1);
    // Stall for c-004 and c-007 in the last three weeks — feeds the alert engine.
    const stalled = (c.id === 'c-004' || c.id === 'c-007') && i < 21;
    const effective = stalled ? 0.72 : 1;
    const trend = c.startWeightKg + total * progress * 0.62 * effective;
    w = Number((trend + rfloat(-0.45, 0.45, 2)).toFixed(1));
    if (i % 1 !== 0) continue;
    if (!chance(c.compliance.status === 'green' ? 0.85 : c.compliance.status === 'yellow' ? 0.6 : 0.4) && i !== 0) continue;
    bmId += 1;
    metrics.push({
      id: `bm-${String(bmId).padStart(5, '0')}`,
      clientId: c.id,
      date,
      weightKg: w,
    });
  }
}
write('bodyMetrics.json', metrics);

/* ------------------------------------------------------- progress photos */
const photos = [];
let phId = 0;
for (const c of clients) {
  const weeks = c.id === 'c-001' ? 8 : 4;
  for (let wk = weeks - 1; wk >= 0; wk--) {
    const date = addDays(TODAY, -wk * 14);
    for (const pose of ['front', 'side', 'back']) {
      phId += 1;
      const m = metrics.filter((x) => x.clientId === c.id && x.date <= date).slice(-1)[0];
      photos.push({
        id: `pp-${String(phId).padStart(5, '0')}`,
        clientId: c.id,
        date,
        pose,
        uri: `https://picsum.photos/seed/${c.id}-${date}-${pose}/600/800`,
        weightKg: m ? m.weightKg : c.startWeightKg,
      });
    }
  }
}
write('progressPhotos.json', photos);

/* ----------------------------------------------------------------- habits */
const habitSeeds = [
  ['Hit 2.5 L of water', 'water'],
  ['10,000 steps', 'walk'],
  ['7+ hours sleep', 'moon'],
  ['Protein at every meal', 'nutrition'],
  ['10 min mobility', 'body'],
  ['No screens after 10pm', 'phone-portrait'],
];
const habits = [];
let hId = 0;
for (const c of clients) {
  const count = c.id === 'c-001' ? 5 : 4;
  for (let i = 0; i < count; i++) {
    const [title, icon] = habitSeeds[i];
    hId += 1;
    const rate = c.compliance.status === 'green' ? 0.85 : c.compliance.status === 'yellow' ? 0.6 : 0.3;
    const completedDates = [];
    for (let day = 29; day >= 0; day--) {
      const date = addDays(TODAY, -day);
      // Leave today mostly open so the checklist is interactive on first run.
      if (day === 0 && i > 1) continue;
      if (chance(day === 0 ? 0.5 : rate)) completedDates.push(date);
    }
    habits.push({
      id: `h-${String(hId).padStart(4, '0')}`,
      clientId: c.id,
      title,
      icon,
      cadence: 'daily',
      completedDates,
      createdBy: i < 3 ? 'trainer' : 'client',
    });
  }
}
write('habits.json', habits);

/* --------------------------------------------------------------- messages */
const threads = [];
const messages = [];
let mId = 0;

const convoSeeds = {
  'c-001': [
    [-4, 9, 'trainer', 'Morning! Squat session today — keep bar speed crisp, stop 2 reps shy of failure.', null],
    [-4, 18, 'client', 'Done. Felt smooth, added 2.5kg on the top set.', { kind: 'workout' }],
    [-3, 8, 'trainer', 'Love that. Protein is drifting low on weekends though, have a look.', { kind: 'nutrition' }],
    [-3, 20, 'client', 'Fair. Ill front-load it Saturday.', null],
    [-1, 7, 'trainer', 'Check-in form is open — send it over before tonight?', null],
    [0, 8, 'trainer', 'Nice streak this week 👏 Keep dinner logged and youre golden.', null],
  ],
  'c-002': [
    [-6, 10, 'client', 'Struggling with the 1780 target, Im starving by 4pm.', null],
    [-6, 11, 'trainer', 'Lets move 200 kcal from breakfast to an afternoon snack. Try it for a week.', null],
    [-2, 19, 'client', 'Much better this week, thank you!', null],
    [0, 9, 'client', 'Quick one — can I swap Thursday to Friday?', null],
  ],
  'c-004': [
    [-9, 12, 'trainer', 'Havent seen a log since last Tuesday — everything okay?', null],
    [-2, 21, 'trainer', 'Checking in again. Even a rough estimate of meals helps me help you.', null],
    [0, 7, 'trainer', 'Ive dropped your sessions to 3 a week to make it easier to stick to.', null],
  ],
  'c-005': [
    [-3, 20, 'client', 'That was brutal — barely finished the carries.', { kind: 'workout' }],
    [-3, 21, 'trainer', 'Third hard session in a row. Deloading you next week.', null],
    [0, 6, 'client', 'Sounds good. Legs still cooked today.', null],
  ],
  'c-007': [
    [-5, 15, 'trainer', 'Weight has been flat for 3 weeks. Lets audit portions together.', null],
    [0, 10, 'trainer', 'Booked you in for a call Thursday 6pm.', null],
  ],
};

for (const c of clients) {
  const convo = convoSeeds[c.id] ?? [
    [-4, 9, 'trainer', 'Programme for the week is up — same structure, small jump on the main lifts.', null],
    [-4, 18, 'client', 'Got it, thanks!', null],
    [-1, 8, 'trainer', 'Solid week. Keep it rolling.', null],
  ];
  const threadId = `th-${c.id}`;
  let last = null;
  let unreadTrainer = 0;
  let unreadClient = 0;
  convo.forEach(([dayOffset, hour, who, body, attachment], idx) => {
    const date = addDays(TODAY, dayOffset);
    mId += 1;
    const senderId = who === 'trainer' ? trainer.id : c.id;
    const isRecent = dayOffset >= -1;
    const read = !isRecent || idx < convo.length - 1;
    if (!read && who === 'client') unreadTrainer += 1;
    if (!read && who === 'trainer') unreadClient += 1;
    let att;
    if (attachment?.kind === 'workout') {
      const log = workoutLogs.find((l) => l.clientId === c.id);
      if (log) att = { kind: 'workout', logId: log.id };
    } else if (attachment?.kind === 'nutrition') {
      att = { kind: 'nutrition', date: addDays(TODAY, -4) };
    }
    const msg = {
      id: `m-${String(mId).padStart(5, '0')}`,
      threadId,
      senderId,
      body,
      sentAt: at(date, hour, rint(0, 59)),
      readAt: read ? at(date, hour + 1, rint(0, 59)) : null,
      ...(att ? { attachment: att } : {}),
    };
    messages.push(msg);
    last = msg;
  });
  threads.push({
    id: threadId,
    clientId: c.id,
    trainerId: trainer.id,
    lastMessagePreview: last.body,
    lastMessageAt: last.sentAt,
    unreadForTrainer: unreadTrainer,
    unreadForClient: unreadClient,
  });
}
threads.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));
write('threads.json', threads);
write('messages.json', messages);

/* ----------------------------------------------------------------- alerts */
const alerts = [];
let aId = 0;
const addAlert = (clientId, kind, severity, title, detail, daysAgo) => {
  aId += 1;
  alerts.push({
    id: `al-${String(aId).padStart(4, '0')}`,
    clientId,
    kind,
    severity,
    title,
    detail,
    raisedAt: at(addDays(TODAY, -daysAgo), rint(6, 9), rint(0, 59)),
    resolved: false,
  });
};

addAlert('c-004', 'missed-logs', 'critical', 'No food logged in 4 days', 'Last entry Aug 25. Streak broken after 11 days.', 0);
addAlert('c-004', 'weight-stall', 'warning', 'Weight flat for 3 weeks', 'Trailing 21-day average moved 0.2 kg against a 0.5 kg/wk target.', 1);
addAlert('c-007', 'weight-stall', 'critical', 'Weight stalled, 3 sessions missed', 'Adherence dropped to 41% this week.', 0);
addAlert('c-007', 'calorie-deficit-miss', 'warning', 'Averaging 480 kcal over target', 'Weekend intake is driving the surplus.', 2);
addAlert('c-002', 'check-in-due', 'info', 'Check-in submitted, awaiting review', 'Week of Aug 24 — 6 days since last review.', 0);
addAlert('c-005', 'check-in-due', 'info', 'Check-in due tomorrow', 'Auto-reminder already sent.', 0);
write('alerts.json', alerts);

/* --------------------------------------------------------------- checkins */
const checkIns = [];
let ciId = 0;
for (const c of clients) {
  for (let wk = 0; wk < 3; wk++) {
    const weekOf = addDays(TODAY, -(dow(TODAY) === 0 ? 6 : dow(TODAY) - 1) - wk * 7);
    const cLogs = workoutLogs.filter((l) => l.clientId === c.id && l.date >= weekOf && l.date < addDays(weekOf, 7));
    const cDays = nutritionDays.filter((n) => n.clientId === c.id && n.date >= weekOf && n.date < addDays(weekOf, 7));
    const avgCalories = cDays.length
      ? Math.round(cDays.reduce((s, n) => s + n.consumed.calories, 0) / cDays.length)
      : 0;
    const wStart = metrics.filter((m) => m.clientId === c.id && m.date <= weekOf).slice(-1)[0];
    const wEnd = metrics.filter((m) => m.clientId === c.id && m.date < addDays(weekOf, 7)).slice(-1)[0];
    ciId += 1;
    checkIns.push({
      id: `ci-${String(ciId).padStart(4, '0')}`,
      clientId: c.id,
      weekOf,
      submittedAt: at(addDays(weekOf, 6), 19, rint(0, 59)),
      status: wk === 0 && ['c-002', 'c-003', 'c-006', 'c-008'].includes(c.id) ? 'pending' : 'reviewed',
      weightChangeKg: wStart && wEnd ? Number((wEnd.weightKg - wStart.weightKg).toFixed(1)) : 0,
      avgCalories,
      targetCalories: c.targets.calories,
      sessionsCompleted: cLogs.length,
      sessionsPlanned: 5,
      clientNote: pick([
        'Solid week, sleep was the weak link.',
        'Travel Wednesday and Thursday made food tricky.',
        'Energy much better since moving carbs pre-session.',
        'Shoulder felt fine all week — no niggles.',
        'Struggled on the weekend, back on it Monday.',
      ]),
    });
  }
}
checkIns.sort((a, b) => (a.weekOf < b.weekOf ? 1 : -1));
write('checkIns.json', checkIns);

/* ----------------------------------------------------- AI parse fixtures */
write('aiSuggestions.json', [
  {
    id: 'ai-001',
    transcript: 'two scrambled eggs on sourdough with half an avocado and a flat white',
    confidence: 0.94,
    items: [
      { name: 'Whole Eggs', servings: 1, servingLabel: '2 large', calories: 143, protein: 13, carbs: 1, fat: 10, emoji: '🥚' },
      { name: 'Wholemeal Bread', servings: 1, servingLabel: '2 slices', calories: 190, protein: 8, carbs: 32, fat: 3, emoji: '🍞' },
      { name: 'Avocado', servings: 1, servingLabel: 'Half', calories: 160, protein: 2, carbs: 9, fat: 15, emoji: '🥑' },
      { name: 'Cappuccino', servings: 1, servingLabel: '1 cup', calories: 74, protein: 4, carbs: 6, fat: 4, emoji: '☕' },
    ],
  },
  {
    id: 'ai-002',
    transcript: 'chicken burrito bowl with extra rice and a diet coke',
    confidence: 0.88,
    items: [
      { name: 'Chicken Breast', servings: 1, servingLabel: '150 g cooked', calories: 248, protein: 46, carbs: 0, fat: 5, emoji: '🍗' },
      { name: 'Basmati Rice', servings: 1.5, servingLabel: '270 g cooked', calories: 351, protein: 8, carbs: 77, fat: 2, emoji: '🍚' },
      { name: 'Mixed Salad', servings: 1, servingLabel: '1 bowl', calories: 165, protein: 3, carbs: 9, fat: 13, emoji: '🥗' },
    ],
  },
  {
    id: 'ai-003',
    transcript: 'protein shake and a handful of almonds after the gym',
    confidence: 0.97,
    items: [
      { name: 'Whey Protein', servings: 1, servingLabel: '1 scoop', calories: 120, protein: 24, carbs: 3, fat: 1, emoji: '🥤' },
      { name: 'Almonds', servings: 1, servingLabel: '30 g', calories: 174, protein: 6, carbs: 6, fat: 15, emoji: '🌰' },
    ],
  },
]);

console.log(
  JSON.stringify(
    {
      clients: clients.length,
      nutritionDays: nutritionDays.length,
      sessions: sessions.length,
      workoutLogs: workoutLogs.length,
      metrics: metrics.length,
      photos: photos.length,
      habits: habits.length,
      messages: messages.length,
      alerts: alerts.length,
      checkIns: checkIns.length,
    },
    null,
    2
  )
);
