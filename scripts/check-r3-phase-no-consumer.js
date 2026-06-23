#!/usr/bin/env node
'use strict';
/**
 * R3.0 Integrated Delivery Train — per-phase no-runtime-consumer validator (D / E / F).
 *
 * Parameterized variant of scripts/check-r3-0c-no-consumer.js (which guards R3.0C).
 * The phase to validate is selected by env R3_PHASE_PROGRAM (one of 'R3.0D', 'R3.0E', 'R3.0F').
 *
 * Inspects the CURRENT WORKING-TREE STATE: confirms that no production code path consumes the phase's
 * contract directory (e.g. contracts/r3.0d/ for R3.0D) at runtime. Specifically:
 *
 *   1. No renderer/js/*.js file requires or imports anything under contracts/<phase>/
 *   2. main.js / preload.js do not require contracts/<phase>/
 *   3. renderer/index.html contains no <script src="..."> pointing into contracts/<phase>/
 *
 * Tests under tests/ and docs under docs/ ARE allowed to reference contracts/<phase>/.
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
  'R3.0D': { contractPrefix: 'contracts/r3.0d', artifact: 'r3-0d-no-consumer.json', label: 'R3.0D-NOCONSUMER' },
  'R3.0E': { contractPrefix: 'contracts/r3.0e', artifact: 'r3-0e-no-consumer.json', label: 'R3.0E-NOCONSUMER' },
  'R3.0F': { contractPrefix: 'contracts/r3.0f', artifact: 'r3-0f-no-consumer.json', label: 'R3.0F-NOCONSUMER' },
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

function scanFile(file, violations) {
  let src;
  try { src = fs.readFileSync(file, 'utf8'); }
  catch (e) { violations.push({ code: 'FILE_UNREADABLE', file: path.relative(REPO, file), message: e.message }); return; }
  const specs = extractRequireSpecs(src);
  for (const spec of specs) {
    if (spec.indexOf(CONTRACT_PREFIX) !== -1) {
      violations.push({ code: 'PROD_REQUIRES_PHASE_CONTRACTS', file: path.relative(REPO, file), specifier: spec, phase: PHASE_PROGRAM });
      continue;
    }
    const target = resolvedTargetIfContract(file, spec);
    if (target) violations.push({ code: 'PROD_REQUIRES_PHASE_CONTRACTS', file: path.relative(REPO, file), specifier: spec, target, phase: PHASE_PROGRAM });
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

function run() {
  if (!PHASE) {
    return finish({ ok: false, violations: [{ code: 'PHASE_PROGRAM_INVALID', message: 'R3_PHASE_PROGRAM must be one of R3.0D / R3.0E / R3.0F; got ' + JSON.stringify(PHASE_PROGRAM) }], productionConsumerCount: -1, runtimeConsumerCount: -1 });
  }

  const violations = [];

  const rendererJs = listJsFiles(path.join(SCAN_BASE, 'renderer', 'js'));
  for (const f of rendererJs) scanFile(f, violations);

  for (const entry of ['main.js', 'preload.js']) {
    const full = path.join(SCAN_BASE, entry);
    if (fs.existsSync(full)) scanFile(full, violations);
  }

  scanIndexHtml(violations);

  const productionConsumerCount = violations.filter(v => v.code === 'PROD_REQUIRES_PHASE_CONTRACTS' || v.code === 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS').length;

  return finish({
    scanBase: SCAN_BASE === REPO ? '<repo>' : SCAN_BASE,
    contractPrefix: CONTRACT_PREFIX,
    scannedFiles: rendererJs.length + (fs.existsSync(path.join(SCAN_BASE, 'main.js')) ? 1 : 0) + (fs.existsSync(path.join(SCAN_BASE, 'preload.js')) ? 1 : 0) + 1,
    productionConsumerCount,
    runtimeConsumerCount: productionConsumerCount,
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
  consumers: result.runtimeConsumerCount,
  violations: (result.violations || []).length,
  ok: result.ok,
}));
process.exit(exitCode);
