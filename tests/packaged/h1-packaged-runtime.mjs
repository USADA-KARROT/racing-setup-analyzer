// H1 packaged-runtime verification harness.
//
// Boots a REAL Electron binary (packaged .app binary or a dev `electron .` launcher),
// attaches over CDP (Node >= 22 built-in WebSocket), and asserts the H1 runtime
// contract inside the live renderer:
//
//   1. the sandboxed preload actually loaded (no "Unable to load preload script")
//   2. window.electronAPI exists with EXACTLY {platform, getAppVersion}
//   3. electronAPI.getAppVersion() resolves to the expected app version
//   4. api.getStats().version reports that same version (renderer display path)
//   5. no fabricated '1.0.0' anywhere in the reported values
//   6. ipcRenderer is NOT reachable from the page (bridge minimality)
//
// This harness is LOCAL EVIDENCE tooling: it requires a built binary, so it is not
// part of the install-free `npm test` chain. Profile isolation is the CALLER's job
// (macOS Electron ignores $HOME for userData — move the real profile aside first).
//
// Usage:
//   node tests/packaged/h1-packaged-runtime.mjs <binaryPath> <expectedVersion> [label]
// Exit code 0 = all checks passed; 1 = failures; 2 = fatal (boot/CDP failure).
import { spawn } from 'node:child_process';

const [bin, expectedVersion, label = 'packaged'] = process.argv.slice(2);
if (!bin || !expectedVersion) {
  console.error('usage: node h1-packaged-runtime.mjs <binaryPath> <expectedVersion> [label]');
  process.exit(2);
}
// Per-run unique port (pid-derived) so parallel/stale instances cannot collide.
const PORT = 9400 + (process.pid % 400);

// TARGET-OWNERSHIP GUARD (1/3): the port must be FREE before we spawn — if any
// CDP endpoint already answers here, we would risk attaching to a foreign app.
try {
  await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(800) });
  console.error(`H1-RUNTIME(${label}) FATAL: port ${PORT} already serves a CDP endpoint — refusing to attach to a foreign target`);
  process.exit(2);
} catch (_) { /* connection refused = free, proceed */ }

const child = spawn(bin, [`--remote-debugging-port=${PORT}`], {
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logBuf = '';
let childExit = null;
child.stdout.on('data', (d) => { logBuf += d; });
child.stderr.on('data', (d) => { logBuf += d; });
// TARGET-OWNERSHIP GUARD (2/3): if OUR child dies, any CDP endpoint on the port
// is by definition foreign — abort instead of attaching.
child.on('exit', (code, sig) => { childExit = { code, sig }; });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpPage() {
  for (let i = 0; i < 40; i++) {
    if (childExit) throw new Error(`spawned binary exited (code=${childExit.code} sig=${childExit.sig}) before CDP came up — refusing to attach; log tail: ` + logBuf.slice(-300));
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch (_) { /* not up yet */ }
    await sleep(500);
  }
  throw new Error('CDP page target never appeared');
}

let ws, msgId = 0;
const pending = new Map();
function send(method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error('CDP timeout: ' + method)); } }, 15000);
  });
}
async function evalJs(expression) {
  const m = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  const r = m.result;
  if (r.exceptionDetails) throw new Error('eval threw: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}

const results = [];
function chk(name, ok, extra) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  ✓ ' : '  ✗ ') + `[${label}] ` + name + (extra !== undefined && !ok ? ' :: ' + JSON.stringify(extra) : ''));
}

try {
  const page = await cdpPage();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id).resolve(m); pending.delete(m.id); }
  };
  await sleep(4000); // let preload IPC + Alpine settle

  // 1. preload actually loaded
  chk('preload loaded (no "Unable to load preload script" in logs)', !/Unable to load preload script/.test(logBuf));
  chk('no module-not-found preload crash in logs', !/module not found/.test(logBuf), logBuf.slice(-300));

  // 2. bridge surface is exactly {platform, getAppVersion}
  const surface = await evalJs('typeof electronAPI === "object" && electronAPI ? Object.keys(electronAPI).sort() : null');
  chk('electronAPI exists', Array.isArray(surface), surface);
  chk('electronAPI surface EXACTLY [getAppVersion, platform]', JSON.stringify(surface) === JSON.stringify(['getAppVersion', 'platform']), surface);
  const platform = await evalJs('electronAPI.platform');
  chk('electronAPI.platform is a known platform string', typeof platform === 'string' && ['darwin', 'win32', 'linux'].includes(platform), platform);

  // 3. version authority round-trip
  const v = await evalJs('electronAPI.getAppVersion()');
  chk(`getAppVersion() === ${expectedVersion}`, v === expectedVersion, v);
  chk('getAppVersion() never fabricates 1.0.0', v !== '1.0.0', v);

  // 4. renderer display path (api.getStats)
  const statsV = await evalJs('(function(){ try { return api.getStats().version; } catch (e) { return "THREW:" + e.message; } })()');
  chk(`api.getStats().version === ${expectedVersion} (startup-resolved)`, statsV === expectedVersion, statsV);
  chk('getStats().version is never the fabricated 1.0.0', statsV !== '1.0.0', statsV);

  // 6. bridge minimality: no ipcRenderer/require/process reachable from the page
  const leaks = await evalJs('JSON.stringify({ ipcRenderer: typeof ipcRenderer, require: typeof require, processObj: typeof process, electronAPIinvoke: typeof (electronAPI.invoke || electronAPI.send) })');
  chk('page cannot reach ipcRenderer/require/process and bridge has no generic invoke/send',
    leaks === JSON.stringify({ ipcRenderer: 'undefined', require: 'undefined', processObj: 'undefined', electronAPIinvoke: 'undefined' }), leaks);

  // TARGET-OWNERSHIP GUARD (3/3): the child we spawned must STILL be alive at the
  // end of the assertions — if it died mid-run, the page we evaluated was foreign.
  chk('spawned binary is still alive (CDP target ownership)', childExit === null, childExit);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`H1-RUNTIME(${label}): ${results.length - failed} passed, ${failed} failed`);
  child.kill('SIGTERM');
  await sleep(800);
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error(`H1-RUNTIME(${label}) FATAL: ` + e.message);
  console.error('log tail: ' + logBuf.slice(-400));
  child.kill('SIGKILL');
  process.exit(2);
}
