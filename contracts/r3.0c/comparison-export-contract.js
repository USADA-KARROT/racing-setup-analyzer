/**
 * contracts/r3.0c/comparison-export-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the SEPARATE, opt-in comparison export ENVELOPE: a fixed schema identity
 * ('racing-analyzer/comparison-export') that is deliberately DISTINCT from the R3.0B / R2.3 case-export
 * schemas, an envelope constructor, and a fail-closed validator. CP1 wires NO real export command and embeds
 * NO data — the envelope structure forbids raw sample arrays BY CONSTRUCTION. No telemetry, no algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonExportContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('comparison-export-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // fixed, distinct schema identity for the comparison export (NOT the case bundle).
  var COMPARISON_EXPORT_IDENTITY = 'racing-analyzer/comparison-export';
  var COMPARISON_EXPORT_SCHEMA_VERSION = 1;
  // a bounded envelope: any array nested in the payload must be ≤ this (defensive raw-sample guard). No
  // legitimate CP1 comparison-summary field is longer; raw telemetry (thousands of samples) is rejected.
  var MAX_BOUNDED_ARRAY = 64; // mirrors the architecture's MAX_CORNERS_COMPARED bound
  var MAX_DEPTH = 8;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }

  // structural (NOT telemetry) scan: reject any array longer than the bound or a node deeper than MAX_DEPTH.
  function _payloadBounded(node, depth, errors, at) {
    if (depth > MAX_DEPTH) { errors.push('too_deep:' + at); return; }
    if (Array.isArray(node)) {
      if (node.length > MAX_BOUNDED_ARRAY) { errors.push('oversized_array:' + at); return; }
      for (var i = 0; i < node.length; i++) _payloadBounded(node[i], depth + 1, errors, at + '[]');
      return;
    }
    if (_isPlain(node)) { Object.keys(node).forEach(function (k) { _payloadBounded(node[k], depth + 1, errors, at + '.' + k); }); return; }
    // scalars (string/number/boolean/null) are fine; functions/symbols/exotic objects are not.
    if (node !== null && typeof node === 'object') errors.push('exotic_object:' + at);
    if (typeof node === 'function' || typeof node === 'symbol' || typeof node === 'bigint') errors.push('non_scalar:' + at);
  }

  /**
   * buildComparisonExportEnvelope(payload) — envelope constructor (plain-object builder). CP1 does not run a
   * real export, so `payload` defaults to null; if provided it must already be a bounded comparison SUMMARY
   * (no raw arrays). Returns a blocked result if the payload violates the bound.
   */
  function buildComparisonExportEnvelope(payload) {
    if (payload === undefined) payload = null;
    if (payload !== null) {
      if (!_isPlain(payload)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'export payload not an object' });
      var perrs = [];
      _payloadBounded(payload, 0, perrs, '');
      if (perrs.length) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: perrs[0] });
    }
    return Object.freeze({
      schemaIdentity: COMPARISON_EXPORT_IDENTITY,
      schemaVersion: COMPARISON_EXPORT_SCHEMA_VERSION,
      generatedAt: null, // CP1 stamps no time; a production exporter sets this
      payload: payload,   // null in CP1 — no comparison data is produced yet
    });
  }

  /**
   * validateComparisonExportEnvelope(env) — fail-closed validator.
   *   • non-object / wrong schemaIdentity → INTERNAL_CONTRACT_VIOLATION;
   *   • any schemaVersion other than EXACTLY the current one (−1 / 0 / 0.5 / future / non-number) →
   *     INTERNAL_CONTRACT_VIOLATION (fail-closed; never silently downgraded);
   *   • payload containing a raw/oversized array → INTERNAL_CONTRACT_VIOLATION.
   */
  function validateComparisonExportEnvelope(env) {
    if (!_isPlain(env)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'envelope not an object' });
    if (env.schemaIdentity !== COMPARISON_EXPORT_IDENTITY) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'wrong schema identity' });
    // fail-closed: CP1 recognises EXACTLY this schema version; -1 / 0 / 0.5 / future / non-number all reject.
    if (env.schemaVersion !== COMPARISON_EXPORT_SCHEMA_VERSION) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'unsupported schema version' });
    if (env.payload !== null && env.payload !== undefined) {
      if (!_isPlain(env.payload)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'payload not an object' });
      var errors = [];
      _payloadBounded(env.payload, 0, errors, '');
      if (errors.length) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: errors[0] });
    }
    return Object.freeze({
      valid: true,
      status: 'comparison_export_envelope_valid',
      schemaIdentity: COMPARISON_EXPORT_IDENTITY,
      schemaVersion: COMPARISON_EXPORT_SCHEMA_VERSION,
      reasonCodes: Object.freeze([]),
    });
  }

  // the comparison export identity MUST differ from a case-export identity (asserted by the contract tests
  // against the real frozen case-export modules). This helper makes that requirement first-class.
  function isDistinctFromCaseExportIdentity(caseExportIdentity) {
    return caseExportIdentity !== COMPARISON_EXPORT_IDENTITY;
  }

  var api = {
    COMPARISON_EXPORT_IDENTITY: COMPARISON_EXPORT_IDENTITY,
    COMPARISON_EXPORT_SCHEMA_VERSION: COMPARISON_EXPORT_SCHEMA_VERSION,
    MAX_BOUNDED_ARRAY: MAX_BOUNDED_ARRAY,
    buildComparisonExportEnvelope: buildComparisonExportEnvelope,
    validateComparisonExportEnvelope: validateComparisonExportEnvelope,
    isDistinctFromCaseExportIdentity: isDistinctFromCaseExportIdentity,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonExportContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
