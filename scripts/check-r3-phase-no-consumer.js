#!/usr/bin/env node
'use strict';
/**
 * R3.0 Integrated Delivery Train — per-phase production-consumer authorization validator (D / E / F).
 *
 * Parameterized variant of scripts/check-r3-0c-no-consumer.js (which guards R3.0C).
 * The phase to validate is selected by env R3_PHASE_PROGRAM (one of 'R3.0D', 'R3.0E', 'R3.0F').
 *
 * Inspects the CURRENT WORKING-TREE STATE: confirms that EVERY production code consumer of the
 * phase's contract directory (e.g. contracts/r3.0d/ for R3.0D) is explicitly listed in
 * governance/<phase-dir>/state.json :: authorizedProductionPaths. Specifically:
 *
 *   1. Every renderer/js/*.js file that requires/imports anything under contracts/<phase>/
 *      MUST be listed in state.authorizedProductionPaths.
 *   2. main.js / preload.js consumers MUST be similarly authorized.
 *   3. renderer/index.html script src pointing into contracts/<phase>/ is ALWAYS forbidden
 *      (contracts are UMD modules consumed via require/import, never loaded as scripts).
 *
 * Tests under tests/ and docs under docs/ ARE allowed to reference contracts/<phase>/ freely.
 *
 * Authorization gate behaviour:
 *   • At the bootstrap / contracts-only checkpoint (e.g. D1_CONTRACT_FOUNDATION),
 *     state.authorizedProductionPaths is empty → ANY consumer fails as PROD_UNAUTHORIZED_CONSUMER.
 *   • At a production checkpoint (e.g. D2_EVIDENCE_GRAPH), the authorized list contains the
 *     specific renderer/js files allowed to require contracts. Consumers on the list PASS;
 *     consumers off the list FAIL as PROD_UNAUTHORIZED_CONSUMER. The presence of authorization
 *     does NOT weaken the check — it strictly defines the allow surface.
 *
 * Unconditional: runs every PR and every push to main. Internal exceptions fail closed (ok=false, exit 2).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-<lower-dashed-program>-no-consumer.json
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

const PHASE_CONFIG = {
  'R3.0D': { contractPrefix: 'contracts/r3.0d', artifact: 'r3-0d-no-consumer.json', label: 'R3.0D-NOCONSUMER', stateDir: 'governance/r3.0d' },
  'R3.0E': { contractPrefix: 'contracts/r3.0e', artifact: 'r3-0e-no-consumer.json', label: 'R3.0E-NOCONSUMER', stateDir: 'governance/r3.0e' },
  'R3.0F': { contractPrefix: 'contracts/r3.0f', artifact: 'r3-0f-no-consumer.json', label: 'R3.0F-NOCONSUMER', stateDir: 'governance/r3.0f' },
};

const PHASE_PROGRAM = String(process.env.R3_PHASE_PROGRAM || '').trim();
const PHASE = PHASE_CONFIG[PHASE_PROGRAM];

const SCAN_BASE = process.env.R3_PHASE_NO_CONSUMER_BASE_OVERRIDE ? path.resolve(process.env.R3_PHASE_NO_CONSUMER_BASE_OVERRIDE) : REPO;
const CONTRACT_PREFIX = PHASE ? PHASE.contractPrefix : 'contracts/__unknown__';

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

function scanFile(file, violations, authorizedSet, allConsumers) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'FILE_UNREADABLE', file: path.relative(REPO, file), message: e.message }); return; }
  const specs = extractRequireSpecs(src);
  const relFile = path.relative(SCAN_BASE === REPO ? REPO : SCAN_BASE, file).split(path.sep).join('/');
  for (const spec of specs) {
    let isConsumer = false;
    let specifierForReport = null;
    let targetForReport = null;
    if (spec.indexOf(CONTRACT_PREFIX) !== -1) {
      isConsumer = true;
      specifierForReport = spec;
    } else {
      const target = resolvedTargetIfContract(file, spec);
      if (target) { isConsumer = true; specifierForReport = spec; targetForReport = target; }
    }
    if (!isConsumer) continue;
    allConsumers.push({ file: relFile, specifier: specifierForReport, target: targetForReport });
    if (!authorizedSet.has(relFile)) {
      const v = { code: 'PROD_UNAUTHORIZED_CONSUMER', file: relFile, specifier: specifierForReport, phase: PHASE_PROGRAM };
      if (targetForReport) v.target = targetForReport;
      violations.push(v);
    }
  }
  // RN-11 closure: secondary string-concat-near-require heuristic. ONLY emits when the file is
  // NOT in the authorized set — an authorized consumer's UMD require is the expected case.
  if (!authorizedSet.has(relFile) && detectSuspectedDynamicPhaseRequire(src)) {
    violations.push({ code: 'PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE', file: relFile, phase: PHASE_PROGRAM });
  }
}

function scanIndexHtml(violations) {
  const file = path.join(SCAN_BASE, 'renderer', 'index.html');
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'INDEX_HTML_UNREADABLE', message: e.message }); return; }
  const scriptRe = /<script[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1/gi;
  let m;
  while ((m = scriptRe.exec(src)) !== null) {
    const s = m[2];
    if (s.indexOf(CONTRACT_PREFIX) !== -1) violations.push({ code: 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS', src: s, phase: PHASE_PROGRAM });
  }
}

function finish(payload) {
  return Object.assign({ check: PHASE ? ('r3-' + PHASE_PROGRAM.toLowerCase().replace('.', '-') + '-no-consumer').replace('--', '-') : 'r3-phase-no-consumer', program: PHASE_PROGRAM || null }, payload);
}

// Codex D2 Round 1 RN-10 closure: strict entry-shape validation. Any malformed entry fails closed
// (allow set becomes empty AND a STATE_AUTHORIZED_PATH_ENTRY_INVALID violation is emitted, which
// makes the whole check fail). Validates exact key set, path grammar (repo-relative, no '..', no
// '/' prefix, no glob chars, conservative segment regex), capability non-empty string, and rejects
// duplicates.
const SAFE_SEGMENT_RE = /^[A-Za-z0-9_.-]+$/;
function _validatePathString(p) {
  if (typeof p !== 'string' || p.length === 0) return 'empty';
  if (p.startsWith('/')) return 'absolute';
  if (p.includes('..')) return 'parent-segment';
  if (p !== p.trim()) return 'whitespace';
  if (/[\r\n\t]/.test(p)) return 'control-char';
  if (/[*?[\]{}()|\\^$#~]/.test(p)) return 'glob-or-regex-char';
  const segments = p.split('/');
  for (const seg of segments) {
    if (seg.length === 0) return 'empty-segment';
    if (!SAFE_SEGMENT_RE.test(seg)) return 'invalid-segment-char';
  }
  return null;
}
const AUTHORIZED_ENTRY_KEYS = new Set(['path', 'capability']);
function loadAuthorizedSet() {
  if (!PHASE) return { set: new Set(), violations: [] };
  const stateOverride = process.env.R3_PHASE_STATE_FILE_OVERRIDE ? path.resolve(process.env.R3_PHASE_STATE_FILE_OVERRIDE) : null;
  const statePath = stateOverride || path.join(REPO, PHASE.stateDir, 'state.json');
  let raw;
  try { raw = fs.readFileSync(statePath, 'utf8'); }
  catch (e) { return { set: new Set(), violations: [{ code: 'STATE_UNREADABLE', message: statePath + ': ' + e.message }] }; }
  let st;
  try { st = JSON.parse(raw); }
  catch (e) { return { set: new Set(), violations: [{ code: 'STATE_PARSE_ERROR', message: statePath + ': ' + e.message }] }; }
  if (!st || typeof st !== 'object' || Array.isArray(st)) return { set: new Set(), violations: [{ code: 'STATE_AUTHORIZED_PATHS_MALFORMED', message: 'state.json root is not a plain object' }] };
  if (!Array.isArray(st.authorizedProductionPaths)) return { set: new Set(), violations: [{ code: 'STATE_AUTHORIZED_PATHS_MALFORMED', message: 'authorizedProductionPaths missing or not an array' }] };
  const set = new Set();
  const violations = [];
  const seenPaths = new Set();
  for (let i = 0; i < st.authorizedProductionPaths.length; i++) {
    const entry = st.authorizedProductionPaths[i];
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_ENTRY_INVALID', index: i, reason: 'not-a-plain-object' });
      continue;
    }
    // Exact closed key set: must have BOTH path AND capability; no extra keys (RN-10 closure).
    let extraKey = null;
    for (const k of Object.keys(entry)) if (!AUTHORIZED_ENTRY_KEYS.has(k)) { extraKey = k; break; }
    if (extraKey) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_ENTRY_INVALID', index: i, reason: 'unknown-key:' + extraKey });
      continue;
    }
    if (!('path' in entry) || !('capability' in entry)) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_ENTRY_INVALID', index: i, reason: 'missing-required-key' });
      continue;
    }
    if (typeof entry.path !== 'string' || entry.path.length === 0) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_ENTRY_INVALID', index: i, reason: 'path-not-string' });
      continue;
    }
    if (typeof entry.capability !== 'string' || entry.capability.length === 0) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_ENTRY_INVALID', index: i, path: entry.path, reason: 'capability-not-string' });
      continue;
    }
    const pathReason = _validatePathString(entry.path);
    if (pathReason) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_GRAMMAR_INVALID', index: i, path: entry.path, reason: pathReason });
      continue;
    }
    if (seenPaths.has(entry.path)) {
      violations.push({ code: 'STATE_AUTHORIZED_PATH_DUPLICATE', index: i, path: entry.path });
      continue;
    }
    seenPaths.add(entry.path);
    set.add(entry.path);
  }
  // RN-10 closure: if ANY entry-level violation occurred, the allow set is treated as EMPTY so a
  // partially-malformed state cannot smuggle through a single good entry that authorizes anything.
  if (violations.length > 0) return { set: new Set(), violations };
  return { set, violations: [] };
}

// Codex D2 Round 1 RN-11 closure: detect string-concatenation-near-require shapes that would
// resolve to a phase contract path. Heuristic: a require/import call with a non-literal first
// argument AND the file contains a literal `r3.0d` / `r3.0e` / `r3.0f` substring. Flag as a
// PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE finding. Documented limitation: AST-level constant
// folding is out of scope; the heuristic errs on the side of caution and may produce false
// positives that future code may need to refactor (this is the intended fail-closed posture).
const NONLITERAL_REQUIRE_RE = /(?:require|import)\s*\(\s*(?![\s'"`])/g;
const PHASE_SUBSTR_RE = /\br3\.0[def]\b/i;
function detectSuspectedDynamicPhaseRequire(src) {
  if (!PHASE_SUBSTR_RE.test(src)) return false;
  NONLITERAL_REQUIRE_RE.lastIndex = 0;
  return NONLITERAL_REQUIRE_RE.test(src);
}

function run() {
  if (!PHASE) {
    return finish({ ok: false, violations: [{ code: 'PHASE_PROGRAM_INVALID', message: 'R3_PHASE_PROGRAM must be one of R3.0D / R3.0E / R3.0F; got ' + JSON.stringify(PHASE_PROGRAM) }], productionConsumerCount: -1, runtimeConsumerCount: -1, authorizedPathCount: -1 });
  }

  const violations = [];
  const allConsumers = [];
  const { set: authorizedSet, violations: stateViolations } = loadAuthorizedSet();
  for (const v of stateViolations) violations.push(v);

  const rendererJs = listJsFiles(path.join(SCAN_BASE, 'renderer', 'js'));
  for (const f of rendererJs) scanFile(f, violations, authorizedSet, allConsumers);

  for (const entry of ['main.js', 'preload.js']) {
    const full = path.join(SCAN_BASE, entry);
    if (fs.existsSync(full)) scanFile(full, violations, authorizedSet, allConsumers);
  }

  scanIndexHtml(violations);

  const unauthorizedConsumerCount = violations.filter(v => v.code === 'PROD_UNAUTHORIZED_CONSUMER' || v.code === 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS').length;
  const authorizedConsumerCount = allConsumers.length - unauthorizedConsumerCount;

  return finish({
    scanBase: SCAN_BASE === REPO ? '<repo>' : SCAN_BASE,
    contractPrefix: CONTRACT_PREFIX,
    scannedFiles: rendererJs.length + (fs.existsSync(path.join(SCAN_BASE, 'main.js')) ? 1 : 0) + (fs.existsSync(path.join(SCAN_BASE, 'preload.js')) ? 1 : 0) + 1,
    authorizedPathCount: authorizedSet.size,
    productionConsumerCount: allConsumers.length,
    authorizedConsumerCount: authorizedConsumerCount,
    unauthorizedConsumerCount: unauthorizedConsumerCount,
    runtimeConsumerCount: allConsumers.length,
    violations,
    ok: violations.length === 0,
  });
}

let result, exitCode;
try { result = run(); exitCode = result.ok ? 0 : 1; }
catch (e) {
  result = finish({
    ok: false,
    productionConsumerCount: -1,
    runtimeConsumerCount: -1,
    authorizedPathCount: -1,
    violations: [{ code: 'INTERNAL_VALIDATOR_FAILURE', message: String((e && e.stack) || e) }],
  });
  exitCode = 2;
}
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
const outName = PHASE ? PHASE.artifact : 'r3-phase-no-consumer.json';
fs.writeFileSync(path.join(ARTIFACT_DIR, outName), JSON.stringify(result, null, 2));
const label = PHASE ? PHASE.label : 'R3-PHASE-NOCONSUMER';
console.log(label + ' ' + JSON.stringify({
  program: result.program,
  scanned: result.scannedFiles,
  authorizedPaths: result.authorizedPathCount,
  consumers: result.runtimeConsumerCount,
  authorizedConsumers: result.authorizedConsumerCount,
  unauthorizedConsumers: result.unauthorizedConsumerCount,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
