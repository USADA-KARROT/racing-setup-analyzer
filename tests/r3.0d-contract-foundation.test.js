/**
 * tests/r3.0d-contract-foundation.test.js — R3.0D D1 · adversarial contract foundation suite.
 *
 * Verifies every D1 contract module:
 *   • structural fail-closed posture (closed key set, plain object, no Proxy/getter escape)
 *   • bounded-honesty rules (synthetic + heuristic require limitation markers)
 *   • causal-overclaim rejection (lexical guard)
 *   • confidence-forbidden rule (D1 caller cannot supply numeric)
 *   • auto-tuning rejection on recommendations
 *   • mandatory-presence rule on engineer brief (contradictions / limitations / cannotConclude)
 *   • scope-guard (no R3.0D production paths exist yet — D1 is contracts-only)
 *
 * Node CLI: `node tests/r3.0d-contract-foundation.test.js`, exit 1 on failure.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const C = require('../contracts/r3.0d/index.js');
const RC = C.reasonCodes;
const CR = C.credibility;
const SI = C.sourceIdentity;
const EN = C.evidenceNode;
const HC = C.hypothesis;
const REC = C.recommendation;
const DI = C.decisionInput;
const EB = C.engineerBrief;
const CODES = RC.REASON_CODES;

let pass = 0, fail = 0;
function chk(name, cond, detail) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } }

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Reason codes registry
// ─────────────────────────────────────────────────────────────────────────────
chk('REASON_CODES is frozen', Object.isFrozen(RC.REASON_CODES));
chk('ALL_REASON_CODES is frozen', Object.isFrozen(RC.ALL_REASON_CODES));
chk('reason code count is reasonable (≥ 50)', RC.ALL_REASON_CODES.length >= 50);
chk('every code is UPPER_SNAKE', RC.ALL_REASON_CODES.every(c => /^[A-Z][A-Z0-9_]*$/.test(c)));
chk('every code has explanation key', RC.ALL_REASON_CODES.every(c => /^r3_0d\.reason\./.test(RC.explanationKeyFor(c))));
chk('isReasonCode rejects unknown', RC.isReasonCode('NOT_A_REAL_CODE') === false);
chk('buildBlockedResult fail-closed default', (function () { var r = RC.buildBlockedResult([]); return r.reasonCodes[0] === CODES.INTERNAL_CONTRACT_VIOLATION; })());
chk('buildBlockedResult result is frozen', Object.isFrozen(RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID])));

// ─────────────────────────────────────────────────────────────────────────────
// Section B — Credibility / Confidence / Provenance
// ─────────────────────────────────────────────────────────────────────────────
['measured', 'derived', 'heuristic', 'synthetic'].forEach(c => chk('EVIDENCE_CREDIBILITY accepts ' + c, CR.validateEvidenceCredibility(c).valid === true));
chk('EVIDENCE_CREDIBILITY rejects unknown', CR.validateEvidenceCredibility('Measured').valid === undefined);
chk('CONCLUSION_CREDIBILITY ladder size 6', CR.CONCLUSION_CREDIBILITY.length === 6);
chk('PROVENANCE accepts real / synthetic / unverified', CR.PROVENANCE.length === 3);
chk('CONFIDENCE_STATES is { unresolved, not_computed } only', CR.CONFIDENCE_STATES.length === 2);
// Confidence cannot carry numeric at D1
chk('confidence with numeric value rejected', CR.validateConfidenceShape({ state: 'unresolved', value: 0.5 }).valid === undefined);
chk('confidence with numeric value blocked → HYPOTHESIS_CONFIDENCE_FORBIDDEN', (function () { var r = CR.validateConfidenceShape({ state: 'unresolved', value: 0.99 }); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN) !== -1; })());
chk('confidence with score numeric rejected', CR.validateConfidenceShape({ state: 'unresolved', score: 1 }).valid === undefined);
chk('confidence with probability rejected', CR.validateConfidenceShape({ state: 'not_computed', probability: 0 }).valid === undefined);
chk('confidence unresolved valid', CR.validateConfidenceShape({ state: 'unresolved' }).valid === true);
chk('confidence not_computed valid', CR.validateConfidenceShape({ state: 'not_computed' }).valid === true);
chk('confidence non-plain rejected', CR.validateConfidenceShape(null).valid === undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Section C — Source identity
// ─────────────────────────────────────────────────────────────────────────────
const NOW = '2026-06-28T05:00:00Z';
function validId(over) { return Object.assign({ caseId: 'case_demo', sessionId: 'sess_demo', lapId: 'L1', sourceId: 'lap_authority', sourceVersion: 'v1', freshness: NOW }, over || {}); }
chk('SI valid', SI.validateSourceIdentity(validId()).valid === true);
chk('SI lapId null permitted', SI.validateSourceIdentity(validId({ lapId: null })).valid === true);
chk('SI extra own key rejected', SI.validateSourceIdentity(Object.assign(validId(), { extra: 1 })).valid === undefined);
chk('SI missing caseId rejected', (function () { var i = validId(); delete i.caseId; return SI.validateSourceIdentity(i).valid === undefined; })());
chk('SI missing sourceVersion rejected', (function () { var i = validId(); delete i.sourceVersion; return SI.validateSourceIdentity(i).valid === undefined; })());
chk('SI bad freshness rejected', SI.validateSourceIdentity(validId({ freshness: 'not-a-date' })).valid === undefined);
chk('SI byte cap enforced', (function () { var huge = 'x'.repeat(600); return SI.validateSourceIdentity(validId({ caseId: huge })).valid === undefined; })());
chk('SI identityMatches identity', SI.sourceIdentityMatches(validId(), validId()) === true);
chk('SI identityMatches ignores freshness', SI.sourceIdentityMatches(validId({ freshness: NOW }), validId({ freshness: '2026-06-29T00:00:00Z' })) === true);
chk('SI identityMatches different case', SI.sourceIdentityMatches(validId({ caseId: 'A' }), validId({ caseId: 'B' })) === false);

// ─────────────────────────────────────────────────────────────────────────────
// Section D — Evidence node
// ─────────────────────────────────────────────────────────────────────────────
function validEvidenceNode(over) {
  return Object.assign({
    schemaVersion: 1,
    nodeId: 'ev_001',
    category: 'data_quality',
    identity: validId(),
    credibility: 'measured',
    provenance: 'real',
    availability: 'available',
    confidence: { state: 'unresolved' },
    observation: { kind: 'channel_missing', i18nKey: 'r3_0d.evidence.channel.missing', params: { channel: 'speed' }, channel: 'speed' },
    limitations: [],
    supportingEdges: [],
    contradictingEdges: [],
  }, over || {});
}
chk('EN valid', EN.validateEvidenceNodeShape(validEvidenceNode()).valid === true);
chk('EN unknown category rejected', EN.validateEvidenceNodeShape(validEvidenceNode({ category: 'foo' })).valid === undefined);
chk('EN future schema rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ schemaVersion: 99 })); return r.reasonCodes.indexOf(CODES.UNSUPPORTED_FUTURE_SCHEMA) !== -1; })());
chk('EN extra own key rejected', EN.validateEvidenceNodeShape(Object.assign(validEvidenceNode(), { extra: 1 })).valid === undefined);
chk('EN missing nodeId rejected', (function () { var n = validEvidenceNode(); n.nodeId = ''; return EN.validateEvidenceNodeShape(n).valid === undefined; })());
chk('EN nodeId with .. rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ nodeId: 'a..b' })); return r.reasonCodes.indexOf(CODES.EVIDENCE_NODE_ID_FORBIDDEN) !== -1; })());
chk('EN nodeId with / rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ nodeId: 'a/b' })); return r.reasonCodes.indexOf(CODES.EVIDENCE_NODE_ID_FORBIDDEN) !== -1; })());
chk('EN nodeId leading . rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ nodeId: '.hidden' })); return r.reasonCodes.indexOf(CODES.EVIDENCE_NODE_ID_FORBIDDEN) !== -1; })());
chk('EN self-reference rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ supportingEdges: ['ev_001'] })); return r.reasonCodes.indexOf(CODES.EVIDENCE_GRAPH_SELF_REFERENCE) !== -1; })());
chk('EN synthetic without limitation rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ provenance: 'synthetic' })); return r.reasonCodes.indexOf(CODES.LIMITATION_SYNTHETIC_ONLY) !== -1; })());
chk('EN synthetic WITH limitation accepted', EN.validateEvidenceNodeShape(validEvidenceNode({ provenance: 'synthetic', limitations: [CODES.LIMITATION_SYNTHETIC_ONLY] })).valid === true);
chk('EN heuristic without limitation rejected', (function () { var r = EN.validateEvidenceNodeShape(validEvidenceNode({ credibility: 'heuristic' })); return r.reasonCodes.indexOf(CODES.LIMITATION_HEURISTIC_ONLY) !== -1; })());
chk('EN heuristic WITH limitation accepted', EN.validateEvidenceNodeShape(validEvidenceNode({ credibility: 'heuristic', limitations: [CODES.LIMITATION_HEURISTIC_ONLY] })).valid === true);
chk('EN numeric confidence value rejected', (function () { var n = validEvidenceNode(); n.confidence = { state: 'unresolved', value: 0.5 }; return EN.validateEvidenceNodeShape(n).valid === undefined; })());
chk('EN observation unknown kind rejected', (function () { var n = validEvidenceNode(); n.observation = { kind: 'free_form', i18nKey: 'x' }; return EN.validateEvidenceNodeShape(n).valid === undefined; })());
chk('EN observation NaN param rejected', (function () { var n = validEvidenceNode(); n.observation = { kind: 'metric_value', i18nKey: 'x', params: { v: NaN }, channel: null }; var r = EN.validateEvidenceNodeShape(n); return r.reasonCodes.indexOf(CODES.NUMERIC_INVALID) !== -1; })());
chk('EN edges array cap enforced', (function () { var n = validEvidenceNode(); n.supportingEdges = new Array(100).fill('x'); var r = EN.validateEvidenceNodeShape(n); return r.reasonCodes.indexOf(CODES.ARRAY_CAP_EXCEEDED) !== -1; })());
chk('EN sanitized output frozen', Object.isFrozen(EN.validateEvidenceNodeShape(validEvidenceNode()).sanitized));
chk('EN sanitized identity frozen', Object.isFrozen(EN.validateEvidenceNodeShape(validEvidenceNode()).sanitized.identity));
chk('EN sanitized observation frozen', Object.isFrozen(EN.validateEvidenceNodeShape(validEvidenceNode()).sanitized.observation));

// Hostile getter rejected at descriptor read
(function () {
  var hostile = validEvidenceNode();
  try { Object.defineProperty(hostile, 'nodeId', { get: function () { throw new Error('hostile'); }, enumerable: true, configurable: true }); } catch (_) {}
  var r;
  try { r = EN.validateEvidenceNodeShape(hostile); } catch (e) { r = null; }
  chk('EN hostile getter on nodeId does not throw past boundary', r !== null);
  chk('EN hostile getter on nodeId returns blocked', r && r.valid === undefined);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section E — Hypothesis
// ─────────────────────────────────────────────────────────────────────────────
function validHypothesis(over) {
  return Object.assign({
    schemaVersion: 1,
    hypothesisId: 'hyp_001',
    category: 'driver_behaviour',
    identity: validId(),
    i18nKey: 'r3_0d.hypothesis.driver.late_brake',
    params: { corner: 't3' },
    credibility: 'Heuristic',
    confidence: { state: 'unresolved' },
    supportingEvidenceIds: ['ev_001'],
    contradictingEvidenceIds: [],
    alternativeExplanationIds: ['alt_001'],
    cannotConcludeReasonCodes: [],
    limitations: [CODES.LIMITATION_HEURISTIC_ONLY],
    validationActionIds: ['act_001'],
  }, over || {});
}
chk('HYP valid', HC.validateHypothesisShape(validHypothesis()).valid === true);
chk('HYP causal overclaim in i18nKey rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ i18nKey: 'r3_0d.hypothesis.driver_fault.exposed' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP guaranteed_fix rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ i18nKey: 'r3_0d.hypothesis.guaranteed_fix' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP professional_diagnosis rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ i18nKey: 'r3_0d.hypothesis.professional_diagnosis' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP fastest_setup rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ i18nKey: 'fastest_setup_advice' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP theoretical_best rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ i18nKey: 'theoretical best lap' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP overclaim in params value rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ params: { reason: 'driver fault' } })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('HYP missing supportingEvidenceIds rejected', (function () { var h = validHypothesis(); delete h.supportingEvidenceIds; return HC.validateHypothesisShape(h).valid === undefined; })());
chk('HYP missing contradictingEvidenceIds rejected', (function () { var h = validHypothesis(); delete h.contradictingEvidenceIds; return HC.validateHypothesisShape(h).valid === undefined; })());
chk('HYP missing alternativeExplanationIds rejected', (function () { var h = validHypothesis(); delete h.alternativeExplanationIds; return HC.validateHypothesisShape(h).valid === undefined; })());
chk('HYP missing cannotConcludeReasonCodes rejected', (function () { var h = validHypothesis(); delete h.cannotConcludeReasonCodes; return HC.validateHypothesisShape(h).valid === undefined; })());
chk('HYP missing validationActionIds rejected', (function () { var h = validHypothesis(); delete h.validationActionIds; return HC.validateHypothesisShape(h).valid === undefined; })());
chk('HYP numeric confidence rejected', (function () { var h = validHypothesis(); h.confidence = { state: 'unresolved', value: 0.9 }; var r = HC.validateHypothesisShape(h); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CONFIDENCE_FORBIDDEN) !== -1; })());
chk('HYP unknown category rejected', HC.validateHypothesisShape(validHypothesis({ category: 'mystery' })).valid === undefined);
chk('HYP future schema rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ schemaVersion: 99 })); return r.reasonCodes.indexOf(CODES.UNSUPPORTED_FUTURE_SCHEMA) !== -1; })());
chk('HYP heuristic without LIMITATION_HEURISTIC_ONLY rejected', (function () { var r = HC.validateHypothesisShape(validHypothesis({ limitations: [] })); return r.reasonCodes.indexOf(CODES.LIMITATION_HEURISTIC_ONLY) !== -1; })());

// Validation action shape
function validAction(over) { return Object.assign({ actionId: 'act_001', kind: 'controlled_repeat_lap', i18nKey: 'r3_0d.action.repeat', params: {}, requiresControlledVariables: true, expectedObservationI18nKey: 'r3_0d.expected.delta_drop' }, over || {}); }
chk('ACTION valid', HC.validateValidationActionShape(validAction()).valid === true);
chk('ACTION unknown kind rejected', HC.validateValidationActionShape(validAction({ kind: 'unknown_thing' })).valid === undefined);
chk('ACTION extra key rejected', HC.validateValidationActionShape(Object.assign(validAction(), { extra: 1 })).valid === undefined);
chk('ACTION causal overclaim rejected', (function () { var r = HC.validateValidationActionShape(validAction({ i18nKey: 'driver_fault' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());

// Alternative explanation
function validAlt(over) { return Object.assign({ alternativeId: 'alt_001', i18nKey: 'r3_0d.alt.tyre_temp', params: { temp: 70 }, supportingEvidenceIds: ['ev_001'] }, over || {}); }
chk('ALT valid', HC.validateAlternativeExplanationShape(validAlt()).valid === true);
chk('ALT extra key rejected', HC.validateAlternativeExplanationShape(Object.assign(validAlt(), { extra: 1 })).valid === undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Section F — Recommendation + Priority
// ─────────────────────────────────────────────────────────────────────────────
function validRec(over) {
  return Object.assign({
    schemaVersion: 1,
    recommendationId: 'rec_001',
    priorityKey: 'controlled_repeat_lap',
    identity: validId(),
    hypothesisId: 'hyp_001',
    i18nKey: 'r3_0d.rec.repeat_lap',
    params: { laps: 3 },
    applyMode: 'driver_action',
    whyNowI18nKey: 'r3_0d.rec.whynow',
    expectedObservationI18nKey: 'r3_0d.rec.expected',
    stopConditionI18nKey: 'r3_0d.rec.stop',
    rollbackConditionI18nKey: 'r3_0d.rec.rollback',
    blockingPrerequisiteIds: [],
    limitations: [],
  }, over || {});
}
chk('REC valid', REC.validateRecommendationShape(validRec()).valid === true);
chk('REC priority ladder 5 entries', REC.PRIORITY_LADDER.length === 5);
chk('REC priority order: data_quality=1, setup_experiment=5', REC.PRIORITY_KEY_RANK['data_quality'] === 1 && REC.PRIORITY_KEY_RANK['setup_experiment'] === 5);
chk('REC unknown priority rejected', REC.validateRecommendationShape(validRec({ priorityKey: 'unknown_priority' })).valid === undefined);
chk('REC auto_tuning rejected', (function () { var r = REC.validateRecommendationShape(validRec({ applyMode: 'auto_tuning' })); return r.reasonCodes.indexOf(CODES.RECOMMENDATION_AUTO_TUNING_FORBIDDEN) !== -1; })());
chk('REC auto_setup rejected', (function () { var r = REC.validateRecommendationShape(validRec({ applyMode: 'auto_setup' })); return r.reasonCodes.indexOf(CODES.RECOMMENDATION_AUTO_SETUP_FORBIDDEN) !== -1; })());
chk('REC auto_calibration rejected', (function () { var r = REC.validateRecommendationShape(validRec({ applyMode: 'auto_calibration' })); return r.reasonCodes.indexOf(CODES.RECOMMENDATION_AUTO_CALIBRATION_FORBIDDEN) !== -1; })());
chk('REC auto_preset rejected', (function () { var r = REC.validateRecommendationShape(validRec({ applyMode: 'auto_preset' })); return r.reasonCodes.indexOf(CODES.RECOMMENDATION_AUTO_PRESET_FORBIDDEN) !== -1; })());
chk('REC user_initiated permitted', REC.validateRecommendationShape(validRec({ applyMode: 'user_initiated' })).valid === true);
chk('REC causal overclaim in i18nKey rejected', (function () { var r = REC.validateRecommendationShape(validRec({ i18nKey: 'guaranteed_fix' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('REC future schema rejected', REC.validateRecommendationShape(validRec({ schemaVersion: 99 })).valid === undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Section G — Decision input cross-shape integrity
// ─────────────────────────────────────────────────────────────────────────────
function validDecisionInput(over) {
  var ev = validEvidenceNode();
  var hyp = validHypothesis();
  var rec = validRec();
  var alt = validAlt();
  var act = validAction();
  return Object.assign({
    schemaVersion: 1,
    caseId: 'case_demo',
    sessionId: 'sess_demo',
    nodes: [ev],
    hypotheses: [hyp],
    alternativeExplanations: [alt],
    validationActions: [act],
    recommendations: [rec],
  }, over || {});
}
chk('DI valid', DI.validateDecisionInputShape(validDecisionInput()).valid === true);
chk('DI extra key rejected', DI.validateDecisionInputShape(Object.assign(validDecisionInput(), { extra: 1 })).valid === undefined);
chk('DI summary counts correct', (function () { var r = DI.validateDecisionInputShape(validDecisionInput()); return r.summary && r.summary.nodeCount === 1 && r.summary.hypothesisCount === 1 && r.summary.recommendationCount === 1; })());
// Orphan reference detection
chk('DI hypothesis supportingEvidence referencing missing node rejected', (function () {
  var input = validDecisionInput();
  input.hypotheses[0] = validHypothesis({ supportingEvidenceIds: ['ev_GHOST'] });
  var r = DI.validateDecisionInputShape(input);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID) !== -1;
})());
chk('DI recommendation hypothesisId orphan rejected', (function () {
  var input = validDecisionInput();
  input.recommendations[0] = validRec({ hypothesisId: 'hyp_GHOST' });
  return DI.validateDecisionInputShape(input).valid === undefined;
})());
chk('DI hypothesis with wrong caseId rejected', (function () {
  var input = validDecisionInput();
  input.hypotheses[0] = validHypothesis({ identity: validId({ caseId: 'OTHER' }) });
  var r = DI.validateDecisionInputShape(input);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.SOURCE_IDENTITY_CASE_MISMATCH) !== -1;
})());
chk('DI evidence with wrong sessionId rejected', (function () {
  var input = validDecisionInput();
  input.nodes[0] = validEvidenceNode({ identity: validId({ sessionId: 'OTHER' }) });
  var r = DI.validateDecisionInputShape(input);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.SOURCE_IDENTITY_CASE_MISMATCH) !== -1;
})());
chk('DI duplicate node id rejected', (function () {
  var input = validDecisionInput();
  input.nodes.push(validEvidenceNode());
  var r = DI.validateDecisionInputShape(input);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.EVIDENCE_DUPLICATE_ID) !== -1;
})());
chk('DI nodes graph cap enforced', (function () {
  var input = validDecisionInput();
  input.nodes = new Array(300).fill(0).map(function (_, i) { return validEvidenceNode({ nodeId: 'ev_' + i }); });
  var r = DI.validateDecisionInputShape(input);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.GRAPH_CAP_EXCEEDED) !== -1;
})());
chk('DI future schema rejected', DI.validateDecisionInputShape(validDecisionInput({ schemaVersion: 99 })).valid === undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Section H — Engineer Brief mandatory-presence + structural
// ─────────────────────────────────────────────────────────────────────────────
function validBrief(over) {
  return Object.assign({
    schemaVersion: 1,
    briefId: 'brief_001',
    identity: validId(),
    primaryIssueI18nKey: 'r3_0d.brief.primary.driver_late_brake',
    primaryIssueParams: { corner: 't3' },
    secondaryIssueI18nKey: null,
    secondaryIssueParams: null,
    evidenceSummary: [{ nodeId: 'ev_001', i18nKey: 'r3_0d.brief.ev.t3_slow' }],
    contradictions: [],
    alternativeExplanations: [],
    cannotConcludeReasonCodes: [],
    nextValidationAction: null,
    driverExperimentI18nKey: null,
    setupExperimentI18nKey: null,
    confidence: { state: 'unresolved' },
    credibility: 'Heuristic',
    provenance: 'real',
    limitations: [CODES.LIMITATION_HEURISTIC_ONLY],
  }, over || {});
}
chk('BRIEF valid', EB.validateEngineerBriefShape(validBrief()).valid === true);
chk('BRIEF missing contradictions key → BRIEF_CONTRADICTION_HIDDEN', (function () {
  var b = validBrief();
  delete b.contradictions;
  var r = EB.validateEngineerBriefShape(b);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.BRIEF_CONTRADICTION_HIDDEN) !== -1;
})());
chk('BRIEF missing limitations key → BRIEF_LIMITATION_HIDDEN', (function () {
  var b = validBrief();
  delete b.limitations;
  var r = EB.validateEngineerBriefShape(b);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.BRIEF_LIMITATION_HIDDEN) !== -1;
})());
chk('BRIEF missing cannotConcludeReasonCodes key → BRIEF_CANNOT_CONCLUDE_HIDDEN', (function () {
  var b = validBrief();
  delete b.cannotConcludeReasonCodes;
  var r = EB.validateEngineerBriefShape(b);
  return r.reasonCodes && r.reasonCodes.indexOf(CODES.BRIEF_CANNOT_CONCLUDE_HIDDEN) !== -1;
})());
chk('BRIEF causal overclaim in primaryIssueI18nKey rejected', (function () { var r = EB.validateEngineerBriefShape(validBrief({ primaryIssueI18nKey: 'driver_fault' })); return r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1; })());
chk('BRIEF extra own key rejected', EB.validateEngineerBriefShape(Object.assign(validBrief(), { extra: 1 })).valid === undefined);
chk('BRIEF numeric confidence rejected', (function () { var b = validBrief(); b.confidence = { state: 'unresolved', value: 0.9 }; return EB.validateEngineerBriefShape(b).valid === undefined; })());
chk('BRIEF future schema rejected', EB.validateEngineerBriefShape(validBrief({ schemaVersion: 99 })).valid === undefined);

// ─────────────────────────────────────────────────────────────────────────────
// Section I — state-aware production consumer guard.
//   At D1: no renderer/js may require contracts/r3.0d (contracts-only checkpoint).
//   At D2_EVIDENCE_GRAPH and beyond: each renderer/js consumer of contracts/r3.0d MUST be listed
//     in state.authorizedProductionPaths. Unauthorised consumers fail closed.
//   In all cases: renderer/index.html MUST NOT <script src=...contracts/r3.0d...> (those modules are
//     UMD via require, never page-loaded as scripts — D5_ENGINEER_BRIEF_ACTIVATION is the earliest
//     point where adapter inclusion is even contemplated, and even then only via the adapter, not
//     via a raw contracts/r3.0d script src).
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  var stPath = path.join(REPO, 'governance', 'r3.0d', 'state.json');
  var st = null;
  try { st = JSON.parse(fs.readFileSync(stPath, 'utf8')); } catch (_) { st = null; }
  var allowed = new Set(((st && st.authorizedProductionPaths) || []).map(function (e) { return e.path; }));
  var rendererDir = path.join(REPO, 'renderer', 'js');
  var files = fs.readdirSync(rendererDir).filter(function (f) { return f.endsWith('.js'); });
  var leaks = [];
  files.forEach(function (f) {
    var src = fs.readFileSync(path.join(rendererDir, f), 'utf8');
    if (/contracts\/r3\.0d/.test(src)) {
      var rel = 'renderer/js/' + f;
      if (!allowed.has(rel)) leaks.push(f);
    }
  });
  chk('renderer/js consumers of contracts/r3.0d are limited to state.authorizedProductionPaths', leaks.length === 0, leaks);
  var html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
  chk('renderer/index.html does NOT load contracts/r3.0d via script src', !/<script[^>]*src=["'][^"']*contracts\/r3\.0d/.test(html));
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section J — state-aware governance assertions for the current R3.0D checkpoint.
//   At D1_CONTRACT_FOUNDATION: contracts-only — no authorized paths, no runtime consumers, no UI.
//   At D2_EVIDENCE_GRAPH: production introduced — runtimeConsumers + algorithms allowed, UI + activation still false.
//   The assertions below stay focused on D1 + D2 (D3/D4/D5 are tested in their own suites).
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  var stPath = path.join(REPO, 'governance', 'r3.0d', 'state.json');
  var st;
  try { st = JSON.parse(fs.readFileSync(stPath, 'utf8')); } catch (_) { st = null; }
  chk('governance/r3.0d/state.json readable', st !== null);
  if (st) {
    chk('R3.0D currentCheckpoint is a known D-phase checkpoint', ['D0_BOOTSTRAP', 'D1_CONTRACT_FOUNDATION', 'D2_EVIDENCE_GRAPH', 'D3_HYPOTHESIS_ENGINE', 'D4_PRIORITY_ENGINE', 'D5_ENGINEER_BRIEF_ACTIVATION'].indexOf(st.currentCheckpoint) !== -1);
    chk('R3.0D uiAllowed=false (until D5)', st.uiAllowed === false);
    chk('R3.0D featureRegistryActivationAllowed=false (until D5)', st.featureRegistryActivationAllowed === false);
    if (st.currentCheckpoint === 'D1_CONTRACT_FOUNDATION') {
      chk('D1: authorizedProductionPaths empty', Array.isArray(st.authorizedProductionPaths) && st.authorizedProductionPaths.length === 0);
      chk('D1: runtimeConsumersAllowed=false', st.runtimeConsumersAllowed === false);
      chk('D1: algorithmsAllowed=false', st.algorithmsAllowed === false);
      chk('D1: contract_foundation_present in enabledCapabilities', (st.enabledCapabilities || []).indexOf('contract_foundation_present') !== -1);
    } else if (st.currentCheckpoint === 'D2_EVIDENCE_GRAPH') {
      chk('D2: runtimeConsumersAllowed=true', st.runtimeConsumersAllowed === true);
      chk('D2: algorithmsAllowed=true', st.algorithmsAllowed === true);
      chk('D2: contract_foundation_present + evidence_graph_present in enabledCapabilities', (st.enabledCapabilities || []).indexOf('contract_foundation_present') !== -1 && (st.enabledCapabilities || []).indexOf('evidence_graph_present') !== -1);
      chk('D2: renderer/js/r3-0d-evidence-graph.js is the sole authorized R3.0D production path', (function () {
        var paths = (st.authorizedProductionPaths || []).map(function (e) { return e.path; });
        return paths.length === 1 && paths[0] === 'renderer/js/r3-0d-evidence-graph.js';
      })());
    }
  }
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section K — Codex D1 Round 1 finding closures (RN-01 .. RN-05)
// ─────────────────────────────────────────────────────────────────────────────

// RN-01 — Reflect.ownKeys rejects Symbol-keyed and non-enumerable own properties
(function () {
  var sym = Symbol('hostile');
  var id = validId(); id[sym] = 'oops';
  chk('RN-01: SI rejects Symbol-keyed own property', SI.validateSourceIdentity(id).valid === undefined);
  var c = { state: 'unresolved' }; c[sym] = 'oops';
  chk('RN-01: confidence rejects Symbol-keyed own property', CR.validateConfidenceShape(c).valid === undefined);
  var c2 = { state: 'unresolved' }; Object.defineProperty(c2, 'hidden', { value: 'oops', enumerable: false });
  chk('RN-01: confidence rejects non-enumerable own property', CR.validateConfidenceShape(c2).valid === undefined);
  var n = validEvidenceNode(); n[sym] = 'oops';
  chk('RN-01: evidence-node rejects Symbol-keyed own property', EN.validateEvidenceNodeShape(n).valid === undefined);
  var n2 = validEvidenceNode(); Object.defineProperty(n2, 'hidden', { value: 'oops', enumerable: false });
  chk('RN-01: evidence-node rejects non-enumerable own property', EN.validateEvidenceNodeShape(n2).valid === undefined);
  var h = validHypothesis(); h[sym] = 'oops';
  chk('RN-01: hypothesis rejects Symbol-keyed own property', HC.validateHypothesisShape(h).valid === undefined);
  var r = validRec(); r[sym] = 'oops';
  chk('RN-01: recommendation rejects Symbol-keyed own property', REC.validateRecommendationShape(r).valid === undefined);
  var b = validBrief(); b[sym] = 'oops';
  chk('RN-01: brief rejects Symbol-keyed own property', EB.validateEngineerBriefShape(b).valid === undefined);
})();

// RN-02 — Every exported validator wraps hostile-getter throws into a structured result
(function () {
  function hostileGetter(o, key) { try { Object.defineProperty(o, key, { get: function () { throw new Error('hostile-' + key); }, enumerable: true, configurable: true }); } catch (_) {} return o; }
  var i = hostileGetter(validId(), 'caseId');
  var threw = false; var r;
  try { r = SI.validateSourceIdentity(i); } catch (_) { threw = true; }
  chk('RN-02: SI hostile getter on caseId does not throw past boundary', !threw && r && r.valid === undefined);
  var c = hostileGetter({ state: 'unresolved' }, 'state');
  threw = false; try { r = CR.validateConfidenceShape(c); } catch (_) { threw = true; }
  chk('RN-02: confidence hostile getter does not throw past boundary', !threw && r && r.valid === undefined);
  var o = hostileGetter({ kind: 'metric_value', i18nKey: 'x' }, 'kind');
  threw = false; try { r = EN.validateObservationShape(o); } catch (_) { threw = true; }
  chk('RN-02: observation hostile getter does not throw past boundary', !threw && r && r.valid === undefined);
  var p = hostileGetter({ a: 1 }, 'a');
  threw = false; try { r = HC.validateParamsShape(p); } catch (_) { threw = true; }
  chk('RN-02: params hostile getter does not throw past boundary', !threw && r && r.valid === undefined);
  var alt = hostileGetter(validAlt(), 'alternativeId');
  threw = false; try { r = HC.validateAlternativeExplanationShape(alt); } catch (_) { threw = true; }
  chk('RN-02: alt hostile getter does not throw past boundary', !threw && r && r.valid === undefined);
  var act = hostileGetter(validAction(), 'actionId');
  threw = false; try { r = HC.validateValidationActionShape(act); } catch (_) { threw = true; }
  chk('RN-02: action hostile getter does not throw past boundary', !threw && r && r.valid === undefined);
})();

// RN-03 — Causal-overclaim guard normalizes hyphens, em-dashes, whitespace, case
(function () {
  var variants = ['DRIVER-FAULT', 'driver-fault', 'guaranteed-fix-recommended', 'professional-diagnosis-confirmed', 'GUARANTEED FIX', 'exact—cause' /* em-dash */, 'fastest-setup'];
  variants.forEach(function (v) {
    var h = validHypothesis({ i18nKey: 'r3_0d.h.' + v });
    var r = HC.validateHypothesisShape(h);
    chk('RN-03: hypothesis rejects causal-overclaim variant "' + v + '"', r.reasonCodes && r.reasonCodes.indexOf(CODES.HYPOTHESIS_CAUSAL_OVERCLAIM) !== -1);
  });
})();

