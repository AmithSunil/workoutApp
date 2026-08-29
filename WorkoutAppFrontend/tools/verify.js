/* eslint-disable */
/**
 * Full verification pass. Cross-platform (spawns everything through Node, so it
 * works the same on Windows, macOS and Linux).
 *
 *   node tools/verify.js
 *
 * 1. Typecheck.
 * 2. Bundle for NATIVE (android). This step exists because Metro's web target
 *    shims Node builtins that native does not — a web-only check will happily
 *    pass on a missing `buffer`/`stream` dependency that crashes on device.
 * 3. Bundle for web, serve it, and drive both role shells in a headless
 *    browser, failing on any console error or uncaught exception.
 *
 * Step 3 is skipped automatically when playwright-core isn't installed, so the
 * typecheck + native bundle still run everywhere.
 */
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NPX = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const step = (label) => console.log(`\n\x1b[1m▸ ${label}\x1b[0m`);

const run = (cmd, args, label) => {
  step(label);
  const res = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' },
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) {
    console.error(`\n\x1b[31m✗ ${label} failed\x1b[0m`);
    process.exit(res.status ?? 1);
  }
};

run(NPX, ['tsc', '--noEmit'], 'Typecheck');

run(
  NPX,
  ['expo', 'export', '--platform', 'android', '--output-dir', '.verify-native', '--clear'],
  'Native bundle (catches Node-builtin imports web silently shims)'
);

const hasPlaywright = (() => {
  try {
    require.resolve('playwright-core');
    return true;
  } catch {
    return false;
  }
})();

if (!hasPlaywright) {
  console.log(
    '\n\x1b[33m⚠ playwright-core not installed — skipping the browser walkthrough.\x1b[0m' +
      '\n  Install it with `npm i -D playwright-core` to run the full pass.'
  );
  console.log('\n\x1b[32m✓ Typecheck and native bundle passed.\x1b[0m');
  process.exit(0);
}

run(
  NPX,
  ['expo', 'export', '--platform', 'web', '--output-dir', '.verify-build', '--clear'],
  'Web bundle'
);

step('Browser walkthrough');
const server = spawn(process.execPath, [path.join(__dirname, 'serve.js'), '.verify-build', '8099'], {
  cwd: ROOT,
  stdio: 'ignore',
});

const finish = (code) => {
  server.kill();
  process.exit(code);
};

setTimeout(() => {
  const res = spawnSync(process.execPath, [path.join(__dirname, 'screenshot.js')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    console.error('\n\x1b[31m✗ Browser walkthrough failed\x1b[0m');
    return finish(res.status ?? 1);
  }
  console.log('\n\x1b[32m✓ All checks passed.\x1b[0m');
  finish(0);
}, 2500);
