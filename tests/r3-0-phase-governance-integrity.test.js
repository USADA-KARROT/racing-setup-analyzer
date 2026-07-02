/**
 * tests/r3-0-phase-governance-integrity.test.js — R3.0 Integrated Delivery Train per-phase integrity.
 *
 * Covers scripts/check-r3-phase-governance-integrity.js for R3.0D / R3.0E / R3.0F. Validates the
 * real-repo PASS path AND a synthetic-tree FAIL path where a required governance file is missing.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const H = require('./helpers/managed-temp-dir.js');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-phase-governance-integrity.js';
const PHASES = ['R3.0D', 'R3.0E', 'R3.0F'];
const ARTIFACT = { 'R3.0D': 'r3-0d-governance-integrity.json', 'R3.0E': 'r3-0e-governance-integrity.json', 'R3.0F': 'r3-0f-governance-integrity.json' };

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(phase, integrityRepo) {
  const tmp = H.acquireTempDir('r3-phase-int-art-');
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp, R3_PHASE_PROGRAM: phase });
  if (integrityRepo) env.R3_PHASE_INTEGRITY_REPO_OVERRIDE = integrityRepo;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, ARTIFACT[phase] || 'r3-phase-governance-integrity.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

// ── PASS: real repo ──
for (const phase of PHASES) {
  const r = runValidator(phase, null);
  chk(phase + ' PASS real repo rc=0', r.status === 0, { status: r.status, violations: r.artifact && r.artifact.violations });
  chk(phase + ' PASS artifact ok=true', r.artifact && r.artifact.ok === true);
  chk(phase + ' PASS bundleSha256 64 hex', r.artifact && typeof r.artifact.bundleSha256 === 'string' && /^[0-9a-f]{64}$/.test(r.artifact.bundleSha256));
  chk(phase + ' PASS inventory non-empty', r.artifact && Array.isArray(r.artifact.inventory) && r.artifact.inventory.length >= 13);
}

// ── FAIL: missing R3_PHASE_PROGRAM ──
{
  const tmp = H.acquireTempDir('r3-phase-int-art-');
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  delete env.R3_PHASE_PROGRAM;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-phase-governance-integrity.json'), 'utf8')); } catch (_) { artifact = null; }
  chk('FAIL missing R3_PHASE_PROGRAM rc=1', r.status === 1);
  chk('FAIL missing R3_PHASE_PROGRAM PHASE_PROGRAM_INVALID', artifact && Array.isArray(artifact.violations) && artifact.violations.some(v => v.code === 'PHASE_PROGRAM_INVALID'));
}

// ── FAIL: synthetic repo missing a required governance file ──
for (const phase of PHASES) {
  const fake = H.acquireTempDir('r3-phase-int-fake-');
  // We only create the workflow file + the train manifest, deliberately omit the phase governance dir.
  fs.mkdirSync(path.join(fake, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(fake, '.github', 'workflows', 'ci.yml'), 'name: x\n');
  fs.mkdirSync(path.join(fake, 'governance', 'r3.0'), { recursive: true });
  fs.writeFileSync(path.join(fake, 'governance', 'r3.0', 'train.json'), '{}');
  fs.writeFileSync(path.join(fake, 'governance', 'r3.0', 'train.schema.json'), '{}');
  fs.mkdirSync(path.join(fake, 'scripts'), { recursive: true });
  for (const name of ['check-r3-phase-governance.js', 'check-r3-phase-no-consumer.js', 'check-r3-phase-governance-integrity.js', 'check-r3-0-train.js', 'collect-evidence.js']) {
    fs.writeFileSync(path.join(fake, 'scripts', name), '// stub\n');
  }
  const r = runValidator(phase, fake);
  chk(phase + ' FAIL missing phase governance rc!=0', r.status !== 0);
  chk(phase + ' FAIL missing phase governance GOVERNANCE_REQUIRED_FILE_MISSING', r.artifact && r.artifact.violations.some(v => v.code === 'GOVERNANCE_REQUIRED_FILE_MISSING'));
}

H.cleanupAll();
console.log('phase-governance-integrity: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