// RN-04 — Engineer Brief nested entries enforce closed key set + contradiction validates contradictingEvidenceIds + nested params
(function () {
  var b = validBrief({ evidenceSummary: [{ nodeId: 'ev_001', i18nKey: 'k', params: null, extra: 'oops' }] });
  chk('RN-04: brief evidenceSummary entry rejects extra own key', EB.validateEngineerBriefShape(b).valid === undefined);
  b = validBrief({ contradictions: [{ hypothesisId: 'h1', i18nKey: 'k', contradictingEvidenceIds: ['ev_001'] }] });
  chk('RN-04: brief contradiction with valid contradictingEvidenceIds accepted', EB.validateEngineerBriefShape(b).valid === true);
  b = validBrief({ contradictions: [{ hypothesisId: 'h1', i18nKey: 'k', contradictingEvidenceIds: ['../escape'] }] });
  chk('RN-04: brief contradiction with id-grammar-violating contradictingEvidenceIds rejected', EB.validateEngineerBriefShape(b).valid === undefined);
  b = validBrief({ contradictions: [{ hypothesisId: 'h1', i18nKey: 'k', contradictingEvidenceIds: ['ev_001'], unknown: 1 }] });
  chk('RN-04: brief contradiction with extra own key rejected', EB.validateEngineerBriefShape(b).valid === undefined);
  b = validBrief({ alternativeExplanations: [{ alternativeId: 'alt_001', i18nKey: 'k', params: { msg: 'this is driver fault' } }] });
  chk('RN-04: brief alternative with overclaim in string param value rejected', EB.validateEngineerBriefShape(b).valid === undefined);
})();

