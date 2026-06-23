/**
 * contracts/r3.0c/normalized-position-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the INPUT contract for the normalized track-position axis: the ONLY accepted position authority is
 * lap-distance, the documented normalized range is [0,1), and two laps may only be compared on a compatible
 * basis/unit. CP1 defines the input contract, eligibility, and rejection reasons ONLY — it does NOT implement
 * the normalized axis at all: no min-max mapping, no wrap handling, no sample-to-grid fitting, no curve
 * fitting between points, no sample traversal. It only validates the SHAPE of a position authority claim.
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

  var api = {
    POSITION_BASIS: POSITION_BASIS,
    ACCEPTED_BASES: ACCEPTED_BASES,
    NORMALIZED_RANGE: NORMALIZED_RANGE,
    evaluateNormalizedPositionAuthority: evaluateNormalizedPositionAuthority,
    assessNormalizationCompatibility: assessNormalizationCompatibility,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_NormalizedPositionContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
