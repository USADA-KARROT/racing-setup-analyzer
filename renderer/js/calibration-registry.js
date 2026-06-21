/**
 * calibration-registry.js — R2.4 §calibration: telemetry calibration contract + capability layering (PURE).
 *
 * makeCalibration / buildCalibrationSet / deriveCalibrationCapability / calibrationValue. A calibration records
 * WHAT is known about a sensor/channel (sign, zero, ratio, scale, time offset…). Capability layering is HONEST:
 *  • the DIRECTIONAL observation is calibration-INDEPENDENT (raw, sign-agnostic) — calibration is NOT consulted
 *    for it (the observation gate is channel identity);
 *  • the higher metrics (signed response / calibrated magnitude / road-wheel) are gated BY calibration and are
 *    RE-DERIVED here from EVIDENCE (R2.4 — no longer forced false). A steering-bound calibration counts only if
 *    `verified ∧ session-applicable ∧ binding-match` (its channelBinding equals the CURRENT steering mapping's
 *    binding), and conflicting numeric values FAIL CLOSED (ambiguous → ineligible, never "pick the last one").
 *
 * RED LINES: pure; fail-closed validation; never mutates input; never grants a measured/magnitude metric
 * without a finite-positive, session-applicable, binding-matched steering ratio.
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
  // steering-bound types must carry a channelBinding (they only mean something relative to a specific mapped
  // steering channel + projection); a change to that mapping/projection makes them stale.
  var STEERING_BOUND_TYPES = [CALIBRATION_TYPE.STEERING_SIGN, CALIBRATION_TYPE.STEERING_ZERO, CALIBRATION_TYPE.STEERING_RATIO];

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _isEnum(arr, v) { return arr.indexOf(v) !== -1; }
  function _isSteeringBound(type) { return STEERING_BOUND_TYPES.indexOf(type) !== -1; }
  // deterministic signature of a {scale,offset,sign} projection (matches channel-mapping.projectionSignature)
  function projectionSignature(p) { p = p || {}; return 's:' + p.scale + '|o:' + p.offset + '|g:' + p.sign; }
  function _validBinding(b) { return !!(b && _isFiniteNum(b.rawColumnId) && typeof b.projectionSignature === 'string' && b.projectionSignature.length > 0); }
  function _bindingEqual(a, b) { return _validBinding(a) && _validBinding(b) && a.rawColumnId === b.rawColumnId && a.projectionSignature === b.projectionSignature; }

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
    // steering-bound calibrations REQUIRE a well-formed channelBinding; non-steering types must not carry one.
    var steeringBound = _isSteeringBound(o.calibrationType);
    if (steeringBound && !_validBinding(o.channelBinding)) errors.push('missing_or_bad_channel_binding');
    if (!steeringBound && o.channelBinding != null) errors.push('unexpected_channel_binding');
    var binding = _validBinding(o.channelBinding) ? { rawColumnId: o.channelBinding.rawColumnId, projectionSignature: o.channelBinding.projectionSignature } : null;
    return {
      kind: 'calibration',
      calibrationType: o.calibrationType || null,
      value: (o.value != null && _isFiniteNum(o.value)) ? o.value : null,
      unit: typeof o.unit === 'string' ? o.unit : null,
      source: o.source || null, confidence: o.confidence || null,
      verified: o.verified === true, applicableSessionIds: ids, createdAt: o.createdAt || null,
      channelBinding: steeringBound ? binding : null,
      valid: errors.length === 0, errors: errors,
    };
  }

  function buildCalibrationSet(list) {
    var arr = Array.isArray(list) ? list.map(makeCalibration) : [];
    var byType = {};
    arr.forEach(function (c) { if (c.valid) byType[c.calibrationType] = c; }); // legacy convenience ONLY — capability never uses this
    return { kind: 'calibration_set', calibrations: arr, byType: byType, valid: arr.every(function (c) { return c.valid; }) };
  }

  function _ctx(context) { context = context || {}; return { sessionId: context.sessionId != null ? context.sessionId : null, steeringBinding: _validBinding(context.steeringBinding) ? context.steeringBinding : null }; }

  // a calibration is session-applicable iff it has no scope OR its scope contains the current session
  function _sessionApplicable(cal, sessionId) {
    if (!cal.applicableSessionIds || cal.applicableSessionIds.length === 0) return true;
    return sessionId != null && cal.applicableSessionIds.indexOf(sessionId) !== -1;
  }

  // ALL calibrations of `type` that genuinely apply: valid ∧ verified ∧ session-applicable ∧ (binding-match if steering-bound).
  // NEVER uses byType (which silently keeps the last) — it inspects every calibration.
  function _matching(set, type, ctx) {
    var cals = (set && Array.isArray(set.calibrations)) ? set.calibrations : [];
    var steeringBound = _isSteeringBound(type);
    return cals.filter(function (c) {
      if (!c.valid || !c.verified || c.calibrationType !== type) return false;
      if (!_sessionApplicable(c, ctx.sessionId)) return false;
      if (steeringBound && !_bindingEqual(c.channelBinding, ctx.steeringBinding)) return false; // stale/other-channel → excluded
      return true;
    });
  }

  // does a (boolean-style) calibration of `type` hold for this context?
  function _holds(set, type, ctx) { return _matching(set, type, ctx).length > 0; }

  // the single agreed numeric value for `type`, or null if absent OR ambiguous (conflicting values → fail closed)
  function calibrationValue(set, type, context) {
    var ctx = _ctx(context);
    var vals = _matching(set, type, ctx).map(function (c) { return c.value; }).filter(_isFiniteNum);
    if (vals.length === 0) return null;
    var first = vals[0];
    for (var i = 1; i < vals.length; i++) { if (vals[i] !== first) return null; } // conflict → ambiguous → null (blocked)
    return first;
  }

  function deriveCalibrationCapability(set, context) {
    set = set || { calibrations: [] };
    var ctx = _ctx(context);
    var status = {
      speedScaleVerified: _holds(set, CALIBRATION_TYPE.SPEED_SCALE, ctx),
      lateralAccelScaleVerified: _holds(set, CALIBRATION_TYPE.LATERAL_ACCEL_SCALE, ctx),
      yawRateScaleVerified: _holds(set, CALIBRATION_TYPE.YAW_RATE_SCALE, ctx),
      steeringSignConfirmed: _holds(set, CALIBRATION_TYPE.STEERING_SIGN, ctx),
      steeringZeroConfirmed: _holds(set, CALIBRATION_TYPE.STEERING_ZERO, ctx),
      steeringRatioVerified: _holds(set, CALIBRATION_TYPE.STEERING_RATIO, ctx),
      roadWheelConversionVerified: _holds(set, CALIBRATION_TYPE.ROAD_WHEEL_CONVERSION, ctx),
      sensorTimeOffsetKnown: _holds(set, CALIBRATION_TYPE.SENSOR_TIME_OFFSET, ctx),
      throttleScaleVerified: _holds(set, CALIBRATION_TYPE.THROTTLE_SCALE, ctx),
      brakeScaleVerified: _holds(set, CALIBRATION_TYPE.BRAKE_SCALE, ctx),
    };
    // R2.4: re-derived from EVIDENCE (no longer forced false).
    var ratioValue = calibrationValue(set, CALIBRATION_TYPE.STEERING_RATIO, ctx); // single agreed finite, else null
    var signedResponseEligible = status.steeringSignConfirmed && status.steeringZeroConfirmed;
    var calibratedMagnitudeEligible = signedResponseEligible && _isFiniteNum(ratioValue) && ratioValue > 0;
    var roadWheelMetricsEligible = calibratedMagnitudeEligible; // canonical ratio is already road-wheel-referenced
    return {
      kind: 'calibration_capability',
      status: status,
      steeringRatioValue: calibratedMagnitudeEligible ? ratioValue : null, // road-wheel rad per projected engine-steer unit
      // DIRECTIONAL is calibration-independent → not represented here (observation gates on channel identity).
      signedResponseEligible: signedResponseEligible,
      calibratedMagnitudeEligible: calibratedMagnitudeEligible,
      roadWheelMetricsEligible: roadWheelMetricsEligible,
      deferredToR2_4: false,
      note: 'directional observation does not consume calibration; higher metrics re-derived from verified, session-applicable, binding-matched calibration evidence (conflicts fail closed)',
    };
  }

  var api = {
    CALIBRATION_TYPE: CALIBRATION_TYPE, CONFIDENCE: CONFIDENCE, STEERING_BOUND_TYPES: STEERING_BOUND_TYPES,
    projectionSignature: projectionSignature,
    makeCalibration: makeCalibration, buildCalibrationSet: buildCalibrationSet,
    deriveCalibrationCapability: deriveCalibrationCapability, calibrationValue: calibrationValue,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CalibrationRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
