/**
 * tests/r3-0c-corner-pairing.test.js — R3.0C C4 · Cross-Lap Corner Pairing Service.
 *
 * Verifies the pairing service: overlap-based 1-to-1 matching, ordinal pairing refused,
 * one-to-many ambiguity refused, partial coverage surfaces as limitation (not blocker),
 * identity equality across reference + comparison segmentations enforced.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-corner-pairing.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const RAC = Contracts.referenceAndCorner;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function seg(id, start, end) { return { id, startNorm: start, endNorm: end }; }
function segResult(over) {
  return Object.assign({
    eligible: true,
    identity: { caseId: 'c1', sessionId: 's1', lapId: 'lap_x', sourceId: 'src' },
    trackIdentity: { trackId: 't', layoutId: 'l', source: 'explicit' },
    segments: [seg('s1', 0.10, 0.20), seg('s2', 0.40, 0.50), seg('s3', 0.70, 0.80)],
  }, over || {});
}
function req(over) {
  return Object.assign({
    referenceSegmentation: segResult({ identity: { caseId: 'c1', sessionId: 's1', lapId: 'lap_3', sourceId: 'src' } }),
    comparisonSegmentation: segResult({ identity: { caseId: 'c1', sessionId: 's1', lapId: 'lap_5', sourceId: 'src' } }),
    policy: { allowOrdinalPairing: false },
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C4', Service.CHECKPOINT_FLOOR === 'C4_REFERENCE_AND_CORNER');
chk('A3 MIN_AGGREGATE_COVERAGE >= 0.5', Service.MIN_AGGREGATE_COVERAGE >= 0.5);

// B. happy path: identical segmentations → 3 pairs, coverage 1
(() => {
  const out = Service.pairCorners(req());
  chk('B1 eligible', out.eligible === true);
  chk('B2 3 pairs', out.pairs.length === 3);
  chk('B3 coverage === 1', out.coverage === 1);
  chk('B4 each pair overlapFraction === 1', out.pairs.every(p => p.overlapFraction === 1));
  chk('B5 no unpaired reference', out.unpairedReference.length === 0);
})();

// C. one missing on comparison → coverage 2/3 → partial-coverage limitation
(() => {
  const r = req(); r.comparisonSegmentation.segments = [seg('s1', 0.10, 0.20), seg('s2', 0.40, 0.50)];
  const out = Service.pairCorners(r);
  chk('C1 still eligible', out.eligible === true);
  chk('C2 2 pairs', out.pairs.length === 2);
  chk('C3 unpaired reference includes s3', out.unpairedReference.indexOf('s3') !== -1);
  chk('C4 coverage = 2/3', Math.abs(out.coverage - 2 / 3) < 1e-9);
  chk('C5 partial-coverage limitation surfaced (coverage<MIN_AGGREGATE_COVERAGE)', out.evidence.limitations.indexOf(CODES.CORNER_PAIRING_PARTIAL_COVERAGE) !== -1);
})();

// D. ordinal pairing forbidden
(() => {
  const r = req(); r.policy.allowOrdinalPairing = true;
  const out = Service.pairCorners(r);
  chk('D1 ordinal pairing → blocked', out.eligible === false);
  chk('D2 CORNER_PAIRING_ORDINAL_FORBIDDEN emitted', hasCode(out, CODES.CORNER_PAIRING_ORDINAL_FORBIDDEN));
})();

// E. cross-session refused
(() => {
  const r = req(); r.comparisonSegmentation.identity.sessionId = 's2';
  const out = Service.pairCorners(r);
  chk('E1 cross-session → blocked', out.eligible === false);
  chk('E2 CROSS_SESSION_COMPARISON_UNSUPPORTED emitted', hasCode(out, CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED));
})();

// F. cross-case refused
(() => {
  const r = req(); r.comparisonSegmentation.identity.caseId = 'c2';
  const out = Service.pairCorners(r);
  chk('F1 cross-case → blocked', out.eligible === false);
  chk('F2 CROSS_CASE_COMPARISON_UNSUPPORTED emitted', hasCode(out, CODES.CROSS_CASE_COMPARISON_UNSUPPORTED));
})();

// G. track identity mismatch
(() => {
  const r = req(); r.comparisonSegmentation.trackIdentity.layoutId = 'national';
  const out = Service.pairCorners(r);
  chk('G1 track mismatch → blocked', out.eligible === false);
  chk('G2 TRACK_IDENTITY_MISMATCH emitted', hasCode(out, CODES.TRACK_IDENTITY_MISMATCH));
})();

// H. ambiguous one-to-many (ref segment overlaps 2 cmp segments → 2 candidates)
(() => {
  const r = req();
  r.comparisonSegmentation.segments = [seg('a', 0.10, 0.15), seg('b', 0.16, 0.20), seg('c', 0.40, 0.50), seg('d', 0.70, 0.80)];
  // ref segment s1 = 0.10..0.20 overlaps both a (0.10..0.15) and b (0.16..0.20). Both overlap fractions
  // measured against min(len ref, len cmp) — a is 0.05 long, b is 0.04 long. ref s1 length 0.10.
  // overlap(s1,a) = 0.05; min(0.10, 0.05)=0.05; frac=1.0
  // overlap(s1,b) = 0.04; min(0.10, 0.04)=0.04; frac=1.0
  // Both candidates → AMBIGUOUS.
  const out = Service.pairCorners(r);
  chk('H1 one-to-many candidates → blocked', out.eligible === false);
  chk('H2 CORNER_PAIRING_AMBIGUOUS emitted', hasCode(out, CODES.CORNER_PAIRING_AMBIGUOUS));
})();

// I. insufficient overlap (overlap 0%)
(() => {
  const r = req(); r.comparisonSegmentation.segments = [seg('s1', 0.50, 0.55), seg('s2', 0.80, 0.85), seg('s3', 0.90, 0.95)];
  const out = Service.pairCorners(r);
  chk('I1 zero overlap → eligible but zero pairs (insufficient overlap surfaces via partial coverage)', out.eligible === true && out.pairs.length === 0);
  chk('I2 partial-coverage limitation surfaced', out.evidence.limitations.indexOf(CODES.CORNER_PAIRING_PARTIAL_COVERAGE) !== -1);
})();

// J. minimum overlap boundary
chk('J1 RAC.MIN_PAIR_NORMALIZED_OVERLAP === 0.5', RAC.MIN_PAIR_NORMALIZED_OVERLAP === 0.5);

// K. malformed request
[null, undefined, 'x', 42, []].forEach((bad, i) => {
  const r = Service.pairCorners(bad);
  chk('K.malformed-' + i + ' → blocked', r.eligible === false);
});

// L. result frozen + nested
(() => {
  const out = Service.pairCorners(req());
  chk('L1 result frozen', Object.isFrozen(out));
  chk('L2 pairs frozen', Object.isFrozen(out.pairs));
})();

console.log('r3-0c-corner-pairing: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
