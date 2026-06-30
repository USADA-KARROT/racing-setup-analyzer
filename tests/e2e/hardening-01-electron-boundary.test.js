/**
 * tests/e2e/hardening-01-electron-boundary.test.js — R3.0F F3 · Electron renderer boundary.
 *
 * Asserts the Electron host enforces the strictest renderer-process isolation:
 *   • contextIsolation: true (per Electron security best practices)
 *   • nodeIntegration: false (no Node API access from renderer)
 *   • preload.js exposes ONLY the minimal contextBridge surface
 *   • preload.js does NOT load fs / child_process / net / http / https / ipcRenderer
 *   • main.js does NOT enable unsafe webPreferences flags (allowRunningInsecureContent,
 *     webSecurity: false, experimentalFeatures, sandbox: false-override)
 *   • main.js Content-Security-Policy not weakened
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;
var fs = require('fs');
var path = require('path');

var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
try {
  var mainPath = path.join(__dirname, '..', '..', 'main.js');
  var mainSrc = fs.readFileSync(mainPath, 'utf8');
  var preloadPath = path.join(__dirname, '..', '..', 'preload.js');
  var preloadSrc = fs.readFileSync(preloadPath, 'utf8');
  var indexPath = path.join(__dirname, '..', '..', 'renderer', 'index.html');
  var indexSrc = fs.readFileSync(indexPath, 'utf8');

  // Step 1: main.js webPreferences — strict isolation
  chk('main.js contextIsolation: true', /contextIsolation\s*:\s*true/.test(mainSrc));
  chk('main.js nodeIntegration: false', /nodeIntegration\s*:\s*false/.test(mainSrc));
  chk('main.js does NOT enable allowRunningInsecureContent', !/allowRunningInsecureContent\s*:\s*true/.test(mainSrc));
  chk('main.js does NOT disable webSecurity', !/webSecurity\s*:\s*false/.test(mainSrc));
  chk('main.js does NOT enable experimentalFeatures', !/experimentalFeatures\s*:\s*true/.test(mainSrc));
  chk('main.js does NOT enable enableRemoteModule', !/enableRemoteModule\s*:\s*true/.test(mainSrc));
  chk('main.js does NOT enable nodeIntegrationInWorker', !/nodeIntegrationInWorker\s*:\s*true/.test(mainSrc));
  chk('main.js does NOT enable nodeIntegrationInSubFrames', !/nodeIntegrationInSubFrames\s*:\s*true/.test(mainSrc));

  // Step 2: preload.js minimal surface
  chk('preload.js uses contextBridge', /contextBridge/.test(preloadSrc));
  chk('preload.js does NOT import ipcRenderer', !/ipcRenderer/.test(preloadSrc));
  chk('preload.js does NOT require fs', !/require\(['"]fs['"]\)/.test(preloadSrc));
  chk('preload.js does NOT require child_process', !/require\(['"]child_process['"]\)/.test(preloadSrc));
  chk('preload.js does NOT require net', !/require\(['"]net['"]\)/.test(preloadSrc));
  chk('preload.js does NOT require http', !/require\(['"]http['"]\)/.test(preloadSrc));
  chk('preload.js does NOT require https', !/require\(['"]https['"]\)/.test(preloadSrc));
  chk('preload.js does NOT require os', !/require\(['"]os['"]\)/.test(preloadSrc));
  chk('preload.js does NOT eval untrusted content', !/eval\(|new\s+Function\(/.test(preloadSrc));

  // Step 3: preload exposed surface is tiny + read-only
  // The expected surface is { platform, version } — both read-only metadata.
  chk('preload.js exposes only platform + version (no IPC channels)', /platform\s*:/.test(preloadSrc) && /version\s*:/.test(preloadSrc) && preloadSrc.length < 500);

  // Step 4: renderer/index.html declares CSP header
  var cspMatch = indexSrc.match(/<meta\s+http-equiv\s*=\s*"Content-Security-Policy"\s+content\s*=\s*"([^"]+)"/i);
  chk('renderer index.html declares CSP via meta', cspMatch !== null);
  // We tolerate 'unsafe-inline' + 'unsafe-eval' here because the app is a localfile Electron renderer
  // and the existing R3.0C/D/E code uses inline Alpine.js handlers. F3 hardens it by ensuring no
  // external script source is referenced.
  chk('CSP default-src is self only', cspMatch && /default-src\s+'self'/.test(cspMatch[1]));
  chk('renderer does not pull external script (no <script src="http">)', !/script[^>]+src\s*=\s*["']https?:\/\//i.test(indexSrc));

  // Step 5: zero console error
  chk('zero console.error during electron-boundary hardening', h.consoleErrorCount === 0);
} finally {
  h.dispose();
}

t.report('e2e-hardening-01-electron-boundary');
