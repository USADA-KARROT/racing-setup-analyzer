/**
 * tests/helpers/managed-temp-dir.js
 *
 * Test-infrastructure helper: create a temp directory under `os.tmpdir()` with the given
 * prefix, run a callback against it, and ALWAYS remove the directory afterwards — including
 * on synchronous throws, on rejected promises, on assertion failures, on child-process
 * failures, and on early returns.
 *
 * Pre-existing tests under `tests/r3-0-*.test.js` and `tests/r3-0c-governance-integrity.test.js`
 * used `fs.mkdtempSync(path.join(os.tmpdir(), prefix))` at 17+ call sites with ZERO
 * `rmSync` / `rimraf` / `finally` cleanup. A full `npm test` run leaked dozens of R3-prefixed
 * directories (some 45 MiB each, full-repo clones used by governance-integrity checks),
 * accumulating to 41,408 directories / 112 GiB on disk before this fix.
 *
 * This module exposes two entry points:
 *   - withTempDir(prefix, callback)        — synchronous
 *   - withTempDirAsync(prefix, callback)   — async/Promise-returning
 *
 * Both guarantee cleanup via try/finally with `fs.rmSync(tempDir, {recursive:true, force:true})`.
 * The async variant awaits the callback so the finally runs AFTER the work, not concurrent
 * with it. `force:true` is set so leftover non-writable files inside the dir do not throw a
 * second time during cleanup (a missing dir is also non-fatal under `force:true`).
 *
 * This file is test-only infrastructure. Production renderer/contracts/main.js paths are NOT
 * touched by this module.
 */
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');

function _makeTempDir(prefix) {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new Error('managed-temp-dir: prefix must be a non-empty string');
  }
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function _cleanup(tempDir) {
  // recursive + force so a partially-populated dir, a read-only file, or an already-removed
  // dir all clean up silently. This is intentionally robust — its job is "no leak ever".
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {
    // Last-ditch: ignore. The dir is in $TMPDIR; the OS will eventually reap. Throwing here
    // would shadow the original test failure (if any) and make debugging harder.
  }
}

function withTempDir(prefix, callback) {
  if (typeof callback !== 'function') {
    throw new Error('managed-temp-dir: callback must be a function');
  }
  var tempDir = _makeTempDir(prefix);
  try {
    return callback(tempDir);
  } finally {
    _cleanup(tempDir);
  }
}

async function withTempDirAsync(prefix, callback) {
  if (typeof callback !== 'function') {
    throw new Error('managed-temp-dir: callback must be a function');
  }
  var tempDir = _makeTempDir(prefix);
  try {
    return await callback(tempDir);
  } finally {
    _cleanup(tempDir);
  }
}

// ── Auto-tracked temp dir registry ───────────────────────────────────────────────────────
// For the legacy pattern where a test block creates multiple temp dirs across separate
// helper functions (e.g. runValidator + buildFixture) and the test body needs access to
// the temp paths AFTER the creator returns, withTempDir/withTempDirAsync are too tightly
// scoped. The acquireTempDir / releaseTempDir / cleanupAll trio gives the same fail-closed
// guarantee via a process-level registry: every mkdtemp is tracked, and process exit (any
// reason — clean exit, throw, unhandledRejection, SIGTERM, SIGINT) triggers a synchronous
// sweep of any temp dirs that were not explicitly released.

var _registry = new Set();
var _exitHooksInstalled = false;

function _cleanupAllInternal() {
  // Synchronous walk; safe inside process.on('exit'). Errors swallowed per cleanup contract.
  var entries = Array.from(_registry);
  _registry.clear();
  for (var i = 0; i < entries.length; i++) {
    _cleanup(entries[i]);
  }
}

function _installExitHooksOnce() {
  if (_exitHooksInstalled) return;
  _exitHooksInstalled = true;
  // 'exit' is the canonical synchronous hook and fires during EVERY shutdown path Node
  // supports without a custom listener overriding it — including the default crash-on-
  // uncaught-exception path and the default Node 15+ terminate-on-unhandled-rejection path.
  // (Verified empirically: a bare `throw` with no uncaughtException listener still reaches
  // 'exit' with the correct non-zero code before the process terminates.)
  //
  // An earlier version of this helper also installed 'uncaughtException' / 'unhandledRejection'
  // listeners that ran cleanup then re-threw via setImmediate to let the error surface. That
  // is a bug: re-throwing inside an 'uncaughtException' listener registered via `process.on`
  // (not `.once`) re-enters the SAME listener, which schedules another setImmediate-throw,
  // forever — the process never actually exits. Do not reintroduce that pattern; 'exit' alone
  // is sufficient and does not have this failure mode.
  process.on('exit', _cleanupAllInternal);
  // Signal handlers — leave fast but clean first.
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(function (sig) {
    process.on(sig, function () { _cleanupAllInternal(); process.exit(128); });
  });
}

function acquireTempDir(prefix) {
  _installExitHooksOnce();
  var tempDir = _makeTempDir(prefix);
  _registry.add(tempDir);
  return tempDir;
}

function releaseTempDir(tempDir) {
  // Explicit early cleanup. Idempotent: a path not in the registry is silently OK.
  if (_registry.has(tempDir)) _registry.delete(tempDir);
  _cleanup(tempDir);
}

function cleanupAll() {
  _cleanupAllInternal();
}

function _registrySnapshot() {
  // For internal testing of the registry contract.
  return Array.from(_registry);
}

module.exports = {
  withTempDir: withTempDir,
  withTempDirAsync: withTempDirAsync,
  acquireTempDir: acquireTempDir,
  releaseTempDir: releaseTempDir,
  cleanupAll: cleanupAll,
  _registrySnapshot: _registrySnapshot,
};
