'use strict';
// WEB-PREVIEW GATE — the browser-first delivery contract.
//
// Verifies (statically + via the real build script) that the hosted Web Preview
// is buildable, self-contained, subpath-safe, honest about its version, and can
// never ship Electron internals, deferred modules, tests, governance, or
// private files. Runtime behaviour of the shared modules (storage, import/
// export, comparisons, brief, i18n, XSS) is covered by the existing suite —
// this gate covers what is UNIQUE to the web delivery.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const REPO = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
function chk(name, ok, detail) {
  if (ok) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (detail !== undefined ? ' :: ' + JSON.stringify(detail) : '')); }
}

// ---- 1) runtime adapter: web mode (no electronAPI) --------------------------
delete global.window;
global.window = {};
delete require.cache[require.resolve('../renderer/js/runtime-api.js')];
let R = require('../renderer/js/runtime-api.js');
chk('web mode: platform === "web"', R.platform === 'web');
(async () => {
  chk('web mode, no metadata: version resolves "unavailable"', (await R.getAppVersion()) === 'unavailable');

  // malformed metadata still fails closed
  global.window = { WEB_BUILD_INFO: { version: '01.2.3' } };
  delete require.cache[require.resolve('../renderer/js/runtime-api.js')];
  R = require('../renderer/js/runtime-api.js');
  chk('web mode, malformed semver: "unavailable" (never a fabricated version)', (await R.getAppVersion()) === 'unavailable');

  // valid metadata
  global.window = { WEB_BUILD_INFO: Object.freeze({ version: '2.0.1', channel: 'web-preview', commit: 'abc123def', builtAt: '2026-07-02T00:00:00Z' }) };
  delete require.cache[require.resolve('../renderer/js/runtime-api.js')];
  R = require('../renderer/js/runtime-api.js');
  chk('web mode, valid metadata: version === 2.0.1', (await R.getAppVersion()) === '2.0.1');
  chk('web mode: buildInfo passthrough carries channel', R.buildInfo && R.buildInfo.channel === 'web-preview');
  chk('web mode: never 1.0.0', (await R.getAppVersion()) !== '1.0.0');

  // ---- 2) runtime adapter: electron mode ------------------------------------
  global.window = { electronAPI: { platform: 'darwin', getAppVersion: () => Promise.resolve('9.9.9') } };
  delete require.cache[require.resolve('../renderer/js/runtime-api.js')];
  R = require('../renderer/js/runtime-api.js');
  chk('electron mode: platform delegates to bridge', R.platform === 'darwin');
  chk('electron mode: version delegates to preload bridge', (await R.getAppVersion()) === '9.9.9');
  global.window = { electronAPI: { platform: 'darwin', getAppVersion: () => Promise.reject(new Error('boom')) } };
  delete require.cache[require.resolve('../renderer/js/runtime-api.js')];
  R = require('../renderer/js/runtime-api.js');
  chk('electron mode: bridge failure resolves "unavailable" (never throws)', (await R.getAppVersion()) === 'unavailable');
  delete global.window;

  // ---- 3) no direct electronAPI consumers outside the adapter ---------------
  const jsDir = path.join(REPO, 'renderer', 'js');
  const offenders = fs.readdirSync(jsDir).filter((f) => f.endsWith('.js') && f !== 'runtime-api.js')
    .filter((f) => /\belectronAPI\b/.test(fs.readFileSync(path.join(jsDir, f), 'utf8').replace(/^\s*\/\/.*$/gm, '')));
  chk('no renderer module reads window.electronAPI directly (adapter is the only consumer)', offenders.length === 0, offenders);
  const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
  chk('index.html itself never references electronAPI', !/\belectronAPI\b/.test(html));

  // ---- 4) load order + subpath safety ---------------------------------------
  const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  chk('web-build-info.js loads before runtime-api.js', order.indexOf('js/web-build-info.js') !== -1 && order.indexOf('js/web-build-info.js') < order.indexOf('js/runtime-api.js'));
  chk('runtime-api.js loads before api.js', order.indexOf('js/runtime-api.js') < order.indexOf('js/api.js'));
  chk('all script/link paths are relative (Pages subpath-safe)', !/(src|href)="\//.test(html));
  chk('no <base> tag (would break subpath deploys)', !/<base\b/i.test(html));
  chk('CSP meta present with self default-src', /Content-Security-Policy[^>]+default-src 'self'/.test(html));
  chk('source web-build-info.js is a no-op placeholder (no hardcoded version)', !/WEB_BUILD_INFO\s*=/.test(fs.readFileSync(path.join(jsDir, 'web-build-info.js'), 'utf8')));

  // ---- 5) build the real bundle and audit it --------------------------------
  const r = cp.spawnSync('node', ['scripts/build-web-dist.js'], { cwd: REPO, encoding: 'utf8' });
  chk('build-web-dist exits 0 (self-audit ok)', r.status === 0, (r.stdout || '').slice(-200) + (r.stderr || '').slice(-200));
  const OUT = path.join(REPO, 'web-dist');
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const excluded = pkg.build.files.filter((e) => e.startsWith('!renderer/')).map((e) => e.slice('!renderer/'.length));
  chk('exclusion list read from package.json is non-trivial (>=15 deferred/inert modules)', excluded.length >= 15, excluded.length);
  chk('web-dist/index.html exists', fs.existsSync(path.join(OUT, 'index.html')));
  chk('web-dist has NO main.js / preload.js / node_modules / tests / governance',
    ['main.js', 'preload.js', 'node_modules', 'tests', 'governance'].every((b) => !fs.existsSync(path.join(OUT, b))));
  chk('every excluded module is absent from web-dist', excluded.every((e) => !fs.existsSync(path.join(OUT, e))), excluded.filter((e) => fs.existsSync(path.join(OUT, e))));
  const stamped = fs.readFileSync(path.join(OUT, 'js', 'web-build-info.js'), 'utf8');
  chk('stamped metadata carries package.json version (single stamping point)', stamped.includes(JSON.stringify(pkg.version)));
  chk('stamped metadata carries web-preview channel + commit + builtAt', /channel: 'web-preview'/.test(stamped) && /commit: "/.test(stamped) && /builtAt: "/.test(stamped));
  chk('.nojekyll present', fs.existsSync(path.join(OUT, '.nojekyll')));
  chk('404.html present', fs.existsSync(path.join(OUT, '404.html')));
  // core shared modules that the web app needs actually shipped
  for (const mod of ['js/api.js', 'js/runtime-api.js', 'js/storage-backend.js', 'js/case-store.js', 'js/i18n-shell.js', 'js/measured-metrics.js', 'lib/alpine.min.js', 'lib/tailwind.js', 'lib/chart.min.js']) {
    chk('web-dist ships ' + mod, fs.existsSync(path.join(OUT, mod)));
  }
  // no private-looking files
  const priv = [];
  (function scan(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) { scan(p); continue; }
      // Real private-material patterns only — product modules legitimately contain
      // the word "analysis" (analysis-case.js etc.), so match secrets/keys/binary
      // artifacts and the local-only private-analysis naming, not that word.
      if (/secret|credential|keychain|f3-analysis|\.pem$|\.p12$|\.key$|\.dmg$|\.bmsbin$|\.tir$/i.test(n)) priv.push(path.relative(OUT, p));
    }
  })(OUT);
  chk('no private/secret-looking files in web-dist', priv.length === 0, priv);

  console.log(`web-preview-gate: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})();
