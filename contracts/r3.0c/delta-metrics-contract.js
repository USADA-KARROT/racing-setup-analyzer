/**
 * contracts/r3.0c/delta-metrics-contract.js — R3.0C C5 · Delta Metrics contract surface.
 *
 * Closed metric allowlist + fixed delta-sign convention + structural input gate for the C5
 * delta-metrics production service. The sign convention is pinned literally to
 * comparison_minus_reference per governance/r3.0/train.schema.json :: scopePin.deltaSign; a
 * request that tries to override it is fail-closed (DELTA_METRIC_SIGN_FORBIDDEN).
 *
 * Six metrics (and only these six) are supported at C5: lap_time, delta_cumulative,
 * sector_delta, entry_delta, mid_delta, exit_delta. Anything outside this set is
 * UNSUPPORTED_METRIC (the contract already exposes this code). The four
 * corner-scope metrics (sector_delta + entry/mid/exit) REQUIRE a corner pair for
 * computation; an unpaired or absent pair surfaces DELTA_METRIC_CORNER_PAIR_REQUIRED.
 *
 * CP1 round-2 retrofit (governance/r3.0c/cp1-retrofit-matrix.md F6 — phase-boundary gate):
 *   • PHASE_SCOPE_METRICS = ['entry_delta', 'mid_delta', 'exit_delta'] is a strict subset of
 *     CORNER_SCOPE_METRICS that REQUIRES a service-owned deterministic phase-boundary contract
 *     to be authorised on the request.policy. Without it, those three metrics fail closed with
 *     PHASE_BOUNDARY_CONTRACT_UNAUTHORISED (sector_delta is unaffected — sector spans the whole
 *     corner so it does not depend on a phase split).
 *   • The authorisation is structural at the contract layer; the actual capability gate lives in
 *     governance/r3.0c/capabilities.json (phase_boundary_contract.enabled). The orchestrator
 *     MUST refuse to fabricate the authorisation. A separate governance test asserts no
 *     production code path supplies the authorisation while the capability is disabled.
 *
 * The contract NEVER computes a delta; it only validates SHAPES. The production service
 * (renderer/js/r3-0c-delta-metrics.js) does the arithmetic AND enforces the sign convention as
 * a second layer.
 *
 * UMD: Node require / Electron renderer global (R3_0C_DeltaMetricsContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('delta-metrics-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // The single delta-sign convention. Mirrors comparison-eligibility-contract DELTA_SIGN.
  var DELTA_SIGN_FORMULA = 'comparison_minus_reference';
  var DELTA_SIGN_MINUEND = 'comparison';
  var DELTA_SIGN_SUBTRAHEND = 'reference';

  // Closed metric allowlist for C5. Three scopes:
  //   lap_*    scope = LAP    (no corner pair required)
  //   corner_* scope = CORNER (a paired corner is required; an unpaired pair → fail-closed)
  //   phase_*  scope = PHASE  (entry/mid/exit; CORNER + phase-boundary contract required)
  var SUPPORTED_DELTA_METRICS = Object.freeze(['lap_time', 'delta_cumulative', 'sector_delta', 'entry_delta', 'mid_delta', 'exit_delta']);
  var LAP_SCOPE_METRICS = Object.freeze(['lap_time', 'delta_cumulative']);
  var CORNER_SCOPE_METRICS = Object.freeze(['sector_delta', 'entry_delta', 'mid_delta', 'exit_delta']);
  // CP1 round-2 retrofit (F6): the three phase metrics specifically need a service-owned
  // deterministic phase-boundary contract authorisation; sector_delta does NOT (it spans the
  // whole corner). The authorisation lives on request.policy.phaseBoundaryAuthorisation and is
  // checked structurally here; governance/capabilities check whether it is allowed at runtime.
  var PHASE_SCOPE_METRICS = Object.freeze(['entry_delta', 'mid_delta', 'exit_delta']);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

  function _bld(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    return RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
  }

  /**
   * evaluateDeltaMetricsRequestShape(request) — structural gate. Required fields:
   *   identity:          { caseId, sessionId } (matched between reference + comparison sides)
   *   referenceLap:      { lapTimeMs }  (finite > 0)
   *   comparisonLap:     { lapTimeMs }  (finite > 0)
   *   pairing:           { pairs:[{ referenceCorner:{...zoneTimes}, comparisonCorner:{...zoneTimes} }] }
   *   requestedMetrics:  closed-allowlist subset (SUPPORTED_DELTA_METRICS)
   *   policy:            { deltaSign: 'comparison_minus_reference' } (literal; anything else → SIGN_FORBIDDEN)
   *
   * Returns eligible:true with no algorithm output; the service consumes the SHAPE marker.
   */
  function evaluateDeltaMetricsRequestShape(request) {
    if (!_isPlain(request)) return _bld([CODES.INTERNAL_CONTRACT_VIOLATION], 'request not an object');
    var reasons = [];

    var id = request.identity;
    if (!_isPlain(id) || typeof id.caseId !== 'string' || id.caseId.length === 0
      || typeof id.sessionId !== 'string' || id.sessionId.length === 0) {
      reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    }
    var ref = request.referenceLap, cmp = request.comparisonLap;
    if (!_isPlain(ref) || !_isFiniteNum(ref.lapTimeMs) || ref.lapTimeMs <= 0) reasons.push(CODES.DELTA_METRIC_NUMERIC_INVALID);
    if (!_isPlain(cmp) || !_isFiniteNum(cmp.lapTimeMs) || cmp.lapTimeMs <= 0) reasons.push(CODES.DELTA_METRIC_NUMERIC_INVALID);

    var pairing = request.pairing;
    if (!_isPlain(pairing) || !Array.isArray(pairing.pairs)) {
      reasons.push(CODES.DELTA_METRIC_EMPTY_INPUT);
    }

    var metrics = request.requestedMetrics;
    if (!Array.isArray(metrics) || metrics.length === 0) {
      reasons.push(CODES.DELTA_METRIC_EMPTY_INPUT);
    } else {
      for (var i = 0; i < metrics.length; i++) {
        if (SUPPORTED_DELTA_METRICS.indexOf(metrics[i]) === -1) reasons.push(CODES.UNSUPPORTED_METRIC);
      }
      // Corner-scope metrics need at least one pair. Lap-scope metrics do not.
      var anyCornerScope = metrics.some(function (m) { return CORNER_SCOPE_METRICS.indexOf(m) !== -1; });
      if (anyCornerScope && (!_isPlain(pairing) || !Array.isArray(pairing.pairs) || pairing.pairs.length === 0)) {
        reasons.push(CODES.DELTA_METRIC_CORNER_PAIR_REQUIRED);
      }
    }

    var policy = request.policy;
    if (!_isPlain(policy)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (policy.deltaSign !== DELTA_SIGN_FORMULA) reasons.push(CODES.DELTA_METRIC_SIGN_FORBIDDEN);

    // CP1 round-2 retrofit (F6): if any of the three phase metrics is requested, the policy MUST
    // declare a service-owned deterministic phase-boundary contract authorisation. The required
    // shape is { contractRef:non-empty-string, serviceOwned:true, deterministic:true }. Any other
    // shape (missing field / non-true literal / inferred caller-provided boundary) fails closed.
    if (Array.isArray(metrics)) {
      var anyPhaseScope = metrics.some(function (m) { return PHASE_SCOPE_METRICS.indexOf(m) !== -1; });
      if (anyPhaseScope) {
        var auth = _isPlain(policy) ? policy.phaseBoundaryAuthorisation : null;
        var authOk = _isPlain(auth)
          && typeof auth.contractRef === 'string' && auth.contractRef.length > 0
          && auth.serviceOwned === true
          && auth.deterministic === true;
        if (!authOk) reasons.push(CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED);
      }
    }

    if (reasons.length) {
      // dedupe preserving order
      var seen = {}, deduped = [];
      reasons.forEach(function (c) { if (RC.isReasonCode(c) && !seen[c]) { seen[c] = true; deduped.push(c); } });
      return RC.buildBlockedResult(deduped);
    }
    return Object.freeze({
      eligible: true,
      status: 'delta_metrics_request_shape_valid',
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var R5_DELTA_REASON_CODES = Object.freeze([
    CODES.UNSUPPORTED_METRIC,
    CODES.DELTA_METRIC_NUMERIC_INVALID,
    CODES.DELTA_METRIC_EMPTY_INPUT,
    CODES.DELTA_METRIC_CORNER_PAIR_REQUIRED,
    CODES.DELTA_METRIC_SIGN_FORBIDDEN,
    CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE,
    CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED,
    CODES.INTERNAL_CONTRACT_VIOLATION,
  ]);

  var api = {
    DELTA_SIGN_FORMULA: DELTA_SIGN_FORMULA,
    DELTA_SIGN_MINUEND: DELTA_SIGN_MINUEND,
    DELTA_SIGN_SUBTRAHEND: DELTA_SIGN_SUBTRAHEND,
    SUPPORTED_DELTA_METRICS: SUPPORTED_DELTA_METRICS,
    LAP_SCOPE_METRICS: LAP_SCOPE_METRICS,
    CORNER_SCOPE_METRICS: CORNER_SCOPE_METRICS,
    PHASE_SCOPE_METRICS: PHASE_SCOPE_METRICS,
    R5_DELTA_REASON_CODES: R5_DELTA_REASON_CODES,
    evaluateDeltaMetricsRequestShape: evaluateDeltaMetricsRequestShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_DeltaMetricsContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
