/**
 * renderer/js/r3-0d-engineer-brief.js — R3.0D D5 · Engineer Brief (PRODUCTION).
 *
 * Authoritative entry: buildEngineerBrief(input, opts)
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0 Continuous Resume Directive §13):
 *   • Input is a pair of D3 + D4 AUTHORITATIVE snapshots ONLY:
 *       { hypothesisSet, prioritySet }
 *     Authority enforced via FOUR layered gates BEFORE any read of caller-supplied data:
 *       (1) HE.verifyAuthoritativeHypothesisSet(hypothesisSet) — FIRST read; closure-private
 *           WeakSet identity attestation in D3 (un-forgeable; Proxy traps do NOT fire because
 *           WeakSet.has is identity-only via captured Reflect.apply).
 *       (2) PE.verifyAuthoritativePrioritySet(prioritySet) — second identity gate (D4's
 *           closure-private WeakSet).
 *       (3) Cross-binding: prioritySet.sourceHypothesisSetId === hypothesisSet.hypothesisSetId
 *           AND prioritySet.sourceGraphId === hypothesisSet.sourceGraphId (the D4 output MUST
 *           have been derived from the D3 input — no cross-pair forgery).
 *       (4) Identity match: hypothesisSet.caseAssociation === prioritySet.caseAssociation
 *           (shape-equality on caseId / sessionId / lapId) AND sessionAssociation match.
 *   • Composes a human-readable brief envelope by re-projecting D3 and D4 outputs through
 *     contracts/r3.0d/engineer-brief-contract.validateEngineerBriefShape (which itself enforces
 *     contradiction / cannotConclude / limitation visibility — directive §10 "BRIEF UI rules
 *     promoted to contract assertions").
 *   • Activation gate: emits a separate `activation` field carrying derived booleans
 *     (uiCapabilityReady, featureRegistryActivationAllowed, deferredCapabilities[]). The
 *     UI surface and feature-registry mutation are NOT performed inside D5 — D5 only
 *     EXPOSES the gating signal. The host wiring code consumes the boolean.
 *   • FORBIDDEN behaviors (per directive §10 / §13):
 *     - Hide contradictions, cannotConclude, or limitations from the brief
 *     - Surface causal claims when D3 produced inconclusive / contradicted hypotheses
 *     - Reorder priorities relative to D4 output (D4's tier ladder is authoritative)
 *     - Run any auto-apply behavior (D5 is descriptive; UI host decides)
 *     - Mutate state.json / train.json / feature-registry from inside this module
 *     - LLM call. Deterministic.
 *   • All ambient calls go through R3_0D_HardenedIntrinsics (HI). Object.isFrozen +
 *     Date.parse + Object.is captured at module init.
 *   • Mandatory freshness reference time (opts.clock() OR opts.referenceNowMs); inherits
 *     D3 / D4 policy. Clock invoked at most once AFTER both authority gates.
 *   • D5 also acts as a producer for downstream consumers (host wiring + later checkpoints):
 *     registers the brief in a closure-private WeakSet and exposes verifyAuthoritativeEngineerBrief.
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerBrief).
 */
