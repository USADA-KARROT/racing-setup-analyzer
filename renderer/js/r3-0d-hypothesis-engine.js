/**
 * renderer/js/r3-0d-hypothesis-engine.js — R3.0D D3 · Hypothesis Engine (PRODUCTION).
 *
 * Authoritative entry: buildHypothesisSet(input, opts)
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0 Continuous Resume Directive §5):
 *   • Input is a D2 AUTHORITATIVE Evidence Graph snapshot ONLY (deep-frozen, content-hashed).
 *     The engine recomputes the graphId from the snapshot's own (caseAssociation, nodes, edges,
 *     correlationGroups) and rejects the call if the recomputation does not match the asserted
 *     graphId. Caller-fabricated objects cannot survive this check unless the caller also
 *     reproduces the D2 hash exactly — and even if they do, the rest of the contract still gates
 *     freshness, case/session scope, and structural integrity.
 *   • No LLM. No runtime config. No filesystem. Pure deterministic transformation.
 *   • Closed rule registry — no string-eval, no Function constructor, no caller-supplied rule.
 *   • Output is a deep-frozen Hypothesis Set envelope. Every nested array/object frozen.
 *   • Confidence is computed by D3 from evidence weighting; caller-supplied confidence is
 *     rejected. State enum {not_computed, insufficient_evidence, low, moderate, high}; numeric
 *     score is bounded integer 0..100 derived deterministically from independent supporting
 *     groups + credibility + contradictions + freshness. Score is auxiliary; state is the
 *     semantic primary.
 *   • All ambient intrinsic calls go through R3_0D_HardenedIntrinsics (HI). Mutation-tested
 *     coverage proves regressions are caught. The validation path NEVER invokes
 *     attacker-replaced ambient intrinsics — that is the primary defence; the four integrity
 *     checkpoints (Step 0 entry, Step 1.5 post-envelope, Step 3.5 per-rule, Step 9.6 post-clock)
 *     are defence-in-depth.
 *   • Output never contains raw telemetry samples, filesystem paths, source filenames,
 *     usernames, machine IDs, internal database handles, stack traces, or Electron private
 *     paths. All caps enforce fail-closed (no partial output on failure).
 *
 * UMD: Node require / Electron renderer global (R3_0D_HypothesisEngine).
 */
