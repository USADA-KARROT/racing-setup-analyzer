/**
 * contracts/r3.0c/comparison-eligibility-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the comparison SCOPE (same Analysis Case only; no cross-case / cross-session / inferred track
 * match), the SINGLE delta-sign convention (delta = comparison − reference; no alternate), and a fail-closed
 * eligibility evaluator that composes the lap, normalization, and credibility contracts. CP1 produces NO
 * actual comparison result — when every gate passes, the contract returns an `eligible_pending_production`
 * marker with NO numeric payload. No telemetry, no detection, no pairing, no delta computation.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonEligibilityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  var VL = _req('./valid-lap-contract.js', typeof R3_0C_ValidLapContract !== 'undefined' ? R3_0C_ValidLapContract : undefined);
  var NP = _req('./normalized-position-contract.js', typeof R3_0C_NormalizedPositionContract !== 'undefined' ? R3_0C_NormalizedPositionContract : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0C_CredibilityContract !== 'undefined' ? R3_0C_CredibilityContract : undefined);
  if (!RC || !VL || !NP || !CR) throw new Error('comparison-eligibility-contract.js requires reason-codes + valid-lap + normalized-position + credibility contracts');
  var CODES = RC.REASON_CODES;

  // comparison is bounded to a single Analysis Case; cross-case / cross-session / inferred track match are out.
  var COMPARISON_SCOPE = Object.freeze({ sameAnalysisCaseOnly: true, crossCase: false, crossSession: false, inferTrackMatch: false });
  // the ONE delta-sign convention. There is deliberately no alternate; the UI may never swap operands.
  var DELTA_SIGN = Object.freeze({ formula: 'comparison_minus_reference', minuend: 'comparison', subtrahend: 'reference', alternateConventionsAllowed: false });
  // the metric names a comparison MAY carry (a closed allowlist; CP1 computes none of them).
  var SUPPORTED_METRICS = Object.freeze(['speedDelta', 'timeDelta', 'latAccelDelta', 'brakingOnsetDelta', 'throttleApplicationDelta', 'steeringCorrectionDelta']);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function deltaSignFormula() { return DELTA_SIGN.formula; }

  // evaluateMetricSupport(name) — closed-allowlist gate; an unknown metric name fails closed (no success).
  function evaluateMetricSupport(metricName) {
    if (typeof metricName !== 'string' || SUPPORTED_METRICS.indexOf(metricName) === -1) return RC.buildBlockedResult([CODES.UNSUPPORTED_METRIC], { detail: String(metricName).slice(0, 60) });
    return Object.freeze({ eligible: true, status: 'metric_supported', metric: metricName, reasonCodes: Object.freeze([]), result: null });
  }

  function _identity(side) { return _isPlain(side) && _isPlain(side.identity) ? side.identity : null; }

  /**
   * evaluateComparisonEligibility(input) — fail-closed composite gate. input shape:
   *   { analysisCaseId, reference:{ identity:{analysisCaseId,sessionId,lapId,trackId,layoutId},
   *       lapAuthority:{...5}, normalizationAuthority:{...} }, comparison:{ ...same... }, credibilityMetadata }
   * Returns buildBlockedResult([...]) on any failure, else an eligible_pending_production marker (no payload).
   */
  function evaluateComparisonEligibility(input) {
    if (!_isPlain(input)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'comparison input not an object' });
    var ref = input.reference, cmp = input.comparison;
    var refId = _identity(ref), cmpId = _identity(cmp);
    if (!refId || !cmpId) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'missing reference/comparison identity' });

    var reasons = [];

    // scope: same Analysis Case, same session, no inferred track match.
    var caseId = input.analysisCaseId;
    if (!_nonEmptyStr(caseId) || refId.analysisCaseId !== caseId || cmpId.analysisCaseId !== caseId) reasons.push(CODES.CROSS_CASE_COMPARISON_UNSUPPORTED);
    if (!_nonEmptyStr(refId.sessionId) || !_nonEmptyStr(cmpId.sessionId) || refId.sessionId !== cmpId.sessionId) reasons.push(CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED);

    // track identity: explicit ids on both sides, and they MUST match (never inferred from names).
    if (!_nonEmptyStr(refId.trackId) || !_nonEmptyStr(refId.layoutId) || !_nonEmptyStr(cmpId.trackId) || !_nonEmptyStr(cmpId.layoutId)) reasons.push(CODES.MISSING_TRACK_IDENTITY);
    else if (refId.trackId !== cmpId.trackId || refId.layoutId !== cmpId.layoutId) reasons.push(CODES.TRACK_IDENTITY_MISMATCH);

    // lap authorities (each side independently).
    var refLap = VL.evaluateLapAuthority(_isPlain(ref) ? ref.lapAuthority : null);
    if (!refLap.eligible) reasons.push(CODES.REFERENCE_LAP_UNAVAILABLE);
    var cmpLap = VL.evaluateLapAuthority(_isPlain(cmp) ? cmp.lapAuthority : null);
    if (!cmpLap.eligible) reasons.push(CODES.COMPARISON_LAP_UNAVAILABLE);

    // normalized-position compatibility (lap-distance authority on both, same basis + unit).
    var norm = NP.assessNormalizationCompatibility(_isPlain(ref) ? ref.normalizationAuthority : null, _isPlain(cmp) ? cmp.normalizationAuthority : null);
    if (!norm.eligible) norm.reasonCodes.forEach(function (c) { reasons.push(c); });

    // credibility metadata must be supplied by the domain/service.
    var cred = CR.validateCredibilityMetadata(input.credibilityMetadata);
    if (!cred.valid) cred.reasonCodes.forEach(function (c) { reasons.push(c); });

    // dedupe (preserve first-seen order)
    var seen = {}, deduped = [];
    reasons.forEach(function (c) { if (RC.isReasonCode(c) && !seen[c]) { seen[c] = true; deduped.push(c); } });
    if (deduped.length) return RC.buildBlockedResult(deduped);

    // eligible — but CP1 yields NO comparison result (algorithms are deferred to a later checkpoint).
    return Object.freeze({
      eligible: true,
      status: 'eligible_pending_production',
      scope: COMPARISON_SCOPE,
      deltaSign: DELTA_SIGN,
      credibility: input.credibilityMetadata.credibility,
      provenance: input.credibilityMetadata.provenance,
      reasonCodes: Object.freeze([]),
      result: null, // contract foundation only — the actual comparison is produced by a future production service
    });
  }

  var api = {
    COMPARISON_SCOPE: COMPARISON_SCOPE,
    DELTA_SIGN: DELTA_SIGN,
    SUPPORTED_METRICS: SUPPORTED_METRICS,
    deltaSignFormula: deltaSignFormula,
    evaluateMetricSupport: evaluateMetricSupport,
    evaluateComparisonEligibility: evaluateComparisonEligibility,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonEligibilityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
