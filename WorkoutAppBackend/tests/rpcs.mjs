/**
 * Exercises every write RPC against the live project and asserts the rows and
 * denormalised counters that come back, then undoes everything it did so the
 * seeded fixtures stay pristine (seed/verify.mjs is run afterwards to prove it).
 *
 *   NODE_USE_ENV_PROXY=1 SUPABASE_URL=... SUPABASE_KEY=... node test-rpcs.mjs
 */
import assert from 'node:assert/strict';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

let pass = 0;
const failures = [];
function check(name, fn) {
  try { fn(); pass++; console.log(`  ok   ${name}`); }
  catch (e) { failures.push(name); console.log(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); }
}

async function rpc(name, args = {}) {
  const res = await fetch(`${URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: H, body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) { const e = new Error(`${name} -> ${res.status}: ${text}`); e.status = res.status; throw e; }
  return text ? JSON.parse(text) : null;
}
async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { headers: H, ...init });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}
/** Asserts an RPC rejects, and with which status. */
async function rejects(name, args, status, label) {
  try { await rpc(name, args); failures.push(label); console.log(`  FAIL ${label}\n       expected ${status}, resolved`); }
  catch (e) {
    if (e.status === status) { pass++; console.log(`  ok   ${label}`); }
    else { failures.push(label); console.log(`  FAIL ${label}\n       expected ${status}, got ${e.status}`); }
  }
}

const day = (weekday, focus, exerciseId, name, muscleGroup, sets, notes) => ({
  weekday, focus, name: notes ?? null,
  exercises: [{ exerciseId, name, muscleGroup, sets, repMin: 8, repMax: 12, restSeconds: 90, targetRpe: 8 }],
});

const created = { routines: [], logs: [], alerts: [], entries: [], days: [] };

console.log('\n— routines —');

const routine = await rpc('create_routine', {
  p_input: {
    title: '  RPC Test Split  ',
    notes: 'scratch',
    days: [
      day('wed', 'back', 'e-013', 'Pull-up', 'back', 3),
      day('mon', 'chest', 'e-009', 'Barbell Bench Press', 'chest', 4, 'Push'),
    ],
    assignedClientIds: ['c-001', 'c-002', 'c-002'],
  },
});
created.routines.push(routine.id);

check('title is trimmed', () => assert.equal(routine.title, 'RPC Test Split'));
check('days come back Monday-first', () =>
  assert.deepEqual(routine.days.map((d) => d.weekday), ['mon', 'wed']));
check('day and exercise ids are minted', () => {
  assert.match(routine.days[0].id, /^rd-\d+$/);
  assert.match(routine.days[0].exercises[0].id, /^rx-\d+$/);
});
check('duplicate client id does not duplicate the assignment', () =>
  assert.deepEqual([...routine.assignedClientIds].sort(), ['c-001', 'c-002']));
check('optional keys are absent, not null', () =>
  assert.equal('notes' in routine.days[0].exercises[0], false));

await rejects('create_routine', { p_input: { title: 'x', days: [] } }, 400, 'empty days rejected');
await rejects('create_routine', { p_input: { title: '   ', days: [day('mon','chest','e-009','x','chest',3)] } }, 400, 'blank title rejected');
await rejects('create_routine', {
  p_input: { title: 'x', days: [day('mon','chest','e-009','x','chest',3), day('mon','back','e-013','y','back',3)] },
}, 400, 'two days on one weekday rejected');
await rejects('create_routine', {
  p_input: { title: 'x', days: [{ weekday: 'mon', focus: 'chest', exercises: [] }] },
}, 400, 'day with no exercises rejected');
await rejects('create_routine', {
  p_input: { title: 'x', days: [day('mon','chest','e-009','x','chest',3)], assignedClientIds: ['c-999'] },
}, 404, 'unknown client rejected');

const patched = await rpc('update_routine', { p_id: routine.id, p_patch: { title: 'Renamed' } });
check('patching title leaves days and notes alone', () => {
  assert.equal(patched.title, 'Renamed');
  assert.equal(patched.notes, 'scratch');
  assert.deepEqual(patched.days.map((d) => d.id), routine.days.map((d) => d.id));
});

console.log('\n— copy-on-write —');

const assignment = await rpc('create_assignment', { p_routine_id: routine.id, p_client_id: 'c-001' });
const again = await rpc('create_assignment', { p_routine_id: routine.id, p_client_id: 'c-001' });
check('re-assigning an existing pairing returns the same row', () =>
  assert.equal(again.assignmentId, assignment.assignmentId));
check('an untouched assignment reads the template', () => {
  assert.equal(assignment.customised, false);
  assert.deepEqual(assignment.days.map((d) => d.weekday), ['mon', 'wed']);
});

const customised = await rpc('customise_assignment', {
  p_id: assignment.assignmentId,
  p_days: [day('fri', 'legs', 'e-001', 'Barbell Back Squat', 'legs', 5)],
});
check('customising forks the client off the template', () => {
  assert.equal(customised.customised, true);
  assert.deepEqual(customised.days.map((d) => d.weekday), ['fri']);
  assert.match(customised.days[0].id, /^ad-\d+$/);
});

// The invariant the whole copy-on-write design exists for.
await rpc('update_routine', {
  p_id: routine.id,
  p_patch: { days: [day('tue', 'arms', 'e-022', 'Barbell Curl', 'arms', 4)] },
});
const afterTemplateEdit = await rpc('assigned_routine_json', { p_id: assignment.assignmentId });
check('editing the template does not reach a customised client', () =>
  assert.deepEqual(afterTemplateEdit.days.map((d) => d.weekday), ['fri']));

const otherAssignmentId = (await rest(
  `routine_assignments?routine_id=eq.${routine.id}&client_id=eq.c-002&select=id`))[0].id;
const followerAfterEdit = await rpc('assigned_routine_json', { p_id: otherAssignmentId });
check('editing the template does reach a follower', () =>
  assert.deepEqual(followerAfterEdit.days.map((d) => d.weekday), ['tue']));

const reset = await rpc('reset_assignment', { p_id: assignment.assignmentId });
check('reset drops the snapshot and follows the template again', () => {
  assert.equal(reset.customised, false);
  assert.deepEqual(reset.days.map((d) => d.weekday), ['tue']);
});
const orphanDays = await rest(`routine_assignment_days?assignment_id=eq.${assignment.assignmentId}&select=id`);
check('no orphaned snapshot days remain', () => assert.equal(orphanDays.length, 0));

const reassigned = await rpc('assign_routine', { p_id: routine.id, p_client_ids: ['c-002', 'c-003'] });
check('assign_routine sets the list exactly', () =>
  assert.deepEqual([...reassigned.assignedClientIds].sort(), ['c-002', 'c-003']));
const dropped = await rest(`routine_assignments?routine_id=eq.${routine.id}&client_id=eq.c-001&select=id`);
check('unticked client is unassigned', () => assert.equal(dropped.length, 0));
await rejects('assign_routine', { p_id: routine.id, p_client_ids: ['c-999'] }, 404, 'assign to unknown client rejected');
await rejects('customise_assignment', { p_id: 'ra-9999', p_days: [day('mon','chest','e-009','x','chest',3)] }, 404, 'customise unknown assignment rejected');

const copy = await rpc('duplicate_routine', { p_id: routine.id });
created.routines.push(copy.id);
check('a duplicate is unassigned and re-minted', () => {
  assert.equal(copy.title, 'Renamed (copy)');
  assert.deepEqual(copy.assignedClientIds, []);
  assert.notEqual(copy.days[0].id, reassigned.days[0].id);
  assert.deepEqual(copy.days.map((d) => d.weekday), reassigned.days.map((d) => d.weekday));
});

console.log('\n— workout logs —');

const sessionBefore = (await rest('workout_sessions?id=eq.ws-c-001-2026-07-06&select=status'))[0].status;
const alertsBefore = (await rest('red_flag_alerts?select=id')).length;

const log = await rpc('create_workout_log', {
  p_input: {
    clientId: 'c-001', sessionId: 'ws-c-001-2026-07-06', title: 'RPC Test Session',
    date: '2026-08-30', durationMinutes: 61, rpe: 9.5, totalVolumeKg: 4200,
    exercises: [{
      exerciseId: 'e-001', name: 'Barbell Back Squat', muscleGroup: 'legs',
      sets: [{ reps: 5, weightKg: 100, completed: true }, { reps: 5, weightKg: 102.5, completed: false }],
    }],
  },
});
created.logs.push(log.id);

check('the log round-trips with its nested sets', () => {
  assert.equal(log.exercises.length, 1);
  assert.deepEqual(log.exercises[0].sets.map((s) => s.weightKg), [100, 102.5]);
  assert.equal(log.exercises[0].sets[1].completed, false);
});
check('set order is preserved', () =>
  assert.deepEqual(log.exercises[0].sets.map((s) => s.reps), [5, 5]));

const sessionAfter = (await rest('workout_sessions?id=eq.ws-c-001-2026-07-06&select=status'))[0].status;
check('the source session is marked completed', () => assert.equal(sessionAfter, 'completed'));

const newAlerts = await rest('red_flag_alerts?kind=eq.high-rpe&order=raised_at.desc&limit=1&select=id,title,client_id');
check('RPE 9+ raises a strain alert', () => {
  assert.equal(newAlerts.length, 1);
  assert.equal(newAlerts[0].title, 'RPE 9.5 on RPC Test Session');
  assert.equal(newAlerts[0].client_id, 'c-001');
});
const alertsAfter = (await rest('red_flag_alerts?select=id')).length;
check('exactly one alert was added', () => assert.equal(alertsAfter, alertsBefore + 1));
created.alerts.push(newAlerts[0].id);

await rejects('create_workout_log', { p_input: { clientId: 'c-999', title: 'x', date: '2026-08-30', durationMinutes: 1, rpe: 5 } }, 404, 'log for unknown client rejected');

console.log('\n— nutrition —');

const freshDate = '2026-08-31';
const fresh = await rpc('get_or_create_nutrition_day', { p_client_id: 'c-003', p_date: freshDate });
created.days.push(['c-003', freshDate]);
check('a missing day is created with the client\'s current targets', () => {
  assert.equal(fresh.targets.calories, 3200);
  assert.deepEqual(fresh.entries, []);
  assert.equal(fresh.consumed.calories, 0);
});

const withFood = await rpc('add_food_entries', {
  p_entries: [
    { clientId: 'c-003', date: freshDate, slot: 'breakfast', foodId: 'f-003', name: 'Whole Eggs',
      servings: 2, calories: 286, protein: 26, carbs: 2, fat: 20, source: 'search' },
    { clientId: 'c-003', date: freshDate, slot: 'breakfast', foodId: 'f-002', name: 'Rolled Oats',
      servings: 1, calories: 228, protein: 8, carbs: 40, fat: 4, source: 'ai' },
  ],
});
created.entries.push(...withFood.entries.map((e) => e.id));
check('consumed is recomputed by trigger, not trusted from the client', () => {
  assert.equal(withFood.consumed.calories, 514);
  assert.equal(withFood.consumed.protein, 34);
  assert.equal(withFood.entries.length, 2);
});
check('entry ids are minted', () => assert.match(withFood.entries[0].id, /^fe-\d+$/));

const afterDelete = await rpc('delete_food_entry', { p_id: withFood.entries[0].id });
check('deleting an entry recomputes consumed downward', () => {
  assert.equal(afterDelete.entries.length, 1);
  assert.equal(afterDelete.consumed.calories, 514 - withFood.entries[0].calories);
});
await rejects('delete_food_entry', { p_id: 'fe-99999' }, 404, 'deleting a missing entry rejected');

console.log('\n— habits —');

const habitId = 'h-0001';
const habitBefore = await rpc('habit_json', { p_id: habitId });
const toggledOn = await rpc('toggle_habit', { p_id: habitId, p_date: '2026-08-31' });
check('toggling on adds the date', () =>
  assert.equal(toggledOn.completedDates.length, habitBefore.completedDates.length + 1));
const toggledOff = await rpc('toggle_habit', { p_id: habitId, p_date: '2026-08-31' });
check('toggling off removes it again', () =>
  assert.deepEqual(toggledOff.completedDates, habitBefore.completedDates));
await rejects('toggle_habit', { p_id: 'h-9999', p_date: '2026-08-31' }, 404, 'toggling an unknown habit rejected');

console.log('\n— messaging —');

const threadId = 'th-c-003';
const threadBefore = (await rest(`threads?id=eq.${threadId}&select=*`))[0];
const unreadBefore = await rest(`messages?thread_id=eq.${threadId}&read_at=is.null&select=id`);

const sent = (await rest('messages', {
  method: 'POST',
  headers: { ...H, Prefer: 'return=representation' },
  body: JSON.stringify({ thread_id: threadId, sender_id: 'c-003', body: 'RPC test message' }),
}))[0];
check('a plain insert mints its own id', () => assert.match(sent.id, /^m-\d+$/));

const threadAfterSend = (await rest(`threads?id=eq.${threadId}&select=*`))[0];
check('sending bumps the recipient, not the sender', () => {
  assert.equal(threadAfterSend.unread_for_trainer, threadBefore.unread_for_trainer + 1);
  assert.equal(threadAfterSend.unread_for_client, threadBefore.unread_for_client);
});
check('sending denormalises the preview', () =>
  assert.equal(threadAfterSend.last_message_preview, 'RPC test message'));

const readThread = await rpc('mark_thread_read', { p_thread_id: threadId, p_as: 'trainer' });
check('marking read zeroes only that side', () => {
  assert.equal(readThread.unreadForTrainer, 0);
  assert.equal(readThread.unreadForClient, threadBefore.unread_for_client);
});
const stillUnread = await rest(`messages?thread_id=eq.${threadId}&read_at=is.null&sender_id=neq.t-001&select=id`);
check('marking read stamps read_at on the other side\'s messages', () =>
  assert.equal(stillUnread.length, 0));
await rejects('mark_thread_read', { p_thread_id: 'th-nope', p_as: 'trainer' }, 404, 'unknown thread rejected');
await rejects('mark_thread_read', { p_thread_id: threadId, p_as: 'nobody' }, 400, 'unknown reader rejected');

console.log('\n— cleanup —');

for (const id of created.routines) await rest(`routines?id=eq.${id}`, { method: 'DELETE' });
for (const id of created.logs) await rest(`workout_logs?id=eq.${id}`, { method: 'DELETE' });
for (const id of created.alerts) await rest(`red_flag_alerts?id=eq.${id}`, { method: 'DELETE' });
for (const [c, d] of created.days) await rest(`nutrition_days?client_id=eq.${c}&date=eq.${d}`, { method: 'DELETE' });
await rest(`messages?id=eq.${sent.id}`, { method: 'DELETE' });
await rest(`workout_sessions?id=eq.ws-c-001-2026-07-06`, {
  method: 'PATCH', body: JSON.stringify({ status: sessionBefore }),
});
// Restore the thread exactly: counters, preview, and the read_at values the
// mark-as-read call consumed.
await rest(`threads?id=eq.${threadId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    unread_for_trainer: threadBefore.unread_for_trainer,
    unread_for_client: threadBefore.unread_for_client,
    last_message_preview: threadBefore.last_message_preview,
    last_message_at: threadBefore.last_message_at,
  }),
});
for (const m of unreadBefore) {
  await rest(`messages?id=eq.${m.id}`, { method: 'PATCH', body: JSON.stringify({ read_at: null }) });
}
// The preview trigger fires on those updates, so restore the thread last.
await rest(`threads?id=eq.${threadId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    last_message_preview: threadBefore.last_message_preview,
    last_message_at: threadBefore.last_message_at,
    unread_for_trainer: threadBefore.unread_for_trainer,
    unread_for_client: threadBefore.unread_for_client,
  }),
});
console.log('  cleaned up');

console.log(`\n${pass} assertions passed, ${failures.length} failed`);
if (failures.length) { for (const f of failures) console.log(`  - ${f}`); process.exit(1); }
