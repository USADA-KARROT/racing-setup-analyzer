/**
 * renderer/js/r3-0c-comparison-adapter.js — R3.0C · Production adapter (renderer-level).
 *
 * Single authorized production entry-point that plumbs the contracts/r3.0c/ surface AND the C2
 * lap-authority / track-identity / distance-authority production services into the renderer tree.
 * The adapter carries NO algorithm: every public function delegates to either the contract layer
 * (which returns a fail-closed blocked result with reason codes or an `eligible_pending_production`
 * marker that carries NO numeric payload) or to a C2 service module. The adapter does NOT segment
 * laps, compute deltas, pair corners, normalize positions, decide reference laps, or touch the
 * Feature Registry. Normalized distance, reference / corner segmentation, delta metrics,
 * comparison export, UI and feature activation are unlocked by later R3.0C checkpoints
 * (C3 / C4 / C5 / C6 / C7 / C8) and gated by governance/r3.0c/state.json — not by this file.
 *
 * Checkpoint history exposed by this module:
 *   • CHECKPOINT_FLOOR = 'C1_PRODUCTION_ADAPTER' — the checkpoint at which this adapter was
 *     authorised; it does NOT advance with subsequent checkpoints. Callers asking "what's the
 *     newest surface available?" should consult exposes() / activeCheckpoint() instead.
 *   • activeCheckpoint() / exposes() — capability inventory that grows with each checkpoint.
 *
 * The requires of '../../contracts/r3.0c/index.js' AND the three C2 services are intentionally
 * written as top-level literals so the no-runtime-consumer validator
 * (scripts/check-r3-0c-no-consumer.js) sees the dependencies and counts this file as an AUTHORIZED
 * consumer per state.json.authorizedProductionPaths (capability production_adapter_present).
 * Hiding the require behind a wrapper would silently bypass the validator's coverage check — the
 * very thing the validator exists to enforce — so the dependency is deliberately surfaced and only
 * fails closed when actually unavailable.
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
  var LapAuthority = null;
  var TrackIdentity = null;
  var DistanceAuthority = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); }
    catch (e) { Contracts = null; }
    // C2 service requires are top-level literals (static dependency-audit friendly + no-consumer
    // validator visibility). Each may be absent in fixture trees that build a minimal renderer-only
    // base — the adapter degrades to "contracts only" rather than throwing for an unrelated module.
    try { LapAuthority = require('./r3-0c-lap-authority.js'); }
    catch (e) { LapAuthority = null; }
    try { TrackIdentity = require('./r3-0c-track-identity.js'); }
    catch (e) { TrackIdentity = null; }
    try { DistanceAuthority = require('./r3-0c-distance-authority.js'); }
    catch (e) { DistanceAuthority = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!LapAuthority && typeof R3_0C_LapAuthority !== 'undefined') LapAuthority = R3_0C_LapAuthority;
  if (!TrackIdentity && typeof R3_0C_TrackIdentity !== 'undefined') TrackIdentity = R3_0C_TrackIdentity;
  if (!DistanceAuthority && typeof R3_0C_DistanceAuthority !== 'undefined') DistanceAuthority = R3_0C_DistanceAuthority;
  if (!Contracts) {
    throw new Error('renderer/js/r3-0c-comparison-adapter.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }

  var ADAPTER_VERSION = 2;
  // CHECKPOINT_FLOOR is the historical authorization point — when this adapter first became a
  // production surface. It does NOT advance with later checkpoints; later capability additions are
  // exposed via activeCheckpoint() / exposes() so existing callers' floor comparisons keep working.
  var CHECKPOINT_FLOOR = 'C1_PRODUCTION_ADAPTER';

  function _requireService(svc, name) {
    // Lazy fail-closed: when a C2 service is wired but not yet loaded (fixture environment), the
    // delegating function throws an explicit error instead of swallowing — the adapter must never
    // silently substitute a stub. Tests that exercise C1-only surface never hit this path.
    if (!svc) throw new Error('r3-0c-comparison-adapter.js: ' + name + ' service not loaded — required at C2_LAP_AUTHORITY');
    return svc;
  }

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
    // STRUCTURAL gate (the contract one). Distinct from deriveLapAuthority below, which RE-DERIVES
    // the authority descriptor from raw evidence and then runs the same structural gate. C1
    // callers use this when they already have an authority descriptor; C2+ callers should prefer
    // deriveLapAuthority(lapEvidence) so the structural claim is independently re-derived.
    return Contracts.validLap.evaluateLapAuthority(authority);
  }

  function assessNormalizationCompatibility(refAuth, cmpAuth) {
    return Contracts.normalizedPosition.assessNormalizationCompatibility(refAuth, cmpAuth);
  }

  // ── C2 delegations — all pure passthrough to the corresponding service module. The adapter
  //    adds NO algorithm: the heavy lifting (re-derivation, threshold application, partial-channel
  //    gating, authority equality) lives in the service modules so the no-consumer validator can
  //    count them as authorized renderer/js consumers AND so a future refactor can swap a service
  //    out without touching every caller. ──
  function deriveLapAuthority(lapEvidence, options) {
    return _requireService(LapAuthority, 'lap-authority').deriveLapAuthority(lapEvidence, options);
  }
  function assessMetricChannelRequirements(metricName, lapEvidence, options) {
    return _requireService(LapAuthority, 'lap-authority').assessMetricChannelRequirements(metricName, lapEvidence, options);
  }
  function lapAuthorityDefaultThresholds() {
    return _requireService(LapAuthority, 'lap-authority').DEFAULT_THRESHOLDS;
  }
  function lapAuthorityMetricChannels() {
    return _requireService(LapAuthority, 'lap-authority').METRIC_REQUIRED_CHANNELS;
  }
  function deriveTrackIdentity(metadata) {
    return _requireService(TrackIdentity, 'track-identity').deriveTrackIdentity(metadata);
  }
  function equalsTrackIdentity(a, b) {
    return _requireService(TrackIdentity, 'track-identity').equalsTrackIdentity(a, b);
  }
  function deriveDistanceAuthority(distanceEvidence) {
    return _requireService(DistanceAuthority, 'distance-authority').deriveDistanceAuthority(distanceEvidence);
  }
  function distanceAuthorityForbiddenSources() {
    return _requireService(DistanceAuthority, 'distance-authority').FORBIDDEN_INFERENCE_SOURCES;
  }

  // Capability inventory — grows with each checkpoint. activeCheckpoint() reports the LATEST
  // checkpoint whose surface this adapter exposes; exposes() lists capability ids derived from
  // which service modules loaded successfully.
  function exposes() {
    var caps = ['production_adapter_present'];
    if (LapAuthority) caps.push('lap_authority_present');
    if (TrackIdentity) caps.push('track_identity_authoritative');
    if (DistanceAuthority) caps.push('lap_authority_present'); // distance backs lap_authority cluster
    // dedupe while preserving order
    var seen = {}, out = [];
    caps.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
    return Object.freeze(out);
  }
  function activeCheckpoint() {
    if (LapAuthority || TrackIdentity || DistanceAuthority) return 'C2_LAP_AUTHORITY';
    return 'C1_PRODUCTION_ADAPTER';
  }

  // The adapter surface is a fixed allowlist. UI / activation / segmentation / pairing / delta
  // metrics / export are NOT here — they belong to later checkpoints with their own modules.
  var api = {
    ADAPTER_VERSION: ADAPTER_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    activeCheckpoint: activeCheckpoint,
    exposes: exposes,
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
    // C2 surface
    deriveLapAuthority: deriveLapAuthority,
    assessMetricChannelRequirements: assessMetricChannelRequirements,
    lapAuthorityDefaultThresholds: lapAuthorityDefaultThresholds,
    lapAuthorityMetricChannels: lapAuthorityMetricChannels,
    deriveTrackIdentity: deriveTrackIdentity,
    equalsTrackIdentity: equalsTrackIdentity,
    deriveDistanceAuthority: deriveDistanceAuthority,
    distanceAuthorityForbiddenSources: distanceAuthorityForbiddenSources,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
