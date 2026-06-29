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
 *     groups + aggregate credibility + contradictions. Score is auxiliary; state is the
 *     semantic primary. Freshness is used SOLELY as an eligibility / staleness gate (stale
 *     nodes are rejected at authority verification) — it does NOT contribute to the
 *     confidence score (Codex D3 R5 D3-R5-03 closure).
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
  var HI = null, RC = null, CR = null, HC = null, EN = null, SI = null, EG = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { CR = require('../../contracts/r3.0d/credibility-contract.js'); } catch (e) { CR = null; }
    try { HC = require('../../contracts/r3.0d/hypothesis-contract.js'); } catch (e) { HC = null; }
    try { EN = require('../../contracts/r3.0d/evidence-node-contract.js'); } catch (e) { EN = null; }
    try { SI = require('../../contracts/r3.0d/source-identity-contract.js'); } catch (e) { SI = null; }
    // Codex D-GATE-01 closure: D3 must consume D2 producer attestation via
    // EG.verifyAuthoritativeGraph. Optional require — the verifier-first call below
    // is the load-bearing change; if EG is somehow unavailable the existing
    // structural validation continues to apply as defense-in-depth.
    try { EG = require('./r3-0d-evidence-graph.js'); } catch (e) { EG = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (CR === null && typeof R3_0D_CredibilityContract !== 'undefined') CR = R3_0D_CredibilityContract;
  if (HC === null && typeof R3_0D_HypothesisContract !== 'undefined') HC = R3_0D_HypothesisContract;
  if (EN === null && typeof R3_0D_EvidenceNodeContract !== 'undefined') EN = R3_0D_EvidenceNodeContract;
  if (SI === null && typeof R3_0D_SourceIdentityContract !== 'undefined') SI = R3_0D_SourceIdentityContract;
  if (EG === null && typeof R3_0D_EvidenceGraph !== 'undefined') EG = R3_0D_EvidenceGraph;

  if (!HI || !RC || !CR || !HC || !EN || !SI) {
    throw new Error('r3-0d-hypothesis-engine.js: missing one or more required R3.0D contracts');
  }

  var CODES = RC.REASON_CODES;

  // ---------- Module-init capture: Object.isFrozen + Date.parse + Object.is -------------------
  // These primitives are not in the HI surface; we capture them at module init so callers
  // cannot defeat security checks by rebinding the ambient names. NOTE (Codex D3 R2 RN-07
  // narrowed claim): "module init" here means after the contract dependencies have loaded
  // (HI, RC, ...) — those loads themselves trust the module loader. If the module loader is
  // compromised these captures cannot help, but that is out-of-scope (the entire R3.0D
  // contract assumes module-init trust).
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;
  var _CAPTURED_OBJECT_IS = Object.is;
  var _CAPTURED_DATE_PARSE = Date.parse;

  // ---------- Codex D4 R3 D4-R3-02 closure: WeakSet identity attestation ----------------------
  // Per SKYLINE 2026-06-29 architectural directive on Producer Attestation:
  //   D3 = sole producer authority
  //   D4 = verifier/consumer only
  //   caller = cannot forge identity
  // Implementation: closure-private WeakSet holds references to D3's authentic final snapshots.
  // After full deep-freeze + complete snapshot validation, _registerAuthoritative() adds the
  // hypothesisSet object reference. The exported verifyAuthoritativeHypothesisSet() checks
  // BOTH shape AND WeakSet membership — clones / JSON round-trips / hand-forged frozen objects
  // all lose authority because they're different references not in the set.
  //
  // The WeakSet is NEVER exposed via any API. No register / sign / extract surface. Only the
  // narrow `verifyAuthoritativeHypothesisSet(candidate) → boolean` is exported. Same trust
  // model as C8's r3cC8Authority / r3cC8SessionAuthority WeakSets.
  //
  // Lifetime: per-process; in-memory pipeline D3 → D4 only. Persistence is out of scope (would
  // require a separate signed-snapshot store at a future checkpoint).
  // Codex D4 R4 D4-R4-01 closure: capture WeakSet constructor + prototype methods at module
  // init. ALL WeakSet operations dispatch through these captured references via captured
  // Reflect.apply — never through the mutable WeakSet.prototype chain. Caller cannot defeat
  // authority by post-load `WeakSet.prototype.has = () => true`.
  var _WeakSetCtor = WeakSet;
  var _WS_ADD = WeakSet.prototype.add;
  var _WS_HAS = WeakSet.prototype.has;
  var _CAPTURED_REFLECT_APPLY = Reflect.apply;
  function _wsAdd(set, value) {
    try { _CAPTURED_REFLECT_APPLY(_WS_ADD, set, [value]); return true; }
    catch (e) { return false; }
  }
  function _wsHas(set, value) {
    try { return _CAPTURED_REFLECT_APPLY(_WS_HAS, set, [value]) === true; }
    catch (e) { return false; }
  }
  var _authoritativeHypothesisSets = new _WeakSetCtor();
  // Codex D-GATE-03 closure: capture Array.isArray at module init so post-load rebinds
  // (Array.isArray = () => true / Array.isArray = () => false) cannot affect the verifier.
  var _CAPTURED_ARRAY_IS_ARRAY = Array.isArray;
  function _isArraySafe(v) { try { return _CAPTURED_ARRAY_IS_ARRAY(v) === true; } catch (e) { return false; } }
  function _registerAuthoritative(hypothesisSet) {
    _wsAdd(_authoritativeHypothesisSets, hypothesisSet);
  }
  function verifyAuthoritativeHypothesisSet(candidate) {
    // Fail-closed: any throw / Proxy / hostile getter / post-load prototype rebind → false.
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      // Membership check via captured Reflect.apply on captured WeakSet.prototype.has.
      // Post-load `WeakSet.prototype.has = () => true` cannot affect this dispatch.
      if (!_wsHas(_authoritativeHypothesisSets, candidate)) return false;
      // Belt-and-suspenders: the set entry MUST also still be frozen + have the expected
      // shape. Defense-in-depth against any future bug that might register a partial snapshot.
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== HYPOTHESIS_SET_SCHEMA_VERSION) return false;
      if (typeof candidate.hypothesisSetId !== 'string') return false;
      if (typeof candidate.sourceGraphId !== 'string') return false;
      // Codex D-GATE-03 closure: use captured Array.isArray to defeat ambient rebind.
      if (!_isArraySafe(candidate.hypotheses)) return false;
      return true;
    } catch (e) { return false; }
  }
  function _isFrozenSafe(v) {
    try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; }
    catch (e) { return false; }
  }
  function _exactlyEqual(a, b) {
    try { return _CAPTURED_OBJECT_IS(a, b) === true; }
    catch (e) { return false; }
  }
  function _isoToMs(s) {
    try {
      if (typeof s !== 'string' || s.length === 0) return null;
      var n = _CAPTURED_DATE_PARSE(s);
      if (typeof n !== 'number' || n !== n /* NaN check */) return null;
      return n;
    } catch (e) { return null; }
  }

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
    // The HI api itself MUST still be frozen at call time. We use the captured Object.isFrozen
    // (Codex D3 R1 RN-08 closure) so caller cannot defeat this check by rebinding ambient.
    if (!_isFrozenSafe(HI)) return false;
    // Codex D3 R1 RN-10 closure: narrow guard claim. This routine ONLY verifies HI surface
    // integrity (and our captured Object.isFrozen reference is sound, since we capture it before
    // any caller code runs). Validation-path security relies on the HI captured wrappers — the
    // guard is defence-in-depth on the HI surface itself, not a general intrinsic-rebinding
    // detector.
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
  // Codex D3 R6 D3-R6-02 closure: align with D2's EDGES_CAP_TOTAL (1024). A D2-authored graph
  // cannot exceed this; D3 rejects any graph asserting more.
  var GRAPH_EDGE_INPUT_CAP = 1024;
  // Per D1 evidence-node-contract: supporting/contradictingEdges arrays each cap at 64.
  var PER_NODE_EDGE_DECL_CAP = 64;
  // Codex D3 R2 R2-03 closure: directive §5.18 mandates staleness-based invalidation.
  // Default cutoff is 30 days. Caller can override via opts.maxAgeMs; reference time MUST
  // be supplied via opts.clock() returning ISO 8601 (preferred) or opts.referenceNowMs.
  var DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

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
  function _isFrozen(v) { return _isFrozenSafe(v); }
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
  function _validateAuthoritativeGraph(gIn, refNowMs, maxAgeMs) {
    if (!_isPlainObject(gIn)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    // Codex D3 R2 R2-04 closure: do NOT do a pre-clone audit. HI.deepOriginalShapeAudit
    // invokes Proxy traps (getPrototypeOf / ownKeys / etc) which is itself the attack surface
    // we wanted to avoid. We instead rely on the layered security model:
    //   1. structuredClone produces a brand-new plain-object tree. The clone process invokes
    //      Proxy [[Get]] traps, but the result is concrete data — no Proxy survives.
    //   2. The clone is then audited via deepOriginalShapeAudit (clone never has Proxy → audit
    //      is meaningful here, not a no-op trap walk).
    //   3. The graphId is recomputed from the cloned data. A TOCTOU/opaque Proxy that returns
    //      inconsistent values across the clone reads will yield a cloned tree whose
    //      recomputed hash does NOT match the asserted graphId → rejected.
    //   4. The frozen-input requirement (captured Object.isFrozen) rejects mutable shells.
    // HI captures within the engine are themselves closure-private and immune to ambient
    // rebinding triggered by Proxy traps. The combination is functionally Proxy-safe.
    if (!_isFrozen(gIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    var g = HI.safeStructuredClone(gIn);
    if (g === null) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (!_isPlainObject(g)) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
    }
    // Post-clone audit — the clone IS plain (no Proxy), so this is meaningful: catches
    // class-instance / Array-subclass / Symbol-key / accessor / sparse / non-finite-number
    // smuggling through structuredClone's permissive deep-clone semantics.
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

    // Per-node identity scope + D2 invariant re-validation. Codex D3 R1/R2 closures:
    // the graphId hash is a diagnostic identifier, not an integrity proof; D3 MUST independently
    // re-enforce every D2 invariant on the snapshot it has just cloned. We do NOT trust the
    // hashed projection alone — the projection itself is not the full graph schema.
    var caseId = g.caseAssociation.caseId;
    var sessionId = g.caseAssociation.sessionId;
    var caseLapId = (g.caseAssociation.lapId == null) ? null : g.caseAssociation.lapId;
    var seenNodeIds = HI.safeObjectCreateNull();
    var nodeIdSet = HI.safeObjectCreateNull();
    // Build the expected correlation partition from node identities. Two nodes share a
    // correlation group iff they share (caseId|sessionId|lapId|sourceId). This mirrors D2's
    // _correlationGroupKey logic. Codex D3 R2 R2-01 closure: D3 must reconstruct and verify the
    // partition itself, not just validate the listed groups in isolation.
    var expectedGroupBuckets = HI.safeObjectCreateNull();  // key → { memberNodeIds: [...] }
    var nodeCorrelationKey = HI.safeObjectCreateNull();    // nodeId → key

    for (var i = 0; i < g.nodes.length; i++) {
      var n = g.nodes[i];
      if (!_isPlainObject(n)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      // Codex D3 R4 D3-R4-01 closure: delegate FULL SourceIdentity validation to the D1 contract.
      // SI.validateSourceIdentity enforces: (a) closed key set {caseId, sessionId, lapId, sourceId,
      // sourceVersion, freshness} via Reflect.ownKeys allowlist (rejects extra keys + Symbol keys);
      // (b) caseId/sessionId/sourceId/sourceVersion/freshness mandatory non-empty strings;
      // (c) byte caps (≤512) on ALL string fields including caseId/sessionId; (d) lapId optional but
      // if present must be null or non-empty string + byte cap; (e) freshness must match the
      // contract's ISO 8601 grammar (T separator + Z or ±HH:MM offset). This single delegation
      // replaces several inline checks that were partial.
      var sidCheck = SI.validateSourceIdentity(n.identity);
      if (sidCheck.valid !== true) {
        return { valid: false, reasonCodes: (sidCheck && sidCheck.reasonCodes) ? sidCheck.reasonCodes : [CODES.SOURCE_IDENTITY_INVALID] };
      }
      if (!_isPlainObject(n.identity)) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
      }
      // Codex D3 R2 R2-02 closure: enforce ID_RE grammar + forbidden pattern + byte cap on
      // every node.nodeId. _isNonEmptyString alone admitted '../bad' style IDs.
      if (!_isNonEmptyString(n.nodeId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_MISSING_ID] };
      }
      if (HI.safeRegExpTest(ID_FORBIDDEN_RE, n.nodeId) || !HI.safeRegExpTest(ID_RE, n.nodeId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_ID_FORBIDDEN] };
      }
      if (_byteLength(n.nodeId) > STRING_BYTE_CAP) {
        return { valid: false, reasonCodes: [CODES.BYTE_CAP_EXCEEDED] };
      }
      // Codex D3 R1 RN-02 closure: D2 invariant — no duplicate nodeId.
      if (HI.safeGetOwnDescriptor(seenNodeIds, n.nodeId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_DUPLICATE_ID] };
      }
      HI.safeDefineDataProperty(seenNodeIds, n.nodeId, true);
      HI.safeDefineDataProperty(nodeIdSet, n.nodeId, true);

      if (n.identity.caseId !== caseId) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_CASE_MISMATCH] };
      }
      if (n.identity.sessionId !== sessionId) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_SESSION_MISMATCH] };
      }
      var nodeLapId = (n.identity.lapId == null) ? null : n.identity.lapId;
      if (caseLapId !== null && nodeLapId !== null && caseLapId !== nodeLapId) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_LAP_MISMATCH] };
      }
      if (n.identity.sourceId === 'imported_summary' && n.credibility === 'measured') {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN] };
      }
      // Codex D3 R3 R3-04 closure: enforce full SourceIdentity invariants — every identity field
      // that D2 requires non-empty MUST be non-empty + within byte cap. sourceVersion=null /
      // sourceId="" / lapId="" / freshness="" all sneak past the basic scope checks if not
      // explicitly rejected here.
      if (!_isNonEmptyString(n.identity.sourceId)) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
      }
      if (_byteLength(n.identity.sourceId) > STRING_BYTE_CAP) {
        return { valid: false, reasonCodes: [CODES.BYTE_CAP_EXCEEDED] };
      }
      if (!_isNonEmptyString(n.identity.sourceVersion)) {
        return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_VERSION_MISSING] };
      }
      if (_byteLength(n.identity.sourceVersion) > STRING_BYTE_CAP) {
        return { valid: false, reasonCodes: [CODES.BYTE_CAP_EXCEEDED] };
      }
      if (nodeLapId !== null) {
        if (!_isNonEmptyString(nodeLapId)) {
          return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
        }
        if (_byteLength(nodeLapId) > STRING_BYTE_CAP) {
          return { valid: false, reasonCodes: [CODES.BYTE_CAP_EXCEEDED] };
        }
      }
      if (!_isNonEmptyString(n.identity.freshness)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      if (_byteLength(n.identity.freshness) > STRING_BYTE_CAP) {
        return { valid: false, reasonCodes: [CODES.BYTE_CAP_EXCEEDED] };
      }
      var freshMs = _isoToMs(n.identity.freshness);
      if (freshMs === null) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      // Codex D3 R2 R2-03 closure: freshness enforcement is now MANDATORY. refNowMs must be
      // available (resolved from opts.clock or opts.referenceNowMs). maxAgeMs has a default
      // (DEFAULT_MAX_AGE_MS). If no reference time is available we fail-closed before this
      // function is even called — see buildHypothesisSet entry.
      if ((refNowMs - freshMs) > maxAgeMs) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      if (freshMs > (refNowMs + (5 * 60 * 1000))) {
        // Reject future-dated freshness (>5min in the future) — clock-skew tolerance only.
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }

      // Codex D3 R3 R3-01 closure: collision-free correlation key. Use D2's exact encoding
      // (r3-0d-evidence-graph.js:_correlationGroupCanonical) - HI.stableStringify each
      // component so JSON-string escaping eliminates ambiguity (caseId="a|b" cannot collide
      // with lapId containing "|"). The '|' delimiter sits BETWEEN JSON-quoted strings.
      var corrKey = HI.stableStringify(caseId)
        + '|' + HI.stableStringify(sessionId)
        + '|' + HI.stableStringify(nodeLapId == null ? null : nodeLapId)
        + '|' + HI.stableStringify(n.identity.sourceId);
      HI.safeDefineDataProperty(nodeCorrelationKey, n.nodeId, corrKey);
      var bucketDesc = HI.safeGetOwnDescriptor(expectedGroupBuckets, corrKey);
      if (bucketDesc) {
        _arrPush(bucketDesc.value, n.nodeId);
      } else {
        HI.safeDefineDataProperty(expectedGroupBuckets, corrKey, [n.nodeId]);
      }
    }

    // Codex D3 R2 R2-01 closure: validate that the graph's correlationGroups EXACTLY match the
    // expected partition derived from node identities. EVERY bucket (singleton or multi-member)
    // MUST appear as exactly one correlationGroup with the same memberNodeIds (sorted) and
    // independenceWeight = exact 1 / count (Object.is equality — Codex D3 R2 R2-02 closure
    // rejects NaN/Infinity). This mirrors D2's behavior: D2 emits one correlation group per
    // distinct (case|session|lap|sourceId) identity tuple.
    var expectedKeys = HI.safeOwnKeys(expectedGroupBuckets) || [];
    var expectedAllKeys = [];
    for (var eki = 0; eki < expectedKeys.length; eki++) {
      var ek = expectedKeys[eki];
      var dEK = HI.safeGetOwnDescriptor(expectedGroupBuckets, ek);
      if (dEK && _isPlainArray(dEK.value) && dEK.value.length >= 1) {
        _arrPush(expectedAllKeys, ek);
        HI.safeArraySort(dEK.value, _strcmp);
      }
    }
    HI.safeArraySort(expectedAllKeys, _strcmp);
    if (g.correlationGroups.length !== expectedAllKeys.length) {
      return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
    }
    var matchedKey = HI.safeObjectCreateNull();
    var seenGroupId = HI.safeObjectCreateNull();
    var globalMemberSeen = HI.safeObjectCreateNull();
    for (var cgi = 0; cgi < g.correlationGroups.length; cgi++) {
      var cg = g.correlationGroups[cgi];
      if (!_isPlainObject(cg) || !_isPlainArray(cg.memberNodeIds) || cg.memberNodeIds.length === 0) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      // Codex D3 R3 R3-02 closure: correlationGroupId must conform to D2's grammar
      // (`corr_<16hex>`) AND must be unique across g.correlationGroups. Two distinct groups
      // sharing the same ID would previously bypass downstream dedup.
      if (!_isNonEmptyString(cg.correlationGroupId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (HI.safeRegExpTest(ID_FORBIDDEN_RE, cg.correlationGroupId)
          || !HI.safeRegExpTest(/^corr_[0-9a-f]{16}$/, cg.correlationGroupId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_ID_FORBIDDEN] };
      }
      if (HI.safeGetOwnDescriptor(seenGroupId, cg.correlationGroupId)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
      HI.safeDefineDataProperty(seenGroupId, cg.correlationGroupId, true);

      // All member IDs share the same expected correlation key.
      var firstMember = cg.memberNodeIds[0];
      var keyDesc = HI.safeGetOwnDescriptor(nodeCorrelationKey, firstMember);
      if (!keyDesc) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
      }
      var keyForThisGroup = keyDesc.value;
      var bucketDescForKey = HI.safeGetOwnDescriptor(expectedGroupBuckets, keyForThisGroup);
      if (!bucketDescForKey) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
      var expectedMembers = bucketDescForKey.value;
      if (HI.safeGetOwnDescriptor(matchedKey, keyForThisGroup)) {
        // The same correlation key appears twice in correlationGroups — invalid.
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
      HI.safeDefineDataProperty(matchedKey, keyForThisGroup, true);
      if (cg.memberNodeIds.length !== expectedMembers.length) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
      // Verify members are exactly the expected set (sorted equality).
      var sortedActual = HI.safeArraySlice(cg.memberNodeIds);
      HI.safeArraySort(sortedActual, _strcmp);
      for (var mi = 0; mi < sortedActual.length; mi++) {
        if (sortedActual[mi] !== expectedMembers[mi]) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
        }
        if (!HI.safeGetOwnDescriptor(nodeIdSet, sortedActual[mi])) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
        }
        if (HI.safeGetOwnDescriptor(globalMemberSeen, sortedActual[mi])) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
        }
        HI.safeDefineDataProperty(globalMemberSeen, sortedActual[mi], true);
      }
      // Codex D3 R3 R3-02 closure (cont.): correlationGroupId must equal D2's recompute
      // ('corr_' + _hash64('corr|' + canonical)). Binds the supplied ID to actual cluster
      // contents — caller cannot rename group IDs to forge dedup.
      var expectedGroupId = 'corr_' + _hashFNV64Hex('corr|' + keyForThisGroup);
      if (cg.correlationGroupId !== expectedGroupId) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
      // Exact Object.is(weight, 1/count) — rejects NaN, Infinity, or any float drift.
      if (!_exactlyEqual(cg.independenceWeight, 1 / cg.memberNodeIds.length)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_CORRELATED_METRICS_DOUBLECOUNT] };
      }
    }

    // Codex D3 R5 D3-R5-01 closure: reconstruct the EXACT edge set D2 emits from the
    // sanitized node fields + correlation groups, then require g.edges to match it as a
    // set. D2 emits exactly three edge kinds:
    //   - 'supports'         from each node.supportingEdges entry
    //   - 'contradicts'      from each node.contradictingEdges entry
    //   - 'correlated_with'  from pairs of correlation-group members (sorted lo→hi)
    // The closed enum {supports, contradicts, derived_from, correlated_with, invalidates}
    // describes the universe of LEGAL kinds, but `derived_from` and `invalidates` are
    // RESERVED — no D2 producer emits them. D3 rejects any graph claiming a reserved kind
    // because such a graph cannot have come from D2.
    var EDGE_KIND_EMITTED = ['supports', 'contradicts', 'correlated_with'];
    // Codex D3 R6 D3-R6-03 closure: D2 emits edges WITHOUT deduplication — a node declaring
    // the same id twice in supportingEdges produces 2 identical {from,to,supports} edges in
    // graph.edges. D3 was strictly set-equal which would reject authentic D2 output. Switch
    // to MULTI-SET (count-based) tracking: each declared edge increments expected count;
    // each actual edge decrements; final counts must all be zero.
    var expectedEdgeCount = HI.safeObjectCreateNull();
    function _expectedEdgeKey(from, to, kind) { return from + '|' + to + '|' + kind; }
    function _addExpectedEdge(from, to, kind) {
      var k = _expectedEdgeKey(from, to, kind);
      var d = HI.safeGetOwnDescriptor(expectedEdgeCount, k);
      var cur = (d && typeof d.value === 'number') ? d.value : 0;
      HI.safeDefineDataProperty(expectedEdgeCount, k, cur + 1);
    }
    // supports + contradicts from node declarations.
    // Codex D3 R6 D3-R6-01 closure: each declaration field MUST be a plain array with bounded
    // string entries; silent skip on non-array was an authority bypass.
    for (var nei = 0; nei < g.nodes.length; nei++) {
      var ne = g.nodes[nei];
      if (!_isPlainArray(ne.supportingEdges)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (ne.supportingEdges.length > PER_NODE_EDGE_DECL_CAP) {
        return { valid: false, reasonCodes: [CODES.ARRAY_CAP_EXCEEDED] };
      }
      for (var sj = 0; sj < ne.supportingEdges.length; sj++) {
        var sId = ne.supportingEdges[sj];
        if (!_isNonEmptyString(sId) || !HI.safeGetOwnDescriptor(nodeIdSet, sId)) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
        }
        if (sId === ne.nodeId) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_SELF_REFERENCE] };
        }
        _addExpectedEdge(ne.nodeId, sId, 'supports');
      }
      if (!_isPlainArray(ne.contradictingEdges)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (ne.contradictingEdges.length > PER_NODE_EDGE_DECL_CAP) {
        return { valid: false, reasonCodes: [CODES.ARRAY_CAP_EXCEEDED] };
      }
      for (var cj = 0; cj < ne.contradictingEdges.length; cj++) {
        var cId = ne.contradictingEdges[cj];
        if (!_isNonEmptyString(cId) || !HI.safeGetOwnDescriptor(nodeIdSet, cId)) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
        }
        if (cId === ne.nodeId) {
          return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_SELF_REFERENCE] };
        }
        _addExpectedEdge(ne.nodeId, cId, 'contradicts');
      }
    }
    // correlated_with from groups with ≥2 members (pairwise lo→hi)
    for (var cgj = 0; cgj < g.correlationGroups.length; cgj++) {
      var cgM = g.correlationGroups[cgj].memberNodeIds;
      if (!_isPlainArray(cgM) || cgM.length < 2) continue;
      var sortedM = HI.safeArraySlice(cgM);
      HI.safeArraySort(sortedM, _strcmp);
      for (var mai = 0; mai < sortedM.length; mai++) {
        for (var mbj = mai + 1; mbj < sortedM.length; mbj++) {
          _addExpectedEdge(sortedM[mai], sortedM[mbj], 'correlated_with');
        }
      }
    }
    // Verify g.edges matches the expected MULTI-SET — every actual edge consumes one count;
    // any reserved kind / orphan / not-in-expected / over-consumed → reject; final counts
    // must all be zero (no missing expected edge).
    for (var ei = 0; ei < g.edges.length; ei++) {
      var e = g.edges[ei];
      if (!_isPlainObject(e) || !_isNonEmptyString(e.from) || !_isNonEmptyString(e.to) || !_isNonEmptyString(e.kind)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (HI.safeArrayIndexOf(EDGE_KIND_EMITTED, e.kind) === -1) {
        // Reserved kind (derived_from / invalidates) OR unknown kind — rejected.
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      if (!HI.safeGetOwnDescriptor(nodeIdSet, e.from) || !HI.safeGetOwnDescriptor(nodeIdSet, e.to)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
      }
      var eKey = _expectedEdgeKey(e.from, e.to, e.kind);
      var eDesc = HI.safeGetOwnDescriptor(expectedEdgeCount, eKey);
      var eCur = (eDesc && typeof eDesc.value === 'number') ? eDesc.value : 0;
      if (eCur <= 0) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
      HI.safeDefineDataProperty(expectedEdgeCount, eKey, eCur - 1);
    }
    // Any expected edge not consumed → caller stripped an edge D2 would emit.
    var remainingKeys = HI.safeOwnKeys(expectedEdgeCount) || [];
    for (var rki = 0; rki < remainingKeys.length; rki++) {
      var rkDesc = HI.safeGetOwnDescriptor(expectedEdgeCount, remainingKeys[rki]);
      if (rkDesc && typeof rkDesc.value === 'number' && rkDesc.value > 0) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_NODE_INVALID] };
      }
    }
    // Preserve original endpoint-existence check (defensive):
    for (var lei = 0; lei < g.edges.length; lei++) {
      var le = g.edges[lei];
      if (!HI.safeGetOwnDescriptor(nodeIdSet, le.from) || !HI.safeGetOwnDescriptor(nodeIdSet, le.to)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_GRAPH_ORPHAN] };
      }
    }

    // Recompute graphId — independent authority verification. NOTE: the graphId only hashes
    // (caseAssociation, nodes-projection, edges, correlationGroups). Other fields like
    // graph.cannotConclude / graph.limitations / graph.provenance / graph.createdAt are NOT
    // bound to graphId — Codex D3 R1 RN-01 closure: D3's output must NOT consume those fields
    // from the input graph (they are re-derived from rule firing below).
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
    // Codex D3 R1 RN-03 closure: D2 emits contradiction edges as `{from: node, to: other}` where
    // `from` is the node whose contradictingEdges array referenced `other`. So edges where
    // `from === matched.nodeId AND kind === 'contradicts'` are the contradictions of a matched
    // node, and the contradictor is `edge.to`. We also accept the reverse direction for
    // robustness (some future producer may emit canonical low→high form).
    var matchedIds = _newSet();
    HI.safeArrayForEach(matched, function (n) { _setAdd(matchedIds, n.nodeId); });
    var contradicting = [];
    var seenContra = _newSet();
    for (var i = 0; i < graph.edges.length; i++) {
      var e = graph.edges[i];
      if (e.kind !== 'contradicts') continue;
      var contraId = null;
      if (_setHas(matchedIds, e.from) && !_setHas(matchedIds, e.to)) {
        contraId = e.to;
      } else if (_setHas(matchedIds, e.to) && !_setHas(matchedIds, e.from)) {
        // Reverse-direction fallback for symmetry.
        contraId = e.from;
      } else if (_setHas(matchedIds, e.from) && _setHas(matchedIds, e.to)) {
        // Both endpoints matched — pick the non-self side (matched contradicts another matched).
        // Skip if same nodeId (self-edge, defensive — D2 disallows but defend anyway).
        if (e.from !== e.to) contraId = e.to;
      }
      if (contraId === null) continue;
      if (_setHas(seenContra, contraId)) continue;
      _setAdd(seenContra, contraId);
      _arrPush(contradicting, contraId);
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
    // Freshness is handled separately at authority verification (stale nodes rejected via
    // EVIDENCE_FRESHNESS_STALE) and is NOT a confidence-score input (Codex D3 R5 D3-R5-03
    // closure). Any node reaching this function is already fresh-enough per policy.
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
  // Codex D4 R2 D4-R2-01 closure: per-hypothesis contentSignature binds the decision-relevant
  // fields. This is an INTEGRITY / DETERMINISM proof (caller mutation flips the signature), NOT
  // a producer attestation (the hash is publicly recomputable). Producer authority lives in
  // the closure-private WeakSet `_authoritativeHypothesisSets` (see Codex D4 R3 D4-R3-02 closure
  // above). D4 must call `verifyAuthoritativeHypothesisSet()` first — contentSignature equality
  // alone is NOT sufficient authority.
  function _contentSignature(hypothesisObj, schemaVersion) {
    var contentMaterial = {
      v: schemaVersion,
      hid: hypothesisObj.hypothesisId,
      ruleId: hypothesisObj.ruleId,
      ruleVersion: hypothesisObj.ruleVersion,
      category: hypothesisObj.category,
      status: hypothesisObj.status,
      i18nKey: hypothesisObj.i18nKey,
      credibility: hypothesisObj.credibility,
      conf: {
        state: hypothesisObj.confidence && hypothesisObj.confidence.state,
        score: hypothesisObj.confidence && hypothesisObj.confidence.score,
      },
      sup: hypothesisObj.supportingEvidenceIds,
      con: hypothesisObj.contradictingEvidenceIds,
      corr: hypothesisObj.correlationGroupIds,
      alts: hypothesisObj.alternativeExplanationIds,
      cc: hypothesisObj.cannotConcludeReasonCodes,
      acts: hypothesisObj.validationActionIds,
      lims: hypothesisObj.limitations,
    };
    return 'csig_' + _hashFNV64Hex('contentsig|v' + schemaVersion + '|' + HI.stableStringify(contentMaterial));
  }

  function _hypothesisSetId(graphId, hypotheses, schemaVersion) {
    // hsetId now binds BOTH hypothesisId AND contentSignature (Codex D4 R2 D4-R2-01 closure).
    // A caller mutating any decision-relevant field on a hypothesis (status, credibility,
    // confidence, ruleVersion, ...) changes that hypothesis's contentSignature, which changes
    // hsetId. D4 can detect this by recomputing hsetId from the cloned hypothesisSet's content.
    var pairs = HI.safeArrayMap(hypotheses, function (h) {
      return { hid: h.hypothesisId, csig: h.contentSignature };
    });
    HI.safeArraySort(pairs, function (a, b) { return _strcmp(a.hid, b.hid); });
    var hashMaterial = {
      v: schemaVersion,
      graphId: graphId,
      pairs: pairs,
    };
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

    var supportingFrozen = HI.deepFreeze(supportingCapped);
    var contradictingFrozen = HI.deepFreeze(contradictingCapped);
    var corrGroupFrozen = HI.deepFreeze(HI.safeArraySlice(evalResult.correlationGroupIds));
    var altIdsFrozen = HI.deepFreeze(altIdsCapped);
    var cannotConcludeFrozen = HI.deepFreeze([]);
    var actIdsFrozen = HI.deepFreeze(HI.safeArraySlice(actIds));
    var confidenceFrozen = HI.deepFreeze({
      state: evalResult.confidenceState,
      score: evalResult.confidenceScore,
    });
    var limitationsFrozen = HI.deepFreeze(HI.safeArraySlice(evalResult.limitations));

    // Codex D4 R2 D4-R2-01 closure: compute contentSignature over the full hypothesis content
    // BEFORE freezing the envelope. The signature binds all decision-relevant fields so a
    // caller cannot mutate any of them without changing the signature (and thus hsetId).
    var draftForSig = {
      hypothesisId: hid,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      category: rule.category,
      status: evalResult.status,
      i18nKey: rule.i18nKey,
      supportingEvidenceIds: supportingFrozen,
      contradictingEvidenceIds: contradictingFrozen,
      correlationGroupIds: corrGroupFrozen,
      alternativeExplanationIds: altIdsFrozen,
      cannotConcludeReasonCodes: cannotConcludeFrozen,
      validationActionIds: actIdsFrozen,
      credibility: evalResult.aggregateCredibility,
      confidence: confidenceFrozen,
      limitations: limitationsFrozen,
    };
    var contentSig = _contentSignature(draftForSig, HYPOTHESIS_SET_SCHEMA_VERSION);

    var hyp = HI.deepFreeze({
      hypothesisId: hid,
      ruleId: rule.ruleId,
      ruleVersion: rule.ruleVersion,
      category: rule.category,
      status: evalResult.status,
      i18nKey: rule.i18nKey,
      supportingEvidenceIds: supportingFrozen,
      contradictingEvidenceIds: contradictingFrozen,
      correlationGroupIds: corrGroupFrozen,
      alternativeExplanationIds: altIdsFrozen,
      cannotConcludeReasonCodes: cannotConcludeFrozen,
      validationActionIds: actIdsFrozen,
      credibility: evalResult.aggregateCredibility,
      confidence: confidenceFrozen,
      limitations: limitationsFrozen,
      contentSignature: contentSig,
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
  function buildHypothesisSet(inputIn, optsIn) {
    try {
      // ---- Step 0 — intrinsic integrity entry guard ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected at entry to buildHypothesisSet');
      }

      // ---- Step 0.5 — Codex D3 R2 R2-05 closure: snapshot input + opts at entry ----
      // structuredClone produces a brand-new plain-object tree, neutralising any caller
      // accessors / Proxies / TOCTOU read traps on the input or options envelopes. From here
      // on we read EXCLUSIVELY from the snapshot, never from inputIn / optsIn.
      // Note: input.graph itself is deep-frozen + content-hashed; we keep its identity intact
      // by NOT cloning it here (the authority verifier does its own clone). The snapshot we
      // build holds top-level metadata only.
      if (!_isPlainObject(inputIn)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input not plain object' });
      }
      // Snapshot the input top-level via descriptor-only reads. input.graph is held BY REFERENCE
      // (it's expected to be a D2-produced deep-frozen graph; cloning it here would un-freeze it
      // and force a double-clone pass through structuredClone). The authority verifier does its
      // own structuredClone defang on input.graph downstream — that's the only place where the
      // graph's data is consumed. Top-level wrapper fields (generationToken, contextVersion)
      // ARE structurally snapshotted here to neutralise accessor / TOCTOU on the wrapper.
      var inputSnap = HI.safeObjectCreateNull();
      var inputDescNames = HI.safeOwnKeys(inputIn);
      if (inputDescNames === null) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read input own keys' });
      }
      for (var idi = 0; idi < inputDescNames.length; idi++) {
        var idName = inputDescNames[idi];
        if (typeof idName === 'symbol') {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'input has symbol key' });
        }
        var idDesc = HI.safeGetOwnDescriptor(inputIn, idName);
        if (!idDesc) continue;
        if (!('value' in idDesc)) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input accessor descriptor not allowed: ' + idName });
        }
        if (!idDesc.enumerable) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'input non-enumerable own key: ' + idName });
        }
        HI.safeDefineDataProperty(inputSnap, idName, idDesc.value);
      }
      if (!_isPlainObject(inputSnap)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input snapshot not plain object' });
      }
      // Opts snapshot (may be undefined / null). structuredClone rejects functions, so we
      // pull the clock callback out by reference (it's held as a closure-private value, not
      // exposed to subsequent reads) and clone ONLY the data fields. This still neutralises
      // accessor / Proxy TOCTOU on the data fields.
      var optsSnap = null;
      var clockCb = null;
      if (optsIn !== null && optsIn !== undefined) {
        if (!_isPlainObject(optsIn)) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts not plain object' });
        }
        // Pull clock by reference (only once — TOCTOU protection).
        var clockDesc = HI.safeGetOwnDescriptor(optsIn, 'clock');
        if (clockDesc && typeof clockDesc.value === 'function') {
          clockCb = clockDesc.value;
        }
        // Build a data-only opts object with NO function fields, then clone it.
        var optsData = HI.safeObjectCreateNull();
        var ownDescNames = HI.safeOwnKeys(optsIn);
        if (ownDescNames === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read opts own keys' });
        }
        for (var odi = 0; odi < ownDescNames.length; odi++) {
          var odName = ownDescNames[odi];
          if (typeof odName === 'symbol') {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts has symbol key' });
          }
          var od = HI.safeGetOwnDescriptor(optsIn, odName);
          if (!od) continue;
          // Codex D3 R3 R3-05 closure: ALL opts own keys (including 'clock') MUST be enumerable.
          // Previously the enumerable check applied to input but not opts, so a non-enumerable
          // maxAgeMs could smuggle through and reach optsSnap.
          if (!od.enumerable) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts non-enumerable own key: ' + odName });
          }
          if (odName === 'clock') continue;  // function, captured above by reference
          if (typeof od.value === 'function') {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts function field not allowed: ' + odName });
          }
          if (!('value' in od)) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts accessor descriptor not allowed: ' + odName });
          }
          HI.safeDefineDataProperty(optsData, odName, od.value);
        }
        optsSnap = HI.safeStructuredClone(optsData);
        if (optsSnap === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts data fields not cloneable' });
        }
      }

      // ---- Step 1 — top-level input shape check on the SNAPSHOT ----
      if (RC.hasHiddenOwnKey(inputSnap)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'input carries hidden own key' });
      }
      var allowedInputKeys = ['graph', 'generationToken', 'contextVersion'];
      var inputKeys = HI.safeKeys(inputSnap);
      if (inputKeys === null) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read input own keys' });
      }
      for (var ki = 0; ki < inputKeys.length; ki++) {
        if (HI.safeArrayIndexOf(allowedInputKeys, inputKeys[ki]) === -1) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown input key: ' + inputKeys[ki] });
        }
      }
      if (optsSnap !== null) {
        // Opts allowed keys: clock (not cloned), maxAgeMs, referenceNowMs.
        var allowedOptsKeys = ['clock', 'maxAgeMs', 'referenceNowMs'];
        var optsKeys = HI.safeKeys(optsSnap);
        if (optsKeys === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read opts own keys' });
        }
        for (var oki = 0; oki < optsKeys.length; oki++) {
          if (HI.safeArrayIndexOf(allowedOptsKeys, optsKeys[oki]) === -1) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown opts key: ' + optsKeys[oki] });
          }
        }
      }

      // ---- Step 1.5 — resolve freshness policy reference time (Codex D3 R2 R2-03 closure) ----
      // Reference now is REQUIRED for D3 to enforce mandatory freshness. Resolution order:
      //   1. opts.referenceNowMs (finite positive number) — caller-provided absolute ms
      //   2. opts.clock() returning a valid ISO 8601 string — parsed to ms via captured Date.parse
      // Clock is invoked AT MOST ONCE (the result is reused for both refNowMs and snapshot
      // createdAt — Codex D2 R5 RN-13 pattern: invoking the clock multiple times exposes TOCTOU).
      // If neither yields a usable reference time, fail-closed with HYPOTHESIS_INVALID.
      var refNowMs = null;
      var resolvedClockIso = null;
      if (optsSnap && typeof optsSnap.referenceNowMs === 'number'
          && HI.safeNumberIsFinite(optsSnap.referenceNowMs) === true
          && optsSnap.referenceNowMs > 0) {
        refNowMs = optsSnap.referenceNowMs;
      } else if (clockCb !== null) {
        var clockIso = null;
        try { clockIso = clockCb(); } catch (eClock) { clockIso = null; }
        if (typeof clockIso === 'string' && clockIso.length > 0 && clockIso.length <= 64
            && HI.safeRegExpTest(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})$/, clockIso)) {
          var parsed = _isoToMs(clockIso);
          if (parsed !== null && parsed > 0) {
            refNowMs = parsed;
            resolvedClockIso = clockIso;
          }
        }
      }
      if (refNowMs === null) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], {
          detail: 'D3 requires a reference time for mandatory freshness enforcement — supply opts.clock() returning ISO 8601 OR opts.referenceNowMs (positive finite number)',
        });
      }
      var maxAgeMs = DEFAULT_MAX_AGE_MS;
      if (optsSnap && typeof optsSnap.maxAgeMs === 'number'
          && HI.safeNumberIsFinite(optsSnap.maxAgeMs) === true
          && optsSnap.maxAgeMs > 0) {
        maxAgeMs = optsSnap.maxAgeMs;
      }

      // ---- Step 2 — graph authority verification ----
      // Codex D-GATE-01 closure: verifier-first ordering. Before any structural clone or
      // graphId recompute reads the candidate's properties, ask D2 whether THIS object
      // reference is in its closure-private WeakSet. Identity-only check; no [[Get]]
      // traps fire on a hostile Proxy non-member. If EG is unavailable (extremely
      // narrow path: EG module didn't load) the legacy structural validation is the
      // fallback — it still catches forged graphs via structuredClone + audit + graphId
      // recompute, just without the producer-attestation gate.
      if (EG && typeof EG.verifyAuthoritativeGraph === 'function') {
        if (EG.verifyAuthoritativeGraph(inputSnap.graph) !== true) {
          // Use HYPOTHESIS_AUTHORITY_FORGED — same reason code D4→D5 uses for failed
          // producer-attestation. Existing D3 tests already expect this code for
          // fabricated / tampered graph scenarios.
          return RC.buildBlockedResult([CODES.HYPOTHESIS_AUTHORITY_FORGED], { detail: 'D2 graph producer-attestation failed' });
        }
      }
      var authority = _validateAuthoritativeGraph(inputSnap.graph, refNowMs, maxAgeMs);
      if (authority.valid !== true) {
        return RC.buildBlockedResult(authority.reasonCodes, { detail: 'authority verification failed' });
      }
      var graph = authority.graph;

      // ---- Step 2.5 — generationToken / contextVersion shape ----
      var generationToken = null;
      var contextVersion = null;
      if (HI.safeHasOwn(inputSnap, 'generationToken')) {
        var gt = inputSnap.generationToken;
        if (gt !== null) {
          if (!_isNonEmptyString(gt) || gt.length > 128) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'generationToken must be non-empty string ≤128 chars or null' });
          }
          generationToken = gt;
        }
      }
      if (HI.safeHasOwn(inputSnap, 'contextVersion')) {
        var cv = inputSnap.contextVersion;
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

      // Codex D3 R1 RN-01 closure: do NOT trust graph.cannotConclude / graph.limitations.
      // Those fields are not bound to graphId — a caller with knowledge of the hash algorithm
      // could set arbitrary content there while still passing graphId verification. D3 derives
      // its own snapshotCannotConclude + snapshotLimitations exclusively from per-rule firing
      // results below.

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

      // Codex D-GATE-02 closure: D3 derives LIMITATION_IMPORTED_SUMMARY from graph.nodes
      // (NOT graph.limitations, which RN-01 forbids trusting). The presence of an
      // imported_summary sourceId on ANY node IS bound to graphId (via the node hash
      // projection in D2's idPayload), so this signal is authority-bound and safe to
      // consume. D5 brief composition rejects any envelope whose hs.limitations carries
      // this code.
      if (CODES.LIMITATION_IMPORTED_SUMMARY
          && !_setHas(limSeen, CODES.LIMITATION_IMPORTED_SUMMARY)) {
        for (var nIdx = 0; nIdx < graph.nodes.length; nIdx++) {
          var nrec = graph.nodes[nIdx];
          if (nrec && nrec.identity && nrec.identity.sourceId === 'imported_summary') {
            _setAdd(limSeen, CODES.LIMITATION_IMPORTED_SUMMARY);
            _arrPush(snapshotLimitations, CODES.LIMITATION_IMPORTED_SUMMARY);
            break;
          }
        }
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

      // ---- Step 7 — populate createdAt from already-resolved clock (Step 1.5) ----
      // The clock callback was invoked AT MOST ONCE in Step 1.5; the resolved ISO is reused
      // here for snapshot metadata. This eliminates TOCTOU between freshness reference and
      // createdAt — both bind to the same single clock observation.
      var createdAt = resolvedClockIso;

      // ---- Step 7.5 — post-clock intrinsic integrity recheck ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-clock');
      }

      // ---- Step 8 — build provenance ----
      // Codex D3 R1 RN-01 closure: D3 derives its OWN sourceGraphSanitizedCount from graph.nodes.length
      // (this IS bound to graphId since nodes are in the hashed projection). Do NOT trust
      // graph.provenance.sanitizedCount which is not bound to graphId.
      var provenance = HI.deepFreeze({
        builderVersion: SERVICE_VERSION,
        sourceGraphSchemaVersion: graph.schemaVersion,
        sourceGraphSanitizedCount: graph.nodes.length,
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

      // Codex D3 R1 RN-11 closure: measure FINAL envelope (after assembly) and compare against
      // ENVELOPE_BYTE_CAP. The Step 6 pre-clock check was a preview; this is the binding check.
      var finalEnvBytes;
      try { finalEnvBytes = _byteLength(HI.stableStringify(hypothesisSet)); }
      catch (eFinalBytes) { finalEnvBytes = Infinity; }
      if (finalEnvBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'final envelope ' + finalEnvBytes + ' bytes exceeds ' + ENVELOPE_BYTE_CAP });
      }

      // ---- Step 9.6 — post-freeze final intrinsic check ----
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-freeze');
      }

      // Codex D4 R3 D4-R3-02 closure: ONLY a fully validated + fully deep-frozen snapshot is
      // registered as authoritative. Blocked / partial results never reach this line.
      _registerAuthoritative(hypothesisSet);

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
    // Codex D4 R3 D4-R3-02 closure: narrow producer-authority verifier. Consumers (D4) call
    // this to confirm an alleged D3 snapshot was actually produced by THIS D3 instance. The
    // closure-private WeakSet is the trust anchor — never exposed via any other API surface.
    // Returns boolean. NEVER throws. NEVER reveals the registry. NEVER signs caller payloads.
    verifyAuthoritativeHypothesisSet: verifyAuthoritativeHypothesisSet,
  };
  // Freeze the api object so callers cannot replace exports. Uses HI.deepFreeze (captured
  // intrinsic) for consistency with every other freeze in this module — no ambient calls.
  try { HI.deepFreeze(api); } catch (e) { /* swallow — best-effort */ }

  // Codex D4 R2 D4-R2-05 closure: under CommonJS (Node test runners, Electron renderer
  // require), expose ONLY via module.exports — avoid polluting globalThis. The renderer
  // browser path (no module.exports) still gets the global for ad-hoc script-tag loading.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_HypothesisEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
