/**
 * contracts/r3.0d/recommendation-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines Recommendation + Priority SHAPES. The Priority enum is FIXED ORDER per directive §10:
 *   1. data_quality
 *   2. mapping_calibration
 *   3. controlled_repeat_lap
 *   4. driver_experiment
 *   5. setup_experiment
 * Any caller-supplied priority key out of this order at the engine layer triggers
 * RECOMMENDATION_PRIORITY_OUT_OF_ORDER. The D1 contract enforces the closed enum at the SHAPE layer;
 * the D4 Priority Engine enforces the ordering at the engine layer.
 *
 * Auto-tuning rejection (directive §10 "禁止"): any recommendation that proposes an automatic apply
 * (auto_setup / auto_calibration / auto_preset_modification / auto_tuning) at this layer is rejected.
 *
 * UMD: Node require / Electron renderer global (R3_0D_RecommendationContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  if (!RC || !CR || !SI || !HC) throw new Error('recommendation-contract.js requires reason-codes + credibility + source-identity + hypothesis');
  var CODES = RC.REASON_CODES;

  // Fixed priority ladder. The number is the DETERMINISTIC ordering — never reorderable by caller.
  var PRIORITY_LADDER = Object.freeze([
    { rank: 1, key: 'data_quality' },
    { rank: 2, key: 'mapping_calibration' },
    { rank: 3, key: 'controlled_repeat_lap' },
    { rank: 4, key: 'driver_experiment' },
    { rank: 5, key: 'setup_experiment' },
  ]);
  var PRIORITY_KEY_RANK = Object.freeze((function () { var m = {}; PRIORITY_LADDER.forEach(function (p) { m[p.key] = p.rank; }); return m; })());
  var PRIORITY_KEYS = Object.freeze(PRIORITY_LADDER.map(function (p) { return p.key; }));

  // Apply-mode enum. ONLY 'driver_action' and 'user_initiated' are allowed at D1. Any auto_* value is
  // rejected with the appropriate AUTO_*_FORBIDDEN code.
  var APPLY_MODE_ALLOWED = Object.freeze(['driver_action', 'user_initiated']);
  var APPLY_MODE_FORBIDDEN = Object.freeze({
    'auto_tuning': CODES.RECOMMENDATION_AUTO_TUNING_FORBIDDEN,
    'auto_setup': CODES.RECOMMENDATION_AUTO_SETUP_FORBIDDEN,
    'auto_calibration': CODES.RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN,
    'auto_preset': CODES.RECOMMENDATION_AUTO_PRESET_FORBIDDEN,
  });

  // Recommendation closed key set.
  var RECOMMENDATION_KEYS = Object.freeze([
    'recommendationId',
    'priorityKey',
    'identity',                    // SourceIdentity
    'hypothesisId',                // backlink to the hypothesis this recommendation acts on
    'i18nKey',                     // display text key
    'params',
    'applyMode',                   // 'driver_action' | 'user_initiated' (no auto_*)
    'whyNowI18nKey',
    'expectedObservationI18nKey',
    'stopConditionI18nKey',
    'rollbackConditionI18nKey',
    'blockingPrerequisiteIds',     // array of validation-action ids that MUST complete first
    'limitations',
    'schemaVersion',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ID_ARRAY_CAP = 32;
  var LIMITATION_ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var REC_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var REC_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R1 Finding RN-05 closure: ID-array elements MUST pass byte cap + id grammar.
  function _isIdArray(v, cap) {
    if (!Array.isArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) {
      var e = v[i];
      if (typeof e !== 'string' || e.length === 0) return false;
      if (REC_ID_FORBIDDEN_RE.test(e) || !REC_ID_RE.test(e)) return false;
      if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
    }
    return true;
  }

  /**
   * validatePriorityKey(k) — must be one of PRIORITY_KEYS. Returns { valid:true, rank } or blocked.
   */
  function validatePriorityKey(k) {
    try {
      if (typeof k !== 'string' || PRIORITY_KEY_RANK[k] === undefined) return RC.buildBlockedResult([CODES.RECOMMENDATION_PRIORITY_INVALID]);
      return Object.freeze({ valid: true, rank: PRIORITY_KEY_RANK[k] });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_PRIORITY_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateApplyMode(m) — strict whitelist; forbidden auto_* values map to their specific reason.
   */
  function validateApplyMode(m) {
    try {
      if (typeof m !== 'string') return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID]);
      if (APPLY_MODE_FORBIDDEN[m]) return RC.buildBlockedResult([APPLY_MODE_FORBIDDEN[m]]);
      if (APPLY_MODE_ALLOWED.indexOf(m) === -1) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID]);
      return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * validateRecommendationShape(r) — D1 STRUCTURAL gate.
   *
   * Additional D1 rule: a setup_experiment recommendation requires the linked hypothesis to be at
   * least 'Derived' credibility (the contract layer does NOT have hypothesis lookups — it only
   * checks the SHAPE; the engine layer at D4 performs the credibility join).
   */
  function validateRecommendationShape(rIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'recommendation prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'recommendation carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(rIn)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'recommendation contains a nested non-plain object' });
    var r = RC.toCleanCopy(rIn);
    if (!_isPlain(r)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID], { detail: 'recommendation not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(r, RECOMMENDATION_KEYS)) return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(r.schemaVersion)) reasons.push(CODES.RECOMMENDATION_INVALID);
    else if (r.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (r.schemaVersion < 1) reasons.push(CODES.RECOMMENDATION_INVALID);

    if (!_nonEmptyStr(r.recommendationId)) reasons.push(CODES.RECOMMENDATION_INVALID);
    else if (REC_ID_FORBIDDEN_RE.test(r.recommendationId) || !REC_ID_RE.test(r.recommendationId)) reasons.push(CODES.RECOMMENDATION_INVALID);

    var pk = validatePriorityKey(r.priorityKey);
    if (pk.valid !== true) reasons.push(CODES.RECOMMENDATION_PRIORITY_INVALID);

    var idCheck = SI.validateSourceIdentity(r.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    if (!_nonEmptyStr(r.hypothesisId)) reasons.push(CODES.RECOMMENDATION_INVALID);

    ['i18nKey', 'whyNowI18nKey', 'expectedObservationI18nKey', 'stopConditionI18nKey', 'rollbackConditionI18nKey'].forEach(function (k) {
      var v = r[k];
      if (!_nonEmptyStr(v)) { reasons.push(CODES.RECOMMENDATION_INVALID); return; }
      if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      // Codex D1 R2 RN-08 closure: use HC.hasCausalOverclaim (centralized normalizing scanner that
      // collapses ALL Unicode dash characters + whitespace runs to underscore). Catches DRIVER-FAULT,
      // guaranteed-fix-recommended, exact−cause (U+2212), exact—cause (em-dash), GUARANTEED FIX.
      if (HC.hasCausalOverclaim(v)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
    });

    if ('params' in r) {
      var pc = HC.validateParamsShape(r.params);
      if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [CODES.RECOMMENDATION_INVALID]);
    }

    var amCheck = validateApplyMode(r.applyMode);
    if (amCheck.valid !== true) reasons.push.apply(reasons, amCheck.reasonCodes || [CODES.RECOMMENDATION_INVALID]);

    if (!_isIdArray(r.blockingPrerequisiteIds, ID_ARRAY_CAP)) reasons.push(CODES.RECOMMENDATION_INVALID);
    if (!Array.isArray(r.limitations) || r.limitations.length > LIMITATION_ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var li = 0; li < r.limitations.length; li++) if (!RC.isReasonCode(r.limitations[li])) { reasons.push(CODES.RECOMMENDATION_INVALID); break; }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true, rank: pk.rank });
    } catch (e) {
      return RC.buildBlockedResult([CODES.RECOMMENDATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'recommendation validator threw on hostile input' });
    }
  }

  var api = {
    PRIORITY_LADDER: PRIORITY_LADDER,
    PRIORITY_KEYS: PRIORITY_KEYS,
    PRIORITY_KEY_RANK: PRIORITY_KEY_RANK,
    APPLY_MODE_ALLOWED: APPLY_MODE_ALLOWED,
    APPLY_MODE_FORBIDDEN: APPLY_MODE_FORBIDDEN,
    RECOMMENDATION_KEYS: RECOMMENDATION_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    validatePriorityKey: validatePriorityKey,
    validateApplyMode: validateApplyMode,
    validateRecommendationShape: validateRecommendationShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_RecommendationContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
