/**
 * tests/r3-0-phase-governance.test.js — R3.0 Integrated Delivery Train per-phase governance validator.
 *
 * Covers scripts/check-r3-phase-governance.js for R3.0D / R3.0E / R3.0F. Validates the real-repo PASS
 * path AND a battery of adversarial FAIL fixtures (R3_PHASE_GOV_DIR_OVERRIDE points to temp dirs so
 * the actual governance/r3.0X/ files are never mutated). Each spawned validator runs as a child
 * process and writes its artifact under a per-test ARTIFACT_DIR; the test reads the artifact (the
 * same JSON CI reads) — exit code is supplementary, never substitutional.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-phase-governance.js';
const PHASES = ['R3.0D', 'R3.0E', 'R3.0F'];
const BOOTSTRAP = { 'R3.0D': 'D0_BOOTSTRAP', 'R3.0E': 'E0_BOOTSTRAP', 'R3.0F': 'F0_BOOTSTRAP' };
const ARTIFACT = { 'R3.0D': 'r3-0d-governance.json', 'R3.0E': 'r3-0e-governance.json', 'R3.0F': 'r3-0f-governance.json' };

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(phase, govDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-gov-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp, R3_PHASE_PROGRAM: phase });
  if (govDir) env.R3_PHASE_GOV_DIR_OVERRIDE = govDir;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, ARTIFACT[phase] || 'r3-phase-governance.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

function hasViolation(artifact, code) {
  if (!artifact || !Array.isArray(artifact.violations)) return false;
  return artifact.violations.some(v => v.code === code);
}

function baseSchema(phase) {
  const bs = BOOTSTRAP[phase];
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  const lastCheckpoint = phase === 'R3.0D' ? 'D5_ACTIVATION' : phase === 'R3.0E' ? 'E5_ACTIVATION' : 'F6_RELEASE';
  const cpList = [bs, otherCheckpoint, lastCheckpoint];
  const transitions = {}; for (let i = 0; i < cpList.length; i++) transitions[cpList[i]] = i + 1 < cpList.length ? [cpList[i + 1]] : [];
  return {
    schemaVersion: 1, program: phase, checkpoints: cpList, checkpointOrder: cpList, transitions,
    capabilities: ['governance_bootstrap_present', 'production_cap_present', 'feature_registry_active'],
    governanceCapabilities: ['governance_bootstrap_present'],
    productionCapabilities: ['production_cap_present', 'feature_registry_active'],
    capabilityUnlockFloor: { governance_bootstrap_present: bs, production_cap_present: otherCheckpoint, feature_registry_active: lastCheckpoint },
    runtimeConsumerCheckpoint: otherCheckpoint, algorithmCheckpoint: otherCheckpoint, uiCheckpoint: lastCheckpoint, featureRegistryActivationCheckpoint: lastCheckpoint,
    bootstrapCheckpoint: bs, contractPrefix: 'contracts/' + phase.toLowerCase(),
    authorizedPathRules: { mustBeRepoRelative: true, mustBeExact: true, forbiddenSubstrings: ['..', '*', '?', '['], forbiddenPrefixes: ['/'], allowedRoots: ['renderer/js/'] },
  };
}

function baseCapabilities(phase) {
  const bs = BOOTSTRAP[phase];
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  const lastCheckpoint = phase === 'R3.0D' ? 'D5_ACTIVATION' : phase === 'R3.0E' ? 'E5_ACTIVATION' : 'F6_RELEASE';
  return {
    schemaVersion: 1, program: phase,
    capabilities: {
      governance_bootstrap_present: { kind: 'governance', unlockFloor: bs, description: 'x' },
      production_cap_present: { kind: 'production', unlockFloor: otherCheckpoint, description: 'x' },
      feature_registry_active: { kind: 'activation', unlockFloor: lastCheckpoint, description: 'x' },
    },
  };
}

function baseManifestSchema(phase) {
  return { schemaVersion: 1, program: phase, required: ['program', 'checkpoint', 'headSha', 'status'], allowedStatus: ['pending', 'candidate', 'PASS', 'FAIL'] };
}

function baseState(phase) {
  return { schemaVersion: 1, program: phase, currentCheckpoint: BOOTSTRAP[phase], authorizedProductionPaths: [], enabledCapabilities: [], runtimeConsumersAllowed: false, uiAllowed: false, featureRegistryActivationAllowed: false, algorithmsAllowed: false };
}

function writeFixture(state, schema, caps, manifestSchema) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-gov-fix-'));
  fs.mkdirSync(path.join(dir, 'checkpoints'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify(schema));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(dir, 'capabilities.json'), JSON.stringify(caps));
  fs.writeFileSync(path.join(dir, 'checkpoint-manifest.schema.json'), JSON.stringify(manifestSchema));
  return dir;
}

// ── PASS: real repo state for each phase ──
for (const phase of PHASES) {
  const r = runValidator(phase, null);
  chk(phase + ' PASS real repo (status 0)', r.status === 0, { status: r.status, violations: r.artifact && r.artifact.violations });
  chk(phase + ' PASS artifact ok=true', r.artifact && r.artifact.ok === true);
  chk(phase + ' PASS currentCheckpoint=' + BOOTSTRAP[phase], r.artifact && r.artifact.currentCheckpoint === BOOTSTRAP[phase]);
  chk(phase + ' PASS authPaths=0', r.artifact && r.artifact.authorizedProductionPathCount === 0);
  chk(phase + ' PASS enabledCaps=0', r.artifact && r.artifact.enabledCapabilityCount === 0);
  chk(phase + ' PASS all *Allowed false', r.artifact && r.artifact.runtimeConsumersAllowed === false && r.artifact.uiAllowed === false && r.artifact.featureRegistryActivationAllowed === false && r.artifact.algorithmsAllowed === false);
}

// ── FAIL: missing R3_PHASE_PROGRAM ──
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-phase-gov-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  delete env.R3_PHASE_PROGRAM;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-phase-governance.json'), 'utf8')); } catch (_) { artifact = null; }
  chk('FAIL missing R3_PHASE_PROGRAM rc=1', r.status === 1);
  chk('FAIL missing R3_PHASE_PROGRAM artifact PHASE_PROGRAM_INVALID', hasViolation(artifact, 'PHASE_PROGRAM_INVALID'));
}

// ── FAIL: unknown checkpoint in state ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = 'BOGUS_CHECKPOINT';
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL unknown checkpoint rc!=0', r.status !== 0);
  chk(phase + ' FAIL unknown checkpoint STATE_CURRENT_CHECKPOINT_UNKNOWN', hasViolation(r.artifact, 'STATE_CURRENT_CHECKPOINT_UNKNOWN'));
}

// ── FAIL: bootstrap with enabled capability ──
for (const phase of PHASES) {
  const s = baseState(phase); s.enabledCapabilities = ['governance_bootstrap_present'];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL bootstrap+enabledCap rc!=0', r.status !== 0);
  chk(phase + ' FAIL bootstrap+enabledCap BOOTSTRAP_ENABLED_CAPS_NONEMPTY', hasViolation(r.artifact, 'BOOTSTRAP_ENABLED_CAPS_NONEMPTY'));
}

// ── FAIL: bootstrap with runtimeConsumersAllowed=true ──
for (const phase of PHASES) {
  const s = baseState(phase); s.runtimeConsumersAllowed = true;
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL bootstrap+runtimeAllowed', hasViolation(r.artifact, 'BOOTSTRAP_RUNTIME_CONSUMERS_ALLOWED') || hasViolation(r.artifact, 'FLAG_ENABLED_BELOW_FLOOR'));
}

// ── FAIL: enabled capability below floor ──
for (const phase of PHASES) {
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  void otherCheckpoint;
  const s = baseState(phase); s.enabledCapabilities = ['production_cap_present']; // floor is the second checkpoint, current is bootstrap
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL cap below floor', hasViolation(r.artifact, 'CAPABILITY_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'BOOTSTRAP_ENABLED_CAPS_NONEMPTY'));
}

// ── FAIL: wildcard authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: 'renderer/js/*.js', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL wildcard path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: absolute authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: '/etc/passwd', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL absolute path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: parent-segment authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: 'renderer/../etc/x.js', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL parent-segment path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: path outside allowedRoots ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: 'docs/whatever.md', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL outside allowedRoots', hasViolation(r.artifact, 'AUTH_PATH_OUTSIDE_ALLOWED_ROOTS'));
}

// ── FAIL: schema program mismatch ──
for (const phase of PHASES) {
  const sch = baseSchema(phase); sch.program = 'R9.9X';
  const dir = writeFixture(baseState(phase), sch, baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL schema program mismatch', hasViolation(r.artifact, 'SCHEMA_PROGRAM_MISMATCH'));
}

// ── FAIL: capability ledger missing entry ──
for (const phase of PHASES) {
  const caps = baseCapabilities(phase); delete caps.capabilities.production_cap_present;
  const dir = writeFixture(baseState(phase), baseSchema(phase), caps, baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL ledger missing cap', hasViolation(r.artifact, 'CAPABILITY_MISSING_IN_LEDGER'));
}

// ── FAIL: enabled capability with no authorized path (production capability) ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_HYPOTHESIS_ENGINE' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present']; // production capability without authorized path
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL enabled production cap without path', hasViolation(r.artifact, 'ENABLED_CAPABILITY_NO_AUTHORIZED_PATH'));
}

console.log('phase-governance: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
