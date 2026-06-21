/**
 * calibration-registry.js — R2.3 §4.4: telemetry calibration contract + capability layering (PURE).
 *
 * makeCalibration / buildCalibrationSet / deriveCalibrationCapability. A calibration records WHAT is known
 * about a sensor/channel (sign, zero, ratio, scale, time offset…). Capability layering is HONEST:
 *  • the existing DIRECTIONAL observation is calibration-INDEPENDENT (raw, sign-agnostic) — calibration is
 *    NOT consulted for it (the observation gate is channel identity);
 *  • the higher metrics (signed response / calibrated magnitude / road-wheel) are gated BY calibration but
 *    are ALL deferred to R2.4 → `signedResponseEligible / calibratedMagnitudeEligible / roadWheelMetricsEligible`
 *    are RE-DERIVED here and forced `false` in R2.3 so the boundary is enforceable + testable, not just intent.
 *
 * RED LINES: pure; fail-closed validation; never mutates input; never grants a measured/magnitude metric.
 *
 * UMD: Node require / Electron renderer global (CalibrationRegistry).
 */
(function (root) {
  'use strict';

  var CALIBRATION_TYPE = Object.freeze({
    SPEED_SCALE: 'speed_scale', LATERAL_ACCEL_SCALE: 'lateral_acceleration_scale', YAW_RATE_SCALE: 'yaw_rate_scale',
    STEERING_SIGN: 'steering_sign', STEERING_ZERO: 'steering_zero', STEERING_RATIO: 'steering_ratio',
    ROAD_WHEEL_CONVERSION: 'road_wheel_conversion', SENSOR_TIME_OFFSET: 'sensor_time_offset',
    THROTTLE_SCALE: 'throttle_scale', BRAKE_SCALE: 'brake_scale',
  });
  var _TYPES = Object.keys(CALIBRATION_TYPE).map(function (k) { return CALIBRATION_TYPE[k]; });
  var CONFIDENCE = ['high', 'medium', 'low', 'unknown'];

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _isEnum(arr, v) { return arr.indexOf(v) !== -1; }

  function makeCalibration(o) {
    o = o || {};
    var errors = [];
    if (!_isEnum(_TYPES, o.calibrationType)) errors.push('bad_calibration_type');
    if (o.value != null && !_isFiniteNum(o.value)) errors.push('non_finite_value');
    if (o.unit != null && typeof o.unit !== 'string') errors.push('bad_unit');
    if (typeof o.source !== 'string' || !o.source) errors.push('missing_source');
    if (!_isEnum(CONFIDENCE, o.confidence)) errors.push('bad_confidence');
    if (typeof o.verified !== 'boolean') errors.push('bad_verified');
    var ids = Array.isArray(o.applicableSessionIds) ? o.applicableSessionIds.filter(function (s) { return typeof s === 'string'; }) : [];
    if (o.applicableSessionIds != null && !Array.isArray(o.applicableSessionIds)) errors.push('applicable_session_ids_not_array');
    if (typeof o.createdAt !== 'string' || !o.createdAt) errors.push('missing_createdAt');
    return {
      kind: 'calibration',
      calibrationType: o.calibrationType || null,
      value: (o.value != null && _isFiniteNum(o.value)) ? o.value : null,
      unit: typeof o.unit === 'string' ? o.unit : null,
      source: o.source || null, confidence: o.confidence || null,
      verified: o.verified === true, applicableSessionIds: ids, createdAt: o.createdAt || null,
      valid: errors.length === 0, errors: errors,
    };
  }

  function buildCalibrationSet(list) {
    var arr = Array.isArray(list) ? list.map(makeCalibration) : [];
    var byType = {};
    arr.forEach(function (c) { if (c.valid) byType[c.calibrationType] = c; });
    return { kind: 'calibration_set', calibrations: arr, byType: byType, valid: arr.every(function (c) { return c.valid; }) };
  }

  // a calibration "holds" iff present AND verified (mere presence is not enough)
  function _verified(set, type) { var c = set && set.byType && set.byType[type]; return !!(c && c.verified); }

  function deriveCalibrationCapability(set) {
    set = set || { byType: {} };
    var status = {
      speedScaleVerified: _verified(set, CALIBRATION_TYPE.SPEED_SCALE),
      lateralAccelScaleVerified: _verified(set, CALIBRATION_TYPE.LATERAL_ACCEL_SCALE),
      yawRateScaleVerified: _verified(set, CALIBRATION_TYPE.YAW_RATE_SCALE),
      steeringSignConfirmed: _verified(set, CALIBRATION_TYPE.STEERING_SIGN),
      steeringZeroConfirmed: _verified(set, CALIBRATION_TYPE.STEERING_ZERO),
      steeringRatioVerified: _verified(set, CALIBRATION_TYPE.STEERING_RATIO),
      roadWheelConversionVerified: _verified(set, CALIBRATION_TYPE.ROAD_WHEEL_CONVERSION),
      sensorTimeOffsetKnown: _verified(set, CALIBRATION_TYPE.SENSOR_TIME_OFFSET),
      throttleScaleVerified: _verified(set, CALIBRATION_TYPE.THROTTLE_SCALE),
      brakeScaleVerified: _verified(set, CALIBRATION_TYPE.BRAKE_SCALE),
    };
    return {
      kind: 'calibration_capability',
      status: status,
      // DIRECTIONAL is calibration-independent → not represented here (observation gates on channel identity).
      // Higher metrics are gated by calibration but DEFERRED to R2.4 → re-derived and forced false in R2.3:
      signedResponseEligible: false,        // would need steeringSign+zero; deferred
      calibratedMagnitudeEligible: false,   // would need steeringRatio; deferred
      roadWheelMetricsEligible: false,      // would need road-wheel conversion; deferred
      deferredToR2_4: true,
      note: 'directional observation does not consume calibration; higher (signed/magnitude/road-wheel) metrics deferred to R2.4',
    };
  }

  var api = {
    CALIBRATION_TYPE: CALIBRATION_TYPE, CONFIDENCE: CONFIDENCE,
    makeCalibration: makeCalibration, buildCalibrationSet: buildCalibrationSet, deriveCalibrationCapability: deriveCalibrationCapability,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CalibrationRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
