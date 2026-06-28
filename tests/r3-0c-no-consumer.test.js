/**
 * tests/r3-0c-no-consumer.test.js — R3.0C C0 no-runtime-consumer validator.
 *
 * Covers production code scanning (renderer/js/*.js, main.js, preload.js, renderer/index.html) plus the
 * feature-registry deferred-state invariant. PASS asserts the real-repo state; FAIL cases use temp-dir
 * fixtures (R3_0C_NO_CONSUMER_BASE_OVERRIDE) so the test never mutates production code. Feature-registry
 * FAIL paths use the R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON env override so the real registry is never
 * touched.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const SCRIPT = 'scripts/check-r3-0c-no-consumer.js';

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else { fail++; console.log('  FAIL ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); }
}

function runValidator(opts) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-noc-art-'));
  const env = Object.assign({}, process.env, { ARTIFACT_DIR: tmp });
  if (opts && opts.base) env.R3_0C_NO_CONSUMER_BASE_OVERRIDE = opts.base;
  if (opts && Object.prototype.hasOwnProperty.call(opts, 'featuresJson')) env.R3_0C_NO_CONSUMER_FIXTURE_FEATURES_JSON = opts.featuresJson;
  const r = cp.spawnSync('node', [SCRIPT], { cwd: REPO, encoding: 'utf8', env });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, 'r3-0c-no-consumer.json'), 'utf8')); } catch (_) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr || '', stdout: r.stdout || '' };
}

function hasViolation(art, code) { return !!(art && Array.isArray(art.violations) && art.violations.some(v => v.code === code)); }

function buildFixtureBase(extra) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-noc-fix-'));
  fs.mkdirSync(path.join(base, 'renderer', 'js'), { recursive: true });
  fs.mkdirSync(path.join(base, 'contracts', 'r3.0c'), { recursive: true });
  // benign renderer file (no contracts reference)
  fs.writeFileSync(path.join(base, 'renderer', 'js', 'benign.js'), "const x = require('./other.js');\nmodule.exports = x;\n");
  fs.writeFileSync(path.join(base, 'renderer', 'js', 'other.js'), 'module.exports = {};\n');
  // benign index.html (no R3.0C feature scripts)
  fs.writeFileSync(path.join(base, 'renderer', 'index.html'), '<html><script src="js/benign.js"></script></html>\n');
  // benign main.js / preload.js
  fs.writeFileSync(path.join(base, 'main.js'), "const fs = require('fs'); module.exports = {};\n");
  fs.writeFileSync(path.join(base, 'preload.js'), "module.exports = {};\n");
  // synthetic contracts/r3.0c file (so relative resolve has a target)
  fs.writeFileSync(path.join(base, 'contracts', 'r3.0c', 'index.js'), 'module.exports = {};\n');
  if (typeof extra === 'function') extra(base);
  return base;
}

function deferredOk() {
  return {
    FEATURES: {
      case_comparison: { availability: 'deferred', deferredReason: 'R3.0C' },
      reference_lap: { availability: 'deferred', deferredReason: 'R3.0C' },
      corner_delta: { availability: 'deferred', deferredReason: 'R3.0C' },
    },
  };
}

// ── A. PASS: real repo ──
(() => {
  const r = runValidator();
  chk('A1 real-repo exits 0', r.status === 0, r.stderr);
  chk('A2 real-repo ok===true', !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
  chk('A3 real-repo runtimeConsumerCount===10 (C1..C5 + C6 comparison-export)', !!(r.artifact && r.artifact.runtimeConsumerCount === 10));
  chk('A3b real-repo authorizedConsumerCount===10', !!(r.artifact && r.artifact.authorizedConsumerCount === 10));
  chk('A3c real-repo unauthorizedRendererConsumerCount===0', !!(r.artifact && r.artifact.unauthorizedRendererConsumerCount === 0));
  chk('A3d real-repo authorized paths include C1 adapter, three C2 services, C3 normalize-distance, three C4 services, C5 delta-metrics, and C6 comparison-export', !!(r.artifact && Array.isArray(r.artifact.authorizedConsumerPaths)
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-comparison-adapter.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-lap-authority.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-track-identity.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-distance-authority.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-normalized-distance.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-reference-selection.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-corner-segmentation.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-corner-pairing.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-delta-metrics.js')
    && r.artifact.authorizedConsumerPaths.includes('renderer/js/r3-0c-comparison-export.js')));
  chk('A3e real-repo currentCheckpoint===C6_EXPORT', !!(r.artifact && r.artifact.currentCheckpoint === 'C6_EXPORT'));
  chk('A3f real-repo runtimeConsumersAllowed===true', !!(r.artifact && r.artifact.runtimeConsumersAllowed === true));
  chk('A4 real-repo deferredStillDeferred===true', !!(r.artifact && r.artifact.deferredStillDeferred === true));
})();

// ── B. fixture renderer/js file requires contracts/r3.0c ──
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'js', 'bad.js'), "const X = require('../../contracts/r3.0c/index.js');\nmodule.exports = X;\n");
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('B1 renderer/js require of contracts/r3.0c FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
})();
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'js', 'bad2.js'), "const X = require('contracts/r3.0c/something');\n");
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('B2 renderer/js literal "contracts/r3.0c" specifier FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
})();

// ── C. main.js / preload.js require contracts ──
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'main.js'), "const X = require('./contracts/r3.0c/index.js');\nmodule.exports = X;\n");
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('C1 main.js require of contracts FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
})();
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'preload.js'), "const X = require('./contracts/r3.0c/index.js');\nmodule.exports = X;\n");
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('C2 preload.js require of contracts FAILS', r.status !== 0 && hasViolation(r.artifact, 'PROD_REQUIRES_R3_0C_CONTRACTS'));
})();

// ── D. index.html script tags ──
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'index.html'), '<html><script src="../contracts/r3.0c/index.js"></script></html>\n');
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('D1 index.html script src into contracts FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_LOADS_CONTRACTS'));
})();
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'index.html'), '<html><script src="js/reference-lap-comparison.js"></script></html>\n');
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('D2 index.html script naming R3.0C feature FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
})();
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'index.html'), '<html><script src="js/corner-delta.js"></script></html>\n');
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('D3 index.html script naming corner-delta FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
})();
(() => {
  const base = buildFixtureBase(b => {
    fs.writeFileSync(path.join(b, 'renderer', 'index.html'), '<html><script src="js/case-comparison.js"></script></html>\n');
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('D4 index.html script naming case-comparison FAILS', r.status !== 0 && hasViolation(r.artifact, 'INDEX_HTML_SCRIPT_NAMES_R3_0C_FEATURE'));
})();

// ── E. fixture base PASS path (benign) ──
(() => {
  const base = buildFixtureBase();
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('E1 benign fixture base PASSES', r.status === 0 && !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
})();

// ── F. feature-registry FAIL paths ──
(() => {
  const features = deferredOk();
  features.FEATURES.case_comparison.rendererAdapter = { mount: function () {} };
  const base = buildFixtureBase();
  const r = runValidator({ base, featuresJson: JSON.stringify(features) });
  chk('F1 deferred feature with rendererAdapter FAILS', r.status !== 0 && hasViolation(r.artifact, 'DEFERRED_FEATURE_HAS_RENDERER_ADAPTER'));
})();
(() => {
  const features = deferredOk();
  features.FEATURES.reference_lap.availability = 'available';
  const base = buildFixtureBase();
  const r = runValidator({ base, featuresJson: JSON.stringify(features) });
  chk('F2 deferred feature availability flipped FAILS', r.status !== 0 && hasViolation(r.artifact, 'DEFERRED_FEATURE_AVAILABILITY_WRONG'));
})();
(() => {
  const features = deferredOk();
  features.FEATURES.corner_delta.deferredReason = 'R3.0Z';
  const base = buildFixtureBase();
  const r = runValidator({ base, featuresJson: JSON.stringify(features) });
  chk('F3 deferred feature reason changed FAILS', r.status !== 0 && hasViolation(r.artifact, 'DEFERRED_FEATURE_REASON_WRONG'));
})();
(() => {
  const features = { FEATURES: { case_comparison: { availability: 'deferred', deferredReason: 'R3.0C' } } };
  const base = buildFixtureBase();
  const r = runValidator({ base, featuresJson: JSON.stringify(features) });
  chk('F4 deferred feature missing FAILS', r.status !== 0 && hasViolation(r.artifact, 'DEFERRED_FEATURE_MISSING'));
})();

// ── G. tests/docs allowed to reference contracts (vacuously PASS — validator does not scan them) ──
(() => {
  const base = buildFixtureBase(b => {
    fs.mkdirSync(path.join(b, 'tests'), { recursive: true });
    fs.mkdirSync(path.join(b, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(b, 'tests', 'allowed.test.js'), "const C = require('../contracts/r3.0c/index.js'); module.exports = C;\n");
    fs.writeFileSync(path.join(b, 'docs', 'notes.md'), '# notes\nWe will eventually consume contracts/r3.0c/index.js.\n');
  });
  const r = runValidator({ base, featuresJson: JSON.stringify(deferredOk()) });
  chk('G1 tests + docs referencing contracts do NOT trip validator', r.status === 0 && !!(r.artifact && r.artifact.ok === true), r.artifact && r.artifact.violations);
})();

// ── H. internal failure fails closed ──
(() => {
  const r = runValidator({ base: '/this/path/should/never/exist/scan', featuresJson: JSON.stringify(deferredOk()) });
  // missing base: list of renderer/js becomes empty, index.html scan fails (file unreadable), validator surfaces violation
  chk('H1 missing scan base → exit non-zero', r.status !== 0);
  chk('H2 missing scan base → INDEX_HTML_UNREADABLE recorded', hasViolation(r.artifact, 'INDEX_HTML_UNREADABLE'));
})();
(() => {
  const r = runValidator({ base: undefined, featuresJson: '{not_json' });
  chk('H3 fixture features JSON parse error → FAILS', r.status !== 0 && hasViolation(r.artifact, 'FIXTURE_FEATURES_JSON_PARSE_ERROR'));
})();

console.log('r3-0c-no-consumer: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
