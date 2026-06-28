/**
 * contracts/r3.0d/reason-codes.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * The single, frozen, machine-readable registry of R3.0D Decision Engine reason codes. This module is a
 * CONTRACT artifact only:
 *   • lives OUTSIDE renderer/js/ — the R3-GATE0 R3.0D scope guard does not apply;
 *   • has NO runtime consumer, is required by NO production module, imports NOTHING from renderer/js/;
 *   • contains NO algorithm — no graph traversal, no rule evaluation, no priority ranking, no causal
 *     inference. Codes + a shared blocked-result factory only.
 *
 * Codes are stable, unique, UPPER_SNAKE string constants (machine-readable; never replaced by free text).
 * Each code carries a stable i18n explanation KEY (a hook for a human-readable rendering) — never UI prose.
 *
 * UMD: Node require / Electron renderer global (R3_0D_ReasonCodes). (Global export is for symmetry with the
 * codebase UMD convention; nothing in renderer/js/ requires it — D1 wires no consumer.)
 */
(function (root) {
  'use strict';

  // R3.0D reason codes. Grouped by the directive Section 8 / 9 / 10 dimensions:
  //  • EVIDENCE_*           — evidence-graph structural rejections (D1 + D2)
  //  • HYPOTHESIS_*         — hypothesis-shape + causal-overclaim rejections (D1 + D3)
  //  • RECOMMENDATION_*     — recommendation + priority rejections (D1 + D4)
  //  • VALIDATION_ACTION_*  — validation-action rejections
  //  • CANNOT_CONCLUDE      — the structurally-mandated outcome when evidence is insufficient
  //  • LIMITATION_*         — bounded-honesty limitation codes
  //  • SOURCE_IDENTITY_*    — case/session/lap binding rejections
  //  • BRIEF_*              — engineer-brief composition rejections
  //  • Structural / fail-closed: INTERNAL_CONTRACT_VIOLATION, UNSUPPORTED_FUTURE_SCHEMA,
  //    PROTOTYPE_POLLUTION_REJECTED, NUMERIC_INVALID, BYTE_CAP_EXCEEDED, ARRAY_CAP_EXCEEDED.
  var REASON_CODES = Object.freeze({
    // Evidence (D1 structural + D2 graph)
    EVIDENCE_NODE_INVALID: 'EVIDENCE_NODE_INVALID',
    EVIDENCE_NODE_MISSING_ID: 'EVIDENCE_NODE_MISSING_ID',
    EVIDENCE_NODE_ID_FORBIDDEN: 'EVIDENCE_NODE_ID_FORBIDDEN',
    EVIDENCE_CATEGORY_UNKNOWN: 'EVIDENCE_CATEGORY_UNKNOWN',
    EVIDENCE_CREDIBILITY_INVALID: 'EVIDENCE_CREDIBILITY_INVALID',
    EVIDENCE_PROVENANCE_INVALID: 'EVIDENCE_PROVENANCE_INVALID',
    EVIDENCE_CONFIDENCE_FORBIDDEN: 'EVIDENCE_CONFIDENCE_FORBIDDEN',
    EVIDENCE_FRESHNESS_STALE: 'EVIDENCE_FRESHNESS_STALE',
    EVIDENCE_ASSOCIATION_MISMATCH: 'EVIDENCE_ASSOCIATION_MISMATCH',
    EVIDENCE_OBSERVATION_INVALID: 'EVIDENCE_OBSERVATION_INVALID',
    EVIDENCE_DUPLICATE_ID: 'EVIDENCE_DUPLICATE_ID',
    EVIDENCE_GRAPH_CYCLE: 'EVIDENCE_GRAPH_CYCLE',
    EVIDENCE_GRAPH_ORPHAN: 'EVIDENCE_GRAPH_ORPHAN',
    EVIDENCE_GRAPH_SELF_REFERENCE: 'EVIDENCE_GRAPH_SELF_REFERENCE',
    EVIDENCE_GRAPH_BOUNDS_EXCEEDED: 'EVIDENCE_GRAPH_BOUNDS_EXCEEDED',
    EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT: 'EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT',
    EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT: 'EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT',
    EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN: 'EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN',

    // Hypothesis (D1 shape + D3 causal-overclaim guard)
    HYPOTHESIS_INVALID: 'HYPOTHESIS_INVALID',
    HYPOTHESIS_CAUSAL_OVERCLAIM: 'HYPOTHESIS_CAUSAL_OVERCLAIM',
    HYPOTHESIS_CONFIDENCE_FORBIDDEN: 'HYPOTHESIS_CONFIDENCE_FORBIDDEN',
    HYPOTHESIS_AUTHORITY_FORGED: 'HYPOTHESIS_AUTHORITY_FORGED',
    HYPOTHESIS_CATEGORY_UNKNOWN: 'HYPOTHESIS_CATEGORY_UNKNOWN',
    HYPOTHESIS_EVIDENCE_LINK_INVALID: 'HYPOTHESIS_EVIDENCE_LINK_INVALID',
    HYPOTHESIS_CONTRADICTION_INVALID: 'HYPOTHESIS_CONTRADICTION_INVALID',
    HYPOTHESIS_ALTERNATIVE_INVALID: 'HYPOTHESIS_ALTERNATIVE_INVALID',
    HYPOTHESIS_DRIVER_BLAME_FORBIDDEN: 'HYPOTHESIS_DRIVER_BLAME_FORBIDDEN',
    HYPOTHESIS_PROFESSIONAL_DIAGNOSIS_FORBIDDEN: 'HYPOTHESIS_PROFESSIONAL_DIAGNOSIS_FORBIDDEN',
    HYPOTHESIS_GUARANTEED_FIX_FORBIDDEN: 'HYPOTHESIS_GUARANTEED_FIX_FORBIDDEN',
    HYPOTHESIS_FREE_TEXT_CAUSAL_AUTHORITY_FORBIDDEN: 'HYPOTHESIS_FREE_TEXT_CAUSAL_AUTHORITY_FORBIDDEN',

    // Recommendation + Priority (D1 shape + D4)
    RECOMMENDATION_INVALID: 'RECOMMENDATION_INVALID',
    RECOMMENDATION_BLOCKED: 'RECOMMENDATION_BLOCKED',
    RECOMMENDATION_AUTO_TUNING_FORBIDDEN: 'RECOMMENDATION_AUTO_TUNING_FORBIDDEN',
    RECOMMENDATION_AUTO_SETUP_FORBIDDEN: 'RECOMMENDATION_AUTO_SETUP_FORBIDDEN',
    RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN: 'RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN',
    RECOMMENDATION_AUTO_PRESET_FORBIDDEN: 'RECOMMENDATION_AUTO_PRESET_FORBIDDEN',
    RECOMMENDATION_SETUP_WITHOUT_QUALIFIED_EVIDENCE: 'RECOMMENDATION_SETUP_WITHOUT_QUALIFIED_EVIDENCE',
    RECOMMENDATION_PRIORITY_INVALID: 'RECOMMENDATION_PRIORITY_INVALID',
    RECOMMENDATION_PRIORITY_OUT_OF_ORDER: 'RECOMMENDATION_PRIORITY_OUT_OF_ORDER',

    // Validation actions
    VALIDATION_ACTION_INVALID: 'VALIDATION_ACTION_INVALID',
    VALIDATION_ACTION_UNKNOWN_KIND: 'VALIDATION_ACTION_UNKNOWN_KIND',

    // Honest-outcome codes
    CANNOT_CONCLUDE: 'CANNOT_CONCLUDE',
    INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
    INCONCLUSIVE_DATA_QUALITY: 'INCONCLUSIVE_DATA_QUALITY',
    INCONCLUSIVE_CONTRADICTION: 'INCONCLUSIVE_CONTRADICTION',

    // Limitations (bounded honesty)
    LIMITATION_MISSING_CHANNEL: 'LIMITATION_MISSING_CHANNEL',
    LIMITATION_SYNTHETIC_ONLY: 'LIMITATION_SYNTHETIC_ONLY',
    LIMITATION_UNCALIBRATED_INPUT: 'LIMITATION_UNCALIBRATED_INPUT',
    LIMITATION_HEURISTIC_ONLY: 'LIMITATION_HEURISTIC_ONLY',
    LIMITATION_SINGLE_LAP_SAMPLE: 'LIMITATION_SINGLE_LAP_SAMPLE',
    LIMITATION_NO_CONTROLLED_REPEAT: 'LIMITATION_NO_CONTROLLED_REPEAT',
    LIMITATION_SCOPE_SAME_SESSION_ONLY: 'LIMITATION_SCOPE_SAME_SESSION_ONLY',

    // Source identity (case / session / lap / source binding)
    SOURCE_IDENTITY_INVALID: 'SOURCE_IDENTITY_INVALID',
    SOURCE_IDENTITY_FORGED: 'SOURCE_IDENTITY_FORGED',
    SOURCE_IDENTITY_CASE_MISMATCH: 'SOURCE_IDENTITY_CASE_MISMATCH',
    SOURCE_IDENTITY_SESSION_MISMATCH: 'SOURCE_IDENTITY_SESSION_MISMATCH',
    SOURCE_IDENTITY_LAP_MISMATCH: 'SOURCE_IDENTITY_LAP_MISMATCH',
    SOURCE_IDENTITY_VERSION_MISSING: 'SOURCE_IDENTITY_VERSION_MISSING',

    // Engineer Brief composition
    BRIEF_INVALID: 'BRIEF_INVALID',
    BRIEF_CONTRADICTION_HIDDEN: 'BRIEF_CONTRADICTION_HIDDEN',
    BRIEF_LIMITATION_HIDDEN: 'BRIEF_LIMITATION_HIDDEN',
    BRIEF_CANNOT_CONCLUDE_HIDDEN: 'BRIEF_CANNOT_CONCLUDE_HIDDEN',
    BRIEF_AUTHORITY_FORGED: 'BRIEF_AUTHORITY_FORGED',

    // Structural / fail-closed
    INTERNAL_CONTRACT_VIOLATION: 'INTERNAL_CONTRACT_VIOLATION',
    UNSUPPORTED_FUTURE_SCHEMA: 'UNSUPPORTED_FUTURE_SCHEMA',
    PROTOTYPE_POLLUTION_REJECTED: 'PROTOTYPE_POLLUTION_REJECTED',
    NUMERIC_INVALID: 'NUMERIC_INVALID',
    BYTE_CAP_EXCEEDED: 'BYTE_CAP_EXCEEDED',
    ARRAY_CAP_EXCEEDED: 'ARRAY_CAP_EXCEEDED',
    GRAPH_CAP_EXCEEDED: 'GRAPH_CAP_EXCEEDED',
    UNKNOWN_OWN_KEY: 'UNKNOWN_OWN_KEY',
  });

  var ALL_REASON_CODES = Object.freeze(Object.keys(REASON_CODES).map(function (k) { return REASON_CODES[k]; }));

  // human-readable explanation HOOK — a stable i18n key per code (the consumer renders it; this is never prose).
  var EXPLANATION_KEYS = Object.freeze((function () {
    var m = {};
    ALL_REASON_CODES.forEach(function (c) { m[c] = 'r3_0d.reason.' + c.toLowerCase(); });
    return Object.freeze(m);
  })());

  function isReasonCode(c) { return typeof c === 'string' && Object.prototype.hasOwnProperty.call(EXPLANATION_KEYS, c); }
  function explanationKeyFor(c) { return isReasonCode(c) ? EXPLANATION_KEYS[c] : null; }

  // shared blocked-result factory (fail-closed). A blocked result NEVER carries a numeric / structured payload.
  function _normCodes(reasonCodes) {
    var arr = Array.isArray(reasonCodes) ? reasonCodes : (reasonCodes == null ? [] : [reasonCodes]);
    var seen = {}, out = [];
    arr.forEach(function (c) { if (isReasonCode(c) && !seen[c]) { seen[c] = true; out.push(c); } });
    if (out.length === 0) out.push(REASON_CODES.INTERNAL_CONTRACT_VIOLATION); // fail-closed: never an empty block
    return out;
  }
  function buildBlockedResult(reasonCodes, opts) {
    opts = opts || {};
    var codes = _normCodes(reasonCodes);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: Object.freeze(codes.slice()),
      explanationKeys: Object.freeze(codes.map(explanationKeyFor)),
      detail: (opts.detail != null) ? String(opts.detail).slice(0, 200) : null,
      result: null,
    });
  }

  // Codex D1 R2 Finding RN-06 closure: shared Proxy-rejection input cleanser. Every main validator
  // (validateSourceIdentity / validateEvidenceNodeShape / validateHypothesisShape /
  // validateRecommendationShape / validateEngineerBriefShape / validateDecisionInputShape) calls
  // _toCleanCopy AT ENTRY. The result is a plain-prototype deep clone — a Proxy whose ownKeys/get
  // traps lie about hidden state CANNOT survive: structuredClone enumerates via the engine's internal
  // [[OwnPropertyKeys]] + [[GetOwnProperty]] traps (same surface), but the resulting clone is a
  // PLAIN OBJECT whose own-property set is exactly what the Proxy reported. Downstream validators
  // operating on the clone therefore see EXACTLY what they validate — no parallel-universe hidden
  // properties remain reachable via direct property access on the original. structuredClone throw
  // (DataCloneError on functions / symbols-as-values / shared array buffers / etc.) → fail-closed.
  // JSON round-trip fallback when structuredClone unavailable: same posture but cannot preserve
  // certain shapes; fail-closed on any throw.
  function _toCleanCopy(v) {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    // Codex D1 R3 Finding RN-11 closure: NO JSON.stringify fallback. The previous fallback invoked
    // inherited toJSON() methods on class instances, silently dropped Symbol values + functions +
    // undefined, and could transform a hostile non-plain object into a validator-approved plain
    // shape. Modern runtimes (Node 17+, browsers ~2022+) have structuredClone built in; when it is
    // unavailable the contract fails closed (returns null → caller treats as "not a plain object").
    if (typeof structuredClone !== 'function') return null;
    try { return structuredClone(v); } catch (e) { return null; }
  }
  /**
   * _hasHiddenOwnKey(v) — detects Symbol-keyed OR non-enumerable own properties on the TOP-LEVEL
   * of v. structuredClone silently drops both, so without this check a value like { caseId: 'x',
   * [hostileSym]: payload } would clone to { caseId: 'x' } and pass validation. The pre-clone check
   * rejects such inputs at the boundary so the failure surface mirrors the Codex D1 R1 RN-01
   * recommended behaviour exactly. Throws (Proxy traps lying) → treat as hidden (fail closed).
   */
  function _hasHiddenOwnKey(v) {
    if (v === null || typeof v !== 'object') return false;
    try {
      if (typeof Object.getOwnPropertySymbols === 'function' && Object.getOwnPropertySymbols(v).length > 0) return true;
      var allKeys = Object.getOwnPropertyNames(v);
      var enumKeys = Object.keys(v);
      if (allKeys.length !== enumKeys.length) return true;
    } catch (e) { return true; }
    return false;
  }
  /**
   * _isOriginalPlainObject(v) — Codex D1 R4 Finding RN-11 closure: prototype check on the ORIGINAL
   * input BEFORE structuredClone runs. structuredClone happily converts an ordinary class instance
   * into a plain object copy (DataCloneError only on a narrower set: functions, Symbol values,
   * SharedArrayBuffer with shared:true, etc.), which means a class instance with valid own fields
   * + an inherited toJSON method could otherwise pass _isPlain AFTER cloning even though the
   * ORIGINAL was a class instance. Calling this check BEFORE toCleanCopy in each main validator
   * makes class instances fail-closed at the boundary regardless of their own-field shape.
   */
  function _isOriginalPlainObject(v) {
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return false;
    try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
    catch (e) { return false; }
  }
  /**
   * _hasNonPlainNestedObject(v, depth) — Codex D1 R5 Finding RN-11 (nested-level) closure:
   * recursively walks the ORIGINAL input pre-clone and returns true if ANY nested object (at any
   * depth, including inside arrays) has a prototype that is not Object.prototype / null / Array.
   * Catches class instances embedded as identity / confidence / observation / nested entry values.
   * Also rejects accessor descriptors at any level — a hostile getter at depth would otherwise be
   * invoked by structuredClone's [[Get]] semantics. Symbol keys are silently skipped here (the
   * top-level hasHiddenOwnKey already rejects them at the boundary; descending into Symbol-keyed
   * subtrees would itself invoke their getters). Depth cap 32 prevents pathological recursion.
   */
  function _hasNonPlainNestedObject(v, depth) {
    if (depth == null) depth = 0;
    if (depth > 32) return true;
    if (v === null || typeof v !== 'object') return false;
    var isArr = Array.isArray(v);
    // Codex D1 R6 Finding RN-11 (array subclass) closure: arrays must be EXACTLY Array.prototype-
    // proto. An `Array` subclass instance OR an array with a mutated prototype (Object.setPrototypeOf
    // applied) passes Array.isArray() but does NOT have the standard array prototype; reject those
    // with the same posture as a class instance.
    if (isArr) {
      try { var ap = Object.getPrototypeOf(v); if (ap !== Array.prototype) return true; }
      catch (e) { return true; }
    } else {
      try { var p = Object.getPrototypeOf(v); if (!(p === Object.prototype || p === null)) return true; }
      catch (e) { return true; }
    }
    try {
      var keys = Reflect.ownKeys(v);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof k === 'symbol') return true; // any nested symbol key — fail closed
        var d;
        try { d = Object.getOwnPropertyDescriptor(v, k); } catch (e) { return true; }
        if (!d) continue;
        if (typeof d.get === 'function' || typeof d.set === 'function') return true; // accessor descriptor
        if (_hasNonPlainNestedObject(d.value, depth + 1)) return true;
      }
    } catch (e) { return true; }
    return false;
  }

  var api = {
    REASON_CODES: REASON_CODES,
    ALL_REASON_CODES: ALL_REASON_CODES,
    EXPLANATION_KEYS: EXPLANATION_KEYS,
    isReasonCode: isReasonCode,
    explanationKeyFor: explanationKeyFor,
    buildBlockedResult: buildBlockedResult,
    toCleanCopy: _toCleanCopy,
    hasHiddenOwnKey: _hasHiddenOwnKey,
    isOriginalPlainObject: _isOriginalPlainObject,
    hasNonPlainNestedObject: _hasNonPlainNestedObject,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_ReasonCodes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
