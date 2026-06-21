/**
 * tests/telemetry-observation.test.js — R2.2 §8: observeTelemetry honesty + fail-closed.
 * Directional tendency from yaw/steer-vs-speed trend; never K_us / road-wheel; confounders + limitations
 * always present; fail-closed on missing channels / timebase reset / low samples; pure (no-mutate, deterministic).
 */
'use strict';
const assert = require('assert');
const OBS = require('../renderer/js/telemetry-observation.js');
const FX = require('./fixtures/synthetic-telemetry.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

// no forbidden (calibrated / K_us / road-wheel) name mayOULD appear anywhere in the result
function noForbidden(result) {
  const s = JSON.stringify(result).toLowerCase();
  return ['k_us', 'kus', 'road_wheel', 'understeer_gradient', 'calibrated_steering'].every((f) => s.indexOf(f) === -1);
}

// ── understeer scenario ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer'));
  const r = OBS.observeTelemetry(sess, null, {});
  chk('understeer: valid', r.valid === true, r.blockedReasons);
  chk('understeer: observedTendency understeer_tendency', r.observedTendency === 'understeer_tendency', r.observedTendency);
  chk('understeer: credibility Heuristic', r.credibility === 'Heuristic');
  chk('understeer: method', r.method === 'speed_dependent_yaw_per_steer_trend');
  chk('understeer: metric is raw yaw/steer (not K_us)', r.observedMetrics.metric === 'yaw_rate_per_raw_steering');
  chk('understeer: limitations present', r.limitations.indexOf('steering_is_raw_uncalibrated') !== -1 && r.limitations.indexOf('directional_tendency_only_not_a_measured_magnitude') !== -1);
  chk('understeer: confounders present', r.confounders.indexOf('variable_steering_ratio') !== -1 && r.confounders.indexOf('track_curvature_and_corner_radius') !== -1);
  chk('understeer: confidence capped (low|medium)', ['low', 'medium'].indexOf(r.confidence) !== -1);
  chk('understeer: relativeChange negative', r.evidence.relativeChange < 0, r.evidence.relativeChange);
  chk('understeer: NO forbidden names', noForbidden(r));
  chk('understeer: channels reported', r.channels.speed.available && r.channels.yaw_rate.available && r.channels.steering.available);
})();

// ── oversteer scenario ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('oversteer'));
  const r = OBS.observeTelemetry(sess, null, {});
  chk('oversteer: observedTendency oversteer_tendency', r.observedTendency === 'oversteer_tendency', r.observedTendency);
  chk('oversteer: relativeChange positive', r.evidence.relativeChange > 0);
  chk('oversteer: NO forbidden names', noForbidden(r));
})();

// ── neutral scenario ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('neutral'));
  const r = OBS.observeTelemetry(sess, null, {});
  chk('neutral: observedTendency neutral_tendency', r.observedTendency === 'neutral_tendency', r.observedTendency);
})();

// ── negative-steer (left corners) understeer still classified correctly (raw-sign aware) ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer', { negativeSteer: true }));
  const r = OBS.observeTelemetry(sess, null, {});
  chk('neg-steer understeer: understeer_tendency', r.observedTendency === 'understeer_tendency', r.observedTendency);
})();

// ── fail-closed: missing yaw channel ──
(() => {
  const sess = FX.buildSession(FX.missingYawCsv());
  const r = OBS.observeTelemetry(sess, null, {});
  chk('missing yaw: not valid', r.valid === false);
  chk('missing yaw: unavailable', r.observedTendency === 'unavailable');
  chk('missing yaw: REQUIRED_CHANNEL_MISSING blocker', r.blockedReasons.some((b) => b.code === 'REQUIRED_CHANNEL_MISSING'));
})();

// ── fail-closed: timebase reset ──
(() => {
  const sess = FX.buildSession(FX.timebaseResetCsv());
  const r = OBS.observeTelemetry(sess, null, {});
  chk('timebase reset: not valid', r.valid === false);
  chk('timebase reset: blocked', r.blockedReasons.some((b) => b.code === 'TELEMETRY_TIMEBASE_BLOCKED' || b.code === 'OBSERVED_YAW_RESPONSE_UNAVAILABLE'));
})();

// ── fail-closed: too few samples ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer', { speeds: [20], perSeg: 4 }));
  const r = OBS.observeTelemetry(sess, null, {});
  chk('low samples: unavailable', r.observedTendency === 'unavailable' || r.observedTendency === 'inconclusive');
  chk('low samples: not valid', r.valid === false);
})();

// ── window selection ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer'));
  const full = OBS.observeTelemetry(sess, null, {});
  const win = OBS.observeTelemetry(sess, { startTime: 1.0, endTime: 6.0 }, {});
  chk('window: applied flag', win.selectedWindow.applied === true);
  chk('window: fewer samples than full', win.selectedWindow.sampleCount < full.selectedWindow.sampleCount);
})();

// ── pure: no-mutate + deterministic ──
(() => {
  const sess = FX.buildSession(FX.syntheticYawCsv('understeer'));
  const before = JSON.stringify(sess);
  const a = OBS.observeTelemetry(sess, null, {});
  chk('no-mutate session', JSON.stringify(sess) === before);
  const b = OBS.observeTelemetry(sess, null, {});
  chk('deterministic tendency', a.observedTendency === b.observedTendency && a.evidence.relativeChange === b.evidence.relativeChange);
})();

// ── exotic input never throws ──
(() => {
  let threw = false; let r;
  try { r = OBS.observeTelemetry(null, null, {}); } catch (e) { threw = true; }
  chk('exotic: no throw', threw === false);
  chk('exotic: unavailable', r && r.observedTendency === 'unavailable');
})();

console.log(`telemetry-observation: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
