/**
 * tests/race-engineer-insight.test.js — R2.2 §10: deriveRaceEngineerInsight.
 * Inspection-only vs directional vs blocked-quantitative; no causal/numeric claim; missing-evidence
 * output; RE consumes ONLY the comparison (no driver evidence); pure.
 */
'use strict';
const RE = require('../renderer/js/race-engineer-insight.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

const cmp = (o) => Object.assign({ valid: true, predictedTendency: 'understeer', observedTendency: 'understeer', differenceClass: 'observed_more_understeer', confidence: 'medium', modelTelemetryComparisonEligible: true }, o);
const hasNoDigits = (arr) => arr.every((s) => typeof s === 'string' && !/\d/.test(s));

// ── directional (eligible, actionable) ──
(() => {
  const r = RE.deriveRaceEngineerInsight(cmp(), { vehicleName: 'demo' });
  chk('directional: eligible.directional true', r.eligible.directional === true);
  chk('directional: eligible.inspection true', r.eligible.inspection === true);
  chk('directional: quantitative FALSE', r.eligible.quantitative === false);
  chk('directional: front subsystems', r.likelySubsystems.indexOf('front_tyre_state') !== -1 && r.likelySubsystems.indexOf('front_axle_effective_roll_stiffness') !== -1);
  chk('directional: setupDirections reduce front roll stiffness bias', r.setupDirections.indexOf('consider_reducing_front_roll_stiffness_bias') !== -1);
  chk('directional: trialOrder one change at a time', r.trialOrder.indexOf('change_one_item_at_a_time') !== -1 && r.trialOrder.indexOf('repeat_the_same_corner_as_an_a_b_test') !== -1);
  chk('directional: NO numeric in setupDirections (no clicks/N-mm)', hasNoDigits(r.setupDirections));
  chk('directional: NO numeric in inspectionPriorities', hasNoDigits(r.inspectionPriorities));
  chk('directional: missingEvidence cites validated mapping', r.missingEvidence.indexOf('validated_setup_change_to_rate_mapping_for_quantitative_advice') !== -1);
  chk('directional: credibility Heuristic', r.credibility === 'Heuristic');
})();

// ── oversteer → rear ──
(() => {
  const r = RE.deriveRaceEngineerInsight(cmp({ predictedTendency: 'oversteer', observedTendency: 'oversteer', differenceClass: 'observed_more_oversteer' }));
  chk('oversteer: rear subsystems', r.likelySubsystems.indexOf('rear_tyre_state') !== -1);
  chk('oversteer: increase front support', r.setupDirections.indexOf('consider_increasing_front_support') !== -1);
})();

// ── speed-dependent ──
(() => {
  const r = RE.deriveRaceEngineerInsight(cmp({ differenceClass: 'speed_dependent_difference' }));
  chk('speed-dep: directional true', r.eligible.directional === true);
  chk('speed-dep: aero/platform subsystems', r.likelySubsystems.indexOf('aero_balance_vs_speed') !== -1);
})();

// ── aligned → no balance change indicated ──
(() => {
  const r = RE.deriveRaceEngineerInsight(cmp({ differenceClass: 'aligned' }));
  chk('aligned: directional false (not actionable)', r.eligible.directional === false);
  chk('aligned: inspection still available', r.eligible.inspection === true);
})();

// ── inspection-only: comparison not eligible but model predicts a tendency ──
(() => {
  const r = RE.deriveRaceEngineerInsight({ valid: false, predictedTendency: 'understeer', observedTendency: 'inconclusive', differenceClass: 'inconclusive', modelTelemetryComparisonEligible: false });
  chk('inspection-only: inspection true', r.eligible.inspection === true);
  chk('inspection-only: directional false', r.eligible.directional === false);
  chk('inspection-only: inspect front from model prediction', r.inspectionPriorities.indexOf('inspect_front_tyre_pressure_and_temperature') !== -1);
  chk('inspection-only: missingEvidence cites comparison', r.missingEvidence.indexOf('eligible_model_vs_telemetry_comparison') !== -1);
  chk('inspection-only: DIRECTIONAL_INSIGHT_BLOCKED', r.blockedReasons.some((b) => b.code === 'DIRECTIONAL_INSIGHT_BLOCKED'));
})();

// ── no model prediction → blocked ──
(() => {
  const r = RE.deriveRaceEngineerInsight({ valid: false, predictedTendency: 'unavailable', modelTelemetryComparisonEligible: false });
  chk('no prediction: inspection false', r.eligible.inspection === false);
  chk('no prediction: NO_MODEL_PREDICTION', r.blockedReasons.some((b) => b.code === 'NO_MODEL_PREDICTION'));
})();

// ── missing comparison / exotic ──
(() => {
  chk('null comparison: blocked, no throw', RE.deriveRaceEngineerInsight(null).blockedReasons.some((b) => b.code === 'NO_COMPARISON'));
})();

// ── structural separation: RE never reads observation/driver fields ──
(() => {
  const r = RE.deriveRaceEngineerInsight(cmp());
  chk('no driver fields in RE output', !('observations' in r) && !('practicePriorities' in r) && !('driverInputs' in r));
})();

// ── pure: no-mutate ──
(() => {
  const c = cmp();
  const before = JSON.stringify(c);
  RE.deriveRaceEngineerInsight(c, {});
  chk('no-mutate comparison', JSON.stringify(c) === before);
})();

console.log(`race-engineer-insight: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
