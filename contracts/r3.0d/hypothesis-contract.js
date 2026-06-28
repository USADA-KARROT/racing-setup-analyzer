/**
 * contracts/r3.0d/hypothesis-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines Hypothesis + Contradiction + AlternativeExplanation + CannotConclude + Limitation +
 * ValidationAction SHAPES. The D1 contract layer enforces the structural reasoning discipline that
 * directive §8 mandates:
 *   • supportingEvidenceIds      — required
 *   • contradictingEvidenceIds   — required
 *   • alternativeExplanationIds  — required
 *   • cannotConcludeReasonCodes  — required
 *   • limitations                — required
 *   • validationActionIds        — required
 * A Hypothesis that omits ANY of these (even with an empty array) → HYPOTHESIS_INVALID. Free-text
 * causal authority is rejected as a structural posture, not a style preference. The hypothesis MUST
 * carry an i18nKey for any narrative; free-form prose at the authority layer is forbidden.
 *
 * Causal overclaim rejection (directive §8 "禁止輸出"):
 *   • exact_cause, driver_fault, setup_caused_loss, guaranteed_fix, professional_diagnosis,
 *     fastest_setup, theoretical_best — any of these strings appearing in i18nKey OR any param
 *     value triggers HYPOTHESIS_CAUSAL_OVERCLAIM. D1 catches the lexical surface; D3 adds semantic
 *     analysis.
 *
 * Confidence: D1 forbids any numeric confidence on a Hypothesis. The hypothesis's confidence field
 * MUST be { state: 'unresolved' | 'not_computed' } only — D3 produces the numeric value.
 *
 * UMD: Node require / Electron renderer global (R3_0D_HypothesisContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  if (!RC || !CR || !SI) throw new Error('hypothesis-contract.js requires reason-codes + credibility + source-identity');
  var CODES = RC.REASON_CODES;

  // Hypothesis category — must match Evidence categories (each hypothesis is about one category). New
  // categories require an evidence-node-contract update first; mirror keeps drift impossible.
  var HYPOTHESIS_CATEGORIES = Object.freeze(['data_quality', 'mapping_calibration', 'driver_behaviour', 'vehicle_response', 'setup_model', 'unknown']);

  // Closed key set.
  var HYPOTHESIS_KEYS = Object.freeze([
    'hypothesisId',
    'category',
    'identity',                    // SourceIdentity binding
    'i18nKey',                     // the i18n hook for the hypothesis's display text (NO free-form prose)
    'params',                      // optional plain-object params for the i18n template
    'credibility',                 // CONCLUSION_CREDIBILITY (e.g., Heuristic until D3 upgrades)
    'confidence',                  // D1: { state: 'unresolved' | 'not_computed' } only
    'supportingEvidenceIds',
    'contradictingEvidenceIds',
    'alternativeExplanationIds',
    'cannotConcludeReasonCodes',
    'limitations',
    'validationActionIds',
    'schemaVersion',
  ]);

  // ContextExplanation closed key set.
  var ALTERNATIVE_EXPLANATION_KEYS = Object.freeze(['alternativeId', 'i18nKey', 'params', 'supportingEvidenceIds']);

  // ValidationAction closed key set. Directive §8 + §10 (Priority Engine) fixes the kind enum.
  var VALIDATION_ACTION_KEYS = Object.freeze(['actionId', 'kind', 'i18nKey', 'params', 'requiresControlledVariables', 'expectedObservationI18nKey']);
  var VALIDATION_ACTION_KIND_ALLOWED = Object.freeze([
    'fix_data_quality',
    'recalibrate_channel',
    'controlled_repeat_lap',
    'driver_experiment',
    'setup_experiment',
    'collect_additional_session',
    'collect_additional_lap',
    'no_action_required',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;

  // Caps — generous but bounded.
  var ID_ARRAY_CAP = 64;
  var ALTERNATIVE_ARRAY_CAP = 16;
  var LIMITATION_ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var PARAMS_VALUE_BYTE_CAP = 256;
  var HYPOTHESIS_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var HYPOTHESIS_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  // Causal-overclaim lexical guard. D1 rejects these substrings anywhere in i18nKey or any string
  // param value. The list is INTENTIONALLY SMALL — D1 catches the lexical surface; D3 / Codex catch
  // the semantic surface. False positives are acceptable here (a contract layer prefers fail-closed).
  var CAUSAL_OVERCLAIM_TERMS = Object.freeze([
    'exact_cause', 'exact cause',
    'driver_fault', 'driver fault', 'driver_blame', 'driver blame',
    'setup_caused', 'setup caused', 'setup_caused_loss',
    'guaranteed_fix', 'guaranteed fix', 'guarantees',
    'professional_diagnosis', 'professional diagnosis',
    'fastest_setup', 'fastest setup',
    'theoretical_best', 'theoretical best',
  ]);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Object.keys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) if (allowed.indexOf(keys[i]) === -1) return false; return true; }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  function _isIdArray(v, cap) { if (!Array.isArray(v) || v.length > cap) return false; for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string' || v[i].length === 0) return false; return true; }
  function _hasCausalOverclaim(s) { if (typeof s !== 'string') return false; var lower = s.toLowerCase(); for (var i = 0; i < CAUSAL_OVERCLAIM_TERMS.length; i++) if (lower.indexOf(CAUSAL_OVERCLAIM_TERMS[i]) !== -1) return true; return false; }

  /**
   * validateParamsShape(p) — closed key plain object, values ∈ { finite number, boolean, null, short
   * string }. Same posture as evidence-node observation params.
   */
  function validateParamsShape(p) {
    if (p === null || p === undefined) return Object.freeze({ valid: true });
    if (!_isPlain(p)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]);
    var keys; try { keys = Object.keys(p); } catch (e) { return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]); }
    for (var i = 0; i < keys.length; i++) {
      var v = p[keys[i]];
      if (v === null || typeof v === 'boolean') continue;
      if (typeof v === 'number') { if (!_isFiniteNum(v)) return RC.buildBlockedResult([CODES.NUMERIC_INVALID]); continue; }
      if (typeof v === 'string') {
        if (_utf8Bytes(v) > PARAMS_VALUE_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
        if (_hasCausalOverclaim(v)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
        continue;
      }
      return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]);
    }
    return Object.freeze({ valid: true });
  }

  /**
   * validateAlternativeExplanationShape(a) — closed-key plain object.
   */
  function validateAlternativeExplanationShape(a) {
    if (!_isPlain(a)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (!_hasOnlyAllowedKeys(a, ALTERNATIVE_EXPLANATION_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (!_nonEmptyStr(a.alternativeId) || HYPOTHESIS_ID_FORBIDDEN_RE.test(a.alternativeId) || !HYPOTHESIS_ID_RE.test(a.alternativeId)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (!_nonEmptyStr(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID]);
    if (_utf8Bytes(a.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if (_hasCausalOverclaim(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    var pc = validateParamsShape('params' in a ? a.params : null);
    if (pc.valid !== true) return pc;
    if ('supportingEvidenceIds' in a) {
      if (!_isIdArray(a.supportingEvidenceIds, ID_ARRAY_CAP)) return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.ARRAY_CAP_EXCEEDED]);
    }
    return Object.freeze({ valid: true });
  }

  /**
   * validateValidationActionShape(a) — closed-key plain object with kind ∈ VALIDATION_ACTION_KIND_ALLOWED.
   */
  function validateValidationActionShape(a) {
    if (!_isPlain(a)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (!_hasOnlyAllowedKeys(a, VALIDATION_ACTION_KEYS)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (!_nonEmptyStr(a.actionId) || HYPOTHESIS_ID_FORBIDDEN_RE.test(a.actionId) || !HYPOTHESIS_ID_RE.test(a.actionId)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (VALIDATION_ACTION_KIND_ALLOWED.indexOf(a.kind) === -1) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_UNKNOWN_KIND]);
    if (!_nonEmptyStr(a.i18nKey)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    if (_utf8Bytes(a.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if (_hasCausalOverclaim(a.i18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    if ('params' in a) { var pc = validateParamsShape(a.params); if (pc.valid !== true) return pc; }
    if ('requiresControlledVariables' in a) {
      if (a.requiresControlledVariables !== true && a.requiresControlledVariables !== false) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
    }
    if ('expectedObservationI18nKey' in a && a.expectedObservationI18nKey !== null) {
      if (!_nonEmptyStr(a.expectedObservationI18nKey)) return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID]);
      if (_utf8Bytes(a.expectedObservationI18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
      if (_hasCausalOverclaim(a.expectedObservationI18nKey)) return RC.buildBlockedResult([CODES.HYPOTHESIS_CAUSAL_OVERCLAIM]);
    }
    return Object.freeze({ valid: true });
  }

  /**
   * validateHypothesisShape(h) — D1 STRUCTURAL gate. Composes credibility, source-identity, params,
   * alternative-explanation, validation-action validators. Returns { valid:true } or buildBlockedResult.
   */
  function validateHypothesisShape(h) {
    try {
    if (!_isPlain(h)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'hypothesis not plain object' });
    if (!_hasOnlyAllowedKeys(h, HYPOTHESIS_KEYS)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(h.schemaVersion)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else if (h.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (h.schemaVersion < 1) reasons.push(CODES.HYPOTHESIS_INVALID);

    if (!_nonEmptyStr(h.hypothesisId)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else if (HYPOTHESIS_ID_FORBIDDEN_RE.test(h.hypothesisId) || !HYPOTHESIS_ID_RE.test(h.hypothesisId)) reasons.push(CODES.HYPOTHESIS_INVALID);

    if (HYPOTHESIS_CATEGORIES.indexOf(h.category) === -1) reasons.push(CODES.HYPOTHESIS_CATEGORY_UNKNOWN);

    var idCheck = SI.validateSourceIdentity(h.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    if (!_nonEmptyStr(h.i18nKey)) reasons.push(CODES.HYPOTHESIS_INVALID);
    else {
      if (_utf8Bytes(h.i18nKey) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (_hasCausalOverclaim(h.i18nKey)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
    }

    var pc = validateParamsShape('params' in h ? h.params : null);
    if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [CODES.HYPOTHESIS_INVALID]);

    // Credibility — uses CONCLUSION_CREDIBILITY ladder (not EVIDENCE_CREDIBILITY). A heuristic
    // conclusion MUST declare LIMITATION_HEURISTIC_ONLY.
    if (CR.CONCLUSION_CREDIBILITY.indexOf(h.credibility) === -1) reasons.push(CODES.HYPOTHESIS_INVALID);

    // Confidence — caller cannot supply numeric.
    var cfCheck = CR.validateConfidenceShape(h.confidence);
    if (cfCheck.valid !== true) reasons.push(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN);

    // Each evidence/alt/validation array MUST be present (even if empty). Directive §8: structured
    // reasoning output requires all six slots — omission is itself a hypothesis-structure violation.
    if (!_isIdArray(h.supportingEvidenceIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID);
    if (!_isIdArray(h.contradictingEvidenceIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_CONTRADICTION_INVALID);
    if (!Array.isArray(h.alternativeExplanationIds) || h.alternativeExplanationIds.length > ALTERNATIVE_ARRAY_CAP) reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID);
    else for (var ai = 0; ai < h.alternativeExplanationIds.length; ai++) if (typeof h.alternativeExplanationIds[ai] !== 'string' || h.alternativeExplanationIds[ai].length === 0) { reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID); break; }
    if (!Array.isArray(h.cannotConcludeReasonCodes) || h.cannotConcludeReasonCodes.length > ID_ARRAY_CAP) reasons.push(CODES.HYPOTHESIS_INVALID);
    else for (var ci = 0; ci < h.cannotConcludeReasonCodes.length; ci++) if (!RC.isReasonCode(h.cannotConcludeReasonCodes[ci])) { reasons.push(CODES.HYPOTHESIS_INVALID); break; }
    if (!Array.isArray(h.limitations) || h.limitations.length > LIMITATION_ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var li = 0; li < h.limitations.length; li++) if (!RC.isReasonCode(h.limitations[li])) { reasons.push(CODES.HYPOTHESIS_INVALID); break; }
    if (!_isIdArray(h.validationActionIds, ID_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_INVALID);

    // Heuristic conclusion MUST declare LIMITATION_HEURISTIC_ONLY.
    if (h.credibility === 'Heuristic') {
      var lims = Array.isArray(h.limitations) ? h.limitations : [];
      if (lims.indexOf(CODES.LIMITATION_HEURISTIC_ONLY) === -1) reasons.push(CODES.LIMITATION_HEURISTIC_ONLY);
    }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'hypothesis validator threw on hostile input' });
    }
  }

  var api = {
    HYPOTHESIS_CATEGORIES: HYPOTHESIS_CATEGORIES,
    HYPOTHESIS_KEYS: HYPOTHESIS_KEYS,
    ALTERNATIVE_EXPLANATION_KEYS: ALTERNATIVE_EXPLANATION_KEYS,
    VALIDATION_ACTION_KEYS: VALIDATION_ACTION_KEYS,
    VALIDATION_ACTION_KIND_ALLOWED: VALIDATION_ACTION_KIND_ALLOWED,
    CAUSAL_OVERCLAIM_TERMS: CAUSAL_OVERCLAIM_TERMS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    ID_ARRAY_CAP: ID_ARRAY_CAP,
    ALTERNATIVE_ARRAY_CAP: ALTERNATIVE_ARRAY_CAP,
    LIMITATION_ARRAY_CAP: LIMITATION_ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    PARAMS_VALUE_BYTE_CAP: PARAMS_VALUE_BYTE_CAP,
    validateParamsShape: validateParamsShape,
    validateAlternativeExplanationShape: validateAlternativeExplanationShape,
    validateValidationActionShape: validateValidationActionShape,
    validateHypothesisShape: validateHypothesisShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_HypothesisContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
