/**
 * contracts/r3.0c/comparison-export-contract.js — R3.0C CP1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the SEPARATE, opt-in comparison export ENVELOPE: a fixed schema identity
 * ('racing-analyzer/comparison-export') that is deliberately DISTINCT from the R3.0B / R2.3 case-export
 * schemas, an envelope constructor, and a fail-closed validator. CP1 wires NO real export command and embeds
 * NO data — the envelope structure forbids raw sample arrays BY CONSTRUCTION. No telemetry, no algorithm.
 *
 * CP1 round-2 retrofit (governance/r3.0c/cp1-retrofit-matrix.md F1 / F2 / F3):
 *   • the envelope OWNS exactly { schemaIdentity, schemaVersion, generatedAt, payload } — any other
 *     own-key on the envelope fails closed (EXPORT_ENVELOPE_UNKNOWN_KEY) so a caller cannot smuggle
 *     fields past the validator;
 *   • payload numeric scalars must be finite — NaN / Infinity / -Infinity reject
 *     (EXPORT_PAYLOAD_NON_FINITE_NUMBER) so a JSON round-trip cannot silently coerce them to null
 *     and so a sender cannot encode a sentinel as a finite-looking value;
 *   • payload strings are capped per-string (MAX_STRING_UTF8_BYTES) and the whole envelope is capped
 *     by its serialised UTF-8 byte size (MAX_ENVELOPE_UTF8_BYTES) — these close the
 *     "raw-telemetry-as-base64-string" + "summary-grows-unbounded" smuggling vectors that the
 *     array-only bound did not catch (EXPORT_PAYLOAD_STRING_TOO_LONG /
 *     EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE).
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
  // CP1 round-2 retrofit byte caps (F3). Per-string is small enough to forbid base64-smuggled raw
  // telemetry; envelope total is large enough for the bounded summary architecture v3 §(7) describes
  // but small enough to fail closed if the summary grows unbounded.
  var MAX_STRING_UTF8_BYTES = 4 * 1024;        // 4 KiB per individual string field
  var MAX_ENVELOPE_UTF8_BYTES = 256 * 1024;    // 256 KiB total envelope serialised size

  // closed own-key set for the envelope (F1). Anything else on the envelope object fails closed.
  var ENVELOPE_KEYS = Object.freeze(['schemaIdentity', 'schemaVersion', 'generatedAt', 'payload']);
  var ENVELOPE_KEY_SET = (function () { var s = Object.create(null); ENVELOPE_KEYS.forEach(function (k) { s[k] = true; }); return s; })();

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _isFiniteNumber(n) { return typeof n === 'number' && n === n && n !== Infinity && n !== -Infinity; }
  function _utf8ByteLength(s) {
    // Node Buffer is the cheapest accurate count; fall back to TextEncoder; final fallback walks code units.
    if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') return Buffer.byteLength(s, 'utf8');
    if (typeof TextEncoder !== 'undefined') { try { return new TextEncoder().encode(s).length; } catch (e) { /* fall through */ } }
    var n = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 0x80) n += 1;
      else if (c < 0x800) n += 2;
      else if (c >= 0xD800 && c <= 0xDBFF) { n += 4; i++; }
      else n += 3;
    }
    return n;
  }

  // structural (NOT telemetry) scan: reject any array longer than the bound, a node deeper than MAX_DEPTH,
  // a non-finite number, an oversized string, an exotic object, or a non-scalar value.
  function _payloadBounded(node, depth, errors, at) {
    if (depth > MAX_DEPTH) { errors.push({ kind: 'too_deep', at: at }); return; }
    if (Array.isArray(node)) {
      if (node.length > MAX_BOUNDED_ARRAY) { errors.push({ kind: 'oversized_array', at: at }); return; }
      for (var i = 0; i < node.length; i++) _payloadBounded(node[i], depth + 1, errors, at + '[' + i + ']');
      return;
    }
    if (_isPlain(node)) { Object.keys(node).forEach(function (k) { _payloadBounded(node[k], depth + 1, errors, at + '.' + k); }); return; }
    // numeric fields must be FINITE — NaN / Infinity / -Infinity all reject (F2).
    if (typeof node === 'number') {
      if (!_isFiniteNumber(node)) errors.push({ kind: 'non_finite_number', at: at });
      return;
    }
    // string fields are length-capped per-field (F3).
    if (typeof node === 'string') {
      if (_utf8ByteLength(node) > MAX_STRING_UTF8_BYTES) errors.push({ kind: 'string_too_long', at: at });
      return;
    }
    // boolean / null are always fine.
    if (node === null || typeof node === 'boolean') return;
    // exotic objects (Date / Map / Set / RegExp / class instances / Proxy / Buffer / typed arrays)
    // — anything object-shaped but not plain and not Array is refused.
    if (typeof node === 'object') { errors.push({ kind: 'exotic_object', at: at }); return; }
    // anything else (function / symbol / bigint / undefined) refuses.
    errors.push({ kind: 'non_scalar', at: at });
  }

  // map a _payloadBounded error kind to its public reason code.
  function _reasonForErrorKind(kind) {
    if (kind === 'non_finite_number') return CODES.EXPORT_PAYLOAD_NON_FINITE_NUMBER;
    if (kind === 'string_too_long') return CODES.EXPORT_PAYLOAD_STRING_TOO_LONG;
    return CODES.INTERNAL_CONTRACT_VIOLATION; // too_deep / oversized_array / exotic_object / non_scalar
  }

  // strict envelope own-key check (F1). Returns null when ok or the offending key name.
  function _firstUnknownEnvelopeKey(env) {
    var ks = Object.keys(env);
    for (var i = 0; i < ks.length; i++) if (!ENVELOPE_KEY_SET[ks[i]]) return ks[i];
    return null;
  }

  // total-envelope-size guard (F3). Serialise the envelope and measure UTF-8 bytes. We only do this
  // when payload is non-null; the empty envelope is trivially small.
  function _envelopeWithinTotalByteCap(env) {
    try {
      var json = JSON.stringify(env);
      if (typeof json !== 'string') return false; // unserialisable — fail closed
      return _utf8ByteLength(json) <= MAX_ENVELOPE_UTF8_BYTES;
    } catch (e) {
      return false; // serialisation threw (e.g. a getter in payload) — fail closed
    }
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
      if (perrs.length) return RC.buildBlockedResult([_reasonForErrorKind(perrs[0].kind)], { detail: perrs[0].kind + ':' + perrs[0].at });
    }
    var env = Object.freeze({
      schemaIdentity: COMPARISON_EXPORT_IDENTITY,
      schemaVersion: COMPARISON_EXPORT_SCHEMA_VERSION,
      generatedAt: null, // CP1 stamps no time; a production exporter sets this
      payload: payload,   // null in CP1 — no comparison data is produced yet
    });
    // total-envelope byte cap (F3). A constructed envelope must still fit within the total cap.
    if (!_envelopeWithinTotalByteCap(env)) return RC.buildBlockedResult([CODES.EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE], { detail: 'envelope exceeds MAX_ENVELOPE_UTF8_BYTES' });
    return env;
  }

  /**
   * validateComparisonExportEnvelope(env) — fail-closed validator.
   *   • non-object / wrong schemaIdentity → INTERNAL_CONTRACT_VIOLATION;
   *   • any schemaVersion other than EXACTLY the current one (−1 / 0 / 0.5 / future / non-number) →
   *     INTERNAL_CONTRACT_VIOLATION (fail-closed; never silently downgraded);
   *   • any unknown envelope own-key → EXPORT_ENVELOPE_UNKNOWN_KEY (F1);
   *   • payload containing a raw/oversized array → INTERNAL_CONTRACT_VIOLATION;
   *   • payload containing non-finite numbers → EXPORT_PAYLOAD_NON_FINITE_NUMBER (F2);
   *   • payload containing oversized strings → EXPORT_PAYLOAD_STRING_TOO_LONG (F3);
   *   • envelope exceeding MAX_ENVELOPE_UTF8_BYTES → EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE (F3).
   */
  function validateComparisonExportEnvelope(env) {
    if (!_isPlain(env)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'envelope not an object' });
    // closed envelope own-key set (F1) — check BEFORE field-by-field so a smuggled secret never reaches
    // the per-field validators on a structurally-plausible envelope.
    var unknown = _firstUnknownEnvelopeKey(env);
    if (unknown !== null) return RC.buildBlockedResult([CODES.EXPORT_ENVELOPE_UNKNOWN_KEY], { detail: 'unknown envelope key: ' + String(unknown).slice(0, 60) });
    if (env.schemaIdentity !== COMPARISON_EXPORT_IDENTITY) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'wrong schema identity' });
    // fail-closed: CP1 recognises EXACTLY this schema version; -1 / 0 / 0.5 / future / non-number all reject.
    if (env.schemaVersion !== COMPARISON_EXPORT_SCHEMA_VERSION) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'unsupported schema version' });
    if (env.payload !== null && env.payload !== undefined) {
      if (!_isPlain(env.payload)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'payload not an object' });
      var errors = [];
      _payloadBounded(env.payload, 0, errors, '');
      if (errors.length) return RC.buildBlockedResult([_reasonForErrorKind(errors[0].kind)], { detail: errors[0].kind + ':' + errors[0].at });
    }
    // total-envelope byte cap (F3).
    if (!_envelopeWithinTotalByteCap(env)) return RC.buildBlockedResult([CODES.EXPORT_PAYLOAD_ENVELOPE_TOO_LARGE], { detail: 'envelope exceeds MAX_ENVELOPE_UTF8_BYTES' });
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
    MAX_STRING_UTF8_BYTES: MAX_STRING_UTF8_BYTES,
    MAX_ENVELOPE_UTF8_BYTES: MAX_ENVELOPE_UTF8_BYTES,
    ENVELOPE_KEYS: Object.freeze(ENVELOPE_KEYS.slice()),
    buildComparisonExportEnvelope: buildComparisonExportEnvelope,
    validateComparisonExportEnvelope: validateComparisonExportEnvelope,
    isDistinctFromCaseExportIdentity: isDistinctFromCaseExportIdentity,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonExportContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
