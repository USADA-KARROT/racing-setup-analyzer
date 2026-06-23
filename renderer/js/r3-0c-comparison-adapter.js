/**
 * renderer/js/r3-0c-comparison-adapter.js — R3.0C C1 · Production adapter (renderer-level).
 *
 * Single authorized production entry-point that plumbs the contracts/r3.0c/ surface into the renderer
 * tree. The adapter carries NO algorithm: every public function delegates to the contract layer, which
 * either returns a fail-closed blocked result with reason codes or an `eligible_pending_production`
 * marker that carries NO numeric payload. The adapter does NOT segment laps, compute deltas, pair
 * corners, normalize positions, decide reference laps, or touch the Feature Registry. Lap authority,
 * normalized distance, reference / corner segmentation, delta metrics, comparison export, UI and
 * feature activation are unlocked by later R3.0C checkpoints (C2 / C3 / C4 / C5 / C6 / C7 / C8) and
 * gated by governance/r3.0c/state.json — not by this file.
 *
 * The require of '../../contracts/r3.0c/index.js' is intentionally written as a top-level literal so
 * the no-runtime-consumer validator (scripts/check-r3-0c-no-consumer.js) sees the dependency and
 * counts this file as an AUTHORIZED consumer per state.json.authorizedProductionPaths (capability
 * production_adapter_present). Hiding the require behind a wrapper would silently bypass the
 * validator's coverage check — the very thing the validator exists to enforce — so the dependency
 * is deliberately surfaced and only fails closed when actually unavailable.
 *
 * The three R3.0C feature IDs (case_comparison, reference_lap, corner_delta) remain
 * availability='deferred' in renderer/js/feature-registry.js until C8_ACTIVATION authorizes them.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonAdapter). When loaded in a browser-only
 * renderer environment without a Node require, the adapter falls back to the contract namespace
 * exposed on globalThis (R3_0C_Contracts) — keeping the adapter usable from both contexts without
 * algorithm duplication.
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); }
    catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) {
    throw new Error('renderer/js/r3-0c-comparison-adapter.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }

  var ADAPTER_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C1_PRODUCTION_ADAPTER';

  function loadContracts() { return Contracts; }

  function comparisonScope() { return Contracts.comparisonEligibility.COMPARISON_SCOPE; }
  function deltaSign() { return Contracts.comparisonEligibility.DELTA_SIGN; }
  function deltaSignFormula() { return Contracts.comparisonEligibility.deltaSignFormula(); }
  function supportedMetrics() { return Contracts.comparisonEligibility.SUPPORTED_METRICS; }
  function reasonCodes() { return Contracts.reasonCodes.REASON_CODES; }
  function allReasonCodes() { return Contracts.reasonCodes.ALL_REASON_CODES; }

  function evaluateMetricSupport(metricName) {
    return Contracts.comparisonEligibility.evaluateMetricSupport(metricName);
  }

  function evaluateComparisonEligibility(input) {
    return Contracts.comparisonEligibility.evaluateComparisonEligibility(input);
  }

  function validateCredibilityMetadata(meta) {
    return Contracts.credibility.validateCredibilityMetadata(meta);
  }

  function evaluateLapAuthority(authority) {
    return Contracts.validLap.evaluateLapAuthority(authority);
  }

  function assessNormalizationCompatibility(refAuth, cmpAuth) {
    return Contracts.normalizedPosition.assessNormalizationCompatibility(refAuth, cmpAuth);
  }

  // C1 surface explicitly excludes algorithmic output: no lap segmentation, no corner pairing, no
  // delta metric computation, no reference-lap selection, no export serialization. Callers that need
  // those will be routed to later-checkpoint modules once those checkpoints land.
  var api = {
    ADAPTER_VERSION: ADAPTER_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    loadContracts: loadContracts,
    comparisonScope: comparisonScope,
    deltaSign: deltaSign,
    deltaSignFormula: deltaSignFormula,
    supportedMetrics: supportedMetrics,
    reasonCodes: reasonCodes,
    allReasonCodes: allReasonCodes,
    evaluateMetricSupport: evaluateMetricSupport,
    evaluateComparisonEligibility: evaluateComparisonEligibility,
    validateCredibilityMetadata: validateCredibilityMetadata,
    evaluateLapAuthority: evaluateLapAuthority,
    assessNormalizationCompatibility: assessNormalizationCompatibility,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
