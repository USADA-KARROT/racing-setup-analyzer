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
 * HARDENED-INTRINSICS REFACTOR (2026-06-29): all ambient intrinsic calls routed through
 * hardened-intrinsics.js safe wrappers. Replaced:
 *   - Object.freeze(...) for enum tables and validator return values → HI.deepFreeze
 *   - Object.keys(o)               → HI.safeKeys (in dead `_ownKeys` helper, removed)
 *   - Object.getPrototypeOf(v)     → HI.safeGetPrototypeOf
 *   - Array.isArray(v)             → HI.safeIsArray
 *   - list.indexOf(v) !== -1       → HI.safeArrayIndexOf
 *   - Reflect.ownKeys(o)           → HI.safeOwnKeys
 *   - keys.length / keys[i] iteration retained (own-property reads on plain arrays we built)
 * Semantic behaviour preserved exactly: every reason code path, every validator outcome, and the
 * `_hasOnlyAllowedKeys` Symbol/non-enumerable rejection (Codex D1 R1 RN-01 closure) all match the
 * pre-refactor file. The defence-in-depth comments are retained verbatim.
 *
 * UMD: Node require / Electron renderer global (R3_0D_CredibilityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  if (!RC) throw new Error('credibility-contract.js requires reason-codes.js');
  var HI = _req('./hardened-intrinsics.js', typeof R3_0D_HardenedIntrinsics !== 'undefined' ? R3_0D_HardenedIntrinsics : undefined);
  if (!HI) throw new Error('credibility-contract.js requires hardened-intrinsics.js');
  var CODES = RC.REASON_CODES;

  // R3.0D credibility ladder. Directive §8 mandates `measured / derived / heuristic / synthetic` for
  // EVIDENCE credibility (i.e., where the data came from). The five-step ladder from R3.0C is the
  // CONCLUSION credibility (the strength of a downstream claim). D1 keeps both vocabularies cleanly
  // separated so a heuristic source cannot be re-labelled as a measured conclusion.
  var EVIDENCE_CREDIBILITY = HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']);
  var CONCLUSION_CREDIBILITY = HI.deepFreeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);

  // Provenance enum mirrors R3.0B / R3.0C.
  var PROVENANCE = HI.deepFreeze(['synthetic', 'real', 'unverified']);

  // Confidence state at D1 — closed enum. There is NO numeric `value` field allowed at D1.
  var CONFIDENCE_STATES = HI.deepFreeze(['unresolved', 'not_computed']);

  // Availability enum — used by the evidence graph (whether a metric / channel is currently usable).
  var AVAILABILITY = HI.deepFreeze(['available', 'unavailable', 'partial', 'unconfirmed']);

  // Allowed-keys whitelist for confidence object validation. Frozen once at module init so it
  // cannot be mutated by an attacker between calls.
  var _CONFIDENCE_ALLOWED_KEYS = HI.deepFreeze(['state']);

  // _isPlain(v) — must be a non-array, non-null object whose prototype is exactly Object.prototype
  // or null. Implemented via HI.safeIsPlainShape so the Object.prototype identity check happens
  // inside hardened-intrinsics (which holds the captured _ObjectPrototype reference). Avoids any
  // ambient `Object.prototype` lookup or ambient `Array.isArray` / `Object.getPrototypeOf` call.
  function _isPlain(v) {
    return HI.safeIsPlainShape(v) === 'plain-object';
  }
  function _inEnum(list, v) { return typeof v === 'string' && HI.safeArrayIndexOf(list, v) !== -1; }

  // Codex D1 R1 Finding RN-01 closure: Reflect.ownKeys catches non-enumerable + Symbol-keyed own
  // properties that Object.keys silently ignores. Symbols always fail the string-allowlist indexOf.
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) return false;
    var n = keys.length;
    for (var i = 0; i < n; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
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
      return HI.deepFreeze({ valid: true });
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
      return HI.deepFreeze({ valid: true });
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
      if (!_hasOnlyAllowedKeys(c, _CONFIDENCE_ALLOWED_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN, CODES.UNKNOWN_OWN_KEY], { detail: 'confidence carries forbidden own key' });
      if (!_inEnum(CONFIDENCE_STATES, c.state)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN], { detail: 'confidence.state not in allowed enum' });
      return HI.deepFreeze({ valid: true, state: c.state });
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
      return HI.deepFreeze({ valid: true });
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
