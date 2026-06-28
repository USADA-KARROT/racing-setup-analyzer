/**
 * contracts/r3.0d/engineer-brief-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the Engineer Brief OUTPUT SHAPE — the closed envelope the D4 ENGINEER_BRIEF service emits
 * and the D5 UI renders. D1 contract layer validates the SHAPE only:
 *   • closed key set
 *   • required fields present
 *   • bounded strings + arrays
 *   • no causal overclaim wording at the structural layer (D3 / Codex enforces semantic)
 *   • no contradictions / cannotConclude / limitations hidden (directive §10 D5 UI rules promoted
 *     to a contract assertion: every brief MUST surface contradictions[], limitations[], and
 *     cannotConcludeReasonCodes[] fields — omission triggers BRIEF_CONTRADICTION_HIDDEN /
 *     BRIEF_LIMITATION_HIDDEN / BRIEF_CANNOT_CONCLUDE_HIDDEN).
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerBriefContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  if (!RC || !CR || !SI || !HC) throw new Error('engineer-brief-contract.js requires reason-codes + credibility + source-identity + hypothesis');
  var CODES = RC.REASON_CODES;

  // Brief closed key set. Required-presence rules below.
  var BRIEF_KEYS = Object.freeze([
    'briefId',
    'identity',                    // SourceIdentity binding
    'primaryIssueI18nKey',
    'primaryIssueParams',
    'secondaryIssueI18nKey',       // optional — may be null
    'secondaryIssueParams',
    'evidenceSummary',             // array of { nodeId, i18nKey, params }
    'contradictions',              // array of { hypothesisId, contradictingEvidenceIds, i18nKey }
    'alternativeExplanations',     // array of { alternativeId, i18nKey }
    'cannotConcludeReasonCodes',   // array of reason codes
    'nextValidationAction',        // { actionId, kind, i18nKey } | null
    'driverExperimentI18nKey',     // optional — may be null
    'setupExperimentI18nKey',      // optional — may be null (requires qualified evidence; engine-checked)
    'confidence',                  // D1: { state: 'unresolved' | 'not_computed' } only
    'credibility',                 // CONCLUSION_CREDIBILITY enum
    'provenance',                  // PROVENANCE enum
    'limitations',                 // array of LIMITATION_* reason codes
    'schemaVersion',
  ]);

  // Mandatory-presence rule (directive §10 D5 UI invariants promoted to contract):
  //   contradictions, alternativeExplanations, cannotConcludeReasonCodes, limitations — even if
  //   empty arrays, the keys MUST be present. Omitting any of them triggers the corresponding
  //   BRIEF_*_HIDDEN code. This makes "hidden contradiction" a contract-level violation, not just
  //   a code-review observation.
  var MANDATORY_PRESENCE_KEYS = Object.freeze([
    { key: 'contradictions', missingCode: CODES.BRIEF_CONTRADICTION_HIDDEN },
    { key: 'alternativeExplanations', missingCode: CODES.BRIEF_INVALID },
    { key: 'cannotConcludeReasonCodes', missingCode: CODES.BRIEF_CANNOT_CONCLUDE_HIDDEN },
    { key: 'limitations', missingCode: CODES.BRIEF_LIMITATION_HIDDEN },
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;
  var ARRAY_CAP = 32;
  var STRING_BYTE_CAP = 512;
  var ENVELOPE_BYTE_CAP = 64 * 1024; // 64 KiB — UI surface, small

  var BRIEF_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var BRIEF_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Object.keys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) if (allowed.indexOf(keys[i]) === -1) return false; return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  function _hasCausalOverclaim(s) { if (typeof s !== 'string') return false; var lower = s.toLowerCase(); for (var i = 0; i < HC.CAUSAL_OVERCLAIM_TERMS.length; i++) if (lower.indexOf(HC.CAUSAL_OVERCLAIM_TERMS[i]) !== -1) return true; return false; }
  function _checkI18nKey(v, reasons) {
    if (!_nonEmptyStr(v)) { reasons.push(CODES.BRIEF_INVALID); return; }
    if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    if (_hasCausalOverclaim(v)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
  }

  /**
   * validateEngineerBriefShape(b) — D1 STRUCTURAL gate.
   */
  function validateEngineerBriefShape(b) {
    try {
    if (!_isPlain(b)) return RC.buildBlockedResult([CODES.BRIEF_INVALID], { detail: 'brief not plain object' });
    if (!_hasOnlyAllowedKeys(b, BRIEF_KEYS)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(b.schemaVersion)) reasons.push(CODES.BRIEF_INVALID);
    else if (b.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (b.schemaVersion < 1) reasons.push(CODES.BRIEF_INVALID);

    if (!_nonEmptyStr(b.briefId) || BRIEF_ID_FORBIDDEN_RE.test(b.briefId) || !BRIEF_ID_RE.test(b.briefId)) reasons.push(CODES.BRIEF_INVALID);

    var idCheck = SI.validateSourceIdentity(b.identity);
    if (idCheck.valid !== true) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    _checkI18nKey(b.primaryIssueI18nKey, reasons);
    if ('primaryIssueParams' in b) {
      var pp = HC.validateParamsShape(b.primaryIssueParams);
      if (pp.valid !== true) reasons.push.apply(reasons, pp.reasonCodes || [CODES.BRIEF_INVALID]);
    }
    if ('secondaryIssueI18nKey' in b && b.secondaryIssueI18nKey !== null) _checkI18nKey(b.secondaryIssueI18nKey, reasons);
    if ('secondaryIssueParams' in b && b.secondaryIssueParams !== null) {
      var sp = HC.validateParamsShape(b.secondaryIssueParams);
      if (sp.valid !== true) reasons.push.apply(reasons, sp.reasonCodes || [CODES.BRIEF_INVALID]);
    }

    // Mandatory-presence keys
    MANDATORY_PRESENCE_KEYS.forEach(function (rule) {
      if (!(rule.key in b)) reasons.push(rule.missingCode);
      else if (!Array.isArray(b[rule.key])) reasons.push(rule.missingCode);
      else if (b[rule.key].length > ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    });

    // contradictions, alternativeExplanations entries — each is { id, i18nKey, params? }-like shape
    function _checkEntries(arr, idKey, missingCode) {
      if (!Array.isArray(arr)) return;
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        if (!_isPlain(e)) { reasons.push(missingCode); break; }
        if (!_nonEmptyStr(e[idKey])) { reasons.push(missingCode); break; }
        if (!_nonEmptyStr(e.i18nKey)) { reasons.push(missingCode); break; }
        if (_utf8Bytes(e.i18nKey) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
        if (_hasCausalOverclaim(e.i18nKey)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
      }
    }
    _checkEntries(b.evidenceSummary || [], 'nodeId', CODES.BRIEF_INVALID);
    _checkEntries(b.contradictions || [], 'hypothesisId', CODES.BRIEF_CONTRADICTION_HIDDEN);
    _checkEntries(b.alternativeExplanations || [], 'alternativeId', CODES.BRIEF_INVALID);

    // cannotConcludeReasonCodes + limitations — each entry MUST be a known reason code
    if (Array.isArray(b.cannotConcludeReasonCodes)) for (var ci = 0; ci < b.cannotConcludeReasonCodes.length; ci++) if (!RC.isReasonCode(b.cannotConcludeReasonCodes[ci])) { reasons.push(CODES.BRIEF_INVALID); break; }
    if (Array.isArray(b.limitations)) for (var li = 0; li < b.limitations.length; li++) if (!RC.isReasonCode(b.limitations[li])) { reasons.push(CODES.BRIEF_INVALID); break; }

    // nextValidationAction
    if ('nextValidationAction' in b && b.nextValidationAction !== null) {
      var va = HC.validateValidationActionShape(b.nextValidationAction);
      if (va.valid !== true) reasons.push.apply(reasons, va.reasonCodes || [CODES.VALIDATION_ACTION_INVALID]);
    }

    // driverExperiment / setupExperiment i18nKey — optional. setupExperiment requires
    // qualified evidence (engine-checked at D4); D1 only verifies the SHAPE.
    if ('driverExperimentI18nKey' in b && b.driverExperimentI18nKey !== null) _checkI18nKey(b.driverExperimentI18nKey, reasons);
    if ('setupExperimentI18nKey' in b && b.setupExperimentI18nKey !== null) _checkI18nKey(b.setupExperimentI18nKey, reasons);

    // Confidence — caller cannot supply numeric.
    var cfCheck = CR.validateConfidenceShape(b.confidence);
    if (cfCheck.valid !== true) reasons.push(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN);

    if (CR.CONCLUSION_CREDIBILITY.indexOf(b.credibility) === -1) reasons.push(CODES.BRIEF_INVALID);
    if (CR.PROVENANCE.indexOf(b.provenance) === -1) reasons.push(CODES.EVIDENCE_PROVENANCE_INVALID);

    // Envelope byte cap
    try {
      var serialized = JSON.stringify(b);
      var bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(serialized).length : Buffer.byteLength(serialized, 'utf8');
      if (bytes > ENVELOPE_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    } catch (e) { reasons.push(CODES.BRIEF_INVALID); }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }
    return Object.freeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'brief validator threw on hostile input' });
    }
  }

  var api = {
    BRIEF_KEYS: BRIEF_KEYS,
    MANDATORY_PRESENCE_KEYS: MANDATORY_PRESENCE_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    ARRAY_CAP: ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    validateEngineerBriefShape: validateEngineerBriefShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EngineerBriefContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
