/**
 * contracts/r3.0c/credibility-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the credibility-metadata CONTRACT for a comparison result: which fields a domain/service layer
 * MUST supply, the allowed enums, and a fail-closed validator. Credibility is OWNED by the domain/service
 * (it is an INPUT here); a UI/consumer never derives it. This module only VALIDATES caller-supplied
 * authority — it computes no new measurement and reads no telemetry.
 *
 * Ladder + provenance enums mirror docs/credibility-and-trust.md and the R3.0B case-record enums so the
 * vocabulary cannot drift. NON-PRODUCTION: no renderer dependency, no runtime consumer, no algorithm.
 *
 * UMD: Node require / Electron renderer global (R3_0C_CredibilityContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('credibility-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // credibility ladder (docs/credibility-and-trust.md) + provenance (R3.0B case-record enums). Frozen.
  var CREDIBILITY_LADDER = Object.freeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);
  var PROVENANCE = Object.freeze(['synthetic', 'real', 'unverified']);
  var CONFIDENCE = Object.freeze(['low', 'medium', 'high']);
  // the metadata bundle every conclusion must carry (mirrors credibility-and-trust.md "Every conclusion carries").
  var REQUIRED_FIELDS = Object.freeze(['credibility', 'provenance', 'confidence', 'limitations', 'blockedReasons']);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _inEnum(list, v) { return typeof v === 'string' && list.indexOf(v) !== -1; }
  function _isStringArray(v) { return Array.isArray(v) && v.every(function (x) { return typeof x === 'string'; }); }

  /**
   * validateCredibilityMetadata(meta) — fail-closed structural validation of caller-supplied credibility
   * metadata. Returns { valid:boolean, reasonCodes:[...] }. It NEVER fabricates or upgrades credibility:
   *   • any missing/blank required field, or an out-of-enum value → INSUFFICIENT_CREDIBILITY_METADATA;
   *   • provenance 'synthetic' MUST be accompanied by the SYNTHETIC_ONLY_LIMITATION marker and may NEVER
   *     be presented as 'real' — synthetic never masquerades as real (docs/credibility-and-trust.md).
   */
  function validateCredibilityMetadata(meta) {
    var reasons = [];
    if (!_isPlain(meta)) return { valid: false, reasonCodes: [CODES.INSUFFICIENT_CREDIBILITY_METADATA] };
    REQUIRED_FIELDS.forEach(function (f) { if (!(f in meta) || meta[f] == null) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA); });
    if ('credibility' in meta && !_inEnum(CREDIBILITY_LADDER, meta.credibility)) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA);
    if ('provenance' in meta && !_inEnum(PROVENANCE, meta.provenance)) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA);
    if ('confidence' in meta && !_inEnum(CONFIDENCE, meta.confidence)) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA);
    if ('limitations' in meta && meta.limitations != null && !_isStringArray(meta.limitations)) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA);
    if ('blockedReasons' in meta && meta.blockedReasons != null && !Array.isArray(meta.blockedReasons)) reasons.push(CODES.INSUFFICIENT_CREDIBILITY_METADATA);
    // synthetic honesty: synthetic data must declare its limitation and can never be labelled 'real'.
    if (meta.provenance === 'synthetic') {
      var lims = _isStringArray(meta.limitations) ? meta.limitations : [];
      if (lims.indexOf(CODES.SYNTHETIC_ONLY_LIMITATION) === -1) reasons.push(CODES.SYNTHETIC_ONLY_LIMITATION);
    }
    // dedupe
    var seen = {}, out = [];
    reasons.forEach(function (c) { if (!seen[c]) { seen[c] = true; out.push(c); } });
    return { valid: out.length === 0, reasonCodes: out };
  }

  /**
   * normalizeCredibilityMetadata(meta) — pass-through assembler: validate then return a frozen copy of the
   * caller-supplied authority, or a blocked result. It DERIVES nothing (no credibility is invented here).
   */
  function normalizeCredibilityMetadata(meta) {
    var v = validateCredibilityMetadata(meta);
    if (!v.valid) return RC.buildBlockedResult(v.reasonCodes);
    return Object.freeze({
      eligible: true,
      status: 'credibility_metadata_valid',
      credibility: meta.credibility,
      provenance: meta.provenance,
      confidence: meta.confidence,
      limitations: Object.freeze(meta.limitations.slice()),
      blockedReasons: Object.freeze(meta.blockedReasons.slice()),
      derivedHere: false, // the contract never derives credibility; it is supplied by the domain/service
    });
  }

  var api = {
    CREDIBILITY_LADDER: CREDIBILITY_LADDER,
    PROVENANCE: PROVENANCE,
    CONFIDENCE: CONFIDENCE,
    REQUIRED_FIELDS: REQUIRED_FIELDS,
    validateCredibilityMetadata: validateCredibilityMetadata,
    normalizeCredibilityMetadata: normalizeCredibilityMetadata,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_CredibilityContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
