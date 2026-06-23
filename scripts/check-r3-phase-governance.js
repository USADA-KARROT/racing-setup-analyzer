#!/usr/bin/env node
'use strict';
/**
 * R3.0 Integrated Delivery Train — per-phase governance state validator (D / E / F).
 *
 * Parameterized variant of scripts/check-r3-0c-governance.js (which validates R3.0C).
 * The phase to validate is selected by env R3_PHASE_PROGRAM (one of 'R3.0D', 'R3.0E', 'R3.0F').
 *
 * Reads the machine-readable governance scaffold under governance/<phase-dir>/ and asserts every
 * bootstrap invariant fail-closed: unknown schema/checkpoint/capability FAILS; wildcard/regex/glob/
 * absolute/.. paths FAIL; duplicate entries FAIL; capability enabled below its unlock floor FAILS;
 * activation flag set above its floor FAILS; enabledCapability with no matching authorizedPath FAILS;
 * authorizedPath with no enabling capability FAILS. Unconditional: no env can skip the validator.
 * Internal exceptions fail closed (ok=false, INTERNAL_VALIDATOR_FAILURE, exit code 2).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-<lower-dashed-program>-governance.json
 *         e.g. r3-0d-governance.json, r3-0e-governance.json, r3-0f-governance.json
 *         (exit 1 on violation; exit 2 on internal error)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

const PHASE_CONFIG = {
  'R3.0D': { dir: 'governance/r3.0d', artifact: 'r3-0d-governance.json', label: 'R3.0D-GOV' },
  'R3.0E': { dir: 'governance/r3.0e', artifact: 'r3-0e-governance.json', label: 'R3.0E-GOV' },
  'R3.0F': { dir: 'governance/r3.0f', artifact: 'r3-0f-governance.json', label: 'R3.0F-GOV' },
};

const PHASE_PROGRAM = String(process.env.R3_PHASE_PROGRAM || '').trim();
const PHASE = PHASE_CONFIG[PHASE_PROGRAM];

// Default scans the real governance dir derived from PHASE.dir. R3_PHASE_GOV_DIR_OVERRIDE is for test
// fixtures ONLY — it changes WHERE to look, never WHETHER to look.
const GOV_DIR_DEFAULT = PHASE ? path.join(REPO, PHASE.dir) : null;
const GOV_DIR = process.env.R3_PHASE_GOV_DIR_OVERRIDE ? path.resolve(process.env.R3_PHASE_GOV_DIR_OVERRIDE) : GOV_DIR_DEFAULT;

function readJson(rel) {
  const abs = path.isAbsolute(rel) ? rel : path.join(GOV_DIR, rel);
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function listCheckpointManifests() {
  const d = path.join(GOV_DIR, 'checkpoints');
  try { return fs.readdirSync(d).filter(f => f.endsWith('.json')).sort(); }
  catch (_) { return []; }
}

function checkpointIndex(order, id) { return order.indexOf(id); }

// Allowlist grammar for repo-relative production paths: each slash-delimited segment is
// [A-Za-z0-9_.-]+. This rejects every regex/glob metacharacter (^ $ + ? * ( ) | \ { } [ ] ~ #),
// every whitespace + control character, every absolute path (leading /), parent-segment traversal,
// and any character outside the conservative file-naming set. The earlier denylist let
// 'renderer/js/^decision+.js' and similar pseudo-glob/regex shapes through; the allowlist makes
// that fail-closed.
const SAFE_SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;
function validatePathString(p) {
  if (typeof p !== 'string' || p.length === 0) return 'empty';
  if (p.startsWith('/')) return 'absolute';
  if (p.includes('..')) return 'parent-segment';
  if (p !== p.trim()) return 'whitespace';
  if (/[\r\n\t]/.test(p)) return 'control-char';
  const segments = p.split('/');
  for (const seg of segments) {
    if (seg.length === 0) return 'empty-segment';
    if (!SAFE_SEGMENT_RE.test(seg)) return 'invalid-segment-char';
  }
  return null;
}

function isInAllowedRoot(p, roots) {
  for (const r of roots) {
    if (p === r) return true;
    if (r.endsWith('/') && p.startsWith(r)) return true;
  }
  return false;
}

function finish(payload) {
  return Object.assign({ check: PHASE ? ('r3-' + PHASE_PROGRAM.toLowerCase().replace('.', '-') + '-governance').replace('--', '-') : 'r3-phase-governance', program: PHASE_PROGRAM || null }, payload);
}

function run() {
  if (!PHASE) {
    return finish({ ok: false, violations: [{ code: 'PHASE_PROGRAM_INVALID', message: 'R3_PHASE_PROGRAM must be one of R3.0D / R3.0E / R3.0F; got ' + JSON.stringify(PHASE_PROGRAM) }], currentCheckpoint: null });
  }

  const violations = [];
  const fail = (code, msg, extra) => violations.push(Object.assign({ code, message: msg }, extra || {}));

  let schema, state, capabilities, manifestSchema;
  try { schema = readJson('schema.json'); }
  catch (e) { fail('SCHEMA_UNREADABLE', PHASE.dir + '/schema.json could not be read: ' + e.message); }
  try { state = readJson('state.json'); }
  catch (e) { fail('STATE_UNREADABLE', PHASE.dir + '/state.json could not be read: ' + e.message); }
  try { capabilities = readJson('capabilities.json'); }
  catch (e) { fail('CAPABILITIES_UNREADABLE', PHASE.dir + '/capabilities.json could not be read: ' + e.message); }
  try { manifestSchema = readJson('checkpoint-manifest.schema.json'); }
  catch (e) { fail('MANIFEST_SCHEMA_UNREADABLE', PHASE.dir + '/checkpoint-manifest.schema.json could not be read: ' + e.message); }

  if (violations.length) {
    return finish({ ok: false, violations, currentCheckpoint: null });
  }

  // ---- schema sanity ----
  if (schema.schemaVersion !== 1) fail('SCHEMA_VERSION_UNSUPPORTED', 'schema.json schemaVersion ' + schema.schemaVersion);
  if (schema.program !== PHASE_PROGRAM) fail('SCHEMA_PROGRAM_MISMATCH', 'schema.json program=' + schema.program + ' expected=' + PHASE_PROGRAM);
  if (!Array.isArray(schema.checkpoints) || schema.checkpoints.length === 0) fail('SCHEMA_CHECKPOINTS_EMPTY', 'schema.checkpoints missing');
  if (!Array.isArray(schema.checkpointOrder)) fail('SCHEMA_ORDER_MISSING', 'schema.checkpointOrder missing');
  if (Array.isArray(schema.checkpointOrder) && Array.isArray(schema.checkpoints)) {
    const a = schema.checkpointOrder.slice().sort();
    const b = schema.checkpoints.slice().sort();
    if (a.join('|') !== b.join('|')) fail('SCHEMA_ORDER_MISMATCH', 'checkpointOrder vs checkpoints differ');
  }
  if (!Array.isArray(schema.capabilities)) fail('SCHEMA_CAPABILITIES_MISSING', 'schema.capabilities missing');
  if (Array.isArray(schema.capabilities) && new Set(schema.capabilities).size !== schema.capabilities.length) fail('SCHEMA_CAPABILITIES_DUPLICATE', 'duplicate capability names in schema');
  if (!schema.capabilityUnlockFloor || typeof schema.capabilityUnlockFloor !== 'object') fail('SCHEMA_UNLOCK_FLOOR_MISSING', 'capabilityUnlockFloor missing');
  if (typeof schema.runtimeConsumerCheckpoint !== 'string') fail('SCHEMA_RUNTIME_CHECKPOINT_MISSING', 'runtimeConsumerCheckpoint missing');
  if (typeof schema.algorithmCheckpoint !== 'string') fail('SCHEMA_ALGORITHM_CHECKPOINT_MISSING', 'algorithmCheckpoint missing');
  if (typeof schema.uiCheckpoint !== 'string') fail('SCHEMA_UI_CHECKPOINT_MISSING', 'uiCheckpoint missing');
  if (typeof schema.featureRegistryActivationCheckpoint !== 'string') fail('SCHEMA_ACTIVATION_CHECKPOINT_MISSING', 'featureRegistryActivationCheckpoint missing');
  if (typeof schema.bootstrapCheckpoint !== 'string') fail('SCHEMA_BOOTSTRAP_CHECKPOINT_MISSING', 'bootstrapCheckpoint missing');
  if (typeof schema.contractPrefix !== 'string' || !schema.contractPrefix.length) fail('SCHEMA_CONTRACT_PREFIX_MISSING', 'contractPrefix missing');
  if (!schema.authorizedPathRules || typeof schema.authorizedPathRules !== 'object') fail('SCHEMA_PATH_RULES_MISSING', 'authorizedPathRules missing');

  // ---- capability ledger sanity ----
  if (capabilities.schemaVersion !== 1) fail('CAPABILITIES_VERSION_UNSUPPORTED', 'capabilities.json schemaVersion ' + capabilities.schemaVersion);
  if (capabilities.program !== PHASE_PROGRAM) fail('CAPABILITIES_PROGRAM_MISMATCH', 'capabilities.program=' + capabilities.program + ' expected=' + PHASE_PROGRAM);
  if (!capabilities.capabilities || typeof capabilities.capabilities !== 'object') fail('CAPABILITIES_TABLE_MISSING', 'capabilities.capabilities missing');
  if (capabilities.capabilities && Array.isArray(schema.capabilities)) {
    const ledgerIds = Object.keys(capabilities.capabilities);
    const schemaIds = schema.capabilities;
    for (const id of ledgerIds) if (!schemaIds.includes(id)) fail('CAPABILITY_UNKNOWN_IN_SCHEMA', 'capability ' + id + ' in ledger but not in schema', { capability: id });
    for (const id of schemaIds) if (!ledgerIds.includes(id)) fail('CAPABILITY_MISSING_IN_LEDGER', 'capability ' + id + ' in schema but not in ledger', { capability: id });
    for (const id of ledgerIds) {
      const c = capabilities.capabilities[id];
      if (!c || typeof c !== 'object') { fail('CAPABILITY_ENTRY_INVALID', id, { capability: id }); continue; }
      if (!['contract', 'governance', 'production', 'activation'].includes(c.kind)) fail('CAPABILITY_KIND_INVALID', id + ' kind=' + c.kind, { capability: id });
      if (!schema.capabilityUnlockFloor || !schema.checkpoints.includes(c.unlockFloor)) fail('CAPABILITY_UNLOCK_FLOOR_INVALID', id + ' unlockFloor=' + c.unlockFloor, { capability: id });
      const expected = schema.capabilityUnlockFloor && schema.capabilityUnlockFloor[id];
      if (expected && c.unlockFloor !== expected) fail('CAPABILITY_UNLOCK_FLOOR_DISAGREES_SCHEMA', id + ' ledger=' + c.unlockFloor + ' schema=' + expected, { capability: id });
    }
  }

  // ---- checkpoint manifest schema sanity ----
  if (manifestSchema.schemaVersion !== 1) fail('MANIFEST_SCHEMA_VERSION_UNSUPPORTED', 'manifest schemaVersion ' + manifestSchema.schemaVersion);
  if (manifestSchema.program !== PHASE_PROGRAM) fail('MANIFEST_SCHEMA_PROGRAM_MISMATCH', 'manifest.program=' + manifestSchema.program);
  if (!Array.isArray(manifestSchema.required) || manifestSchema.required.length === 0) fail('MANIFEST_SCHEMA_REQUIRED_MISSING', 'manifest.required missing');
  if (!Array.isArray(manifestSchema.allowedStatus)) fail('MANIFEST_SCHEMA_STATUS_LIST_MISSING', 'manifest.allowedStatus missing');

  // ---- state sanity ----
  if (state.schemaVersion !== 1) fail('STATE_VERSION_UNSUPPORTED', 'state.schemaVersion ' + state.schemaVersion);
  if (state.program !== PHASE_PROGRAM) fail('STATE_PROGRAM_MISMATCH', 'state.program=' + state.program);

  const currentCheckpoint = state.currentCheckpoint;
  if (!schema.checkpoints.includes(currentCheckpoint)) fail('STATE_CURRENT_CHECKPOINT_UNKNOWN', 'currentCheckpoint=' + currentCheckpoint);

  if (!Array.isArray(state.authorizedProductionPaths)) fail('STATE_AUTHORIZED_PATHS_NOT_ARRAY', 'authorizedProductionPaths must be array');
  if (!Array.isArray(state.enabledCapabilities)) fail('STATE_ENABLED_CAPS_NOT_ARRAY', 'enabledCapabilities must be array');
  for (const k of ['runtimeConsumersAllowed', 'uiAllowed', 'featureRegistryActivationAllowed', 'algorithmsAllowed']) {
    if (typeof state[k] !== 'boolean') fail('STATE_FLAG_NOT_BOOLEAN', k + '=' + state[k]);
  }

  // ---- enabled capabilities ----
  const enabled = Array.isArray(state.enabledCapabilities) ? state.enabledCapabilities : [];
  if (new Set(enabled).size !== enabled.length) fail('STATE_ENABLED_CAPS_DUPLICATE', 'duplicate capability in enabledCapabilities');
  const curIdx = checkpointIndex(schema.checkpointOrder, currentCheckpoint);
  for (const cap of enabled) {
    if (!schema.capabilities.includes(cap)) { fail('ENABLED_CAPABILITY_UNKNOWN', cap, { capability: cap }); continue; }
    const floor = schema.capabilityUnlockFloor[cap];
    const floorIdx = checkpointIndex(schema.checkpointOrder, floor);
    if (floorIdx < 0) { fail('ENABLED_CAPABILITY_NO_FLOOR', cap, { capability: cap }); continue; }
    if (curIdx < floorIdx) fail('CAPABILITY_ENABLED_BELOW_FLOOR', cap + ' floor=' + floor + ' current=' + currentCheckpoint, { capability: cap });
  }

  // ---- authorized paths ----
  const authPathsRaw = Array.isArray(state.authorizedProductionPaths) ? state.authorizedProductionPaths : [];
  const pathSeen = new Set();
  const capToPaths = new Map();
  const rules = schema.authorizedPathRules || {};
  const allowedRoots = Array.isArray(rules.allowedRoots) ? rules.allowedRoots : [];
  for (const entry of authPathsRaw) {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) { fail('AUTH_PATH_ENTRY_INVALID', 'expected object {path, capability}', { entry }); continue; }
    const p = entry.path, cap = entry.capability;
    if (typeof p !== 'string') { fail('AUTH_PATH_NOT_STRING', 'path missing/non-string', { entry }); continue; }
    const reason = validatePathString(p);
    if (reason) { fail('AUTH_PATH_INVALID_FORMAT', p + ' (' + reason + ')', { path: p, reason }); continue; }
    if (allowedRoots.length && !isInAllowedRoot(p, allowedRoots)) { fail('AUTH_PATH_OUTSIDE_ALLOWED_ROOTS', p, { path: p }); continue; }
    if (pathSeen.has(p)) { fail('AUTH_PATH_DUPLICATE', p, { path: p }); continue; }
    pathSeen.add(p);
    if (typeof cap !== 'string' || cap.length === 0) { fail('AUTH_PATH_CAPABILITY_MISSING', p, { path: p }); continue; }
    if (!schema.capabilities.includes(cap)) { fail('AUTH_PATH_CAPABILITY_UNKNOWN', p + ' -> ' + cap, { path: p, capability: cap }); continue; }
    if (!enabled.includes(cap)) fail('AUTH_PATH_CAPABILITY_NOT_ENABLED', p + ' -> ' + cap, { path: p, capability: cap });
    const floor = schema.capabilityUnlockFloor[cap];
    if (checkpointIndex(schema.checkpointOrder, floor) > curIdx) fail('AUTH_PATH_CHECKPOINT_BELOW_FLOOR', p + ' -> ' + cap + ' floor=' + floor + ' current=' + currentCheckpoint, { path: p, capability: cap });
    if (!capToPaths.has(cap)) capToPaths.set(cap, []);
    capToPaths.get(cap).push(p);
  }
  const govCaps = new Set(schema.governanceCapabilities || []);
  for (const cap of enabled) {
    if (govCaps.has(cap)) continue;
    const ledgerEntry = capabilities && capabilities.capabilities && capabilities.capabilities[cap];
    const kind = ledgerEntry && ledgerEntry.kind;
    if (kind === 'governance' || kind === 'contract') continue;
    if (!capToPaths.has(cap)) fail('ENABLED_CAPABILITY_NO_AUTHORIZED_PATH', cap, { capability: cap });
  }

  // ---- *Allowed flag floors ----
  const floors = {
    runtimeConsumersAllowed: schema.runtimeConsumerCheckpoint,
    algorithmsAllowed: schema.algorithmCheckpoint,
    uiAllowed: schema.uiCheckpoint,
    featureRegistryActivationAllowed: schema.featureRegistryActivationCheckpoint,
  };
  for (const k of Object.keys(floors)) {
    if (state[k] === true) {
      const fIdx = checkpointIndex(schema.checkpointOrder, floors[k]);
      if (curIdx < fIdx) fail('FLAG_ENABLED_BELOW_FLOOR', k + ' floor=' + floors[k] + ' current=' + currentCheckpoint, { flag: k });
    }
  }

  // ---- bootstrap fixed invariants (defence in depth) ----
  if (currentCheckpoint === schema.bootstrapCheckpoint) {
    if (authPathsRaw.length !== 0) fail('BOOTSTRAP_AUTH_PATHS_NONEMPTY', schema.bootstrapCheckpoint + ' must have zero authorizedProductionPaths');
    if (enabled.length !== 0) fail('BOOTSTRAP_ENABLED_CAPS_NONEMPTY', schema.bootstrapCheckpoint + ' must have zero enabledCapabilities');
    if (state.runtimeConsumersAllowed !== false) fail('BOOTSTRAP_RUNTIME_CONSUMERS_ALLOWED', 'must be false at bootstrap');
    if (state.uiAllowed !== false) fail('BOOTSTRAP_UI_ALLOWED', 'must be false at bootstrap');
    if (state.featureRegistryActivationAllowed !== false) fail('BOOTSTRAP_FEATURE_ACTIVATION_ALLOWED', 'must be false at bootstrap');
    if (state.algorithmsAllowed !== false) fail('BOOTSTRAP_ALGORITHMS_ALLOWED', 'must be false at bootstrap');
  }

  // ---- per-checkpoint manifests: program + checkpoint + status + required-field shape ----
  // The manifest schema's `required` list is the audit contract. Every required key must be present
  // (not undefined) AND non-empty array fields must actually be arrays. A stripped manifest that
  // omits governanceChanged / crossPhaseGate / r3bCaseRecordSchemaUntouched / authorizedPaths must
  // fail closed — otherwise the train validator's cross-phase / governance-visibility / frozen-path
  // assertions can be bypassed by simply deleting the keys.
  const seenManifests = listCheckpointManifests();
  const requiredManifestFields = Array.isArray(manifestSchema.required) ? manifestSchema.required : [];
  const arrayManifestFields = new Set(['authorizedPaths', 'enabledCapabilitiesBefore', 'enabledCapabilitiesAfter', 'forbiddenCapabilities']);
  for (const f of seenManifests) {
    let m;
    try { m = readJson(path.join('checkpoints', f)); } catch (e) { fail('CHECKPOINT_MANIFEST_UNREADABLE', f + ': ' + e.message, { file: PHASE.dir + '/checkpoints/' + f }); continue; }
    if (!m || m.program !== PHASE_PROGRAM) { fail('CHECKPOINT_MANIFEST_PROGRAM_MISMATCH', f, { file: PHASE.dir + '/checkpoints/' + f }); continue; }
    if (typeof m.schemaVersion !== 'number' || m.schemaVersion !== 1) fail('CHECKPOINT_MANIFEST_SCHEMA_VERSION_UNSUPPORTED', f + ' schemaVersion=' + m.schemaVersion, { file: PHASE.dir + '/checkpoints/' + f });
    if (!schema.checkpoints.includes(m.checkpoint)) fail('CHECKPOINT_MANIFEST_CHECKPOINT_UNKNOWN', f + ' checkpoint=' + m.checkpoint, { file: PHASE.dir + '/checkpoints/' + f });
    if (m.status && !manifestSchema.allowedStatus.includes(m.status)) fail('CHECKPOINT_MANIFEST_STATUS_INVALID', f + ' status=' + m.status, { file: PHASE.dir + '/checkpoints/' + f });
    for (const key of requiredManifestFields) {
      if (!(key in m)) { fail('CHECKPOINT_MANIFEST_REQUIRED_FIELD_MISSING', f + ' missing ' + key, { file: PHASE.dir + '/checkpoints/' + f, field: key }); continue; }
      if (arrayManifestFields.has(key) && !Array.isArray(m[key])) fail('CHECKPOINT_MANIFEST_REQUIRED_FIELD_NOT_ARRAY', f + ' ' + key + ' must be array', { file: PHASE.dir + '/checkpoints/' + f, field: key });
    }
    if ('governanceChanged' in m && typeof m.governanceChanged !== 'boolean') fail('CHECKPOINT_MANIFEST_GOVERNANCE_CHANGED_NOT_BOOLEAN', f + ' governanceChanged=' + m.governanceChanged, { file: PHASE.dir + '/checkpoints/' + f });
    if ('crossPhaseGate' in m && (m.crossPhaseGate == null || typeof m.crossPhaseGate !== 'object' || Array.isArray(m.crossPhaseGate))) fail('CHECKPOINT_MANIFEST_CROSS_PHASE_GATE_INVALID', f + ' crossPhaseGate must be object', { file: PHASE.dir + '/checkpoints/' + f });
    if (PHASE_PROGRAM !== 'R3.0D' && 'r3bCaseRecordSchemaUntouched' in m && typeof m.r3bCaseRecordSchemaUntouched !== 'boolean') fail('CHECKPOINT_MANIFEST_R3B_FLAG_NOT_BOOLEAN', f + ' r3bCaseRecordSchemaUntouched=' + m.r3bCaseRecordSchemaUntouched, { file: PHASE.dir + '/checkpoints/' + f });
  }

  return finish({
    ok: violations.length === 0,
    violations,
    schemaVersion: state && state.schemaVersion,
    currentCheckpoint,
    authorizedProductionPaths: authPathsRaw.map(e => (e && e.path) || null).filter(Boolean),
    authorizedProductionPathCount: authPathsRaw.length,
    enabledCapabilities: enabled,
    enabledCapabilityCount: enabled.length,
    runtimeConsumersAllowed: !!state.runtimeConsumersAllowed,
    uiAllowed: !!state.uiAllowed,
    featureRegistryActivationAllowed: !!state.featureRegistryActivationAllowed,
    algorithmsAllowed: !!state.algorithmsAllowed,
    checkpointManifests: seenManifests,
  });
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = finish({
    ok: false,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
    currentCheckpoint: null,
    authorizedProductionPathCount: -1,
    enabledCapabilityCount: -1,
    runtimeConsumersAllowed: null,
    uiAllowed: null,
    featureRegistryActivationAllowed: null,
    algorithmsAllowed: null,
  });
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
const outName = PHASE ? PHASE.artifact : 'r3-phase-governance.json';
fs.writeFileSync(path.join(ARTIFACT_DIR, outName), JSON.stringify(result, null, 2));
const label = PHASE ? PHASE.label : 'R3-PHASE-GOV';
console.log(label + ' ' + JSON.stringify({
  program: result.program,
  currentCheckpoint: result.currentCheckpoint,
  authPaths: result.authorizedProductionPathCount,
  enabledCaps: result.enabledCapabilityCount,
  runtime: result.runtimeConsumersAllowed,
  ui: result.uiAllowed,
  activation: result.featureRegistryActivationAllowed,
  algorithms: result.algorithmsAllowed,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
