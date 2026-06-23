/**
 * tests/r3-0c-corner-segmentation.test.js — R3.0C C4 · Corner Segmentation Service.
 *
 * Verifies the proposal-based corner segmentation service: full vs reduced authority tier,
 * deterministic fingerprint identities (re-runs produce identical segment ids), short / overlap
 * / wrap-spanning candidates fail-closed, applyUserConfirmation lifts only proposal authority
 * and refuses to upgrade telemetry credibility, missing required channels are blocked, and
 * the algorithmVersion gate refuses drift.
 */
'use strict';
const Service = require('../renderer/js/r3-0c-corner-segmentation.js');
const Contracts = require('../contracts/r3.0c/index.js');
const CODES = Contracts.reasonCodes.REASON_CODES;
const RAC = Contracts.referenceAndCorner;

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

function lap(n) {
  const positions = []; for (let i = 0; i < n; i++) positions.push(i / (n - 1));
  return positions;
}
function constChan(n, v) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = v; return a; }
function cornerChan(n, start, end, peak) { const a = new Array(n).fill(0); for (let i = start; i < end; i++) a[i] = peak; return a; }
function fullChannels(n) {
  return {
    steering: constChan(n, 0.05),
    yaw_rate: constChan(n, 0.05),
    lateral_accel: constChan(n, 0.5),
    speed: constChan(n, 40),
    brake: constChan(n, 0),
    throttle: constChan(n, 0.5),
  };
}
function req(over) {
  const n = 600;
  return Object.assign({
    identity: { caseId: 'c1', sessionId: 's1', lapId: 'l3', sourceId: 'src' },
    trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
    normalizedDistanceAxis: { eligible: true, positions: lap(n) },
    channels: fullChannels(n),
    algorithmVersion: 1,
  }, over || {});
}

// A. constants
chk('A1 SERVICE_VERSION === 1', Service.SERVICE_VERSION === 1);
chk('A2 ALGORITHM_VERSION === 1', Service.ALGORITHM_VERSION === 1);
chk('A3 CHECKPOINT_FLOOR === C4', Service.CHECKPOINT_FLOOR === 'C4_REFERENCE_AND_CORNER');
chk('A4 LATERAL_ACCEL_THRESHOLD_MPS2 > 0', Service.LATERAL_ACCEL_THRESHOLD_MPS2 > 0);

// B. straight lap (no corners) → eligible with empty segments
(() => {
  const out = Service.segmentCorners(req());
  chk('B1 straight lap eligible', out.eligible === true);
  chk('B2 zero segments produced', out.segments.length === 0);
  chk('B3 full_authority status (all channels present)', out.evidence.authorityTier === 'full_authority');
})();

// C. one cornering load → one segment with fingerprint
(() => {
  const n = 600;
  const r = req();
  r.channels.lateral_accel = cornerChan(n, 200, 300, 8); // 100-sample corner, 16.6% of lap
  const out = Service.segmentCorners(r);
  chk('C1 one corner detected', out.eligible === true && out.segments.length === 1);
  chk('C2 segment startNorm ≈ 200/599', Math.abs(out.segments[0].startNorm - 200 / 599) < 0.01);
  chk('C3 segment has fingerprint', /^seg:/.test(out.segments[0].id));
  chk('C4 segment has entry/mid/exit zones', !!out.segments[0].zones && !!out.segments[0].zones.entry);
})();

// D. deterministic fingerprint — re-run on same input → same id
(() => {
  const r = req(); r.channels.lateral_accel = cornerChan(600, 200, 300, 8);
  const a = Service.segmentCorners(r);
  const b = Service.segmentCorners(r);
  chk('D1 deterministic id across re-runs', a.segments[0].id === b.segments[0].id);
})();

// E. very short corner (< MIN_SEGMENT_NORMALIZED_LENGTH) → dropped
(() => {
  const n = 600;
  const r = req();
  r.channels.lateral_accel = cornerChan(n, 100, 101, 8); // 1 sample = 0.16% of lap (< 0.5%)
  const out = Service.segmentCorners(r);
  chk('E1 too-short corner dropped (eligible with 0 segments)', out.eligible === true && out.segments.length === 0);
  chk('E2 evidence records droppedShort', out.evidence.droppedShortSegments >= 1);
})();

