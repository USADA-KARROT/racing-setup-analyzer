/**
 * renderer/js/r3-0d-priority-engine.js — R3.0D D4 · Priority Engine (PRODUCTION).
 *
 * Authoritative entry: buildPrioritySet(input, opts)
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0 Continuous Resume Directive §12):
 *   • Input is a D3 AUTHORITATIVE Hypothesis Set snapshot ONLY. Authority enforced via:
 *     (1) frozen-input requirement (captured Object.isFrozen),
 *     (2) HI.safeStructuredClone-defang,
 *     (3) post-clone HI.deepOriginalShapeAudit,
 *     (4) hypothesisSetId recompute equality with asserted hsetId,
 *     (5) per-hypothesis ID grammar + D1 hypothesis-contract delegation (where possible).
 *   • FIXED priority ladder, MUST NOT be reversed:
 *       (1) data_quality          → fix_data_quality / recalibrate_channel
 *       (2) mapping_calibration   → recalibrate_channel
 *       (3) controlled_repeat_lap (driver_behaviour / vehicle_response)
 *       (4) driver_experiment     (driver_behaviour)
 *       (5) setup_experiment      (setup_model) — lowest priority, MUST be blocked by any
 *           pending higher-tier item that has supportable evidence.
 *   • FORBIDDEN behaviors (per directive §12):
 *     - Order by confidence alone (ladder dominates)
 *     - setup before data quality
 *     - Low-credibility hypothesis as primary (Heuristic/Unavailable cannot be primary)
 *     - Ignore contradictions (contradicted hypotheses cannot be primary)
 *     - Unsupported setup actions (setup_experiment requires ≥Derived credibility + zero
 *       contradictions AND no blocking prerequisites)
 *     - Irreversible without rollback (every priority entry has a stop+rollback condition)
 *   • Auto-mode strictly FORBIDDEN. D4 emits descriptive priorities only; no apply_mode
 *     field, no auto_tuning, no auto_setup, no auto_calibration, no auto_preset.
 *   • No LLM. Deterministic. Closed kind enum from D1 hypothesis-contract.
 *     Output is deep-frozen.
 *   • All ambient calls go through R3_0D_HardenedIntrinsics (HI). Object.isFrozen +
 *     Date.parse + Object.is captured at module init.
 *   • Mandatory freshness reference time (opts.clock() OR opts.referenceNowMs); inherits
 *     D3's policy. Clock invoked at most once.
 *
 * UMD: Node require / Electron renderer global (R3_0D_PriorityEngine).
 */
