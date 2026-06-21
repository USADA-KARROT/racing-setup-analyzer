'use strict';
const CR = require('../renderer/js/calibration-registry.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const T = CR.CALIBRATION_TYPE;
const cal = (type, verified) => ({ calibrationType: type, value: 1, unit: ':1', source: 'sheet', confidence: 'high', verified: verified, applicableSessionIds: ['s1'], createdAt: '2026-06-21T00:00:00Z' });

(() => {
  const c = CR.makeCalibration(cal(T.STEERING_SIGN, true));
  chk('makeCalibration valid', c.valid === true && c.verified === true);
  chk('bad type rejected', CR.makeCalibration({ calibrationType: 'nope', source: 's', confidence: 'high', verified: true, createdAt: 'x' }).valid === false);
  chk('missing verified rejected', CR.makeCalibration({ calibrationType: T.STEERING_SIGN, source: 's', confidence: 'high', createdAt: 'x' }).valid === false);
})();
// capability layering: directional independent; higher metrics ALWAYS false in R2.3
(() => {
  const set = CR.buildCalibrationSet([cal(T.STEERING_SIGN, true), cal(T.STEERING_ZERO, true), cal(T.STEERING_RATIO, true), cal(T.ROAD_WHEEL_CONVERSION, true)]);
  const cap = CR.deriveCalibrationCapability(set);
  chk('sign confirmed status', cap.status.steeringSignConfirmed === true);
  chk('ratio verified status', cap.status.steeringRatioVerified === true);
  chk('signedResponse FALSE in R2.3', cap.signedResponseEligible === false);
  chk('calibratedMagnitude FALSE in R2.3', cap.calibratedMagnitudeEligible === false);
  chk('roadWheelMetrics FALSE in R2.3', cap.roadWheelMetricsEligible === false);
  chk('deferred flag', cap.deferredToR2_4 === true);
})();
// unverified calibration does not confirm
(() => {
  const cap = CR.deriveCalibrationCapability(CR.buildCalibrationSet([cal(T.STEERING_SIGN, false)]));
  chk('unverified sign not confirmed', cap.status.steeringSignConfirmed === false);
})();
console.log(`calibration-registry: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
