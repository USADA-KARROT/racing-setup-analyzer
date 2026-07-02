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
  // Ownership safety (Codex INFRA-01/02): the prefix must be a bare basename fragment —
  // no path separators, no traversal. `path.join(os.tmpdir(), '../sibling-')` would
  // otherwise create (and later recursively DELETE) a directory OUTSIDE the temp root.
  if (prefix !== path.basename(prefix) || prefix === '.' || prefix === '..' ||
      /[\/\\]/.test(prefix) || prefix.indexOf('\0') !== -1) {
    throw new Error('managed-temp-dir: prefix must be a bare name fragment (no separators, no traversal): ' + JSON.stringify(prefix));
  }
  var created = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  // Belt-and-suspenders: the created dir must sit DIRECTLY beneath the resolved temp root.
  var tempRoot = fs.realpathSync(os.tmpdir());
  var parent = fs.realpathSync(path.dirname(created));
  if (parent !== tempRoot) {
    _cleanupBestEffort(created, 'escape-check');
    throw new Error('managed-temp-dir: created dir escaped the temp root: ' + created);
  }
  // Return (and therefore register) the CANONICAL path (Codex INFRA-R2-01): if os.tmpdir()
  // is a symlink that gets retargeted after acquisition, cleanup against the unresolved
  // path could delete a same-named directory under the NEW target. Anchoring to the
  // realpath at creation time pins every later cleanup to the directory actually created.
  return path.join(tempRoot, path.basename(created));
}

function _cleanupBestEffort(tempDir, context) {
  // recursive + force so a partially-populated dir, a read-only file, or an already-removed
  // dir all clean up without throwing. Used by the exit-hook backstop and by finally-path
  // cleanup where throwing would shadow the original test failure. Failures are REPORTED
  // to stderr (Codex INFRA-03: never silent), just not thrown.
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    return true;
  } catch (e) {
    try {
      process.stderr.write('managed-temp-dir: cleanup failed (' + (context || 'best-effort') + ') for ' + tempDir + ': ' + (e && e.message) + '\n');
    } catch (_) { /* stderr unavailable during teardown — nothing further we can do */ }
    return false;
  }
}

function _cleanupStrict(tempDir) {
  // Explicit-release path: the caller asked for deletion NOW, so a failure must surface.
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function withTempDir(prefix, callback) {
  if (typeof callback !== 'function') {
    throw new Error('managed-temp-dir: callback must be a function');
  }
  _installExitHooksOnce();
  var tempDir = _makeTempDir(prefix);
  _registry.add(tempDir); // registered so a failed finally-cleanup is retried by the exit hook
  try {
    return callback(tempDir);
  } finally {
    if (_cleanupBestEffort(tempDir, 'withTempDir')) _registry.delete(tempDir);
  }
}

async function withTempDirAsync(prefix, callback) {
  if (typeof callback !== 'function') {
    throw new Error('managed-temp-dir: callback must be a function');
  }
  _installExitHooksOnce();
  var tempDir = _makeTempDir(prefix);
  _registry.add(tempDir); // registered so a failed finally-cleanup is retried by the exit hook
  try {
    return await callback(tempDir);
  } finally {
    if (_cleanupBestEffort(tempDir, 'withTempDirAsync')) _registry.delete(tempDir);
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
  // Synchronous walk; safe inside process.on('exit'). Best-effort per cleanup contract —
  // failures are reported to stderr by _cleanupBestEffort, never thrown (throwing inside
  // an 'exit' hook would mask the process's real exit status).
  var entries = Array.from(_registry);
  _registry.clear();
  for (var i = 0; i < entries.length; i++) {
    _cleanupBestEffort(entries[i], 'exit-hook');
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
  // Explicit early cleanup — REGISTRY-OWNED PATHS ONLY (Codex INFRA-01). A path this
  // helper did not create must never be deleted here: an arbitrary caller-supplied
  // directory (or an already-released one) is a silent no-op, which also keeps the
  // double-release idempotency contract. Deletion failures on an owned path THROW
  // (Codex INFRA-03: the caller asked for deletion now, so a failure must surface);
  // the entry stays in the registry so the exit-hook backstop retries it.
  if (!_registry.has(tempDir)) return false;
  _cleanupStrict(tempDir);
  _registry.delete(tempDir);
  return true;
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
