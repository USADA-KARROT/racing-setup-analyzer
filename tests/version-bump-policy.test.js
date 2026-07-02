'use strict';
/**
 * tests/version-bump-policy.test.js — R3.0F F6 · version-bump fail-closed contract.
 *
 * Guards the single authorized 1.4.0 -> 2.0.0 bump semantics of
 * scripts/check-version-policy.js by exercising the REAL script in a child process
 * against a sandboxed repo fixture (a temp dir with a git repo + package.json), so
 * every case runs the actual policy logic — no reimplementation.
 *
 * Covered (per the F6 release-preparation contract):
 *   - the post-bump pin: version 2.0.0 passes with NO env
 *   - fail-closed without allow: any OTHER version fails when VERSION_BUMP_ALLOW unset
 *   - exact-allow-only: allow=3.0.0 accepts exactly 3.0.0, still rejects 2.0.1
 *   - no rollback: 1.4.0 (the pre-bump value) now FAILS without an explicit allow
 *   - version scripts create no tag and never enable release_executed
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const H = require('./helpers/managed-temp-dir.js');

let passed = 0, failed = 0;
function chk(name, cond, extra) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'scripts', 'check-version-policy.js');

// Sandbox: a minimal git repo so the script's git calls behave; its package.json is
// the variable under test. The script resolves REPO relative to its own location, so
// we copy the script into the sandbox's scripts/ dir to point it at the fixture.
function runPolicy(version, env) {
  const box = H.acquireTempDir('f6-version-policy-');
  try {
    fs.mkdirSync(path.join(box, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(box, '.github', 'workflows'), { recursive: true });
    fs.copyFileSync(SCRIPT, path.join(box, 'scripts', 'check-version-policy.js'));
    fs.writeFileSync(path.join(box, 'package.json'), JSON.stringify({ name: 'fixture', version: version }) + '\n');
    fs.writeFileSync(path.join(box, '.github', 'workflows', 'ci.yml'), 'name: x\non:\n  push:\n');
    cp.execSync('git init -q && git add -A && git -c user.email=t@t -c user.name=t commit -qm x', { cwd: box });
    const r = cp.spawnSync(process.execPath, [path.join(box, 'scripts', 'check-version-policy.js')], {
      cwd: box, encoding: 'utf8', timeout: 30000,
      env: Object.assign({}, process.env, { ARTIFACT_DIR: path.join(box, 'artifacts'), BASE_SHA: 'HEAD', HEAD_SHA: 'HEAD' }, env || {}),
    });
    let artifact = null;
    try { artifact = JSON.parse(fs.readFileSync(path.join(box, 'artifacts', 'version-policy.json'), 'utf8')); } catch (_) { }
    return { status: r.status, artifact: artifact };
  } finally {
    H.releaseTempDir(box);
  }
}

// 1. The post-bump pin: 2.0.0 passes with no allow env.
(function () {
  const r = runPolicy('2.0.0', { VERSION_BUMP_ALLOW: '' });
  chk('pin: version 2.0.0 passes with NO VERSION_BUMP_ALLOW', r.status === 0 && r.artifact && r.artifact.ok === true, r.artifact);
})();

// 2. Fail-closed without allow: a foreign version fails.
(function () {
  const r = runPolicy('2.0.1', { VERSION_BUMP_ALLOW: '' });
  chk('fail-closed: 2.0.1 REJECTED without allow', r.status !== 0 && r.artifact && r.artifact.ok === false);
  const r2 = runPolicy('2.1.0', { VERSION_BUMP_ALLOW: '' });
  chk('fail-closed: 2.1.0 REJECTED without allow', r2.status !== 0);
  const r3 = runPolicy('2.0.0-rc.1', { VERSION_BUMP_ALLOW: '' });
  chk('fail-closed: 2.0.0-rc.1 REJECTED without allow', r3.status !== 0);
})();

// 3. No rollback: the PRE-bump value 1.4.0 now fails without an explicit allow.
(function () {
  const r = runPolicy('1.4.0', { VERSION_BUMP_ALLOW: '' });
  chk('no-rollback: 1.4.0 REJECTED after the F6 pin moved to 2.0.0', r.status !== 0 && r.artifact && r.artifact.ok === false);
})();

// 4. Exact-allow-only: an allow admits exactly that version and nothing else.
(function () {
  const r = runPolicy('3.0.0', { VERSION_BUMP_ALLOW: '3.0.0' });
  chk('allow: future authorized bump 3.0.0 passes ONLY with exact allow', r.status === 0);
  const r2 = runPolicy('2.0.1', { VERSION_BUMP_ALLOW: '3.0.0' });
  chk('allow: 2.0.1 still REJECTED when allow=3.0.0 (exact match only)', r2.status !== 0);
  const r3 = runPolicy('3.0.1', { VERSION_BUMP_ALLOW: '3.0.0' });
  chk('allow: 3.0.1 REJECTED when allow=3.0.0 (no prefix/range semantics)', r3.status !== 0);
})();

// 5. No re-bump / double-bump semantics: allow does not stack — with allow set to the
//    current pin the pin itself still passes, but an unrelated jump does not.
(function () {
  const r = runPolicy('4.0.0', { VERSION_BUMP_ALLOW: '2.0.0' });
  chk('no-double-bump: 4.0.0 REJECTED even with allow set to the current pin', r.status !== 0);
})();

// 6. Version tooling creates no tag and never enables release_executed.
(function () {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  chk('version script never creates/pushes a tag', !/git\s+(tag|push)/.test(src));
  chk('version script never touches release_executed', src.indexOf('release_executed') === -1);
  const gate = fs.readFileSync(path.join(REPO, 'scripts', 'check-release-gate.js'), 'utf8');
  chk('release gate never creates/pushes a tag', !/git\s+(tag|push)/.test(gate));
  chk('release gate never writes governance state', gate.indexOf("writeFileSync(path.join(ARTIFACT_DIR") !== -1 && !/writeFileSync\([^)]*governance/.test(gate));
  const state = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0f', 'state.json'), 'utf8'));
  chk('release_executed remains DISABLED at RELEASE_PREPARED', state.enabledCapabilities.indexOf('release_executed') === -1);
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  chk('repo package.json carries exactly the bumped version 2.0.0', pkg.version === '2.0.0');
})();

console.log('version-bump-policy: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
