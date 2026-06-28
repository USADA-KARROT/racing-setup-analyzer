/**
 * tests/r3-0c-comparison-export.test.js — R3.0C C6 · Comparison Export Service.
 *
 * Verifies the closed-allowlist gateway between authoritative C5 results and the bounded portable
 * envelope: happy path with deterministic JSON round-trip; blocked-result export carries no
 * fabricated metrics; stale-result guard rejects mismatched case/session; adversarial inputs
 * (unknown reason codes, non-finite numbers, oversized strings, exotic objects, future schema)
 * fail-closed without leaking through the envelope; authority bypass attempts (missing token,
 * wrong status string, sign mismatch, caller spreading raw fields) refused.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-comparison-export.js');
const Adapter = require('../renderer/js/r3-0c-comparison-adapter.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const EX = Contracts.comparisonExport;
const CE = Contracts.comparisonEligibility;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function freezeResult(o) { return Object.freeze(o); }

function eligibleResultFixture() {
  // mirrors the shape r3-0c-delta-metrics emits for eligible:true.
  return freezeResult({
    eligible: true,
    status: 'delta_metrics_computed',
    sign: 'comparison_minus_reference',
    identity: Object.freeze({ caseId: 'caseA', sessionId: 'sess1' }),
    metrics: Object.freeze({
      lap_time: { scope: 'lap', value: -500 },
      delta_cumulative: { scope: 'lap', value: -500 },
      sector_delta: { scope: 'corner', partial: false, perCorner: Object.freeze([
        Object.freeze({ cornerId: 'C1', value: -100, available: true }),
        Object.freeze({ cornerId: 'C2', value: -200, available: true }),
        Object.freeze({ cornerId: 'C3', value: -200, available: true }),
      ])},
      entry_delta: { scope: 'phase', partial: false, perCorner: Object.freeze([]) },
      mid_delta: { scope: 'phase', partial: false, perCorner: Object.freeze([]) },
      exit_delta: { scope: 'phase', partial: false, perCorner: Object.freeze([]) },
    }),
    evidence: Object.freeze({ sign: 'comparison_minus_reference', pairCount: 3, requestedMetrics: ['lap_time'], limitations: [] }),
    reasonCodes: Object.freeze([]),
    result: null,
  });
}

function blockedResultFixture() {
  return freezeResult({
    eligible: false,
    status: 'blocked',
    reasonCodes: Object.freeze([CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE]),
    explanationKeys: Object.freeze(['r3_0c.reason.metric_required_channel_unavailable']),
    detail: null,
    metrics: null,
  });
}

function association(over) {
  return Object.assign({
    caseId: 'caseA', sessionId: 'sess1', trackId: 'silverstone', layoutId: 'gp',
    positionBasis: 'lap_distance', positionDirection: 'increasing',
  }, over || {});
}

function credibility(over) {
  return Object.assign({
    credibility: 'Heuristic', provenance: 'real', confidence: 'low',
    limitations: [], blockedReasons: [],
  }, over || {});
}

function req(over) {
  return Object.assign({
    result: eligibleResultFixture(),
    association: association(),
    credibilityMetadata: credibility(),
    generationToken: 'gen-token-001',
    referenceLap: { sessionId: 'sess1', lapId: 'lap_ref', lapTimeMs: 90000 },
    comparisonLap: { sessionId: 'sess1', lapId: 'lap_cmp', lapTimeMs: 89500 },
    framing: { cannotConclude: [], alternativeExplanations: [], nextValidationAction: null },
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C6_EXPORT', Service.CHECKPOINT_FLOOR === 'C6_EXPORT');
chk('A3 SIGN_FORMULA === comparison_minus_reference', Service.SIGN_FORMULA === 'comparison_minus_reference');
chk('A4 ELIGIBLE_PAYLOAD_KEYS frozen + 15 keys', Object.isFrozen(Service.ELIGIBLE_PAYLOAD_KEYS) && Service.ELIGIBLE_PAYLOAD_KEYS.length === 15);
chk('A5 BLOCKED_PAYLOAD_KEYS frozen + 6 keys', Object.isFrozen(Service.BLOCKED_PAYLOAD_KEYS) && Service.BLOCKED_PAYLOAD_KEYS.length === 6);

// B. happy path: eligible result → envelope built, serialized, parsed, re-validated
(() => {
  const out = Service.buildComparisonExport(req());
  chk('B1 eligible result → status=comparison_export_built', out.eligible === true && out.status === 'comparison_export_built');
  chk('B2 envelope frozen + identity correct', Object.isFrozen(out.envelope) && out.envelope.schemaIdentity === 'racing-analyzer/comparison-export' && out.envelope.schemaVersion === 1);
  chk('B3 serialized is a string', typeof out.serialized === 'string' && out.serialized.length > 0);
  chk('B4 parsed mirror frozen', Object.isFrozen(out.parsed));
  chk('B5 payload has comparisonStatus=success', out.envelope.payload.comparisonStatus === 'success');
  chk('B6 cumulativeDelta available', out.envelope.payload.cumulativeDelta.available === true && out.envelope.payload.cumulativeDelta.value === -500);
  chk('B7 corners has 3 entries', out.envelope.payload.corners.length === 3 && out.envelope.payload.corners.every(c => c.available === true));
  chk('B8 metricAvailability for sector_delta = true', out.envelope.payload.metricAvailability.sector_delta === true);
  // F6 governance: phase metrics MUST be reported unavailable while phase_boundary_contract is disabled.
  chk('B9 metricAvailability for phase trio = false (governance gate)', out.envelope.payload.metricAvailability.entry_delta === false && out.envelope.payload.metricAvailability.mid_delta === false && out.envelope.payload.metricAvailability.exit_delta === false);
  chk('B10 association mirrors caller', out.envelope.payload.association.trackId === 'silverstone' && out.envelope.payload.association.positionBasis === 'lap_distance');
})();

// C. deterministic JSON round-trip — same input → same serialized bytes
(() => {
  const out1 = Service.buildComparisonExport(req());
  const out2 = Service.buildComparisonExport(req());
  chk('C1 same input → identical serialized', out1.serialized === out2.serialized);
})();

// D. blocked result → only minimal fields exported, no fabricated metrics
(() => {
  const r = req({ result: blockedResultFixture() });
  const out = Service.buildComparisonExport(r);
  chk('D1 blocked result → export built', out.eligible === true && out.status === 'comparison_export_built');
  chk('D2 payload.comparisonStatus=blocked', out.envelope.payload.comparisonStatus === 'blocked');
  chk('D3 payload has reasonCodes', Array.isArray(out.envelope.payload.reasonCodes) && out.envelope.payload.reasonCodes.length === 1);
  chk('D4 payload.identity only has caseId+sessionId', Object.keys(out.envelope.payload.identity).length === 2);
  // No metrics / cumulativeDelta / corners / metricAvailability in blocked export.
  chk('D5 no cumulativeDelta in blocked payload', out.envelope.payload.cumulativeDelta === undefined);
  chk('D6 no corners in blocked payload', out.envelope.payload.corners === undefined);
  chk('D7 no metricAvailability in blocked payload', out.envelope.payload.metricAvailability === undefined);
})();

// E. authority bypass: caller spreads a "fake eligible" result
(() => {
  // wrong status (claims eligible but status is something else)
  const r = req(); r.result = freezeResult({ eligible: true, status: 'totally_fake_status', sign: 'comparison_minus_reference', identity: { caseId: 'caseA', sessionId: 'sess1' }, metrics: {} });
  const out = Service.buildComparisonExport(r);
  chk('E1 eligible with wrong status → blocked', out.eligible === false && hasCode(out, CODES.INTERNAL_CONTRACT_VIOLATION));
})();
(() => {
  // wrong sign convention
  const r = req(); r.result = freezeResult({ eligible: true, status: 'delta_metrics_computed', sign: 'reference_minus_comparison', identity: { caseId: 'caseA', sessionId: 'sess1' }, metrics: {} });
  const out = Service.buildComparisonExport(r);
  chk('E2 eligible with reversed sign → DELTA_METRIC_SIGN_FORBIDDEN', out.eligible === false && hasCode(out, CODES.DELTA_METRIC_SIGN_FORBIDDEN));
})();
(() => {
  // missing generationToken
  const r = req(); delete r.generationToken;
  const out = Service.buildComparisonExport(r);
  chk('E3 missing generationToken → blocked', out.eligible === false);
})();
(() => {
  // empty generationToken
  const r = req(); r.generationToken = '';
  const out = Service.buildComparisonExport(r);
  chk('E4 empty generationToken → blocked', out.eligible === false);
})();

// F. stale result: association vs result.identity mismatch → fail closed
(() => {
  const r = req(); r.association = association({ caseId: 'caseB' });
  const out = Service.buildComparisonExport(r);
  chk('F1 stale caseId → CROSS_CASE_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_CASE_COMPARISON_UNSUPPORTED));
})();
(() => {
  const r = req(); r.association = association({ sessionId: 'sess99' });
  const out = Service.buildComparisonExport(r);
  chk('F2 stale sessionId → CROSS_SESSION_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED));
})();

// G. association validation
(() => { const r = req(); r.association = association({ trackId: '' }); chk('G1 missing trackId → MISSING_TRACK_IDENTITY', hasCode(Service.buildComparisonExport(r), CODES.MISSING_TRACK_IDENTITY)); })();
(() => { const r = req(); r.association = association({ positionBasis: 'bogus' }); chk('G2 bogus positionBasis → MISSING_POSITION_BASIS', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_BASIS)); })();
(() => { const r = req(); r.association = association({ positionDirection: 'sideways' }); chk('G3 bogus positionDirection → MISSING_POSITION_DIRECTION', hasCode(Service.buildComparisonExport(r), CODES.MISSING_POSITION_DIRECTION)); })();

// H. credibility validation
(() => { const r = req(); r.credibilityMetadata = {}; chk('H1 empty credibility → INSUFFICIENT_CREDIBILITY_METADATA', hasCode(Service.buildComparisonExport(r), CODES.INSUFFICIENT_CREDIBILITY_METADATA)); })();
(() => { const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic' }); chk('H2 synthetic without SYNTHETIC_ONLY_LIMITATION → blocked', !Service.buildComparisonExport(r).eligible); })();
(() => {
  const r = req(); r.credibilityMetadata = credibility({ provenance: 'synthetic', limitations: [CODES.SYNTHETIC_ONLY_LIMITATION] });
  const out = Service.buildComparisonExport(r);
  chk('H3 synthetic with SYNTHETIC_ONLY_LIMITATION → eligible', out.eligible === true);
  chk('H4 export carries provenance=synthetic', out.envelope.payload.provenance === 'synthetic');
})();

// I. adversarial payload contents
(() => {
  // non-finite cumulative delta in result.metrics
  const r = req();
  const result = JSON.parse(JSON.stringify(r.result));
  result.metrics.delta_cumulative.value = NaN;
  // restore shape (JSON.parse strips functions but we want fresh plain object)
  r.result = freezeResult(Object.assign(result, { identity: r.result.identity, metrics: Object.assign(result.metrics, { sector_delta: r.result.metrics.sector_delta, entry_delta: r.result.metrics.entry_delta, mid_delta: r.result.metrics.mid_delta, exit_delta: r.result.metrics.exit_delta }) }));
  const out = Service.buildComparisonExport(r);
  // The builder should mark cumulativeDelta as unavailable rather than leaking NaN.
  chk('I1 non-finite cumulative delta → marked unavailable in payload', out.eligible === true && out.envelope.payload.cumulativeDelta.available === false);
})();
(() => {
  // unknown reason code in credibility.limitations → blocked
  const r = req(); r.credibilityMetadata = credibility({ limitations: ['NOT_A_REAL_CODE'] });
  const out = Service.buildComparisonExport(r);
  chk('I2 unknown limitation code → blocked', out.eligible === false);
})();
(() => {
  // oversized framing array → blocked
  const r = req();
  r.framing = { cannotConclude: new Array(EX.MAX_BOUNDED_ARRAY + 1).fill({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }) };
  const out = Service.buildComparisonExport(r);
  chk('I3 oversized cannotConclude array → blocked', out.eligible === false);
})();
(() => {
  // free-form prose in framing entry → rejected (not a plain {reasonCode,i18nKey,params?})
  const r = req();
  r.framing = { cannotConclude: ['driver was late on brakes'] };
  const out = Service.buildComparisonExport(r);
  chk('I4 free-form framing string → blocked', out.eligible === false);
})();
(() => {
  // params with array value → rejected
  const r = req();
  r.framing = { cannotConclude: [{ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2, 3] } }] };
  const out = Service.buildComparisonExport(r);
  chk('I5 framing params with array value → blocked', out.eligible === false);
})();
(() => {
  // params with exotic Date → rejected
  const r = req();
  r.framing = { cannotConclude: [{ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }] };
  const out = Service.buildComparisonExport(r);
  chk('I6 framing params with Date → blocked', out.eligible === false);
})();

// J. authority bypass via corner injection
(() => {
  // sector_delta perCorner array length exceeds bound
  const r = req();
  const overSized = new Array(EX.MAX_BOUNDED_ARRAY + 1).fill(null).map((_, i) => Object.freeze({ cornerId: 'C' + i, value: 0, available: true }));
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(overSized) }) }) }));
  const out = Service.buildComparisonExport(r);
  chk('J1 oversized corners array → blocked', out.eligible === false);
})();
(() => {
  // corner entry with non-finite value (claims available) → blocked
  const r = req();
  const bad = [Object.freeze({ cornerId: 'C1', value: Infinity, available: true })];
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(bad) }) }) }));
  const out = Service.buildComparisonExport(r);
  chk('J2 corner value Infinity → blocked', out.eligible === false);
})();
(() => {
  // corner entry with missing cornerId → blocked
  const r = req();
  const bad = [Object.freeze({ value: -100, available: true })];
  r.result = freezeResult(Object.assign({}, r.result, { metrics: Object.assign({}, r.result.metrics, { sector_delta: Object.freeze({ scope: 'corner', partial: false, perCorner: Object.freeze(bad) }) }) }));
  const out = Service.buildComparisonExport(r);
  chk('J3 corner missing cornerId → blocked', out.eligible === false);
})();

// K. allowlist closure: caller cannot smuggle extra keys via reference lap summary
(() => {
  const r = req();
  r.referenceLap = { sessionId: 'sess1', lapId: 'lap_ref', lapTimeMs: 90000, secretRawTelemetry: 'x'.repeat(100), unknownField: 42 };
  const out = Service.buildComparisonExport(r);
  chk('K1 caller smuggle in referenceLap → built but extras dropped', out.eligible === true);
  chk('K1 referenceLap own-keys = sessionId,lapId,lapTimeMs only', Object.keys(out.envelope.payload.referenceLap).sort().join(',') === 'lapId,lapTimeMs,sessionId');
})();

// L. envelope is closed (F1 closure preserved at the C6 layer)
(() => {
  const r = req();
  const out = Service.buildComparisonExport(r);
  chk('L1 envelope own-keys = ENVELOPE_KEYS exactly', Object.keys(out.envelope).sort().join(',') === EX.ENVELOPE_KEYS.slice().sort().join(','));
})();

// M. round-trip determinism — parsed mirror equals envelope.payload structurally
(() => {
  const r = req();
  const out = Service.buildComparisonExport(r);
  // re-validate the parsed envelope independently — must still validate.
  const reCheck = EX.validateComparisonExportEnvelope(out.parsed);
  chk('M1 parsed mirror still validates', reCheck.valid === true);
  chk('M2 serialized payload matches parsed payload', JSON.stringify(out.envelope.payload) === JSON.stringify(out.parsed.payload));
})();

// N. adapter delegation
chk('N1 adapter exposes buildComparisonExport function', typeof Adapter.buildComparisonExport === 'function');
chk('N2 adapter activeCheckpoint === C6_EXPORT (when service loaded)', Adapter.activeCheckpoint() === 'C6_EXPORT');
chk('N3 adapter exposes() includes comparison_export_present', Adapter.exposes().indexOf('comparison_export_present') !== -1);
chk('N4 adapter.comparisonExportIdentity === contract identity', Adapter.comparisonExportIdentity() === EX.COMPARISON_EXPORT_IDENTITY);
chk('N5 adapter.comparisonExportSchemaVersion === 1', Adapter.comparisonExportSchemaVersion() === 1);
chk('N6 adapter.comparisonExportEnvelopeKeys frozen 4 fields', Object.isFrozen(Adapter.comparisonExportEnvelopeKeys()) && Adapter.comparisonExportEnvelopeKeys().length === 4);
(() => {
  // delegation identity: adapter route ≡ service route for the same request.
  const a = Adapter.buildComparisonExport(req());
  const s = Service.buildComparisonExport(req());
  chk('N7 adapter ≡ service serialized', a.serialized === s.serialized);
})();

// O. malformed top-level request
[null, undefined, 'x', 42, [], true].forEach((bad, i) => {
  const r = Service.buildComparisonExport(bad);
  chk('O.malformed-' + i + ' → blocked', r.eligible === false);
});

console.log('r3-0c-comparison-export: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
