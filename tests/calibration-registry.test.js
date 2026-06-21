'use strict';
const CR = require('../renderer/js/calibration-registry.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const T = CR.CALIBRATION_TYPE;
const SIG = CR.projectionSignature({ scale: 1, offset: 0, sign: 1 });
const BIND = { rawColumnId: 3, projectionSignature: SIG };
const CTX = { sessionId: 's1', steeringBinding: BIND };
// steering-bound calibrations carry a channelBinding; non-steering must not.
const cal = (type, verified, o) => { o = o || {}; const steering = CR.STEERING_BOUND_TYPES.indexOf(type) !== -1; return { calibrationType: type, value: o.value !== undefined ? o.value : 1, unit: ':1', source: 'sheet', confidence: 'high', verified: verified, applicableSessionIds: o.sessions || ['s1'], createdAt: '2026-06-21T00:00:00Z', channelBinding: steering ? (o.binding || BIND) : undefined }; };

// makeCalibration validation
(() => {
  chk('makeCalibration valid (steering + binding)', CR.makeCalibration(cal(T.STEERING_SIGN, true)).valid === true);
  chk('steering-bound without binding rejected', CR.makeCalibration({ calibrationType: T.STEERING_RATIO, value: 0.01, source: 's', confidence: 'high', verified: true, createdAt: 'x' }).valid === false);
  chk('non-steering with binding rejected', CR.makeCalibration({ calibrationType: T.SPEED_SCALE, value: 1, source: 's', confidence: 'high', verified: true, createdAt: 'x', channelBinding: BIND }).valid === false);
  chk('bad type rejected', CR.makeCalibration({ calibrationType: 'nope', source: 's', confidence: 'high', verified: true, createdAt: 'x' }).valid === false);
  chk('missing verified rejected', CR.makeCalibration({ calibrationType: T.SPEED_SCALE, value: 1, source: 's', confidence: 'high', createdAt: 'x' }).valid === false);
  chk('binding retained', (() => { const c = CR.makeCalibration(cal(T.STEERING_RATIO, true, { value: 0.01 })); return c.channelBinding && c.channelBinding.rawColumnId === 3 && c.channelBinding.projectionSignature === SIG; })());
})();

// R2.4: capability RE-DERIVED from evidence (no longer forced false)
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true, { value: 0.0125 })]);
  const cap = CR.deriveCalibrationCapability(set, CTX);
  chk('sign confirmed status', cap.status.steeringSignConfirmed === true);
  chk('ratio verified status', cap.status.steeringRatioVerified === true);
  chk('signedResponse TRUE (sign+zero)', cap.signedResponseEligible === true);
  chk('calibratedMagnitude TRUE (sign+zero+ratio value)', cap.calibratedMagnitudeEligible === true);
  chk('roadWheelMetrics TRUE', cap.roadWheelMetricsEligible === true);
  chk('steeringRatioValue surfaced', cap.steeringRatioValue === 0.0125);
  chk('deferred flag now false', cap.deferredToR2_4 === false);
  chk('no directional field on capability', cap.directional === undefined && cap.observedTendency === undefined);
})();

// sign+zero but NO ratio → signed only, magnitude blocked
(() => {
  const cap = CR.deriveCalibrationCapability(CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true)]), CTX);
  chk('signed eligible w/o ratio', cap.signedResponseEligible === true);
  chk('magnitude blocked w/o ratio', cap.calibratedMagnitudeEligible === false && cap.steeringRatioValue === null);
})();

// ratio value ≤ 0 → magnitude blocked
(() => {
  const cap = CR.deriveCalibrationCapability(CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true, { value: 0 })]), CTX);
  chk('non-positive ratio blocks magnitude', cap.calibratedMagnitudeEligible === false);
})();

// binding MISMATCH (different projection) → stale → blocked
(() => {
  const otherBind = { rawColumnId: 3, projectionSignature: CR.projectionSignature({ scale: 2, offset: 0, sign: 1 }) };
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true, { value: 0.0125 })]);
  const cap = CR.deriveCalibrationCapability(set, { sessionId: 's1', steeringBinding: otherBind });
  chk('binding mismatch → magnitude blocked', cap.calibratedMagnitudeEligible === false && cap.signedResponseEligible === false);
})();

// session NOT applicable → blocked
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true, { sessions: ['s2'] }), cal(T.STEERING_ZERO, true, { sessions: ['s2'] }), cal(T.STEERING_RATIO, true, { value: 0.0125, sessions: ['s2'] })]);
  const cap = CR.deriveCalibrationCapability(set, CTX);
  chk('other-session calibration → blocked', cap.calibratedMagnitudeEligible === false && cap.signedResponseEligible === false);
})();

// empty applicableSessionIds → applies to all sessions
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true, { sessions: [] }), cal(T.STEERING_ZERO, true, { sessions: [] }), cal(T.STEERING_RATIO, true, { value: 0.0125, sessions: [] })]);
  chk('empty scope applies to session', CR.deriveCalibrationCapability(set, CTX).calibratedMagnitudeEligible === true);
})();

// CONFLICTING ratio values → fail closed
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true, { value: 0.0125 }), cal(T.STEERING_RATIO, true, { value: 0.02 })]);
  chk('conflicting ratio → calibrationValue null', CR.calibrationValue(set, T.STEERING_RATIO, CTX) === null);
  chk('conflicting ratio → magnitude blocked', CR.deriveCalibrationCapability(set, CTX).calibratedMagnitudeEligible === false);
})();

// agreeing duplicate ratios → still a single value
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_RATIO, true, { value: 0.0125 }), cal(T.STEERING_RATIO, true, { value: 0.0125 })]);
  chk('agreeing duplicates → single value', CR.calibrationValue(set, T.STEERING_RATIO, CTX) === 0.0125);
})();

// unverified does not hold
(() => {
  chk('unverified sign not confirmed', CR.deriveCalibrationCapability(CR.buildCalibrationSet([cal(T.STEERING_SIGN, false)]), CTX).status.steeringSignConfirmed === false);
})();

// calibrationValue absent → null
(() => { chk('absent calibration value → null', CR.calibrationValue(CR.buildCalibrationSet([]), T.STEERING_RATIO, CTX) === null); })();

// no context (advisory) → steering-bound cannot match → flags false (non-authoritative path)
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true, { value: 0.0125 })]);
  chk('no-context advisory → magnitude false', CR.deriveCalibrationCapability(set).calibratedMagnitudeEligible === false);
})();

console.log(`calibration-registry: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
