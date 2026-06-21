/**
 * race-engineer-insight.js — R2.2 §10: Virtual Race Engineer (PURE, gated, directional-only).
 *
 * deriveRaceEngineerInsight(comparison, caseContext, opts): turns a model-vs-telemetry COMPARISON into
 * inspection priorities + DIRECTIONAL setup trials. It is NOT a quantitative recommender: no clicks, no
 * N/mm, no lap-time promise, no guaranteed causation, no "it must be part X". It consumes ONLY the
 * comparison + vehicle/setup context — never driver-specific evidence (that is the Driver Coach's domain).
 *
 * Capability split (§10.3):
 *   inspectionInsightEligible          — unlocks early (a valid model prediction is enough to say what to check)
 *   directionalSetupInsightEligible    — needs comparison evidence (an eligible, actionable difference)
 *   quantitativeSetupRecommendationEligible — FALSE this version (no validated click→rate mapping)
 *
 * RED LINES: pure, imports nothing, never mutates inputs; heuristic-labelled (never measured truth);
 * always lists missingEvidence + a "one change at a time / A-B same corner" trial discipline.
 *
 * UMD: Node require / Electron renderer global (RaceEngineerInsight).
 */
(function (root) {
  'use strict';

  // direction → inspection / directional setup guidance (codes; the UI localizes them). No numbers.
  var GUIDE = {
    observed_more_understeer: {
      likelySubsystems: ['front_tyre_state', 'front_axle_effective_roll_stiffness', 'front_anti_roll_bar'],
      inspectionPriorities: ['inspect_front_tyre_pressure_and_temperature', 'confirm_front_arb_effective_rate', 'verify_front_spring_motion_ratio'],
      setupDirections: ['consider_reducing_front_roll_stiffness_bias', 'consider_increasing_rear_support'],
    },
    observed_more_oversteer: {
      likelySubsystems: ['rear_tyre_state', 'rear_axle_effective_roll_stiffness', 'rear_anti_roll_bar'],
      inspectionPriorities: ['inspect_rear_tyre_pressure_and_temperature', 'confirm_rear_arb_effective_rate', 'verify_rear_spring_motion_ratio'],
      setupDirections: ['consider_reducing_rear_roll_stiffness_bias', 'consider_increasing_front_support'],
    },
    speed_dependent_difference: {
      likelySubsystems: ['aero_balance_vs_speed', 'platform_ride_height_and_damping', 'tyre_thermal_state_by_speed'],
      inspectionPriorities: ['compare_low_vs_high_speed_corners_separately', 'inspect_aero_platform_and_ride_height', 'review_tyre_thermal_state_across_speed'],
      setupDirections: ['evaluate_speed_dependent_balance_separately_before_a_global_change'],
    },
    aligned: {
      likelySubsystems: ['balance_consistent_with_model'],
      inspectionPriorities: ['confirm_tyre_and_pressure_baseline', 'verify_other_evidence_before_changing_balance'],
      setupDirections: ['no_directional_balance_change_indicated_by_this_comparison'],
    },
  };
  // inspection-only fallback from the MODEL prediction (used when the comparison is not yet eligible)
  var INSPECT_BY_PREDICTION = {
    understeer: ['inspect_front_tyre_pressure_and_temperature', 'confirm_front_arb_effective_rate'],
    oversteer: ['inspect_rear_tyre_pressure_and_temperature', 'confirm_rear_arb_effective_rate'],
    neutral: ['confirm_tyre_pressure_and_temperature_baseline_front_and_rear'],
  };
  var TRIAL_ORDER = Object.freeze(['change_one_item_at_a_time', 'repeat_the_same_corner_as_an_a_b_test', 're_observe_telemetry_after_each_change']);
  var ACTIONABLE = ['observed_more_understeer', 'observed_more_oversteer', 'speed_dependent_difference'];

  function _blocker(code, detail) { return { code: code, scope: 'race_engineer', severity: 'info', detail: detail || null }; }
  function _result(o) {
    return Object.assign({
      eligible: { inspection: false, directional: false, quantitative: false },
      summary: null, likelySubsystems: [], inspectionPriorities: [], setupDirections: [], trialOrder: TRIAL_ORDER,
      missingEvidence: [], confidence: null, evidence: {}, blockedReasons: [], credibility: 'Heuristic',
    }, o);
  }

  function deriveRaceEngineerInsight(comparison, caseContext, opts) {
    try { return _inner(comparison, caseContext || {}, opts || {}); }
    catch (e) { return _result({ blockedReasons: [_blocker('RACE_ENGINEER_EXCEPTION', String(e && e.message || e))] }); }
  }
  function _inner(comparison, caseContext, opts) {
    if (!comparison || typeof comparison !== 'object') {
      return _result({ blockedReasons: [_blocker('NO_COMPARISON', 'comparison object absent')] });
    }
    var predicted = comparison.predictedTendency;                 // understeer|neutral|oversteer|unavailable
    var hasPrediction = ['understeer', 'neutral', 'oversteer'].indexOf(predicted) !== -1;
    var comparisonEligible = comparison.modelTelemetryComparisonEligible === true && comparison.valid === true;
    var differenceClass = comparison.differenceClass;
    var directional = comparisonEligible && ACTIONABLE.indexOf(differenceClass) !== -1;

    var missingEvidence = [];
    if (!comparisonEligible) missingEvidence.push('eligible_model_vs_telemetry_comparison');
    if (comparison.confidence === 'low') missingEvidence.push('higher_confidence_observation');
    // quantitative is always unavailable this version → state why
    missingEvidence.push('validated_setup_change_to_rate_mapping_for_quantitative_advice');

    // inspection: available as soon as we have a model prediction
    var inspection = hasPrediction;
    if (!inspection) {
      return _result({ missingEvidence: missingEvidence, blockedReasons: [_blocker('NO_MODEL_PREDICTION', 'no valid model tendency to reason from')] });
    }

    var likelySubsystems = [], inspectionPriorities = [], setupDirections = [], summary;
    if (directional) {
      var g = GUIDE[differenceClass] || GUIDE.aligned;
      likelySubsystems = g.likelySubsystems.slice();
      inspectionPriorities = g.inspectionPriorities.slice();
      setupDirections = g.setupDirections.slice();
      summary = 'directional_insight:' + differenceClass;
    } else {
      // inspection-only from the model prediction (comparison not eligible/actionable yet)
      inspectionPriorities = (INSPECT_BY_PREDICTION[predicted] || []).slice();
      likelySubsystems = predicted === 'oversteer' ? ['rear_balance_subsystems'] : (predicted === 'understeer' ? ['front_balance_subsystems'] : ['front_and_rear_balance_subsystems']);
      summary = 'inspection_only:model_predicts_' + predicted;
    }

    var confidence = directional ? (comparison.confidence || 'low') : 'low';
    return _result({
      eligible: { inspection: true, directional: directional, quantitative: false },
      summary: summary,
      likelySubsystems: likelySubsystems,
      inspectionPriorities: inspectionPriorities,
      setupDirections: setupDirections,        // directional only — never a numeric click/rate
      trialOrder: TRIAL_ORDER,
      missingEvidence: missingEvidence,
      confidence: confidence,
      evidence: {
        predictedTendency: predicted, observedTendency: comparison.observedTendency || null,
        differenceClass: differenceClass || null, comparisonEligible: comparisonEligible,
        basis: directional ? 'comparison_difference_class' : 'model_prediction_only',
        vehicleContext: caseContext && caseContext.vehicleName ? caseContext.vehicleName : null,
      },
      blockedReasons: directional ? [] : [_blocker('DIRECTIONAL_INSIGHT_BLOCKED', 'no eligible/actionable comparison')],
      credibility: 'Heuristic',
    });
  }

  var api = { deriveRaceEngineerInsight: deriveRaceEngineerInsight, GUIDE: GUIDE, TRIAL_ORDER: TRIAL_ORDER, ACTIONABLE: ACTIONABLE };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.RaceEngineerInsight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
