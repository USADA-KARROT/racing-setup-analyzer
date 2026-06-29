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

  if (!HI || !RC || !CR || !HC) {
    throw new Error('r3-0d-priority-engine.js: missing one or more required R3.0D contracts');
  }

  var CODES = RC.REASON_CODES;

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
    var hashMaterial = {
      v: hsetClone.schemaVersion,
      graphId: hsetClone.sourceGraphId,
      hyps: HI.safeArrayMap(hsetClone.hypotheses, function (h) { return h.hypothesisId; }),
    };
    HI.safeArraySort(hashMaterial.hyps, _strcmp);
    return 'hset_' + _hashFNV64Hex('hypothesissetid|v' + hsetClone.schemaVersion + '|' + HI.stableStringify(hashMaterial));
  }

  function _validateAuthoritativeHypothesisSet(hsIn, refNowMs, maxAgeMs) {
    if (!_isPlainObject(hsIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
    }
    if (!_isFrozenSafe(hsIn)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    var hs = HI.safeStructuredClone(hsIn);
    if (hs === null || !_isPlainObject(hs)) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }
    if (HI.deepOriginalShapeAudit(hs) !== true) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
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
    // Per-hypothesis structural validation
    var seenHypIds = HI.safeObjectCreateNull();
    for (var hi = 0; hi < hs.hypotheses.length; hi++) {
      var h = hs.hypotheses[hi];
      if (!_isPlainObject(h)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isNonEmptyString(h.hypothesisId)
          || HI.safeRegExpTest(ID_FORBIDDEN_RE, h.hypothesisId)
          || !HI.safeRegExpTest(/^hyp_[0-9a-f]{16}$/, h.hypothesisId)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (HI.safeGetOwnDescriptor(seenHypIds, h.hypothesisId)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      HI.safeDefineDataProperty(seenHypIds, h.hypothesisId, true);
      if (HI.safeArrayIndexOf(HC.HYPOTHESIS_CATEGORIES, h.category) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_CATEGORY_UNKNOWN] };
      }
      if (HI.safeArrayIndexOf(CONCLUSION_CREDIBILITY_ORDER, h.credibility) === -1) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isPlainObject(h.confidence) || typeof h.confidence.state !== 'string') {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (typeof h.confidence.score !== 'number'
          || !_isInteger(h.confidence.score)
          || h.confidence.score < 0
          || h.confidence.score > 100) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isNonEmptyString(h.status)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
      if (!_isPlainArray(h.contradictingEvidenceIds)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_CONTRADICTION_INVALID] };
      }
      if (!_isPlainArray(h.limitations)) {
        return { valid: false, reasonCodes: [CODES.HYPOTHESIS_INVALID] };
      }
    }

    // Recompute hypothesisSetId — independent authority verification.
    var recomputed;
    try { recomputed = _recomputeHypothesisSetId(hs); }
    catch (e) { return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] }; }
    if (recomputed !== hs.hypothesisSetId) {
      return { valid: false, reasonCodes: [CODES.HYPOTHESIS_AUTHORITY_FORGED] };
    }

    // Freshness — D3 already enforced node freshness, but D4 ALSO checks the snapshot's
    // createdAt is not stale (so a snapshot kept indefinitely cannot drive priorities).
    // hs.createdAt may be null (referenceNowMs-supplied path) — in that case D4 trusts the
    // D3 freshness gate already passed and uses refNowMs as effective now.
    if (hs.createdAt !== null) {
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
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'input non-data/non-enumerable own key: ' + idName });
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
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown input key: ' + inputSnapKeys[ik] });
        }
      }

      var optsSnap = null;
      var clockCb = null;
      if (optsIn !== null && optsIn !== undefined) {
        if (!_isPlainObject(optsIn)) {
          return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts not plain object' });
        }
        var clockDesc = HI.safeGetOwnDescriptor(optsIn, 'clock');
        if (clockDesc && typeof clockDesc.value === 'function') {
          if (!clockDesc.enumerable) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts.clock must be enumerable' });
          }
          clockCb = clockDesc.value;
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
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'opts non-enumerable own key: ' + on });
          }
          if (on === 'clock') continue;
          if (typeof od.value === 'function') {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts function field not allowed: ' + on });
          }
          if (!('value' in od)) {
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID], { detail: 'opts accessor descriptor not allowed: ' + on });
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
            return RC.buildBlockedResult([CODES.HYPOTHESIS_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'unknown opts key: ' + optsSnapKeys[oki] });
          }
        }
      }

      // ---- Step 1.5 — resolve freshness reference time ----
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

      // ---- Step 2 — authority verify the input Hypothesis Set ----
      var authority = _validateAuthoritativeHypothesisSet(inputSnap.hypothesisSet, refNowMs, maxAgeMs);
      if (authority.valid !== true) {
        return RC.buildBlockedResult(authority.reasonCodes, { detail: 'hypothesis set authority verification failed' });
      }
      var hs = authority.hypothesisSet;

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

      // ---- Step 3 — build candidate priority entries (one per eligible hypothesis) ----
      // First pass: compute kind + tier for each hypothesis without blocking IDs yet.
      var rawEntries = [];
      for (var hi2 = 0; hi2 < hs.hypotheses.length; hi2++) {
        var h2 = hs.hypotheses[hi2];
        // Skip hypotheses that should not produce a priority at all (status blocked).
        if (h2.status === 'blocked') continue;
        var kind = _kindForCategory(h2.category);
        var tier = PRIORITY_KIND_TIER[kind];
        if (typeof tier !== 'number') {
          // Unknown category mapping — defensive: skip.
          continue;
        }
        _arrPush(rawEntries, { hypothesis: h2, kind: kind, tier: tier });
      }

      // ---- Step 4 — compute blocking prerequisites per priority -----------------------------
      // A priority is BLOCKED by any priority in a strictly lower tier (=higher priority)
      // that has any supportable evidence (i.e., its hypothesis is not in 'contradicted'
      // status and credibility >= Derived). We compute prerequisite IDs from priorityIds
      // which depend only on (hypothesisId, kind) — so we can derive them deterministically
      // before final assembly.
      var preliminary = HI.safeArrayMap(rawEntries, function (re) {
        return { hyp: re.hypothesis, kind: re.kind, tier: re.tier,
          priorityId: _priorityId(re.hypothesis.hypothesisId, re.kind, PRIORITY_SET_SCHEMA_VERSION) };
      });

      var built = [];
      for (var bi2 = 0; bi2 < preliminary.length; bi2++) {
        var cur = preliminary[bi2];
        var blockingIds = [];
        for (var bj = 0; bj < preliminary.length; bj++) {
          if (bj === bi2) continue;
          var other = preliminary[bj];
          if (other.tier >= cur.tier) continue;  // only strictly higher priority (lower tier number)
          // Other is supportable: not contradicted + credibility ≥ Derived (per directive
          // §12 "FORBIDDEN: Low-credibility hypothesis as primary").
          if (other.hyp.status === 'contradicted' || other.hyp.status === 'blocked') continue;
          if (!_crAtLeast(other.hyp.credibility, 'Derived')) continue;
          _arrPush(blockingIds, other.priorityId);
        }
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

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_PriorityEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
