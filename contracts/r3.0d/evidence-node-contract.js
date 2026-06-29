/**
 * contracts/r3.0d/evidence-node-contract.js — R3.0D D1 · Contract Foundation (NON-PRODUCTION).
 *
 * Defines the EvidenceNode SHAPE (the smallest unit of fact in the Decision Engine), the closed
 * category enum (directive §8 "Evidence分類"), the Observation sub-shape, and per-node bounded-honesty
 * limitation handling. D1 implements NO graph algorithm — the D2_EVIDENCE_GRAPH service builds + walks
 * the actual graph (dedup, cycle detection, orphan detection, double-counting prevention).
 *
 * Closed key set discipline: any extra own key on a caller-supplied EvidenceNode → UNKNOWN_OWN_KEY.
 * No getter / accessor / Symbol-key / non-enumerable extra reaches the contract; we use
 * Object.keys + descriptor-safe reads to detect every escape attempt.
 *
 * HARDENED-INTRINSICS REFACTOR (2026-06-29): all ambient intrinsic calls routed through
 * hardened-intrinsics.js safe wrappers. Replaced:
 *   - Object.freeze(...)            → HI.deepFreeze (enum tables + every validator return value)
 *   - Object.getPrototypeOf(v)      → HI.safeIsPlainShape (composite plain-object check)
 *   - Array.isArray(v)              → HI.safeIsArray
 *   - Reflect.ownKeys(o)            → HI.safeOwnKeys
 *   - list.indexOf(v) / arr.indexOf → HI.safeArrayIndexOf
 *   - arr.push(x)                   → HI.safeArrayPush
 *   - reasons.push.apply(reasons,a) → HI.safeArrayForEach + HI.safeArrayPush
 *   - reasons.forEach(fn)           → HI.safeArrayForEach
 *   - arr.slice()                   → HI.safeArraySlice
 *   - Number.isInteger              → HI.safeNumberIsInteger
 *   - /regex/.test(s)               → HI.safeRegExpTest
 *   - new TextEncoder().encode().length → HI.safeUtf8ByteLength
 *   - Object.assign({}, params)     → HI.safeObjectAssign on a fresh literal `{}`
 *
 * Plain `{}` / `[]` literal construction is retained — those use [[CreateDataPropertyOrThrow]]
 * (not [[Set]]) and cannot be subverted by prototype setters. Property assignment to those
 * fresh containers is routed through safeDefineDataProperty (inside the safe wrappers).
 *
 * Semantic behaviour preserved exactly: every reason code path, every validator outcome, every
 * Codex D1 R1/R2 defence-in-depth comment is kept verbatim. `_hasOnlyAllowedKeys` still rejects
 * Symbol-keyed + non-enumerable own properties (RN-01 closure).
 *
 * UMD: Node require / Electron renderer global (R3_0D_EvidenceNodeContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0D_ReasonCodes !== 'undefined' ? R3_0D_ReasonCodes : undefined);
  var CR = _req('./credibility-contract.js', typeof R3_0D_CredibilityContract !== 'undefined' ? R3_0D_CredibilityContract : undefined);
  var SI = _req('./source-identity-contract.js', typeof R3_0D_SourceIdentityContract !== 'undefined' ? R3_0D_SourceIdentityContract : undefined);
  if (!RC || !CR || !SI) throw new Error('evidence-node-contract.js requires reason-codes + credibility + source-identity contracts');
  var HI = _req('./hardened-intrinsics.js', typeof R3_0D_HardenedIntrinsics !== 'undefined' ? R3_0D_HardenedIntrinsics : undefined);
  if (!HI) throw new Error('evidence-node-contract.js requires hardened-intrinsics.js');
  var CODES = RC.REASON_CODES;

  // Directive §8 "Evidence分類" — closed set. `unknown` is allowed for the rare case where a node is
  // emitted before the category is determined (the priority engine then deprioritises it). New
  // categories must be added here AND to the schema test fixture — no caller-supplied free-form value.
  var EVIDENCE_CATEGORIES = HI.deepFreeze(['data_quality', 'mapping_calibration', 'driver_behaviour', 'vehicle_response', 'setup_model', 'unknown']);

  // EvidenceNode closed key set (D1 SHAPE).
  var EVIDENCE_NODE_KEYS = HI.deepFreeze([
    'nodeId',
    'category',
    'identity',          // SourceIdentity (caseId, sessionId, lapId?, sourceId, sourceVersion, freshness)
    'credibility',       // EVIDENCE_CREDIBILITY enum
    'provenance',        // PROVENANCE enum
    'availability',      // AVAILABILITY enum
    'confidence',        // D1: { state: 'unresolved' | 'not_computed' } only
    'observation',       // structured observation payload (closed schema below)
    'limitations',       // array of LIMITATION_* codes (bounded honesty)
    'supportingEdges',   // array of nodeId strings (other evidence supporting this one)
    'contradictingEdges',// array of nodeId strings (other evidence contradicting this one)
    'schemaVersion',     // integer; rejects future schemas at D1
  ]);

  // Observation closed key set. The observation is the FACT this node carries (e.g. a metric value,
  // a flag that a channel is missing). The shape is intentionally minimal at D1 — domain-specific
  // fields belong to category-specific specialisations introduced at D2 / D3.
  var OBSERVATION_KEYS = HI.deepFreeze(['kind', 'i18nKey', 'params', 'channel']);
  var OBSERVATION_KIND_ALLOWED = HI.deepFreeze(['metric_value', 'metric_threshold_crossed', 'channel_missing', 'channel_uncalibrated', 'channel_partial', 'lap_authority_blocked', 'comparison_blocked', 'qualitative_marker']);

  // Schema version pin. A node whose schemaVersion is HIGHER than D1's SUPPORTED_SCHEMA_VERSION is
  // rejected with UNSUPPORTED_FUTURE_SCHEMA — a future-schema node must NEVER be silently accepted.
  var SUPPORTED_SCHEMA_VERSION = 1;

  // Caps. Directive §8: "array caps, graph caps, total envelope cap".
  var LIMITATIONS_ARRAY_CAP = 32;
  var EDGES_ARRAY_CAP = 64;
  var STRING_BYTE_CAP = 512;     // per-field
  var PARAMS_VALUE_BYTE_CAP = 256;

  // NodeId grammar. Directive: "no private path, no filename, no raw telemetry, deterministic / secure
  // immutable id, caller cannot collide". The contract enforces a grammar (no '/', no '..', no '\\',
  // no leading '.'); production-side D2 layer adds collision detection.
  var NODE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var NODE_ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  // _isPlain(v) — routed through HI.safeIsPlainShape so the Object.prototype identity check uses
  // hardened-intrinsics' captured _ObjectPrototype reference (no ambient lookup).
  function _isPlain(v) { return HI.safeIsPlainShape(v) === 'plain-object'; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D1 R1 Finding RN-01 closure: Reflect.ownKeys catches non-enumerable + Symbol-keyed.
  // Now via HI.safeOwnKeys (captured Reflect.ownKeys behind Reflect.apply — no rebind).
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) return false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
    }
    return true;
  }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  // UTF-8 byte width via captured TextEncoder (manual fallback inside HI handles the no-TextEncoder
  // path — see hardened-intrinsics.js safeUtf8ByteLength).
  function _utf8Bytes(s) { return HI.safeUtf8ByteLength(s); }
  function _isStringCodeArray(v, cap) {
    if (!HI.safeIsArray(v) || v.length > cap) return false;
    for (var i = 0; i < v.length; i++) if (typeof v[i] !== 'string' || v[i].length === 0) return false;
    return true;
  }

  /**
   * validateObservationShape(o) — closed-key plain object with kind ∈ OBSERVATION_KIND_ALLOWED,
   * i18nKey non-empty string (no UI prose at D1), optional params plain object whose own values are
   * finite numbers, booleans, null, or short strings (≤ PARAMS_VALUE_BYTE_CAP).
   */
  function validateObservationShape(o) {
    // RN-02 closure: outer try/catch.
    try {
    if (!_isPlain(o)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation not a plain object' });
    if (!_hasOnlyAllowedKeys(o, OBSERVATION_KEYS)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
    if (HI.safeArrayIndexOf(OBSERVATION_KIND_ALLOWED, o.kind) === -1) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.kind not allowed' });
    if (!_nonEmptyStr(o.i18nKey)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.i18nKey missing' });
    if (_utf8Bytes(o.i18nKey) > STRING_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]);
    if ('channel' in o && o.channel !== null && !_nonEmptyStr(o.channel)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
    if ('params' in o && o.params !== null && o.params !== undefined) {
      if (!_isPlain(o.params)) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      // Codex D1 R2 Finding RN-07 closure: Reflect.ownKeys + Symbol rejection mirrors validateParamsShape.
      // Now via HI.safeOwnKeys (captured Reflect.ownKeys + Reflect.apply, not rebindable).
      var pk = HI.safeOwnKeys(o.params);
      if (pk === null) return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID]);
      for (var i = 0; i < pk.length; i++) {
        var k = pk[i];
        if (typeof k === 'symbol') return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.UNKNOWN_OWN_KEY]);
        var v = o.params[k];
        if (v === null || typeof v === 'boolean') continue;
        if (typeof v === 'number') { if (!_isFiniteNum(v)) return RC.buildBlockedResult([CODES.NUMERIC_INVALID]); continue; }
        if (typeof v === 'string') { if (_utf8Bytes(v) > PARAMS_VALUE_BYTE_CAP) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED]); continue; }
        return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID], { detail: 'observation.params value type not allowed' });
      }
    }
    return HI.deepFreeze({ valid: true });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_OBSERVATION_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'observation validator threw on hostile input' });
    }
  }

  /**
   * validateEvidenceNodeShape(n) — D1 STRUCTURAL gate. Composes credibility, source-identity, and
   * observation validators. Returns { valid:true } or buildBlockedResult.
   *
   * D1 does NOT validate the graph relations (cycles, orphans, double-counting) — that is the D2
   * EVIDENCE_GRAPH service's job. D1 ONLY proves a single node's STRUCTURE.
   */
  function validateEvidenceNodeShape(nIn) {
    // Outer try/catch + Codex D1 R2 RN-06 Proxy-rejection input clone.
    try {
    if (!RC.isOriginalPlainObject(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'node prototype is not Object.prototype or null (class instance / Proxy / non-plain rejected pre-clone)' });
    if (RC.hasHiddenOwnKey(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'node carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(nIn)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'node contains a nested non-plain object (class instance laundered through identity / confidence / observation)' });
    var n = RC.toCleanCopy(nIn);
    if (!_isPlain(n)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID], { detail: 'node not a plain object (or proxy/non-cloneable rejected)' });
    if (!_hasOnlyAllowedKeys(n, EVIDENCE_NODE_KEYS)) return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.UNKNOWN_OWN_KEY]);
    var reasons = [];

    // schemaVersion: must be the integer SUPPORTED_SCHEMA_VERSION. Higher → UNSUPPORTED_FUTURE_SCHEMA.
    if (!HI.safeNumberIsInteger(n.schemaVersion)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID);
    else if (n.schemaVersion > SUPPORTED_SCHEMA_VERSION) HI.safeArrayPush(reasons, CODES.UNSUPPORTED_FUTURE_SCHEMA);
    else if (n.schemaVersion < 1) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID);

    // nodeId
    if (!_nonEmptyStr(n.nodeId)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_MISSING_ID);
    else if (HI.safeRegExpTest(NODE_ID_FORBIDDEN_RE, n.nodeId) || !HI.safeRegExpTest(NODE_ID_RE, n.nodeId)) HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_ID_FORBIDDEN);

    // category
    if (HI.safeArrayIndexOf(EVIDENCE_CATEGORIES, n.category) === -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_CATEGORY_UNKNOWN);

    // identity
    var idCheck = SI.validateSourceIdentity(n.identity);
    if (idCheck.valid !== true) {
      var idCodes = idCheck.reasonCodes;
      if (HI.safeIsArray(idCodes)) {
        HI.safeArrayForEach(idCodes, function (c) { HI.safeArrayPush(reasons, c); });
      } else {
        HI.safeArrayPush(reasons, CODES.SOURCE_IDENTITY_INVALID);
      }
    }

    // credibility, provenance, availability
    var crCheck = CR.validateEvidenceCredibility(n.credibility);
    if (crCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_CREDIBILITY_INVALID);
    var prCheck = CR.validateProvenance(n.provenance);
    if (prCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_PROVENANCE_INVALID);
    var avCheck = CR.validateAvailability(n.availability);
    if (avCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_OBSERVATION_INVALID);

    // confidence (D1: caller cannot supply numeric)
    var cfCheck = CR.validateConfidenceShape(n.confidence);
    if (cfCheck.valid !== true) HI.safeArrayPush(reasons, CODES.EVIDENCE_CONFIDENCE_FORBIDDEN);

    // observation — propagate inner reasonCodes so NUMERIC_INVALID / BYTE_CAP_EXCEEDED surface to the caller
    var obCheck = validateObservationShape(n.observation);
    if (obCheck.valid !== true) {
      HI.safeArrayPush(reasons, CODES.EVIDENCE_OBSERVATION_INVALID);
      if (HI.safeIsArray(obCheck.reasonCodes)) {
        HI.safeArrayForEach(obCheck.reasonCodes, function (c) { HI.safeArrayPush(reasons, c); });
      }
    }

    // limitations array — closed code list, bounded length
    if (!_isStringCodeArray(n.limitations, LIMITATIONS_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);
    else {
      for (var li = 0; li < n.limitations.length; li++) {
        var lc = n.limitations[li];
        if (!RC.isReasonCode(lc)) { HI.safeArrayPush(reasons, CODES.EVIDENCE_NODE_INVALID); break; }
      }
    }

    // edges arrays
    if (!_isStringCodeArray(n.supportingEdges, EDGES_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);
    if (!_isStringCodeArray(n.contradictingEdges, EDGES_ARRAY_CAP)) HI.safeArrayPush(reasons, CODES.ARRAY_CAP_EXCEEDED);

    // self-reference (D1 catches the easy case; D2 catches deep cycles)
    if (_nonEmptyStr(n.nodeId)) {
      var supEdges = HI.safeIsArray(n.supportingEdges) ? n.supportingEdges : [];
      var conEdges = HI.safeIsArray(n.contradictingEdges) ? n.contradictingEdges : [];
      if (HI.safeArrayIndexOf(supEdges, n.nodeId) !== -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_GRAPH_SELF_REFERENCE);
      if (HI.safeArrayIndexOf(conEdges, n.nodeId) !== -1) HI.safeArrayPush(reasons, CODES.EVIDENCE_GRAPH_SELF_REFERENCE);
    }

    // synthetic-honesty: a synthetic provenance MUST declare LIMITATION_SYNTHETIC_ONLY in limitations.
    if (n.provenance === 'synthetic') {
      var lims = HI.safeIsArray(n.limitations) ? n.limitations : [];
      if (HI.safeArrayIndexOf(lims, CR.SYNTHETIC_LIMITATION_REQUIRED) === -1) HI.safeArrayPush(reasons, CODES.LIMITATION_SYNTHETIC_ONLY);
    }

    // heuristic credibility: MUST declare LIMITATION_HEURISTIC_ONLY. Same posture as synthetic.
    if (n.credibility === 'heuristic') {
      var lims2 = HI.safeIsArray(n.limitations) ? n.limitations : [];
      if (HI.safeArrayIndexOf(lims2, CODES.LIMITATION_HEURISTIC_ONLY) === -1) HI.safeArrayPush(reasons, CODES.LIMITATION_HEURISTIC_ONLY);
    }

    if (reasons.length) {
      var seen = {}, out = [];
      HI.safeArrayForEach(reasons, function (c) { if (!seen[c]) { seen[c] = true; HI.safeArrayPush(out, c); } });
      return RC.buildBlockedResult(out);
    }
    // sanitized = a frozen plain copy with only the declared keys; downstream consumers should use
    // this rather than the caller object to avoid TOCTOU on a Proxy getter.
    return HI.deepFreeze({
      valid: true,
      sanitized: HI.deepFreeze({
        schemaVersion: n.schemaVersion,
        nodeId: n.nodeId,
        category: n.category,
        identity: HI.deepFreeze({
          caseId: n.identity.caseId,
          sessionId: n.identity.sessionId,
          lapId: ('lapId' in n.identity) ? n.identity.lapId : null,
          sourceId: n.identity.sourceId,
          sourceVersion: n.identity.sourceVersion,
          freshness: n.identity.freshness,
        }),
        credibility: n.credibility,
        provenance: n.provenance,
        availability: n.availability,
        confidence: HI.deepFreeze({ state: n.confidence.state }),
        observation: HI.deepFreeze({
          kind: n.observation.kind,
          i18nKey: n.observation.i18nKey,
          params: n.observation.params ? HI.deepFreeze(HI.safeObjectAssign({}, n.observation.params)) : null,
          channel: ('channel' in n.observation) ? n.observation.channel : null,
        }),
        limitations: HI.deepFreeze(HI.safeArraySlice(n.limitations)),
        supportingEdges: HI.deepFreeze(HI.safeArraySlice(n.supportingEdges)),
        contradictingEdges: HI.deepFreeze(HI.safeArraySlice(n.contradictingEdges)),
      }),
    });
    } catch (e) {
      return RC.buildBlockedResult([CODES.EVIDENCE_NODE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'evidence node validator threw on hostile input' });
    }
  }

  var api = {
    EVIDENCE_CATEGORIES: EVIDENCE_CATEGORIES,
    EVIDENCE_NODE_KEYS: EVIDENCE_NODE_KEYS,
    OBSERVATION_KEYS: OBSERVATION_KEYS,
    OBSERVATION_KIND_ALLOWED: OBSERVATION_KIND_ALLOWED,
    SUPPORTED_SCHEMA_VERSION: SUPPORTED_SCHEMA_VERSION,
    LIMITATIONS_ARRAY_CAP: LIMITATIONS_ARRAY_CAP,
    EDGES_ARRAY_CAP: EDGES_ARRAY_CAP,
    STRING_BYTE_CAP: STRING_BYTE_CAP,
    PARAMS_VALUE_BYTE_CAP: PARAMS_VALUE_BYTE_CAP,
    NODE_ID_RE: NODE_ID_RE,
    validateObservationShape: validateObservationShape,
    validateEvidenceNodeShape: validateEvidenceNodeShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EvidenceNodeContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
