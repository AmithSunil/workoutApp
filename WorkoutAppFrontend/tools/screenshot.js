/* eslint-disable */
/**
 * Smoke test + visual capture.
 *
 * Serves the exported web build (see tools/serve.js) and drives both role shells
 * the way a user would, failing on any console error or uncaught exception.
 * Screenshots land in ./shots.
 *
 *   node tools/serve.js /tmp/webbuild 8099 &
 *   node tools/screenshot.js
 */
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8099';
const OUT = path.join(__dirname, '..', 'shots');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const IGNORE = [
  /Download the React DevTools/i,
  /pravatar|picsum/i, // remote demo avatars/photos are unreachable in the sandbox
  /Failed to load resource/i,
  /net::ERR/i,
];

/**
 * Resolve a Chromium binary. CHROME_PATH wins; otherwise fall back to the
 * locations Playwright and a normal Chrome install use, so this runs on a dev
 * machine as well as in CI.
 */
const findChrome = () => {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c;
    } catch {}
  }
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (root && fs.existsSync(root)) {
    for (const dir of fs.readdirSync(root)) {
      if (!dir.startsWith('chromium-')) continue;
      const bin = path.join(root, dir, 'chrome-linux', 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  }
  return null;
};

(async () => {
  const executablePath = findChrome();
  if (!executablePath) {
    console.log('\nNo Chromium binary found — set CHROME_PATH to run the walkthrough. Skipping.');
    process.exit(0);
  }

  const browser = await chromium.launch({
    executablePath,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  /** Each role runs in its own context so persisted sessions never leak. */
  let page;
  const freshSession = async (startPath = '/') => {
    if (page) await page.context().close();
    const context = await browser.newContext({
      viewport: { width: 402, height: 874 },
      deviceScaleFactor: 2,
    });
    page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      if (IGNORE.some((r) => r.test(text))) return;
      errors.push(`[console] ${text}`);
    });
    page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
    await page.goto(BASE + startPath, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2200);
  };

  let n = 0;
  const shot = async (name) => {
    await page.waitForTimeout(1500);
    n += 1;
    await page.screenshot({ path: path.join(OUT, `${String(n).padStart(2, '0')}-${name}.png`) });
    console.log('  ✓', name, '·', page.url().replace(BASE, '') || '/');
  };

  /** Scoped to the visible screen — inactive tab screens stay mounted on web. */
  const click = async (locator, label) => {
    await locator.locator('visible=true').last().click({ timeout: 15000 });
    await page.waitForTimeout(900);
    console.log('  → clicked', label);
  };

  const go = async (route) => {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
  };

  console.log('\nROLE GATE');
  await freshSession();
  await shot('role-select');

  console.log('\nCLIENT');
  await click(page.getByText('Aditya Rao'), 'sign in as Aditya Rao');
  await shot('client-explore');

  await click(page.getByLabel('Log', { exact: true }), 'Log tab');
  await shot('client-nutrition-log');

  await click(page.getByLabel('Add to Breakfast'), 'add to breakfast');
  await shot('client-food-picker');
  await click(page.getByText('✨ Describe it'), 'AI tab');
  await click(page.getByText('protein shake and almonds'), 'AI example');
  await click(page.getByText('Parse with AI'), 'parse');
  await shot('client-ai-confirmation');

  await click(page.getByLabel('Workouts', { exact: true }), 'Workouts tab');
  await shot('client-workouts');

  await click(page.getByText('Start session'), 'start session');
  await shot('client-active-session');
  await page.mouse.wheel(0, 2600);
  await shot('client-rpe-slider');

  await click(page.getByLabel('Go back'), 'back');
  await click(page.getByLabel('Progress', { exact: true }), 'Progress tab');
  await shot('client-progress');

  await click(page.getByLabel('Message coach'), 'chat FAB');
  await shot('client-chat');

  console.log('\nTRAINER');
  await freshSession();
  await click(page.getByText('Maya Fernandes'), 'sign in as trainer');
  await shot('trainer-triage');
  await page.mouse.wheel(0, 1000);
  await shot('trainer-alerts');
  await page.mouse.wheel(0, 1400);
  await shot('trainer-checkins');

  await click(page.getByLabel('Clients', { exact: true }), 'Clients tab');
  await shot('trainer-roster');

  console.log('\nROUTINES');
  await click(page.getByLabel('Routines', { exact: true }), 'Routines tab');
  await shot('trainer-routines-empty');

  await click(page.getByText('Build your first routine'), 'new routine');
  await page.getByLabel('Routine name').locator('visible=true').last().fill('Beginner Skinny');

  // A four-day week: Monday starts as the only training day, the rest are
  // added by tapping rest days in the strip.
  await click(page.getByText('Add exercises'), 'open picker for Monday');
  await shot('trainer-exercise-picker');
  await click(page.getByLabel('Add Barbell Bench Press'), 'add bench press');
  await click(page.getByLabel('Add Overhead Press'), 'add overhead press');
  await click(page.getByText('Done', { exact: true }), 'close picker');

  await click(page.getByLabel('Add a training day on Wednesday'), 'add Wednesday');
  await click(page.getByText('Add exercises'), 'open picker for Wednesday');
  await click(page.getByLabel('Add Barbell Back Squat'), 'add back squat');
  await click(page.getByLabel('Add Romanian Deadlift'), 'add RDL');
  await click(page.getByText('Done', { exact: true }), 'close picker');

  await click(page.getByLabel('Add a training day on Friday'), 'add Friday');
  await click(page.getByText('Add exercises'), 'open picker for Friday');
  await click(page.getByLabel('Add Pull-up'), 'add pull-up');
  await click(page.getByText('Done', { exact: true }), 'close picker');

  await click(page.getByLabel('Add a training day on Saturday'), 'add Saturday');
  await click(page.getByText('Add exercises'), 'open picker for Saturday');
  await click(page.getByLabel('Add Plank'), 'add plank');
  await click(page.getByText('Done', { exact: true }), 'close picker');
  await shot('trainer-routine-builder');

  // Exercise the prescription steppers — sets, rest and target RPE all clamp.
  await click(page.getByLabel('Increase Sets for Plank'), 'sets +1');
  await click(page.getByLabel('Increase Rest for Plank'), 'rest +15s');
  await click(page.getByLabel('Increase Target RPE for Plank'), 'RPE +1');
  await shot('trainer-routine-prescription');

  await click(page.getByText('Save routine'), 'save routine');
  await shot('trainer-routine-detail');
  await click(page.getByLabel('Wednesday training day'), 'switch to Wednesday');
  await shot('trainer-routine-wednesday');

  await click(page.getByText('Assign to clients'), 'open assign sheet');
  await shot('trainer-assign-sheet');
  await click(page.getByLabel('Assign to Priya Nair'), 'tick Priya Nair');
  await click(page.getByText('Save assignment'), 'save assignment');
  await shot('trainer-routine-assigned');

  // In-app navigation from here on, never page.goto: a reload reseeds the
  // in-memory mock db and would throw away the routine we just created.
  console.log('\nPER-CLIENT CUSTOMISATION');
  await click(page.getByText('Open', { exact: true }), "open Priya's copy");
  await shot('trainer-assignment');

  await click(page.getByText('Customise', { exact: true }), 'start customising');
  await shot('trainer-assignment-editing');
  await click(page.getByLabel('Decrease Sets for Barbell Bench Press'), 'drop a set for her');
  await click(page.getByLabel('Decrease Target RPE for Barbell Bench Press'), 'ease the RPE');
  await click(page.getByText('Save for this client'), 'save customisation');
  await shot('trainer-assignment-customised');

  await click(page.getByLabel('Go back'), 'back to the template');
  await shot('trainer-routine-after-customise');
  await click(page.getByLabel('Go back'), 'back to the library');
  await shot('trainer-routine-library');

  console.log('\nASSIGN FROM A CLIENT PROFILE');
  await click(page.getByLabel('Clients', { exact: true }), 'Clients tab');
  await click(page.getByText('Leah Mercer'), 'open Leah Mercer');
  await click(page.getByText('Plan', { exact: true }), 'plan tab');
  await shot('trainer-client-plan-empty');
  await click(page.getByText('Assign a routine'), 'open routine picker');
  await shot('trainer-routine-picker');
  await click(page.getByLabel('Assign Beginner Skinny'), 'assign to Leah');
  await shot('trainer-assignment-from-profile');
  await click(page.getByLabel('Go back'), 'back to Leah');
  await shot('trainer-client-plan-assigned');

  await go('/client/c-004');
  await shot('trainer-client-metrics');
  await click(page.getByText('Nutrition', { exact: true }), 'nutrition tab');
  await shot('trainer-client-nutrition');
  await click(page.getByText('Workouts', { exact: true }), 'workouts tab');
  await shot('trainer-client-workouts');
  await click(page.getByText('Plan', { exact: true }), 'plan tab');
  await shot('trainer-client-plan');

  await go('/messages');
  await shot('trainer-messages');

  await go('/thread/th-c-005');
  await shot('trainer-thread');
  await click(page.getByLabel('Attach a log'), 'attach a log');
  await shot('trainer-attach-picker');

  await go('/workout-log/wl-00001');
  await shot('workout-log-detail');

  await browser.close();

  if (errors.length) {
    console.error('\n--- RUNTIME ERRORS ---');
    for (const e of [...new Set(errors)]) console.error(e);
    process.exit(1);
  }
  console.log('\n✓ No runtime errors across', n, 'captures.');
})().catch((err) => {
  console.error('\nFAILED:', err.message.split('\n')[0]);
  process.exit(1);
});
