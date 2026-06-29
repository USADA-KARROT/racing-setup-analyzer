/**
 * contracts/r3.0e/index.js — R3.0E E1 · Contract Foundation aggregate (NON-PRODUCTION).
 *
 * Re-exports the R3.0E experiment contract surface. NON-PRODUCTION at E1: no rendererAdapter,
 * no runtime consumer, no algorithm. Mirrors the contracts/r3.0d/index.js convention.
 */
(function (root) {
  'use strict';
  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0E_ReasonCodes !== 'undefined' ? R3_0E_ReasonCodes : undefined);
  var EXP = _req('./experiment-contract.js', typeof R3_0E_ExperimentContract !== 'undefined' ? R3_0E_ExperimentContract : undefined);
  var OUT = _req('./outcome-contract.js', typeof R3_0E_OutcomeContract !== 'undefined' ? R3_0E_OutcomeContract : undefined);
  var CV = _req('./control-variables-contract.js', typeof R3_0E_ControlVariablesContract !== 'undefined' ? R3_0E_ControlVariablesContract : undefined);
  var TL = _req('./case-timeline-contract.js', typeof R3_0E_CaseTimelineContract !== 'undefined' ? R3_0E_CaseTimelineContract : undefined);
  var FU = _req('./follow-up-link-contract.js', typeof R3_0E_FollowUpLinkContract !== 'undefined' ? R3_0E_FollowUpLinkContract : undefined);
  if (!RC || !EXP || !OUT || !CV || !TL || !FU) throw new Error('contracts/r3.0e/index.js could not load the contract modules');

  var api = {
    reasonCodes: RC,
    experiment: EXP,
    outcome: OUT,
    controlVariables: CV,
    caseTimeline: TL,
    followUpLink: FU,
    REASON_CODES: RC.REASON_CODES,
    EXPERIMENT_STATUS_ALLOWED: EXP.EXPERIMENT_STATUS_ALLOWED,
    OUTCOME_CLASS_ALLOWED: OUT.OUTCOME_CLASS_ALLOWED,
  };
  Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    try { Object.defineProperty(root, 'R3_0E_Contracts', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_Contracts = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
