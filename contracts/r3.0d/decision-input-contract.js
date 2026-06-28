/**
 * contracts/r3.0d/decision-input-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Composes evidence-node + hypothesis + recommendation contracts into the input SHAPE the future
 * D3 PRIORITY_ENGINE and D4 ENGINEER_BRIEF services will accept. D1 does NOT implement the engines —
 * it ONLY validates that a caller-supplied decision input has the closed shape every downstream
 * deterministic engine can safely read.
 *
 * Cross-shape invariants D1 enforces:
 *   • every supportingEvidenceId on every hypothesis references an evidence node present in the
 *     input.nodes array (no orphans at the input layer);
 *   • every contradictingEvidenceId same;
 *   • every alternativeExplanationId references one of the input.alternativeExplanations entries;
 *   • every validationActionId on every hypothesis references one of the input.validationActions
 *     entries;
 *   • every hypothesisId referenced by a recommendation exists in the input.hypotheses array;
 *   • every blockingPrerequisiteId references a validationAction;
 *   • all identities share the SAME caseId + sessionId (same-Analysis-Case scope from R3.0C is
 *     inherited — cross-case / cross-session decision inputs are forbidden at the SHAPE layer).
 *
 * The contract does NOT score / rank / select — D3+ services do that.
 *
 * UMD: Node require / Electron renderer global (R3_0D_DecisionInputContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var EN = _req('./evidence-node-contract.js', typeof R3_0D_EvidenceNodeContract !== 'undefined' ? R3_0D_EvidenceNodeContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  var REC = _req('./recommendation-contract.js', typeof R3_0D_RecommendationContract !== 'undefined' ? R3_0D_RecommendationContract : undefined);
  if (!RC || !EN || !HC || !REC) throw new Error('decision-input-contract.js requires reason-codes + evidence-node + hypothesis + recommendation');
  var CODES = RC.REASON_CODES;

  var DECISION_INPUT_KEYS = Object.freeze([
    'caseId',
    'sessionId',
    'nodes',
    'hypotheses',
    'alternativeExplanations',
    'validationActions',
    'recommendations',
    'schemaVersion',
  ]);

  var SUPPORTED_SCHEMA_VERSION = 1;

  // Graph-wide caps. Directive §8 / §9 — "graph caps, total envelope cap".
  var NODES_CAP = 256;
  var HYPOTHESES_CAP = 64;
  var ALTERNATIVES_CAP = 128;
  var VALIDATION_ACTIONS_CAP = 128;
  var RECOMMENDATIONS_CAP = 32;
  var ENVELOPE_BYTE_CAP = 256 * 1024; // 256 KiB total — far below the comparison-export 1 MiB cap

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure.
  function _hasOnlyAllowedKeys(o, allowed) { var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; } for (var i = 0; i < keys.length; i++) { var k = keys[i]; if (typeof k === 'symbol') return false; if (allowed.indexOf(k) === -1) return false; } return true; }

  /**
   * validateDecisionInputShape(input) — D1 STRUCTURAL gate over the composed graph.
   *
   * Returns { valid:true, summary:{...counts} } or buildBlockedResult.
   */
  function validateDecisionInputShape(inputIn) {
    // Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (RC.hasHiddenOwnKey(inputIn)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.UNKNOWN_OWN_KEY], { detail: 'decision-input carries Symbol-keyed or non-enumerable own property' });
    var input = RC.toCleanCopy(inputIn);
    if (!_isPlain(input)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'decision-input not plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(input, DECISION_INPUT_KEYS)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    if (!Number.isInteger(input.schemaVersion)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.schemaVersion > SUPPORTED_SCHEMA_VERSION) reasons.push(CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (input.schemaVersion < 1) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);

    if (!_nonEmptyStr(input.caseId)) reasons.push(CODES.SOURCE_IDENTITY_INVALID);
    if (!_nonEmptyStr(input.sessionId)) reasons.push(CODES.SOURCE_IDENTITY_INVALID);

    // Per-collection: must be an array within cap, each entry must pass its respective SHAPE validator.
    if (!Array.isArray(input.nodes)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.nodes.length > NODES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.hypotheses)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.hypotheses.length > HYPOTHESES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.alternativeExplanations)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.alternativeExplanations.length > ALTERNATIVES_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.validationActions)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.validationActions.length > VALIDATION_ACTIONS_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);
    if (!Array.isArray(input.recommendations)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    else if (input.recommendations.length > RECOMMENDATIONS_CAP) reasons.push(CODES.GRAPH_CAP_EXCEEDED);

    // Envelope byte cap — serialize-and-measure.
    try {
      var serialized = JSON.stringify(input);
      if (typeof serialized !== 'string') reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
      else {
        var bytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(serialized).length : Buffer.byteLength(serialized, 'utf8');
        if (bytes > ENVELOPE_BYTE_CAP) reasons.push(CODES.BYTE_CAP_EXCEEDED);
      }
    } catch (e) { reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION); }

    if (reasons.length) {
      var seen = {}, out = [];
      reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
      return RC.buildBlockedResult(out);
    }

    // Per-entry SHAPE validation + same-case / same-session cross-check + reference integrity.
    var nodeIds = {}, hypIds = {}, altIds = {}, actIds = {};
    var i, r;
    for (i = 0; i < input.nodes.length; i++) {
      r = EN.validateEvidenceNodeShape(input.nodes[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.EVIDENCE_NODE_INVALID]); continue; }
      if (nodeIds[input.nodes[i].nodeId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      nodeIds[input.nodes[i].nodeId] = true;
      if (input.nodes[i].identity.caseId !== input.caseId || input.nodes[i].identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
    }
    for (i = 0; i < input.alternativeExplanations.length; i++) {
      r = HC.validateAlternativeExplanationShape(input.alternativeExplanations[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.HYPOTHESIS_ALTERNATIVE_INVALID]); continue; }
      if (altIds[input.alternativeExplanations[i].alternativeId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      altIds[input.alternativeExplanations[i].alternativeId] = true;
    }
    for (i = 0; i < input.validationActions.length; i++) {
      r = HC.validateValidationActionShape(input.validationActions[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.VALIDATION_ACTION_INVALID]); continue; }
      if (actIds[input.validationActions[i].actionId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      actIds[input.validationActions[i].actionId] = true;
    }
    for (i = 0; i < input.hypotheses.length; i++) {
      r = HC.validateHypothesisShape(input.hypotheses[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.HYPOTHESIS_INVALID]); continue; }
      var h = input.hypotheses[i];
      if (hypIds[h.hypothesisId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      hypIds[h.hypothesisId] = true;
      if (h.identity.caseId !== input.caseId || h.identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
      // Reference integrity
      for (var sei = 0; sei < h.supportingEvidenceIds.length; sei++) if (!nodeIds[h.supportingEvidenceIds[sei]]) { reasons.push(CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID); break; }
      for (var cei = 0; cei < h.contradictingEvidenceIds.length; cei++) if (!nodeIds[h.contradictingEvidenceIds[cei]]) { reasons.push(CODES.HYPOTHESIS_CONTRADICTION_INVALID); break; }
      for (var aei = 0; aei < h.alternativeExplanationIds.length; aei++) if (!altIds[h.alternativeExplanationIds[aei]]) { reasons.push(CODES.HYPOTHESIS_ALTERNATIVE_INVALID); break; }
      for (var vai = 0; vai < h.validationActionIds.length; vai++) if (!actIds[h.validationActionIds[vai]]) { reasons.push(CODES.VALIDATION_ACTION_INVALID); break; }
    }
    var recIds = {};
    for (i = 0; i < input.recommendations.length; i++) {
      r = REC.validateRecommendationShape(input.recommendations[i]);
      if (r.valid !== true) { reasons.push.apply(reasons, r.reasonCodes || [CODES.RECOMMENDATION_INVALID]); continue; }
      var rec = input.recommendations[i];
      if (recIds[rec.recommendationId]) { reasons.push(CODES.EVIDENCE_DUPLICATE_ID); continue; }
      recIds[rec.recommendationId] = true;
      if (rec.identity.caseId !== input.caseId || rec.identity.sessionId !== input.sessionId) reasons.push(CODES.SOURCE_IDENTITY_CASE_MISMATCH);
      if (!hypIds[rec.hypothesisId]) reasons.push(CODES.RECOMMENDATION_INVALID);
      for (var bpi = 0; bpi < rec.blockingPrerequisiteIds.length; bpi++) if (!actIds[rec.blockingPrerequisiteIds[bpi]]) { reasons.push(CODES.RECOMMENDATION_INVALID); break; }
    }

    if (reasons.length) {
      var seen2 = {}, out2 = [];
      reasons.forEach(function (c) { if (!seen2[c]) { seen2[c] = true; out2.push(c); } });
      return RC.buildBlockedResult(out2);
    }
    return Object.freeze({
      valid: true,
      summary: Object.freeze({
        caseId: input.caseId,
        sessionId: input.sessionId,
        nodeCount: input.nodes.length,
        hypothesisCount: input.hypotheses.length,
        alternativeCount: input.alternativeExplanations.length,
        validationActionCount: input.validationActions.length,
        recommendationCount: input.recommendations.length,
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'decision-input validator threw on hostile input' });
    }
  }

  var api = {
    DECISION_INPUT_KEYS: DECISION_INPUT_KEYS,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    NODES_CAP: NODES_CAP,
    HYPOTHESES_CAP: HYPOTHESES_CAP,
    ALTERNATIVES_CAP: ALTERNATIVES_CAP,
    VALIDATION_ACTIONS_CAP: VALIDATION_ACTIONS_CAP,
    RECOMMENDATIONS_CAP: RECOMMENDATIONS_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    validateDecisionInputShape: validateDecisionInputShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_DecisionInputContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
