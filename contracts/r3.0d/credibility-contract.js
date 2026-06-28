/**
 * contracts/r3.0d/credibility-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the Credibility ladder, Provenance enum, Confidence state, and Availability enum used by
 * every D-phase contract. Credibility is OWNED by the domain/service (it is an INPUT here); a
 * UI/consumer never derives it. This module only VALIDATES caller-supplied authority — it computes
 * no new measurement, reads no telemetry, makes no inference.
 *
 * Confidence discipline (directive §8 / D1 — Confidence):
 *   • A caller CANNOT directly supply a numeric confidence at D1.
 *   • Confidence is either:
 *     (a) UNRESOLVED — explicit `{ state: 'unresolved' }` marker, OR
 *     (b) NOT_COMPUTED — explicit `{ state: 'not_computed' }` marker.
 *   The numeric confidence value is produced ONLY by a deterministic engine at D4_PRIORITY_ENGINE.
 *   Any D1 confidence object that carries a numeric `value` field is rejected with
 *   HYPOTHESIS_CONFIDENCE_FORBIDDEN.
 *
 * Credibility ladder (mirrors docs/credibility-and-trust.md and the R3.0C / R3.0B enums so the
 * vocabulary cannot drift). NON-PRODUCTION: no renderer dependency, no runtime consumer, no algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0D_CredibilityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  if (!RC) throw new Error('credibility-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // R3.0D credibility ladder. Directive §8 mandates `measured / derived / heuristic / synthetic` for
  // EVIDENCE credibility (i.e., where the data came from). The five-step ladder from R3.0C is the
  // CONCLUSION credibility (the strength of a downstream claim). D1 keeps both vocabularies cleanly
  // separated so a heuristic source cannot be re-labelled as a measured conclusion.
  var EVIDENCE_CREDIBILITY = Object.freeze(['measured', 'derived', 'heuristic', 'synthetic']);
  var CONCLUSION_CREDIBILITY = Object.freeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);

  // Provenance enum mirrors R3.0B / R3.0C.
  var PROVENANCE = Object.freeze(['synthetic', 'real', 'unverified']);

  // Confidence state at D1 — closed enum. There is NO numeric `value` field allowed at D1.
  var CONFIDENCE_STATES = Object.freeze(['unresolved', 'not_computed']);

  // Availability enum — used by the evidence graph (whether a metric / channel is currently usable).
  var AVAILABILITY = Object.freeze(['available', 'unavailable', 'partial', 'unconfirmed']);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _inEnum(list, v) { return typeof v === 'string' && list.indexOf(v) !== -1; }
  function _ownKeys(o) { try { return Object.keys(o); } catch (e) { return null; } }

  // Codex D1 R1 Finding RN-01 closure: Reflect.ownKeys catches non-enumerable + Symbol-keyed own
  // properties that Object.keys silently ignores. Symbols always fail the string-allowlist indexOf.
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (allowed.indexOf(k) === -1) return false;
    }
    return true;
  }

  /**
   * validateEvidenceCredibility(value) — caller supplies a string from EVIDENCE_CREDIBILITY.
   * Returns { valid:true } or buildBlockedResult.
   */
  function validateEvidenceCredibility(value) {
    // RN-02 closure: outer try/catch. Even an enum-lookup against a hostile object can throw if the
    // value is a Proxy whose toString/conversion throws; pin the boundary.
    try {
      if (!_inEnum(EVIDENCE_CREDIBILITY, value)) return RC.buildBlockedResult([CODES.EVIDENCE_CREDIBILITY_INVALID]);
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_CREDIBILITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateProvenance(value) — caller supplies a string from PROVENANCE.
   */
  function validateProvenance(value) {
    try {
      if (!_inEnum(PROVENANCE, value)) return RC.buildBlockedResult([CODES.EVIDENCE_PROVENANCE_INVALID]);
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_PROVENANCE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateConfidenceShape(c) — D1 caller-supplied confidence MUST be a closed-key plain object with
   * { state: 'unresolved' | 'not_computed' }. Any presence of `value`, `score`, `numeric`, `probability`
   * → HYPOTHESIS_CONFIDENCE_FORBIDDEN. Any extra own key → UNKNOWN_OWN_KEY.
   */
  function validateConfidenceShape(c) {
    try {
      if (!_isPlain(c)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN], { detail: 'confidence not plain object' });
      if (!_hasOnlyAllowedKeys(c, ['state'])) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN, CODES.UNKNOWN_OWN_KEY], { detail: 'confidence carries forbidden own key' });
      if (!_inEnum(CONFIDENCE_STATES, c.state)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN], { detail: 'confidence.state not in allowed enum' });
      return Object.freeze({ valid: true, state: c.state });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'confidence validator threw on hostile input' });
    }
  }

  /**
   * validateAvailability(value) — caller supplies a string from AVAILABILITY.
   */
  function validateAvailability(value) {
    try {
      if (!_inEnum(AVAILABILITY, value)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  // synthetic-honesty constraint: a `synthetic` provenance MUST carry the LIMITATION_SYNTHETIC_ONLY
  // marker among its limitations. This is checked at the evidence-node layer; here we expose the
  // constant for the cross-layer assertion.
  var SYNTHETIC_LIMITATION_REQUIRED = CODES.LIMITATION_SYNTHETIC_ONLY;

  var api = {
    EVIDENCE_CREDIBILITY: EVIDENCE_CREDIBILITY,
    CONCLUSION_CREDIBILITY: CONCLUSION_CREDIBILITY,
    PROVENANCE: PROVENANCE,
    CONFIDENCE_STATES: CONFIDENCE_STATES,
    AVAILABILITY: AVAILABILITY,
    SYNTHETIC_LIMITATION_REQUIRED: SYNTHETIC_LIMITATION_REQUIRED,
    validateEvidenceCredibility: validateEvidenceCredibility,
    validateProvenance: validateProvenance,
    validateConfidenceShape: validateConfidenceShape,
    validateAvailability: validateAvailability,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_CredibilityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
