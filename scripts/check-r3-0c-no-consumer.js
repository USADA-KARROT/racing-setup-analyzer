#!/usr/bin/env node
'use strict';
/**
 * R3.0C C0 — No-runtime-consumer validator.
 *
 * Independent of the existing scope guard (which inspects the PR diff). This validator inspects the
 * CURRENT WORKING-TREE STATE: it confirms that no production code path consumes contracts/r3.0c/ at
 * runtime. Specifically:
 *
 *   1. No renderer/js/*.js file requires or imports anything under contracts/r3.0c.
 *   2. main.js / preload.js do not require contracts/r3.0c.
 *   3. renderer/index.html contains no <script src="..."> pointing into contracts/r3.0c or naming any
 *      R3.0C feature module (reference-lap / corner-delta / case-comparison).
 *   4. renderer/js/feature-registry.js still marks case_comparison / reference_lap / corner_delta as
 *      deferred (availability='deferred', deferredReason='R3.0C', no rendererAdapter).
 *
 * Tests under tests/ and docs under docs/ ARE allowed to reference contracts/r3.0c.
 *
 * Unconditional: this runs every PR and every push to main; it cannot be skipped by env flags. Internal
 * exceptions fail closed (ok=false, exit 2).
 *
 * Output: ${ARTIFACT_DIR:-artifacts}/r3-0c-no-consumer.json   (exit 1 on violation; exit 2 on internal error)
 */
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ARTIFACT_DIR = process.env.ARTIFACT_DIR ? path.resolve(process.env.ARTIFACT_DIR) : path.join(REPO, 'artifacts');

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
  // Resolve a relative specifier from the importing file and report whether it lands inside contracts/r3.0c.
  if (typeof spec !== 'string' || spec.length === 0) return null;
  if (!(spec.startsWith('./') || spec.startsWith('../') || spec === '.' || spec === '..')) return null;
  const abs = path.resolve(path.dirname(fromFile), spec);
  const rel = path.relative(REPO, abs).split(path.sep).join('/');
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

function scanFile(file, violations) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'FILE_UNREADABLE', file: path.relative(REPO, file), message: e.message }); return; }
  const specs = extractRequireSpecs(src);
  for (const spec of specs) {
    // direct string mentions of "contracts/r3.0c" in a literal specifier — block
    if (spec.indexOf(CONTRACT_PREFIX) !== -1) {
      violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec });
      continue;
    }
    // relative require that resolves into contracts/r3.0c
    const target = resolvedTargetIfContract(file, spec);
    if (target) violations.push({ code: 'PROD_REQUIRES_R3_0C_CONTRACTS', file: path.relative(REPO, file), specifier: spec, target });
  }
}

function scanIndexHtml(violations) {
  const file = path.join(REPO, 'renderer', 'index.html');
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'INDEX_HTML_UNREADABLE', message: e.message }); return; }
  const scriptRe = /<script[^>]*\bsrc\s*=\s*(['"])([^'"]+)\1/gi;
  let m;
  while ((m = scriptRe.exec(src)) !== null) {
    const s = m[2];
    if (s.indexOf(CONTRACT_PREFIX) !== -1) violations.push({ code: 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS', src: s });
    else if (R3_0C_FEATURE_NAME_RE.test(s)) violations.push({ code: 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE', src: s });
  }
}

function checkFeatureRegistryStillDeferred(violations) {
  let R;
  try { R = require('../renderer/js/feature-registry.js'); } // static relative — dependency-audit friendly
  catch (e) { violations.push({ code: 'FEATURE_REGISTRY_UNREADABLE', message: e.message }); return null; }
  const ids = ['case_comparison', 'reference_lap', 'corner_delta'];
  const F = R && R.FEATURES;
  if (!F || typeof F !== 'object') { violations.push({ code: 'FEATURE_REGISTRY_FEATURES_MISSING', message: 'R.FEATURES missing' }); return null; }
  const detail = {};
  let allOk = true;
  for (const id of ids) {
    const f = F[id];
    if (!f) { violations.push({ code: 'DEFERRED_FEATURE_MISSING', featureId: id }); allOk = false; detail[id] = { present: false }; continue; }
    const okAvailability = f.availability === 'deferred';
    const okReason = f.deferredReason === 'R3.0C';
    const okNoAdapter = !f.rendererAdapter;
    if (!okAvailability) { violations.push({ code: 'DEFERRED_FEATURE_AVAILABILITY_WRONG', featureId: id, value: f.availability }); allOk = false; }
    if (!okReason) { violations.push({ code: 'DEFERRED_FEATURE_REASON_WRONG', featureId: id, value: f.deferredReason }); allOk = false; }
    if (!okNoAdapter) { violations.push({ code: 'DEFERRED_FEATURE_HAS_RENDERER_ADAPTER', featureId: id }); allOk = false; }
    detail[id] = { present: true, availability: f.availability, deferredReason: f.deferredReason, rendererAdapter: !!f.rendererAdapter };
  }
  return { allDeferred: allOk, detail };
}

function run() {
  const violations = [];

  const rendererJs = listJsFiles(path.join(REPO, 'renderer', 'js'));
  for (const f of rendererJs) scanFile(f, violations);

  for (const entry of ['main.js', 'preload.js']) {
    const full = path.join(REPO, entry);
    if (fs.existsSync(full)) scanFile(full, violations);
  }

  scanIndexHtml(violations);
  const registryProbe = checkFeatureRegistryStillDeferred(violations);

  const productionConsumerCount = violations.filter(v => v.code === 'PROD_REQUIRES_R3_0C_CONTRACTS' || v.code === 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS' || v.code === 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE').length;

  return {
    check: 'r3-0c-no-consumer',
    scannedFiles: rendererJs.length + (fs.existsSync(path.join(REPO, 'main.js')) ? 1 : 0) + (fs.existsSync(path.join(REPO, 'preload.js')) ? 1 : 0) + 1 /* index.html */,
    productionConsumerCount,
    runtimeConsumerCount: productionConsumerCount,
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
  deferredStillDeferred: result.deferredStillDeferred,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
