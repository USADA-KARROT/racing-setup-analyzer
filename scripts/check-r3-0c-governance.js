#!/usr/bin/env node
'use strict';
/**
 * R3.0C C0 — Governance state validator.
 *
 * Reads the machine-readable governance scaffold under governance/r3.0c/ and asserts every C0 invariant
 * fail-closed: unknown schema/checkpoint/capability FAILS; wildcard/regex/glob/absolute/.. paths FAIL;
 * duplicate entries FAIL; capability enabled below its unlock floor FAILS; activation flag set above its
 * floor FAILS; enabledCapability with no matching authorizedPath FAILS; authorizedPath with no enabling
 * capability FAILS. The checker is unconditional — there is no env bypass and no "this PR did not touch
 * R3.0C" short-circuit.
 *
 * For C0 the expected state is:
 *   currentCheckpoint = C0_BOOTSTRAP
 *   authorizedProductionPaths = []
 *   enabledCapabilities = []
 *   runtimeConsumersAllowed = false
 *   uiAllowed = false
 *   featureRegistryActivationAllowed = false
 *   algorithmsAllowed = false
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0c-governance.json   (exit 1 on violation; exit 2 on internal error)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
// Default scans the real governance dir. R3_0C_GOV_DIR_OVERRIDE is for test fixtures ONLY — it changes
// WHERE to look, never WHETHER to look. There is no skip-this-check switch.
const GOV_DIR = process.env.R3_0C_GOV_DIR_OVERRIDE ? path.resolve(process.env.R3_0C_GOV_DIR_OVERRIDE) : path.join(REPO, 'governance', 'r3.0c');

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

function validatePathString(p) {
  if (typeof p !== 'string' || p.length === 0) return 'empty';
  if (p.startsWith('/')) return 'absolute';
  if (p.includes('..')) return 'parent-segment';
  if (/[\*\?\[\]]/.test(p)) return 'wildcard-or-glob';
  if (/[\r\n\t]/.test(p)) return 'control-char';
  if (p !== p.trim()) return 'whitespace';
  return null;
}

function isInAllowedRoot(p, roots) {
  for (const r of roots) {
    if (p === r) return true;
    if (r.endsWith('/') && p.startsWith(r)) return true;
  }
  return false;
}

function run() {
  const violations = [];
  const fail = (code, msg, extra) => violations.push(Object.assign({ code, message: msg }, extra || {}));

  let schema, state, capabilities, manifestSchema;
  try { schema = readJson('schema.json'); }
  catch (e) { fail('SCHEMA_UNREADABLE', 'governance/r3.0c/schema.json could not be read: ' + e.message); }
  try { state = readJson('state.json'); }
  catch (e) { fail('STATE_UNREADABLE', 'governance/r3.0c/state.json could not be read: ' + e.message); }
  try { capabilities = readJson('capabilities.json'); }
  catch (e) { fail('CAPABILITIES_UNREADABLE', 'governance/r3.0c/capabilities.json could not be read: ' + e.message); }
  try { manifestSchema = readJson('checkpoint-manifest.schema.json'); }
  catch (e) { fail('MANIFEST_SCHEMA_UNREADABLE', 'governance/r3.0c/checkpoint-manifest.schema.json could not be read: ' + e.message); }

  if (violations.length) {
    return finish({ ok: false, violations, currentCheckpoint: null });
  }

  // ---- schema sanity ----
  if (schema.schemaVersion !== 1) fail('SCHEMA_VERSION_UNSUPPORTED', 'schema.json schemaVersion ' + schema.schemaVersion);
  if (schema.program !== 'R3.0C') fail('SCHEMA_PROGRAM_MISMATCH', 'schema.json program=' + schema.program);
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
  if (!schema.authorizedPathRules || typeof schema.authorizedPathRules !== 'object') fail('SCHEMA_PATH_RULES_MISSING', 'authorizedPathRules missing');

  // ---- capability ledger sanity ----
  if (capabilities.schemaVersion !== 1) fail('CAPABILITIES_VERSION_UNSUPPORTED', 'capabilities.json schemaVersion ' + capabilities.schemaVersion);
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
  if (!Array.isArray(manifestSchema.required) || manifestSchema.required.length === 0) fail('MANIFEST_SCHEMA_REQUIRED_MISSING', 'manifest.required missing');
  if (!Array.isArray(manifestSchema.allowedStatus)) fail('MANIFEST_SCHEMA_STATUS_LIST_MISSING', 'manifest.allowedStatus missing');

  // ---- state sanity ----
  if (state.schemaVersion !== 1) fail('STATE_VERSION_UNSUPPORTED', 'state.schemaVersion ' + state.schemaVersion);
  if (state.program !== 'R3.0C') fail('STATE_PROGRAM_MISMATCH', 'state.program=' + state.program);

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
  const pathToCap = new Map();
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
    pathToCap.set(p, cap);
    if (!capToPaths.has(cap)) capToPaths.set(cap, []);
    capToPaths.get(cap).push(p);
  }
  // Each enabled PRODUCTION capability must have ≥1 authorized path. Governance/contract capabilities do not require paths.
  const govCaps = new Set(schema.governanceCapabilities || []);
  for (const cap of enabled) {
    if (govCaps.has(cap)) continue;
    const ledgerEntry = capabilities && capabilities.capabilities && capabilities.capabilities[cap];
    const kind = ledgerEntry && ledgerEntry.kind;
    if (kind === 'governance' || kind === 'contract') continue;
    if (!capToPaths.has(cap)) fail('ENABLED_CAPABILITY_NO_AUTHORIZED_PATH', cap, { capability: cap });
  }

  // ---- activation / runtime-consumer / UI / algorithms floors ----
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

  // ---- C0 fixed invariants (defence in depth — repeats above checks but pinned to C0) ----
  if (currentCheckpoint === 'C0_BOOTSTRAP') {
    if (authPathsRaw.length !== 0) fail('C0_AUTH_PATHS_NONEMPTY', 'C0 must have zero authorizedProductionPaths');
    if (enabled.length !== 0) fail('C0_ENABLED_CAPS_NONEMPTY', 'C0 must have zero enabledCapabilities');
    if (state.runtimeConsumersAllowed !== false) fail('C0_RUNTIME_CONSUMERS_ALLOWED', 'must be false at C0');
    if (state.uiAllowed !== false) fail('C0_UI_ALLOWED', 'must be false at C0');
    if (state.featureRegistryActivationAllowed !== false) fail('C0_FEATURE_ACTIVATION_ALLOWED', 'must be false at C0');
    if (state.algorithmsAllowed !== false) fail('C0_ALGORITHMS_ALLOWED', 'must be false at C0');
  }

  // ---- per-checkpoint manifests must point at known checkpoints ----
  const seenManifests = listCheckpointManifests();
  for (const f of seenManifests) {
    let m;
    try { m = readJson(path.join('checkpoints', f)); } catch (e) { fail('CHECKPOINT_MANIFEST_UNREADABLE', f + ': ' + e.message, { file: 'governance/r3.0c/checkpoints/' + f }); continue; }
    if (!m || m.program !== 'R3.0C') { fail('CHECKPOINT_MANIFEST_PROGRAM_MISMATCH', f, { file: 'governance/r3.0c/checkpoints/' + f }); continue; }
    if (!schema.checkpoints.includes(m.checkpoint)) fail('CHECKPOINT_MANIFEST_CHECKPOINT_UNKNOWN', f + ' checkpoint=' + m.checkpoint, { file: 'governance/r3.0c/checkpoints/' + f });
    if (m.status && !manifestSchema.allowedStatus.includes(m.status)) fail('CHECKPOINT_MANIFEST_STATUS_INVALID', f + ' status=' + m.status, { file: 'governance/r3.0c/checkpoints/' + f });
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

function finish(payload) { return Object.assign({ check: 'r3-0c-governance' }, payload); }

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = {
    check: 'r3-0c-governance',
    ok: false,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
    currentCheckpoint: null,
    authorizedProductionPathCount: -1,
    enabledCapabilityCount: -1,
    runtimeConsumersAllowed: null,
    uiAllowed: null,
    featureRegistryActivationAllowed: null,
    algorithmsAllowed: null,
  };
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'r3-0c-governance.json'), JSON.stringify(result, null, 2));
console.log('R3.0C-GOV ' + JSON.stringify({
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