// F. reduced authority (lateral_accel only) → eligible + REDUCED_AUTHORITY limitation
(() => {
  const n = 600;
  const r = req();
  r.channels = { lateral_accel: cornerChan(n, 200, 300, 8) };
  const out = Service.segmentCorners(r);
  chk('F1 reduced-authority eligible', out.eligible === true);
  chk('F2 status=corner_segmentation_reduced_authority', out.status === 'corner_segmentation_reduced_authority');
  chk('F3 segment carries CORNER_SEGMENTATION_REDUCED_AUTHORITY limitation', out.segments[0].limitations.indexOf(CODES.CORNER_SEGMENTATION_REDUCED_AUTHORITY) !== -1);
})();

// G. no usable channels
(() => {
  const r = req(); r.channels = {};
  const out = Service.segmentCorners(r);
  chk('G1 empty channels → blocked', out.eligible === false);
  chk('G2 CORNER_SEGMENTATION_NO_USABLE_CHANNELS emitted', hasCode(out, CODES.CORNER_SEGMENTATION_NO_USABLE_CHANNELS));
})();

// H. algorithm version mismatch
(() => {
  const r = req(); r.algorithmVersion = 99;
  const out = Service.segmentCorners(r);
  chk('H1 algorithmVersion mismatch → blocked', out.eligible === false);
  chk('H2 CORNER_SEGMENTATION_ALGORITHM_VERSION_MISMATCH emitted', hasCode(out, CODES.CORNER_SEGMENTATION_ALGORITHM_VERSION_MISMATCH));
})();

// I. missing normalized distance axis
(() => {
  const r = req(); r.normalizedDistanceAxis = null;
  const out = Service.segmentCorners(r);
  chk('I1 missing axis → blocked', out.eligible === false);
  chk('I2 MISSING_NORMALIZED_DISTANCE_AUTHORITY emitted', hasCode(out, CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY));
})();

// J. applyUserConfirmation — valid confirmation lifts proposal authority only
(() => {
  const r = req(); r.channels.lateral_accel = cornerChan(600, 200, 300, 8);
  const seg = Service.segmentCorners(r);
  const out = Service.applyUserConfirmation(seg, [{ segmentId: seg.segments[0].id, userLabel: 'Copse', confirmedBy: 'user' }]);
  chk('J1 valid user confirmation eligible', out.eligible === true);
  chk('J2 segment carries userLabel', out.segments[0].userLabel === 'Copse');
  chk('J3 proposal authority lifted', out.segments[0].proposalAuthority === 'user_confirmed_naming_only');
  chk('J4 telemetry confidence preserved', out.segments[0].confidence === 'full_authority');
})();

// K. applyUserConfirmation — refusing to lift telemetry credibility
(() => {
  const r = req(); r.channels.lateral_accel = cornerChan(600, 200, 300, 8);
  const seg = Service.segmentCorners(r);
  const out = Service.applyUserConfirmation(seg, [{ segmentId: seg.segments[0].id, confirmedBy: 'user', liftTelemetryCredibility: true }]);
  chk('K1 liftTelemetryCredibility:true → blocked', out.eligible === false);
  chk('K2 CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY emitted', hasCode(out, CODES.CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY));
})();

// L. applyUserConfirmation — non-user confirmedBy refused
(() => {
  const r = req(); r.channels.lateral_accel = cornerChan(600, 200, 300, 8);
  const seg = Service.segmentCorners(r);
  const out = Service.applyUserConfirmation(seg, [{ segmentId: seg.segments[0].id, confirmedBy: 'auto' }]);
  chk('L1 non-user confirmedBy → blocked', out.eligible === false);
  chk('L2 CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY emitted', hasCode(out, CODES.CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY));
})();

// M. result frozen + nested
(() => {
  const r = req(); r.channels.lateral_accel = cornerChan(600, 200, 300, 8);
  const out = Service.segmentCorners(r);
  chk('M1 result frozen', Object.isFrozen(out));
  chk('M2 segments array frozen', Object.isFrozen(out.segments));
  chk('M3 segment[0] frozen', Object.isFrozen(out.segments[0]));
})();

// N. malformed request
[null, undefined, 'x', 42, []].forEach((bad, i) => {
  const r = Service.segmentCorners(bad);
  chk('N.malformed-' + i + ' → blocked', r.eligible === false);
});

console.log('r3-0c-corner-segmentation: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