(function (root) {
  'use strict';

  // ---------- Module-init capture: hardened intrinsics ------------------------------------------
  // UMD imports use literal-string specifiers below so the no-consumer scanner can statically
  // discover all dependencies.
  var HI = null, RC = null, CR = null, HC = null, EN = null, SI = null, REC = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { CR = require('../../contracts/r3.0d/credibility-contract.js'); } catch (e) { CR = null; }
    try { HC = require('../../contracts/r3.0d/hypothesis-contract.js'); } catch (e) { HC = null; }
    try { EN = require('../../contracts/r3.0d/evidence-node-contract.js'); } catch (e) { EN = null; }
    try { SI = require('../../contracts/r3.0d/source-identity-contract.js'); } catch (e) { SI = null; }
    try { REC = require('../../contracts/r3.0d/recommendation-contract.js'); } catch (e) { REC = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (CR === null && typeof R3_0D_CredibilityContract !== 'undefined') CR = R3_0D_CredibilityContract;
  if (HC === null && typeof R3_0D_HypothesisContract !== 'undefined') HC = R3_0D_HypothesisContract;
  if (EN === null && typeof R3_0D_EvidenceNodeContract !== 'undefined') EN = R3_0D_EvidenceNodeContract;
  if (SI === null && typeof R3_0D_SourceIdentityContract !== 'undefined') SI = R3_0D_SourceIdentityContract;
  if (REC === null && typeof R3_0D_RecommendationContract !== 'undefined') REC = R3_0D_RecommendationContract;

  // D4 also depends on R3_0D_HypothesisEngine for the canonical rule registry used in
  // cross-field validation (category + i18nKey + allowedCredibility binding).
  var HE = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HE = require('./r3-0d-hypothesis-engine.js'); } catch (e) { HE = null; }
  }
  if (HE === null && typeof R3_0D_HypothesisEngine !== 'undefined') HE = R3_0D_HypothesisEngine;

  if (!HI || !RC || !CR || !HC || !HE) {
    throw new Error('r3-0d-priority-engine.js: missing one or more required R3.0D contracts');
  }

  var CODES = RC.REASON_CODES;

  // Build a quick lookup map: ruleId → rule object — used by per-hypothesis cross-field validation.
  var _RULE_BY_ID = (function () {
    var m = HI.safeObjectCreateNull();
    for (var i = 0; i < HE.RULE_REGISTRY.length; i++) {
      var r = HE.RULE_REGISTRY[i];
      HI.safeDefineDataProperty(m, r.ruleId, r);
    }
    return m;
  })();
  // Closed status enum (Codex D4 R1 D4-R1-03 closure).
  var HYPOTHESIS_STATUS_ALLOWED = HI.deepFreeze(['supported', 'contradicted', 'inconclusive', 'blocked']);
  // Closed confidence state enum (matches D3 export).
  var CONFIDENCE_STATE_ALLOWED = HI.deepFreeze(['not_computed', 'insufficient_evidence', 'low', 'moderate', 'high']);
  // Closed key set for D3 hypothesis (Codex D4 R1 D4-R1-03 closure: extra keys rejected).
  // Codex D4 R2 D4-R2-03 closure: D3 now emits a contentSignature on every hypothesis (binds
  // full decision-relevant content); D4 includes it in the closed key set and recomputes it.
  var HYPOTHESIS_KEYS_ALLOWED = HI.deepFreeze([
    'hypothesisId', 'ruleId', 'ruleVersion', 'category', 'status', 'i18nKey',
    'supportingEvidenceIds', 'contradictingEvidenceIds', 'correlationGroupIds',
    'alternativeExplanationIds', 'cannotConcludeReasonCodes', 'validationActionIds',
    'credibility', 'confidence', 'limitations', 'contentSignature', 'provenance',
  ]);
  var CONFIDENCE_KEYS_ALLOWED = HI.deepFreeze(['state', 'score']);
  // Closed key set for D3 hypothesis-set top-level.
  var HSET_KEYS_ALLOWED = HI.deepFreeze([
    'schemaVersion', 'hypothesisSetId', 'sourceGraphId', 'caseAssociation', 'sessionAssociation',
    'hypotheses', 'alternativeExplanations', 'validationActions', 'cannotConclude', 'limitations',
    'provenance', 'createdAt', 'generationToken', 'contextVersion',
  ]);

  // Module-init captures (Codex D3 R1-R5 lessons applied proactively).
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

  var _HI_API_FROZEN_AT_LOAD = (function () {
    try { return _CAPTURED_OBJECT_IS_FROZEN(HI); } catch (e) { return false; }
  })();
  var _HI_HAS = (function () {
    var required = ['safeOwnKeys', 'safeKeys', 'safeGetOwnDescriptor', 'safeHasOwn', 'safeArrayPush',
      'safeArrayIndexOf', 'safeArrayForEach', 'safeArrayMap', 'safeArraySlice', 'safeArraySort',
      'safeStringSlice', 'safeStringCharCodeAt', 'safeStringCoerce', 'safeIsArray', 'safeIsPlainShape',
      'safeNumberIsInteger', 'safeNumberIsFinite', 'safeMathFloor', 'safeRegExpTest',
      'safeUtf8ByteLength', 'safeStructuredClone', 'safeObjectCreateNull', 'safeObjectAssign',
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
  var PRIORITY_SET_SCHEMA_VERSION = 1;
  var SERVICE_VERSION = 1;
  var PRIORITY_COUNT_CAP = 128;
  var PREREQ_ID_PER_PRIORITY_CAP = 32;
  var LIMITATIONS_PER_PRIORITY_CAP = 32;
  var SNAPSHOT_LIMITATIONS_CAP = 64;
  var SNAPSHOT_CANNOT_CONCLUDE_CAP = 64;
  var ENVELOPE_BYTE_CAP = 512 * 1024;
  var INPUT_HYPOTHESES_INPUT_CAP = 64;  // Mirror D3 HYPOTHESIS_COUNT_CAP
  var DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  // ID grammar — mirrors D2/D3
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;
  var STRING_BYTE_CAP = 512;

  // Closed priority kind enum — must match D1 hypothesis-contract.VALIDATION_ACTION_KIND_ALLOWED
  var PRIORITY_KIND_ALLOWED = HI.deepFreeze([
    'fix_data_quality',
    'recalibrate_channel',
    'controlled_repeat_lap',
    'driver_experiment',
    'setup_experiment',
    'collect_additional_session',
    'collect_additional_lap',
    'no_action_required',
  ]);
  // Tier mapping — LOWER number = HIGHER priority (must be acted on first).
  // Same tier → ordered by confidence score descending; tie-break by hypothesisId.
  // The fixed ladder per directive §12 is enforced by this tier mapping; reversing the
  // ladder would require changing TIER values, which is the cardinal D4 invariant.
  var PRIORITY_KIND_TIER = HI.deepFreeze({
    fix_data_quality: 1,
    recalibrate_channel: 2,
    controlled_repeat_lap: 3,
    driver_experiment: 4,
    setup_experiment: 5,
    collect_additional_session: 6,
    collect_additional_lap: 6,
    no_action_required: 7,
  });

  // Hypothesis category → priority kind mapping
  function _kindForCategory(cat) {
    if (cat === 'data_quality') return 'fix_data_quality';
    if (cat === 'mapping_calibration') return 'recalibrate_channel';
    if (cat === 'driver_behaviour') return 'controlled_repeat_lap';
    if (cat === 'vehicle_response') return 'controlled_repeat_lap';
    if (cat === 'setup_model') return 'setup_experiment';
    return 'collect_additional_session';
  }

  // Conclusion credibility ladder (lower index = stronger).
  var CONCLUSION_CREDIBILITY_ORDER = HI.deepFreeze(['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable']);
  function _crIndex(c) { return HI.safeArrayIndexOf(CONCLUSION_CREDIBILITY_ORDER, c); }
  function _crAtLeast(a, b) {
    var ia = _crIndex(a); var ib = _crIndex(b);
    if (ia === -1 || ib === -1) return false;
    return ia <= ib;
  }

  // ---------- Helpers (HI-only) -----------------------------------------------------------------
  function _isNonEmptyString(v) { return typeof v === 'string' && v.length > 0; }
  // Codex D4 R2 D4-R2-02 closure: recursive descriptor audit. Walks the object/array tree
  // via descriptor reads only — never invokes a [[Get]] trap. Rejects any non-data
  // descriptor (accessor with get/set), any Symbol-keyed own property, any non-enumerable
  // own property, any non-plain nested value (class instance, Proxy presents with prototype
  // != Object.prototype or Array.prototype). Bounded depth=32 + total nodes=4096.
  var _MAX_AUDIT_DEPTH = 32;
  var _MAX_AUDIT_NODES = 4096;
  function _recursiveDescriptorAudit(rootValue) {
    var visited = 0;
    function _walk(v, depth) {
      if (depth > _MAX_AUDIT_DEPTH) return false;
      visited += 1;
      if (visited > _MAX_AUDIT_NODES) return false;
      if (v === null) return true;
      var t = typeof v;
      if (t === 'string' || t === 'boolean') return true;
      if (t === 'number') return HI.safeNumberIsFinite(v) === true;
      if (t === 'undefined') return true;
      if (t === 'function' || t === 'symbol' || t === 'bigint') return false;
      if (t !== 'object') return false;
      // Must be plain object or plain array (proto = Object.prototype / Array.prototype / null).
      var shape = HI.safeIsPlainShape(v);
      if (shape === 'reject') return false;
      var keys = HI.safeOwnKeys(v);
      if (keys === null) return false;
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof k === 'symbol') return false;
        var d = HI.safeGetOwnDescriptor(v, k);
        if (!d) return false;
        if (!('value' in d)) return false;  // accessor descriptor (get/set)
        if (shape === 'plain-array') {
          // Array elements are enumerable by default; `length` is non-enumerable but is OK.
          if (k === 'length') {
            // Array.length is a data descriptor; allow.
          } else if (!d.enumerable) {
            return false;
          }
        } else {
          if (!d.enumerable) return false;
        }
        if (!_walk(d.value, depth + 1)) return false;
      }
      return true;
    }
    var ok = false;
    try { ok = _walk(rootValue, 0); } catch (e) { ok = false; }
    return { ok: ok, visited: visited };
  }
  function _isFiniteNumber(v) { return typeof v === 'number' && HI.safeNumberIsFinite(v) === true; }
  function _isInteger(v) { return HI.safeNumberIsInteger(v) === true; }
  function _isPlainObject(v) { return HI.safeIsPlainShape(v) === 'plain-object'; }
  function _isPlainArray(v) { return HI.safeIsPlainShape(v) === 'plain-array'; }
  function _byteLength(s) { if (typeof s !== 'string') return 0; return HI.safeUtf8ByteLength(s); }
  function _strcmp(a, b) { if (a < b) return -1; if (a > b) return 1; return 0; }
  function _arrPush(arr, v) { HI.safeArrayPush(arr, v); }

  // ---------- FNV-1a 32-bit×2 hash (byte-equivalent to D2 / D3) ---------------------------------
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

  // ---------- D3 Hypothesis Set authority verification -----------------------------------------
  function _recomputeHypothesisSetId(hsetClone) {
    // Codex D4 R2 D4-R2-01 closure: mirror D3's NEW hsetId formula which binds (hid, csig)
    // pairs sorted by hid. Caller mutating any decision-relevant field on any hypothesis
    // changes that hypothesis's contentSignature, which changes hsetId.
    var pairs = HI.safeArrayMap(hsetClone.hypotheses, function (h) {
      return { hid: h.hypothesisId, csig: h.contentSignature };
    });
    HI.safeArraySort(pairs, function (a, b) { return _strcmp(a.hid, b.hid); });
    var hashMaterial = {
      v: hsetClone.schemaVersion,
      graphId: hsetClone.sourceGraphId,
      pairs: pairs,
    };
    return 'hset_' + _hashFNV64Hex('hypothesissetid|v' + hsetClone.schemaVersion + '|' + HI.stableStringify(hashMaterial));
  }

  function _validateAuthoritativeHypothesisSet(hsIn, refNowMs, maxAgeMs) {
    // Codex D4 R5 D4-R5-01 closure: PRODUCER AUTHORITY via D3's closure-private WeakSet
    // MUST be the FIRST operation on hsIn — before _isPlainObject (which reads the
    // prototype, firing Proxy getPrototypeOf trap), before _isFrozenSafe (which fires
    // isExtensible trap), before HI.safeStructuredClone (which fires multiple traps),
    // before HI.deepOriginalShapeAudit (which fires ownKeys + getOwnPropertyDescriptor
    // traps). The verifier ITSELF does NOT trigger Proxy traps for non-members because
    // WeakSet.has is an identity comparison on captured Reflect.apply — it never reads
    // [[Get]] on the candidate.
    if (typeof HE.verifyAuthoritativeHypothesisSet !== 'function'
        || HE.verifyAuthoritativeHypothesisSet(hsIn) !== true) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    // Authority verified — hsIn is the actual D3-produced object reference. From here on
    // shape / frozen / descriptor reads are safe (the underlying object is plain + frozen).
    if (!_isPlainObject(hsIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
    }
    if (!_isFrozenSafe(hsIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    // Codex D4 R2 D4-R2-02 closure: RECURSIVE descriptor audit BEFORE clone. The previous
    // top-level audit missed nested accessors (e.g. a getter on a hypothesis's status field
    // would fire during structuredClone before the post-clone audit could see anything).
    // The recursive audit walks every nested plain object / array via descriptor reads ONLY
    // (no value-coerced reads on accessors). Any accessor descriptor / Symbol key /
    // non-enumerable own key / non-plain object encountered → reject. The walk is bounded
    // by depth (32 levels) and total node count (4096) to defend against deep/wide hostile
    // inputs.
    var recursiveAudit = _recursiveDescriptorAudit(hsIn);
    if (!recursiveAudit.ok) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    var hs = HI.safeStructuredClone(hsIn);
    if (hs === null || !_isPlainObject(hs)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (HI.deepOriginalShapeAudit(hs) !== true) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    // Closed key set check on the clone.
    var hsCloneKeys = HI.safeOwnKeys(hs);
    if (hsCloneKeys === null) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    for (var hcki = 0; hcki < hsCloneKeys.length; hcki++) {
      if (HI.safeArrayIndexOf(HSET_KEYS_ALLOWED, hsCloneKeys[hcki]) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY] };
      }
    }
    if (hs.schemaVersion !== 1) {
      return { valid: false, reasonCodes: [CODES.UNSUPPORTED_FUTURE_SCHEMA] };
    }
    if (!_isNonEmptyString(hs.hypothesisSetId)
        || !HI.safeRegExpTest(/^hset_[0-9a-f]{16}$/, hs.hypothesisSetId)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (!_isNonEmptyString(hs.sourceGraphId)
        || !HI.safeRegExpTest(/^graph_[0-9a-f]{16}$/, hs.sourceGraphId)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (!_isPlainObject(hs.caseAssociation)
        || !_isNonEmptyString(hs.caseAssociation.caseId)
        || !_isNonEmptyString(hs.caseAssociation.sessionId)) {
      return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_INVALID] };
    }
    if (!_isPlainObject(hs.sessionAssociation)
        || hs.sessionAssociation.sessionId !== hs.caseAssociation.sessionId) {
      return { valid: false, reasonCodes: [CODES.SOURCE_IDENTITY_SESSION_MISMATCH] };
    }
    if (!_isPlainArray(hs.hypotheses)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
    }
    if (hs.hypotheses.length > INPUT_HYPOTHESES_INPUT_CAP) {
      return { valid: false, reasonCodes: [CODES.GRAPH_CAP_EXCEEDED] };
    }
    if (!_isPlainArray(hs.cannotConclude)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
    }
    if (!_isPlainArray(hs.limitations)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
    }
    // ---- Per-hypothesis structural + cross-field validation (Codex D4 R1 D4-R1-01/03 closure) ----
    var seenHypIds = HI.safeObjectCreateNull();
    for (var hi = 0; hi < hs.hypotheses.length; hi++) {
      var h = hs.hypotheses[hi];
      if (!_isPlainObject(h)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // Closed key set
      var hKeys = HI.safeOwnKeys(h);
      if (hKeys === null) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      for (var hki = 0; hki < hKeys.length; hki++) {
        if (HI.safeArrayIndexOf(HYPOTHESIS_KEYS_ALLOWED, hKeys[hki]) === -1) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY] };
        }
      }
      // hypothesisId grammar + uniqueness
      if (!_isNonEmptyString(h.hypothesisId)
          || HI.safeRegExpTest(ID_FORBIDDEN_RE, h.hypothesisId)
          || !HI.safeRegExpTest(/^hyp_[0-9a-f]{16}$/, h.hypothesisId)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (HI.safeGetOwnDescriptor(seenHypIds, h.hypothesisId)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      HI.safeDefineDataProperty(seenHypIds, h.hypothesisId, true);
      // ruleId required + must be in HE.RULE_REGISTRY
      if (!_isNonEmptyString(h.ruleId)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      var rDesc = HI.safeGetOwnDescriptor(_RULE_BY_ID, h.ruleId);
      if (!rDesc) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      var rule = rDesc.value;
      // Codex D4 R1 D4-R1-01 closure: hypothesisId recompute equality binds (ruleId,
      // supportingEvidenceIds, contradictingEvidenceIds) per D3's _hypothesisId. Caller can no
      // longer keep IDs while mutating those fields.
      if (!_isPlainArray(h.supportingEvidenceIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID] };
      }
      if (!_isPlainArray(h.contradictingEvidenceIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_CONTRADICTION_INVALID] };
      }
      // All evidence IDs must be non-empty strings + cap
      if (h.supportingEvidenceIds.length > 64 || h.contradictingEvidenceIds.length > 64) {
        return { valid: false, reasonCodes: [CODES.ARRAY_CAP_EXCEEDED] };
      }
      for (var sei = 0; sei < h.supportingEvidenceIds.length; sei++) {
        if (!_isNonEmptyString(h.supportingEvidenceIds[sei])) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_EVIDENCE_LINK_INVALID] };
        }
      }
      for (var cei = 0; cei < h.contradictingEvidenceIds.length; cei++) {
        if (!_isNonEmptyString(h.contradictingEvidenceIds[cei])) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_CONTRADICTION_INVALID] };
        }
      }
      var idMaterial = {
        v: hs.schemaVersion,
        ruleId: h.ruleId,
        supportingEvidenceIds: HI.safeArraySlice(h.supportingEvidenceIds),
        contradictingEvidenceIds: HI.safeArraySlice(h.contradictingEvidenceIds),
      };
      var expectedHid = 'hyp_' + _hashFNV64Hex('hypothesisid|v' + hs.schemaVersion + '|' + HI.stableStringify(idMaterial));
      if (expectedHid !== h.hypothesisId) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
      }
      // Cross-field consistency with rule (Codex D4 R1 D4-R1-01 + R2 D4-R2-03 closure).
      // ruleVersion MUST match rule registry (Codex D4 R2 D4-R2-03 closure: previously not validated).
      if (h.ruleVersion !== rule.ruleVersion) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (h.category !== rule.category) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_CATEGORY_UNKNOWN] };
      }
      if (h.i18nKey !== rule.i18nKey) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // Credibility / confidence / status — closed enums
      if (HI.safeArrayIndexOf(CONCLUSION_CREDIBILITY_ORDER, h.credibility) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_crAtLeast(h.credibility, rule.minConclusionCredibility)) {
        // Credibility weaker than rule allows → invalid (D3 wouldn't have emitted this)
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // Confidence: closed key set + closed state enum + integer score (Codex D4 R2 D4-R2-03 closure).
      if (!_isPlainObject(h.confidence)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      var confKeys = HI.safeOwnKeys(h.confidence);
      if (confKeys === null) return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      for (var cki = 0; cki < confKeys.length; cki++) {
        if (HI.safeArrayIndexOf(CONFIDENCE_KEYS_ALLOWED, confKeys[cki]) === -1) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY] };
        }
      }
      if (HI.safeArrayIndexOf(CONFIDENCE_STATE_ALLOWED, h.confidence.state) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (typeof h.confidence.score !== 'number'
          || !_isInteger(h.confidence.score)
          || h.confidence.score < 0
          || h.confidence.score > 100) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // correlationGroupIds: plain array of strings (Codex D4 R2 D4-R2-03 closure).
      if (!_isPlainArray(h.correlationGroupIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // Codex D4 R3 D4-R3-01 closure: REJECT non-array fields outright — no silent fallback to
      // []. The previous code substituted [] when the field wasn't an array, which let a
      // malformed value (e.g. cannotConcludeReasonCodes: "string") slip through with a
      // signature that matched the authentic-empty-array signature. Empty legitimate arrays
      // are still accepted; only non-arrays are rejected.
      if (!_isPlainArray(h.alternativeExplanationIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isPlainArray(h.cannotConcludeReasonCodes)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isPlainArray(h.validationActionIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // contentSignature is an INTEGRITY / determinism proof (defense-in-depth). Producer
      // authority lives in D3's WeakSet (already verified above). contentSignature catches
      // accidental drift and surfaces inconsistent inputs early.
      if (!_isNonEmptyString(h.contentSignature)
          || !HI.safeRegExpTest(/^csig_[0-9a-f]{16}$/, h.contentSignature)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
      }
      var sigMaterial = {
        v: hs.schemaVersion,
        hid: h.hypothesisId,
        ruleId: h.ruleId,
        ruleVersion: h.ruleVersion,
        category: h.category,
        status: h.status,
        i18nKey: h.i18nKey,
        credibility: h.credibility,
        conf: {
          state: h.confidence && h.confidence.state,
          score: h.confidence && h.confidence.score,
        },
        sup: h.supportingEvidenceIds,
        con: h.contradictingEvidenceIds,
        corr: h.correlationGroupIds,
        alts: h.alternativeExplanationIds,
        cc: h.cannotConcludeReasonCodes,
        acts: h.validationActionIds,
        lims: h.limitations,
      };
      var expectedSig = 'csig_' + _hashFNV64Hex('contentsig|v' + hs.schemaVersion + '|' + HI.stableStringify(sigMaterial));
      if (expectedSig !== h.contentSignature) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
      }
      if (HI.safeArrayIndexOf(HYPOTHESIS_STATUS_ALLOWED, h.status) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // Cross-field: status='contradicted' ⟹ contradictingEvidenceIds.length > 0
      if (h.status === 'contradicted' && h.contradictingEvidenceIds.length === 0) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      // status='supported' ⟹ supportingEvidenceIds.length > 0
      if (h.status === 'supported' && h.supportingEvidenceIds.length === 0) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isPlainArray(h.limitations)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (h.limitations.length > 32) {
        return { valid: false, reasonCodes: [CODES.ARRAY_CAP_EXCEEDED] };
      }
      for (var lhi = 0; lhi < h.limitations.length; lhi++) {
        if (!RC.isReasonCode(h.limitations[lhi])) {
          return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
        }
      }
    }

    // Recompute hypothesisSetId — independent authority verification.
    var recomputed;
    try { recomputed = _recomputeHypothesisSetId(hs); }
    catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] }; }
    if (recomputed !== hs.hypothesisSetId) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }

    // Codex D4 R4 D4-R4-02 closure: freshness moved POST-CLOCK in buildPrioritySet (the
    // validator now runs BEFORE clock invocation). When refNowMs is null the freshness check
    // is intentionally skipped here — the caller (buildPrioritySet Step 3) re-runs the
    // freshness check after the clock has produced refNowMs. This keeps the validator
    // clock-independent so a hostile clock cannot fire on rejected authority.
    if (refNowMs !== null && hs.createdAt !== null) {
      if (!_isNonEmptyString(hs.createdAt)) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      var hsAt = _isoToMs(hs.createdAt);
      if (hsAt === null) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      if ((refNowMs - hsAt) > maxAgeMs) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
      if (hsAt > (refNowMs + (5 * 60 * 1000))) {
        return { valid: false, reasonCodes: [CODES.EVIDENCE_FRESHNESS_STALE] };
      }
    }

    return { valid: true, hypothesisSet: HI.deepFreeze(hs) };
  }

  // ---------- Eligibility checks (per directive §12 FORBIDDEN list) ----------------------------
  /**
   * A hypothesis is eligible to become PRIMARY only if:
   *   - credibility >= Derived (not Heuristic / Unavailable)
   *   - status NOT 'contradicted' or 'blocked'
   *   - confidence.state ∈ {moderate, high}
   * setup_experiment additionally requires: zero contradicting evidence + confidence high
   * (per directive: "unsupported setup actions" forbidden).
   */
  function _eligibleAsPrimary(h) {
    if (!_crAtLeast(h.credibility, 'Derived')) return false;
    if (h.status === 'contradicted' || h.status === 'blocked') return false;
    if (h.confidence.state !== 'moderate' && h.confidence.state !== 'high') return false;
    return true;
  }
  function _eligibleAsSetupExperiment(h) {
    if (h.contradictingEvidenceIds && h.contradictingEvidenceIds.length > 0) return false;
    if (h.confidence.state !== 'high') return false;
    if (!_crAtLeast(h.credibility, 'Derived')) return false;
    return true;
  }

  // ---------- Priority ID generators -----------------------------------------------------------
  function _priorityId(hypothesisId, kind, schemaVersion) {
    var hash = _hashFNV64Hex('priorityid|v' + schemaVersion + '|' + hypothesisId + '|' + kind);
    return 'pri_' + hash;
  }
  function _prioritySetId(sourceHsetId, priorities, schemaVersion) {
    var hashMaterial = {
      v: schemaVersion,
      hsetId: sourceHsetId,
      priIds: HI.safeArrayMap(priorities, function (p) { return p.priorityId; }),
    };
    HI.safeArraySort(hashMaterial.priIds, _strcmp);
    return 'priset_' + _hashFNV64Hex('prioritysetid|v' + schemaVersion + '|' + HI.stableStringify(hashMaterial));
  }

  // ---------- Build one priority entry ---------------------------------------------------------
  function _buildPriorityEntry(h, tier, blockingIds, schemaVersion) {
    var kind = _kindForCategory(h.category);
    // For setup_experiment, additional eligibility gate
    if (kind === 'setup_experiment' && !_eligibleAsSetupExperiment(h)) {
      // Downgrade to controlled_repeat_lap (still actionable, but doesn't claim setup causation)
      kind = 'controlled_repeat_lap';
      tier = PRIORITY_KIND_TIER[kind];
    }
    if (HI.safeArrayIndexOf(PRIORITY_KIND_ALLOWED, kind) === -1) {
      kind = 'no_action_required';
      tier = PRIORITY_KIND_TIER[kind];
    }
    var pid = _priorityId(h.hypothesisId, kind, schemaVersion);

    // Limitations (carry forward from hypothesis + add a default if heuristic / contradicted)
    var lims = HI.safeArraySlice(_isPlainArray(h.limitations) ? h.limitations : []);
    if (!_crAtLeast(h.credibility, 'Derived')
        && HI.safeArrayIndexOf(lims, CODES.LIMITATION_HEURISTIC_ONLY) === -1) {
      _arrPush(lims, CODES.LIMITATION_HEURISTIC_ONLY);
    }
    if (h.contradictingEvidenceIds && h.contradictingEvidenceIds.length > 0
        && HI.safeArrayIndexOf(lims, CODES.LIMITATION_NO_CONTROLLED_REPEAT) === -1) {
      _arrPush(lims, CODES.LIMITATION_NO_CONTROLLED_REPEAT);
    }
    HI.safeArraySort(lims, _strcmp);
    if (lims.length > LIMITATIONS_PER_PRIORITY_CAP) {
      var trimmed = [];
      for (var li = 0; li < LIMITATIONS_PER_PRIORITY_CAP; li++) _arrPush(trimmed, lims[li]);
      lims = trimmed;
    }

    var sortedBlocking = HI.safeArraySlice(blockingIds);
    HI.safeArraySort(sortedBlocking, _strcmp);
    if (sortedBlocking.length > PREREQ_ID_PER_PRIORITY_CAP) {
      var blkTrimmed = [];
      for (var bi = 0; bi < PREREQ_ID_PER_PRIORITY_CAP; bi++) _arrPush(blkTrimmed, sortedBlocking[bi]);
      sortedBlocking = blkTrimmed;
    }

    // i18nKey for the priority itself, sourced deterministically from the kind.
    var i18nKey = 'r3.0d.priority.' + kind;
    var whyNowI18nKey = 'r3.0d.priority.why_now.' + kind;
    var expectedObsKey = 'r3.0d.priority.expected.' + kind;
    var stopKey = 'r3.0d.priority.stop.' + kind;
    var rollbackKey = 'r3.0d.priority.rollback.' + kind;

    return HI.deepFreeze({
      priorityId: pid,
      hypothesisId: h.hypothesisId,
      rank: 0,  // assigned post-sort
      tier: tier,
      kind: kind,
      category: h.category,
      i18nKey: i18nKey,
      whyNowI18nKey: whyNowI18nKey,
      blockingPrerequisiteIds: HI.deepFreeze(sortedBlocking),
      expectedObservationI18nKey: expectedObsKey,
      stopConditionI18nKey: stopKey,
      rollbackConditionI18nKey: rollbackKey,
      credibility: h.credibility,
      confidence: HI.deepFreeze({ state: h.confidence.state, score: h.confidence.score }),
      eligibleAsPrimary: _eligibleAsPrimary(h),
      contradictionCount: h.contradictingEvidenceIds ? h.contradictingEvidenceIds.length : 0,
      limitations: HI.deepFreeze(lims),
      provenance: HI.deepFreeze({
        sourceHypothesisId: h.hypothesisId,
        sourceCategory: h.category,
        sourceStatus: h.status,
        builderVersion: SERVICE_VERSION,
      }),
    });
  }

  // ---------- Public entry: buildPrioritySet ---------------------------------------------------
  function buildPrioritySet(inputIn, optsIn) {
    try {
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected at entry to buildPrioritySet');
      }

      // ---- Step 0.5 — input + opts descriptor snapshot ----
      if (!_isPlainObject(inputIn)) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input not plain object' });
      }
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
        if (!('value' in idDesc) || !idDesc.enumerable) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input non-data/non-enumerable own key' });
        }
        HI.safeDefineDataProperty(inputSnap, idName, idDesc.value);
      }
      var allowedInputKeys = ['hypothesisSet', 'generationToken', 'contextVersion'];
      var inputSnapKeys = HI.safeKeys(inputSnap);
      if (inputSnapKeys === null) {
        return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read inputSnap own keys' });
      }
      for (var ik = 0; ik < inputSnapKeys.length; ik++) {
        if (HI.safeArrayIndexOf(allowedInputKeys, inputSnapKeys[ik]) === -1) {
          // Codex D4 R1 D4-R1-05 closure: never echo caller-supplied key NAMES in detail
          // (privacy — a path-like key would leak in the blocked envelope).
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown input own key' });
        }
      }

      var optsSnap = null;
      var clockCb = null;
      if (optsIn !== null && optsIn !== undefined) {
        if (!_isPlainObject(optsIn)) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts not plain object' });
        }
        var clockDesc = HI.safeGetOwnDescriptor(optsIn, 'clock');
        if (clockDesc) {
          // Codex D4 R1 D4-R1-02 closure: opts.clock MUST be a data descriptor (not accessor).
          // Accessor descriptors can fire on read; we never read them.
          if (!('value' in clockDesc)) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts.clock accessor descriptor not allowed' });
          }
          if (!clockDesc.enumerable) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts.clock must be enumerable' });
          }
          if (typeof clockDesc.value === 'function') {
            clockCb = clockDesc.value;
          }
        }
        var optsData = HI.safeObjectCreateNull();
        var optsOwnNames = HI.safeOwnKeys(optsIn);
        if (optsOwnNames === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read opts own keys' });
        }
        for (var oi = 0; oi < optsOwnNames.length; oi++) {
          var on = optsOwnNames[oi];
          if (typeof on === 'symbol') {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts symbol key' });
          }
          var od = HI.safeGetOwnDescriptor(optsIn, on);
          if (!od) continue;
          if (!od.enumerable) {
            // Codex D4 R1 D4-R1-05 closure: never echo caller-supplied key name in detail.
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts non-enumerable own key' });
          }
          if (on === 'clock') continue;  // clock handled above with explicit accessor rejection
          if (!('value' in od)) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts accessor descriptor not allowed' });
          }
          if (typeof od.value === 'function') {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts function field not allowed' });
          }
          HI.safeDefineDataProperty(optsData, on, od.value);
        }
        optsSnap = HI.safeStructuredClone(optsData);
        if (optsSnap === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts data not cloneable' });
        }
        var allowedOptsKeys = ['clock', 'maxAgeMs', 'referenceNowMs'];
        var optsSnapKeys = HI.safeKeys(optsSnap);
        if (optsSnapKeys === null) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'cannot read optsSnap keys' });
        }
        for (var oki = 0; oki < optsSnapKeys.length; oki++) {
          if (HI.safeArrayIndexOf(allowedOptsKeys, optsSnapKeys[oki]) === -1) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown opts own key' });
          }
        }
      }

      // ---- Step 1 — AUTHORITY + SCHEMA verify BEFORE clock invocation ----
      // Codex D4 R4 D4-R4-02 closure: clock MUST NOT fire for forged input. Authority
      // (WeakSet) + recursive descriptor audit + closed-key schema + per-hypothesis content
      // validation are all clock-independent. Move them BEFORE clock invocation. Clock fires
      // only after the input is proven to be a genuine D3-produced snapshot.
      // Pass refNowMs=null + maxAgeMs=0 — the validator will SKIP freshness check when
      // refNowMs is null. Freshness is then enforced separately in Step 4 (post-clock).
      var authority = _validateAuthoritativeHypothesisSet(inputSnap.hypothesisSet, null, 0);
      if (authority.valid !== true) {
        return RC.buildBlockedResult(authority.reasonCodes, { detail: 'hypothesis set authority verification failed' });
      }
      var hs = authority.hypothesisSet;

      // ---- Step 2 — resolve freshness reference time (clock invoked AT MOST ONCE, post-authority) ----
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
          detail: 'D4 requires a reference time for freshness verification — supply opts.clock() OR opts.referenceNowMs',
        });
      }
      var maxAgeMs = DEFAULT_MAX_AGE_MS;
      if (optsSnap && typeof optsSnap.maxAgeMs === 'number'
          && HI.safeNumberIsFinite(optsSnap.maxAgeMs) === true
          && optsSnap.maxAgeMs > 0) {
        maxAgeMs = optsSnap.maxAgeMs;
      }

      // ---- Step 3 — freshness check (post-clock) ----
      if (hs.createdAt !== null) {
        if (!_isNonEmptyString(hs.createdAt)) {
          return RC.buildBlockedResult([CODES.EVIDENCE_FRESHNESS_STALE], { detail: 'createdAt invalid' });
        }
        var hsAt = _isoToMs(hs.createdAt);
        if (hsAt === null) {
          return RC.buildBlockedResult([CODES.EVIDENCE_FRESHNESS_STALE], { detail: 'createdAt not parseable' });
        }
        if ((refNowMs - hsAt) > maxAgeMs) {
          return RC.buildBlockedResult([CODES.EVIDENCE_FRESHNESS_STALE], { detail: 'snapshot older than maxAgeMs' });
        }
        if (hsAt > (refNowMs + (5 * 60 * 1000))) {
          return RC.buildBlockedResult([CODES.EVIDENCE_FRESHNESS_STALE], { detail: 'snapshot dated >5min in the future' });
        }
      }

      // ---- Step 2.5 — generationToken / contextVersion ----
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

      // ---- Step 3 — finalize kind + tier + priorityId for each hypothesis (PASS 1) ----
      // Codex D4 R1 D4-R1-04 closure: apply downgrade FIRST (e.g. setup_experiment that fails
      // eligibleAsSetupExperiment → controlled_repeat_lap), THEN compute blocking prerequisites
      // against the FINAL priorityIds. Previously preliminary IDs reflected the pre-downgrade
      // kind, so blockingPrerequisiteIds could reference IDs absent from the final set.
      var finalized = [];
      for (var hi2 = 0; hi2 < hs.hypotheses.length; hi2++) {
        var h2 = hs.hypotheses[hi2];
        if (h2.status === 'blocked') continue;
        var fkind = _kindForCategory(h2.category);
        if (fkind === 'setup_experiment' && !_eligibleAsSetupExperiment(h2)) {
          fkind = 'controlled_repeat_lap';
        }
        if (HI.safeArrayIndexOf(PRIORITY_KIND_ALLOWED, fkind) === -1) {
          fkind = 'no_action_required';
        }
        var ftier = PRIORITY_KIND_TIER[fkind];
        if (typeof ftier !== 'number') continue;
        var fpid = _priorityId(h2.hypothesisId, fkind, PRIORITY_SET_SCHEMA_VERSION);
        _arrPush(finalized, { hyp: h2, kind: fkind, tier: ftier, priorityId: fpid });
      }

      // ---- Step 4 — compute blocking prerequisites per FINAL priorityId (PASS 2) ----
      // Verify referential integrity: every blockingPrerequisiteId MUST exist in finalized[].
      var finalIdSet = HI.safeObjectCreateNull();
      for (var fii = 0; fii < finalized.length; fii++) {
        HI.safeDefineDataProperty(finalIdSet, finalized[fii].priorityId, true);
      }
      var built = [];
      for (var bi2 = 0; bi2 < finalized.length; bi2++) {
        var cur = finalized[bi2];
        var blockingIds = [];
        for (var bj = 0; bj < finalized.length; bj++) {
          if (bj === bi2) continue;
          var other = finalized[bj];
          if (other.tier >= cur.tier) continue;
          if (other.hyp.status === 'contradicted' || other.hyp.status === 'blocked') continue;
          if (!_crAtLeast(other.hyp.credibility, 'Derived')) continue;
          // Defensive referential check (Codex D4 R1 D4-R1-04 closure): prerequisite priorityId
          // must exist in the final set.
          if (!HI.safeGetOwnDescriptor(finalIdSet, other.priorityId)) continue;
          _arrPush(blockingIds, other.priorityId);
        }
        // _buildPriorityEntry would re-derive kind for setup downgrade — pass the already-finalized
        // values via a wrapper hypothesis that pre-sets the kind/tier intent. To keep
        // _buildPriorityEntry stable, we still call it; the kind it computes will MATCH cur.kind
        // (since we applied the same downgrade logic above), and the priorityId it computes will
        // MATCH cur.priorityId (since both use _priorityId(hypothesisId, kind, schemaVersion)).
        var entry = _buildPriorityEntry(cur.hyp, cur.tier, blockingIds, PRIORITY_SET_SCHEMA_VERSION);
        _arrPush(built, entry);
      }

      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected mid-build');
      }

      // ---- Step 5 — sort by ladder ----
      // Primary sort: tier ascending; secondary: confidence.score descending; tertiary: hypothesisId
      var sortedPriorities = HI.safeArraySlice(built);
      HI.safeArraySort(sortedPriorities, function (a, b) {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (a.confidence.score !== b.confidence.score) return b.confidence.score - a.confidence.score;
        return _strcmp(a.hypothesisId, b.hypothesisId);
      });

      if (sortedPriorities.length > PRIORITY_COUNT_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'priority count exceeds PRIORITY_COUNT_CAP=' + PRIORITY_COUNT_CAP });
      }

      // ---- Step 6 — assign rank + re-emit with rank baked in (deep-frozen) ----
      var ranked = [];
      for (var ri = 0; ri < sortedPriorities.length; ri++) {
        var sp = sortedPriorities[ri];
        var withRank = HI.safeObjectCreateNull();
        var spKeys = HI.safeKeys(sp);
        if (spKeys === null) {
          return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'priority safeKeys returned null' });
        }
        for (var spki = 0; spki < spKeys.length; spki++) {
          var spk = spKeys[spki];
          var spd = HI.safeGetOwnDescriptor(sp, spk);
          if (spd && 'value' in spd) HI.safeDefineDataProperty(withRank, spk, spd.value);
        }
        HI.safeDefineDataProperty(withRank, 'rank', ri + 1);
        _arrPush(ranked, HI.deepFreeze(withRank));
      }

      // ---- Step 7 — derive primaryActionId, whyNowI18nKey ----
      var primaryActionId = null;
      var whyNowI18nKey = 'r3.0d.priority.why_now.empty';
      for (var pi = 0; pi < ranked.length; pi++) {
        var p = ranked[pi];
        if (p.eligibleAsPrimary === true && (!p.blockingPrerequisiteIds || p.blockingPrerequisiteIds.length === 0)) {
          primaryActionId = p.priorityId;
          whyNowI18nKey = p.whyNowI18nKey;
          break;
        }
      }
      // If nothing is eligible as primary, leave primaryActionId=null and use a meta whyNow.
      if (primaryActionId === null) {
        whyNowI18nKey = 'r3.0d.priority.why_now.no_eligible_primary';
      }

      // ---- Step 8 — roll up snapshot-level limitations + cannotConclude ----
      var snapshotLimitations = [];
      var snapshotCannotConclude = [];
      var limSeen = HI.safeObjectCreateNull();
      var ccSeen = HI.safeObjectCreateNull();
      function _addSnapLim(code) {
        if (!RC.isReasonCode(code)) return;
        if (HI.safeGetOwnDescriptor(limSeen, code)) return;
        HI.safeDefineDataProperty(limSeen, code, true);
        _arrPush(snapshotLimitations, code);
      }
      function _addSnapCC(code) {
        if (!RC.isReasonCode(code)) return;
        if (HI.safeGetOwnDescriptor(ccSeen, code)) return;
        HI.safeDefineDataProperty(ccSeen, code, true);
        _arrPush(snapshotCannotConclude, code);
      }
      // Carry hypothesis-set-level cannotConclude/limitations (D3's already-derived values).
      for (var hci = 0; hci < hs.cannotConclude.length; hci++) _addSnapCC(hs.cannotConclude[hci]);
      for (var hli = 0; hli < hs.limitations.length; hli++) _addSnapLim(hs.limitations[hli]);
      // Roll up per-priority limitations.
      for (var ri2 = 0; ri2 < ranked.length; ri2++) {
        var rp = ranked[ri2];
        if (_isPlainArray(rp.limitations)) {
          for (var rli = 0; rli < rp.limitations.length; rli++) _addSnapLim(rp.limitations[rli]);
        }
      }
      if (ranked.length === 0) {
        _addSnapCC(CODES.INSUFFICIENT_EVIDENCE);
      }
      HI.safeArraySort(snapshotLimitations, _strcmp);
      HI.safeArraySort(snapshotCannotConclude, _strcmp);
      if (snapshotLimitations.length > SNAPSHOT_LIMITATIONS_CAP) {
        var trimL = [];
        for (var sl = 0; sl < SNAPSHOT_LIMITATIONS_CAP; sl++) _arrPush(trimL, snapshotLimitations[sl]);
        snapshotLimitations = trimL;
      }
      if (snapshotCannotConclude.length > SNAPSHOT_CANNOT_CONCLUDE_CAP) {
        var trimCC = [];
        for (var sc = 0; sc < SNAPSHOT_CANNOT_CONCLUDE_CAP; sc++) _arrPush(trimCC, snapshotCannotConclude[sc]);
        snapshotCannotConclude = trimCC;
      }

      // ---- Step 9 — derive prioritySetId from ranked priorities ----
      var prisetId = _prioritySetId(hs.hypothesisSetId, ranked, PRIORITY_SET_SCHEMA_VERSION);

      // ---- Step 10 — assemble + deep-freeze envelope ----
      var createdAt = resolvedClockIso;
      var provenance = HI.deepFreeze({
        builderVersion: SERVICE_VERSION,
        sourceHypothesisSetSchemaVersion: hs.schemaVersion,
        sourceHypothesisCount: hs.hypotheses.length,
        rankedPriorityCount: ranked.length,
      });

      var prioritySet = HI.deepFreeze({
        schemaVersion: PRIORITY_SET_SCHEMA_VERSION,
        prioritySetId: prisetId,
        sourceHypothesisSetId: hs.hypothesisSetId,
        sourceGraphId: hs.sourceGraphId,
        caseAssociation: HI.deepFreeze({
          caseId: hs.caseAssociation.caseId,
          sessionId: hs.caseAssociation.sessionId,
          lapId: hs.caseAssociation.lapId == null ? null : hs.caseAssociation.lapId,
        }),
        sessionAssociation: HI.deepFreeze({ sessionId: hs.caseAssociation.sessionId }),
        priorities: HI.deepFreeze(HI.safeArraySlice(ranked)),
        primaryActionId: primaryActionId,
        whyNowI18nKey: whyNowI18nKey,
        cannotConclude: HI.deepFreeze(HI.safeArraySlice(snapshotCannotConclude)),
        limitations: HI.deepFreeze(HI.safeArraySlice(snapshotLimitations)),
        provenance: provenance,
        createdAt: createdAt,
        generationToken: generationToken,
        contextVersion: contextVersion,
      });

      // Final envelope byte cap
      var finalEnvBytes;
      try { finalEnvBytes = _byteLength(HI.stableStringify(prioritySet)); }
      catch (eBytes) { finalEnvBytes = Infinity; }
      if (finalEnvBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'final envelope ' + finalEnvBytes + ' bytes exceeds ' + ENVELOPE_BYTE_CAP });
      }

      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-freeze');
      }

      return HI.deepFreeze({ valid: true, prioritySet: prioritySet });

    } catch (eOuter) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'buildPrioritySet threw on hostile input' });
    }
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    PRIORITY_SET_SCHEMA_VERSION: PRIORITY_SET_SCHEMA_VERSION,
    PRIORITY_KIND_ALLOWED: PRIORITY_KIND_ALLOWED,
    PRIORITY_KIND_TIER: PRIORITY_KIND_TIER,
    PRIORITY_COUNT_CAP: PRIORITY_COUNT_CAP,
    PREREQ_ID_PER_PRIORITY_CAP: PREREQ_ID_PER_PRIORITY_CAP,
    LIMITATIONS_PER_PRIORITY_CAP: LIMITATIONS_PER_PRIORITY_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    buildPrioritySet: buildPrioritySet,
  };
  try { HI.deepFreeze(api); } catch (e) { /* swallow */ }

  // Codex D4 R2 D4-R2-05 closure: under CommonJS, expose ONLY via module.exports.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_PriorityEngine = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
