/**
 * tests/r3-0c-governance.test.js — R3.0C C0 governance state validator.
 *
 * Covers schema/state/capabilities/manifest-schema validation, exact-path authorization rules,
 * capability unlock floors, *Allowed-flag floors, and the pinned C0 invariants. PASS asserts the
 * real-repo state; FAIL cases use temp-dir fixtures (R3_0C_GOV_DIR_OVERRIDE) so the test never
 * mutates the actual governance files. Each spawned validator runs as a child process and writes
 * its artifact under a per-test ARTIFACT_DIR; the test reads the artifact (the same JSON CI reads).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-0c-governance.js';

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(govDir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-gov-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  if (govDir) env.R3_0C_GOV_DIR_OVERRIDE = govDir;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-0c-governance.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '', tmp };
}

function hasViolation(artifact, code) {
  if (!artifact || !Array.isArray(artifact.violations)) return false;
  return artifact.violations.some(v => v.code === code);
}

function baseSchema() {
  return {
    schemaVersion: 1,
    program: 'R3.0C',
    checkpoints: ['C0_BOOTSTRAP', 'C1_PRODUCTION_ADAPTER', 'C2_LAP_AUTHORITY', 'C8_ACTIVATION'],
    checkpointOrder: ['C0_BOOTSTRAP', 'C1_PRODUCTION_ADAPTER', 'C2_LAP_AUTHORITY', 'C8_ACTIVATION'],
    transitions: { C0_BOOTSTRAP: ['C1_PRODUCTION_ADAPTER'], C1_PRODUCTION_ADAPTER: ['C2_LAP_AUTHORITY'], C2_LAP_AUTHORITY: ['C8_ACTIVATION'], C8_ACTIVATION: [] },
    capabilities: ['contract_foundation_present', 'governance_bootstrap_present', 'production_adapter_present', 'lap_authority_present', 'feature_registry_active'],
    governanceCapabilities: ['contract_foundation_present', 'governance_bootstrap_present'],
    productionCapabilities: ['production_adapter_present', 'lap_authority_present', 'feature_registry_active'],
    capabilityUnlockFloor: {
      contract_foundation_present: 'C0_BOOTSTRAP',
      governance_bootstrap_present: 'C0_BOOTSTRAP',
      production_adapter_present: 'C1_PRODUCTION_ADAPTER',
      lap_authority_present: 'C2_LAP_AUTHORITY',
      feature_registry_active: 'C8_ACTIVATION',
    },
    runtimeConsumerCheckpoint: 'C1_PRODUCTION_ADAPTER',
    algorithmCheckpoint: 'C2_LAP_AUTHORITY',
    uiCheckpoint: 'C8_ACTIVATION',
    featureRegistryActivationCheckpoint: 'C8_ACTIVATION',
    authorizedPathRules: { mustBeRepoRelative: true, mustBeExact: true, forbiddenSubstrings: ['..', '*', '?', '['], forbiddenPrefixes: ['/'], allowedRoots: ['renderer/js/', 'contracts/r3.0c/', 'main.js', 'preload.js', 'renderer/index.html'] },
  };
}

function baseCapabilities() {
  return {
    schemaVersion: 1,
    capabilities: {
      contract_foundation_present: { kind: 'contract', unlockFloor: 'C0_BOOTSTRAP', description: 'x' },
      governance_bootstrap_present: { kind: 'governance', unlockFloor: 'C0_BOOTSTRAP', description: 'x' },
      production_adapter_present: { kind: 'production', unlockFloor: 'C1_PRODUCTION_ADAPTER', description: 'x' },
      lap_authority_present: { kind: 'production', unlockFloor: 'C2_LAP_AUTHORITY', description: 'x' },
      feature_registry_active: { kind: 'activation', unlockFloor: 'C8_ACTIVATION', description: 'x' },
    },
  };
}

function baseManifestSchema() {
  return { schemaVersion: 1, required: ['program', 'checkpoint', 'headSha', 'status'], allowedStatus: ['pending', 'candidate', 'PASS', 'FAIL'] };
}

function baseC0State() {
  return {
    schemaVersion: 1,
    program: 'R3.0C',
    currentCheckpoint: 'C0_BOOTSTRAP',
    authorizedProductionPaths: [],
    enabledCapabilities: [],
    runtimeConsumersAllowed: false,
    uiAllowed: false,
    featureRegistryActivationAllowed: false,
    algorithmsAllowed: false,
  };
}

function writeFixture(opts) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-gov-fix-'));
  fs.mkdirSync(path.join(dir, 'checkpoints'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'schema.json'), JSON.stringify(opts.schema || baseSchema(), null, 2));
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(opts.state || baseC0State(), null, 2));
  fs.writeFileSync(path.join(dir, 'capabilities.json'), JSON.stringify(opts.capabilities || baseCapabilities(), null, 2));
  fs.writeFileSync(path.join(dir, 'checkpoint-manifest.schema.json'), JSON.stringify(opts.manifestSchema || baseManifestSchema(), null, 2));
  const c0 = opts.c0Manifest || { schemaVersion: 1, program: 'R3.0C', checkpoint: 'C0_BOOTSTRAP', headSha: null, status: 'pending' };
  fs.writeFileSync(path.join(dir, 'checkpoints', 'C0.json'), JSON.stringify(c0, null, 2));
  if (opts.extraCheckpoint) fs.writeFileSync(path.join(dir, 'checkpoints', opts.extraCheckpoint.name), JSON.stringify(opts.extraCheckpoint.body, null, 2));
  return dir;
}

// ── A. PASS: real repo state ──
(() => {
  const r = runValidator(null);
  chk('A1 real-repo validator exits 0', r.status === 0, r.stderr);
  chk('A2 real-repo ok===true', !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
  chk('A3 real-repo checkpoint=C3_NORMALIZED_DISTANCE', !!(r.artifact && r.artifact.currentCheckpoint === 'C3_NORMALIZED_DISTANCE'));
  chk('A4 real-repo authPathCount=5 (C1 adapter + 3 C2 services + C3 normalize-distance)', !!(r.artifact && r.artifact.authorizedProductionPathCount === 5));
  chk('A5 real-repo enabledCapCount=4 (production_adapter_present + lap_authority_present + track_identity_authoritative + normalized_distance_present)', !!(r.artifact && r.artifact.enabledCapabilityCount === 4));
  chk('A6 real-repo runtimeConsumers=true (C1 floor)', r.artifact && r.artifact.runtimeConsumersAllowed === true);
  chk('A7 real-repo uiAllowed=false (C7 floor)', r.artifact && r.artifact.uiAllowed === false);
  chk('A8 real-repo featureActivationAllowed=false (C8 floor)', r.artifact && r.artifact.featureRegistryActivationAllowed === false);
  chk('A9 real-repo algorithmsAllowed=true (C2 is algorithmCheckpoint per schema)', r.artifact && r.artifact.algorithmsAllowed === true);
})();

// ── B. schema.json invariants ──
(() => {
  const schema = baseSchema(); schema.schemaVersion = 2;
  const r = runValidator(writeFixture({ schema }));
  chk('B1 unknown schemaVersion FAILS', r.status !== 0 && hasViolation(r.artifact, 'SCHEMA_VERSION_UNSUPPORTED'));
})();
(() => {
  const state = baseC0State(); state.currentCheckpoint = 'C99_BOGUS';
  const r = runValidator(writeFixture({ state }));
  chk('B2 unknown currentCheckpoint FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_CURRENT_CHECKPOINT_UNKNOWN'));
})();
(() => {
  const schema = baseSchema(); schema.capabilities.push('contract_foundation_present');
  const r = runValidator(writeFixture({ schema }));
  chk('B3 duplicate capability in schema FAILS', r.status !== 0 && hasViolation(r.artifact, 'SCHEMA_CAPABILITIES_DUPLICATE'));
})();
(() => {
  const schema = baseSchema(); delete schema.capabilityUnlockFloor;
  const r = runValidator(writeFixture({ schema }));
  chk('B4 missing capabilityUnlockFloor FAILS', r.status !== 0 && hasViolation(r.artifact, 'SCHEMA_UNLOCK_FLOOR_MISSING'));
})();

// ── C. state.json fields ──
(() => {
  const state = baseC0State(); state.runtimeConsumersAllowed = 'yes';
  const r = runValidator(writeFixture({ state }));
  chk('C1 non-boolean flag FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_FLAG_NOT_BOOLEAN'));
})();
(() => {
  const state = baseC0State(); state.enabledCapabilities = 'all';
  const r = runValidator(writeFixture({ state }));
  chk('C2 enabledCapabilities non-array FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_ENABLED_CAPS_NOT_ARRAY'));
})();
(() => {
  const state = baseC0State(); state.authorizedProductionPaths = 'all';
  const r = runValidator(writeFixture({ state }));
  chk('C3 authorizedProductionPaths non-array FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_AUTHORIZED_PATHS_NOT_ARRAY'));
})();

// ── D. authorized-path format rules ──
function fxAuth(paths, opts) {
  const state = baseC0State();
  state.currentCheckpoint = (opts && opts.currentCheckpoint) || 'C1_PRODUCTION_ADAPTER';
  state.enabledCapabilities = (opts && opts.enabledCapabilities) || ['production_adapter_present'];
  state.authorizedProductionPaths = paths;
  return writeFixture({ state });
}
(() => {
  const r = runValidator(fxAuth([{ path: '../etc/passwd', capability: 'production_adapter_present' }]));
  chk('D1 ".." path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: '/etc/passwd', capability: 'production_adapter_present' }]));
  chk('D2 absolute path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'renderer/js/*.js', capability: 'production_adapter_present' }]));
  chk('D3 wildcard path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'renderer/js/?.js', capability: 'production_adapter_present' }]));
  chk('D4 glob "?" path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'renderer/js/[abc].js', capability: 'production_adapter_present' }]));
  chk('D5 glob "[" path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: '', capability: 'production_adapter_present' }]));
  chk('D6 empty path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_INVALID_FORMAT'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'tests/foo.js', capability: 'production_adapter_present' }]));
  chk('D7 path outside allowed roots FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_OUTSIDE_ALLOWED_ROOTS'));
})();
(() => {
  const r = runValidator(fxAuth([
    { path: 'renderer/js/foo.js', capability: 'production_adapter_present' },
    { path: 'renderer/js/foo.js', capability: 'production_adapter_present' },
  ]));
  chk('D8 duplicate path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_DUPLICATE'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'renderer/js/foo.js', capability: 'no_such_capability' }]));
  chk('D9 unknown capability in auth path FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_CAPABILITY_UNKNOWN'));
})();
(() => {
  const r = runValidator(fxAuth([{ path: 'renderer/js/foo.js', capability: 'lap_authority_present' }]));
  chk('D10 enabled-cap mismatch FAILS', r.status !== 0 && hasViolation(r.artifact, 'AUTH_PATH_CAPABILITY_NOT_ENABLED'));
})();

// ── E. capability ordering ──
(() => {
  const state = baseC0State();
  state.currentCheckpoint = 'C0_BOOTSTRAP';
  state.enabledCapabilities = ['production_adapter_present'];
  state.authorizedProductionPaths = [{ path: 'renderer/js/foo.js', capability: 'production_adapter_present' }];
  const r = runValidator(writeFixture({ state }));
  chk('E1 capability enabled below floor FAILS', r.status !== 0 && hasViolation(r.artifact, 'CAPABILITY_ENABLED_BELOW_FLOOR'));
})();
(() => {
  const state = baseC0State();
  state.currentCheckpoint = 'C1_PRODUCTION_ADAPTER';
  state.enabledCapabilities = ['production_adapter_present'];
  state.authorizedProductionPaths = [];
  const r = runValidator(writeFixture({ state }));
  chk('E2 enabled production cap without authorized path FAILS', r.status !== 0 && hasViolation(r.artifact, 'ENABLED_CAPABILITY_NO_AUTHORIZED_PATH'));
})();
(() => {
  const state = baseC0State(); state.enabledCapabilities = ['unknown_cap_xyz'];
  const r = runValidator(writeFixture({ state }));
  chk('E3 enabled unknown capability FAILS', r.status !== 0 && hasViolation(r.artifact, 'ENABLED_CAPABILITY_UNKNOWN'));
})();
(() => {
  const state = baseC0State(); state.enabledCapabilities = ['contract_foundation_present', 'contract_foundation_present'];
  const r = runValidator(writeFixture({ state }));
  chk('E4 duplicate enabled capability FAILS', r.status !== 0 && hasViolation(r.artifact, 'STATE_ENABLED_CAPS_DUPLICATE'));
})();

// ── F. *Allowed flag floors ──
(() => {
  const state = baseC0State(); state.runtimeConsumersAllowed = true;
  const r = runValidator(writeFixture({ state }));
  chk('F1 runtimeConsumersAllowed=true at C0 FAILS (below floor + C0 pinned)', r.status !== 0 && (hasViolation(r.artifact, 'FLAG_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'C0_RUNTIME_CONSUMERS_ALLOWED')));
})();
(() => {
  const state = baseC0State(); state.uiAllowed = true;
  const r = runValidator(writeFixture({ state }));
  chk('F2 uiAllowed=true at C0 FAILS', r.status !== 0 && (hasViolation(r.artifact, 'FLAG_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'C0_UI_ALLOWED')));
})();
(() => {
  const state = baseC0State(); state.featureRegistryActivationAllowed = true;
  const r = runValidator(writeFixture({ state }));
  chk('F3 featureActivation=true at C0 FAILS', r.status !== 0 && (hasViolation(r.artifact, 'FLAG_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'C0_FEATURE_ACTIVATION_ALLOWED')));
})();
(() => {
  const state = baseC0State(); state.algorithmsAllowed = true;
  const r = runValidator(writeFixture({ state }));
  chk('F4 algorithmsAllowed=true at C0 FAILS', r.status !== 0 && (hasViolation(r.artifact, 'FLAG_ENABLED_BELOW_FLOOR') || hasViolation(r.artifact, 'C0_ALGORITHMS_ALLOWED')));
})();

// ── G. C0 pinned invariants ──
(() => {
  const state = baseC0State(); state.authorizedProductionPaths = [{ path: 'renderer/js/foo.js', capability: 'contract_foundation_present' }];
  const r = runValidator(writeFixture({ state }));
  chk('G1 C0 with non-empty authorizedProductionPaths FAILS', r.status !== 0 && hasViolation(r.artifact, 'C0_AUTH_PATHS_NONEMPTY'));
})();
(() => {
  const state = baseC0State(); state.enabledCapabilities = ['contract_foundation_present'];
  const r = runValidator(writeFixture({ state }));
  chk('G2 C0 with non-empty enabledCapabilities FAILS', r.status !== 0 && hasViolation(r.artifact, 'C0_ENABLED_CAPS_NONEMPTY'));
})();

// ── H. capability ledger consistency ──
(() => {
  const capabilities = baseCapabilities();
  capabilities.capabilities.production_adapter_present.unlockFloor = 'C0_BOOTSTRAP';
  const r = runValidator(writeFixture({ capabilities }));
  chk('H1 ledger disagrees with schema unlockFloor FAILS', r.status !== 0 && hasViolation(r.artifact, 'CAPABILITY_UNLOCK_FLOOR_DISAGREES_SCHEMA'));
})();
(() => {
  const capabilities = baseCapabilities();
  capabilities.capabilities.bogus_cap = { kind: 'production', unlockFloor: 'C1_PRODUCTION_ADAPTER', description: 'x' };
  const r = runValidator(writeFixture({ capabilities }));
  chk('H2 ledger has cap not in schema FAILS', r.status !== 0 && hasViolation(r.artifact, 'CAPABILITY_UNKNOWN_IN_SCHEMA'));
})();
(() => {
  const capabilities = baseCapabilities();
  delete capabilities.capabilities.lap_authority_present;
  const r = runValidator(writeFixture({ capabilities }));
  chk('H3 ledger missing schema cap FAILS', r.status !== 0 && hasViolation(r.artifact, 'CAPABILITY_MISSING_IN_LEDGER'));
})();
(() => {
  const capabilities = baseCapabilities();
  capabilities.capabilities.contract_foundation_present.kind = 'mystery';
  const r = runValidator(writeFixture({ capabilities }));
  chk('H4 invalid capability kind FAILS', r.status !== 0 && hasViolation(r.artifact, 'CAPABILITY_KIND_INVALID'));
})();

// ── I. checkpoint manifest sanity ──
(() => {
  const r = runValidator(writeFixture({ extraCheckpoint: { name: 'C1.json', body: { schemaVersion: 1, program: 'R3.0C', checkpoint: 'C99_BOGUS', status: 'pending', headSha: null } } }));
  chk('I1 unknown checkpoint in manifest FAILS', r.status !== 0 && hasViolation(r.artifact, 'CHECKPOINT_MANIFEST_CHECKPOINT_UNKNOWN'));
})();
(() => {
  const r = runValidator(writeFixture({ c0Manifest: { schemaVersion: 1, program: 'R3.0C', checkpoint: 'C0_BOOTSTRAP', status: 'PROD_LOCK', headSha: null } }));
  chk('I2 invalid status in manifest FAILS', r.status !== 0 && hasViolation(r.artifact, 'CHECKPOINT_MANIFEST_STATUS_INVALID'));
})();

// ── J. internal failure fails closed ──
(() => {
  const r = runValidator('/this/path/should/never/exist/governance');
  chk('J1 missing governance dir → exit non-zero', r.status !== 0);
  chk('J2 missing governance dir → ok=false', !!(r.artifact && r.artifact.ok === false));
  chk('J3 missing governance dir → SCHEMA_UNREADABLE recorded', hasViolation(r.artifact, 'SCHEMA_UNREADABLE'));
})();

// ── K. validator exit code matches ok ──
(() => {
  const r = runValidator(null);
  chk('K1 real-repo exit==0 when ok==true', (r.status === 0) === !!(r.artifact && r.artifact.ok === true));
})();

console.log('r3-0c-governance: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
