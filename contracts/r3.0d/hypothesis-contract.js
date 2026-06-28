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
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R1 Finding RN-05 closure: ID-array elements MUST also pass the byte cap and the
  // grammar regex (same as the parent id). Otherwise an arbitrarily-long string can pad an id slot
  // before envelope validation. _isIdArray therefore takes the same id grammar + byte cap as the
  // owning shape.
  function _isIdArray(v, cap) {
    if (!Array.isArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) {
      var e = v[i];
      if (typeof e !== 'string' || e.length === 0) return false;
      if (HYPOTHESIS_ID_FORBIDDEN_RE.test(e) || !HYPOTHESIS_ID_RE.test(e)) return false;
      if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
    }
    return true;
  }
  // Codex D1 R2 Finding RN-08 closure: centralized normalization covering ALL Unicode dash characters.
  // Previous regex only covered U+2010–U+2015 (en-dash family) but missed U+2212 MINUS SIGN, U+FF0D
  // FULLWIDTH HYPHEN-MINUS, and the general \p{Pd} Dash_Punctuation category. _normalizeForOverclaim
  // is exported on the api so recommendation-contract + engineer-brief-contract use the SAME canonical
  // normalizer — no duplicated regex.
  // Dash character class: U+002D (-) ASCII hyphen-minus, U+2010–U+2015 (hyphen / non-breaking hyphen /
  // figure dash / en dash / em dash / horizontal bar), U+2212 (minus sign), U+FE58 (small em dash),
  // U+FE63 (small hyphen-minus), U+FF0D (fullwidth hyphen-minus), U+058A (Armenian hyphen),
  // U+05BE (Hebrew maqaf), U+1806 (Mongolian todo soft hyphen), U+1400 (Canadian hyphen), U+2E17
  // (double oblique hyphen), U+2E1A (hyphen with diaeresis), U+2E3A/B (two/three-em dash), U+2E40
  // (double hyphen), U+30A0 (Katakana-Hiragana double hyphen).
  // Explicit Unicode escapes to remove any ambiguity in the regex parser. Includes ASCII hyphen-minus
  // (U+002D), the U+2010..U+2015 dash family (HYPHEN / NON-BREAKING / FIGURE / EN / EM / HORIZONTAL),
  // U+2212 MINUS SIGN, U+FF0D FULLWIDTH HYPHEN-MINUS, U+FE58/63 SMALL EM/HYPHEN, U+058A Armenian,
  // U+05BE Hebrew MAQAF, U+1806 Mongolian SOFT HYPHEN, U+1400 Canadian, U+2E17 DOUBLE OBLIQUE,
  // U+2E1A HYPHEN-DIAERESIS, U+2E3A/B TWO/THREE EM DASH, U+2E40 DOUBLE HYPHEN, U+30A0 Kana double.
  var DASH_OR_WS_RE = /[\s-‐‑‒–—―−－﹘﹣֊־᠆᐀⸗⸚⸺⸻⹀゠]+/g;
  function _normalizeForOverclaim(s) {
    if (typeof s !== 'string') return '';
    return s.toLowerCase().replace(DASH_OR_WS_RE, '_');
  }
  function _hasCausalOverclaim(s) {
    if (typeof s !== 'string') return false;
    var normalized = _normalizeForOverclaim(s);
    for (var i = 0; i < CAUSAL_OVERCLAIM_TERMS.length; i++) {
      var t = _normalizeForOverclaim(CAUSAL_OVERCLAIM_TERMS[i]);
      if (normalized.indexOf(t) !== -1) return true;
    }
    return false;
  }

  /**
   * validateParamsShape(p) — closed key plain object, values ∈ { finite number, boolean, null, short
   * string }. Same posture as evidence-node observation params.
   */
  function validateParamsShape(p) {
    // RN-02 closure: outer try/catch. RN-01 closure: Reflect.ownKeys rejects Symbol-keyed extras.
    try {
      if (p === null || p === undefined) return Object.freeze({ valid: true });
      if (!_isPlain(p)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]);
      var keys; try { keys = Reflect.ownKeys(p); } catch (e) { return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID]); }
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof k === 'symbol') return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY]);
        var v = p[k];
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
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'params validator threw on hostile input' });
    }
  }

  /**
   * validateAlternativeExplanationShape(a) — closed-key plain object.
   */
  function validateAlternativeExplanationShape(a) {
    try {
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
    } catch (e) {
      return RC.buildBlockedResult([CODES.HYPOTHESIS_ALTERNATIVE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'alternative validator threw on hostile input' });
    }
  }

  /**
   * validateValidationActionShape(a) — closed-key plain object with kind ∈ VALIDATION_ACTION_KIND_ALLOWED.
   */
  function validateValidationActionShape(a) {
    try {
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
    } catch (e) {
      return RC.buildBlockedResult([CODES.VALIDATION_ACTION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'validation-action validator threw on hostile input' });
    }
  }

  /**
   * validateHypothesisShape(h) — D1 STRUCTURAL gate. Composes credibility, source-identity, params,
   * alternative-explanation, validation-action validators. Returns { valid:true } or buildBlockedResult.
   */
  function validateHypothesisShape(hIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'hypothesis prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'hypothesis carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(hIn)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'hypothesis contains a nested non-plain object (class instance laundered through identity / confidence / nested entries)' });
    var h = RC.toCleanCopy(hIn);
    if (!_isPlain(h)) return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'hypothesis not plain object (or proxy/non-cloneable rejected)' });
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
    // Codex D1 R2 Finding RN-09 closure: alternativeExplanationIds was the one remaining id-array that
    // bypassed _isIdArray's grammar + byte-cap check. Route through _isIdArray with ALTERNATIVE_ARRAY_CAP.
    if (!_isIdArray(h.alternativeExplanationIds, ALTERNATIVE_ARRAY_CAP)) reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID);
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
    // Codex D1 R2 RN-08 closure exports — recommendation-contract + engineer-brief-contract import
    // these so all three modules share the SAME canonical overclaim scanner. No module re-implements.
    hasCausalOverclaim: _hasCausalOverclaim,
    normalizeForOverclaim: _normalizeForOverclaim,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_HypothesisContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
