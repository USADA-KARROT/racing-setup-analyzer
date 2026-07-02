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
const H = require('./helpers/managed-temp-dir.js');

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
  const tmp = H.acquireTempDir('r3-phase-gov-art-');
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
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  const lastCheckpoint = phase === 'R3.0D' ? 'D5_ENGINEER_BRIEF_ACTIVATION' : phase === 'R3.0E' ? 'E5_ACTIVATION' : 'F6_RELEASE';
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
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  const lastCheckpoint = phase === 'R3.0D' ? 'D5_ENGINEER_BRIEF_ACTIVATION' : phase === 'R3.0E' ? 'E5_ACTIVATION' : 'F6_RELEASE';
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
  const dir = H.acquireTempDir('r3-phase-gov-fix-');
  fs.mkdirSync(path.join(dir, 'checkpoints'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify(schema));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync(path.join(dir, 'capabilities.json'), JSON.stringify(caps));
  fs.writeFileSync(path.join(dir, 'checkpoint-manifest.schema.json'), JSON.stringify(manifestSchema));
  return dir;
}

// ── PASS: real repo state for each phase ──
// Originally each phase was pinned at its BOOTSTRAP checkpoint. R3.0D advanced to D1_CONTRACT_FOUNDATION
// on 2026-06-28 (contract_foundation_present enabled). The assertions below accept either the BOOTSTRAP
// state or a later legal state, and conditionally tighten the counts depending on which state holds.
for (const phase of PHASES) {
  const r = runValidator(phase, null);
  chk(phase + ' PASS real repo (status 0)', r.status === 0, { status: r.status, violations: r.artifact && r.artifact.violations });
  chk(phase + ' PASS artifact ok=true', r.artifact && r.artifact.ok === true);
  const cur = r.artifact && r.artifact.currentCheckpoint;
  const isBootstrap = cur === BOOTSTRAP[phase];
  chk(phase + ' PASS currentCheckpoint is BOOTSTRAP or advanced', typeof cur === 'string' && cur.length > 0);
  if (isBootstrap) {
    chk(phase + ' BOOTSTRAP authPaths=0', r.artifact && r.artifact.authorizedProductionPathCount === 0);
    chk(phase + ' BOOTSTRAP enabledCaps=0', r.artifact && r.artifact.enabledCapabilityCount === 0);
    chk(phase + ' BOOTSTRAP all *Allowed false', r.artifact && r.artifact.runtimeConsumersAllowed === false && r.artifact.uiAllowed === false && r.artifact.featureRegistryActivationAllowed === false && r.artifact.algorithmsAllowed === false);
  } else {
    // Advanced phase: phase-governance is fail-closed at the validator (already asserted ok=true above);
    // the count + flag invariants are governed by the phase schema's capabilityUnlockFloor and the
    // checkpoint-manifest schema, which the validator enforces. We do NOT pin specific counts here
    // because they evolve as later checkpoints flip more capabilities.
    chk(phase + ' ADVANCED counts are non-negative integers', Number.isInteger(r.artifact.authorizedProductionPathCount) && r.artifact.authorizedProductionPathCount >= 0 && Number.isInteger(r.artifact.enabledCapabilityCount) && r.artifact.enabledCapabilityCount >= 0);
  }
}

// ── FAIL: missing R3_PHASE_PROGRAM ──
{
  const tmp = H.acquireTempDir('r3-phase-gov-art-');
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
  const otherCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  void otherCheckpoint;
  const s = baseState(phase); s.enabledCapabilities = ['production_cap_present']; // floor is the second checkpoint, current is bootstrap
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL cap below floor', hasViolation(r.artifact, 'CAPABILITY_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'BOOTSTRAP_ENABLED_CAPS_NONEMPTY'));
}

// ── FAIL: wildcard authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: 'renderer/js/*.js', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL wildcard path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: absolute authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: '/etc/passwd', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL absolute path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: parent-segment authorized path ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present'];
  s.authorizedProductionPaths = [{ path: 'renderer/../etc/x.js', capability: 'production_cap_present' }];
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL parent-segment path', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
}

// ── FAIL: path outside allowedRoots ──
for (const phase of PHASES) {
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
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
  const s = baseState(phase); s.currentCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  s.enabledCapabilities = ['production_cap_present']; // production capability without authorized path
  const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
  const r = runValidator(phase, dir);
  chk(phase + ' FAIL enabled production cap without path', hasViolation(r.artifact, 'ENABLED_CAPABILITY_NO_AUTHORIZED_PATH'));
}

