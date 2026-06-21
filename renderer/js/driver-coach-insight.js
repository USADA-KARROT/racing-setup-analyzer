/**
 * driver-coach-insight.js — R2.2 §11: Virtual Driver Coach (PURE, gated, INDEPENDENT of setup advice).
 *
 * deriveDriverCoachingInsight(observation, caseContext, opts): observes the DRIVER'S inputs only, from
 * telemetry that is actually present. It is a SEPARATE layer from the Race Engineer — its output schema
 * carries NO setup-change / recommendation field whatsoever.
 *
 * Allowed (only with the channels that exist): steering smoothness / correction frequency, abruptness /
 * oscillation, pedal timing ONLY if pedal channels exist, lap-to-lap consistency ONLY with lap
 * segmentation, a repeatable practice objective, and an explicit statement of what cannot be concluded.
 *
 * RED LINES: no throttle/brake comment without a pedal channel; no apex / single-corner claim without
 * track position / lap segmentation; raw steering is NEVER read as road-wheel angle; no personalized
 * story from absent data. Pure; imports nothing; never mutates inputs; heuristic-labelled.
 *
 * UMD: Node require / Electron renderer global (DriverCoachInsight).
 */
(function (root) {
  'use strict';

  // a (heuristic) reversal-rate band above which mid-corner corrections are called "elevated".
  var ELEVATED_REVERSAL_RATE_PER_S = 0.5;

  function _blocker(code, detail) { return { code: code, scope: 'driver_coach', severity: 'info', detail: detail || null }; }
  function _result(o) {
    return Object.assign({
      eligible: false, observations: [], practicePriorities: [], cannotConclude: [],
      evidence: {}, confidence: null, blockedReasons: [], credibility: 'Heuristic',
    }, o);
  }

  function deriveDriverCoachingInsight(observation, caseContext, opts) {
    try { return _inner(observation, caseContext || {}, opts || {}); }
    catch (e) { return _result({ blockedReasons: [_blocker('DRIVER_COACH_EXCEPTION', String(e && e.message || e))] }); }
  }
  function _inner(observation, caseContext, opts) {
    if (!observation || typeof observation !== 'object' || !observation.driverInputs) {
      return _result({ blockedReasons: [_blocker('NO_DRIVER_INPUTS', 'no steering/driver-input telemetry available')] });
    }
    var di = observation.driverInputs;
    if (!di.steeringChannelAvailable) {
      return _result({ blockedReasons: [_blocker('NO_STEERING_CHANNEL', 'steering channel absent')] });
    }

    var observations = [], practicePriorities = [], cannotConclude = [], blockedReasons = [];

    // steering smoothness / correction frequency (raw steering — NOT road-wheel angle)
    var elevated = di.steeringReversalRatePerS != null && di.steeringReversalRatePerS >= ELEVATED_REVERSAL_RATE_PER_S;
    observations.push({
      type: 'steering_input', code: 'steering_correction_frequency',
      reversalCount: di.steeringReversalCount, reversalRatePerS: di.steeringReversalRatePerS,
      qualitative: elevated ? 'elevated_secondary_corrections' : 'few_secondary_corrections',
      note: 'raw_steering_input_not_road_wheel_angle',
    });
    observations.push({ type: 'steering_input', code: 'steering_abruptness', abruptnessP95: di.steeringAbruptnessP95, unit: di.steerUnit });

    if (elevated) practicePriorities.push('practice_one_smooth_steering_input_per_corner_reduce_mid_corner_corrections');
    practicePriorities.push('establish_a_repeatable_reference_corner_for_a_consistent_baseline');

    // pedal timing — ONLY if a pedal channel exists; otherwise explicitly not assessed
    var pedals = di.pedalChannelsAvailable || {};
    if (pedals.throttle || pedals.brake) {
      observations.push({ type: 'pedal', code: 'pedal_channels_present', throttle: !!pedals.throttle, brake: !!pedals.brake, note: 'pedal_timing_observable_qualitatively' });
    } else {
      blockedReasons.push(_blocker('NO_PEDAL_CHANNELS', 'throttle/brake not present — pedal technique not assessed'));
      cannotConclude.push('throttle_or_brake_technique_no_pedal_channel');
    }

    // corner attribution needs track position; lap consistency needs lap segmentation
    if (!di.trackPositionAvailable) {
      blockedReasons.push(_blocker('NO_TRACK_POSITION', 'no track position — cannot attribute to a specific corner/apex'));
      cannotConclude.push('attribution_to_a_specific_corner_or_apex_no_track_position');
    }
    if (!di.lapSegmentationAvailable) {
      blockedReasons.push(_blocker('NO_LAP_SEGMENTATION', 'no lap segmentation — cannot assess single-corner or lap-to-lap consistency'));
      cannotConclude.push('lap_to_lap_or_single_corner_consistency_no_lap_segmentation');
    }

    // confidence: a short window or sparse corrections → low; otherwise capped at medium (heuristic).
    var dur = di.durationS || 0;
    var confidence = (dur >= 5 && di.steeringReversalCount != null) ? 'medium' : 'low';

    return _result({
      eligible: true,
      observations: observations,
      practicePriorities: practicePriorities,
      cannotConclude: cannotConclude,
      evidence: {
        steeringReversalCount: di.steeringReversalCount, steeringReversalRatePerS: di.steeringReversalRatePerS,
        durationS: di.durationS, pedalChannelsAvailable: pedals,
        trackPositionAvailable: !!di.trackPositionAvailable, lapSegmentationAvailable: !!di.lapSegmentationAvailable,
        basis: 'raw_steering_input_observation_only',
      },
      confidence: confidence,
      blockedReasons: blockedReasons,
      credibility: 'Heuristic',
    });
  }

  var api = { deriveDriverCoachingInsight: deriveDriverCoachingInsight, ELEVATED_REVERSAL_RATE_PER_S: ELEVATED_REVERSAL_RATE_PER_S };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DriverCoachInsight = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
