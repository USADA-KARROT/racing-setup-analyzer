/**
 * tests/r3-0c-governance-integrity.test.js — R3.0C C0 governance integrity (visibility) checker.
 *
 * Covers SHA-256 inventory production, deterministic bundle digest, sensitivity to file content
 * changes, and fail-closed behaviour on missing required files. PASS asserts the real-repo baseline;
 * FAIL cases use temp-dir fixtures (R3_0C_INTEGRITY_REPO_OVERRIDE) so the test never mutates real
 * governance files.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-0c-governance-integrity.js';
const REQUIRED = [
  'governance/r3.0c/schema.json',
  'governance/r3.0c/state.json',
  'governance/r3.0c/capabilities.json',
  'governance/r3.0c/checkpoint-manifest.schema.json',
  'governance/r3.0c/checkpoints/C0.json',
  'scripts/check-r3-0c-governance.js',
  'scripts/check-r3-0c-no-consumer.js',
  'scripts/check-r3-0c-governance-integrity.js',
  'scripts/check-r3-0c-guard.js',
  'scripts/collect-evidence.js',
  '.github/workflows/ci.yml',
];

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(repoOverride) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  if (repoOverride) env.R3_0C_INTEGRITY_REPO_OVERRIDE = repoOverride;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-0c-governance-integrity.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '' };
}

function copyRequiredInto(dest) {
  for (const rel of REQUIRED) {
    const src = path.join(REPO, rel);
    const out = path.join(dest, rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(src, out);
  }
}

function hasViolation(art, code) { return !!(art && Array.isArray(art.violations) && art.violations.some(v => v.code === code)); }

// ── A. PASS: real repo ──
(() => {
  const r = runValidator(null);
  chk('A1 real-repo exits 0', r.status === 0, r.stderr);
  chk('A2 real-repo ok===true', !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
  chk('A3 real-repo inventory length === REQUIRED count + extras', !!(r.artifact && Array.isArray(r.artifact.inventory) && r.artifact.inventory.length >= REQUIRED.length));
  chk('A4 real-repo every required file in inventory', !!(r.artifact && REQUIRED.every(f => r.artifact.inventory.find(i => i.path === f))));
  chk('A5 real-repo bundleSha256 looks like 64 hex chars', !!(r.artifact && /^[0-9a-f]{64}$/.test(r.artifact.bundleSha256)));
})();

// ── B. inventory hashes match fs.readFileSync sha256 ──
(() => {
  const r = runValidator(null);
  let allMatch = true;
  for (const item of (r.artifact && r.artifact.inventory) || []) {
    const buf = fs.readFileSync(path.join(REPO, item.path));
    const expected = crypto.createHash('sha256').update(buf).digest('hex');
    if (item.sha256 !== expected) { allMatch = false; break; }
  }
  chk('B1 inventory sha256 matches fs.readFileSync', allMatch);
})();

// ── C. bundleSha256 is deterministic for identical content ──
(() => {
  const fixA = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-fixA-'));
  const fixB = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-fixB-'));
  copyRequiredInto(fixA); copyRequiredInto(fixB);
  const a = runValidator(fixA);
  const b = runValidator(fixB);
  chk('C1 same content → same bundleSha256', !!(a.artifact && b.artifact && a.artifact.bundleSha256 === b.artifact.bundleSha256));
})();

// ── D. bundleSha256 changes when any file content changes ──
(() => {
  const fix = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-fix-'));
  copyRequiredInto(fix);
  const before = runValidator(fix);
  fs.writeFileSync(path.join(fix, 'governance', 'r3.0c', 'state.json'),
    fs.readFileSync(path.join(fix, 'governance', 'r3.0c', 'state.json'), 'utf8') + '\n// drift\n');
  const after = runValidator(fix);
  chk('D1 content change → different bundleSha256', !!(before.artifact && after.artifact && before.artifact.bundleSha256 !== after.artifact.bundleSha256));
})();

// ── E. missing required file fails closed ──
(() => {
  const fix = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-miss-'));
  copyRequiredInto(fix);
  fs.unlinkSync(path.join(fix, 'governance', 'r3.0c', 'schema.json'));
  const r = runValidator(fix);
  chk('E1 missing required file → exit non-zero', r.status !== 0);
  chk('E2 missing required file → ok=false', !!(r.artifact && r.artifact.ok === false));
  chk('E3 GOVERNANCE_FILE_UNREADABLE OR GOVERNANCE_REQUIRED_FILE_MISSING recorded',
    hasViolation(r.artifact, 'GOVERNANCE_FILE_UNREADABLE') || hasViolation(r.artifact, 'GOVERNANCE_REQUIRED_FILE_MISSING'));
})();

// ── F. extra checkpoint manifests are inventoried (visibility) ──
(() => {
  const fix = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-int-extra-'));
  copyRequiredInto(fix);
  fs.writeFileSync(path.join(fix, 'governance', 'r3.0c', 'checkpoints', 'C1.json'), JSON.stringify({ schemaVersion: 1, program: 'R3.0C', checkpoint: 'C1_PRODUCTION_ADAPTER', status: 'pending' }, null, 2));
  const r = runValidator(fix);
  chk('F1 extra checkpoint manifest listed in extraCheckpointManifests', !!(r.artifact && Array.isArray(r.artifact.extraCheckpointManifests) && r.artifact.extraCheckpointManifests.indexOf('governance/r3.0c/checkpoints/C1.json') !== -1));
  chk('F2 extra checkpoint manifest hashed in inventory', !!(r.artifact && r.artifact.inventory.find(i => i.path === 'governance/r3.0c/checkpoints/C1.json')));
})();

// ── G. validator exit code matches ok ──
(() => {
  const r = runValidator(null);
  chk('G1 real-repo exit==0 when ok==true', (r.status === 0) === !!(r.artifact && r.artifact.ok === true));
})();

console.log('r3-0c-governance-integrity: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
