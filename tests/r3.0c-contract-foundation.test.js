/**
 * tests/r3.0c-contract-foundation.test.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Verifies the contracts/r3.0c/* surface: stable/unique reason codes; single delta-sign convention; the five
 * mandatory lap authorities (any missing → blocked); fail-closed on unknown state; blocked results carry NO
 * numeric payload; the comparison export identity is distinct from the case-export schemas; credibility is
 * input-supplied (never derived); synthetic never labelled real; unsupported metric fails closed; no track
 * identity → not eligible; the contracts have NO renderer dependency and NO algorithm; and the R3.0C scope
 * guard + frozen-boundary checks still pass with the CP1 change in place.
 *
 * Oracle independence (§14, fixture ≠ oracle): expected reason codes are written as LITERAL strings here, not
 * read from the modules under test; the case-export distinctness oracle is the real frozen export modules.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const os = require('os');

const REPO = path.resolve(__dirname, '..');
const CONTRACT_DIR = path.join(REPO, 'contracts', 'r3.0c');

const RC = require('../contracts/r3.0c/reason-codes.js');
const CR = require('../contracts/r3.0c/credibility-contract.js');
const VL = require('../contracts/r3.0c/valid-lap-contract.js');
const NP = require('../contracts/r3.0c/normalized-position-contract.js');
const CE = require('../contracts/r3.0c/comparison-eligibility-contract.js');
const EX = require('../contracts/r3.0c/comparison-export-contract.js');
const IDX = require('../contracts/r3.0c/index.js');
// distinctness oracles — the real frozen case-export modules (independent of the SUT)
const CaseExport = require('../renderer/js/analysis-case-export.js');
const CaseRecord = require('../renderer/js/case-record-schema.js');
const Registry = require('../renderer/js/feature-registry.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const hasCode = (res, code) => !!(res && Array.isArray(res.reasonCodes) && res.reasonCodes.indexOf(code) !== -1);

// ── fixtures (hand-authored; never derived from the SUT) ──
function fullLapAuthority() {
  return { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } };
}
function ident(over) { return Object.assign({ analysisCaseId: 'case_1', sessionId: 'sess_1', lapId: 'lap_1', trackId: 'trackA', layoutId: 'layout1' }, over || {}); }
function normAuth() { return { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' }; }
function fullComparisonInput(over) {
  const base = {
    analysisCaseId: 'case_1',
    reference: { identity: ident({ lapId: 'lap_3' }), lapAuthority: fullLapAuthority(), normalizationAuthority: normAuth() },
    comparison: { identity: ident({ lapId: 'lap_5' }), lapAuthority: fullLapAuthority(), normalizationAuthority: normAuth() },
    credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] },
  };
  return Object.assign(base, over || {});
}

// ── A. reason codes: stable / unique / machine-readable ──
chk('19 reason codes total (16 mandated + 3 documented extensions)', RC.ALL_REASON_CODES.length === 19, RC.ALL_REASON_CODES.length);
chk('reason codes unique', new Set(RC.ALL_REASON_CODES).size === RC.ALL_REASON_CODES.length);
chk('reason codes are UPPER_SNAKE', RC.ALL_REASON_CODES.every(c => /^[A-Z][A-Z0-9_]*$/.test(c)));
chk('REASON_CODES keyed by own value (stable)', Object.keys(RC.REASON_CODES).every(k => RC.REASON_CODES[k] === k));
['MISSING_TRACK_IDENTITY', 'TRACK_IDENTITY_MISMATCH', 'MISSING_LAP_IDENTITY', 'INCOMPLETE_LAP', 'INVALID_TIMING', 'INSUFFICIENT_SAMPLE_COVERAGE', 'DISCONTINUOUS_SAMPLES', 'MISSING_NORMALIZED_DISTANCE_AUTHORITY', 'INCOMPATIBLE_NORMALIZATION', 'REFERENCE_LAP_UNAVAILABLE', 'COMPARISON_LAP_UNAVAILABLE', 'CORNER_PAIRING_UNAVAILABLE', 'UNSUPPORTED_METRIC', 'INSUFFICIENT_CREDIBILITY_METADATA', 'SYNTHETIC_ONLY_LIMITATION', 'INTERNAL_CONTRACT_VIOLATION'].forEach(c => chk('mandated code present: ' + c, RC.ALL_REASON_CODES.indexOf(c) !== -1));
['CROSS_CASE_COMPARISON_UNSUPPORTED', 'CROSS_SESSION_COMPARISON_UNSUPPORTED', 'METRIC_REQUIRED_CHANNEL_UNAVAILABLE'].forEach(c => chk('extension code present: ' + c, RC.ALL_REASON_CODES.indexOf(c) !== -1));
chk('METRIC_REQUIRED_CHANNEL_UNAVAILABLE explanationKey is stable lowercase hook', RC.explanationKeyFor('METRIC_REQUIRED_CHANNEL_UNAVAILABLE') === 'r3_0c.reason.metric_required_channel_unavailable');
chk('isReasonCode true for valid', RC.isReasonCode('INCOMPLETE_LAP') === true);
chk('isReasonCode false for junk', RC.isReasonCode('NOPE') === false && RC.isReasonCode(42) === false);
chk('explanationKey is a stable i18n key (not prose)', RC.explanationKeyFor('INCOMPLETE_LAP') === 'r3_0c.reason.incomplete_lap');
chk('explanationKey null for junk', RC.explanationKeyFor('NOPE') === null);

// ── B. delta sign: single convention = comparison − reference ──
chk('delta sign formula', CE.DELTA_SIGN.formula === 'comparison_minus_reference');
chk('delta sign operands', CE.DELTA_SIGN.minuend === 'comparison' && CE.DELTA_SIGN.subtrahend === 'reference');
chk('no alternate delta convention', CE.DELTA_SIGN.alternateConventionsAllowed === false);
chk('deltaSignFormula() agrees', CE.deltaSignFormula() === 'comparison_minus_reference');
chk('DELTA_SIGN frozen', Object.isFrozen(CE.DELTA_SIGN));

// ── C. valid lap: each of the five missing → blocked with its reason code ──
chk('full lap authority eligible', VL.evaluateLapAuthority(fullLapAuthority()).eligible === true);
const lapReason = { lapIdentity: 'MISSING_LAP_IDENTITY', completeness: 'INCOMPLETE_LAP', timingValidity: 'INVALID_TIMING', trackIdentity: 'MISSING_TRACK_IDENTITY', sampleContinuity: 'INSUFFICIENT_SAMPLE_COVERAGE' };
Object.keys(lapReason).forEach(k => {
  const a = fullLapAuthority(); delete a[k];
  const r = VL.evaluateLapAuthority(a);
  chk('missing ' + k + ' → blocked', r.eligible === false);
  chk('missing ' + k + ' → ' + lapReason[k], hasCode(r, lapReason[k]), r.reasonCodes);
});
(() => { const a = fullLapAuthority(); a.sampleContinuity = { satisfied: false, discontinuous: true }; const r = VL.evaluateLapAuthority(a); chk('discontinuous samples → DISCONTINUOUS_SAMPLES', r.eligible === false && hasCode(r, 'DISCONTINUOUS_SAMPLES')); })();
(() => { const a = fullLapAuthority(); a.lapIdentity = { satisfied: false }; chk('satisfied:false (present) is NOT eligible (authority not presence)', VL.evaluateLapAuthority(a).eligible === false); })();
(() => { const a = fullLapAuthority(); a.lapIdentity = {}; chk('missing satisfied flag → blocked', VL.evaluateLapAuthority(a).eligible === false); })();

// ── D. unknown state → blocked (fail-closed) ──
[null, undefined, [], 'x', 42, true].forEach(v => chk('lap authority unknown ' + JSON.stringify(v) + ' → blocked', VL.evaluateLapAuthority(v).eligible === false));
chk('comparison unknown → blocked', CE.evaluateComparisonEligibility(null).eligible === false);
chk('position authority unknown → blocked', NP.evaluateNormalizedPositionAuthority(null).eligible === false);
chk('export envelope unknown → blocked', EX.validateComparisonExportEnvelope(null).eligible === false);

// ── E. blocked result carries NO numeric payload ──
(() => {
  const r = VL.evaluateLapAuthority(null);
  chk('blocked.result === null', r.result === null);
  chk('blocked.eligible === false', r.eligible === false);
  chk('blocked.status blocked', r.status === 'blocked');
  chk('blocked has no finite-number leaf', Object.keys(r).every(k => typeof r[k] !== 'number'));
  chk('blocked reasonCodes non-empty (never an empty block)', r.reasonCodes.length >= 1);
  chk('blocked explanationKeys parallel to codes', r.explanationKeys.length === r.reasonCodes.length);
})();

// ── F. comparison export identity distinct from case export ──
chk('comparison export identity fixed', EX.COMPARISON_EXPORT_IDENTITY === 'racing-analyzer/comparison-export');
chk('identity distinct from R2.3 case bundle version', CaseExport.BUNDLE_SCHEMA_VERSION !== EX.COMPARISON_EXPORT_IDENTITY);
chk('identity distinct from R3.0B record bundle version', CaseRecord.BUNDLE_SCHEMA_VERSION !== EX.COMPARISON_EXPORT_IDENTITY);
chk('isDistinctFromCaseExportIdentity true for case version', EX.isDistinctFromCaseExportIdentity(CaseExport.BUNDLE_SCHEMA_VERSION) === true);
chk('isDistinctFromCaseExportIdentity false for own identity', EX.isDistinctFromCaseExportIdentity('racing-analyzer/comparison-export') === false);
(() => { const exp = CaseExport.exportAnalysisCase({}); chk('a real case bundle does not contain the comparison identity', exp.ok === true && JSON.stringify(exp.bundle).indexOf('racing-analyzer/comparison-export') === -1); })();
(() => { const env = EX.buildComparisonExportEnvelope(); chk('comparison envelope HAS schemaIdentity (case bundle does not)', env.schemaIdentity === 'racing-analyzer/comparison-export'); const exp = CaseExport.exportAnalysisCase({}); chk('case bundle has no schemaIdentity field', exp.bundle && exp.bundle.schemaIdentity === undefined); })();

// ── G. credibility metadata must be input-supplied ──
chk('empty credibility → INSUFFICIENT', CR.validateCredibilityMetadata({}).valid === false && hasCode({ reasonCodes: CR.validateCredibilityMetadata({}).reasonCodes }, 'INSUFFICIENT_CREDIBILITY_METADATA'));
chk('full credibility → valid', CR.validateCredibilityMetadata({ credibility: 'Model', provenance: 'real', confidence: 'medium', limitations: [], blockedReasons: [] }).valid === true);
['credibility', 'provenance', 'confidence', 'limitations', 'blockedReasons'].forEach(f => { const m = { credibility: 'Model', provenance: 'real', confidence: 'medium', limitations: [], blockedReasons: [] }; delete m[f]; chk('missing credibility field ' + f + ' → invalid', CR.validateCredibilityMetadata(m).valid === false); });
chk('out-of-ladder credibility → invalid', CR.validateCredibilityMetadata({ credibility: 'Magic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] }).valid === false);
chk('normalize valid → derivedHere false (never derived here)', CR.normalizeCredibilityMetadata({ credibility: 'Model', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] }).derivedHere === false);
chk('normalize invalid → blocked', CR.normalizeCredibilityMetadata({}).eligible === false);

// ── H. synthetic never masquerades as real ──
chk('synthetic without SYNTHETIC_ONLY_LIMITATION → invalid', CR.validateCredibilityMetadata({ credibility: 'Heuristic', provenance: 'synthetic', confidence: 'low', limitations: [], blockedReasons: [] }).valid === false);
chk('synthetic with limitation → valid', CR.validateCredibilityMetadata({ credibility: 'Heuristic', provenance: 'synthetic', confidence: 'low', limitations: ['SYNTHETIC_ONLY_LIMITATION'], blockedReasons: [] }).valid === true);
chk('synthetic missing limitation flags SYNTHETIC_ONLY_LIMITATION', hasCode({ reasonCodes: CR.validateCredibilityMetadata({ credibility: 'Heuristic', provenance: 'synthetic', confidence: 'low', limitations: [], blockedReasons: [] }).reasonCodes }, 'SYNTHETIC_ONLY_LIMITATION'));
chk('out-of-enum provenance → invalid', CR.validateCredibilityMetadata({ credibility: 'Model', provenance: 'totally_real', confidence: 'low', limitations: [], blockedReasons: [] }).valid === false);

// ── I. unsupported metric fails closed ──
chk('supported metric eligible', CE.evaluateMetricSupport('speedDelta').eligible === true);
chk('unsupported metric → blocked UNSUPPORTED_METRIC', CE.evaluateMetricSupport('telepathyDelta').eligible === false && hasCode(CE.evaluateMetricSupport('telepathyDelta'), 'UNSUPPORTED_METRIC'));
[null, 42, {}, ''].forEach(v => chk('metric junk ' + JSON.stringify(v) + ' → blocked', CE.evaluateMetricSupport(v).eligible === false));

// ── J. comparison eligibility: scope + track identity ──
(() => { const r = CE.evaluateComparisonEligibility(fullComparisonInput()); chk('full comparison input → eligible', r.eligible === true); chk('eligible status = eligible_pending_production', r.status === 'eligible_pending_production'); chk('eligible result is null (CP1 produces no comparison)', r.result === null); chk('eligible carries delta sign', r.deltaSign && r.deltaSign.formula === 'comparison_minus_reference'); })();
(() => { const inp = fullComparisonInput(); inp.reference.identity.trackId = ''; chk('missing track id → blocked MISSING_TRACK_IDENTITY', !CE.evaluateComparisonEligibility(inp).eligible && hasCode(CE.evaluateComparisonEligibility(inp), 'MISSING_TRACK_IDENTITY')); })();
(() => { const inp = fullComparisonInput(); inp.comparison.identity.trackId = 'trackZ'; chk('mismatched track id → TRACK_IDENTITY_MISMATCH', hasCode(CE.evaluateComparisonEligibility(inp), 'TRACK_IDENTITY_MISMATCH')); })();
(() => { const inp = fullComparisonInput(); inp.comparison.identity.analysisCaseId = 'case_2'; chk('cross-case → CROSS_CASE_COMPARISON_UNSUPPORTED', hasCode(CE.evaluateComparisonEligibility(inp), 'CROSS_CASE_COMPARISON_UNSUPPORTED')); })();
(() => { const inp = fullComparisonInput(); inp.comparison.identity.sessionId = 'sess_2'; chk('cross-session → CROSS_SESSION_COMPARISON_UNSUPPORTED', hasCode(CE.evaluateComparisonEligibility(inp), 'CROSS_SESSION_COMPARISON_UNSUPPORTED')); })();
(() => { const inp = fullComparisonInput(); delete inp.reference.lapAuthority.completeness; chk('bad reference lap → REFERENCE_LAP_UNAVAILABLE', hasCode(CE.evaluateComparisonEligibility(inp), 'REFERENCE_LAP_UNAVAILABLE')); })();
(() => { const inp = fullComparisonInput(); delete inp.comparison.lapAuthority.timingValidity; chk('bad comparison lap → COMPARISON_LAP_UNAVAILABLE', hasCode(CE.evaluateComparisonEligibility(inp), 'COMPARISON_LAP_UNAVAILABLE')); })();
(() => { const inp = fullComparisonInput(); inp.comparison.normalizationAuthority.basis = 'gps'; chk('non-lap-distance basis → INCOMPATIBLE_NORMALIZATION', hasCode(CE.evaluateComparisonEligibility(inp), 'INCOMPATIBLE_NORMALIZATION')); })();
(() => { const inp = fullComparisonInput(); inp.credibilityMetadata = {}; chk('no credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(CE.evaluateComparisonEligibility(inp), 'INSUFFICIENT_CREDIBILITY_METADATA')); })();

// ── normalized position contract ──
chk('lap-distance authority valid', NP.evaluateNormalizedPositionAuthority(normAuth()).eligible === true);
(() => { const a = normAuth(); a.basis = 'gps_distance'; chk('non-lap-distance → INCOMPATIBLE_NORMALIZATION', hasCode(NP.evaluateNormalizedPositionAuthority(a), 'INCOMPATIBLE_NORMALIZATION')); })();
(() => { const a = normAuth(); delete a.distanceAuthority; chk('no distance authority → MISSING_NORMALIZED_DISTANCE_AUTHORITY', hasCode(NP.evaluateNormalizedPositionAuthority(a), 'MISSING_NORMALIZED_DISTANCE_AUTHORITY')); })();
chk('normalized range is [0,1)', NP.NORMALIZED_RANGE.min === 0 && NP.NORMALIZED_RANGE.maxExclusive === 1);
(() => { const r = normAuth(); const c = normAuth(); c.positionUnit = 'ft'; chk('unit mismatch → INCOMPATIBLE_NORMALIZATION', hasCode(NP.assessNormalizationCompatibility(r, c), 'INCOMPATIBLE_NORMALIZATION')); })();

// ── export envelope behaviour ──
(() => { const env = EX.buildComparisonExportEnvelope(); chk('envelope payload null in CP1', env.payload === null && env.generatedAt === null); chk('envelope validates', EX.validateComparisonExportEnvelope(env).valid === true); })();
(() => { const big = {}; const arr = []; for (let i = 0; i < 1000; i++) arr.push(i); big.samples = arr; chk('oversized array payload → blocked', EX.buildComparisonExportEnvelope(big).eligible === false); })();
(() => { const env = { schemaIdentity: 'racing-analyzer/comparison-export', schemaVersion: 999, payload: null }; chk('future schema version → blocked', EX.validateComparisonExportEnvelope(env).eligible === false); })();
// fail-closed: ONLY the exact current schema version validates; -1/0/0.5/future/non-number all reject (Codex CP1 finding)
[-1, 0, 0.5, 2, 999, '1', NaN, null].forEach(v => chk('non-exact schema version ' + JSON.stringify(v) + ' → blocked', EX.validateComparisonExportEnvelope({ schemaIdentity: 'racing-analyzer/comparison-export', schemaVersion: v, payload: null }).eligible === false));
chk('exact schema version 1 → valid', EX.validateComparisonExportEnvelope({ schemaIdentity: 'racing-analyzer/comparison-export', schemaVersion: 1, payload: null }).valid === true);
(() => { const env = { schemaIdentity: 'racing-analyzer/case-export', schemaVersion: 1, payload: null }; chk('wrong identity → blocked', EX.validateComparisonExportEnvelope(env).eligible === false); })();

// ── M. eligible results never carry a numeric comparison payload ──
chk('eligible lap result has null result', VL.evaluateLapAuthority(fullLapAuthority()).result === null);
chk('metric-supported result has null result', CE.evaluateMetricSupport('speedDelta').result === null);

// ── index aggregate ──
chk('index re-exports all surfaces', !!(IDX.reasonCodes && IDX.credibility && IDX.validLap && IDX.normalizedPosition && IDX.comparisonEligibility && IDX.comparisonExport));
chk('index identity constant', IDX.COMPARISON_EXPORT_IDENTITY === 'racing-analyzer/comparison-export');

// ── K/L. contracts have NO renderer dependency and NO algorithm (static scan) ──
const contractFiles = fs.readdirSync(CONTRACT_DIR).filter(f => f.endsWith('.js'));
chk('6 contract modules + index', contractFiles.length === 7, contractFiles);
// strip whole-line comments so the algorithm scan inspects CODE, not the prose that describes what the
// contract deliberately does NOT do (a JSDoc line may legitimately say "no interpolation").
function stripComments(s) { return s.split('\n').map(line => { const t = line.trim(); return (t.indexOf('*') === 0 || t.indexOf('/*') === 0 || t.indexOf('*/') === 0 || t.indexOf('//') === 0) ? '' : line; }).join('\n'); }
const ALGO_TOKENS = ['interpolat', 'resampl', 'extrapolat', 'convertToCanonical', 'parseCsv', 'computeObservedYawResponse', 'Math.'];
contractFiles.forEach(f => {
  const code = stripComments(fs.readFileSync(path.join(CONTRACT_DIR, f), 'utf8'));
  chk('no require() reaching renderer in ' + f, !/require\([^)]*renderer/.test(code));
  // every _req() dependency path is same-directory ('./'), never renderer / parent traversal
  const reqPaths = (code.match(/_req\(\s*['"]([^'"]+)['"]/g) || []).map(s => s.replace(/_req\(\s*['"]/, '').replace(/['"].*/, ''));
  chk('all contract deps are same-dir in ' + f, reqPaths.every(p => p.indexOf('./') === 0 && p.indexOf('renderer') === -1 && p.indexOf('../') === -1), reqPaths);
  ALGO_TOKENS.forEach(t => chk('no algorithm token "' + t + '" in code of ' + f, code.indexOf(t) === -1));
});

// ── P. the three R3.0C feature ids remain deferred with no renderer adapter (CP1 enables no UI) ──
['case_comparison', 'reference_lap', 'corner_delta'].forEach(id => { const fdef = Registry.FEATURES[id]; chk('feature ' + id + ' still deferred, no adapter', !!fdef && fdef.availability === 'deferred' && fdef.deferredReason === 'R3.0C' && !fdef.rendererAdapter); });

// ── N/O. the R3.0C scope guard + frozen boundary still pass with this change present ──
function runScript(rel, artifactName) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'r3c-cp1-'));
  const r = cp.spawnSync('node', [rel], { cwd: REPO, encoding: 'utf8', env: Object.assign({}, process.env, { ARTIFACT_DIR: tmp }) });
  let artifact = null;
  try { artifact = JSON.parse(fs.readFileSync(path.join(tmp, artifactName), 'utf8')); } catch (e) { artifact = null; }
  return { status: r.status, artifact, stderr: r.stderr };
}
(() => { const g = runScript('scripts/check-r3-0c-guard.js', 'r3-0c-guard.json'); chk('R3.0C scope guard exits 0', g.status === 0, g.stderr); chk('R3.0C scope guard ok===true', !!(g.artifact && g.artifact.ok === true), g.artifact); chk('R3.0C guard sees no R3.0C production diff', !!(g.artifact && g.artifact.r3_0c_production_diff === 0), g.artifact); })();
(() => { const f = runScript('scripts/check-frozen-boundary.js', 'frozen-boundary-result.json'); chk('frozen-boundary exits 0', f.status === 0, f.stderr); chk('frozen-boundary 0 diff', !!(f.artifact && f.artifact.frozenDiffCount === 0 && f.artifact.ok === true), f.artifact); })();

console.log(`r3.0c-contract-foundation: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
