/**
 * tests/r3-0c-comparison-adapter.test.js — R3.0C C1 · Production adapter (renderer-level).
 *
 * Verifies the adapter at renderer/js/r3-0c-comparison-adapter.js:
 *   1. Loads contracts/r3.0c/ deterministically in Node and exposes its surface unchanged.
 *   2. ADAPTER_VERSION and CHECKPOINT_FLOOR are stable constants (C1_PRODUCTION_ADAPTER).
 *   3. comparisonScope / deltaSign / deltaSignFormula round-trip the contract values (no rewriting).
 *   4. supportedMetrics / reasonCodes / allReasonCodes round-trip the contract values.
 *   5. evaluateMetricSupport delegates to the contract and fails closed on unknown metric.
 *   6. evaluateComparisonEligibility delegates and returns the contract's eligible_pending_production
 *      marker (result === null) when fully eligible, else a blocked result with reason codes — every
 *      gating failure mode (cross-case, cross-session, missing/mismatched track id, missing reference
 *      lap, missing comparison lap, incompatible normalization, missing credibility metadata) routes
 *      to its mandated reason code unchanged.
 *   7. validateCredibilityMetadata / evaluateLapAuthority / assessNormalizationCompatibility delegate
 *      and produce the same eligible flag and reason codes as the underlying contracts.
 *   8. The adapter exposes NO algorithm: no lap segmentation, no corner pairing, no delta computation,
 *      no reference-lap selection, no export, no UI binding — the API keys are a fixed allowlist.
 *   9. Static-source inspection: the adapter requires '../../contracts/r3.0c/index.js' as a top-level
 *      literal (so the no-runtime-consumer validator can see it) and does NOT name any C2+ surface
 *      (corner / delta / segmentation / normalization-distance / export schema / UI / activation).
 *  10. Round-trip independence: the adapter's output for a blocked input matches the contract's output
 *      byte-for-byte (no field mutation, no field stripping, no field addition).
 *
 * Oracle independence: expected reason codes are literal strings; the contracts are required directly
 * for cross-checking, but the adapter under test is required from its renderer/js path so the same
 * artefact the validator sees is exercised.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const ADAPTER_PATH = path.join(REPO, 'renderer', 'js', 'r3-0c-comparison-adapter.js');
const Adapter = require('../renderer/js/r3-0c-comparison-adapter.js');
const Contracts = require('../contracts/r3.0c/index.js');
const RC = require('../contracts/r3.0c/reason-codes.js');
const VL = require('../contracts/r3.0c/valid-lap-contract.js');
const NP = require('../contracts/r3.0c/normalized-position-contract.js');
const CE = require('../contracts/r3.0c/comparison-eligibility-contract.js');
const CR = require('../contracts/r3.0c/credibility-contract.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const hasCode = (res, code) => !!(res && Array.isArray(res.reasonCodes) && res.reasonCodes.indexOf(code) !== -1);

// ── fixtures (hand-authored; never derived from SUT) ──
function fullLapAuthority() {
  return { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } };
}
function ident(over) { return Object.assign({ analysisCaseId: 'case_1', sessionId: 'sess_1', lapId: 'lap_1', trackId: 'trackA', layoutId: 'layout1' }, over || {}); }
function normAuth() { return { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' }; }
function fullComparisonInput(over) {
  return Object.assign({
    analysisCaseId: 'case_1',
    reference: { identity: ident({ lapId: 'lap_3' }), lapAuthority: fullLapAuthority(), normalizationAuthority: normAuth() },
    comparison: { identity: ident({ lapId: 'lap_5' }), lapAuthority: fullLapAuthority(), normalizationAuthority: normAuth() },
    credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] },
  }, over || {});
}

// ── A. constants + identity round-trip ──
chk('A1 ADAPTER_VERSION === 2 (C2 surface added)', Adapter.ADAPTER_VERSION === 2);
chk('A2 CHECKPOINT_FLOOR === C1_PRODUCTION_ADAPTER (historical authorization point, does NOT advance)', Adapter.CHECKPOINT_FLOOR === 'C1_PRODUCTION_ADAPTER');
chk('A2b activeCheckpoint() === C2_LAP_AUTHORITY (latest surface available)', Adapter.activeCheckpoint() === 'C2_LAP_AUTHORITY');
chk('A2c exposes() includes production_adapter_present + lap_authority_present + track_identity_authoritative', (() => {
  const c = Adapter.exposes();
  return Array.isArray(c) && c.includes('production_adapter_present') && c.includes('lap_authority_present') && c.includes('track_identity_authoritative');
})());
chk('A3 loadContracts() returns contract namespace identity', Adapter.loadContracts() === Contracts);
chk('A4 deltaSignFormula() === contract.deltaSignFormula()', Adapter.deltaSignFormula() === CE.deltaSignFormula());
chk('A5 deltaSign() identity-equal to contract DELTA_SIGN', Adapter.deltaSign() === CE.DELTA_SIGN);
chk('A6 comparisonScope() identity-equal to contract COMPARISON_SCOPE', Adapter.comparisonScope() === CE.COMPARISON_SCOPE);
chk('A7 supportedMetrics() identity-equal to contract SUPPORTED_METRICS', Adapter.supportedMetrics() === CE.SUPPORTED_METRICS);
chk('A8 reasonCodes() identity-equal to contract REASON_CODES', Adapter.reasonCodes() === RC.REASON_CODES);
chk('A9 allReasonCodes() identity-equal to contract ALL_REASON_CODES', Adapter.allReasonCodes() === RC.ALL_REASON_CODES);

// ── B. evaluateMetricSupport delegation ──
chk('B1 supported metric eligible', Adapter.evaluateMetricSupport('speedDelta').eligible === true);
chk('B2 unsupported metric → blocked + UNSUPPORTED_METRIC', Adapter.evaluateMetricSupport('telepathyDelta').eligible === false && hasCode(Adapter.evaluateMetricSupport('telepathyDelta'), 'UNSUPPORTED_METRIC'));
[null, 42, {}, '', 'unknown'].forEach(v => chk('B3 metric junk ' + JSON.stringify(v) + ' → blocked', Adapter.evaluateMetricSupport(v).eligible === false));
// adapter delegation matches contract output structurally
['speedDelta', 'timeDelta', 'unknownX'].forEach(m => {
  const a = Adapter.evaluateMetricSupport(m), c = CE.evaluateMetricSupport(m);
  chk('B4 metric ' + m + ' eligible flag matches contract', a.eligible === c.eligible);
  chk('B5 metric ' + m + ' status matches contract', a.status === c.status);
});

// ── C. evaluateComparisonEligibility delegation: eligible path ──
(() => {
  const inp = fullComparisonInput();
  const r = Adapter.evaluateComparisonEligibility(inp);
  chk('C1 full input → eligible', r.eligible === true);
  chk('C2 eligible status === eligible_pending_production', r.status === 'eligible_pending_production');
  chk('C3 eligible result === null (NO numeric payload at C1)', r.result === null);
  chk('C4 eligible carries delta sign', r.deltaSign && r.deltaSign.formula === 'comparison_minus_reference');
  chk('C5 eligible carries scope', r.scope && r.scope.sameAnalysisCaseOnly === true);
})();

// ── D. evaluateComparisonEligibility: every gate maps to the mandated reason code ──
const gates = [
  ['D1 missing track id', i => { i.reference.identity.trackId = ''; }, 'MISSING_TRACK_IDENTITY'],
  ['D2 mismatched track id', i => { i.comparison.identity.trackId = 'trackZ'; }, 'TRACK_IDENTITY_MISMATCH'],
  ['D3 cross-case', i => { i.comparison.identity.analysisCaseId = 'case_2'; }, 'CROSS_CASE_COMPARISON_UNSUPPORTED'],
  ['D4 cross-session', i => { i.comparison.identity.sessionId = 'sess_2'; }, 'CROSS_SESSION_COMPARISON_UNSUPPORTED'],
  ['D5 broken reference lap authority', i => { delete i.reference.lapAuthority.completeness; }, 'REFERENCE_LAP_UNAVAILABLE'],
  ['D6 broken comparison lap authority', i => { delete i.comparison.lapAuthority.timingValidity; }, 'COMPARISON_LAP_UNAVAILABLE'],
  ['D7 non-lap-distance normalization basis', i => { i.comparison.normalizationAuthority.basis = 'gps'; }, 'INCOMPATIBLE_NORMALIZATION'],
  ['D8 empty credibility metadata', i => { i.credibilityMetadata = {}; }, 'INSUFFICIENT_CREDIBILITY_METADATA'],
];
gates.forEach(g => {
  const inp = fullComparisonInput(); g[1](inp);
  const r = Adapter.evaluateComparisonEligibility(inp);
  chk(g[0] + ' → blocked', r.eligible === false);
  chk(g[0] + ' → carries ' + g[2], hasCode(r, g[2]));
});

// ── E. adapter result ≡ contract result, byte-for-byte ──
(() => {
  const inp = fullComparisonInput();
  const a = JSON.stringify(Adapter.evaluateComparisonEligibility(inp));
  const c = JSON.stringify(CE.evaluateComparisonEligibility(inp));
  chk('E1 eligible adapter ≡ contract output', a === c);
})();
(() => {
  const inp = fullComparisonInput(); inp.reference.identity.trackId = '';
  const a = JSON.stringify(Adapter.evaluateComparisonEligibility(inp));
  const c = JSON.stringify(CE.evaluateComparisonEligibility(inp));
  chk('E2 blocked adapter ≡ contract output', a === c);
})();
(() => {
  const inp = null;
  const a = JSON.stringify(Adapter.evaluateComparisonEligibility(inp));
  const c = JSON.stringify(CE.evaluateComparisonEligibility(inp));
  chk('E3 null-input adapter ≡ contract output', a === c);
})();

// ── F. credibility / lap / normalization delegation ──
chk('F1 validateCredibilityMetadata({}) === contract({})', JSON.stringify(Adapter.validateCredibilityMetadata({})) === JSON.stringify(CR.validateCredibilityMetadata({})));
chk('F2 evaluateLapAuthority(full) === contract(full)', JSON.stringify(Adapter.evaluateLapAuthority(fullLapAuthority())) === JSON.stringify(VL.evaluateLapAuthority(fullLapAuthority())));
chk('F3 evaluateLapAuthority(broken) === contract(broken)', (() => { const a = fullLapAuthority(); delete a.timingValidity; return JSON.stringify(Adapter.evaluateLapAuthority(a)) === JSON.stringify(VL.evaluateLapAuthority(a)); })());
chk('F4 assessNormalizationCompatibility(null,null) === contract(null,null)', JSON.stringify(Adapter.assessNormalizationCompatibility(null, null)) === JSON.stringify(NP.assessNormalizationCompatibility(null, null)));
chk('F5 assessNormalizationCompatibility(matching) === contract(matching)', JSON.stringify(Adapter.assessNormalizationCompatibility(normAuth(), normAuth())) === JSON.stringify(NP.assessNormalizationCompatibility(normAuth(), normAuth())));

// ── G. adapter has NO algorithm surface beyond delegation ──
const allowedKeys = new Set([
  'ADAPTER_VERSION', 'CHECKPOINT_FLOOR', 'activeCheckpoint', 'exposes',
  'loadContracts', 'comparisonScope', 'deltaSign', 'deltaSignFormula',
  'supportedMetrics', 'reasonCodes', 'allReasonCodes',
  'evaluateMetricSupport', 'evaluateComparisonEligibility',
  'validateCredibilityMetadata', 'evaluateLapAuthority', 'assessNormalizationCompatibility',
  // C2 surface
  'deriveLapAuthority', 'assessMetricChannelRequirements', 'lapAuthorityDefaultThresholds', 'lapAuthorityMetricChannels',
  'deriveTrackIdentity', 'equalsTrackIdentity',
  'deriveDistanceAuthority', 'distanceAuthorityForbiddenSources',
]);
const actualKeys = Object.keys(Adapter).sort();
const unknownKeys = actualKeys.filter(k => !allowedKeys.has(k));
chk('G1 adapter exposes exactly the allowlisted keys (no unknown surface)', unknownKeys.length === 0, unknownKeys);
chk('G2 adapter does not expose lap segmentation', typeof Adapter.segmentLap === 'undefined');
chk('G3 adapter does not expose corner pairing', typeof Adapter.pairCorners === 'undefined' && typeof Adapter.matchCorners === 'undefined');
chk('G4 adapter does not expose delta computation', typeof Adapter.computeDelta === 'undefined' && typeof Adapter.deltaCumulative === 'undefined');
chk('G5 adapter does not expose reference selection', typeof Adapter.selectReferenceLap === 'undefined' && typeof Adapter.chooseFastestValidLap === 'undefined');
chk('G6 adapter does not expose normalization distance', typeof Adapter.normalizeDistance === 'undefined' && typeof Adapter.normalizedPosition === 'undefined');
chk('G7 adapter does not expose export', typeof Adapter.exportComparison === 'undefined' && typeof Adapter.buildComparisonExport === 'undefined');
chk('G8 adapter does not bind into Feature Registry', typeof Adapter.registerWithFeatureRegistry === 'undefined' && typeof Adapter.activateFeature === 'undefined');

// ── H. static-source inspection: top-level literal contract require, no C2+ surface names ──
(() => {
  const src = fs.readFileSync(ADAPTER_PATH, 'utf8');
  // The require must be a literal string the no-consumer validator can see.
  chk('H1 adapter source contains literal require of contracts/r3.0c/index.js', /require\(\s*(['"`])\.\.\/\.\.\/contracts\/r3\.0c\/index\.js\1\s*\)/.test(src));
  // C2+ surface names must NOT appear in the adapter source (other than in this comment-style mention).
  const c2Surface = ['cornerSegmentation', 'pairCorners', 'normalizeDistance', 'selectReferenceLap', 'computeDelta', 'deltaCumulative', 'exportComparison', 'fastest_valid', 'median_valid', 'best_sector_composite'];
  c2Surface.forEach(name => chk('H2 adapter source does not implement ' + name, src.indexOf(name + '(') === -1 && src.indexOf('function ' + name) === -1));
  // The adapter source must NOT include any runtime LLM hook.
  ['fetch(', 'XMLHttpRequest', 'WebSocket', 'eval(', 'new Function('].forEach(s => chk('H3 adapter source does not include ' + s, src.indexOf(s) === -1));
})();

// ── I. UMD shape ──
chk('I1 adapter is a CommonJS export object', typeof Adapter === 'object' && Adapter !== null);
chk('I2 adapter exposes its API on globalThis under R3_0C_ComparisonAdapter', typeof globalThis.R3_0C_ComparisonAdapter === 'object' && globalThis.R3_0C_ComparisonAdapter === Adapter);

// ── J. C2 delegation — adapter forwards to lap-authority / track-identity / distance-authority services ──
const LapAuthority = require('../renderer/js/r3-0c-lap-authority.js');
const TrackIdentity = require('../renderer/js/r3-0c-track-identity.js');
const DistanceAuthority = require('../renderer/js/r3-0c-distance-authority.js');

// J1: deriveLapAuthority — adapter output ≡ service output (byte-for-byte JSON round-trip).
(() => {
  const ev = {
    caseId: 'case_1', sessionId: 'sess_1', lapId: 'lap_5', sourceId: 'csv_import:foo.csv',
    provenance: 'real',
    trackIdentity: { trackId: 'trackA', layoutId: 'layout1', source: 'explicit' },
    timing: { lapStartTime: 100, lapEndTime: 160, lapTimeMs: 60000 },
    samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 0.15 },
    distance: null,
    channelsAvailable: ['time', 'speed', 'lateral_accel', 'steering'],
  };
  chk('J1 deriveLapAuthority(adapter) ≡ deriveLapAuthority(service)',
    JSON.stringify(Adapter.deriveLapAuthority(ev)) === JSON.stringify(LapAuthority.deriveLapAuthority(ev)));
})();

// J2: assessMetricChannelRequirements — supported metric with channel present → eligible.
(() => {
  const ev = { channelsAvailable: ['time', 'speed', 'steering'] };
  const r = Adapter.assessMetricChannelRequirements('steeringCorrectionDelta', ev);
  chk('J2 metric channel present → eligible', r.eligible === true && r.metric === 'steeringCorrectionDelta');
})();

// J3: assessMetricChannelRequirements — supported metric with channel ABSENT → METRIC_REQUIRED_CHANNEL_UNAVAILABLE.
(() => {
  const ev = { channelsAvailable: ['time', 'speed'] }; // no brake
  const r = Adapter.assessMetricChannelRequirements('brakingOnsetDelta', ev);
  chk('J3 missing required channel → blocked + METRIC_REQUIRED_CHANNEL_UNAVAILABLE',
    r.eligible === false && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf('METRIC_REQUIRED_CHANNEL_UNAVAILABLE') !== -1);
  chk('J3b adapter response includes missingChannels=brake', Array.isArray(r.missingChannels) && r.missingChannels.indexOf('brake') !== -1);
})();

// J4: lapAuthorityDefaultThresholds — adapter returns the service constant (identity equality).
chk('J4 lapAuthorityDefaultThresholds() identity-equal to service constant',
  Adapter.lapAuthorityDefaultThresholds() === LapAuthority.DEFAULT_THRESHOLDS);

// J5: lapAuthorityMetricChannels — adapter returns the service constant.
chk('J5 lapAuthorityMetricChannels() identity-equal to service constant',
  Adapter.lapAuthorityMetricChannels() === LapAuthority.METRIC_REQUIRED_CHANNELS);

// J6: deriveTrackIdentity — explicit identity → authoritative.
(() => {
  const r = Adapter.deriveTrackIdentity({ trackId: 'silverstone', layoutId: 'gp', source: 'explicit' });
  chk('J6 explicit track identity → authoritative', r.authoritative === true && r.identity.trackId === 'silverstone');
})();

// J7: deriveTrackIdentity — name-only metadata → blocked + MISSING_TRACK_IDENTITY.
(() => {
  const r = Adapter.deriveTrackIdentity({ name: 'Silverstone GP', filename: 'silverstone.csv' });
  chk('J7 name-only metadata → blocked + MISSING_TRACK_IDENTITY',
    r.authoritative === false && r.reasonCodes.indexOf('MISSING_TRACK_IDENTITY') !== -1);
  chk('J7b adapter records rejected inference signals (name, filename)',
    Array.isArray(r.rejectedInferenceSignals) && r.rejectedInferenceSignals.indexOf('name') !== -1 && r.rejectedInferenceSignals.indexOf('filename') !== -1);
})();

// J8: equalsTrackIdentity — equal authoritative identities.
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  chk('J8 equalsTrackIdentity equal', Adapter.equalsTrackIdentity(a, b).equal === true);
})();

// J9: equalsTrackIdentity — different layout → TRACK_IDENTITY_MISMATCH.
(() => {
  const a = { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' };
  const b = { trackId: 'silverstone', layoutId: 'national', source: 'explicit' };
  const r = Adapter.equalsTrackIdentity(a, b);
  chk('J9 different layout → blocked + TRACK_IDENTITY_MISMATCH',
    r.equal === false && r.reasonCodes.indexOf('TRACK_IDENTITY_MISMATCH') !== -1);
})();

// J10: deriveDistanceAuthority — explicit channel proposal → eligible.
(() => {
  const ev = {
    proposedChannels: [{
      channelName: 'lap_distance', unit: 'm', direction: 'forward',
      wrapSemantics: 'no_wrap', authorityStatus: 'channel_source_declared', limitations: [],
    }],
    fallbackInferences: [],
  };
  const r = Adapter.deriveDistanceAuthority(ev);
  chk('J10 explicit channel proposal → eligible', r.eligible === true && r.authority.sourceChannel === 'lap_distance');
})();

// J11: deriveDistanceAuthority — only inferential proposal → blocked + MISSING_NORMALIZED_DISTANCE_AUTHORITY.
(() => {
  const ev = {
    proposedChannels: [{
      channelName: 'derived_distance', unit: 'm', direction: 'forward',
      wrapSemantics: 'no_wrap', authorityStatus: 'inferred_from_sample_index', limitations: [],
    }],
    fallbackInferences: ['inferred_from_speed_integral'],
  };
  const r = Adapter.deriveDistanceAuthority(ev);
  chk('J11 inferential authority status → blocked + MISSING_NORMALIZED_DISTANCE_AUTHORITY',
    r.eligible === false && r.reasonCodes.indexOf('MISSING_NORMALIZED_DISTANCE_AUTHORITY') !== -1);
  chk('J11b records rejected proposal as inferential', r.rejectedProposals.length === 1 && r.rejectedProposals[0].rejectedReason === 'authority_status_inferential_rejected');
  chk('J11c records rejected fallback inferences', r.rejectedInferentialSources.indexOf('inferred_from_speed_integral') !== -1);
})();

// J12: distanceAuthorityForbiddenSources — identity-equal to service constant.
chk('J12 distanceAuthorityForbiddenSources() identity-equal to service constant',
  Adapter.distanceAuthorityForbiddenSources() === DistanceAuthority.FORBIDDEN_INFERENCE_SOURCES);

console.log('r3-0c-comparison-adapter: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
