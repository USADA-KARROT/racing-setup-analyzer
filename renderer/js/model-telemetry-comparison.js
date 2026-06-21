/**
 * model-telemetry-comparison.js — R2.2 §9: Model-vs-Telemetry comparison (PURE, honest, gated).
 *
 * compareModelToTelemetry(modelResult, observation, opts): a QUALITATIVE, DIRECTIONAL comparison between
 * the model's predicted handling tendency and the telemetry's observed directional tendency. It is NOT a
 * numeric model-vs-measurement residual — the observation has no calibrated magnitude, so we never claim
 * a magnitude difference. "observed_more_understeer" means the telemetry shows speed-dependent understeer
 * the steady-state single-point model does not capture (the model has no speed-dependent transfer
 * function) — NOT a measured-K_us gap.
 *
 * RED LINES:
 *  • differenceClass ∈ {aligned, observed_more_understeer, observed_more_oversteer,
 *    speed_dependent_difference, inconclusive, unavailable}. Heuristic classifier → labelled 'Heuristic',
 *    never shown as measured physical truth. Evidence separates model-derived prediction / telemetry
 *    observation / derived comparison.
 *  • Eligibility is CONDITION-DERIVED, never hard-true: needs a valid model run + a valid observation with
 *    a conclusive (or explicitly speed-dependent) tendency. Missing any → not eligible + blockedReasons.
 *  • Pure. Imports nothing. Never mutates inputs.
 *
 * UMD: Node require / Electron renderer global (ModelTelemetryComparison).
 */
(function (root) {
  'use strict';

  var RANK = { oversteer: -1, neutral: 0, understeer: 1 };
  var OBS_TO_DIR = {
    understeer_tendency: 'understeer', neutral_tendency: 'neutral', oversteer_tendency: 'oversteer',
    mixed_or_speed_dependent: 'mixed', inconclusive: 'inconclusive', unavailable: 'unavailable',
  };
  var DEFAULT_SPEED_DEP_THRESHOLD = 0.12;

  var ASSUMPTIONS = Object.freeze([
    'qualitative_directional_comparison_not_numeric_residual',
    'observation_is_raw_steering_directional_trend_not_calibrated_magnitude',
    'model_is_steady_state_single_point_no_speed_dependent_transfer_function',
    'more_understeer_means_observed_speed_dependent_understeer_model_does_not_capture',
  ]);

  function _blocker(code, detail) { return { code: code, scope: 'comparison', severity: 'info', detail: detail || null }; }

  function _unavailable(reason, predicted, observed, blockedReasons) {
    return {
      valid: false, predictedTendency: predicted || 'unavailable', observedTendency: observed || 'unavailable',
      differenceClass: 'unavailable', confidence: null,
      evidence: { reason: reason }, assumptions: ASSUMPTIONS,
      blockedReasons: blockedReasons || [], warnings: [], modelTelemetryComparisonEligible: false,
      credibility: 'Unavailable',
    };
  }

  function compareModelToTelemetry(modelResult, observation, opts) {
    try { return _compareInner(modelResult, observation, opts || {}); }
    catch (e) { return _unavailable('comparison_exception', null, null, [_blocker('COMPARISON_EXCEPTION', String(e && e.message || e))]); }
  }
  function _compareInner(modelResult, observation, opts) {
    var thr = opts.speedDependentThreshold != null ? opts.speedDependentThreshold : DEFAULT_SPEED_DEP_THRESHOLD;
    var blockedReasons = [];

    // 1) inputs must exist + the model run must be valid
    var modelOk = modelResult && modelResult.valid === true && RANK.hasOwnProperty(modelResult.predictedTendency);
    if (!modelOk) blockedReasons.push(_blocker('MODEL_RESULT_NOT_AVAILABLE', 'no valid model run / tendency'));
    var obsOk = observation && observation.valid === true && OBS_TO_DIR.hasOwnProperty(observation.observedTendency);
    if (!obsOk) blockedReasons.push(_blocker('OBSERVATION_NOT_AVAILABLE', observation ? observation.observedTendency : 'absent'));
    if (!modelOk || !obsOk) {
      return _unavailable('inputs_not_ready', modelOk ? modelResult.predictedTendency : 'unavailable', obsOk ? OBS_TO_DIR[observation.observedTendency] : 'unavailable', blockedReasons);
    }

    var predicted = modelResult.predictedTendency;                 // understeer|neutral|oversteer
    var observedDir = OBS_TO_DIR[observation.observedTendency];     // understeer|neutral|oversteer|mixed|inconclusive|unavailable

    // 2) observation must be conclusive (or explicitly speed-dependent) for a comparison to be eligible
    if (observedDir === 'inconclusive' || observedDir === 'unavailable') {
      return {
        valid: false, predictedTendency: predicted, observedTendency: observedDir,
        differenceClass: observedDir, confidence: null,
        evidence: { reason: 'observation_inconclusive', predictedTendency: predicted },
        assumptions: ASSUMPTIONS, blockedReasons: [_blocker('OBSERVATION_INCONCLUSIVE', observedDir)], warnings: [],
        modelTelemetryComparisonEligible: false, credibility: 'Heuristic',
      };
    }

    var differenceClass, confidence = observation.confidence || 'low';
    var relChange = (observation.evidence && typeof observation.evidence.relativeChange === 'number') ? observation.evidence.relativeChange : null;

    if (observedDir === 'mixed') {
      differenceClass = 'speed_dependent_difference';
    } else {
      var predRank = RANK[predicted], obsRank = RANK[observedDir];
      if (obsRank > predRank) differenceClass = 'observed_more_understeer';
      else if (obsRank < predRank) differenceClass = 'observed_more_oversteer';
      else {
        // same direction: a significant speed-dependent trend means the telemetry shows speed-dependent
        // behaviour the steady-state model does not capture (a qualitative, NOT magnitude, difference).
        if (relChange != null && Math.abs(relChange) >= thr) {
          differenceClass = relChange < 0 ? 'observed_more_understeer' : 'observed_more_oversteer';
        } else {
          differenceClass = 'aligned';
        }
      }
    }

    return {
      valid: true,
      predictedTendency: predicted,
      observedTendency: observedDir,
      differenceClass: differenceClass,
      confidence: confidence,                       // bounded by the observation (low|medium)
      evidence: {
        modelDerived: { predictedTendency: predicted, understeerGradient: modelResult.modelResultSnapshot ? modelResult.modelResultSnapshot.understeer_gradient : null, credibility: 'Model' },
        telemetryObservation: { observedTendency: observation.observedTendency, method: observation.method, relativeChange: relChange, confidence: observation.confidence, credibility: 'Heuristic' },
        derivedComparison: { differenceClass: differenceClass, rule: 'direction_rank + same_direction_speed_dependent_trend', speedDependentThreshold: thr },
      },
      assumptions: ASSUMPTIONS,
      blockedReasons: [],
      warnings: [],
      modelTelemetryComparisonEligible: true,       // condition-derived: model valid + observation valid + conclusive
      credibility: 'Heuristic',                     // heuristic difference classifier — never measured truth
    };
  }

  var api = { compareModelToTelemetry: compareModelToTelemetry, ASSUMPTIONS: ASSUMPTIONS, RANK: RANK, OBS_TO_DIR: OBS_TO_DIR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ModelTelemetryComparison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
