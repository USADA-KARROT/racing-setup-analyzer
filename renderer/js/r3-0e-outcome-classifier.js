/**
 * renderer/js/r3-0e-outcome-classifier.js — R3.0E E3 · Outcome Classifier (PRODUCTION).
 *
 * Authoritative entry: classifyOutcome(input, opts)
 *
 * Hard contract (SKYLINE 2026-06-30 R3.0 Continuous Resume Directive §6):
 *   • Inputs are authoritative-only:
 *       - experiment            (E1-valid Experiment; status MUST be 'applied'.
 *                                 outcome field MUST be null — E1 already enforces this
 *                                 invariant for draft/planned/applied, so caller-provided
 *                                 final outcomes are rejected at the contract layer.)
 *       - appliedChange         (audit record bound to experiment.experimentId).
 *       - followUp              (R3.0B follow-up identity + R3.0C comparison-authority
 *                                 attestation: parentCaseId, sessionId, parentSessionId,
 *                                 hasExplicitReference, comparabilityScore).
 *       - observation           (observed direction/magnitude + evidence id arrays;
 *                                 i18n-keyed driverFeedback ONLY; no free text;
 *                                 no causal claim; no raw telemetry).
 *       - controlVariableObservations (E1-valid Control Variables with observedValue +
 *                                 withinRange filled per the E3 algorithm requirement).
 *   • E3 NEVER accepts a caller-provided `class`, `confounders`, `comparabilityScore` on
 *     the outcome side — the classifier derives all of them. The input wrapper has a
 *     CLOSED key set; any caller-supplied outcome / class / classification field is an
 *     UNKNOWN_OWN_KEY → BLOCK before any further read.
 *   • Confirmed requires ALL of:
 *       same case (sourceCaseId match)
 *       same session
 *       explicit reference selected
 *       applied change audit bound to this experiment
 *       expected observation predefined (E1 enforces expectedDirection + range)
 *       every declared control variable observed AND withinRange === true
 *       no major data-quality issue
 *       no contradicting evidence ids
 *       direction matches AND magnitude inside expectedMagnitudeRange
 *   • invalid_comparison takes PRECEDENCE over inconclusive / confirmed when:
 *       cross-case, cross-session, or no explicit reference, or comparabilityScore<0.5.
 *   • inconclusive_due_to_confounders takes precedence over confirmed/contradicted when
 *     control variables are missing or out-of-range.
 *   • Output never contains: free-text driver feedback, blame language, causation claim,
 *     raw telemetry samples, filesystem paths, source filenames, usernames, machine IDs,
 *     internal database handles, stack traces, or Electron private paths.
 *   • Clock is invoked at most ONCE, AFTER all authority/structural gates pass. Forged
 *     or malformed input → zero clock invocations.
 *   • All ambient intrinsic references (Object.isFrozen, Object.is, Date.parse,
 *     Array.isArray, Reflect.apply, WeakSet ctor/add/has) are captured at module init
 *     so a post-load rebind of the global cannot defeat verification.
 *   • Producer attestation: every successfully-classified outcome envelope is registered
 *     in a closure-private WeakSet. The exported verifyAuthoritativeOutcome(candidate)
 *     checks identity (WeakSet membership) AND structural witnesses (deep-frozen +
 *     schemaVersion + outcomeId + experimentId). The WeakSet, register function, and
 *     captured WeakSet primitives are NEVER exposed.
 *
 * UMD: Node require / Electron renderer global (R3_0E_OutcomeClassifier).
 */
