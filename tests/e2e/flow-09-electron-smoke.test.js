/**
 * tests/e2e/flow-09-electron-smoke.test.js — R3.0F F2 · Electron startup smoke.
 *
 * Verifies the Electron host process can be invoked and reports a version. This is a SMOKE
 * test only — it does NOT launch a window or render the UI (that would require GUI display
 * which is not always available in CI). The smoke confirms:
 *   • electron CLI is reachable (devDependency installed)
 *   • main.js has a stable Electron-compatible entry shape (already covered by the require
 *     in other unit tests; here we just confirm the version handshake)
 *   • preload.js exposes only the minimal contextBridge surface (no nodeIntegration leak)
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;
var cp = require('child_process');
var path = require('path');
var fs = require('fs');

var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
try {
  // Step 1: electron binary reachable via npm package
  var electronBin = null;
  try { electronBin = require.resolve('electron/cli.js'); } catch (e) { /* */ }
  chk('electron package installed', electronBin !== null);

  if (electronBin) {
    // Step 2: electron --version returns a vN.N.N string (no GUI launch)
    var out = '';
    try {
      out = cp.execFileSync(process.execPath, [electronBin, '--version'], { encoding: 'utf8', timeout: 30000 }).trim();
    } catch (e) { out = 'ERROR: ' + (e && e.message); }
    chk('electron --version produced output', typeof out === 'string' && out.length > 0);
    chk('electron version format vN.N.N', /^v\d+\.\d+\.\d+/.test(out));
  }

  // Step 3: main.js exists + structurally sound (contextIsolation: true, nodeIntegration: false)
  var mainPath = path.join(__dirname, '..', '..', 'main.js');
  var mainSrc = fs.readFileSync(mainPath, 'utf8');
  chk('main.js contextIsolation: true', /contextIsolation\s*:\s*true/.test(mainSrc));
  chk('main.js nodeIntegration: false', /nodeIntegration\s*:\s*false/.test(mainSrc));
  chk('main.js loads preload.js', /preload\.js/.test(mainSrc));

  // Step 4: preload.js exposes ONLY minimal contextBridge surface
  var preloadPath = path.join(__dirname, '..', '..', 'preload.js');
  var preloadSrc = fs.readFileSync(preloadPath, 'utf8');
  chk('preload.js uses contextBridge', /contextBridge/.test(preloadSrc));
  chk('preload.js does NOT use ipcRenderer (no IPC channel exposed)', !/ipcRenderer/.test(preloadSrc));
  chk('preload.js does NOT use require(fs|child_process|net|http)', !/require\(['"](?:fs|child_process|net|http|https)['"]\)/.test(preloadSrc));

  // Step 5: zero console error
  chk('zero console.error during electron smoke', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-flow-09-electron-smoke');
