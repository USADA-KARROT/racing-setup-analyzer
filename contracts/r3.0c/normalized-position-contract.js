/**
 * contracts/r3.0c/normalized-position-contract.js — R3.0C · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the INPUT contract for the normalized track-position axis: the ONLY accepted position authority is
 * lap-distance, the documented normalized range is [0,1), and two laps may only be compared on a compatible
 * basis/unit. The contract layer defines the input contract, eligibility, rejection reasons, and the
 * structural shape of a normalize-distance request the C3 production service must accept — it does NOT
 * implement the normalized axis at all: no min-max mapping, no wrap handling, no sample-to-grid fitting,
 * no curve fitting between points, no sample traversal. It only validates SHAPES of a position authority
 * claim and a normalize-distance input request. The actual normalization lives in
 * renderer/js/r3-0c-normalized-distance.js (C3_NORMALIZED_DISTANCE).
 *
 * UMD: Node require / Electron renderer global (R3_0C_NormalizedPositionContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('normalized-position-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  var POSITION_BASIS = Object.freeze({ LAP_DISTANCE: 'lap_distance' });
  var ACCEPTED_BASES = Object.freeze([POSITION_BASIS.LAP_DISTANCE]); // lap-distance authority ONLY
  // documented target axis (a spec constant, not a computation): normalized position ∈ [0, 1).
  var NORMALIZED_RANGE = Object.freeze({ min: 0, maxExclusive: 1 });

  // ── C3 contract surface — closed allowlists the production service consumes ──
  // Units the contract is willing to canonicalize to a metric base. 'normalized' is the
  // already-normalized authority pre-supplied by an authoritative upstream (refused here unless
  // the authority shape proves it; the production service does the proof, this contract names the
  // tokens). Any unit not listed → NORMALIZED_DISTANCE_UNSUPPORTED_UNIT.
  var ACCEPTED_DISTANCE_UNITS = Object.freeze(['m', 'meter', 'metre', 'km', 'kilometer', 'kilometre', 'normalized']);
  // Directions the production service may consume. Other values, missing fields, and inconsistencies
  // route to NORMALIZED_DISTANCE_UNKNOWN_DIRECTION / NORMALIZED_DISTANCE_INCONSISTENT_DIRECTION.
  var ACCEPTED_DIRECTIONS = Object.freeze(['forward', 'reverse']);
  // Wrap semantics mirror r3-0c-distance-authority's canonical names so a distance authority can
  // flow straight through to the normalize input without translation.
  var ACCEPTED_WRAP_SEMANTICS = Object.freeze(['no_wrap', 'wraps_at_lap_end', 'wraps_at_value']);
  // Monotonicity profiles the canonical axis MAY honour after canonicalization. Either is legal;
  // the contract pins the choice in the request so the service cannot quietly switch.
  var ACCEPTED_MONOTONICITY = Object.freeze(['non_decreasing', 'strictly_increasing']);
  // Duplicate-position policies. The choice is deterministic and MUST be declared up-front — a
  // silent collapse / retain decision would otherwise hide a corrupted distance series.
  var ACCEPTED_DUPLICATE_POSITION_POLICIES = Object.freeze(['collapse', 'retain', 'reject']);
  // Endpoint conventions the contract names. Pins inclusive / exclusive choice for downstream
  // consumers; the production service applies it.
  var ACCEPTED_ENDPOINT_CONVENTIONS = Object.freeze(['half_open_0_inclusive_1_exclusive', 'closed_0_inclusive_1_inclusive']);

  // Reason codes the C3 service is allowed to emit (closed allowlist; the service must not free-form).
  // Tests cross-check this against REASON_CODES so a service that emits an unlisted code fails closed.
  var C3_NORMALIZE_REASON_CODES = Object.freeze([
    CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY,
    CODES.INCOMPATIBLE_NORMALIZATION,
    CODES.NORMALIZED_DISTANCE_EMPTY_INPUT,
    CODES.NORMALIZED_DISTANCE_SINGLE_SAMPLE,
    CODES.NORMALIZED_DISTANCE_NUMERIC_INVALID,
    CODES.NORMALIZED_DISTANCE_UNSUPPORTED_UNIT,
    CODES.NORMALIZED_DISTANCE_UNKNOWN_DIRECTION,
    CODES.NORMALIZED_DISTANCE_INCONSISTENT_DIRECTION,
    CODES.NORMALIZED_DISTANCE_NON_MONOTONIC,
    CODES.NORMALIZED_DISTANCE_INVALID_WRAP,
    CODES.NORMALIZED_DISTANCE_MULTIPLE_WRAPS,
    CODES.NORMALIZED_DISTANCE_INSUFFICIENT_SAMPLES,
    CODES.NORMALIZED_DISTANCE_INSUFFICIENT_COVERAGE,
    CODES.NORMALIZED_DISTANCE_GAP_TOO_LARGE,
    CODES.NORMALIZED_DISTANCE_TIME_GAP_TOO_LARGE,
    CODES.NORMALIZED_DISTANCE_EXTRAPOLATION_REQUIRED,
    CODES.NORMALIZED_DISTANCE_IDENTITY_MISMATCH,
    CODES.NORMALIZED_DISTANCE_AUTHORITY_FORGED,
    CODES.INTERNAL_CONTRACT_VIOLATION,
  ]);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }

  /**
   * evaluateNormalizedPositionAuthority(authority) — fail-closed gate over ONE lap's position authority.
   * Requires { basis:'lap_distance', distanceAuthority:{ satisfied:true }, positionUnit:<string> }.
   *   • absent authority / missing distance authority → MISSING_NORMALIZED_DISTANCE_AUTHORITY;
   *   • a basis other than lap-distance → INCOMPATIBLE_NORMALIZATION (no other axis is accepted in CP1).
   */
  function evaluateNormalizedPositionAuthority(authority) {
    if (!_isPlain(authority)) return RC.buildBlockedResult([CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY], { detail: 'position authority not an object' });
    var reasons = [];
    if (ACCEPTED_BASES.indexOf(authority.basis) === -1) reasons.push(CODES.INCOMPATIBLE_NORMALIZATION);
    var da = authority.distanceAuthority;
    if (!(_isPlain(da) && da.satisfied === true)) reasons.push(CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY);
    if (typeof authority.positionUnit !== 'string' || authority.positionUnit.length === 0) reasons.push(CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY);
    if (reasons.length) return RC.buildBlockedResult(reasons);
    return Object.freeze({
      eligible: true,
      status: 'normalized_position_authority_valid',
      basis: POSITION_BASIS.LAP_DISTANCE,
      positionUnit: authority.positionUnit,
      normalizedRange: NORMALIZED_RANGE,
      reasonCodes: Object.freeze([]),
      result: null, // CP1 implements no normalization
    });
  }

  /**
   * assessNormalizationCompatibility(refAuthority, compAuthority) — both laps must independently be valid AND
   * share basis + positionUnit. Any divergence → INCOMPATIBLE_NORMALIZATION. No values are normalized here.
   */
  function assessNormalizationCompatibility(refAuthority, compAuthority) {
    var rv = evaluateNormalizedPositionAuthority(refAuthority);
    var cv = evaluateNormalizedPositionAuthority(compAuthority);
    if (!rv.eligible || !cv.eligible) {
      var merged = [].concat(rv.eligible ? [] : rv.reasonCodes, cv.eligible ? [] : cv.reasonCodes);
      return RC.buildBlockedResult(merged);
    }
    if (rv.basis !== cv.basis || rv.positionUnit !== cv.positionUnit) return RC.buildBlockedResult([CODES.INCOMPATIBLE_NORMALIZATION]);
    return Object.freeze({
      eligible: true,
      status: 'normalization_compatible',
      basis: rv.basis,
      positionUnit: rv.positionUnit,
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  /**
   * evaluateNormalizeDistanceRequestShape(request) — fail-closed STRUCTURAL gate for the C3
   * production service's input. Contract layer only; performs NO traversal of samples / values
   * and decides nothing numerical. It checks that the request declares (a) an identity quadruple
   * binding the request to a caseId / sessionId / lapId / sourceId, (b) a distance authority that
   * is shape-compatible with r3-0c-distance-authority's output, (c) a samples object with arrays of
   * positions / times (presence only, not values), and (d) a request-policy block pinning unit
   * tokens, direction, wrap semantics, monotonicity, duplicate policy and endpoint convention. A
   * request that names an unsupported token in the policy block is refused with the matching
   * NORMALIZED_DISTANCE_* code so the production service is never asked to interpret a token the
   * contract did not authorise. The actual numerical evaluation (coverage, wrap detection,
   * monotonicity, NaN, etc) lives in the production service and emits its own reason codes from
   * C3_NORMALIZE_REASON_CODES — this contract gate is the FIRST layer; the production service is
   * the SECOND. Both must agree on the reason-code allowlist (the production service tests pin
   * the cross-check explicitly).
   */
  function evaluateNormalizeDistanceRequestShape(request) {
    if (!_isPlain(request)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'normalize-distance request not an object' });
    var reasons = [];

    var id = request.identity;
    if (!_isPlain(id) || typeof id.caseId !== 'string' || id.caseId.length === 0
      || typeof id.sessionId !== 'string' || id.sessionId.length === 0
      || typeof id.lapId !== 'string' || id.lapId.length === 0
      || typeof id.sourceId !== 'string' || id.sourceId.length === 0) {
      reasons.push(CODES.NORMALIZED_DISTANCE_IDENTITY_MISMATCH);
    }

    var auth = request.distanceAuthority;
    if (!_isPlain(auth)) reasons.push(CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY);
    else {
      // accept either a r3-0c-distance-authority result `{ eligible:true, authority:{...} }` or the
      // bare authority descriptor `{ sourceChannel, unit, direction, wrapSemantics, authorityStatus }`.
      var descriptor = _isPlain(auth.authority) ? auth.authority : auth;
      if (typeof descriptor.sourceChannel !== 'string' || descriptor.sourceChannel.length === 0
        || typeof descriptor.unit !== 'string' || descriptor.unit.length === 0
        || typeof descriptor.direction !== 'string' || descriptor.direction.length === 0
        || typeof descriptor.wrapSemantics !== 'string' || descriptor.wrapSemantics.length === 0
        || typeof descriptor.authorityStatus !== 'string' || descriptor.authorityStatus.length === 0) {
        reasons.push(CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY);
      } else {
        if (descriptor.authorityStatus !== 'channel_source_declared') reasons.push(CODES.NORMALIZED_DISTANCE_AUTHORITY_FORGED);
        if (ACCEPTED_DISTANCE_UNITS.indexOf(descriptor.unit) === -1) reasons.push(CODES.NORMALIZED_DISTANCE_UNSUPPORTED_UNIT);
        if (ACCEPTED_DIRECTIONS.indexOf(descriptor.direction) === -1) reasons.push(CODES.NORMALIZED_DISTANCE_UNKNOWN_DIRECTION);
        if (ACCEPTED_WRAP_SEMANTICS.indexOf(descriptor.wrapSemantics) === -1) reasons.push(CODES.NORMALIZED_DISTANCE_INVALID_WRAP);
      }
    }

    var samples = request.samples;
    if (!_isPlain(samples) || !Array.isArray(samples.distances) || !Array.isArray(samples.times)) {
      reasons.push(CODES.NORMALIZED_DISTANCE_EMPTY_INPUT);
    } else if (samples.distances.length !== samples.times.length) {
      reasons.push(CODES.NORMALIZED_DISTANCE_EMPTY_INPUT);
    } else if (samples.distances.length === 0) {
      reasons.push(CODES.NORMALIZED_DISTANCE_EMPTY_INPUT);
    } else if (samples.distances.length === 1) {
      reasons.push(CODES.NORMALIZED_DISTANCE_SINGLE_SAMPLE);
    }

    var policy = request.policy;
    if (!_isPlain(policy)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else {
      if (ACCEPTED_MONOTONICITY.indexOf(policy.monotonicity) === -1) reasons.push(CODES.NORMALIZED_DISTANCE_NON_MONOTONIC);
      if (ACCEPTED_DUPLICATE_POSITION_POLICIES.indexOf(policy.duplicatePositions) === -1) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
      if (ACCEPTED_ENDPOINT_CONVENTIONS.indexOf(policy.endpointConvention) === -1) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
      // Coverage / sample-count / gap thresholds must be present so the production service has no
      // implicit default. The contract does NOT decide their numeric range; only that they exist as
      // finite positive numbers / integers. Out-of-range values surface from the production service.
      if (typeof policy.coverage !== 'number' || !isFinite(policy.coverage) || policy.coverage <= 0 || policy.coverage > 1) reasons.push(CODES.NORMALIZED_DISTANCE_INSUFFICIENT_COVERAGE);
      if (!Number.isInteger(policy.minimumSamples) || policy.minimumSamples <= 0) reasons.push(CODES.NORMALIZED_DISTANCE_INSUFFICIENT_SAMPLES);
      if (typeof policy.normalizedMaxGap !== 'number' || !isFinite(policy.normalizedMaxGap) || policy.normalizedMaxGap <= 0 || policy.normalizedMaxGap >= 1) reasons.push(CODES.NORMALIZED_DISTANCE_GAP_TOO_LARGE);
      if (typeof policy.timeGapSeconds !== 'number' || !isFinite(policy.timeGapSeconds) || policy.timeGapSeconds <= 0) reasons.push(CODES.NORMALIZED_DISTANCE_TIME_GAP_TOO_LARGE);
    }

    if (reasons.length) {
      // dedupe preserving first-seen order; the factory accepts duplicates but the test layer
      // checks the de-duped form against the closed allowlist.
      var seen = {}, deduped = [];
      reasons.forEach(function (c) { if (RC.isReasonCode(c) && !seen[c]) { seen[c] = true; deduped.push(c); } });
      return RC.buildBlockedResult(deduped);
    }
    return Object.freeze({
      eligible: true,
      status: 'normalize_distance_request_shape_valid',
      // The contract NEVER produces numbers. The production service consumes this shape-valid
      // marker as a precondition, not a value.
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    POSITION_BASIS: POSITION_BASIS,
    ACCEPTED_BASES: ACCEPTED_BASES,
    NORMALIZED_RANGE: NORMALIZED_RANGE,
    ACCEPTED_DISTANCE_UNITS: ACCEPTED_DISTANCE_UNITS,
    ACCEPTED_DIRECTIONS: ACCEPTED_DIRECTIONS,
    ACCEPTED_WRAP_SEMANTICS: ACCEPTED_WRAP_SEMANTICS,
    ACCEPTED_MONOTONICITY: ACCEPTED_MONOTONICITY,
    ACCEPTED_DUPLICATE_POSITION_POLICIES: ACCEPTED_DUPLICATE_POSITION_POLICIES,
    ACCEPTED_ENDPOINT_CONVENTIONS: ACCEPTED_ENDPOINT_CONVENTIONS,
    C3_NORMALIZE_REASON_CODES: C3_NORMALIZE_REASON_CODES,
    evaluateNormalizedPositionAuthority: evaluateNormalizedPositionAuthority,
    assessNormalizationCompatibility: assessNormalizationCompatibility,
    evaluateNormalizeDistanceRequestShape: evaluateNormalizeDistanceRequestShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_NormalizedPositionContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
