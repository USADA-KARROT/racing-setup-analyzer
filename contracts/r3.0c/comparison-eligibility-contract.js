/**
 * contracts/r3.0c/comparison-eligibility-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the comparison SCOPE (same Analysis Case only; no cross-case / cross-session / inferred track
 * match), the SINGLE delta-sign convention (delta = comparison − reference; no alternate), and a fail-closed
 * eligibility evaluator that composes the lap, normalization, and credibility contracts. CP1 produces NO
 * actual comparison result — when every gate passes, the contract returns an `eligible_pending_production`
 * marker with NO numeric payload. No telemetry, no detection, no pairing, no delta computation.
 *
 * CP1 round-2 retrofit (governance/r3.0c/cp1-retrofit-matrix.md F4 / F5 / F12):
 *   • identity schema extended with `positionBasis` (∈ ACCEPTED_POSITION_BASES) and `positionDirection`
 *     (∈ ACCEPTED_POSITION_DIRECTIONS); missing or mismatched → fail-closed with the four new reason
 *     codes (F5). Architecture v3 §(1) made these mandatory; the v2 contract did not enforce.
 *   • a new `validateComparisonContextAgainstCase(case, context)` function declares the case ↔ context
 *     binding the orchestrator MUST invoke before any production comparison (F4). The contract here
 *     does not READ telemetry / case storage — it inspects two caller-supplied authoritative records
 *     and confirms case.associations match the context's identity claims. Self-consistent forged
 *     contexts cannot bypass this gate; the eligibility composite optionally accepts a `caseRecord`
 *     argument and refuses to return `eligible_pending_production` unless the binding holds.
 *   • a documented FRAMING_KEY_SHAPE structural contract (F12 declaration only — populated by the
 *     orchestrator at C7). Free-form prose into `framing` is now a structural violation, not a
 *     stylistic concern.
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

  // CP1 round-2 retrofit (F5): identity must declare basis + direction (architecture v3 §(1)).
  // The accepted basis values intentionally cover the architecture v3 vocabulary
  // ('lap_fraction', 'distance_m') AND the v2-foundation vocabulary ('lap_distance') — the
  // normalized-position contract still narrows to 'lap_distance' for CP1 distance-only authority,
  // but the eligibility identity itself accepts the wider closed set so a mismatch between two
  // legitimate basis claims is hard-blocked rather than silently coerced.
  var ACCEPTED_POSITION_BASES = Object.freeze(['lap_distance', 'lap_fraction', 'distance_m']);
  var ACCEPTED_POSITION_DIRECTIONS = Object.freeze(['increasing', 'decreasing']);

  // CP1 round-2 retrofit (F12 declaration only): every framing entry the orchestrator emits at C7+
  // MUST be a plain object with this exact own-key set; arbitrary prose violates the contract.
  // Renderer maps i18nKey to a fixed frozen-table wording — the source never authors UI prose.
  var FRAMING_KEY_SHAPE = Object.freeze({
    requiredKeys: Object.freeze(['reasonCode', 'i18nKey']),
    optionalKeys: Object.freeze(['params']),
    // params, when supplied, MUST be a plain object whose own values are finite numbers, booleans,
    // null, or short strings (≤ 256 UTF-8 bytes) — same fail-closed posture as the export contract.
    paramsValueRule: 'finite_number | boolean | null | short_string',
  });

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _inAllowed(list, v) { return typeof v === 'string' && list.indexOf(v) !== -1; }

  function deltaSignFormula() { return DELTA_SIGN.formula; }

  // evaluateMetricSupport(name) — closed-allowlist gate; an unknown metric name fails closed (no success).
  function evaluateMetricSupport(metricName) {
    if (typeof metricName !== 'string' || SUPPORTED_METRICS.indexOf(metricName) === -1) return RC.buildBlockedResult([CODES.UNSUPPORTED_METRIC], { detail: String(metricName).slice(0, 60) });
    return Object.freeze({ eligible: true, status: 'metric_supported', metric: metricName, reasonCodes: Object.freeze([]), result: null });
  }

  function _identity(side) { return _isPlain(side) && _isPlain(side.identity) ? side.identity : null; }

  /**
   * validateComparisonContextAgainstCase(caseRecord, context) — CP1 round-2 retrofit (F4).
   *
   * The orchestrator MUST call this before any production comparison. It re-derives the authoritative
   * identity from the AnalysisCase associations (NOT from the caller-supplied context) and asserts the
   * context's claimed identity matches. This is the only structural guard against a caller smuggling
   * a self-consistent forged context (e.g. both ref and cmp claim trackId='X', but the case actually
   * binds trackId='Z'). Architecture v3 §(m1) names the function; this CP1 round-2 retrofit promotes
   * it from documentation to a contract surface that the future C6 orchestrator must compose.
   *
   * caseRecord shape (read-only inputs we depend on; other case fields are tolerated and ignored):
   *   { caseId:string, associations:{ trackId:string, layoutId:string,
   *                                  positionBasis?:string, positionDirection?:string } }
   * context shape (caller-supplied authority claim, must MATCH caseRecord.associations):
   *   { analysisCaseId, trackId, layoutId, positionBasis, positionDirection }
   *
   * Returns { valid:true, status:'context_case_binding_valid', reasonCodes:[] }
   * or buildBlockedResult([...codes]).
   */
  function validateComparisonContextAgainstCase(caseRecord, context) {
    var reasons = [];
    if (!_isPlain(caseRecord) || !_isPlain(caseRecord.associations)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'case record not a plain object with associations' });
    if (!_isPlain(context)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'context not a plain object' });
    var assoc = caseRecord.associations;
    if (!_nonEmptyStr(caseRecord.caseId) || caseRecord.caseId !== context.analysisCaseId) reasons.push(CODES.CROSS_CASE_COMPARISON_UNSUPPORTED);
    if (!_nonEmptyStr(assoc.trackId) || !_nonEmptyStr(context.trackId)) reasons.push(CODES.MISSING_TRACK_IDENTITY);
    else if (assoc.trackId !== context.trackId) reasons.push(CODES.TRACK_IDENTITY_MISMATCH);
    if (!_nonEmptyStr(assoc.layoutId) || !_nonEmptyStr(context.layoutId)) reasons.push(CODES.MISSING_TRACK_IDENTITY);
    else if (assoc.layoutId !== context.layoutId) reasons.push(CODES.TRACK_IDENTITY_MISMATCH);
    // positionBasis / positionDirection are CHECKED against the case associations IF the case carries
    // them. A case that omits these falls through (the per-side identity check still demands them
    // structurally). A case that carries them but the value is OUT-OF-ALLOWLIST is itself an
    // INVALID case record and fails closed (formal Codex round-2 F4 finding: a bogus value cannot
    // be silently treated as "case did not carry it"). A case that carries a valid value but the
    // context contradicts → fail-closed.
    if (assoc.positionBasis != null) {
      if (!_inAllowed(ACCEPTED_POSITION_BASES, assoc.positionBasis)) reasons.push(CODES.INCOMPATIBLE_POSITION_BASIS);
      else if (!_inAllowed(ACCEPTED_POSITION_BASES, context.positionBasis)) reasons.push(CODES.MISSING_POSITION_BASIS);
      else if (assoc.positionBasis !== context.positionBasis) reasons.push(CODES.INCOMPATIBLE_POSITION_BASIS);
    }
    if (assoc.positionDirection != null) {
      if (!_inAllowed(ACCEPTED_POSITION_DIRECTIONS, assoc.positionDirection)) reasons.push(CODES.INCOMPATIBLE_POSITION_DIRECTION);
      else if (!_inAllowed(ACCEPTED_POSITION_DIRECTIONS, context.positionDirection)) reasons.push(CODES.MISSING_POSITION_DIRECTION);
      else if (assoc.positionDirection !== context.positionDirection) reasons.push(CODES.INCOMPATIBLE_POSITION_DIRECTION);
    }
    // dedupe preserving first-seen order
    var seen = {}, deduped = [];
    reasons.forEach(function (c) { if (RC.isReasonCode(c) && !seen[c]) { seen[c] = true; deduped.push(c); } });
    if (deduped.length) return RC.buildBlockedResult(deduped);
    return Object.freeze({
      valid: true,
      status: 'context_case_binding_valid',
      reasonCodes: Object.freeze([]),
    });
  }

  // CP1 round-2 retrofit (F5): per-side identity check now demands positionBasis + positionDirection
  // structurally (architecture v3 §(1)). The two sides must agree on basis AND direction.
  function _checkBasisAndDirection(refId, cmpId, reasons) {
    var refBasisOk = _inAllowed(ACCEPTED_POSITION_BASES, refId.positionBasis);
    var cmpBasisOk = _inAllowed(ACCEPTED_POSITION_BASES, cmpId.positionBasis);
    if (!refBasisOk || !cmpBasisOk) reasons.push(CODES.MISSING_POSITION_BASIS);
    else if (refId.positionBasis !== cmpId.positionBasis) reasons.push(CODES.INCOMPATIBLE_POSITION_BASIS);
    var refDirOk = _inAllowed(ACCEPTED_POSITION_DIRECTIONS, refId.positionDirection);
    var cmpDirOk = _inAllowed(ACCEPTED_POSITION_DIRECTIONS, cmpId.positionDirection);
    if (!refDirOk || !cmpDirOk) reasons.push(CODES.MISSING_POSITION_DIRECTION);
    else if (refId.positionDirection !== cmpId.positionDirection) reasons.push(CODES.INCOMPATIBLE_POSITION_DIRECTION);
  }

  /**
   * evaluateComparisonEligibility(input) — fail-closed composite gate. input shape:
   *   { analysisCaseId, caseRecord?,
   *     reference:{ identity:{analysisCaseId,sessionId,lapId,trackId,layoutId,
   *                           positionBasis,positionDirection},
   *                 lapAuthority:{...5}, normalizationAuthority:{...} },
   *     comparison:{ ...same... }, credibilityMetadata }
   * If `caseRecord` is supplied the composite ALSO runs validateComparisonContextAgainstCase against
   * each side's identity (F4) — the future C6 orchestrator is expected to pass it; an explicit absence
   * is permitted at the contract layer (CP1 has no orchestrator yet) but is logged as a limitation
   * in the contract test layer.
   *
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

    // CP1 round-2 retrofit (F5): basis + direction are mandatory identity claims.
    _checkBasisAndDirection(refId, cmpId, reasons);

    // CP1 round-2 retrofit (F4): if a caseRecord is supplied, both sides' identity must bind to it.
    if (input.caseRecord !== undefined && input.caseRecord !== null) {
      var refBind = validateComparisonContextAgainstCase(input.caseRecord, refId);
      if (!refBind.valid && Array.isArray(refBind.reasonCodes)) refBind.reasonCodes.forEach(function (c) { reasons.push(c); });
      var cmpBind = validateComparisonContextAgainstCase(input.caseRecord, cmpId);
      if (!cmpBind.valid && Array.isArray(cmpBind.reasonCodes)) cmpBind.reasonCodes.forEach(function (c) { reasons.push(c); });
    }

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
    ACCEPTED_POSITION_BASES: ACCEPTED_POSITION_BASES,
    ACCEPTED_POSITION_DIRECTIONS: ACCEPTED_POSITION_DIRECTIONS,
    FRAMING_KEY_SHAPE: FRAMING_KEY_SHAPE,
    deltaSignFormula: deltaSignFormula,
    evaluateMetricSupport: evaluateMetricSupport,
    evaluateComparisonEligibility: evaluateComparisonEligibility,
    validateComparisonContextAgainstCase: validateComparisonContextAgainstCase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonEligibilityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
