/**
 * tests/managed-temp-dir.test.js
 *
 * Regression suite for tests/helpers/managed-temp-dir.js. Proves that withTempDir +
 * withTempDirAsync always clean up the temp directory they created — on success, on
 * synchronous throw, on async reject, on assertion failure, and on early return.
 */
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');
var H = require('./helpers/managed-temp-dir.js');

var passed = 0;
var failed = 0;
function chk(name, cond, ctx) {
  if (cond) { passed++; console.log('  ✓ ' + name); return; }
  failed++; console.log('  FAIL ' + name + (ctx ? ' ' + JSON.stringify(ctx) : ''));
}

function tempBaseline() {
  // Count current R3-prefixed entries — we use a unique probe prefix here so we don't
  // collide with the very leak this branch is fixing.
  var dir = os.tmpdir();
  var rx = /^managed-temp-probe-/;
  return fs.readdirSync(dir).filter(function (n) { return rx.test(n); }).length;
}

(async function run() {
  var before = tempBaseline();

  // (1) Synchronous happy path — temp dir exists during callback, gone after
  var seenInside1 = null;
  var rv1 = H.withTempDir('managed-temp-probe-sync-ok-', function (t) {
    seenInside1 = t;
    chk('sync happy: temp dir exists during callback', fs.existsSync(t));
    return 'rv1';
  });
  chk('sync happy: callback return value passes through', rv1 === 'rv1');
  chk('sync happy: temp dir REMOVED after callback', seenInside1 && !fs.existsSync(seenInside1));

  // (2) Synchronous throw path — temp dir still removed
  var seenInside2 = null;
  var threw2 = false;
  try {
    H.withTempDir('managed-temp-probe-sync-throw-', function (t) {
      seenInside2 = t;
      throw new Error('intentional sync failure');
    });
  } catch (e) { threw2 = /intentional sync failure/.test(String(e && e.message)); }
  chk('sync throw: original error propagates', threw2 === true);
  chk('sync throw: temp dir REMOVED despite throw', seenInside2 && !fs.existsSync(seenInside2));

  // (3) Async happy path
  var seenInside3 = null;
  var rv3 = await H.withTempDirAsync('managed-temp-probe-async-ok-', async function (t) {
    seenInside3 = t;
    chk('async happy: temp dir exists during callback', fs.existsSync(t));
    await new Promise(function (res) { setTimeout(res, 10); });
    return 'rv3';
  });
  chk('async happy: callback return value passes through', rv3 === 'rv3');
  chk('async happy: temp dir REMOVED after callback resolves', seenInside3 && !fs.existsSync(seenInside3));

  // (4) Async reject path
  var seenInside4 = null;
  var rejected4 = false;
  try {
    await H.withTempDirAsync('managed-temp-probe-async-reject-', async function (t) {
      seenInside4 = t;
      await new Promise(function (res) { setTimeout(res, 10); });
      throw new Error('intentional async failure');
    });
  } catch (e) { rejected4 = /intentional async failure/.test(String(e && e.message)); }
  chk('async reject: original rejection propagates', rejected4 === true);
  chk('async reject: temp dir REMOVED despite rejection', seenInside4 && !fs.existsSync(seenInside4));

  // (5) Early return inside callback — finally still runs
  var seenInside5 = null;
  var rv5 = H.withTempDir('managed-temp-probe-early-return-', function (t) {
    seenInside5 = t;
    if (true) return 'early';
    /* eslint-disable-next-line no-unreachable */
    return 'never';
  });
  chk('early return: rv5 === "early"', rv5 === 'early');
  chk('early return: temp dir REMOVED after early-return', seenInside5 && !fs.existsSync(seenInside5));

  // (6) Robust to re-cleanup — calling again does not throw (probe via direct rm)
  // The helper itself swallows cleanup errors so a non-existent dir is silent.
  var seenInside6 = null;
  H.withTempDir('managed-temp-probe-double-clean-', function (t) {
    seenInside6 = t;
    // Pre-emptively remove inside the callback; the finally should still not throw.
    fs.rmSync(t, { recursive: true, force: true });
    chk('inside callback can rm early without later throw', !fs.existsSync(t));
  });
  chk('double-clean: temp dir gone', seenInside6 && !fs.existsSync(seenInside6));

  // (7) Bad prefix rejected
  var prefixThrew = false;
  try { H.withTempDir('', function () {}); } catch (e) { prefixThrew = /non-empty string/.test(String(e && e.message)); }
  chk('empty prefix rejected with non-empty string error', prefixThrew === true);

  // (8) Bad callback rejected
  var cbThrew = false;
  try { H.withTempDir('managed-temp-probe-bad-cb-', null); } catch (e) { cbThrew = /must be a function/.test(String(e && e.message)); }
  chk('null callback rejected with must-be-a-function error', cbThrew === true);

  // (9) acquireTempDir / releaseTempDir — explicit release path
  var acquired9 = H.acquireTempDir('managed-temp-probe-acquire-explicit-');
  chk('acquire: dir exists right after acquireTempDir', fs.existsSync(acquired9));
  chk('acquire: dir tracked in registry', H._registrySnapshot().indexOf(acquired9) !== -1);
  H.releaseTempDir(acquired9);
  chk('release: dir removed after releaseTempDir', !fs.existsSync(acquired9));
  chk('release: dir no longer tracked in registry', H._registrySnapshot().indexOf(acquired9) === -1);

  // (10) acquireTempDir without explicit release — cleanupAll() sweeps it
  var acquired10a = H.acquireTempDir('managed-temp-probe-acquire-sweep-a-');
  var acquired10b = H.acquireTempDir('managed-temp-probe-acquire-sweep-b-');
  chk('acquire (sweep test): both dirs exist before cleanupAll', fs.existsSync(acquired10a) && fs.existsSync(acquired10b));
  H.cleanupAll();
  chk('cleanupAll: both un-released dirs removed', !fs.existsSync(acquired10a) && !fs.existsSync(acquired10b));
  chk('cleanupAll: registry empty after sweep', H._registrySnapshot().length === 0);

  // (11) releaseTempDir on an already-released / unknown path does not throw
  var noThrowOnDoubleRelease = true;
  try { H.releaseTempDir(acquired9); } catch (_) { noThrowOnDoubleRelease = false; }
  chk('releaseTempDir is idempotent (no throw on already-released path)', noThrowOnDoubleRelease === true);

  // (12) Net leak: no managed-temp-probe-* entries leaked
  var after = tempBaseline();
  chk('NET LEAK probe count delta === 0', after === before, { before: before, after: after });

  // (13) Uncaught exception in a real child process still triggers the 'exit'-hook cleanup
  // sweep, does not hang, and propagates a non-zero exit code. This guards against a real bug
  // found during R3.0F infra hardening: an earlier version registered 'uncaughtException' /
  // 'unhandledRejection' listeners that re-threw via setImmediate, which re-entered the SAME
  // listener (process.on, not .once) and looped forever — the process never exited. Must run
  // in a genuine child process; a crash inside this process would kill the whole test run.
  (function uncaughtExceptionExitHookTest() {
    var probeDir = H.acquireTempDir('managed-temp-probe-uncaught-');
    var probeScript = path.join(probeDir, 'crash-probe.js');
    var helperPath = path.resolve(__dirname, 'helpers', 'managed-temp-dir.js');
    var markerPath = path.join(probeDir, 'leaked-dir-marker');
    fs.writeFileSync(probeScript,
      "var H = require(" + JSON.stringify(helperPath) + ");\n" +
      "var fs = require('fs');\n" +
      "var tmp = H.acquireTempDir('managed-temp-probe-uncaught-child-');\n" +
      "fs.writeFileSync(" + JSON.stringify(markerPath) + ", tmp);\n" +
      "throw new Error('intentional crash for exit-hook regression test');\n");
    var start = process.hrtime.bigint();
    var result = cp.spawnSync(process.execPath, [probeScript], { encoding: 'utf8', timeout: 10000 });
    var elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
    chk('uncaught-exception child: did not time out (no infinite loop)', result.error == null || result.error.code !== 'ETIMEDOUT', result.error);
    chk('uncaught-exception child: finished quickly (<5s, not hung)', elapsedMs < 5000, { elapsedMs: elapsedMs });
    chk('uncaught-exception child: exited non-zero (failure not masked as success)', result.status !== 0, { status: result.status });
    var childTempDir = null;
    try { childTempDir = fs.readFileSync(markerPath, 'utf8'); } catch (_) { /* ignore */ }
    chk('uncaught-exception child: created its temp dir before crashing', typeof childTempDir === 'string' && childTempDir.length > 0);
    chk('uncaught-exception child: temp dir REMOVED by exit-hook despite uncaught throw',
      typeof childTempDir === 'string' && childTempDir.length > 0 && !fs.existsSync(childTempDir));
    H.releaseTempDir(probeDir);
  })();

  console.log('managed-temp-dir: ' + passed + ' passed, ' + failed + ' failed');
  if (failed) process.exit(1);
})();
