/**
 * contracts/r3.0c/reason-codes.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * The single, frozen, machine-readable registry of R3.0C Reference-Lap / Comparison reason codes plus a
 * shared blocked-result factory. This module is a CONTRACT artifact only:
 *   • it lives OUTSIDE renderer/js/ (no production tree), so the R3-GATE0 R3.0C scope guard does not apply;
 *   • it has NO runtime consumer, is required by NO production module, imports NOTHING from renderer/js/;
 *   • it contains NO algorithm — no telemetry traversal, no sample interpolation, no detection, no pairing,
 *     no ranking, no delta computation, no normalized-distance computation. Codes and a factory only.
 *
 * Codes are stable, unique, UPPER_SNAKE string constants (machine-readable; never replaced by free text).
 * Each code carries a stable i18n explanation KEY (a hook for a human-readable rendering) — never UI prose.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ReasonCodes). (Global export is for symmetry with the
 * codebase UMD convention; nothing in renderer/js/ requires it — CP1 wires no consumer.)
 */
(function (root) {
  'use strict';

  // ── reason codes (stable / unique / frozen). The first 16 are the directive's mandated set; the
  //    documented extensions below carry the same stability + uniqueness guarantee and are added only
  //    when a checkpoint introduces a genuinely distinct rejection semantic that the mandated set
  //    cannot express. Two scope extensions cover the same-Analysis-Case / same-session boundary
  //    (introduced at CP1 / C1); one metric-channel extension (METRIC_REQUIRED_CHANNEL_UNAVAILABLE,
  //    introduced at C2_LAP_AUTHORITY) covers the partial-channel-gating semantic — a metric is
  //    structurally supported (passes evaluateMetricSupport) but the lap evidence does NOT carry the
  //    raw channels that metric requires, so the metric (and only that metric) must be blocked
  //    without poisoning the lap-level authority or unrelated metrics. See
  //    docs/r3.0c-contract-foundation.md §"Reason code extensions". ──
  var REASON_CODES = Object.freeze({
    MISSING_TRACK_IDENTITY: 'MISSING_TRACK_IDENTITY',
    TRACK_IDENTITY_MISMATCH: 'TRACK_IDENTITY_MISMATCH',
    MISSING_LAP_IDENTITY: 'MISSING_LAP_IDENTITY',
    INCOMPLETE_LAP: 'INCOMPLETE_LAP',
    INVALID_TIMING: 'INVALID_TIMING',
    INSUFFICIENT_SAMPLE_COVERAGE: 'INSUFFICIENT_SAMPLE_COVERAGE',
    DISCONTINUOUS_SAMPLES: 'DISCONTINUOUS_SAMPLES',
    MISSING_NORMALIZED_DISTANCE_AUTHORITY: 'MISSING_NORMALIZED_DISTANCE_AUTHORITY',
    INCOMPATIBLE_NORMALIZATION: 'INCOMPATIBLE_NORMALIZATION',
    REFERENCE_LAP_UNAVAILABLE: 'REFERENCE_LAP_UNAVAILABLE',
    COMPARISON_LAP_UNAVAILABLE: 'COMPARISON_LAP_UNAVAILABLE',
    CORNER_PAIRING_UNAVAILABLE: 'CORNER_PAIRING_UNAVAILABLE',
    UNSUPPORTED_METRIC: 'UNSUPPORTED_METRIC',
    INSUFFICIENT_CREDIBILITY_METADATA: 'INSUFFICIENT_CREDIBILITY_METADATA',
    SYNTHETIC_ONLY_LIMITATION: 'SYNTHETIC_ONLY_LIMITATION',
    INTERNAL_CONTRACT_VIOLATION: 'INTERNAL_CONTRACT_VIOLATION',
    // documented scope extensions — the comparison contract is bounded to a single Analysis Case / session:
    CROSS_CASE_COMPARISON_UNSUPPORTED: 'CROSS_CASE_COMPARISON_UNSUPPORTED',
    CROSS_SESSION_COMPARISON_UNSUPPORTED: 'CROSS_SESSION_COMPARISON_UNSUPPORTED',
    // documented partial-channel-gating extension — the metric is in the supported allowlist but the
    // raw channel(s) it requires are absent from the lap evidence; only that metric is blocked.
    METRIC_REQUIRED_CHANNEL_UNAVAILABLE: 'METRIC_REQUIRED_CHANNEL_UNAVAILABLE',
  });

  var ALL_REASON_CODES = Object.freeze(Object.keys(REASON_CODES).map(function (k) { return REASON_CODES[k]; }));

  // human-readable explanation HOOK — a stable i18n key per code (the consumer renders it; this is never prose).
  var EXPLANATION_KEYS = Object.freeze((function () {
    var m = {};
    ALL_REASON_CODES.forEach(function (c) { m[c] = 'r3_0c.reason.' + c.toLowerCase(); });
    return Object.freeze(m);
  })());

  function isReasonCode(c) { return typeof c === 'string' && Object.prototype.hasOwnProperty.call(EXPLANATION_KEYS, c); }
  function explanationKeyFor(c) { return isReasonCode(c) ? EXPLANATION_KEYS[c] : null; }

  // ── shared blocked-result factory (fail-closed). A blocked result NEVER carries a numeric payload. ──
  function _normCodes(reasonCodes) {
    var arr = Array.isArray(reasonCodes) ? reasonCodes : (reasonCodes == null ? [] : [reasonCodes]);
    var seen = {}, out = [];
    arr.forEach(function (c) { if (isReasonCode(c) && !seen[c]) { seen[c] = true; out.push(c); } });
    if (out.length === 0) out.push(REASON_CODES.INTERNAL_CONTRACT_VIOLATION); // fail-closed: never an empty block
    return out;
  }
  function buildBlockedResult(reasonCodes, opts) {
    opts = opts || {};
    var codes = _normCodes(reasonCodes);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: Object.freeze(codes.slice()),
      explanationKeys: Object.freeze(codes.map(explanationKeyFor)),
      credibility: 'Unavailable',
      detail: (opts.detail != null) ? String(opts.detail).slice(0, 200) : null, // bounded explanation hook
      result: null, // fail-closed: no numeric / comparison payload ever rides on a blocked result
    });
  }

  var api = {
    REASON_CODES: REASON_CODES,
    ALL_REASON_CODES: ALL_REASON_CODES,
    EXPLANATION_KEYS: EXPLANATION_KEYS,
    isReasonCode: isReasonCode,
    explanationKeyFor: explanationKeyFor,
    buildBlockedResult: buildBlockedResult,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ReasonCodes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