(function (root) {
  'use strict';

  // ---------- Module-init: load E1 contracts (literal-string require for no-consumer scan) ----
  var RC_E = null, EXP = null, OUT = null, CV = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { RC_E = require('../../contracts/r3.0e/reason-codes.js'); } catch (e) { RC_E = null; }
    try { EXP = require('../../contracts/r3.0e/experiment-contract.js'); } catch (e) { EXP = null; }
    try { OUT = require('../../contracts/r3.0e/outcome-contract.js'); } catch (e) { OUT = null; }
    try { CV = require('../../contracts/r3.0e/control-variables-contract.js'); } catch (e) { CV = null; }
  }
  if (RC_E === null && typeof R3_0E_ReasonCodes !== 'undefined') RC_E = R3_0E_ReasonCodes;
  if (EXP === null && typeof R3_0E_ExperimentContract !== 'undefined') EXP = R3_0E_ExperimentContract;
  if (OUT === null && typeof R3_0E_OutcomeContract !== 'undefined') OUT = R3_0E_OutcomeContract;
  if (CV === null && typeof R3_0E_ControlVariablesContract !== 'undefined') CV = R3_0E_ControlVariablesContract;
  if (!RC_E || !EXP || !OUT || !CV) {
    throw new Error('r3-0e-outcome-classifier.js: requires R3.0E E1 contracts');
  }

  var CODES = RC_E.REASON_CODES;

  // ---------- Module-init: captured intrinsics ------------------------------------------------
  var _CAPTURED_OBJECT_FREEZE = Object.freeze;
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;
  var _CAPTURED_OBJECT_IS = Object.is;
  var _CAPTURED_OBJECT_CREATE = Object.create;
  var _CAPTURED_OBJECT_GET_OWN_NAMES = Object.getOwnPropertyNames;
  var _CAPTURED_OBJECT_GET_OWN_DESC = Object.getOwnPropertyDescriptor;
  var _CAPTURED_OBJECT_GET_OWN_SYMS = Object.getOwnPropertySymbols;
  var _CAPTURED_OBJECT_GET_PROTO = Object.getPrototypeOf;
  var _CAPTURED_OBJECT_DEFINE_PROPERTY = Object.defineProperty;
  var _CAPTURED_ARRAY_IS_ARRAY = Array.isArray;
  var _CAPTURED_DATE_PARSE = Date.parse;
  var _CAPTURED_REFLECT_APPLY = Reflect.apply;
  var _CAPTURED_JSON_STRINGIFY = JSON.stringify;
  var _CAPTURED_TEXT_ENCODER = (typeof TextEncoder !== 'undefined') ? TextEncoder : null;
  var _CAPTURED_NUMBER_IS_FINITE = Number.isFinite;
  var _CAPTURED_NUMBER_IS_INTEGER = Number.isInteger;

  // WeakSet captures — defeat post-load WeakSet.prototype.has rebinds.
  var _WeakSetCtor = WeakSet;
  var _WS_ADD = WeakSet.prototype.add;
  var _WS_HAS = WeakSet.prototype.has;
  function _wsAdd(set, value) {
    try { _CAPTURED_REFLECT_APPLY(_WS_ADD, set, [value]); return true; }
    catch (e) { return false; }
  }
  function _wsHas(set, value) {
    try { return _CAPTURED_REFLECT_APPLY(_WS_HAS, set, [value]) === true; }
    catch (e) { return false; }
  }

  // Codex E3-R5-01 closure: capture Array.prototype methods so a hostile clock (or any
  // post-authority code path) that rebinds Array.prototype.push / slice / indexOf cannot
  // affect the classifier's internal array operations. ALL classifier arrays (confounders,
  // limitations, rebuiltSideEffects, dataQualityIssues snapshots) are mutated and read
  // exclusively through these captured methods via captured Reflect.apply.
  var _ARR_PUSH = Array.prototype.push;
  var _ARR_SLICE = Array.prototype.slice;
  var _ARR_INDEX_OF = Array.prototype.indexOf;
  function _arrPush(arr, v) {
    try { _CAPTURED_REFLECT_APPLY(_ARR_PUSH, arr, [v]); return true; }
    catch (e) { return false; }
  }
  function _arrSlice(arr) {
    try { return _CAPTURED_REFLECT_APPLY(_ARR_SLICE, arr, []); }
    catch (e) { return []; }
  }
  function _arrIndexOf(arr, v) {
    try { return _CAPTURED_REFLECT_APPLY(_ARR_INDEX_OF, arr, [v]); }
    catch (e) { return -1; }
  }

  // Captured intrinsic helpers — all defensive wrappers.
  function _isFrozenSafe(v) { try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; } catch (e) { return false; } }
  function _isArraySafe(v) { try { return _CAPTURED_ARRAY_IS_ARRAY(v) === true; } catch (e) { return false; } }
  function _exactlyEqual(a, b) { try { return _CAPTURED_OBJECT_IS(a, b) === true; } catch (e) { return false; } }
  function _isoToMs(s) {
    try {
      if (typeof s !== 'string' || s.length === 0) return null;
      var n = _CAPTURED_DATE_PARSE(s);
      if (typeof n !== 'number' || n !== n /* NaN */) return null;
      return n;
    } catch (e) { return null; }
  }
  function _utf8Bytes(s) {
    try {
      if (typeof s !== 'string') return 0;
      if (_CAPTURED_TEXT_ENCODER !== null) return new _CAPTURED_TEXT_ENCODER().encode(s).length;
      return (typeof Buffer !== 'undefined') ? Buffer.byteLength(s, 'utf8') : s.length * 4;
    } catch (e) { return Infinity; }
  }

  // ---------- Module-init integrity snapshot --------------------------------------------------
  // The captures above MUST themselves still resolve as expected at call time. If the host
  // mutates Object.isFrozen between module load and the first classifyOutcome call, the
  // captured reference remains intact (we hold the function value), but defence-in-depth
  // we re-verify the contract surfaces are frozen at call entry.
  var _CONTRACTS_FROZEN_AT_LOAD = (function () {
    try {
      return _CAPTURED_OBJECT_IS_FROZEN(EXP) === true
          && _CAPTURED_OBJECT_IS_FROZEN(OUT) === true
          && _CAPTURED_OBJECT_IS_FROZEN(CV) === true
          && _CAPTURED_OBJECT_IS_FROZEN(RC_E) === true;
    } catch (e) { return false; }
  })();

  function _intrinsicsIntact() {
    if (!_CONTRACTS_FROZEN_AT_LOAD) return false;
    if (typeof EXP.validateExperimentShape !== 'function') return false;
    if (typeof OUT.validateOutcomeShape !== 'function') return false;
    if (typeof CV.validateControlVariableShape !== 'function') return false;
    if (typeof RC_E.buildBlockedResult !== 'function') return false;
    return true;
  }

  function _buildTamperBlock(detail) {
    return _CAPTURED_OBJECT_FREEZE({
      valid: false,
      reasonCodes: _CAPTURED_OBJECT_FREEZE([CODES.INTERNAL_CONTRACT_VIOLATION]),
      explanationKeys: _CAPTURED_OBJECT_FREEZE(['r3_0e.reason.internal_contract_violation']),
      detail: typeof detail === 'string' ? detail : 'intrinsic tampering detected',
      result: null,
    });
  }

  // ---------- Constants -----------------------------------------------------------------------
  var SERVICE_VERSION = 1;
  var OUTCOME_SCHEMA_VERSION = 1;
  var ARRAY_CAP = 32;
  var ENVELOPE_BYTE_CAP = 128 * 1024;
  var DEFAULT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

  // E3 thresholds — comparison validity gates.
  var MIN_COMPARABILITY_FOR_VALID_COMPARISON = 0.5;
  // Data-quality threshold: a non-empty issues list reduces conclusion strength. A single
  // minor issue still permits classification; more than this count → inconclusive.
  var DATA_QUALITY_ISSUE_BLOCK_THRESHOLD = 4;

  // Closed key sets for the E3 input wrapper and nested authoritative sub-objects.
  var INPUT_KEYS_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'experiment',
    'appliedChange',
    'followUp',
    'observation',
    'controlVariableObservations',
  ]);
  var APPLIED_CHANGE_KEYS_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'changeId',
    'sourceExperimentId',
    'appliedAt',
  ]);
  var FOLLOWUP_KEYS_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'followUpCaseId',
    'parentCaseId',
    'sessionId',
    'parentSessionId',
    'hasExplicitReference',
    'comparabilityScore',
  ]);
  var OBSERVATION_KEYS_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'observedDirection',
    'observedMagnitude',
    'driverFeedback',
    'dataQualityIssues',
    'sideEffects',
    'contradictingEvidenceIds',
    'supportingEvidenceIds',
  ]);
  var OPTS_KEYS_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'clock',
    'referenceNowMs',
    'maxAgeMs',
  ]);

  var DIRECTION_ALLOWED = _CAPTURED_OBJECT_FREEZE(['increase', 'decrease', 'no_change']);
  var ID_GRAMMAR_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;
  // Codex E3-R1-02 closure: strict i18n-key grammar — dotted tokens of [a-z0-9_], 2..6
  // segments, total length bounded. First segment must start with [a-z]; subsequent
  // segments may start with [a-z0-9] (the project convention uses tokens like "0e" / "0d"
  // for R3.0E / R3.0D namespacing, e.g. `r3.0e.driver.feedback.balance_improved`).
  // Rejects spaces, slashes, blame phrasing, causal wording, capital letters, and any
  // character outside the closed alphabet so a hostile caller cannot launder
  // driver-blame / causation text / path traversal through `driverFeedback`.
  var I18N_KEY_RE = /^[a-z][a-z0-9_]*(?:\.[a-z0-9][a-z0-9_]*){1,5}$/;
  var I18N_KEY_MAX_LEN = 128;
  // Canonical array index check — captured because Number is reachable via ambient.
  var ARRAY_INDEX_RE = /^(?:0|[1-9][0-9]*)$/;

  // ---------- Producer attestation (closure-private WeakSet) ----------------------------------
  // After successful classifyOutcome → registered. The exported verifyAuthoritativeOutcome
  // checks identity (WeakSet) + shape (deep-frozen + required fields). Clones and JSON
  // round-trips lose identity → verifier returns false.
  var _authoritativeOutcomes = new _WeakSetCtor();
  function _registerAuthoritativeOutcome(envelope) {
    _wsAdd(_authoritativeOutcomes, envelope);
  }
  function verifyAuthoritativeOutcome(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeOutcomes, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== OUTCOME_SCHEMA_VERSION) return false;
      if (typeof candidate.outcomeId !== 'string') return false;
      if (typeof candidate.experimentId !== 'string') return false;
      if (typeof candidate['class'] !== 'string') return false;
      if (!_isArraySafe(candidate.confounders)) return false;
      if (!_isArraySafe(candidate.limitations)) return false;
      return true;
    } catch (e) { return false; }
  }

  // ---------- Structural helpers --------------------------------------------------------------
  function _isOriginalPlainObject(v) {
    try {
      if (v === null || typeof v !== 'object' || _CAPTURED_ARRAY_IS_ARRAY(v)) return false;
      var p = _CAPTURED_OBJECT_GET_PROTO(v);
      return p === Object.prototype || p === null;
    } catch (e) { return false; }
  }
  function _isPlainArray(v) {
    try {
      if (!_CAPTURED_ARRAY_IS_ARRAY(v)) return false;
      var p = _CAPTURED_OBJECT_GET_PROTO(v);
      return p === Array.prototype;
    } catch (e) { return false; }
  }
  function _hasSymbolOwnKey(o) {
    try {
      var syms = _CAPTURED_OBJECT_GET_OWN_SYMS(o);
      return _CAPTURED_ARRAY_IS_ARRAY(syms) && syms.length > 0;
    } catch (e) { return true; }
  }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isFiniteNumber(v) {
    return typeof v === 'number' && _CAPTURED_NUMBER_IS_FINITE(v) === true;
  }
  function _isBool(v) { return v === true || v === false; }
  function _idGrammarOk(s) {
    if (!_nonEmptyStr(s)) return false;
    if (ID_FORBIDDEN_RE.test(s)) return false;
    if (!ID_GRAMMAR_RE.test(s)) return false;
    return true;
  }
  // Codex E3-R1-02 closure: strict i18n-key grammar enforcement. driverFeedback (and any
  // future i18n-keyed surface in the outcome) MUST pass this gate before being copied to
  // the outcome envelope.
  function _i18nKeyOk(s) {
    if (!_nonEmptyStr(s)) return false;
    if (s.length > I18N_KEY_MAX_LEN) return false;
    if (!I18N_KEY_RE.test(s)) return false;
    return true;
  }
  // Codex E3-R1-01 / E3-R5-02 closure: null-prototype membership set backed by a
  // closure-local captured Array (not an object map). add() uses captured
  // Array.prototype.push via captured Reflect.apply; has() uses captured indexOf.
  // This eliminates the entire `defineProperty` attack surface from the set abstraction
  // (a hostile pre-load defineProperty cannot inject phantom keys because we never
  // call defineProperty for membership tracking). The set is shape-private: it is a
  // plain array of string keys, never exposed beyond the classifier closure.
  function _newCapturedNullSet() {
    return [];
  }
  function _capturedSetHas(setObj, key) {
    if (!_isPlainArray(setObj)) return false;
    return _arrIndexOf(setObj, key) !== -1;
  }
  function _capturedSetAdd(setObj, key) {
    if (!_isPlainArray(setObj)) return false;
    if (_arrIndexOf(setObj, key) !== -1) return true;
    return _arrPush(setObj, key);
  }

  // Deep freeze using captured Object.freeze + captured getOwnPropertyNames.
  function _deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    try { _CAPTURED_OBJECT_FREEZE(v); } catch (e) { /* swallow */ }
    var keys;
    try { keys = _CAPTURED_OBJECT_GET_OWN_NAMES(v); } catch (e) { return v; }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var child;
      try { child = v[k]; } catch (eGet) { continue; }
      _deepFreeze(child);
    }
    return v;
  }

  // ---------- Input descriptor snapshot --------------------------------------------------------
  // Mirrors D5 snapshotInputDescriptors: walks own descriptors (NOT [[Get]]) so a Proxy with
  // hostile getters does NOT fire on first read. Symbol / non-enumerable / accessor / unknown
  // own key → reject before any further inspection.
  function _snapshotPlainShape(o, allowedKeys, invalidCode, opts) {
    opts = opts || {};
    if (!_isOriginalPlainObject(o)) {
      return { valid: false, reasonCodes: [invalidCode, CODES.PROTOTYPE_POLLUTION_REJECTED], detail: 'not plain' };
    }
    if (opts.requireFrozen && _isFrozenSafe(o) !== true) {
      return { valid: false, reasonCodes: [invalidCode], detail: 'not frozen' };
    }
    if (_hasSymbolOwnKey(o)) {
      return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'symbol own key' };
    }
    var names;
    try { names = _CAPTURED_OBJECT_GET_OWN_NAMES(o); } catch (e) {
      return { valid: false, reasonCodes: [invalidCode], detail: 'descriptor read failed' };
    }
    var snap = _CAPTURED_OBJECT_CREATE(null);
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      // Reject unknown own key — caller cannot smuggle `class`, `outcomeId`, `confounders`,
      // etc. into the input wrapper.
      if (_arrIndexOf(allowedKeys, k) === -1) {
        return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'unknown own key ' + k };
      }
      var d;
      try { d = _CAPTURED_OBJECT_GET_OWN_DESC(o, k); } catch (e) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'descriptor inaccessible' };
      }
      if (!d || d.enumerable !== true) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'non-enumerable key ' + k };
      }
      if (typeof d.get === 'function' || typeof d.set === 'function') {
        return { valid: false, reasonCodes: [invalidCode], detail: 'accessor key ' + k };
      }
      snap[k] = d.value;
    }
    return { valid: true, snapshot: snap };
  }

  // Codex E3-R1-03 closure: dense-array enforcement. Reject sparse arrays (any index in
  // 0..length-1 missing an enumerable data descriptor → hole) AND reject any own key
  // other than 'length' or a canonical numeric index (no Symbol keys, no string names,
  // no negative / fractional / leading-zero indices). The walk indexes BY index, not by
  // getOwnPropertyNames enumeration order, so a hostile array that puts named own keys
  // first cannot smuggle a hole past the cap check.
  function _snapshotArrayShape(a, invalidCode) {
    if (!_isPlainArray(a)) {
      return { valid: false, reasonCodes: [invalidCode], detail: 'not array' };
    }
    if (_hasSymbolOwnKey(a)) {
      return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'symbol own key on array' };
    }
    var aLen;
    try { aLen = a.length; } catch (e) {
      return { valid: false, reasonCodes: [invalidCode], detail: 'array length inaccessible' };
    }
    if (typeof aLen !== 'number' || !_CAPTURED_NUMBER_IS_INTEGER(aLen) || aLen < 0 || aLen > ARRAY_CAP) {
      return { valid: false, reasonCodes: [invalidCode, CODES.ARRAY_CAP_EXCEEDED], detail: 'array len ' + aLen };
    }
    // First sweep: enumerate own keys and reject ANY name other than 'length' or a
    // canonical numeric index in [0, aLen). Reject Symbol keys (already above), reject
    // non-enumerable / accessor / non-data descriptors on indices.
    var names;
    try { names = _CAPTURED_OBJECT_GET_OWN_NAMES(a); } catch (e) {
      return { valid: false, reasonCodes: [invalidCode], detail: 'array desc inaccessible' };
    }
    for (var ni = 0; ni < names.length; ni++) {
      var nm = names[ni];
      if (nm === 'length') continue;
      if (!ARRAY_INDEX_RE.test(nm)) {
        return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'non-index own key on array: ' + nm };
      }
      var idxN = +nm;
      if (idxN < 0 || idxN >= aLen) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'array index out of [0,length): ' + nm };
      }
      var dn;
      try { dn = _CAPTURED_OBJECT_GET_OWN_DESC(a, nm); } catch (e) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'array elt desc fail' };
      }
      if (!dn || dn.enumerable !== true) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'non-enumerable array elt at ' + nm };
      }
      if (typeof dn.get === 'function' || typeof dn.set === 'function') {
        return { valid: false, reasonCodes: [invalidCode], detail: 'accessor array elt at ' + nm };
      }
    }
    // Second sweep: walk by index 0..aLen-1. Every index MUST have an OWN enumerable
    // data descriptor (no holes, no prototype-inherited values).
    var snap = [];
    for (var i = 0; i < aLen; i++) {
      var key = '' + i;
      var d;
      try { d = _CAPTURED_OBJECT_GET_OWN_DESC(a, key); } catch (e) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'array elt desc fail at ' + i };
      }
      if (!d) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'sparse array hole at index ' + i };
      }
      if (d.enumerable !== true) {
        return { valid: false, reasonCodes: [invalidCode], detail: 'non-enumerable array elt at ' + i };
      }
      if (typeof d.get === 'function' || typeof d.set === 'function') {
        return { valid: false, reasonCodes: [invalidCode], detail: 'accessor array elt at ' + i };
      }
      _arrPush(snap, d.value);
    }
    return { valid: true, snapshot: snap };
  }

  function _snapshotOpts(optsIn) {
    var snap = _CAPTURED_OBJECT_CREATE(null);
    if (optsIn === undefined || optsIn === null) return { valid: true, snapshot: snap };
    var r = _snapshotPlainShape(optsIn, OPTS_KEYS_ALLOWED, CODES.OUTCOME_INVALID);
    if (r.valid !== true) return r;
    // Type-check each opt.
    if (r.snapshot.clock !== undefined && r.snapshot.clock !== null && typeof r.snapshot.clock !== 'function') {
      return { valid: false, reasonCodes: [CODES.OUTCOME_INVALID], detail: 'opts.clock not function' };
    }
    if (r.snapshot.referenceNowMs !== undefined && r.snapshot.referenceNowMs !== null
        && typeof r.snapshot.referenceNowMs !== 'number') {
      return { valid: false, reasonCodes: [CODES.OUTCOME_INVALID], detail: 'opts.referenceNowMs not number' };
    }
    if (r.snapshot.maxAgeMs !== undefined && r.snapshot.maxAgeMs !== null
        && (typeof r.snapshot.maxAgeMs !== 'number' || !_CAPTURED_NUMBER_IS_INTEGER(r.snapshot.maxAgeMs) || r.snapshot.maxAgeMs < 0)) {
      return { valid: false, reasonCodes: [CODES.OUTCOME_INVALID], detail: 'opts.maxAgeMs invalid' };
    }
    return { valid: true, snapshot: r.snapshot };
  }

  // ---------- Deterministic ID generator -------------------------------------------------------
  // outcomeId is deterministic from (experimentId, changeId). No clock leak.
  function _hash32(s) {
    var h = 0x811c9dc5;
    var len = typeof s === 'string' ? s.length : 0;
    for (var i = 0; i < len; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  }
  function _fnv2(s) {
    var slen = typeof s === 'string' ? s.length : 0;
    return _hash32(s) + _hash32(s + '|' + slen);
  }
  function _outcomeId(experimentId, changeId) {
    return 'outcome_' + _fnv2('outcome|' + experimentId + '|' + changeId);
  }

  // ---------- Main entry: classifyOutcome -----------------------------------------------------
  /**
   * classifyOutcome(input, opts) — produces a deep-frozen Outcome envelope.
   *
   * Ordered steps (clock MUST NOT fire before Step 9):
   *   0.  intrinsic integrity (captures + contract surfaces still frozen)
   *   1.  input wrapper descriptor snapshot (closed keys; symbol/accessor/proxy rejected)
   *   2.  experiment frozen + E1 shape validation
   *   3.  appliedChange snapshot + shape
   *   4.  followUp snapshot + shape
   *   5.  observation snapshot + shape
   *   6.  controlVariableObservations snapshot + per-element E1 shape
   *   7.  opts snapshot
   *   8.  identity binding (status=applied, sourceExperimentId match, parentCaseId match)
   *   9.  resolve freshness reference time (clock at most once)
   *   10. freshness check on experiment.createdAt + appliedChange.appliedAt
   *   11. comparison-validity computation (invalid_comparison precedence)
   *   12. control-variable integrity (inconclusive_due_to_confounders precedence)
   *   13. data-quality + direction/magnitude classification cascade
   *   14. compose outcome
   *   15. validate via E1 OUT.validateOutcomeShape
   *   16. envelope byte cap
   *   17. deep-freeze + register
   */
  function classifyOutcome(inputIn, optsIn) {
    try {
      // ---- Step 0: intrinsic integrity ----------------------------------------------------
      if (!_intrinsicsIntact()) {
        return _buildTamperBlock('intrinsic tampering detected at entry');
      }

      // ---- Step 1: input wrapper descriptor snapshot -------------------------------------
      var inSnapR = _snapshotPlainShape(inputIn, INPUT_KEYS_ALLOWED, CODES.OUTCOME_INVALID, { requireFrozen: false });
      if (inSnapR.valid !== true) {
        return RC_E.buildBlockedResult(inSnapR.reasonCodes, { detail: inSnapR.detail });
      }
      var inputSnap = inSnapR.snapshot;

      // ---- Step 2: experiment shape validation -------------------------------------------
      // The Experiment must be deep-frozen (immutability) AND pass the E1 contract.
      if (!_isFrozenSafe(inputSnap.experiment)) {
        return RC_E.buildBlockedResult([CODES.EXPERIMENT_INVALID], { detail: 'experiment not deep-frozen' });
      }
      var expCheck = EXP.validateExperimentShape(inputSnap.experiment);
      if (expCheck.valid !== true) {
        return RC_E.buildBlockedResult(
          expCheck.reasonCodes ? _arrSlice(expCheck.reasonCodes) : [CODES.EXPERIMENT_INVALID],
          { detail: 'experiment shape invalid' }
        );
      }
      var experiment = inputSnap.experiment;

      // ---- Step 3: appliedChange snapshot + shape ----------------------------------------
      var acSnapR = _snapshotPlainShape(inputSnap.appliedChange, APPLIED_CHANGE_KEYS_ALLOWED, CODES.OUTCOME_INVALID);
      if (acSnapR.valid !== true) {
        return RC_E.buildBlockedResult(acSnapR.reasonCodes, { detail: 'appliedChange: ' + acSnapR.detail });
      }
      var appliedChange = acSnapR.snapshot;
      if (!_idGrammarOk(appliedChange.changeId)) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'appliedChange.changeId invalid' });
      }
      if (!_idGrammarOk(appliedChange.sourceExperimentId)) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'appliedChange.sourceExperimentId invalid' });
      }
      if (!_nonEmptyStr(appliedChange.appliedAt) || _isoToMs(appliedChange.appliedAt) === null) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'appliedChange.appliedAt invalid' });
      }

      // ---- Step 4: followUp snapshot + shape ---------------------------------------------
      var fuSnapR = _snapshotPlainShape(inputSnap.followUp, FOLLOWUP_KEYS_ALLOWED, CODES.OUTCOME_INVALID);
      if (fuSnapR.valid !== true) {
        return RC_E.buildBlockedResult(fuSnapR.reasonCodes, { detail: 'followUp: ' + fuSnapR.detail });
      }
      var followUp = fuSnapR.snapshot;
      if (!_idGrammarOk(followUp.followUpCaseId)) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'followUp.followUpCaseId invalid' });
      }
      if (!_idGrammarOk(followUp.parentCaseId)) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_PARENT_MISSING], { detail: 'followUp.parentCaseId invalid' });
      }
      if (followUp.parentCaseId === followUp.followUpCaseId) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'follow-up case is self-link' });
      }
      if (!_idGrammarOk(followUp.sessionId)) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'followUp.sessionId invalid' });
      }
      if (!_idGrammarOk(followUp.parentSessionId)) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'followUp.parentSessionId invalid' });
      }
      if (!_isBool(followUp.hasExplicitReference)) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'followUp.hasExplicitReference not bool' });
      }
      if (!_isFiniteNumber(followUp.comparabilityScore) || followUp.comparabilityScore < 0 || followUp.comparabilityScore > 1) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_COMPARABILITY_INSUFFICIENT], { detail: 'followUp.comparabilityScore out of [0,1]' });
      }

      // ---- Step 5: observation snapshot + shape ------------------------------------------
      var obsSnapR = _snapshotPlainShape(inputSnap.observation, OBSERVATION_KEYS_ALLOWED, CODES.OUTCOME_INVALID);
      if (obsSnapR.valid !== true) {
        return RC_E.buildBlockedResult(obsSnapR.reasonCodes, { detail: 'observation: ' + obsSnapR.detail });
      }
      var observation = obsSnapR.snapshot;
      // observedDirection: enum OR null
      if (observation.observedDirection !== null && _arrIndexOf(DIRECTION_ALLOWED, observation.observedDirection) === -1) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'observation.observedDirection invalid' });
      }
      // observedMagnitude: finite OR null
      if (observation.observedMagnitude !== null && !_isFiniteNumber(observation.observedMagnitude)) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'observation.observedMagnitude invalid' });
      }
      // driverFeedback: STRICT i18n key (dotted lower_snake_case, 2..6 segments, ≤128 chars)
      // OR null. Codex E3-R1-02 closure: a non-empty-string check alone permits free-text
      // blame / causation / paths to be laundered into the outcome envelope. The strict
      // grammar rejects spaces, slashes, capital letters, and any character outside
      // [a-z0-9._], blocking blame phrasing ("driver error because…") and path leakage
      // ("/Users/…", "..\\etc\\…") at the contract boundary.
      if (observation.driverFeedback !== null && !_i18nKeyOk(observation.driverFeedback)) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_DRIVER_FEEDBACK_INVALID], { detail: 'driverFeedback not a strict i18n key' });
      }
      // dataQualityIssues / sideEffects / contradictingEvidenceIds / supportingEvidenceIds — bounded plain arrays.
      var dqiR = _snapshotArrayShape(observation.dataQualityIssues, CODES.OUTCOME_DATA_QUALITY_INVALID);
      if (dqiR.valid !== true) {
        return RC_E.buildBlockedResult(dqiR.reasonCodes, { detail: 'dataQualityIssues: ' + dqiR.detail });
      }
      var dataQualityIssues = dqiR.snapshot;
      for (var qi = 0; qi < dataQualityIssues.length; qi++) {
        if (!_nonEmptyStr(dataQualityIssues[qi])) {
          return RC_E.buildBlockedResult([CODES.OUTCOME_DATA_QUALITY_INVALID], { detail: 'dataQualityIssues[' + qi + '] not non-empty string' });
        }
      }
      var seR = _snapshotArrayShape(observation.sideEffects, CODES.OUTCOME_INVALID);
      if (seR.valid !== true) {
        return RC_E.buildBlockedResult(seR.reasonCodes, { detail: 'sideEffects: ' + seR.detail });
      }
      var sideEffects = seR.snapshot;
      // Each side-effect must be a plain { i18nKey, params } object.
      // Codex E3-R2-01 closure: i18nKey MUST pass the strict i18n grammar — same gate as
      // driverFeedback — so free-text / blame / causation / path laundering through the
      // side-effect surface is impossible.
      // Codex E3-R2-02 closure: params is restricted to a CLOSED primitive allowlist
      // (null OR plain object whose every value is a finite number / boolean / null).
      // String values are FORBIDDEN to eliminate any free-text laundering vector. i18n
      // substitution numerics (thresholds, magnitudes) remain expressible.
      var SE_KEYS_FROZEN = _CAPTURED_OBJECT_FREEZE(['i18nKey', 'params']);
      var rebuiltSideEffects = [];
      for (var si = 0; si < sideEffects.length; si++) {
        var se = sideEffects[si];
        if (!_isOriginalPlainObject(se)) {
          return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '] not plain' });
        }
        var seKeysR = _snapshotPlainShape(se, SE_KEYS_FROZEN, CODES.OUTCOME_INVALID);
        if (seKeysR.valid !== true) {
          return RC_E.buildBlockedResult(seKeysR.reasonCodes, { detail: 'sideEffects[' + si + ']: ' + seKeysR.detail });
        }
        var seK = seKeysR.snapshot.i18nKey;
        var seP = seKeysR.snapshot.params;
        if (!_i18nKeyOk(seK)) {
          return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].i18nKey not strict i18n key' });
        }
        // Codex E3-R3-02 closure: rebuild params into a fresh plain object from validated
        // descriptors so the outcome envelope does NOT retain a reference to the caller's
        // original params object (a hostile caller could otherwise mutate it before the
        // freeze sweep completes, or rely on identity to back-channel state). The new
        // object is a `{}` plain-object (so it round-trips through E1 outcome shape
        // validation which requires plain prototypes), populated only with the
        // validated allowlist values.
        var rebuiltParams = null;
        if (seP !== null && seP !== undefined) {
          if (!_isOriginalPlainObject(seP)) {
            return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params not plain' });
          }
          if (_hasSymbolOwnKey(seP)) {
            return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.UNKNOWN_OWN_KEY], { detail: 'sideEffects[' + si + '].params has Symbol key' });
          }
          var pNames;
          try { pNames = _CAPTURED_OBJECT_GET_OWN_NAMES(seP); }
          catch (eDesc) { return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params desc fail' }); }
          if (pNames.length > 16) {
            return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.ARRAY_CAP_EXCEEDED], { detail: 'sideEffects[' + si + '].params keys exceed cap' });
          }
          rebuiltParams = {};
          for (var pi = 0; pi < pNames.length; pi++) {
            var pk = pNames[pi];
            // Codex E3-R2-02 closure: param KEY must itself be a sober identifier
            // (lower_snake_case, ≤32 chars). No spaces / paths / capitals.
            if (!/^[a-z][a-z0-9_]{0,31}$/.test(pk)) {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params key not sober: ' + pk });
            }
            var pd;
            try { pd = _CAPTURED_OBJECT_GET_OWN_DESC(seP, pk); }
            catch (eDesc2) { return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params desc fail at ' + pk }); }
            if (!pd || pd.enumerable !== true) {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params non-enum key ' + pk });
            }
            if (typeof pd.get === 'function' || typeof pd.set === 'function') {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params accessor at ' + pk });
            }
            var pv = pd.value;
            // CLOSED primitive allowlist — number (finite) / boolean / null. NO strings,
            // NO objects, NO arrays. String values would be the laundering vector.
            if (pv === null) {
              // pass — plain assignment below
            } else if (typeof pv === 'boolean') {
              // pass
            } else if (typeof pv === 'number') {
              if (!_isFiniteNumber(pv)) {
                return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params[' + pk + '] not finite number' });
              }
            } else {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params[' + pk + '] not in primitive allowlist (number/boolean/null)' });
            }
            // Define as own enumerable data property — no inheritance, no accessor.
            // Codex E3-R4-01 closure: a host that poisoned Object.defineProperty BEFORE
            // the classifier module loaded would have its replacement captured by
            // _CAPTURED_OBJECT_DEFINE_PROPERTY, and the post-validation define call could
            // store an arbitrary value (e.g. a path string) regardless of what we
            // validated above. Defence: re-read the descriptor after define and require
            //   (a) a data descriptor (no getter/setter installed by the poisoner),
            //   (b) enumerable === true,
            //   (c) Object.is(d.value, pv) — exact reference / value identity.
            // Any mismatch → fail-closed BLOCK with no partial outcome.
            try {
              _CAPTURED_OBJECT_DEFINE_PROPERTY(rebuiltParams, pk, {
                value: pv, writable: true, enumerable: true, configurable: true,
              });
            } catch (eDef) {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'sideEffects[' + si + '].params rebuild failed at ' + pk });
            }
            var dCheck;
            try { dCheck = _CAPTURED_OBJECT_GET_OWN_DESC(rebuiltParams, pk); }
            catch (eRecheck) { return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'sideEffects[' + si + '].params descriptor re-read failed' }); }
            if (!dCheck || dCheck.enumerable !== true) {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'sideEffects[' + si + '].params post-define non-enum at ' + pk });
            }
            if (typeof dCheck.get === 'function' || typeof dCheck.set === 'function') {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'sideEffects[' + si + '].params post-define accessor at ' + pk });
            }
            if (!_exactlyEqual(dCheck.value, pv)) {
              return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'sideEffects[' + si + '].params post-define value mismatch at ' + pk + ' (intrinsic tampering suspected)' });
            }
          }
        }
        // Rebuild a clean side-effect record so the outcome envelope carries only the
        // validated (deep-copied) structure — caller's original reference is dropped.
        _arrPush(rebuiltSideEffects, { i18nKey: seK, params: rebuiltParams });
      }
      sideEffects = rebuiltSideEffects;
      var contraR = _snapshotArrayShape(observation.contradictingEvidenceIds, CODES.OUTCOME_INVALID);
      if (contraR.valid !== true) {
        return RC_E.buildBlockedResult(contraR.reasonCodes, { detail: 'contradictingEvidenceIds: ' + contraR.detail });
      }
      var contradictingEvidenceIds = contraR.snapshot;
      for (var ci = 0; ci < contradictingEvidenceIds.length; ci++) {
        if (!_idGrammarOk(contradictingEvidenceIds[ci])) {
          return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'contradictingEvidenceIds[' + ci + '] invalid id' });
        }
      }
      var supR = _snapshotArrayShape(observation.supportingEvidenceIds, CODES.OUTCOME_INVALID);
      if (supR.valid !== true) {
        return RC_E.buildBlockedResult(supR.reasonCodes, { detail: 'supportingEvidenceIds: ' + supR.detail });
      }
      var supportingEvidenceIds = supR.snapshot;
      for (var sii = 0; sii < supportingEvidenceIds.length; sii++) {
        if (!_idGrammarOk(supportingEvidenceIds[sii])) {
          return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'supportingEvidenceIds[' + sii + '] invalid id' });
        }
      }

      // ---- Step 6: controlVariableObservations snapshot + per-element E1 -----------------
      var cvObsR = _snapshotArrayShape(inputSnap.controlVariableObservations, CODES.CONTROL_VARIABLES_INVALID);
      if (cvObsR.valid !== true) {
        return RC_E.buildBlockedResult(cvObsR.reasonCodes, { detail: 'controlVariableObservations: ' + cvObsR.detail });
      }
      var controlVariableObservations = cvObsR.snapshot;
      // E1 contract per element. The CV contract permits observedValue + withinRange filled.
      // Codex E3-R1-01 closure: observed-CV membership is tracked via a captured null-proto
      // set with descriptor-based membership; an ambient Object.create rebind cannot
      // synthesize membership entries because we use the captured Object.create + the
      // captured Object.getOwnPropertyDescriptor for has-checks.
      var observedCvSet = _newCapturedNullSet();
      for (var cvi = 0; cvi < controlVariableObservations.length; cvi++) {
        var cvObs = controlVariableObservations[cvi];
        var cvCheck = CV.validateControlVariableShape(cvObs);
        if (cvCheck.valid !== true) {
          return RC_E.buildBlockedResult(
            cvCheck.reasonCodes ? _arrSlice(cvCheck.reasonCodes) : [CODES.CONTROL_VARIABLES_INVALID],
            { detail: 'controlVariableObservations[' + cvi + '] shape invalid' }
          );
        }
        // E3 additionally requires observedValue + withinRange to be filled (non-null) — the
        // E1 contract permits null for shape-only validation; E3 algorithm demands the
        // observation be present so the integrity check can run.
        if (cvObs.observedValue === null) {
          return RC_E.buildBlockedResult([CODES.CONTROL_VARIABLE_MISSING], { detail: 'controlVariableObservations[' + cvi + '].observedValue null' });
        }
        if (cvObs.withinRange === null) {
          return RC_E.buildBlockedResult([CODES.CONTROL_VARIABLE_MISSING], { detail: 'controlVariableObservations[' + cvi + '].withinRange null' });
        }
        if (_capturedSetHas(observedCvSet, cvObs.name)) {
          return RC_E.buildBlockedResult([CODES.CONTROL_VARIABLES_INVALID], { detail: 'duplicate control variable name: ' + cvObs.name });
        }
        _capturedSetAdd(observedCvSet, cvObs.name);
      }

      // ---- Step 7: opts snapshot ----------------------------------------------------------
      var optsR = _snapshotOpts(optsIn);
      if (optsR.valid !== true) {
        return RC_E.buildBlockedResult(optsR.reasonCodes, { detail: 'opts: ' + optsR.detail });
      }
      var optsSnap = optsR.snapshot;

      // ---- Step 8: identity binding -------------------------------------------------------
      if (experiment.status !== 'applied') {
        return RC_E.buildBlockedResult([CODES.EXPERIMENT_STATUS_INVALID], { detail: 'experiment.status must be applied to classify, got ' + experiment.status });
      }
      if (experiment.outcome !== null) {
        // Defence-in-depth: E1 contract already enforces outcome=null for status=applied,
        // but caller-supplied final classification is forbidden, so the classifier rejects
        // any pre-filled outcome explicitly here too.
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'caller-supplied experiment.outcome forbidden at classification' });
      }
      if (appliedChange.sourceExperimentId !== experiment.experimentId) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'appliedChange.sourceExperimentId !== experiment.experimentId' });
      }
      // Codex E3-R3-01 closure: experiment.followUpCaseIds MUST pass the dense-array
      // snapshot (E1's nested-descriptor audit does not catch sparse arrays — sparse
      // [] enumerates only 'length' and slips through). Every id must pass the strict
      // ID grammar. The provided followUp.followUpCaseId MUST be a member of the
      // experiment's declared follow-up case ids — otherwise a caller could submit a
      // followUp object pointing at an arbitrary case while the experiment's actual
      // follow-up linkage was empty (or sparse) and the classifier would still produce
      // a confirmed outcome despite the linkage break.
      var followUpIdsR = _snapshotArrayShape(experiment.followUpCaseIds || [], CODES.LINKAGE_INVALID);
      if (followUpIdsR.valid !== true) {
        return RC_E.buildBlockedResult(followUpIdsR.reasonCodes, { detail: 'experiment.followUpCaseIds: ' + followUpIdsR.detail });
      }
      var declaredFollowUpIds = followUpIdsR.snapshot;
      var followUpDeclared = false;
      for (var fui = 0; fui < declaredFollowUpIds.length; fui++) {
        if (!_idGrammarOk(declaredFollowUpIds[fui])) {
          return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'experiment.followUpCaseIds[' + fui + '] invalid id' });
        }
        if (declaredFollowUpIds[fui] === followUp.followUpCaseId) followUpDeclared = true;
      }
      if (!followUpDeclared) {
        return RC_E.buildBlockedResult([CODES.LINKAGE_INVALID], { detail: 'followUp.followUpCaseId not declared in experiment.followUpCaseIds' });
      }
      // parentCaseId binding — followUp's parent MUST be the experiment's source case. If
      // parentCaseId mismatches, treat as invalid_comparison (cross-case forbidden).
      var crossCase = (followUp.parentCaseId !== experiment.sourceCaseId);
      var crossSession = (followUp.sessionId !== followUp.parentSessionId);
      var noExplicitReference = (followUp.hasExplicitReference !== true);
      var lowComparability = (followUp.comparabilityScore < MIN_COMPARABILITY_FOR_VALID_COMPARISON);

      // ---- Step 9: resolve freshness reference (clock AT MOST ONCE, post-authority) ------
      var refNowMs = null;
      var resolvedClockIso = null;
      if (typeof optsSnap.referenceNowMs === 'number' && _CAPTURED_NUMBER_IS_INTEGER(optsSnap.referenceNowMs) && optsSnap.referenceNowMs >= 0) {
        refNowMs = optsSnap.referenceNowMs;
      } else if (typeof optsSnap.clock === 'function') {
        var clockIso = null;
        try { clockIso = optsSnap.clock(); } catch (eClock) { clockIso = null; }
        if (typeof clockIso === 'string' && clockIso.length > 0) {
          var clockMs = _isoToMs(clockIso);
          if (typeof clockMs === 'number') {
            refNowMs = clockMs;
            resolvedClockIso = clockIso;
          }
        }
      }
      if (typeof refNowMs !== 'number' || refNowMs !== refNowMs) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'unable to resolve reference time (opts.clock missing or invalid)' });
      }
      var maxAgeMs = (typeof optsSnap.maxAgeMs === 'number') ? optsSnap.maxAgeMs : DEFAULT_MAX_AGE_MS;

      // ---- Step 10: freshness check ------------------------------------------------------
      var expCreatedMs = _isoToMs(experiment.createdAt);
      var changeAppliedMs = _isoToMs(appliedChange.appliedAt);
      if (expCreatedMs !== null && (refNowMs - expCreatedMs) > maxAgeMs) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'experiment exceeds max age' });
      }
      if (changeAppliedMs !== null && (refNowMs - changeAppliedMs) > maxAgeMs) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'appliedChange exceeds max age' });
      }

      // ---- Step 11: comparison-validity computation (invalid_comparison precedence) ------
      var limitations = [];
      var classDecision = null;
      var confounders = [];

      if (crossCase || crossSession || noExplicitReference || lowComparability) {
        classDecision = 'invalid_comparison';
        if (crossCase) _arrPush(limitations, CODES.LINKAGE_PARENT_MISSING);
        if (crossSession) _arrPush(limitations, CODES.LIMITATION_CROSS_SESSION_FOLLOW_UP);
        if (noExplicitReference) _arrPush(limitations, CODES.OUTCOME_COMPARABILITY_INSUFFICIENT);
        if (lowComparability && _arrIndexOf(limitations, CODES.OUTCOME_COMPARABILITY_INSUFFICIENT) === -1) {
          _arrPush(limitations, CODES.OUTCOME_COMPARABILITY_INSUFFICIENT);
        }
      } else {
        // ---- Step 12: control-variable integrity (inconclusive_due_to_confounders) ------
        // Every declared experiment.controlVariables[].name MUST appear in observations.
        // Codex E3-R1-01 closure: presence check uses captured descriptor lookup so an
        // ambient Object.create rebind cannot inject phantom membership.
        // Codex E3-R2-03 closure: experiment.controlVariables MUST be dense + index-only
        // own keys (E1's nested-descriptor audit does not catch sparse arrays — sparse
        // [] returns only the 'length' own key and slips through). Snapshot via the same
        // captured-array sweep used for observation arrays so a hostile sparse array
        // attached to a frozen experiment cannot silently bypass missing-CV detection.
        var declaredCvR = _snapshotArrayShape(experiment.controlVariables || [], CODES.CONTROL_VARIABLES_INVALID);
        if (declaredCvR.valid !== true) {
          return RC_E.buildBlockedResult(declaredCvR.reasonCodes, { detail: 'experiment.controlVariables: ' + declaredCvR.detail });
        }
        var declaredCv = declaredCvR.snapshot;
        for (var dci = 0; dci < declaredCv.length; dci++) {
          var declared = declaredCv[dci];
          if (declared === null || typeof declared !== 'object') continue;
          var declaredName = declared.name;
          if (!_nonEmptyStr(declaredName)) continue;
          if (!_capturedSetHas(observedCvSet, declaredName)) {
            _arrPush(confounders, declaredName);
          }
        }
        if (confounders.length > 0) {
          classDecision = 'inconclusive_due_to_confounders';
          if (_arrIndexOf(limitations, CODES.CONTROL_VARIABLE_MISSING) === -1) {
            _arrPush(limitations, CODES.CONTROL_VARIABLE_MISSING);
          }
        } else {
          // Out-of-range CVs become confounders.
          var outOfRange = [];
          for (var ki = 0; ki < controlVariableObservations.length; ki++) {
            var cvo = controlVariableObservations[ki];
            if (cvo.withinRange !== true) _arrPush(outOfRange, cvo.name);
          }
          if (outOfRange.length > 0) {
            classDecision = 'inconclusive_due_to_confounders';
            confounders = outOfRange;
            if (_arrIndexOf(limitations, CODES.CONTROL_VARIABLE_OUT_OF_RANGE) === -1) {
              _arrPush(limitations, CODES.CONTROL_VARIABLE_OUT_OF_RANGE);
            }
          } else if (controlVariableObservations.length === 0) {
            // No control variables AT ALL — the experiment did not declare any, and none
            // were observed. The outcome can still be classified, but we flag the
            // limitation honestly.
            if (_arrIndexOf(limitations, CODES.LIMITATION_NO_CONTROL_VARIABLES) === -1) {
              _arrPush(limitations, CODES.LIMITATION_NO_CONTROL_VARIABLES);
            }
          }
        }

        // ---- Step 13: data quality + direction/magnitude classification cascade --------
        if (classDecision === null) {
          var dataQualityBlocking = dataQualityIssues.length > DATA_QUALITY_ISSUE_BLOCK_THRESHOLD;
          var hasContradictions = contradictingEvidenceIds.length > 0;
          var directionMatch = (observation.observedDirection === experiment.expectedDirection);
          var magnitudeInRange = (
            observation.observedMagnitude !== null
              && _isFiniteNumber(observation.observedMagnitude)
              && observation.observedMagnitude >= experiment.expectedMagnitudeRange.min
              && observation.observedMagnitude <= experiment.expectedMagnitudeRange.max
          );

          if (dataQualityBlocking) {
            classDecision = 'inconclusive';
            // Carry the data-quality codes as limitations so the UI can show them honestly.
            for (var dqi = 0; dqi < dataQualityIssues.length && limitations.length < ARRAY_CAP; dqi++) {
              if (_arrIndexOf(limitations, dataQualityIssues[dqi]) === -1) _arrPush(limitations, dataQualityIssues[dqi]);
            }
          } else if (observation.observedDirection === null) {
            classDecision = 'inconclusive';
          } else if (hasContradictions) {
            // Contradicting evidence blocks confirmed; treat as contradicted irrespective of
            // direction match (the contradicting evidence is itself evidence to the contrary).
            classDecision = 'contradicted';
          } else if (!directionMatch) {
            classDecision = 'contradicted';
          } else if (magnitudeInRange) {
            classDecision = 'confirmed';
          } else {
            classDecision = 'partially_confirmed';
          }
        }
      }

      // ---- Step 14: compose outcome ------------------------------------------------------
      var createdAtIso = resolvedClockIso || appliedChange.appliedAt || experiment.createdAt;
      if (!_nonEmptyStr(createdAtIso) || _isoToMs(createdAtIso) === null) {
        return RC_E.buildBlockedResult([CODES.OUTCOME_INVALID], { detail: 'could not resolve outcome createdAt ISO' });
      }
      var outcomeIdStr = _outcomeId(experiment.experimentId, appliedChange.changeId);
      // Bound the limitations array.
      if (limitations.length > ARRAY_CAP) {
        // Captured-slice with bounded length. Manual loop because captured slice doesn't
        // take args in our wrapper signature.
        var trimmed = [];
        for (var li = 0; li < ARRAY_CAP; li++) _arrPush(trimmed, limitations[li]);
        limitations = trimmed;
      }

      var outcome = {
        schemaVersion: OUTCOME_SCHEMA_VERSION,
        outcomeId: outcomeIdStr,
        experimentId: experiment.experimentId,
        'class': classDecision,
        observedDirection: observation.observedDirection,
        observedMagnitude: observation.observedMagnitude,
        comparabilityScore: followUp.comparabilityScore,
        confounders: _arrSlice(confounders),
        driverFeedback: observation.driverFeedback,
        dataQualityIssues: _arrSlice(dataQualityIssues),
        sideEffects: _arrSlice(sideEffects),
        limitations: _arrSlice(limitations),
        createdAt: createdAtIso,
      };

      // ---- Step 15: validate via E1 OUT.validateOutcomeShape -----------------------------
      var outCheck = OUT.validateOutcomeShape(outcome);
      if (outCheck.valid !== true) {
        return RC_E.buildBlockedResult(
          outCheck.reasonCodes ? _arrSlice(outCheck.reasonCodes) : [CODES.OUTCOME_INVALID],
          { detail: 'composed outcome failed E1 OUT.validateOutcomeShape' }
        );
      }

      // ---- Step 16: envelope byte cap ----------------------------------------------------
      var envelopeBytes;
      try { envelopeBytes = _utf8Bytes(_CAPTURED_JSON_STRINGIFY(outcome)); }
      catch (e) { envelopeBytes = Infinity; }
      if (envelopeBytes > ENVELOPE_BYTE_CAP) {
        return RC_E.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'outcome envelope ' + envelopeBytes + ' bytes > ' + ENVELOPE_BYTE_CAP });
      }

      // ---- Step 17: re-check intrinsics post-classify, deep-freeze, register -------------
      if (!_intrinsicsIntact()) {
        return _buildTamperBlock('intrinsic tampering detected post-classify');
      }
      _deepFreeze(outcome);
      _registerAuthoritativeOutcome(outcome);

      return _CAPTURED_OBJECT_FREEZE({ valid: true, outcome: outcome });

    } catch (eOuter) {
      return RC_E.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'classifyOutcome threw on hostile input' });
    }
  }

  // ---------- Public API ---------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    OUTCOME_SCHEMA_VERSION: OUTCOME_SCHEMA_VERSION,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    MIN_COMPARABILITY_FOR_VALID_COMPARISON: MIN_COMPARABILITY_FOR_VALID_COMPARISON,
    DATA_QUALITY_ISSUE_BLOCK_THRESHOLD: DATA_QUALITY_ISSUE_BLOCK_THRESHOLD,
    classifyOutcome: classifyOutcome,
    verifyAuthoritativeOutcome: verifyAuthoritativeOutcome,
  };
  _CAPTURED_OBJECT_FREEZE(api);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    try { Object.defineProperty(root, 'R3_0E_OutcomeClassifier', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_OutcomeClassifier = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