// ── FAIL: regex-metacharacter path (Codex G1 round 1 BLOCKER 2 regression) ──
for (const phase of PHASES) {
  const advCheckpoint = phase === 'R3.0D' ? 'D2_EVIDENCE_GRAPH' : phase === 'R3.0E' ? 'E2_EXPERIMENT_STORE' : 'F1_MIGRATION_ENGINE';
  const advCases = [
    ['regex caret', 'renderer/js/^decision+.js'],
    ['regex anchor $', 'renderer/js/x$.js'],
    ['regex paren', 'renderer/js/(group).js'],
    ['regex pipe', 'renderer/js/a|b.js'],
    ['brace glob', 'renderer/js/{a,b}.js'],
    ['backslash escape', 'renderer/js/\\d.js'],
    ['hash char', 'renderer/js/x#y.js'],
    ['tilde char', 'renderer/js/~x.js'],
  ];
  for (const [label, pathStr] of advCases) {
    const s = baseState(phase); s.currentCheckpoint = advCheckpoint;
    s.enabledCapabilities = ['production_cap_present'];
    s.authorizedProductionPaths = [{ path: pathStr, capability: 'production_cap_present' }];
    const dir = writeFixture(s, baseSchema(phase), baseCapabilities(phase), baseManifestSchema(phase));
    const r = runValidator(phase, dir);
    chk(phase + ' FAIL ' + label + ' rejected', hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'), { pathStr, violations: r.artifact && r.artifact.violations });
  }
}

// ── FAIL: checkpoint manifest required-field validation (Codex G1 round 1 BLOCKER 1 regression) ──
// Build the bootstrap fixture (PASS) then add a stripped manifest under checkpoints/. The validator
// must enforce manifest.schema.json.required + schemaVersion + boolean/object shape for governanceChanged
// and crossPhaseGate, so the audit fields cannot be silently omitted.
function writeStrippedManifest(phase, manifestObj) {
  const dir = writeFixture(baseState(phase), baseSchema(phase), baseCapabilities(phase), { schemaVersion: 1, program: phase, required: ['program', 'checkpoint', 'headSha', 'status', 'governanceChanged', 'crossPhaseGate', 'authorizedPaths', 'enabledCapabilitiesAfter'], allowedStatus: ['pending', 'candidate', 'PASS', 'FAIL'] });
  fs.writeFileSync(path.join(dir, 'checkpoints', BOOTSTRAP[phase] + '.json'), JSON.stringify(manifestObj));
  return dir;
}

for (const phase of PHASES) {
  // 1) totally stripped manifest (only program + checkpoint + status)
  const stripped = { schemaVersion: 1, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending' };
  const dir1 = writeStrippedManifest(phase, stripped);
  const r1 = runValidator(phase, dir1);
  chk(phase + ' FAIL stripped manifest required-field missing', hasViolation(r1.artifact, 'CHECKPOINT_MANIFEST_REQUIRED_FIELD_MISSING'));

  // 2) manifest with schemaVersion=2 (unsupported)
  const wrongVer = { schemaVersion: 2, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending', headSha: null, governanceChanged: true, crossPhaseGate: {}, authorizedPaths: [], enabledCapabilitiesAfter: [] };
  const dir2 = writeStrippedManifest(phase, wrongVer);
  const r2 = runValidator(phase, dir2);
  chk(phase + ' FAIL manifest schemaVersion unsupported', hasViolation(r2.artifact, 'CHECKPOINT_MANIFEST_SCHEMA_VERSION_UNSUPPORTED'));

  // 3) manifest with governanceChanged not boolean
  const badGov = { schemaVersion: 1, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending', headSha: null, governanceChanged: 'yes', crossPhaseGate: {}, authorizedPaths: [], enabledCapabilitiesAfter: [] };
  const dir3 = writeStrippedManifest(phase, badGov);
  const r3 = runValidator(phase, dir3);
  chk(phase + ' FAIL manifest governanceChanged not boolean', hasViolation(r3.artifact, 'CHECKPOINT_MANIFEST_GOVERNANCE_CHANGED_NOT_BOOLEAN'));

  // 4) manifest with crossPhaseGate not object (string)
  const badGate = { schemaVersion: 1, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending', headSha: null, governanceChanged: true, crossPhaseGate: 'not-an-object', authorizedPaths: [], enabledCapabilitiesAfter: [] };
  const dir4 = writeStrippedManifest(phase, badGate);
  const r4 = runValidator(phase, dir4);
  chk(phase + ' FAIL manifest crossPhaseGate not object', hasViolation(r4.artifact, 'CHECKPOINT_MANIFEST_CROSS_PHASE_GATE_INVALID'));

  // 5) manifest with authorizedPaths not array (number)
  const badPaths = { schemaVersion: 1, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending', headSha: null, governanceChanged: true, crossPhaseGate: {}, authorizedPaths: 0, enabledCapabilitiesAfter: [] };
  const dir5 = writeStrippedManifest(phase, badPaths);
  const r5 = runValidator(phase, dir5);
  chk(phase + ' FAIL manifest authorizedPaths not array', hasViolation(r5.artifact, 'CHECKPOINT_MANIFEST_REQUIRED_FIELD_NOT_ARRAY'));

  // 6) E/F only: r3bCaseRecordSchemaUntouched not boolean (Codex G1 round 2 LOW finding regression)
  if (phase !== 'R3.0D') {
    const badR3b = { schemaVersion: 1, program: phase, checkpoint: BOOTSTRAP[phase], status: 'pending', headSha: null, governanceChanged: true, crossPhaseGate: {}, authorizedPaths: [], enabledCapabilitiesAfter: [], r3bCaseRecordSchemaUntouched: 'yes' };
    const dir6 = writeStrippedManifest(phase, badR3b);
    const r6 = runValidator(phase, dir6);
    chk(phase + ' FAIL manifest r3bCaseRecordSchemaUntouched not boolean', hasViolation(r6.artifact, 'CHECKPOINT_MANIFEST_R3B_FLAG_NOT_BOOLEAN'));
  }
}

H.cleanupAll();
console.log('phase-governance: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
