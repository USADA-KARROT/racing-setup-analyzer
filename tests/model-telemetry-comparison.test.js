/**
 * tests/model-telemetry-comparison.test.js — R2.2 §9: compareModelToTelemetry.
 * All six difference classes, condition-derived eligibility (never hard-true), qualitative/heuristic
 * labelling, assumptions present, fail-closed on missing inputs; integrates with a real observation.
 */
'use strict';
const CMP = require('../renderer/js/model-telemetry-comparison.js');
const OBS = require('../renderer/js/telemetry-observation.js');
const FX = require('./fixtures/synthetic-telemetry.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

const model = (pred, ug) => ({ valid: true, predictedTendency: pred, modelResultSnapshot: { understeer_gradient: ug != null ? ug : 0.3 } });
// mirrors observeTelemetry: only 'unavailable' is valid:false; 'inconclusive' still ran (valid:true)
const obs = (tendency, relChange, confidence) => ({
  valid: tendency !== 'unavailable',
  observedTendency: tendency, method: 'speed_dependent_yaw_per_steer_trend',
  evidence: { relativeChange: relChange != null ? relChange : 0 }, confidence: confidence || 'low',
});

// ── difference classes ──
(() => {
  let r = CMP.compareModelToTelemetry(model('understeer'), obs('understeer_tendency', -0.4), {});
  chk('same-dir + strong trend → observed_more_understeer', r.differenceClass === 'observed_more_understeer', r.differenceClass);
  chk('eligible true', r.modelTelemetryComparisonEligible === true && r.valid === true);

  r = CMP.compareModelToTelemetry(model('understeer'), obs('understeer_tendency', -0.04), {});
  chk('same-dir + weak trend → aligned', r.differenceClass === 'aligned', r.differenceClass);

  r = CMP.compareModelToTelemetry(model('neutral'), obs('understeer_tendency', -0.3), {});
  chk('neutral vs understeer → observed_more_understeer', r.differenceClass === 'observed_more_understeer', r.differenceClass);

  r = CMP.compareModelToTelemetry(model('understeer'), obs('oversteer_tendency', 0.3), {});
  chk('understeer vs oversteer → observed_more_oversteer', r.differenceClass === 'observed_more_oversteer', r.differenceClass);

  r = CMP.compareModelToTelemetry(model('oversteer'), obs('neutral_tendency', 0.0), {});
  chk('oversteer vs neutral → observed_more_understeer', r.differenceClass === 'observed_more_understeer', r.differenceClass);

  r = CMP.compareModelToTelemetry(model('understeer'), obs('mixed_or_speed_dependent', null), {});
  chk('mixed → speed_dependent_difference', r.differenceClass === 'speed_dependent_difference' && r.modelTelemetryComparisonEligible === true, r.differenceClass);
})();

// ── eligibility is condition-derived (never hard-true) ──
(() => {
  let r = CMP.compareModelToTelemetry(model('understeer'), obs('inconclusive'), {});
  chk('observed inconclusive → not eligible', r.modelTelemetryComparisonEligible === false && r.differenceClass === 'inconclusive');
  chk('observed inconclusive → OBSERVATION_INCONCLUSIVE blocker', r.blockedReasons.some((b) => b.code === 'OBSERVATION_INCONCLUSIVE'));

  r = CMP.compareModelToTelemetry(model('understeer'), obs('unavailable'), {});
  chk('observed unavailable → unavailable + not eligible', r.differenceClass === 'unavailable' && r.modelTelemetryComparisonEligible === false);

  r = CMP.compareModelToTelemetry({ valid: false, predictedTendency: 'unavailable' }, obs('understeer_tendency', -0.3), {});
  chk('model invalid → not eligible', r.modelTelemetryComparisonEligible === false && r.blockedReasons.some((b) => b.code === 'MODEL_RESULT_NOT_AVAILABLE'));

  r = CMP.compareModelToTelemetry(null, null, {});
  chk('both null → not eligible, no throw', r.modelTelemetryComparisonEligible === false && r.differenceClass === 'unavailable');
})();

// ── honesty: assumptions + heuristic labelling + separated evidence ──
(() => {
  const r = CMP.compareModelToTelemetry(model('understeer', 0.4), obs('understeer_tendency', -0.4, 'medium'), {});
  chk('assumptions present', r.assumptions.indexOf('qualitative_directional_comparison_not_numeric_residual') !== -1);
  chk('assumptions: model is steady-state', r.assumptions.indexOf('model_is_steady_state_single_point_no_speed_dependent_transfer_function') !== -1);
  chk('credibility Heuristic', r.credibility === 'Heuristic');
  chk('evidence separates model/telemetry/derived', r.evidence.modelDerived && r.evidence.telemetryObservation && r.evidence.derivedComparison);
  chk('model evidence labelled Model', r.evidence.modelDerived.credibility === 'Model');
  chk('telemetry evidence labelled Heuristic', r.evidence.telemetryObservation.credibility === 'Heuristic');
  chk('confidence bounded by observation', r.confidence === 'medium');
})();

// ── integrates with a REAL observation (understeer fixture) ──
(() => {
  const observation = OBS.observeTelemetry(FX.buildSession(FX.syntheticYawCsv('understeer')), null, {});
  const r = CMP.compareModelToTelemetry(model('understeer', 0.4), observation, {});
  chk('real obs: eligible', r.modelTelemetryComparisonEligible === true, r.blockedReasons);
  chk('real obs: observed_more_understeer (model mild + telemetry speed-dependent understeer)', r.differenceClass === 'observed_more_understeer', r.differenceClass);
  chk('real obs: predicted understeer', r.predictedTendency === 'understeer');
  chk('real obs: observed understeer', r.observedTendency === 'understeer');
})();

// ── pure: no-mutate ──
(() => {
  const m = model('understeer'), o = obs('understeer_tendency', -0.3);
  const bm = JSON.stringify(m), bo = JSON.stringify(o);
  CMP.compareModelToTelemetry(m, o, {});
  chk('no-mutate inputs', JSON.stringify(m) === bm && JSON.stringify(o) === bo);
})();

console.log(`model-telemetry-comparison: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
