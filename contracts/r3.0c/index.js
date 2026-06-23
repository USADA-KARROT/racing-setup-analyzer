/**
 * contracts/r3.0c/index.js — R3.0C CP1 · Contract Foundation aggregate (NON-PRODUCTION).
 *
 * Re-exports the R3.0C comparison contract surface. This is a CONTRACT artifact only: it lives outside
 * renderer/js/, has NO runtime consumer, is required by NO production module, imports NOTHING from
 * renderer/js/, and contains NO algorithm. See docs/r3.0c-contract-foundation.md for the deployment-location
 * amendment to architecture v3 (the semantics are unchanged; only the production wiring is deferred).
 *
 * UMD: Node require / Electron renderer global (R3_0C_Contracts).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0C_CredibilityContract !== 'undefined' ? R3_0C_CredibilityContract : undefined);
  var VL = _req('./valid-lap-contract.js', typeof R3_0C_ValidLapContract !== 'undefined' ? R3_0C_ValidLapContract : undefined);
  var NP = _req('./normalized-position-contract.js', typeof R3_0C_NormalizedPositionContract !== 'undefined' ? R3_0C_NormalizedPositionContract : undefined);
  var CE = _req('./comparison-eligibility-contract.js', typeof R3_0C_ComparisonEligibilityContract !== 'undefined' ? R3_0C_ComparisonEligibilityContract : undefined);
  var EX = _req('./comparison-export-contract.js', typeof R3_0C_ComparisonExportContract !== 'undefined' ? R3_0C_ComparisonExportContract : undefined);
  var RAC = _req('./reference-and-corner-contract.js', typeof R3_0C_ReferenceAndCornerContract !== 'undefined' ? R3_0C_ReferenceAndCornerContract : undefined);
  if (!RC || !CR || !VL || !NP || !CE || !EX || !RAC) throw new Error('contracts/r3.0c/index.js could not load the contract modules');

  var api = {
    reasonCodes: RC,
    credibility: CR,
    validLap: VL,
    normalizedPosition: NP,
    comparisonEligibility: CE,
    comparisonExport: EX,
    referenceAndCorner: RAC,
    // convenience top-level constants
    REASON_CODES: RC.REASON_CODES,
    ALL_REASON_CODES: RC.ALL_REASON_CODES,
    DELTA_SIGN: CE.DELTA_SIGN,
    COMPARISON_SCOPE: CE.COMPARISON_SCOPE,
    COMPARISON_EXPORT_IDENTITY: EX.COMPARISON_EXPORT_IDENTITY,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_Contracts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
