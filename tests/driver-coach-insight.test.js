/**
 * tests/driver-coach-insight.test.js — R2.2 §11: deriveDriverCoachingInsight.
 * Steering observation from real telemetry; blocked pedal/track/lap claims when channels absent;
 * elevated-corrections practice priority; NO setup-recommendation fields (independent layer); pure.
 */
'use strict';
const DC = require('../renderer/js/driver-coach-insight.js');
const OBS = require('../renderer/js/telemetry-observation.js');
const FX = require('./fixtures/synthetic-telemetry.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

// ── basic steering-only telemetry (no pedal / track / lap) ──
(() => {
  const obs = OBS.observeTelemetry(FX.buildSession(FX.syntheticYawCsv('understeer')), null, {});
  const r = DC.deriveDriverCoachingInsight(obs, {});
  chk('basic: eligible', r.eligible === true);
  chk('basic: steering observation present', r.observations.some((o) => o.code === 'steering_correction_frequency'));
  chk('basic: steering note is raw not road-wheel', r.observations.some((o) => o.note === 'raw_steering_input_not_road_wheel_angle'));
  chk('basic: NO_PEDAL_CHANNELS blocked', r.blockedReasons.some((b) => b.code === 'NO_PEDAL_CHANNELS'));
  chk('basic: NO_TRACK_POSITION blocked', r.blockedReasons.some((b) => b.code === 'NO_TRACK_POSITION'));
  chk('basic: NO_LAP_SEGMENTATION blocked', r.blockedReasons.some((b) => b.code === 'NO_LAP_SEGMENTATION'));
  chk('basic: cannotConclude pedal + corner', r.cannotConclude.indexOf('throttle_or_brake_technique_no_pedal_channel') !== -1 && r.cannotConclude.indexOf('attribution_to_a_specific_corner_or_apex_no_track_position') !== -1);
  chk('basic: credibility Heuristic', r.credibility === 'Heuristic');
  // INDEPENDENT layer — no setup-change / recommendation fields whatsoever
  chk('basic: NO setupDirections field', !('setupDirections' in r));
  chk('basic: NO recommendation field', !('recommendation' in r) && !('setupRecommendation' in r) && !('likelySubsystems' in r));
})();

// ── elevated corrections → practice priority ──
(() => {
  const obs = OBS.observeTelemetry(FX.buildSession(FX.syntheticYawCsv('understeer', { corrections: true })), null, {});
  const r = DC.deriveDriverCoachingInsight(obs, {});
  chk('corrections: reversal count > 0', r.evidence.steeringReversalCount > 0, r.evidence.steeringReversalCount);
  chk('corrections: elevated qualitative', r.observations.some((o) => o.code === 'steering_correction_frequency' && o.qualitative === 'elevated_secondary_corrections'), r.observations);
  chk('corrections: smoother-steering practice priority', r.practicePriorities.indexOf('practice_one_smooth_steering_input_per_corner_reduce_mid_corner_corrections') !== -1);
})();

// ── rich channels: pedal present → pedal observed, no NO_PEDAL blocker; track present → no NO_TRACK ──
(() => {
  const obs = OBS.observeTelemetry(FX.buildSession(FX.richChannelsCsv()), null, {});
  const r = DC.deriveDriverCoachingInsight(obs, {});
  chk('rich: pedal observed', r.observations.some((o) => o.code === 'pedal_channels_present' && (o.throttle || o.brake)));
  chk('rich: no NO_PEDAL_CHANNELS', !r.blockedReasons.some((b) => b.code === 'NO_PEDAL_CHANNELS'));
  chk('rich: track position available → no NO_TRACK_POSITION', !r.blockedReasons.some((b) => b.code === 'NO_TRACK_POSITION'));
  chk('rich: lap segmentation available → no NO_LAP_SEGMENTATION', !r.blockedReasons.some((b) => b.code === 'NO_LAP_SEGMENTATION'));
})();

// ── no driver inputs (observation preflight-blocked) → DC blocked ──
(() => {
  const obs = OBS.observeTelemetry(FX.buildSession(FX.missingYawCsv()), null, {}); // no steering-usable observation path
  const r = DC.deriveDriverCoachingInsight(obs, {});
  chk('no driver inputs: not eligible', r.eligible === false);
  chk('no driver inputs: NO_DRIVER_INPUTS', r.blockedReasons.some((b) => b.code === 'NO_DRIVER_INPUTS' || b.code === 'NO_STEERING_CHANNEL'));
})();

// ── exotic / null ──
(() => {
  let threw = false; let r;
  try { r = DC.deriveDriverCoachingInsight(null, {}); } catch (e) { threw = true; }
  chk('null obs: no throw', threw === false);
  chk('null obs: blocked', r && r.eligible === false);
})();

// ── pure: no-mutate ──
(() => {
  const obs = OBS.observeTelemetry(FX.buildSession(FX.syntheticYawCsv('understeer')), null, {});
  const before = JSON.stringify(obs);
  DC.deriveDriverCoachingInsight(obs, {});
  chk('no-mutate observation', JSON.stringify(obs) === before);
})();

console.log(`driver-coach-insight: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
