/**
 * contracts/r3.0d/index.js — R3.0D D1 · Contract Foundation aggregate (NON-PRODUCTION).
 *
 * Re-exports the R3.0D Decision Engine contract surface. This is a CONTRACT artifact only: it lives
 * outside renderer/js/, has NO runtime consumer, is required by NO production module, imports
 * NOTHING from renderer/js/, and contains NO algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0D_Contracts).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  var EN = _req('./evidence-node-contract.js', typeof R3_0D_EvidenceNodeContract !== 'undefined' ? R3_0D_EvidenceNodeContract : undefined);
  var HC = _req('./hypothesis-contract.js', typeof R3_0D_HypothesisContract !== 'undefined' ? R3_0D_HypothesisContract : undefined);
  var REC = _req('./recommendation-contract.js', typeof R3_0D_RecommendationContract !== 'undefined' ? R3_0D_RecommendationContract : undefined);
  var DI = _req('./decision-input-contract.js', typeof R3_0D_DecisionInputContract !== 'undefined' ? R3_0D_DecisionInputContract : undefined);
  var EB = _req('./engineer-brief-contract.js', typeof R3_0D_EngineerBriefContract !== 'undefined' ? R3_0D_EngineerBriefContract : undefined);
  if (!RC || !CR || !SI || !EN || !HC || !REC || !DI || !EB) throw new Error('contracts/r3.0d/index.js could not load the contract modules');

  var api = {
    reasonCodes: RC,
    credibility: CR,
    sourceIdentity: SI,
    evidenceNode: EN,
    hypothesis: HC,
    recommendation: REC,
    decisionInput: DI,
    engineerBrief: EB,
    // convenience top-level constants
    REASON_CODES: RC.REASON_CODES,
    ALL_REASON_CODES: RC.ALL_REASON_CODES,
    EVIDENCE_CATEGORIES: EN.EVIDENCE_CATEGORIES,
    EVIDENCE_CREDIBILITY: CR.EVIDENCE_CREDIBILITY,
    PROVENANCE: CR.PROVENANCE,
    CONFIDENCE_STATES: CR.CONFIDENCE_STATES,
    PRIORITY_LADDER: REC.PRIORITY_LADDER,
    HYPOTHESIS_CATEGORIES: HC.HYPOTHESIS_CATEGORIES,
    VALIDATION_ACTION_KIND_ALLOWED: HC.VALIDATION_ACTION_KIND_ALLOWED,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_Contracts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