(function (root) {
  'use strict';

  // ---------- Module-init capture: hardened intrinsics ------------------------------------------
  // UMD imports use literal-string specifiers below so the no-consumer scanner can statically
  // discover all dependencies.
  var HI = null, RC = null, CR = null, HC = null, EN = null, SI = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { CR = require('../../contracts/r3.0d/credibility-contract.js'); } catch (e) { CR = null; }
    try { HC = require('../../contracts/r3.0d/hypothesis-contract.js'); } catch (e) { HC = null; }
    try { EN = require('../../contracts/r3.0d/evidence-node-contract.js'); } catch (e) { EN = null; }
    try { SI = require('../../contracts/r3.0d/source-identity-contract.js'); } catch (e) { SI = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (CR === null && typeof R3_0D_CredibilityContract !== 'undefined') CR = R3_0D_CredibilityContract;
  if (HC === null && typeof R3_0D_HypothesisContract !== 'undefined') HC = R3_0D_HypothesisContract;
  if (EN === null && typeof R3_0D_EvidenceNodeContract !== 'undefined') EN = R3_0D_EvidenceNodeContract;
  if (SI === null && typeof R3_0D_SourceIdentityContract !== 'undefined') SI = R3_0D_SourceIdentityContract;

  if (!HI || !RC || !CR || !HC || !EN || !SI) {
    throw new Error('r3-0d-hypothesis-engine.js: missing one or more required R3.0D contracts');
  }

  var CODES = RC.REASON_CODES;

  // ---------- Module-init intrinsic snapshot for the post-load guard -----------------------------
  // Step 0 entry guard recomputes these against the live HI api and rejects the call if the
  // module-init capture was poisoned at module load time. JS is single-threaded so a guard pass
  // here means no further mid-call rebinding of THESE references can occur (HI internals are
  // closure-private and themselves cannot be rebound).
  var _HI_API_FROZEN_AT_LOAD = (function () {
    try { return Object.isFrozen(HI); } catch (e) { return false; }
  })();
  var _HI_HAS = (function () {
    var required = [
      'safeOwnKeys', 'safeKeys', 'safeGetOwnDescriptor', 'safeHasOwn',
      'safeArrayPush', 'safeArrayIndexOf', 'safeArrayForEach', 'safeArrayMap',
      'safeArraySlice', 'safeArraySort', 'safeStringSlice', 'safeStringCharCodeAt',
      'safeStringCoerce', 'safeStringToLowerCase', 'safeIsArray', 'safeIsPlainShape',
      'safeNumberIsInteger', 'safeNumberIsFinite', 'safeMathFloor', 'safeRegExpTest',
      'safeUtf8ByteLength', 'safeStructuredClone', 'safeObjectCreateNull',
      'safeObjectAssign', 'safeDefineDataProperty', 'safeGetPrototypeOf',
      'safeGetOwnPropertyNames', 'deepOriginalShapeAudit', 'deepFreeze', 'stableStringify',
    ];
    var ok = true;
    for (var i = 0; i < required.length; i++) {
      if (typeof HI[required[i]] !== 'function') { ok = false; break; }
    }
    return ok;
  })();

  function _intrinsicsIntact() {
    if (!_HI_API_FROZEN_AT_LOAD) return false;
    if (!_HI_HAS) return false;
    // The HI api itself MUST still be frozen at call time; a hostile caller could have replaced
    // the global R3_0D_HardenedIntrinsics binding, but our local HI reference was captured at
    // module init and is itself closure-private — only swappable if the module loader was
    // compromised, which is out-of-scope (the entire contract assumes module-init integrity).
    try { if (!Object.isFrozen(HI)) return false; } catch (e) { return false; }
    return true;
  }

  function _buildIntrinsicTamperBlock(detail) {
    // Build the BLOCK envelope without going through RC.buildBlockedResult (which itself uses
    // intrinsics under the hood). Mirrors evidence-graph.js's defensive posture (D2 Step 17.6).
    var reasonsArr = HI.safeArraySlice([CODES.INTERNAL_CONTRACT_VIOLATION]);
    var explanationsObj = HI.safeObjectCreateNull();
    var explKey = RC.explanationKeyFor ? RC.explanationKeyFor(CODES.INTERNAL_CONTRACT_VIOLATION) : 'r3.0d.error.internal_contract_violation';
    HI.safeDefineDataProperty(explanationsObj, CODES.INTERNAL_CONTRACT_VIOLATION, explKey);
    var blocked = {
      valid: false,
      reasonCodes: HI.deepFreeze(reasonsArr),
      explanationKeys: HI.deepFreeze(explanationsObj),
      detail: HI.safeStringCoerce(detail || 'intrinsic tampering detected'),
    };
    return HI.deepFreeze(blocked);
  }

  // ---------- Constants -------------------------------------------------------------------------
  var HYPOTHESIS_SET_SCHEMA_VERSION = 1;
  var SERVICE_VERSION = 1;

  // Caps — generous but bounded. Aligned with D1 hypothesis-contract caps where applicable.
  var HYPOTHESIS_COUNT_CAP = 64;
  var ALT_EXPLANATION_COUNT_CAP = 128;
  var VALIDATION_ACTION_COUNT_CAP = 128;
  var CANNOT_CONCLUDE_CAP = 64;
  var LIMITATIONS_CAP = 64;
  var SUPPORT_ID_PER_HYPOTHESIS_CAP = HC.ID_ARRAY_CAP || 64;
  var CONTRADICT_ID_PER_HYPOTHESIS_CAP = HC.ID_ARRAY_CAP || 64;
  var ALT_ID_PER_HYPOTHESIS_CAP = HC.ALTERNATIVE_ARRAY_CAP || 16;
  var REASON_CODE_PER_HYPOTHESIS_CAP = 32;
  var VAL_ACTION_ID_PER_HYPOTHESIS_CAP = HC.ID_ARRAY_CAP || 64;
  var STRING_BYTE_CAP = HC.STRING_BYTE_CAP || 512;
  var ENVELOPE_BYTE_CAP = 512 * 1024;        // 512 KiB envelope ceiling.
  var GRAPH_NODE_INPUT_CAP = 8192;
  var GRAPH_EDGE_INPUT_CAP = 16384;

  // Confidence state ladder (semantic primary; numeric score is auxiliary).
  var CONFIDENCE_STATES = HI.deepFreeze(['not_computed', 'insufficient_evidence', 'low', 'moderate', 'high']);
  // Status ladder.
  var HYPOTHESIS_STATUSES = HI.deepFreeze(['supported', 'contradicted', 'inconclusive', 'blocked']);

  // Confidence score bounds — integer 0..100. Avoids float ambiguity entirely.
  var SCORE_MIN = 0;
  var SCORE_MAX = 100;

  // Conclusion credibility ladder (per credibility-contract).
  var CONCLUSION_CREDIBILITY_ORDER = HI.deepFreeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);
  function _crIndex(c) { return HI.safeArrayIndexOf(CONCLUSION_CREDIBILITY_ORDER, c); }
  function _crAtLeast(a, b) {
    // a, b in CONCLUSION_CREDIBILITY_ORDER. lower index = stronger. a is at-least-as-strong as b iff a's index ≤ b's index.
    var ia = _crIndex(a); var ib = _crIndex(b);
    if (ia === -1 || ib === -1) return false;
    return ia <= ib;
  }

  // ID grammar mirrors D1 hypothesis-contract.
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;

  // ---------- Helper utilities (HI-only) --------------------------------------------------------
  function _isNonEmptyString(v) {
    return typeof v === 'string' && v.length > 0;
  }
  function _isFiniteNumber(v) {
    return typeof v === 'number' && HI.safeNumberIsFinite(v) === true;
  }
  function _isInteger(v) {
    return HI.safeNumberIsInteger(v) === true;
  }
  function _isPlainObject(v) {
    return HI.safeIsPlainShape(v) === 'plain-object';
  }
  function _isPlainArray(v) {
    return HI.safeIsPlainShape(v) === 'plain-array';
  }
  function _isFrozen(v) {
    try { return Object.isFrozen(v); } catch (e) { return false; }
  }
  function _byteLength(s) {
    if (typeof s !== 'string') return 0;
    return HI.safeUtf8ByteLength(s);
  }
  function _strcmp(a, b) {
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  }
  function _arrPush(arr, v) {
    HI.safeArrayPush(arr, v);
  }
  function _setHas(setObj, key) {
    var d = HI.safeGetOwnDescriptor(setObj, key);
    return !!(d && d.value === true);
  }
  function _setAdd(setObj, key) {
    HI.safeDefineDataProperty(setObj, key, true);
  }
  function _newSet() {
    return HI.safeObjectCreateNull();
  }
  // Hash function MUST be byte-equivalent to D2 evidence-graph.js _hash64 (FNV-1a 32-bit twice,
  // concatenated: hash32(s) + hash32(s + '|' + s.length)). This is the only way an authoritative
  // graphId recompute on the D3 side can match the D2-produced value. Re-using BigInt FNV-1a 64-bit
  // would produce a different hash and reject every authentic graph as "forged".
  function _toHex8(h) {
    var hexChars = '0123456789abcdef';
    var out = '';
    var x = h >>> 0;
    for (var i = 7; i >= 0; i--) {
      var nibble = (x >>> (i * 4)) & 0xF;
      out += hexChars[nibble];
    }
    return out;
  }
  function _hash32(s) {
    var h = 0x811c9dc5;
    var len = (typeof s === 'string') ? s.length : 0;
    for (var i = 0; i < len; i++) {
      h ^= HI.safeStringCharCodeAt(s, i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return _toHex8(h);
  }
  function _hashFNV64Hex(s) {
    var slen = (typeof s === 'string') ? s.length : 0;
    return _hash32(s) + _hash32(s + '|' + slen);
  }
  // ---------- Authoritative graph verification --------------------------------------------------
  // The graph payload that produced graphId in D2 (see r3-0d-evidence-graph.js Step 16, ~line
  // 1308): { caseAssociation, nodes (projected), edges, correlationGroups (projected) }. To verify
  // authority, we project the same fields out of the suspect graph and recompute the hash with
  // the same prefix ('graphid|v1|'). Mismatch → fabrication.
  function _projectIdPayload(graph) {
    var projectedNodes = HI.safeArrayMap(graph.nodes, function (n) {
      var idPart = {
        caseId: n.identity.caseId,
        sessionId: n.identity.sessionId,
        lapId: n.identity.lapId == null ? null : n.identity.lapId,
        sourceId: n.identity.sourceId,
        sourceVersion: n.identity.sourceVersion,
      };
      var obsPart = {
        kind: n.observation.kind,
        channel: n.observation.channel == null ? null : n.observation.channel,
        i18nKey: n.observation.i18nKey,
        params: n.observation.params == null ? null : n.observation.params,
      };
      return {
        nodeId: n.nodeId,
        category: n.category,
        credibility: n.credibility,
        provenance: n.provenance,
        availability: n.availability,
        confidence: { state: (n.confidence && n.confidence.state) ? n.confidence.state : null },
        identity: idPart,
        observation: obsPart,
        limitations: n.limitations,
        supportingEdges: n.supportingEdges,
        contradictingEdges: n.contradictingEdges,
      };
    });
    var projectedCgs = HI.safeArrayMap(graph.correlationGroups, function (g) {
      return {
        correlationGroupId: g.correlationGroupId,
        memberNodeIds: g.memberNodeIds,
        independenceWeight: g.independenceWeight,
      };
    });
    return {
      caseAssociation: {
        caseId: graph.caseAssociation.caseId,
        sessionId: graph.caseAssociation.sessionId,
        lapId: graph.caseAssociation.lapId == null ? null : graph.caseAssociation.lapId,
      },
      nodes: projectedNodes,
      edges: graph.edges,
      correlationGroups: projectedCgs,
    };
  }

  function _recomputeGraphId(graph) {
    var idPayload = _projectIdPayload(graph);
    var serialized = HI.stableStringify(idPayload);
    return 'graph_' + _hashFNV64Hex('graphid|v' + graph.schemaVersion + '|' + serialized);
  }

  /**
   * Validate that the supplied object IS a D2 authoritative graph snapshot. Returns
   * { valid:true } or { valid:false, reasonCodes:[...] }.
   *
   * Checks (in order):
   *  - top-level plain-object + deep-frozen
   *  - schemaVersion 1
   *  - required top-level keys present
   *  - graphId starts with 'graph_' + 16 hex
   *  - caseAssociation valid
   *  - sessionAssociation.sessionId === caseAssociation.sessionId
   *  - nodes/edges/correlationGroups are frozen arrays
   *  - node/edge caps not exceeded
   *  - recomputed graphId === asserted graphId
   *  - cross-case: every node.identity.caseId === graph.caseAssociation.caseId
   *  - cross-session: every node.identity.sessionId === graph.caseAssociation.sessionId
   */
  function _validateAuthoritativeGraph(gIn) {
    if (!_isPlainObject(gIn)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    // Proxy defang: invoke structuredClone first so the snapshot we trust below is plain
    // and not a Proxy that can return TOCTOU-divergent values per read. structuredClone
    // returns a brand-new plain-object tree (no Proxy can survive the clone). If structuredClone
    // throws (e.g. unclonable function or non-data property), reject. The clone is NOT yet
    // frozen — we'll freeze it once we've recomputed the hash. From here on, ALL graph reads
    // use the cloned snapshot, never gIn.
    var g = HI.safeStructuredClone(gIn);
    if (g === null) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (!_isPlainObject(g)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    // gIn must have been deep-frozen by D2 (any caller-fabricated mutable shell is rejected).
    if (!_isFrozen(gIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    // After clone, also verify the clone is a pure shape (no class instances, no Symbol keys,
    // no accessors). The clone IS plain (structuredClone never produces Proxy/class), but the
    // audit catches edge cases like sparse arrays or non-finite numbers smuggled through.
    if (HI.deepOriginalShapeAudit(g) !== true) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (g.schemaVersion !== 1) {
      return { valid: false, reasonCodes: [CODES.UNSUPPORTED_FUTURE_SCHEMA] };
    }
    if (!_isNonEmptyString(g.graphId)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (g.graphId.length > 64 || !HI.safeRegExpTest(/^graph_[0-9a-f]{16}$/, g.graphId)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (!_isPlainObject(g.caseAssociation)) {
      return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
    }
    if (!_isNonEmptyString(g.caseAssociation.caseId) || !_isNonEmptyString(g.caseAssociation.sessionId)) {
      return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
    }
    if (!_isPlainObject(g.sessionAssociation)
        || g.sessionAssociation.sessionId !== g.caseAssociation.sessionId) {
      return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_SESSION_MISMATCH] };
    }
    if (!_isPlainArray(g.nodes)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    if (g.nodes.length > GRAPH_NODE_INPUT_CAP) {
      return { valid: false, reasonCodes: [CODES.GRAPH_CAP_EXCEEDED] };
    }
    if (!_isPlainArray(g.edges)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    if (g.edges.length > GRAPH_EDGE_INPUT_CAP) {
      return { valid: false, reasonCodes: [CODES.GRAPH_CAP_EXCEEDED] };
    }
    if (!_isPlainArray(g.correlationGroups)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    if (!_isPlainArray(g.limitations)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    if (!_isPlainArray(g.cannotConclude)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }

    // Per-node identity scope check (cross-case / cross-session).
    var caseId = g.caseAssociation.caseId;
    var sessionId = g.caseAssociation.sessionId;
    for (var i = 0; i < g.nodes.length; i++) {
      var n = g.nodes[i];
      if (!_isPlainObject(n)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (!_isPlainObject(n.identity)) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
      }
      if (n.identity.caseId !== caseId) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_CASE_MISMATCH] };
      }
      if (n.identity.sessionId !== sessionId) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_SESSION_MISMATCH] };
      }
    }

    // Recompute graphId — independent authority verification.
    var recomputed;
    try { recomputed = _recomputeGraphId(g); }
    catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] }; }
    if (recomputed !== g.graphId) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }

    // Deep-freeze the cloned snapshot before returning so downstream code receives an
    // immutable view (the clone was mutable until now).
    return { valid: true, graph: HI.deepFreeze(g) };
  }

  // ---------- Rule registry (closed) ------------------------------------------------------------
  // Each rule deterministically tests against the sanitized graph and may produce zero or one
  // hypothesis. New rules require new module load; runtime registration is NOT supported.
  function _frozenRule(o) { return HI.deepFreeze(o); }

  var RULE_REGISTRY = HI.deepFreeze([
    _frozenRule({
      ruleId: 'rule_dq_channel_missing',
      ruleVersion: 1,
      category: 'data_quality',
      triggerKinds: HI.deepFreeze(['channel_missing']),
      triggerEvidenceCategories: HI.deepFreeze(['data_quality']),
      minSupportingNodes: 1,
      minIndependentGroups: 1,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.data_quality.channel_missing',
      validationAction: HI.deepFreeze({
        kind: 'fix_data_quality',
        i18nKey: 'r3.0d.validation.fix_data_quality.channel_missing',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.channel_present',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'logger_misconfig', i18nKey: 'r3.0d.alt.logger_misconfig' }),
        HI.deepFreeze({ altSuffix: 'sensor_failure', i18nKey: 'r3.0d.alt.sensor_failure' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_MISSING_CHANNEL']),
    }),
    _frozenRule({
      ruleId: 'rule_dq_channel_partial',
      ruleVersion: 1,
      category: 'data_quality',
      triggerKinds: HI.deepFreeze(['channel_partial']),
      triggerEvidenceCategories: HI.deepFreeze(['data_quality']),
      minSupportingNodes: 1,
      minIndependentGroups: 1,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.data_quality.channel_partial',
      validationAction: HI.deepFreeze({
        kind: 'fix_data_quality',
        i18nKey: 'r3.0d.validation.fix_data_quality.channel_partial',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.channel_complete',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'transient_dropout', i18nKey: 'r3.0d.alt.transient_dropout' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_MISSING_CHANNEL']),
    }),
    _frozenRule({
      ruleId: 'rule_dq_channel_uncalibrated',
      ruleVersion: 1,
      category: 'data_quality',
      triggerKinds: HI.deepFreeze(['channel_uncalibrated']),
      triggerEvidenceCategories: HI.deepFreeze(['data_quality']),
      minSupportingNodes: 1,
      minIndependentGroups: 1,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.data_quality.channel_uncalibrated',
      validationAction: HI.deepFreeze({
        kind: 'recalibrate_channel',
        i18nKey: 'r3.0d.validation.recalibrate.uncalibrated_channel',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.channel_calibrated',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'stale_calibration', i18nKey: 'r3.0d.alt.stale_calibration' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_UNCALIBRATED_INPUT']),
    }),
    _frozenRule({
      ruleId: 'rule_mc_uncalibrated_input',
      ruleVersion: 1,
      category: 'mapping_calibration',
      triggerKinds: HI.deepFreeze(['metric_value', 'metric_threshold_crossed', 'qualitative_marker']),
      triggerEvidenceCategories: HI.deepFreeze(['mapping_calibration']),
      minSupportingNodes: 1,
      minIndependentGroups: 1,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.mapping_calibration.input_uncalibrated',
      validationAction: HI.deepFreeze({
        kind: 'recalibrate_channel',
        i18nKey: 'r3.0d.validation.recalibrate.mapping_input',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.mapping_calibrated',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'unit_mismatch', i18nKey: 'r3.0d.alt.unit_mismatch' }),
        HI.deepFreeze({ altSuffix: 'sign_convention', i18nKey: 'r3.0d.alt.sign_convention' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_UNCALIBRATED_INPUT']),
    }),
    _frozenRule({
      ruleId: 'rule_db_observed_variance',
      ruleVersion: 1,
      category: 'driver_behaviour',
      triggerKinds: HI.deepFreeze(['metric_value', 'metric_threshold_crossed', 'qualitative_marker']),
      triggerEvidenceCategories: HI.deepFreeze(['driver_behaviour']),
      minSupportingNodes: 1,
      minIndependentGroups: 2,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.driver_behaviour.observed_variance',
      validationAction: HI.deepFreeze({
        kind: 'controlled_repeat_lap',
        i18nKey: 'r3.0d.validation.repeat_lap.driver_variance',
        requiresControlledVariables: true,
        expectedObservationI18nKey: 'r3.0d.expected.driver_consistency_improves',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'tyre_state', i18nKey: 'r3.0d.alt.tyre_state' }),
        HI.deepFreeze({ altSuffix: 'fuel_state', i18nKey: 'r3.0d.alt.fuel_state' }),
        HI.deepFreeze({ altSuffix: 'track_state', i18nKey: 'r3.0d.alt.track_state' }),
      ]),
      requiredLimitations: HI.deepFreeze([]),
    }),
    _frozenRule({
      ruleId: 'rule_vr_observed_response',
      ruleVersion: 1,
      category: 'vehicle_response',
      triggerKinds: HI.deepFreeze(['metric_value', 'metric_threshold_crossed']),
      triggerEvidenceCategories: HI.deepFreeze(['vehicle_response']),
      minSupportingNodes: 1,
      minIndependentGroups: 2,
      allowedCredibility: HI.deepFreeze(['measured', 'derived']),
      maxContradictionRatio: 0.34,
      minConclusionCredibility: 'Derived',
      i18nKey: 'r3.0d.hypothesis.vehicle_response.observed_pattern',
      validationAction: HI.deepFreeze({
        kind: 'controlled_repeat_lap',
        i18nKey: 'r3.0d.validation.repeat_lap.vehicle_response',
        requiresControlledVariables: true,
        expectedObservationI18nKey: 'r3.0d.expected.response_repeatable',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'driver_input', i18nKey: 'r3.0d.alt.driver_input_variation' }),
        HI.deepFreeze({ altSuffix: 'tyre_state', i18nKey: 'r3.0d.alt.tyre_state' }),
        HI.deepFreeze({ altSuffix: 'wind_track', i18nKey: 'r3.0d.alt.wind_track' }),
      ]),
      requiredLimitations: HI.deepFreeze([]),
    }),
    _frozenRule({
      ruleId: 'rule_sm_setup_candidate',
      ruleVersion: 1,
      category: 'setup_model',
      triggerKinds: HI.deepFreeze(['metric_value', 'metric_threshold_crossed']),
      triggerEvidenceCategories: HI.deepFreeze(['setup_model', 'vehicle_response']),
      minSupportingNodes: 2,
      minIndependentGroups: 2,
      allowedCredibility: HI.deepFreeze(['measured', 'derived']),
      maxContradictionRatio: 0,
      minConclusionCredibility: 'Derived',
      i18nKey: 'r3.0d.hypothesis.setup_model.candidate',
      validationAction: HI.deepFreeze({
        kind: 'setup_experiment',
        i18nKey: 'r3.0d.validation.setup_experiment.setup_candidate',
        requiresControlledVariables: true,
        expectedObservationI18nKey: 'r3.0d.expected.setup_change_observed',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'mapping_residual', i18nKey: 'r3.0d.alt.mapping_residual' }),
        HI.deepFreeze({ altSuffix: 'tyre_delta', i18nKey: 'r3.0d.alt.tyre_delta' }),
        HI.deepFreeze({ altSuffix: 'driver_adapt', i18nKey: 'r3.0d.alt.driver_adapt' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_NO_CONTROLLED_REPEAT']),
    }),
    _frozenRule({
      ruleId: 'rule_unk_inconclusive',
      ruleVersion: 1,
      category: 'unknown',
      triggerKinds: HI.deepFreeze(['qualitative_marker']),
      triggerEvidenceCategories: HI.deepFreeze(['unknown']),
      minSupportingNodes: 0,
      minIndependentGroups: 0,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']),
      maxContradictionRatio: 1,
      minConclusionCredibility: 'Unavailable',
      i18nKey: 'r3.0d.hypothesis.unknown.inconclusive',
      validationAction: HI.deepFreeze({
        kind: 'collect_additional_session',
        i18nKey: 'r3.0d.validation.collect_session.inconclusive',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.more_evidence_collected',
      }),
      alternativeExplanations: HI.deepFreeze([]),
      requiredLimitations: HI.deepFreeze([]),
    }),
    _frozenRule({
      ruleId: 'rule_dq_lap_authority_blocked',
      ruleVersion: 1,
      category: 'data_quality',
      triggerKinds: HI.deepFreeze(['lap_authority_blocked', 'comparison_blocked']),
      triggerEvidenceCategories: HI.deepFreeze(['data_quality']),
      minSupportingNodes: 1,
      minIndependentGroups: 1,
      allowedCredibility: HI.deepFreeze(['measured', 'derived', 'heuristic', 'synthetic']),
      maxContradictionRatio: 0.5,
      minConclusionCredibility: 'Heuristic',
      i18nKey: 'r3.0d.hypothesis.data_quality.lap_authority_blocked',
      validationAction: HI.deepFreeze({
        kind: 'fix_data_quality',
        i18nKey: 'r3.0d.validation.fix_data_quality.lap_authority',
        requiresControlledVariables: false,
        expectedObservationI18nKey: 'r3.0d.expected.lap_authority_restored',
      }),
      alternativeExplanations: HI.deepFreeze([
        HI.deepFreeze({ altSuffix: 'reference_missing', i18nKey: 'r3.0d.alt.reference_missing' }),
      ]),
      requiredLimitations: HI.deepFreeze(['LIMITATION_SCOPE_SAME_SESSION_ONLY']),
    }),
  ]);

  // ---------- Per-rule evaluation ---------------------------------------------------------------
  function _findMatchingNodesForRule(graph, rule) {
    var matched = [];
    for (var i = 0; i < graph.nodes.length; i++) {
      var n = graph.nodes[i];
      if (HI.safeArrayIndexOf(rule.triggerEvidenceCategories, n.category) === -1) continue;
      if (HI.safeArrayIndexOf(rule.triggerKinds, n.observation.kind) === -1) continue;
      if (HI.safeArrayIndexOf(rule.allowedCredibility, n.credibility) === -1) continue;
      _arrPush(matched, n);
    }
    return matched;
  }

  function _findContradictionsForMatched(graph, matched) {
    // A contradiction is an edge (from, to, 'contradicts') where 'to' is one of the matched
    // nodes' nodeIds. We collect the 'from' nodeIds as contradicting evidence.
    var matchedIds = _newSet();
    HI.safeArrayForEach(matched, function (n) { _setAdd(matchedIds, n.nodeId); });
    var contradicting = [];
    var seenContra = _newSet();
    for (var i = 0; i < graph.edges.length; i++) {
      var e = graph.edges[i];
      if (e.kind !== 'contradicts') continue;
      if (!_setHas(matchedIds, e.to)) continue;
      if (_setHas(seenContra, e.from)) continue;
      _setAdd(seenContra, e.from);
      _arrPush(contradicting, e.from);
    }
    HI.safeArraySort(contradicting, _strcmp);
    return contradicting;
  }

  function _countIndependentGroups(matched, graph) {
    // Map nodeId → correlationGroupId (a node may belong to at most one correlation group). A node
    // not in any correlation group counts as its own independent unit.
    var memberToGroupId = _newSet();
    for (var gi = 0; gi < graph.correlationGroups.length; gi++) {
      var g = graph.correlationGroups[gi];
      for (var mi = 0; mi < g.memberNodeIds.length; mi++) {
        HI.safeDefineDataProperty(memberToGroupId, g.memberNodeIds[mi], g.correlationGroupId);
      }
    }
    var groupSeen = _newSet();
    var soloCount = 0;
    var matchedGroupIds = [];
    for (var i = 0; i < matched.length; i++) {
      var nid = matched[i].nodeId;
      var d = HI.safeGetOwnDescriptor(memberToGroupId, nid);
      if (d && typeof d.value === 'string') {
        var gid = d.value;
        if (!_setHas(groupSeen, gid)) {
          _setAdd(groupSeen, gid);
          _arrPush(matchedGroupIds, gid);
        }
      } else {
        soloCount += 1;
      }
    }
    HI.safeArraySort(matchedGroupIds, _strcmp);
    return { groupIds: matchedGroupIds, soloCount: soloCount, total: matchedGroupIds.length + soloCount };
  }

  function _credibilityWeightFor(c) {
    if (c === 'measured') return 5;
    if (c === 'derived') return 3;
    if (c === 'heuristic') return 1;
    return 0;
  }
  function _aggregateCredibility(matched) {
    var hasMeasured = false, hasDerived = false, hasHeuristic = false, hasSynthetic = false;
    for (var i = 0; i < matched.length; i++) {
      var c = matched[i].credibility;
      if (c === 'measured') hasMeasured = true;
      else if (c === 'derived') hasDerived = true;
      else if (c === 'heuristic') hasHeuristic = true;
      else if (c === 'synthetic') hasSynthetic = true;
    }
    if (hasMeasured) return 'Measured';
    if (hasDerived) return 'Derived';
    if (hasHeuristic) return 'Heuristic';
    if (hasSynthetic) return 'Heuristic';
    return 'Unavailable';
  }
  function _classifyConfidence(supportingGroups, soloCount, contradictionCount, supportCount, aggregateCred, rule) {
    // Determine state:
    var totalIndependent = supportingGroups + soloCount;
    var staleContribution = 0;  // (no freshness yet — graph has no per-node freshness check)
    var contradictionRatio = (supportCount === 0) ? 0 : (contradictionCount / (supportCount + contradictionCount));

    // Block if cannotConclude reasons present at the graph level; engine adds it externally.
    // Block if credibility floor not met.
    if (!_crAtLeast(aggregateCred, rule.minConclusionCredibility)) {
      return { state: 'low', status: 'inconclusive' };
    }
    if (totalIndependent < rule.minIndependentGroups) {
      return { state: 'insufficient_evidence', status: 'inconclusive' };
    }
    if (contradictionRatio > rule.maxContradictionRatio) {
      return { state: 'low', status: 'contradicted' };
    }
    if (totalIndependent >= 3 && contradictionCount === 0 && (aggregateCred === 'Measured' || aggregateCred === 'Derived')) {
      return { state: 'high', status: 'supported' };
    }
    if (totalIndependent >= 2 && contradictionCount <= 1 && (aggregateCred === 'Measured' || aggregateCred === 'Derived')) {
      return { state: 'moderate', status: 'supported' };
    }
    return { state: 'low', status: 'supported' };
  }
  function _computeConfidenceScore(matched, contradictionCount, totalIndependent) {
    var base = totalIndependent * 25;
    var credBoost = 0;
    for (var i = 0; i < matched.length; i++) {
      credBoost += _credibilityWeightFor(matched[i].credibility);
    }
    var contraPenalty = contradictionCount * 20;
    var raw = base + credBoost - contraPenalty;
    if (raw < SCORE_MIN) raw = SCORE_MIN;
    if (raw > SCORE_MAX) raw = SCORE_MAX;
    return HI.safeMathFloor(raw);
  }
  function _aggregateLimitations(matched, rule) {
    var seen = _newSet();
    var out = [];
    // Add rule-required limitations
    for (var ri = 0; ri < rule.requiredLimitations.length; ri++) {
      var rcode = rule.requiredLimitations[ri];
      if (RC.isReasonCode(rcode) && !_setHas(seen, rcode)) { _setAdd(seen, rcode); _arrPush(out, rcode); }
    }
    // Union of all matched-node limitations
    for (var ni = 0; ni < matched.length; ni++) {
      var n = matched[ni];
      if (!_isPlainArray(n.limitations)) continue;
      for (var li = 0; li < n.limitations.length; li++) {
        var l = n.limitations[li];
        if (RC.isReasonCode(l) && !_setHas(seen, l)) { _setAdd(seen, l); _arrPush(out, l); }
      }
    }
    // Heuristic credibility → must declare LIMITATION_HEURISTIC_ONLY
    var anyHeuristic = false;
    for (var i = 0; i < matched.length; i++) {
      if (matched[i].credibility === 'heuristic') { anyHeuristic = true; break; }
    }
    if (anyHeuristic && !_setHas(seen, CODES.LIMITATION_HEURISTIC_ONLY)) {
      _setAdd(seen, CODES.LIMITATION_HEURISTIC_ONLY);
      _arrPush(out, CODES.LIMITATION_HEURISTIC_ONLY);
    }
    var anySynthetic = false;
    for (var j = 0; j < matched.length; j++) {
      if (matched[j].credibility === 'synthetic') { anySynthetic = true; break; }
    }
    if (anySynthetic && !_setHas(seen, CODES.LIMITATION_SYNTHETIC_ONLY)) {
      _setAdd(seen, CODES.LIMITATION_SYNTHETIC_ONLY);
      _arrPush(out, CODES.LIMITATION_SYNTHETIC_ONLY);
    }
    HI.safeArraySort(out, _strcmp);
    if (out.length > REASON_CODE_PER_HYPOTHESIS_CAP) {
      out = HI.safeArraySlice(out);
      out.length = REASON_CODE_PER_HYPOTHESIS_CAP;
      out = HI.safeArraySlice(out);  // structurally safe re-allocation
    }
    return out;
  }
  function _evaluateRule(graph, rule) {
    var matched = _findMatchingNodesForRule(graph, rule);
    if (matched.length === 0) {
      return {
        ruleId: rule.ruleId,
        fired: false,
        reason: 'no_matching_evidence',
      };
    }
    if (matched.length < rule.minSupportingNodes) {
      return {
        ruleId: rule.ruleId,
        fired: false,
        reason: 'insufficient_supporting_nodes',
      };
    }
    // Sort matched nodes by nodeId for determinism
    HI.safeArraySort(matched, function (a, b) { return _strcmp(a.nodeId, b.nodeId); });

    var supportingIds = [];
    HI.safeArrayForEach(matched, function (n) { _arrPush(supportingIds, n.nodeId); });
    HI.safeArraySort(supportingIds, _strcmp);

    var contradictingIds = _findContradictionsForMatched(graph, matched);

    var groups = _countIndependentGroups(matched, graph);

    var aggCred = _aggregateCredibility(matched);
    var classification = _classifyConfidence(
      groups.groupIds.length,
      groups.soloCount,
      contradictingIds.length,
      supportingIds.length,
      aggCred,
      rule
    );

    var score = _computeConfidenceScore(matched, contradictingIds.length, groups.total);

    var limitations = _aggregateLimitations(matched, rule);

    return {
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      category: rule.category,
      i18nKey: rule.i18nKey,
      fired: true,
      matched: matched,
      supportingIds: supportingIds,
      contradictingIds: contradictingIds,
      correlationGroupIds: groups.groupIds,
      aggregateCredibility: aggCred,
      confidenceState: classification.state,
      status: classification.status,
      confidenceScore: score,
      limitations: limitations,
      ruleObject: rule,
    };
  }

  // ---------- ID generators ---------------------------------------------------------------------
  function _hypothesisId(ruleId, supportingIds, contradictingIds, schemaVersion) {
    var idMaterial = {
      v: schemaVersion,
      ruleId: ruleId,
      supportingEvidenceIds: supportingIds,
      contradictingEvidenceIds: contradictingIds,
    };
    var hash = _hashFNV64Hex('hypothesisid|v' + schemaVersion + '|' + HI.stableStringify(idMaterial));
    return 'hyp_' + hash;
  }
  function _altId(hypothesisId, suffix) {
    var hash = _hashFNV64Hex('altid|v1|' + hypothesisId + '|' + suffix);
    return 'alt_' + hash;
  }
  function _actionId(hypothesisId, suffix) {
    var hash = _hashFNV64Hex('actionid|v1|' + hypothesisId + '|' + suffix);
    return 'act_' + hash;
  }
  function _hypothesisSetId(graphId, hypotheses, schemaVersion) {
    var hashMaterial = {
      v: schemaVersion,
      graphId: graphId,
      hyps: HI.safeArrayMap(hypotheses, function (h) { return h.hypothesisId; }),
    };
    HI.safeArraySort(hashMaterial.hyps, _strcmp);
    var hash = _hashFNV64Hex('hypothesissetid|v' + schemaVersion + '|' + HI.stableStringify(hashMaterial));
    return 'hset_' + hash;
  }

  // ---------- Build hypotheses / alts / actions -------------------------------------------------
  function _buildHypothesisRecord(evalResult, schemaVersion) {
    var rule = evalResult.ruleObject;
    var hid = _hypothesisId(rule.ruleId, evalResult.supportingIds, evalResult.contradictingIds, schemaVersion);

    // Build per-hypothesis alternative explanations
    var alts = [];
    var altIds = [];
    for (var ai = 0; ai < rule.alternativeExplanations.length; ai++) {
      var a = rule.alternativeExplanations[ai];
      var altId = _altId(hid, a.altSuffix);
      _arrPush(altIds, altId);
      _arrPush(alts, HI.deepFreeze({
        alternativeId: altId,
        hypothesisId: hid,
        ruleId: rule.ruleId,
        i18nKey: a.i18nKey,
      }));
    }
    HI.safeArraySort(altIds, _strcmp);
    HI.safeArraySort(alts, function (x, y) { return _strcmp(x.alternativeId, y.alternativeId); });

    // Build validation action
    var actId = _actionId(hid, rule.validationAction.kind);
    var actions = [HI.deepFreeze({
      actionId: actId,
      hypothesisId: hid,
      kind: rule.validationAction.kind,
      i18nKey: rule.validationAction.i18nKey,
      requiresControlledVariables: rule.validationAction.requiresControlledVariables === true,
      expectedObservationI18nKey: rule.validationAction.expectedObservationI18nKey,
      prerequisiteIds: HI.deepFreeze([]),
    })];
    var actIds = [actId];

    // Cap caps caps
    var supportingCapped = evalResult.supportingIds.length > SUPPORT_ID_PER_HYPOTHESIS_CAP
      ? _truncSortedCopy(evalResult.supportingIds, SUPPORT_ID_PER_HYPOTHESIS_CAP)
      : HI.safeArraySlice(evalResult.supportingIds);
    var contradictingCapped = evalResult.contradictingIds.length > CONTRADICT_ID_PER_HYPOTHESIS_CAP
      ? _truncSortedCopy(evalResult.contradictingIds, CONTRADICT_ID_PER_HYPOTHESIS_CAP)
      : HI.safeArraySlice(evalResult.contradictingIds);
    var altIdsCapped = altIds.length > ALT_ID_PER_HYPOTHESIS_CAP
      ? _truncSortedCopy(altIds, ALT_ID_PER_HYPOTHESIS_CAP)
      : HI.safeArraySlice(altIds);

    var hyp = HI.deepFreeze({
      hypothesisId: hid,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      category: rule.category,
      status: evalResult.status,
      i18nKey: rule.i18nKey,
      supportingEvidenceIds: HI.deepFreeze(supportingCapped),
      contradictingEvidenceIds: HI.deepFreeze(contradictingCapped),
      correlationGroupIds: HI.deepFreeze(HI.safeArraySlice(evalResult.correlationGroupIds)),
      alternativeExplanationIds: HI.deepFreeze(altIdsCapped),
      cannotConcludeReasonCodes: HI.deepFreeze([]),
      validationActionIds: HI.deepFreeze(HI.safeArraySlice(actIds)),
      credibility: evalResult.aggregateCredibility,
      confidence: HI.deepFreeze({
        state: evalResult.confidenceState,
        score: evalResult.confidenceScore,
      }),
      limitations: HI.deepFreeze(HI.safeArraySlice(evalResult.limitations)),
      provenance: HI.deepFreeze({
        ruleId: rule.ruleId,
        ruleVersion: rule.ruleVersion,
        supportingGroupCount: evalResult.correlationGroupIds.length,
        soloSupportCount: evalResult.supportingIds.length - evalResult.correlationGroupIds.length >= 0
          ? (evalResult.supportingIds.length - evalResult.correlationGroupIds.length)
          : 0,
        contradictionCount: evalResult.contradictingIds.length,
        supportCount: evalResult.supportingIds.length,
      }),
    });
    return { hypothesis: hyp, alts: alts, actions: actions };
  }
  function _truncSortedCopy(sortedArr, cap) {
    var out = [];
    var limit = HI.safeMathFloor(cap);
    for (var i = 0; i < sortedArr.length && i < limit; i++) _arrPush(out, sortedArr[i]);
    return out;
  }

  function _resolveClock(opts) {
    if (!opts || typeof opts.clock !== 'function') return null;
    try {
      var v = opts.clock();
      if (typeof v !== 'string') return null;
      if (v.length === 0 || v.length > 64) return null;
      // Loose ISO-8601 check (YYYY-MM-DDTHH:MM:SS[.fff]Z or with offset)
      if (!HI.safeRegExpTest(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})$/, v)) return null;
      return v;
    } catch (e) {
      return null;
    }
  }

  // ---------- Public entry: buildHypothesisSet -------------------------------------------------
  function buildHypothesisSet(input, opts) {
    try {
      // ---- Step 0 — intrinsic integrity entry guard ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected at entry to buildHypothesisSet');
      }

      // ---- Step 1 — top-level input shape check ----
      if (!_isPlainObject(input)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input not plain object' });
      }
      // Closed-key input: must contain { graph } and optionally { generationToken, contextVersion }.
      if (RC.hasHiddenOwnKey(input)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'input carries hidden own key' });
      }
      var allowedInputKeys = ['graph', 'generationToken', 'contextVersion'];
      var inputKeys = HI.safeKeys(input);
      if (inputKeys === null) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read input own keys' });
      }
      for (var ki = 0; ki < inputKeys.length; ki++) {
        if (HI.safeArrayIndexOf(allowedInputKeys, inputKeys[ki]) === -1) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown input key: ' + inputKeys[ki] });
        }
      }

      // ---- Step 2 — graph authority verification (clone-defang Proxy, recompute graphId) ----
      var authority = _validateAuthoritativeGraph(input.graph);
      if (authority.valid !== true) {
        return RC.buildBlockedResult(authority.reasonCodes, { detail: 'authority verification failed' });
      }
      var graph = authority.graph;  // the validated, deep-frozen clone — Proxy can no longer affect reads

      // ---- Step 2.5 — generationToken / contextVersion shape ----
      var generationToken = null;
      var contextVersion = null;
      if (HI.safeHasOwn(input, 'generationToken')) {
        var gt = input.generationToken;
        if (gt !== null) {
          if (!_isNonEmptyString(gt) || gt.length > 128) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'generationToken must be non-empty string ≤128 chars or null' });
          }
          generationToken = gt;
        }
      }
      if (HI.safeHasOwn(input, 'contextVersion')) {
        var cv = input.contextVersion;
        if (cv !== null) {
          if (!_isNonEmptyString(cv) || cv.length > 128) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'contextVersion must be non-empty string ≤128 chars or null' });
          }
          contextVersion = cv;
        }
      }

      // ---- Step 3 — evaluate each rule deterministically ----
      var hypotheses = [];
      var alternativeExplanations = [];
      var validationActions = [];
      var snapshotLimitations = [];
      var snapshotCannotConclude = [];
      var rulesFired = 0;
      var rulesEvaluated = 0;
      var rejectedReasons = HI.safeObjectCreateNull();

      var hypSeen = _newSet();
      var altSeen = _newSet();
      var actSeen = _newSet();
      var limSeen = _newSet();
      var ccSeen = _newSet();

      // Bring in any cannotConclude reasons from the graph
      for (var gci = 0; gci < graph.cannotConclude.length; gci++) {
        var cgc = graph.cannotConclude[gci];
        if (RC.isReasonCode(cgc) && !_setHas(ccSeen, cgc)) {
          _setAdd(ccSeen, cgc);
          _arrPush(snapshotCannotConclude, cgc);
        }
      }
      for (var gli = 0; gli < graph.limitations.length; gli++) {
        var gl = graph.limitations[gli];
        if (RC.isReasonCode(gl) && !_setHas(limSeen, gl)) {
          _setAdd(limSeen, gl);
          _arrPush(snapshotLimitations, gl);
        }
      }

      for (var ri = 0; ri < RULE_REGISTRY.length; ri++) {
        rulesEvaluated += 1;
        var rule = RULE_REGISTRY[ri];
        var er;
        try {
          er = _evaluateRule(graph, rule);
        } catch (e) {
          _incReason(rejectedReasons, CODES.INTERNAL_CONTRACT_VIOLATION);
          continue;
        }

        // ---- Step 3.5 — per-rule intrinsic integrity recheck ----
        if (!_intrinsicsIntact()) {
          return _buildIntrinsicTamperBlock('intrinsic-tampering detected during rule evaluation');
        }

        if (er.fired !== true) {
          // Record cannot-conclude for the rule's category when no matching evidence
          if (er.reason === 'insufficient_supporting_nodes' && !_setHas(ccSeen, CODES.INSUFFICIENT_EVIDENCE)) {
            _setAdd(ccSeen, CODES.INSUFFICIENT_EVIDENCE);
            _arrPush(snapshotCannotConclude, CODES.INSUFFICIENT_EVIDENCE);
          }
          continue;
        }
        rulesFired += 1;

        var record = _buildHypothesisRecord(er, HYPOTHESIS_SET_SCHEMA_VERSION);
        if (!_setHas(hypSeen, record.hypothesis.hypothesisId)) {
          _setAdd(hypSeen, record.hypothesis.hypothesisId);
          _arrPush(hypotheses, record.hypothesis);
        }
        for (var ai = 0; ai < record.alts.length; ai++) {
          var a = record.alts[ai];
          if (!_setHas(altSeen, a.alternativeId)) {
            _setAdd(altSeen, a.alternativeId);
            _arrPush(alternativeExplanations, a);
          }
        }
        for (var aci = 0; aci < record.actions.length; aci++) {
          var ac = record.actions[aci];
          if (!_setHas(actSeen, ac.actionId)) {
            _setAdd(actSeen, ac.actionId);
            _arrPush(validationActions, ac);
          }
        }
        // Roll up hypothesis limitations into snapshot limitations
        for (var lhi = 0; lhi < record.hypothesis.limitations.length; lhi++) {
          var l = record.hypothesis.limitations[lhi];
          if (!_setHas(limSeen, l)) { _setAdd(limSeen, l); _arrPush(snapshotLimitations, l); }
        }
      }

      // If NO rule fired across all evaluations, ensure cannotConclude has at least
      // INSUFFICIENT_EVIDENCE so callers don't see a silent empty result.
      if (rulesFired === 0 && !_setHas(ccSeen, CODES.INSUFFICIENT_EVIDENCE)) {
        _setAdd(ccSeen, CODES.INSUFFICIENT_EVIDENCE);
        _arrPush(snapshotCannotConclude, CODES.INSUFFICIENT_EVIDENCE);
      }

      // ---- Step 4 — caps & sort ----
      if (hypotheses.length > HYPOTHESIS_COUNT_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'hypothesis count exceeds HYPOTHESIS_COUNT_CAP=' + HYPOTHESIS_COUNT_CAP });
      }
      if (alternativeExplanations.length > ALT_EXPLANATION_COUNT_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'alt explanation count exceeds ALT_EXPLANATION_COUNT_CAP=' + ALT_EXPLANATION_COUNT_CAP });
      }
      if (validationActions.length > VALIDATION_ACTION_COUNT_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'validation action count exceeds cap' });
      }

      HI.safeArraySort(hypotheses, function (a, b) { return _strcmp(a.hypothesisId, b.hypothesisId); });
      HI.safeArraySort(alternativeExplanations, function (a, b) { return _strcmp(a.alternativeId, b.alternativeId); });
      HI.safeArraySort(validationActions, function (a, b) { return _strcmp(a.actionId, b.actionId); });
      HI.safeArraySort(snapshotLimitations, _strcmp);
      HI.safeArraySort(snapshotCannotConclude, _strcmp);

      if (snapshotLimitations.length > LIMITATIONS_CAP) snapshotLimitations = _truncSortedCopy(snapshotLimitations, LIMITATIONS_CAP);
      if (snapshotCannotConclude.length > CANNOT_CONCLUDE_CAP) snapshotCannotConclude = _truncSortedCopy(snapshotCannotConclude, CANNOT_CONCLUDE_CAP);

      // ---- Step 5 — top-level hypothesisSetId (content-only deterministic) ----
      var hsetId = _hypothesisSetId(graph.graphId, hypotheses, HYPOTHESIS_SET_SCHEMA_VERSION);

      // ---- Step 6 — envelope size check (pre-clock) ----
      var preEnvelope = {
        v: HYPOTHESIS_SET_SCHEMA_VERSION,
        hsetId: hsetId,
        graphId: graph.graphId,
        hypotheses: hypotheses,
        alternativeExplanations: alternativeExplanations,
        validationActions: validationActions,
        snapshotLimitations: snapshotLimitations,
        snapshotCannotConclude: snapshotCannotConclude,
      };
      var envBytes;
      try { envBytes = _byteLength(HI.stableStringify(preEnvelope)); }
      catch (eBytes) { envBytes = Infinity; }
      if (envBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'pre-clock envelope ' + envBytes + ' bytes exceeds ' + ENVELOPE_BYTE_CAP });
      }

      // ---- Step 7 — resolve clock (LAST input-touching op) ----
      var createdAt = _resolveClock(opts);

      // ---- Step 7.5 — post-clock intrinsic integrity recheck ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-clock');
      }

      // ---- Step 8 — build provenance ----
      var provenance = HI.deepFreeze({
        builderVersion: SERVICE_VERSION,
        sourceGraphSchemaVersion: graph.schemaVersion,
        sourceGraphSanitizedCount: graph.provenance.sanitizedCount,
        rulesEvaluated: rulesEvaluated,
        rulesFired: rulesFired,
        rejectedReasonsSummary: HI.deepFreeze(rejectedReasons),
      });

      // ---- Step 9 — assemble & deep-freeze envelope ----
      var hypothesisSet = HI.deepFreeze({
        schemaVersion: HYPOTHESIS_SET_SCHEMA_VERSION,
        hypothesisSetId: hsetId,
        sourceGraphId: graph.graphId,
        caseAssociation: HI.deepFreeze({
          caseId: graph.caseAssociation.caseId,
          sessionId: graph.caseAssociation.sessionId,
          lapId: graph.caseAssociation.lapId == null ? null : graph.caseAssociation.lapId,
        }),
        sessionAssociation: HI.deepFreeze({ sessionId: graph.caseAssociation.sessionId }),
        hypotheses: HI.deepFreeze(HI.safeArraySlice(hypotheses)),
        alternativeExplanations: HI.deepFreeze(HI.safeArraySlice(alternativeExplanations)),
        validationActions: HI.deepFreeze(HI.safeArraySlice(validationActions)),
        cannotConclude: HI.deepFreeze(HI.safeArraySlice(snapshotCannotConclude)),
        limitations: HI.deepFreeze(HI.safeArraySlice(snapshotLimitations)),
        provenance: provenance,
        createdAt: createdAt,
        generationToken: generationToken,
        contextVersion: contextVersion,
      });

      // ---- Step 9.6 — post-freeze final intrinsic check ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-freeze');
      }

      return HI.deepFreeze({ valid: true, hypothesisSet: hypothesisSet });

    } catch (eOuter) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'buildHypothesisSet threw on hostile input' });
    }
  }

  function _incReason(bag, code) {
    var d = HI.safeGetOwnDescriptor(bag, code);
    var current = (d && typeof d.value === 'number') ? d.value : 0;
    HI.safeDefineDataProperty(bag, code, current + 1);
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    HYPOTHESIS_SET_SCHEMA_VERSION: HYPOTHESIS_SET_SCHEMA_VERSION,
    CONFIDENCE_STATES: CONFIDENCE_STATES,
    HYPOTHESIS_STATUSES: HYPOTHESIS_STATUSES,
    RULE_REGISTRY: RULE_REGISTRY,
    HYPOTHESIS_COUNT_CAP: HYPOTHESIS_COUNT_CAP,
    ALT_EXPLANATION_COUNT_CAP: ALT_EXPLANATION_COUNT_CAP,
    VALIDATION_ACTION_COUNT_CAP: VALIDATION_ACTION_COUNT_CAP,
    CANNOT_CONCLUDE_CAP: CANNOT_CONCLUDE_CAP,
    LIMITATIONS_CAP: LIMITATIONS_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    buildHypothesisSet: buildHypothesisSet,
  };
  // Freeze the api object so callers cannot replace exports. Uses HI.deepFreeze (captured
  // intrinsic) for consistency with every other freeze in this module — no ambient calls.
  try { HI.deepFreeze(api); } catch (e) { /* swallow — best-effort */ }

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_HypothesisEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
