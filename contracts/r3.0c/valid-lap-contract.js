/**
 * contracts/r3.0c/valid-lap-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the FIVE mandatory authorities a lap must carry to be eligible for comparison, and a fail-closed
 * evaluator over a caller-supplied authority descriptor. This is an INPUT contract + rejection reasons only:
 * it does NOT detect laps, does NOT compute completeness/coverage, does NOT read telemetry. The real
 * eligibility re-derivation from raw evidence belongs to a future production service (CP2+); here we only
 * assert the STRUCTURE of an authority claim and fail closed on anything missing/unknown/incompatible.
 *
 * "Authority, not presence": every authority slot must be an explicit { satisfied:true } descriptor — a key
 * merely existing is never treated as satisfied; an unknown/absent/false slot blocks with its reason code.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ValidLapContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('valid-lap-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // the five mandatory lap authorities (directive §4 "valid lap"). Order is the canonical contract order.
  var REQUIRED_LAP_AUTHORITIES = Object.freeze(['lapIdentity', 'completeness', 'timingValidity', 'trackIdentity', 'sampleContinuity']);
  // each authority maps to the reason code emitted when it is missing/unsatisfied.
  var AUTHORITY_REASON = Object.freeze({
    lapIdentity: CODES.MISSING_LAP_IDENTITY,
    completeness: CODES.INCOMPLETE_LAP,
    timingValidity: CODES.INVALID_TIMING,
    trackIdentity: CODES.MISSING_TRACK_IDENTITY,
    sampleContinuity: CODES.INSUFFICIENT_SAMPLE_COVERAGE,
  });

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _satisfied(slot) { return _isPlain(slot) && slot.satisfied === true; }

  /**
   * evaluateLapAuthority(authority) — fail-closed structural gate.
   * Returns a blocked result (no payload) listing every unsatisfied authority's reason code, or
   * { eligible:true, status:'lap_authority_complete', evaluation:'contract_structural', reasonCodes:[] }.
   * `evaluation:'contract_structural'` is explicit: this is a structure gate, NOT a raw-evidence re-derivation.
   */
  function evaluateLapAuthority(authority) {
    if (!_isPlain(authority)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'lap authority not an object' });
    var reasons = [];
    REQUIRED_LAP_AUTHORITIES.forEach(function (key) {
      var slot = authority[key];
      if (!_satisfied(slot)) {
        // sampleContinuity distinguishes an explicit discontinuity from insufficient coverage.
        if (key === 'sampleContinuity' && _isPlain(slot) && slot.discontinuous === true) reasons.push(CODES.DISCONTINUOUS_SAMPLES);
        else reasons.push(AUTHORITY_REASON[key]);
      }
    });
    if (reasons.length) return RC.buildBlockedResult(reasons);
    return Object.freeze({
      eligible: true,
      status: 'lap_authority_complete',
      evaluation: 'contract_structural', // honest scope: a structure gate, not a measured re-derivation
      reasonCodes: Object.freeze([]),
      result: null, // CP1 produces no lap-level numeric result
    });
  }

  var api = {
    REQUIRED_LAP_AUTHORITIES: REQUIRED_LAP_AUTHORITIES,
    AUTHORITY_REASON: AUTHORITY_REASON,
    evaluateLapAuthority: evaluateLapAuthority,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ValidLapContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
