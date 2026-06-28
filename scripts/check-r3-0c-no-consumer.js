#!/usr/bin/env node
'use strict';
/**
 * R3.0C — No-unauthorized-runtime-consumer validator (state-aware from C1).
 *
 * Independent of the existing scope guard (which inspects the PR diff). This validator inspects the
 * CURRENT WORKING-TREE STATE: it confirms that no UNAUTHORIZED production code path consumes
 * contracts/r3.0c/ at runtime. Specifically:
 *
 *   1. renderer/js/*.js files that require / import anything under contracts/r3.0c are FAIL unless
 *      the file's repo-relative path is listed in governance/r3.0c/state.json
 *      authorizedProductionPaths[].path AND that entry's capability is in
 *      state.enabledCapabilities AND state.runtimeConsumersAllowed === true AND
 *      state.currentCheckpoint is at or beyond schema.runtimeConsumerCheckpoint (= C1).
 *   2. main.js / preload.js MUST NOT require contracts/r3.0c at any checkpoint (renderer-tree only).
 *   3. renderer/index.html MUST NOT carry <script src="..."> pointing into contracts/r3.0c or
 *      naming any R3.0C feature module (reference-lap / corner-delta / case-comparison) until UI is
 *      authorized at C7_UI / activation at C8_ACTIVATION (a later checkpoint will widen this rule).
 *   4. renderer/js/feature-registry.js MUST still mark case_comparison / reference_lap / corner_delta
 *      as deferred (availability='deferred', deferredReason='R3.0C', no rendererAdapter) until
 *      featureRegistryActivationAllowed flips at C8_ACTIVATION.
 *
 * Tests under tests/ and docs under docs/ ARE allowed to reference contracts/r3.0c.
 *
 * State awareness: at C0 (runtimeConsumersAllowed=false, authorizedProductionPaths=[]) the validator
 * is functionally identical to the C0 hardcoded version — any consumer is unauthorized. From C1 the
 * adapter file in authorizedProductionPaths becomes an AUTHORIZED consumer; everything else is
 * still blocked. Capability monotonicity (state.runtimeConsumersAllowed=true is never paired with
 * an empty authorized list silently) is checked by the governance validator, not here.
 *
 * Unconditional: this runs every PR and every push to main; it cannot be skipped by env flags.
 * Internal exceptions fail closed (ok=false, exit 2).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0c-no-consumer.json   (exit 1 on violation; exit 2 on internal error)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');
// SCAN_BASE defaults to the real repo. R3_0C_NO_CONSUMER_BASE_OVERRIDE is for test fixtures ONLY —
// it changes WHERE to scan, never WHETHER to scan. Tests set it to a synthetic directory tree.
const SCAN_BASE = process.env.R3_0C_NO_CONSUMER_BASE_OVERRIDE ? path.resolve(process.env.R3_0C_NO_CONSUMER_BASE_OVERRIDE) : REPO;
// FIXTURE_FEATURES_JSON is for test fixtures ONLY — it overrides the in-memory FEATURES object so the
// fail paths (rendererAdapter present, availability flipped) can be exercised. When unset, the real
// renderer/js/feature-registry.js is required statically (dependency-audit friendly).
const FIXTURE_FEATURES_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON || '';
// FIXTURE_STATE_JSON is for test fixtures ONLY — it overrides the in-memory R3.0C state object so the
// state-aware allow / deny paths can be exercised without writing a fixture state.json on disk. When
// unset, the validator reads governance/r3.0c/state.json + governance/r3.0c/schema.json from SCAN_BASE.
const FIXTURE_STATE_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_STATE_JSON || '';
const FIXTURE_SCHEMA_JSON = process.env.R3_0C_NO_CONSUMER_FIXTURE_SCHEMA_JSON || '';

const CONTRACT_PREFIX = 'contracts/r3.0c';
const R3_0C_FEATURE_NAME_RE = /(reference[-_]?lap|corner[-_]?delta|case[-_]?comparison)/i;
// Match require/import call argument strings that resolve into contracts/r3.0c.
const REQUIRE_STR_RE = /(?:require|import)\s*\(\s*(['"`])((?:[^'"`\\]|\\.)*)\1\s*\)/g;
const IMPORT_FROM_RE = /import\s+(?:[^'"`]+?\s+from\s+)?(['"`])((?:[^'"`\\]|\\.)*)\1/g;

function listJsFiles(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push.apply(out, listJsFiles(full));
    else if (e.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

function resolvedTargetIfContract(fromFile, spec) {
  // Resolve a relative specifier from the importing file and report whether it lands inside contracts/r3.0c
  // relative to SCAN_BASE (which equals REPO in production; tests override it).
  if (typeof spec !== 'string' || spec.length === 0) return null;
  if (!(spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..')) return null;
  const abs = path.resolve(path.dirname(fromFile), spec);
  const rel = path.relative(SCAN_BASE, abs).split(path.sep).join('/');
  if (rel === CONTRACT_PREFIX || rel.startsWith(CONTRACT_PREFIX + '/')) return rel;
  return null;
}

function extractRequireSpecs(src) {
  const specs = [];
  let m;
  REQUIRE_STR_RE.lastIndex = 0;
  while ((m = REQUIRE_STR_RE.exec(src)) !== null) specs.push(m[2]);
  IMPORT_FROM_RE.lastIndex = 0;
  while ((m = IMPORT_FROM_RE.exec(src)) !== null) specs.push(m[2]);
  return specs;
}

function scanFile(file, options, violations) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'FILE_UNREADABLE', file: path.relative(REPO, file), message: e.message }); return { authorized: false, consumed: false }; }
  const specs = extractRequireSpecs(src);
  const relFile = path.relative(SCAN_BASE, file).split(path.sep).join('/');
  const isRendererJs = relFile.startsWith('renderer/js/') && relFile.endsWith('.js');
  const isAuthorizedConsumerPath = !!(options && options.authorizedConsumerPaths && options.authorizedConsumerPaths.has(relFile));
  let consumed = false;
  for (const spec of specs) {
    // direct string mentions of "contracts/r3.0c" in a literal specifier
    const directMatch = spec.indexOf(CONTRACT_PREFIX) !== -1;
    // relative require that resolves into contracts/r3.0c
    const relativeTarget = resolvedTargetIfContract(file, spec);
    if (!directMatch && !relativeTarget) continue;

    consumed = true;
    // state-aware allow: ONLY when the file is in the authorized-consumer set, AND the file is in
    // renderer/js/ (main.js / preload.js are never authorized consumers — they belong to the host
    // process, not the renderer). The state-aware allow is gated on runtimeConsumersAllowed=true and
    // currentCheckpoint at-or-beyond runtimeConsumerCheckpoint (already enforced by the governance
    // validator; this validator only honours what state.json already legally permits).
    if (isRendererJs && isAuthorizedConsumerPath && options && options.runtimeConsumersAllowed === true) {
      continue;
    }
    if (directMatch) {
      violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec });
    } else {
      violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec, target: relativeTarget });
    }
  }
  return { authorized: isAuthorizedConsumerPath && consumed && options && options.runtimeConsumersAllowed === true, consumed: consumed };
}

function scanIndexHtml(uiAllowed, violations) {
  // Index.html may NEVER <script src="..."> into contracts/r3.0c at any checkpoint (the contracts
  // ship via the generated bundle under renderer/js/, never as a direct script include). While
  // uiAllowed === false the legacy ban also forbids ANY <script src=> naming an R3.0C feature
  // module (e.g. r3-0c-comparison-export.js). Once uiAllowed === true (C7_UI onwards) the renderer
  // legitimately loads the named feature modules, so the name-only ban is lifted (the path
  // allowance is governed separately by no-consumer + governance authorized paths).
  const file = path.join(SCAN_BASE, 'renderer', 'index.html');
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'INDEX_HTML_UNREADABLE', message: e.message }); return; }
  const scriptRe = /<script[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1/gi;
  let m;
  while ((m = scriptRe.exec(src)) !== null) {
    const s = m[2];
    if (s.indexOf(CONTRACT_PREFIX) !== -1) violations.push({ code: 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS', src: s });
    else if (!uiAllowed && R3_0C_FEATURE_NAME_RE.test(s)) violations.push({ code: 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE', src: s });
  }
}

function loadFeaturesObject(violations) {
  if (FIXTURE_FEATURES_JSON) {
    try {
      const o = JSON.parse(FIXTURE_FEATURES_JSON);
      if (o && typeof o === 'object') return { FEATURES: o.FEATURES && typeof o.FEATURES === 'object' ? o.FEATURES : o, source: 'fixture' };
      violations.push({ code: 'FIXTURE_FEATURES_JSON_INVALID_SHAPE', message: 'parsed JSON is not an object' });
      return null;
    } catch (e) { violations.push({ code: 'FIXTURE_FEATURES_JSON_PARSE_ERROR', message: e.message }); return null; }
  }
  let R;
  try { R = require('../renderer/js/feature-registry.js'); } // static relative — dependency-audit friendly
  catch (e) { violations.push({ code: 'FEATURE_REGISTRY_UNREADABLE', message: e.message }); return null; }
  return { FEATURES: R && R.FEATURES, source: 'real-registry' };
}

function checkFeatureRegistryContract(state, violations) {
  // State-aware R3.0C registry contract check.
  // While featureRegistryActivationAllowed === false (C0–C7) the three IDs MUST be deferred without a
  // rendererAdapter. After C8_ACTIVATION flips the flag to true they MUST be available with a
  // rendererAdapter pointing at paneId='comparisons'. state===null collapses to activation=false
  // (the deferred contract continues to hold — fail-closed).
  const loaded = loadFeaturesObject(violations);
  if (!loaded) return null;
  const ids = ['case_comparison', 'reference_lap', 'corner_delta'];
  const F = loaded.FEATURES;
  if (!F || typeof F !== 'object') { violations.push({ code: 'FEATURE_REGISTRY_FEATURES_MISSING', message: 'FEATURES missing/non-object' }); return null; }
  const activationAllowed = !!(state && state.featureRegistryActivationAllowed === true);
  const detail = {};
  let allOk = true;
  for (const id of ids) {
    const f = F[id];
    if (!f) {
      violations.push({ code: activationAllowed ? 'ACTIVATED_FEATURE_MISSING' : 'DEFERRED_FEATURE_MISSING', featureId: id });
      allOk = false;
      detail[id] = { present: false };
      continue;
    }
    if (activationAllowed) {
      const okAvailability = f.availability === 'available';
      const okAdapter = !!(f.rendererAdapter && f.rendererAdapter.paneId === 'comparisons');
      const okNoDeferredReason = f.deferredReason === undefined;
      if (!okAvailability) { violations.push({ code: 'ACTIVATED_FEATURE_AVAILABILITY_WRONG', featureId: id, value: f.availability }); allOk = false; }
      if (!okAdapter) { violations.push({ code: 'ACTIVATED_FEATURE_ADAPTER_WRONG', featureId: id, adapter: f.rendererAdapter || null }); allOk = false; }
      if (!okNoDeferredReason) { violations.push({ code: 'ACTIVATED_FEATURE_DEFERRED_REASON_PRESENT', featureId: id, value: f.deferredReason }); allOk = false; }
      detail[id] = { present: true, availability: f.availability, rendererAdapter: !!f.rendererAdapter, paneId: f.rendererAdapter && f.rendererAdapter.paneId };
    } else {
      const okAvailability = f.availability === 'deferred';
      const okReason = f.deferredReason === 'R3.0C';
      const okNoAdapter = !f.rendererAdapter;
      if (!okAvailability) { violations.push({ code: 'DEFERRED_FEATURE_AVAILABILITY_WRONG', featureId: id, value: f.availability }); allOk = false; }
      if (!okReason) { violations.push({ code: 'DEFERRED_FEATURE_REASON_WRONG', featureId: id, value: f.deferredReason }); allOk = false; }
      if (!okNoAdapter) { violations.push({ code: 'DEFERRED_FEATURE_HAS_RENDERER_ADAPTER', featureId: id }); allOk = false; }
      detail[id] = { present: true, availability: f.availability, deferredReason: f.deferredReason, rendererAdapter: !!f.rendererAdapter };
    }
  }
  // Returned shape keeps legacy "allDeferred" key for downstream artifact consumers; meaning shifts to
  // "the R3.0C registry contract holds (deferred OR activated, whichever state.json mandates)".
  return { activationAllowed, contractHolds: allOk, allDeferred: allOk, detail };
}

function loadStateAndSchema(violations) {
  // The state-aware allowance is OPTIONAL: when state.json or schema.json cannot be loaded the
  // validator falls back to "no-allowance mode" — equivalent to the C0 hardcoded behaviour. Every
  // contract consumer found will fail closed because the allowance set is empty. Reading governance
  // is therefore a TIGHTENING input, never a relaxing one. Fixture tests that build a minimal
  // renderer-only tree (no governance subdir) continue to work without false-failing on STATE_UNREADABLE
  // — and a malicious deletion of state.json still fails closed (no consumer is granted allowance,
  // and the separate check-r3-0c-governance.js validator surfaces the missing-state breach).
  let state = null, schema = null;
  if (FIXTURE_STATE_JSON) {
    try { state = JSON.parse(FIXTURE_STATE_JSON); }
    catch (e) { violations.push({ code: 'FIXTURE_STATE_JSON_PARSE_ERROR', message: e.message }); return { state: null, schema: null }; }
  } else {
    try { state = JSON.parse(fs.readFileSync(path.join(SCAN_BASE, 'governance', 'r3.0c', 'state.json'), 'utf8')); }
    catch (e) { state = null; } // fall-closed: no allowance, no violation here
  }
  if (FIXTURE_SCHEMA_JSON) {
    try { schema = JSON.parse(FIXTURE_SCHEMA_JSON); }
    catch (e) { violations.push({ code: 'FIXTURE_SCHEMA_JSON_PARSE_ERROR', message: e.message }); return { state, schema: null }; }
  } else {
    try { schema = JSON.parse(fs.readFileSync(path.join(SCAN_BASE, 'governance', 'r3.0c', 'schema.json'), 'utf8')); }
    catch (e) { schema = null; } // fall-closed: no allowance, no violation here
  }
  return { state, schema };
}

function deriveAuthorizedConsumerSet(state, schema, violations) {
  // Returns a Set of repo-relative paths (renderer/js/*.js) authorized to require contracts/r3.0c at
  // runtime, given state.json + schema.json. Returns an empty Set when:
  //   - state.runtimeConsumersAllowed !== true
  //   - state.currentCheckpoint is below schema.runtimeConsumerCheckpoint
  //   - no authorized entry maps to an enabled production capability
  // The validator NEVER widens authorisation beyond what state.json legally permits; the governance
  // validator (check-r3-0c-governance.js) separately enforces capability floors / path rules.
  const set = new Set();
  if (!state || !schema) return set;
  const order = Array.isArray(schema.checkpointOrder) ? schema.checkpointOrder : [];
  const curIdx = order.indexOf(state.currentCheckpoint);
  const runtimeFloor = schema.runtimeConsumerCheckpoint;
  const floorIdx = order.indexOf(runtimeFloor);
  if (state.runtimeConsumersAllowed !== true) return set;
  if (curIdx < 0 || floorIdx < 0 || curIdx < floorIdx) return set;
  const enabled = new Set(Array.isArray(state.enabledCapabilities) ? state.enabledCapabilities : []);
  const raw = Array.isArray(state.authorizedProductionPaths) ? state.authorizedProductionPaths : [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const p = entry.path, cap = entry.capability;
    if (typeof p !== 'string' || typeof cap !== 'string') continue;
    if (!p.startsWith('renderer/js/')) continue; // adapter scope (renderer-tree only)
    if (!enabled.has(cap)) continue;
    set.add(p);
  }
  return set;
}

function run() {
  const violations = [];

  // Read R3.0C state + schema first so renderer-tree scanning is state-aware (authorized consumer
  // detection). State/schema unreadability is a fail-closed violation.
  const { state, schema } = loadStateAndSchema(violations);
  const runtimeConsumersAllowed = !!(state && state.runtimeConsumersAllowed === true);
  const authorizedConsumerPaths = deriveAuthorizedConsumerSet(state, schema, violations);
  const scanOptions = { authorizedConsumerPaths, runtimeConsumersAllowed };

  const rendererJs = listJsFiles(path.join(SCAN_BASE, 'renderer', 'js'));
  let authorizedConsumers = 0;
  let unauthorizedRendererConsumers = 0;
  for (const f of rendererJs) {
    const res = scanFile(f, scanOptions, violations);
    if (res.authorized) authorizedConsumers += 1;
    else if (res.consumed) unauthorizedRendererConsumers += 1;
  }

  // main.js / preload.js are NEVER authorized as R3.0C contract consumers. They are scanned with
  // an empty authorized set so any contract require fails closed regardless of state.json.
  const hostOptions = { authorizedConsumerPaths: new Set(), runtimeConsumersAllowed: false };
  for (const entry of ['main.js', 'preload.js']) {
    const full = path.join(SCAN_BASE, entry);
    if (fs.existsSync(full)) scanFile(full, hostOptions, violations);
  }

  const uiAllowed = !!(state && state.uiAllowed === true);
  scanIndexHtml(uiAllowed, violations);
  const registryProbe = checkFeatureRegistryContract(state, violations);

  const violationConsumerCodes = ['PROD_REQUIRES_R3_0C_CONTRACTS', 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS', 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'];
  const productionConsumerCount = violations.filter(v => violationConsumerCodes.includes(v.code)).length;

  return {
    check: 'r3-0c-no-consumer',
    scanBase: SCAN_BASE === REPO ? '<repo>' : SCAN_BASE,
    scannedFiles: rendererJs.length + (fs.existsSync(path.join(SCAN_BASE, 'main.js')) ? 1 : 0) + (fs.existsSync(path.join(SCAN_BASE, 'preload.js')) ? 1 : 0) + 1 /* index.html */,
    currentCheckpoint: state && state.currentCheckpoint,
    runtimeConsumersAllowed,
    authorizedConsumerPaths: Array.from(authorizedConsumerPaths).sort(),
    authorizedConsumerCount: authorizedConsumers,
    unauthorizedRendererConsumerCount: unauthorizedRendererConsumers,
    productionConsumerCount,
    // runtimeConsumerCount reports the total count of renderer/js consumers that PASS the validator,
    // i.e. authorized consumers. Unauthorized ones are violations and don't count here. At C0 the
    // value is 0; at C1 it should be 1 (the adapter).
    runtimeConsumerCount: authorizedConsumers,
    deferredFeatureProbe: registryProbe,
    deferredStillDeferred: !!(registryProbe && registryProbe.allDeferred),
    violations,
    ok: violations.length === 0,
  };
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = {
    check: 'r3-0c-no-consumer',
    ok: false,
    currentCheckpoint: null,
    runtimeConsumersAllowed: null,
    authorizedConsumerCount: -1,
    unauthorizedRendererConsumerCount: -1,
    productionConsumerCount: -1,
    runtimeConsumerCount: -1,
    deferredStillDeferred: false,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
  };
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, 'r3-0c-no-consumer.json'), JSON.stringify(result, null, 2));
console.log('R3.0C-NOCONSUMER ' + JSON.stringify({
  scanned: result.scannedFiles,
  consumers: result.runtimeConsumerCount,
  authorized: result.authorizedConsumerCount,
  unauthorized: result.unauthorizedRendererConsumerCount,
  checkpoint: result.currentCheckpoint,
  runtimeAllowed: result.runtimeConsumersAllowed,
  deferredStillDeferred: result.deferredStillDeferred,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