// RN-11 — toCleanCopy must not silently transform class instances via inherited toJSON()
// AND populated class instances with valid own fields must be rejected at the prototype check.
(function () {
  // Populated class instance — own fields look valid; structuredClone would copy them into a plain
  // object; the R4 prototype check on the ORIGINAL input rejects pre-clone. With the R4 fix:
  // RC.isOriginalPlainObject(in) returns false for class instances → validator rejects with
  // PROTOTYPE_POLLUTION_REJECTED before structuredClone is even called.
  function PopulatedHostile() {
    this.caseId = 'forged_case';
    this.sessionId = 'forged_sess';
    this.sourceId = 'forged';
    this.sourceVersion = 'v1';
    this.freshness = NOW;
  }
  PopulatedHostile.prototype.toJSON = function () { return { caseId: 'X', sessionId: 'X', sourceId: 'X', sourceVersion: 'X', freshness: NOW }; };
  var populated = new PopulatedHostile();
  var r = SI.validateSourceIdentity(populated);
  chk('RN-11: SI rejects populated class instance pre-clone', r.valid === undefined);
  chk('RN-11: SI rejection reason includes PROTOTYPE_POLLUTION_REJECTED', r.reasonCodes && r.reasonCodes.indexOf(CODES.PROTOTYPE_POLLUTION_REJECTED) !== -1);
  // Empty class instance (no own fields) is also rejected
  function EmptyHostile() {}
  EmptyHostile.prototype.toJSON = function () { return { caseId: 'forged', sessionId: 'forged', sourceId: 'X', sourceVersion: 'X', freshness: NOW }; };
  var empty = new EmptyHostile();
  chk('RN-11: SI rejects empty class instance with inherited toJSON', SI.validateSourceIdentity(empty).valid === undefined);
  // Populated class instance fails the EvidenceNode validator too
  function HostileNode() {
    this.schemaVersion = 1;
    this.nodeId = 'ev_001';
    this.category = 'data_quality';
    this.identity = validId();
    this.credibility = 'measured';
    this.provenance = 'real';
    this.availability = 'available';
    this.confidence = { state: 'unresolved' };
    this.observation = { kind: 'channel_missing', i18nKey: 'k', params: null, channel: null };
    this.limitations = [];
    this.supportingEdges = [];
    this.contradictingEdges = [];
  }
  var hn = new HostileNode();
  var rNode = EN.validateEvidenceNodeShape(hn);
  chk('RN-11: EN rejects populated class instance pre-clone', rNode.valid === undefined);
  chk('RN-11: EN rejection includes PROTOTYPE_POLLUTION_REJECTED', rNode.reasonCodes && rNode.reasonCodes.indexOf(CODES.PROTOTYPE_POLLUTION_REJECTED) !== -1);
  // Null-prototype plain objects ARE accepted (legitimate use case)
  var nullProto = Object.create(null);
  nullProto.caseId = 'case_demo'; nullProto.sessionId = 'sess_demo'; nullProto.sourceId = 'lap_authority'; nullProto.sourceVersion = 'v1'; nullProto.freshness = NOW;
  chk('RN-11: SI accepts null-prototype plain object', SI.validateSourceIdentity(nullProto).valid === true);
  // R5-nested attack: a populated plain EvidenceNode whose `identity` field is a class instance
  // (laundered through structuredClone into a plain object pre-clone). Recursive check on the
  // ORIGINAL must reject before clone runs.
  function HostileNestedId() { this.caseId = 'case_demo'; this.sessionId = 'sess_demo'; this.sourceId = 'lap_authority'; this.sourceVersion = 'v1'; this.freshness = NOW; }
  var nestedHostileNode = validEvidenceNode({ identity: new HostileNestedId() });
  var rNest = EN.validateEvidenceNodeShape(nestedHostileNode);
  chk('RN-11 (nested): EN rejects plain node with class-instance identity', rNest.valid === undefined);
  chk('RN-11 (nested): rejection includes PROTOTYPE_POLLUTION_REJECTED', rNest.reasonCodes && rNest.reasonCodes.indexOf(CODES.PROTOTYPE_POLLUTION_REJECTED) !== -1);
  // R5-nested: class-instance confidence field
  function HostileConf() { this.state = 'unresolved'; }
  chk('RN-11 (nested): EN rejects class-instance confidence', EN.validateEvidenceNodeShape(validEvidenceNode({ confidence: new HostileConf() })).valid === undefined);
  // R5-nested: class-instance observation field
  function HostileObs() { this.kind = 'channel_missing'; this.i18nKey = 'k'; this.params = null; this.channel = null; }
  chk('RN-11 (nested): EN rejects class-instance observation', EN.validateEvidenceNodeShape(validEvidenceNode({ observation: new HostileObs() })).valid === undefined);
  // R5-nested: hostile accessor descriptor at any depth (getter) — recursive check returns true
  var withAccessor = validEvidenceNode();
  var ident = Object.assign({}, withAccessor.identity);
  Object.defineProperty(ident, 'caseId', { get: function () { return 'forged'; }, enumerable: true, configurable: true });
  chk('RN-11 (nested): EN rejects nested accessor descriptor', EN.validateEvidenceNodeShape(Object.assign({}, withAccessor, { identity: ident })).valid === undefined);
  // R6 attack: Array subclass instance + Array with mutated prototype at any depth
  (function () {
    function HostileArray() {} HostileArray.prototype = Object.create(Array.prototype);
    var hostileArr = new HostileArray(); hostileArr.length = 1; hostileArr[0] = 'ev_001';
    var nodeHostileArr = validEvidenceNode({ supportingEdges: hostileArr });
    chk('RN-11 (R6): EN rejects Array subclass in supportingEdges', EN.validateEvidenceNodeShape(nodeHostileArr).valid === undefined);
    // Mutated-prototype array
    var mutatedArr = ['ev_001'];
    Object.setPrototypeOf(mutatedArr, { __unknown__: true });
    chk('RN-11 (R6): EN rejects array with mutated prototype', EN.validateEvidenceNodeShape(validEvidenceNode({ supportingEdges: mutatedArr })).valid === undefined);
  })();
})();

// RN-05 — ID-array elements enforce byte cap + id grammar
(function () {
  var huge = 'x'.repeat(600);
  var h = validHypothesis({ supportingEvidenceIds: [huge] });
  chk('RN-05: hypothesis supportingEvidenceIds rejects oversized id', HC.validateHypothesisShape(h).valid === undefined);
  h = validHypothesis({ supportingEvidenceIds: ['../escape'] });
  chk('RN-05: hypothesis supportingEvidenceIds rejects path-traversal id', HC.validateHypothesisShape(h).valid === undefined);
  h = validHypothesis({ validationActionIds: [huge] });
  chk('RN-05: hypothesis validationActionIds rejects oversized id', HC.validateHypothesisShape(h).valid === undefined);
  var r = validRec({ blockingPrerequisiteIds: [huge] });
  chk('RN-05: recommendation blockingPrerequisiteIds rejects oversized id', REC.validateRecommendationShape(r).valid === undefined);
  r = validRec({ blockingPrerequisiteIds: ['..'] });
  chk('RN-05: recommendation blockingPrerequisiteIds rejects path-traversal id', REC.validateRecommendationShape(r).valid === undefined);
})();

console.log('r3.0d-contract-foundation: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
