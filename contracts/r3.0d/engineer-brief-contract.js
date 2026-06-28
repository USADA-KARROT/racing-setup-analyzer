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
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }
  function _utf8Bytes(s) { try { return (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8'); } catch (e) { return (typeof s === 'string') ? s.length * 4 : 0; } }
  // Codex D1 R2 Finding RN-08 closure: use HC.hasCausalOverclaim (centralized normalizing scanner).
  function _hasCausalOverclaim(s) { return HC.hasCausalOverclaim(s); }
  function _checkI18nKey(v, reasons) {
    if (!_nonEmptyStr(v)) { reasons.push(CODES.BRIEF_INVALID); return; }
    if (_utf8Bytes(v) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
    if (_hasCausalOverclaim(v)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
  }

  /**
   * validateEngineerBriefShape(b) — D1 STRUCTURAL gate.
   */
  function validateEngineerBriefShape(bIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'brief prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'brief carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(bIn)) return RC.buildBlockedResult([CODES.BRIEF_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'brief contains a nested non-plain object' });
    var b = RC.toCleanCopy(bIn);
    if (!_isPlain(b)) return RC.buildBlockedResult([CODES.BRIEF_INVALID], { detail: 'brief not plain object (or proxy/non-cloneable rejected)' });
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

    // Codex D1 R1 Finding RN-04 closure: each nested entry is a CLOSED-key shape with its own
    // validator. Extra own keys → BRIEF_INVALID + UNKNOWN_OWN_KEY. Contradiction entries also
    // validate contradictingEvidenceIds (id array with grammar + byte cap). Nested params validated.
    var EVIDENCE_SUMMARY_KEYS = ['nodeId', 'i18nKey', 'params'];
    var CONTRADICTION_KEYS = ['hypothesisId', 'contradictingEvidenceIds', 'i18nKey', 'params'];
    var ALT_ENTRY_KEYS = ['alternativeId', 'i18nKey', 'params'];
    function _checkBriefIdArray(v, cap) {
      if (!Array.isArray(v) || v.length > cap) return false;
      for (var i = 0; i < v.length; i++) {
        var e = v[i];
        if (typeof e !== 'string' || e.length === 0) return false;
        if (BRIEF_ID_FORBIDDEN_RE.test(e) || !BRIEF_ID_RE.test(e)) return false;
        if (_utf8Bytes(e) > STRING_BYTE_CAP) return false;
      }
      return true;
    }
    function _checkEntry(entry, allowedKeys, idKey, missingCode, requireContradictingEvidence) {
      if (!_isPlain(entry)) { reasons.push(missingCode); return; }
      if (!_hasOnlyAllowedKeys(entry, allowedKeys)) { reasons.push(missingCode); reasons.push(CODES.UNKNOWN_OWN_KEY); return; }
      if (!_nonEmptyStr(entry[idKey])) { reasons.push(missingCode); return; }
      if (BRIEF_ID_FORBIDDEN_RE.test(entry[idKey]) || !BRIEF_ID_RE.test(entry[idKey])) { reasons.push(missingCode); return; }
      if (_utf8Bytes(entry[idKey]) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (!_nonEmptyStr(entry.i18nKey)) { reasons.push(missingCode); return; }
      if (_utf8Bytes(entry.i18nKey) > STRING_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      if (_hasCausalOverclaim(entry.i18nKey)) reasons.push(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM);
      if ('params' in entry) {
        var pc = HC.validateParamsShape(entry.params);
        if (pc.valid !== true) reasons.push.apply(reasons, pc.reasonCodes || [missingCode]);
      }
      if (requireContradictingEvidence) {
        if (!_checkBriefIdArray(entry.contradictingEvidenceIds, ARRAY_CAP)) reasons.push(CODES.BRIEF_CONTRADICTION_HIDDEN);
      }
    }
    // Codex D1 R2 Finding RN-10 closure: every entry-collection MUST be an array with bounded length
    // BEFORE entry iteration runs. A non-array evidenceSummary previously skipped entry validation
    // entirely; now it triggers BRIEF_INVALID. contradictions / alternativeExplanations are mandatory-
    // presence keys already caught above; evidenceSummary is also enforced here.
    if (!Array.isArray(b.evidenceSummary)) reasons.push(CODES.BRIEF_INVALID);
    else if (b.evidenceSummary.length > ARRAY_CAP) reasons.push(CODES.ARRAY_CAP_EXCEEDED);
    else for (var ei = 0; ei < b.evidenceSummary.length; ei++) _checkEntry(b.evidenceSummary[ei], EVIDENCE_SUMMARY_KEYS, 'nodeId', CODES.BRIEF_INVALID, false);
    if (Array.isArray(b.contradictions)) for (var coi = 0; coi < b.contradictions.length; coi++) _checkEntry(b.contradictions[coi], CONTRADICTION_KEYS, 'hypothesisId', CODES.BRIEF_CONTRADICTION_HIDDEN, true);
    if (Array.isArray(b.alternativeExplanations)) for (var ali = 0; ali < b.alternativeExplanations.length; ali++) _checkEntry(b.alternativeExplanations[ali], ALT_ENTRY_KEYS, 'alternativeId', CODES.BRIEF_INVALID, false);

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
