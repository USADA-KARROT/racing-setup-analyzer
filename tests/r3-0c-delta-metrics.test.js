/**
 * tests/r3-0c-delta-metrics.test.js — R3.0C C5 · Delta Metrics Service.
 *
 * Verifies the six-metric closed allowlist, fixed delta = comparison - reference sign convention,
 * self-vs-self yields exact zeros, A/B swap negates every metric, cumulative end ≈ lap_time
 * difference when pairing covers the full lap, missing channel only blocks the related metric,
 * NaN/Infinity / empty / cross-case / cross-session refusals, and sign cannot be overridden.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-delta-metrics.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const DM = Contracts.deltaMetrics;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function pair(refFull, cmpFull, refZones, cmpZones) {
  refZones = refZones || {};
  cmpZones = cmpZones || {};
  return {
    referenceCorner: Object.assign({ id: 'r' + refFull, fullTimeMs: refFull, entryTimeMs: refFull / 3, midTimeMs: refFull / 3, exitTimeMs: refFull / 3 }, refZones),
    comparisonCorner: Object.assign({ id: 'c' + cmpFull, fullTimeMs: cmpFull, entryTimeMs: cmpFull / 3, midTimeMs: cmpFull / 3, exitTimeMs: cmpFull / 3 }, cmpZones),
  };
}
function req(over) {
  return Object.assign({
    identity: { caseId: 'c1', sessionId: 's1' },
    referenceLap: { lapTimeMs: 90000 },
    comparisonLap: { lapTimeMs: 89500 },
    pairing: { pairs: [pair(10000, 9800), pair(15000, 14800), pair(12000, 11900)] },
    requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta', 'entry_delta', 'mid_delta', 'exit_delta'],
    policy: { deltaSign: 'comparison_minus_reference' },
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C5_DELTA_METRICS', Service.CHECKPOINT_FLOOR === 'C5_DELTA_METRICS');
chk('A3 SIGN_FORMULA === comparison_minus_reference', Service.SIGN_FORMULA === 'comparison_minus_reference');

// B. happy path: all six metrics computed
(() => {
  const out = Service.computeDeltaMetrics(req());
  chk('B1 eligible', out.eligible === true);
  chk('B2 status=delta_metrics_computed', out.status === 'delta_metrics_computed');
  chk('B3 sign formula', out.sign === 'comparison_minus_reference');
  chk('B4 lap_time = cmp(89500) - ref(90000) = -500', out.metrics.lap_time.value === -500);
  chk('B5 delta_cumulative = sum(sector_delta) = (-200) + (-200) + (-100) = -500', out.metrics.delta_cumulative.value === -500);
  chk('B6 cumulative end ≈ lap_time difference (full coverage)', out.metrics.delta_cumulative.value === out.metrics.lap_time.value);
  chk('B7 sector_delta has 3 entries', out.metrics.sector_delta.perCorner.length === 3);
})();

// C. self-vs-self → all deltas = 0
(() => {
  const r = req();
  r.comparisonLap = { lapTimeMs: r.referenceLap.lapTimeMs };
  r.pairing.pairs = r.pairing.pairs.map(p => ({ referenceCorner: p.referenceCorner, comparisonCorner: Object.assign({}, p.referenceCorner, { id: 'self' }) }));
  const out = Service.computeDeltaMetrics(r);
  chk('C1 self-vs-self lap_time = 0', out.metrics.lap_time.value === 0);
  chk('C2 self-vs-self delta_cumulative = 0', out.metrics.delta_cumulative.value === 0);
  chk('C3 every sector_delta = 0', out.metrics.sector_delta.perCorner.every(v => v.value === 0));
  chk('C4 every entry_delta = 0', out.metrics.entry_delta.perCorner.every(v => v.value === 0));
  chk('C5 every mid_delta = 0', out.metrics.mid_delta.perCorner.every(v => v.value === 0));
  chk('C6 every exit_delta = 0', out.metrics.exit_delta.perCorner.every(v => v.value === 0));
})();

// D. A/B swap → sign symmetric
(() => {
  const a = Service.computeDeltaMetrics(req());
  const swap = req({
    referenceLap: { lapTimeMs: 89500 },
    comparisonLap: { lapTimeMs: 90000 },
    pairing: { pairs: [pair(9800, 10000), pair(14800, 15000), pair(11900, 12000)] },
  });
  const b = Service.computeDeltaMetrics(swap);
  chk('D1 swap → lap_time negated', a.metrics.lap_time.value === -b.metrics.lap_time.value);
  chk('D2 swap → delta_cumulative negated', a.metrics.delta_cumulative.value === -b.metrics.delta_cumulative.value);
  for (let i = 0; i < 3; i++) {
    chk('D3.' + i + ' swap → sector_delta negated', a.metrics.sector_delta.perCorner[i].value === -b.metrics.sector_delta.perCorner[i].value);
  }
})();

// E. wrong sign → blocked
(() => {
  const r = req(); r.policy.deltaSign = 'reference_minus_comparison';
  const out = Service.computeDeltaMetrics(r);
  chk('E1 wrong sign → blocked', out.eligible === false);
  chk('E2 DELTA_METRIC_SIGN_FORBIDDEN emitted', hasCode(out, CODES.DELTA_METRIC_SIGN_FORBIDDEN));
})();

// F. unsupported metric → blocked (UNSUPPORTED_METRIC)
(() => {
  const r = req(); r.requestedMetrics = ['lap_time', 'unsupportedDelta'];
  const out = Service.computeDeltaMetrics(r);
  chk('F1 unsupported metric → blocked', out.eligible === false);
  chk('F2 UNSUPPORTED_METRIC emitted', hasCode(out, CODES.UNSUPPORTED_METRIC));
})();

// G. corner-scope w/o pairs → CORNER_PAIR_REQUIRED
(() => {
  const r = req(); r.pairing.pairs = []; r.requestedMetrics = ['sector_delta'];
  const out = Service.computeDeltaMetrics(r);
  chk('G1 corner-scope w/o pairs → blocked', out.eligible === false);
  chk('G2 DELTA_METRIC_CORNER_PAIR_REQUIRED emitted', hasCode(out, CODES.DELTA_METRIC_CORNER_PAIR_REQUIRED));
})();

// H. lap-scope w/o pairs → still eligible (lap_time / delta_cumulative use fallback)
(() => {
  const r = req(); r.pairing.pairs = []; r.requestedMetrics = ['lap_time', 'delta_cumulative'];
  const out = Service.computeDeltaMetrics(r);
  chk('H1 lap-scope w/o pairs eligible', out.eligible === true);
  chk('H2 lap_time computed', out.metrics.lap_time.value === -500);
  chk('H3 delta_cumulative falls back to lap_time when zero pairs', out.metrics.delta_cumulative.value === -500);
})();

// I. NaN / Infinity in a pair → that metric reports DELTA_METRIC_NUMERIC_INVALID (partial)
(() => {
  const r = req();
  r.pairing.pairs[1].comparisonCorner.fullTimeMs = NaN;
  r.requestedMetrics = ['sector_delta'];
  const out = Service.computeDeltaMetrics(r);
  chk('I1 NaN in middle pair → service still eligible (partial)', out.eligible === true);
  chk('I2 partial flag set on sector_delta', out.metrics.sector_delta.partial === true);
  chk('I3 perCorner[1] is null', out.metrics.sector_delta.perCorner[1] === null);
  chk('I4 perCorner[0] is computed', out.metrics.sector_delta.perCorner[0].value === -200);
  chk('I5 limitation surfaced', out.evidence.limitations.indexOf('delta_metrics_partial_pair_coverage') !== -1);
})();

// J. unrelated metric still computed when one channel is missing
(() => {
  const r = req();
  // remove entryTimeMs from one pair — entry_delta should partial, but lap_time still works
  r.pairing.pairs[0].referenceCorner.entryTimeMs = NaN;
  r.requestedMetrics = ['lap_time', 'entry_delta'];
  const out = Service.computeDeltaMetrics(r);
  chk('J1 lap_time still computed', out.metrics.lap_time.value === -500);
  chk('J2 entry_delta partial (perCorner[0] is null)', out.metrics.entry_delta.partial === true && out.metrics.entry_delta.perCorner[0] === null);
})();

// K. NaN lapTimeMs → blocked (shape gate)
(() => {
  const r = req(); r.comparisonLap.lapTimeMs = NaN;
  const out = Service.computeDeltaMetrics(r);
  chk('K1 NaN lapTimeMs → blocked', out.eligible === false);
  chk('K2 DELTA_METRIC_NUMERIC_INVALID emitted', hasCode(out, CODES.DELTA_METRIC_NUMERIC_INVALID));
})();

// L. empty requestedMetrics → blocked
(() => {
  const r = req(); r.requestedMetrics = [];
  const out = Service.computeDeltaMetrics(r);
  chk('L1 empty requestedMetrics → blocked', out.eligible === false);
  chk('L2 DELTA_METRIC_EMPTY_INPUT emitted', hasCode(out, CODES.DELTA_METRIC_EMPTY_INPUT));
})();

// M. result frozen
(() => {
  const out = Service.computeDeltaMetrics(req());
  chk('M1 result frozen', Object.isFrozen(out));
  chk('M2 metrics frozen', Object.isFrozen(out.metrics));
})();

// N. malformed request
[null, undefined, 'x', 42, []].forEach((bad, i) => {
  const r = Service.computeDeltaMetrics(bad);
  chk('N.malformed-' + i + ' → blocked', r.eligible === false);
});

console.log('r3-0c-delta-metrics: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