(function (root) {
  'use strict';

  // ---------- Module-init capture: hardened intrinsics ------------------------------------------
  var HI = null, RC = null, CR = null, HC = null, EN = null, SI = null, REC = null, EBC = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { CR = require('../../contracts/r3.0d/credibility-contract.js'); } catch (e) { CR = null; }
    try { HC = require('../../contracts/r3.0d/hypothesis-contract.js'); } catch (e) { HC = null; }
    try { EN = require('../../contracts/r3.0d/evidence-node-contract.js'); } catch (e) { EN = null; }
    try { SI = require('../../contracts/r3.0d/source-identity-contract.js'); } catch (e) { SI = null; }
    try { REC = require('../../contracts/r3.0d/recommendation-contract.js'); } catch (e) { REC = null; }
    try { EBC = require('../../contracts/r3.0d/engineer-brief-contract.js'); } catch (e) { EBC = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (CR === null && typeof R3_0D_CredibilityContract !== 'undefined') CR = R3_0D_CredibilityContract;
  if (HC === null && typeof R3_0D_HypothesisContract !== 'undefined') HC = R3_0D_HypothesisContract;
  if (EN === null && typeof R3_0D_EvidenceNodeContract !== 'undefined') EN = R3_0D_EvidenceNodeContract;
  if (SI === null && typeof R3_0D_SourceIdentityContract !== 'undefined') SI = R3_0D_SourceIdentityContract;
  if (REC === null && typeof R3_0D_RecommendationContract !== 'undefined') REC = R3_0D_RecommendationContract;
  if (EBC === null && typeof R3_0D_EngineerBriefContract !== 'undefined') EBC = R3_0D_EngineerBriefContract;

  // D5 depends on D3 (Hypothesis Engine) for verifyAuthoritativeHypothesisSet, AND
  // on D4 (Priority Engine) for verifyAuthoritativePrioritySet.
  var HE = null, PE = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HE = require('./r3-0d-hypothesis-engine.js'); } catch (e) { HE = null; }
    try { PE = require('./r3-0d-priority-engine.js'); } catch (e) { PE = null; }
  }
  if (HE === null && typeof R3_0D_HypothesisEngine !== 'undefined') HE = R3_0D_HypothesisEngine;
  if (PE === null && typeof R3_0D_PriorityEngine !== 'undefined') PE = R3_0D_PriorityEngine;

  if (!HI || !RC || !CR || !HC || !EBC || !HE || !PE) {
    throw new Error('r3-0d-engineer-brief.js: missing one or more required R3.0D contracts');
  }

  var CODES = RC.REASON_CODES;

  // Module-init captures (D4 R1-R6 lessons applied proactively).
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;
  var _CAPTURED_OBJECT_IS = Object.is;
  var _CAPTURED_DATE_PARSE = Date.parse;
  function _isFrozenSafe(v) { try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; } catch (e) { return false; } }
  function _exactlyEqual(a, b) { try { return _CAPTURED_OBJECT_IS(a, b) === true; } catch (e) { return false; } }
  function _isoToMs(s) {
    try {
      if (typeof s !== 'string' || s.length === 0) return null;
      var n = _CAPTURED_DATE_PARSE(s);
      if (typeof n !== 'number' || n !== n) return null;
      return n;
    } catch (e) { return null; }
  }

  // ---- D5 own producer-attestation captures (mirror D3 R4-01 hardening) -----------------------
  // PRODUCER AUTHORITY MODEL: D5 is the sole producer of EngineerBriefs. Downstream consumers
  // (host wiring, activation gate, R3.0E / R3.0F consumers) call verifyAuthoritativeEngineerBrief.
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
  var _authoritativeEngineerBriefs = new _WeakSetCtor();
  function _registerAuthoritativeEngineerBrief(brief) {
    _wsAdd(_authoritativeEngineerBriefs, brief);
  }
  function verifyAuthoritativeEngineerBrief(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeEngineerBriefs, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== BRIEF_SCHEMA_VERSION) return false;
      if (typeof candidate.briefId !== 'string') return false;
      if (typeof candidate.sourcePrioritySetId !== 'string') return false;
      if (typeof candidate.sourceHypothesisSetId !== 'string') return false;
      return true;
    } catch (e) { return false; }
  }

  var _HI_API_FROZEN_AT_LOAD = (function () {
    try { return _CAPTURED_OBJECT_IS_FROZEN(HI); } catch (e) { return false; }
  })();
  var _HI_HAS = (function () {
    var required = ['safeOwnKeys', 'safeKeys', 'safeGetOwnDescriptor', 'safeHasOwn', 'safeArrayPush',
      'safeArrayIndexOf', 'safeArrayForEach', 'safeArrayMap', 'safeArraySlice', 'safeArraySort',
      'safeStringSlice', 'safeIsArray', 'safeIsPlainShape',
      'safeNumberIsInteger', 'safeStructuredClone', 'safeObjectCreateNull',
      'safeDefineDataProperty', 'safeGetPrototypeOf', 'safeGetOwnPropertyNames',
      'deepOriginalShapeAudit', 'deepFreeze', 'stableStringify'];
    for (var i = 0; i < required.length; i++) if (typeof HI[required[i]] !== 'function') return false;
    return true;
  })();
  function _intrinsicsIntact() {
    if (!_HI_API_FROZEN_AT_LOAD) return false;
    if (!_HI_HAS) return false;
    if (!_isFrozenSafe(HI)) return false;
    return true;
  }
  function _buildIntrinsicTamperBlock(detail) {
    var reasonsArr = HI.safeArraySlice([CODES.INTERNAL_CONTRACT_VIOLATION]);
    var explanationsObj = HI.safeObjectCreateNull();
    var explKey = RC.explanationKeyFor ? RC.explanationKeyFor(CODES.INTERNAL_CONTRACT_VIOLATION) : 'r3.0d.error.internal_contract_violation';
    HI.safeDefineDataProperty(explanationsObj, CODES.INTERNAL_CONTRACT_VIOLATION, explKey);
    return HI.deepFreeze({
      valid: false,
      reasonCodes: HI.deepFreeze(reasonsArr),
      explanationKeys: HI.deepFreeze(explanationsObj),
      detail: HI.safeStringCoerce(detail || 'intrinsic tampering detected'),
    });
  }

  // ---------- Constants -------------------------------------------------------------------------
  var BRIEF_SCHEMA_VERSION = 1;
  var SERVICE_VERSION = 1;
  var ENVELOPE_BYTE_CAP = 256 * 1024;
  var DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  var ARRAY_CAP = 32;
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

  function _byteLength(s) {
    try { return HI.safeUtf8ByteLength ? HI.safeUtf8ByteLength(s) : (typeof s === 'string' ? s.length : 0); }
    catch (e) { return 0; }
  }

  // ---------- Input snapshot (D4-style descriptor audit) ---------------------------------------
  // Closed key set for D5 input wrapper.
  var INPUT_KEYS_ALLOWED = HI.deepFreeze(['hypothesisSet', 'prioritySet']);
  var OPTS_KEYS_ALLOWED = HI.deepFreeze(['clock', 'referenceNowMs', 'maxAgeMs']);

  function _isPlainObject(v) {
    try {
      if (v === null || typeof v !== 'object') return false;
      return HI.safeIsPlainShape(v) === 'plain-object';
    } catch (e) { return false; }
  }
  function _isPlainArray(v) {
    try { return HI.safeIsArray(v); } catch (e) { return false; }
  }

  // Descriptor-only input snapshot. Symbol / non-enumerable / accessor / function fields → reject.
  function _snapshotInputDescriptors(inputIn) {
    if (!_isPlainObject(inputIn)) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'input not plain' };
    if (!_isFrozenSafe(inputIn)) {
      // Input root MUST be frozen — matches D4's stance.
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED], detail: 'input root not frozen' };
    }
    var names;
    try { names = HI.safeGetOwnPropertyNames(inputIn); } catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'descriptor read failed' }; }
    // Symbol-keyed own property → reject.
    var symbols;
    try { symbols = HI.safeArraySlice(Object.getOwnPropertySymbols(inputIn) || []); } catch (e) { symbols = null; }
    if (symbols && symbols.length > 0) return { valid: false, reasonCodes: [CODES.UNKNOWN_OWN_KEY], detail: 'input has Symbol own key' };
    var snap = HI.safeObjectCreateNull();
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      if (HI.safeArrayIndexOf(INPUT_KEYS_ALLOWED, k) === -1) {
        return { valid: false, reasonCodes: [CODES.UNKNOWN_OWN_KEY], detail: 'unknown input own key' };
      }
      var d;
      try { d = HI.safeGetOwnDescriptor(inputIn, k); } catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'descriptor inaccessible' }; }
      if (!d || !d.enumerable) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'non-enumerable input key' };
      if (typeof d.get === 'function' || typeof d.set === 'function') {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED], detail: 'accessor input descriptor' };
      }
      HI.safeDefineDataProperty(snap, k, d.value);
    }
    return { valid: true, snapshot: snap };
  }

  function _snapshotOptsDescriptors(optsIn) {
    var snap = HI.safeObjectCreateNull();
    if (optsIn === undefined || optsIn === null) return { valid: true, snapshot: snap };
    if (!_isPlainObject(optsIn)) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'opts not plain' };
    var symbols;
    try { symbols = HI.safeArraySlice(Object.getOwnPropertySymbols(optsIn) || []); } catch (e) { symbols = null; }
    if (symbols && symbols.length > 0) return { valid: false, reasonCodes: [CODES.UNKNOWN_OWN_KEY], detail: 'opts has Symbol own key' };
    var names;
    try { names = HI.safeGetOwnPropertyNames(optsIn); } catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'opts descriptor read failed' }; }
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      if (HI.safeArrayIndexOf(OPTS_KEYS_ALLOWED, k) === -1) return { valid: false, reasonCodes: [CODES.UNKNOWN_OWN_KEY], detail: 'unknown opts own key' };
      var d;
      try { d = HI.safeGetOwnDescriptor(optsIn, k); } catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'opts descriptor inaccessible' }; }
      if (!d || !d.enumerable) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'non-enumerable opts key' };
      if (k === 'clock') {
        // D4 R1 D4-R1-02 closure: opts.clock MUST be a data descriptor whose .value is either
        // null/undefined or a function. Accessor descriptors / non-function values rejected.
        if (typeof d.get === 'function' || typeof d.set === 'function') {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED], detail: 'accessor opts.clock descriptor' };
        }
        if (d.value !== null && d.value !== undefined && typeof d.value !== 'function') {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'opts.clock not function' };
        }
        HI.safeDefineDataProperty(snap, k, d.value);
      } else if (k === 'referenceNowMs') {
        if (typeof d.get === 'function' || typeof d.set === 'function') {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED], detail: 'accessor referenceNowMs' };
        }
        if (d.value !== undefined && d.value !== null && typeof d.value !== 'number') {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'referenceNowMs not number' };
        }
        HI.safeDefineDataProperty(snap, k, d.value);
      } else if (k === 'maxAgeMs') {
        if (typeof d.get === 'function' || typeof d.set === 'function') {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED], detail: 'accessor maxAgeMs' };
        }
        if (d.value !== undefined && d.value !== null && (typeof d.value !== 'number' || !HI.safeNumberIsInteger(d.value) || d.value < 0)) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID], detail: 'maxAgeMs invalid' };
        }
        HI.safeDefineDataProperty(snap, k, d.value);
      }
    }
    return { valid: true, snapshot: snap };
  }

  // ---------- ID generators (deterministic from D3+D4 IDs) -------------------------------------
  function _hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }
  function _fnv2(s) {
    var slen = (typeof s === 'string') ? s.length : 0;
    return _hash32(s) + _hash32(s + '|' + slen);
  }
  function _briefId(hsId, psId) { return 'brief_' + _fnv2('brief|' + hsId + '|' + psId); }

  // ---------- Brief composer ---------------------------------------------------------------------
  /**
   * buildEngineerBrief({hypothesisSet, prioritySet}, opts) — produces a deep-frozen
   * EngineerBrief envelope.
   *
   * Authority order (matches D4 R5-01 verifier-first ordering):
   *   1. Snapshot input descriptors (no [[Get]] reads of inner fields yet)
   *   2. HE.verifyAuthoritativeHypothesisSet(hypothesisSet) — FIRST authority gate
   *   3. PE.verifyAuthoritativePrioritySet(prioritySet) — SECOND authority gate
   *   4. Cross-binding: prioritySet.sourceHypothesisSetId === hypothesisSet.hypothesisSetId
   *   5. Identity bindings: caseAssociation + sessionAssociation match
   *   6. Snapshot opts descriptors
   *   7. Resolve freshness reference time (clock invoked AT MOST ONCE post-authority)
   *   8. Freshness check
   *   9. Compose brief (re-projection of D3 + D4 fields; contradictions visible)
   *   10. Validate brief shape via EBC.validateEngineerBriefShape (D1 contract layer)
   *   11. Build activation gate signal
   *   12. Materialize + deep-freeze + register
   */
  function buildEngineerBrief(inputIn, optsIn) {
    try {
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected at entry');
      }

      // ---- Step 1 — input descriptor snapshot --------------------------------------------------
      var inSnapR = _snapshotInputDescriptors(inputIn);
      if (inSnapR.valid !== true) {
        return RC.buildBlockedResult(inSnapR.reasonCodes, { detail: inSnapR.detail });
      }
      var inputSnap = inSnapR.snapshot;

      // ---- Step 2 — D3 PRODUCER AUTHORITY (first read) -----------------------------------------
      // D4 R5-01 closure: verifier MUST be the first read on caller-supplied data. The verifier
      // itself does NOT fire Proxy traps for non-members (WeakSet.has via captured Reflect.apply).
      if (typeof HE.verifyAuthoritativeHypothesisSet !== 'function'
          || HE.verifyAuthoritativeHypothesisSet(inputSnap.hypothesisSet) !== true) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_AUTHORITY_FORGED], { detail: 'D3 hypothesisSet authority verification failed' });
      }
      var hs = inputSnap.hypothesisSet;

      // ---- Step 3 — D4 PRODUCER AUTHORITY ------------------------------------------------------
      if (typeof PE.verifyAuthoritativePrioritySet !== 'function'
          || PE.verifyAuthoritativePrioritySet(inputSnap.prioritySet) !== true) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_AUTHORITY_FORGED], { detail: 'D4 prioritySet authority verification failed' });
      }
      var ps = inputSnap.prioritySet;

      // ---- Step 4 — cross-binding --------------------------------------------------------------
      // The D4 PrioritySet MUST have been derived from THIS D3 HypothesisSet.
      if (ps.sourceHypothesisSetId !== hs.hypothesisSetId) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_AUTHORITY_FORGED], { detail: 'prioritySet not derived from this hypothesisSet' });
      }
      if (ps.sourceGraphId !== hs.sourceGraphId) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_AUTHORITY_FORGED], { detail: 'sourceGraphId mismatch between D3 and D4' });
      }

      // ---- Step 5 — identity binding -----------------------------------------------------------
      var hsCA = hs.caseAssociation;
      var psCA = ps.caseAssociation;
      if (!_isPlainObject(hsCA) || !_isPlainObject(psCA)) {
        return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID], { detail: 'caseAssociation shape invalid' });
      }
      if (hsCA.caseId !== psCA.caseId || hsCA.sessionId !== psCA.sessionId || hsCA.lapId !== psCA.lapId) {
        return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID], { detail: 'caseAssociation mismatch between D3 and D4' });
      }
      var hsSA = hs.sessionAssociation;
      var psSA = ps.sessionAssociation;
      if (!_isPlainObject(hsSA) || !_isPlainObject(psSA)
          || hsSA.sessionId !== psSA.sessionId) {
        return RC.buildBlockedResult([CODES.SOURCE_IDENTITY_INVALID], { detail: 'sessionAssociation mismatch between D3 and D4' });
      }

      // ---- Step 6 — opts descriptor snapshot ---------------------------------------------------
      var optsSnapR = _snapshotOptsDescriptors(optsIn);
      if (optsSnapR.valid !== true) {
        return RC.buildBlockedResult(optsSnapR.reasonCodes, { detail: optsSnapR.detail });
      }
      var optsSnap = optsSnapR.snapshot;

      // ---- Step 7 — resolve freshness reference time (clock at most once, post-authority) -----
      var refNowMs = null;
      var resolvedClockIso = null;
      if (typeof optsSnap.referenceNowMs === 'number' && HI.safeNumberIsInteger(optsSnap.referenceNowMs) && optsSnap.referenceNowMs >= 0) {
        refNowMs = optsSnap.referenceNowMs;
      } else if (typeof optsSnap.clock === 'function') {
        var clockIso = null;
        try { clockIso = optsSnap.clock(); } catch (eClock) { clockIso = null; }
        if (typeof clockIso === 'string' && clockIso.length > 0) {
          refNowMs = _isoToMs(clockIso);
          if (typeof refNowMs === 'number') resolvedClockIso = clockIso;
        }
      }
      if (typeof refNowMs !== 'number' || refNowMs !== refNowMs) {
        return RC.buildBlockedResult([CODES.FRESHNESS_REFERENCE_MISSING], { detail: 'unable to resolve reference time' });
      }
      var maxAgeMs = (typeof optsSnap.maxAgeMs === 'number') ? optsSnap.maxAgeMs : DEFAULT_MAX_AGE_MS;

      // ---- Step 8 — freshness check (uses hs.createdAt + ps.createdAt) ------------------------
      var hsCreatedMs = (typeof hs.createdAt === 'string') ? _isoToMs(hs.createdAt) : null;
      var psCreatedMs = (typeof ps.createdAt === 'string') ? _isoToMs(ps.createdAt) : null;
      if (hsCreatedMs !== null && (refNowMs - hsCreatedMs) > maxAgeMs) {
        return RC.buildBlockedResult([CODES.STALE_EVIDENCE], { detail: 'hypothesisSet exceeds max age' });
      }
      if (psCreatedMs !== null && (refNowMs - psCreatedMs) > maxAgeMs) {
        return RC.buildBlockedResult([CODES.STALE_EVIDENCE], { detail: 'prioritySet exceeds max age' });
      }

      // ---- Codex D-GATE-02 closure: reject any imported-summary derived input ----------------
      // D2 tags graph.limitations with LIMITATION_IMPORTED_SUMMARY when ANY sanitized node
      // has sourceId === 'imported_summary'. D3 unions per-hypothesis limitations into
      // hs.limitations. Here at D5 brief composition, we block before producing a brief —
      // the imported-summary path can never yield an authoritative engineer brief, even at
      // low credibility, because the engineer brief is a definitive race-engineering
      // diagnosis surface and an imported summary lacks the raw-evidence chain needed to
      // make that claim. Per directive §13 (state.imported_summary_opens → blocks).
      if (HI.safeIsArray(hs.limitations)) {
        for (var liIS = 0; liIS < hs.limitations.length; liIS++) {
          if (hs.limitations[liIS] === CODES.LIMITATION_IMPORTED_SUMMARY) {
            return RC.buildBlockedResult([CODES.LIMITATION_IMPORTED_SUMMARY], { detail: 'imported-summary path cannot yield engineer brief' });
          }
        }
      }

      // ---- Step 9 — compose brief --------------------------------------------------------------
      // Find primary priority (by primaryActionId).
      var primaryAction = null;
      var secondaryAction = null;
      if (typeof ps.primaryActionId === 'string') {
        for (var pi = 0; pi < ps.priorities.length; pi++) {
          if (ps.priorities[pi].priorityId === ps.primaryActionId) { primaryAction = ps.priorities[pi]; break; }
        }
      }
      if (primaryAction !== null) {
        for (var si = 0; si < ps.priorities.length; si++) {
          var sp = ps.priorities[si];
          if (sp.priorityId === primaryAction.priorityId) continue;
          if (HI.safeArrayIndexOf(sp.blockingPrerequisiteIds || [], primaryAction.priorityId) !== -1) continue;
          if (sp.eligibleAsPrimary !== true) continue;
          secondaryAction = sp;
          break;
        }
      }
      // Build brief envelope. Note: the engineer-brief-contract requires:
      //   briefId, identity, primaryIssueI18nKey, primaryIssueParams,
      //   secondaryIssueI18nKey, secondaryIssueParams, evidenceSummary, contradictions,
      //   alternativeExplanations, cannotConcludeReasonCodes, nextValidationAction,
      //   driverExperimentI18nKey, setupExperimentI18nKey, confidence, credibility,
      //   provenance, limitations, schemaVersion.
      // D5 also adds (in a SEPARATE D5-internal extension envelope, NOT inside the
      // engineer-brief-contract-validated `brief` field): sourcePrioritySetId,
      // sourceHypothesisSetId, activation gate, createdAt, schemaVersion.
      var hypById = HI.safeObjectCreateNull();
      for (var hi = 0; hi < hs.hypotheses.length; hi++) {
        HI.safeDefineDataProperty(hypById, hs.hypotheses[hi].hypothesisId, hs.hypotheses[hi]);
      }
      var primaryHyp = primaryAction !== null ? hypById[primaryAction.hypothesisId] : null;
      var secondaryHyp = secondaryAction !== null ? hypById[secondaryAction.hypothesisId] : null;

      // Compose evidenceSummary from union of supporting + contradicting nodeIds across all
      // hypotheses (deduped, capped). Use stable order based on D3 emission order.
      var evidenceSummary = [];
      var evSeen = HI.safeObjectCreateNull();
      for (var hh = 0; hh < hs.hypotheses.length && evidenceSummary.length < ARRAY_CAP; hh++) {
        var hp = hs.hypotheses[hh];
        var supEv = (hp.supportingEvidenceIds && hp.supportingEvidenceIds.length) ? hp.supportingEvidenceIds : [];
        for (var ei2 = 0; ei2 < supEv.length && evidenceSummary.length < ARRAY_CAP; ei2++) {
          var nid = supEv[ei2];
          if (HI.safeHasOwn(evSeen, nid)) continue;
          HI.safeDefineDataProperty(evSeen, nid, true);
          HI.safeArrayPush(evidenceSummary, HI.deepFreeze({
            nodeId: nid,
            i18nKey: 'r3.0d.evidence.supporting',
            params: HI.deepFreeze({ hypothesisId: hp.hypothesisId }),
          }));
        }
      }

      // Compose contradictions array (visible per directive §10 / engineer-brief-contract).
      var contradictions = [];
      for (var hh2 = 0; hh2 < hs.hypotheses.length && contradictions.length < ARRAY_CAP; hh2++) {
        var hp2 = hs.hypotheses[hh2];
        if (hp2.status !== 'contradicted' || !hp2.contradictingEvidenceIds || hp2.contradictingEvidenceIds.length === 0) continue;
        HI.safeArrayPush(contradictions, HI.deepFreeze({
          hypothesisId: hp2.hypothesisId,
          contradictingEvidenceIds: HI.deepFreeze(HI.safeArraySlice(hp2.contradictingEvidenceIds)),
          i18nKey: hp2.i18nKey,
          params: HI.deepFreeze({ category: hp2.category }),
        }));
      }

      // Compose alternativeExplanations (union of all hypotheses' alternativeExplanationIds, deduped).
      var alternativeExplanations = [];
      var altSeen = HI.safeObjectCreateNull();
      for (var hh3 = 0; hh3 < hs.hypotheses.length && alternativeExplanations.length < ARRAY_CAP; hh3++) {
        var hp3 = hs.hypotheses[hh3];
        var altIds = hp3.alternativeExplanationIds ? hp3.alternativeExplanationIds : [];
        for (var ai2 = 0; ai2 < altIds.length && alternativeExplanations.length < ARRAY_CAP; ai2++) {
          var aid = altIds[ai2];
          if (HI.safeHasOwn(altSeen, aid)) continue;
          HI.safeDefineDataProperty(altSeen, aid, true);
          HI.safeArrayPush(alternativeExplanations, HI.deepFreeze({
            alternativeId: aid,
            i18nKey: 'r3.0d.alternative.' + aid,
            params: HI.deepFreeze({ originHypothesisId: hp3.hypothesisId }),
          }));
        }
      }

      // cannotConcludeReasonCodes (union across hypotheses; deduped).
      var cannotConcludeReasonCodes = [];
      var ccSeen = HI.safeObjectCreateNull();
      for (var hh4 = 0; hh4 < hs.hypotheses.length && cannotConcludeReasonCodes.length < ARRAY_CAP; hh4++) {
        var hp4 = hs.hypotheses[hh4];
        var ccs = hp4.cannotConcludeReasonCodes ? hp4.cannotConcludeReasonCodes : [];
        for (var cci = 0; cci < ccs.length && cannotConcludeReasonCodes.length < ARRAY_CAP; cci++) {
          var ccode = ccs[cci];
          if (HI.safeHasOwn(ccSeen, ccode)) continue;
          if (!RC.isReasonCode(ccode)) continue;
          HI.safeDefineDataProperty(ccSeen, ccode, true);
          HI.safeArrayPush(cannotConcludeReasonCodes, ccode);
        }
      }

      // limitations — union of hs.limitations + every hypothesis's limitations.
      var limitations = [];
      var limSeen = HI.safeObjectCreateNull();
      function _addLim(list) {
        if (!_isPlainArray(list)) return;
        for (var li2 = 0; li2 < list.length && limitations.length < ARRAY_CAP; li2++) {
          var lc = list[li2];
          if (HI.safeHasOwn(limSeen, lc)) continue;
          if (!RC.isReasonCode(lc)) continue;
          HI.safeDefineDataProperty(limSeen, lc, true);
          HI.safeArrayPush(limitations, lc);
        }
      }
      _addLim(hs.limitations);
      for (var hh5 = 0; hh5 < hs.hypotheses.length && limitations.length < ARRAY_CAP; hh5++) {
        _addLim(hs.hypotheses[hh5].limitations);
      }

      // nextValidationAction — FIRST validationActionIds from primary hypothesis (if any).
      var nextValidationAction = null;
      if (primaryHyp !== null && primaryHyp.validationActionIds && primaryHyp.validationActionIds.length > 0) {
        nextValidationAction = HI.deepFreeze({
          actionId: primaryHyp.validationActionIds[0],
          kind: primaryAction !== null ? primaryAction.kind : 'no_action_required',
          i18nKey: 'r3.0d.action.' + primaryHyp.validationActionIds[0],
        });
      }

      // setupExperimentI18nKey — only if a setup_experiment priority is eligibleAsPrimary
      // (per directive §10 "unsupported setup actions" forbidden).
      var setupExperimentI18nKey = null;
      for (var spi = 0; spi < ps.priorities.length; spi++) {
        var pp = ps.priorities[spi];
        if (pp.kind === 'setup_experiment' && pp.eligibleAsPrimary === true) {
          setupExperimentI18nKey = 'r3.0d.action.setup_experiment.' + pp.priorityId;
          break;
        }
      }
      var driverExperimentI18nKey = null;
      for (var dpi = 0; dpi < ps.priorities.length; dpi++) {
        var dp = ps.priorities[dpi];
        if (dp.kind === 'driver_experiment' && dp.eligibleAsPrimary === true) {
          driverExperimentI18nKey = 'r3.0d.action.driver_experiment.' + dp.priorityId;
          break;
        }
      }

      // confidence — D1 contract: { state: 'unresolved' | 'not_computed' } at the brief layer.
      // D5 does NOT echo D3's quantitative confidence into the brief layer (per contract).
      // The D3-internal numeric score lives in the hypothesisSet only.
      var briefConfidence = HI.deepFreeze({ state: 'not_computed' });
      // credibility — primary hypothesis's credibility from CONCLUSION_CREDIBILITY ladder
      // ('Physics' / 'Model' / 'Measured' / 'Derived' / 'Heuristic' / 'Unavailable').
      // D3 emits one of these per hypothesis via _aggregateCredibility; downgrade to
      // 'Heuristic' when no primary.
      var briefCredibility = (primaryHyp !== null && primaryHyp.credibility)
        ? primaryHyp.credibility
        : 'Heuristic';
      // provenance — D5 does NOT echo D3's hypothesis.provenance (which is an OBJECT containing
      // ruleId/ruleVersion/etc — NOT a PROVENANCE enum value). The brief PROVENANCE enum
      // (mirrors R3.0B/R3.0C) is {'synthetic','real','unverified'}. D5 is conservative: it
      // does NOT make a real/synthetic claim about evidence sources at this layer (the source
      // signal is consumed by D2 evidence nodes individually and aggregated into hypotheses).
      // 'unverified' is the safe default — orchestrator/UI layer can attach a derived label
      // based on case-record provenance (which D5 does not have authority over).
      var briefProvenance = 'unverified';

      var briefIdStr = _briefId(hs.hypothesisSetId, ps.prioritySetId);

      // SOURCE_IDENTITY_KEYS = ['caseId','sessionId','lapId','sourceId','sourceVersion','freshness']
      // — NO schemaVersion key. Producer attestation lives on the envelope, not on identity.
      var briefIdentity = HI.deepFreeze({
        sourceId: 'r3_0d_engineer_brief',
        sourceVersion: SERVICE_VERSION + '.0',
        caseId: hsCA.caseId,
        sessionId: hsCA.sessionId,
        lapId: hsCA.lapId,
        freshness: (typeof hs.createdAt === 'string') ? hs.createdAt : (resolvedClockIso || ''),
      });

      // The contract-validated `brief` object — closed key set per engineer-brief-contract.
      // HI.deepFreeze used for the outer wrapper (ambient Object.freeze ban per directive §9);
      // all nested arrays/objects are already individually deep-frozen above.
      var brief = HI.deepFreeze({
        briefId: briefIdStr,
        identity: briefIdentity,
        primaryIssueI18nKey: primaryHyp !== null ? primaryHyp.i18nKey : 'r3.0d.brief.no_primary_action',
        primaryIssueParams: HI.deepFreeze({
          hypothesisId: primaryHyp !== null ? primaryHyp.hypothesisId : '',
          priorityId: primaryAction !== null ? primaryAction.priorityId : '',
        }),
        secondaryIssueI18nKey: secondaryHyp !== null ? secondaryHyp.i18nKey : null,
        secondaryIssueParams: secondaryHyp !== null ? HI.deepFreeze({
          hypothesisId: secondaryHyp.hypothesisId,
          priorityId: secondaryAction.priorityId,
        }) : null,
        evidenceSummary: HI.deepFreeze(evidenceSummary),
        contradictions: HI.deepFreeze(contradictions),
        alternativeExplanations: HI.deepFreeze(alternativeExplanations),
        cannotConcludeReasonCodes: HI.deepFreeze(cannotConcludeReasonCodes),
        nextValidationAction: nextValidationAction,
        driverExperimentI18nKey: driverExperimentI18nKey,
        setupExperimentI18nKey: setupExperimentI18nKey,
        confidence: briefConfidence,
        credibility: briefCredibility,
        provenance: briefProvenance,
        limitations: HI.deepFreeze(limitations),
        schemaVersion: 1,
      });

      // ---- Step 10 — validate brief shape via D1 engineer-brief-contract ----------------------
      var briefCheck = EBC.validateEngineerBriefShape(brief);
      if (briefCheck.valid !== true) {
        return RC.buildBlockedResult(
          briefCheck.reasonCodes ? HI.safeArraySlice(briefCheck.reasonCodes) : [CODES.BRIEF_INVALID],
          { detail: 'engineer-brief-contract validation failed' }
        );
      }

      // ---- Step 11 — activation gate signal ---------------------------------------------------
      // D5 EXPOSES the gating signal as a derived boolean. The UI host wiring code (separate
      // module / index.html script wiring) consumes this to decide whether to mount the
      // R3.0D UI shell. D5 does NOT touch feature-registry.js or state.json from inside this
      // module — the gate is declarative.
      // Ambient Array.prototype.every ban (§9) — use a captured for-loop.
      var allHypothesesContradicted = false;
      if (hs.hypotheses.length > 0) {
        allHypothesesContradicted = true;
        for (var hac = 0; hac < hs.hypotheses.length; hac++) {
          if (hs.hypotheses[hac].status !== 'contradicted') { allHypothesesContradicted = false; break; }
        }
      }
      var uiCapabilityReady = primaryAction !== null
        && primaryHyp !== null
        && primaryHyp.status !== 'contradicted'
        && primaryHyp.status !== 'blocked'
        && primaryAction.eligibleAsPrimary === true
        && !allHypothesesContradicted;
      var deferredCapabilities = [];
      if (!uiCapabilityReady) HI.safeArrayPush(deferredCapabilities, 'engineer_brief_present');
      if (limitations.length > 0) HI.safeArrayPush(deferredCapabilities, 'feature_registry_active');
      var activation = HI.deepFreeze({
        uiCapabilityReady: uiCapabilityReady,
        featureRegistryActivationAllowed: uiCapabilityReady && limitations.length === 0,
        deferredCapabilities: HI.deepFreeze(deferredCapabilities),
        rationaleI18nKey: uiCapabilityReady
          ? 'r3.0d.activation.ready'
          : 'r3.0d.activation.deferred',
        rationaleParams: HI.deepFreeze({
          contradictionsCount: contradictions.length,
          limitationsCount: limitations.length,
        }),
      });

      // ---- Step 12 — materialize envelope -----------------------------------------------------
      var envelope = HI.deepFreeze({
        schemaVersion: BRIEF_SCHEMA_VERSION,
        briefId: briefIdStr,
        sourceHypothesisSetId: hs.hypothesisSetId,
        sourcePrioritySetId: ps.prioritySetId,
        brief: brief,
        activation: activation,
        createdAt: resolvedClockIso || (typeof hs.createdAt === 'string' ? hs.createdAt : ''),
      });

      // Envelope byte cap
      var finalEnvBytes;
      try { finalEnvBytes = _byteLength(HI.stableStringify(envelope)); }
      catch (eBytes) { finalEnvBytes = Infinity; }
      if (finalEnvBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'final envelope ' + finalEnvBytes + ' bytes exceeds ' + ENVELOPE_BYTE_CAP });
      }

      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-freeze');
      }

      // Register the envelope as D5-authoritative for downstream consumers.
      _registerAuthoritativeEngineerBrief(envelope);

      return HI.deepFreeze({ valid: true, engineerBrief: envelope });

    } catch (eOuter) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'buildEngineerBrief threw on hostile input' });
    }
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    BRIEF_SCHEMA_VERSION: BRIEF_SCHEMA_VERSION,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    buildEngineerBrief: buildEngineerBrief,
    // Producer-attestation verifier for downstream consumers (R3.0E / R3.0F / host wiring).
    verifyAuthoritativeEngineerBrief: verifyAuthoritativeEngineerBrief,
  };
  try { HI.deepFreeze(api); } catch (e) { /* swallow */ }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_EngineerBrief = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
