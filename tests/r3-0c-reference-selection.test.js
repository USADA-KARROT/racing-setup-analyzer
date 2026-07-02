/**
 * tests/r3-0c-reference-selection.test.js — R3.0C C4 · Reference-Lap Selection Service.
 *
 * Verifies that the service ONLY honours explicit user selection with full supporting evidence,
 * refuses every auto-mode (fastestValid / medianValid / bestSectorComposite / implicitPrevious /
 * autoFirstLap / auto), refuses forged authority claims, surfaces stale / cross-case /
 * cross-session correctly, and forwards a valid request through C2 lap-authority + track-identity.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-reference-selection.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const RAC = Contracts.referenceAndCorner;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function lapEv(over) {
  // coverage gate: count >= 0.95 * (duration / medianTimebase). 600 samples, 0.1s median, 63s duration
  // → expected ≈ 631 → coverage ≈ 0.95.
  return Object.assign({
    caseId: 'case_1', sessionId: 'sess_1', lapId: 'lap_3', sourceId: 'csv_import:foo.csv',
    provenance: 'real',
    trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
    timing: { lapStartTime: 100, lapEndTime: 159.95, lapTimeMs: 59950 },
    samples: { count: 600, timebaseMedianSeconds: 0.1, timebaseMaxGapSeconds: 0.15 },
    distance: null,
    channelsAvailable: ['time', 'speed'],
  }, over || {});
}
function req(over) {
  return Object.assign({
    identity: { caseId: 'case_1', sessionId: 'sess_1' },
    trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
    selection: { selectedBy: 'user', lapId: 'lap_3', sourceId: 'csv_import:foo.csv', selectedAt: '2026-06-23T12:00:00Z' },
    candidateLap: lapEv(),
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 CHECKPOINT_FLOOR === C4_REFERENCE_AND_CORNER', Service.CHECKPOINT_FLOOR === 'C4_REFERENCE_AND_CORNER');

// B. happy path
(() => {
  const r = Service.selectReference(req());
  chk('B1 valid user selection → eligible', r.eligible === true);
  chk('B2 status=reference_selection_authoritative', r.status === 'reference_selection_authoritative');
  chk('B3 selectedBy preserved', r.selection.selectedBy === 'user');
  chk('B4 lapId preserved', r.selection.lapId === 'lap_3');
  chk('B5 caseId/sessionId mirrored', r.selection.caseId === 'case_1' && r.selection.sessionId === 'sess_1');
  chk('B6 trackIdentity source=explicit', r.trackIdentity.source === 'explicit');
  chk('B7 evidence carries limitations', Array.isArray(r.evidence.limitations) && r.evidence.limitations.indexOf('reference_authority_is_user_explicit_only') !== -1);
  chk('B8 result frozen', Object.isFrozen(r));
})();

// C. every forbidden auto-mode is refused
RAC.FORBIDDEN_REFERENCE_SELECTION_MODES.forEach(mode => {
  const r = req(); r.selection.selectedBy = mode;
  const out = Service.selectReference(r);
  chk('C.' + mode + ' → REFERENCE_AUTO_SELECTION_FORBIDDEN', out.eligible === false && hasCode(out, CODES.REFERENCE_AUTO_SELECTION_FORBIDDEN));
});

// D. missing/null selection
(() => {
  const r = req(); r.selection = null;
  const out = Service.selectReference(r);
  chk('D1 null selection → REFERENCE_NOT_SELECTED', out.eligible === false && hasCode(out, CODES.REFERENCE_NOT_SELECTED));
})();

// E. forged authority (selectedBy=user but no lapId/sourceId/selectedAt)
(() => {
  const r = req(); r.selection = { selectedBy: 'user', authoritative: true };
  const out = Service.selectReference(r);
  chk('E1 forged authority (no evidence) → REFERENCE_AUTHORITY_FORGED', out.eligible === false && hasCode(out, CODES.REFERENCE_AUTHORITY_FORGED));
})();

// F. candidate lap missing → REFERENCE_STALE_OR_DELETED
(() => {
  const r = req(); r.candidateLap = null;
  const out = Service.selectReference(r);
  chk('F1 missing candidate lap → REFERENCE_STALE_OR_DELETED', out.eligible === false && hasCode(out, CODES.REFERENCE_STALE_OR_DELETED));
})();

// G. cross-case / cross-session
(() => {
  const r = req(); r.candidateLap = lapEv({ caseId: 'case_other' });
  const out = Service.selectReference(r);
  chk('G1 cross-case candidate → CROSS_CASE_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_CASE_COMPARISON_UNSUPPORTED));
})();
(() => {
  const r = req(); r.candidateLap = lapEv({ sessionId: 'sess_other' });
  const out = Service.selectReference(r);
  chk('G2 cross-session candidate → CROSS_SESSION_COMPARISON_UNSUPPORTED', out.eligible === false && hasCode(out, CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED));
})();

// H. track identity mismatch
(() => {
  const r = req(); r.candidateLap = lapEv({ trackIdentity: { trackId: 'silverstone', layoutId: 'national', source: 'explicit' } });
  const out = Service.selectReference(r);
  chk('H1 track layout mismatch → TRACK_IDENTITY_MISMATCH', out.eligible === false && hasCode(out, CODES.TRACK_IDENTITY_MISMATCH));
})();

// I. lap-authority rejects candidate lap (e.g. invalid timing) → REFERENCE_LAP_UNAVAILABLE
(() => {
  const r = req(); r.candidateLap = lapEv({ timing: { lapStartTime: 100, lapEndTime: 100, lapTimeMs: 0 } });
  const out = Service.selectReference(r);
  chk('I1 candidate lap fails C2 lap-authority → REFERENCE_LAP_UNAVAILABLE', out.eligible === false && hasCode(out, CODES.REFERENCE_LAP_UNAVAILABLE));
})();

// J. selection lapId !== candidate lap lapId (persistence drift)
(() => {
  const r = req(); r.selection.lapId = 'lap_999';
  const out = Service.selectReference(r);
  chk('J1 selection lapId not matching candidate → REFERENCE_STALE_OR_DELETED', out.eligible === false && hasCode(out, CODES.REFERENCE_STALE_OR_DELETED));
})();

// K. malformed request
[null, undefined, 'x', 42, []].forEach((bad, i) => {
  const r = Service.selectReference(bad);
  chk('K.malformed-' + i + ' → blocked', r.eligible === false);
});

console.log('r3-0c-reference-selection: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
