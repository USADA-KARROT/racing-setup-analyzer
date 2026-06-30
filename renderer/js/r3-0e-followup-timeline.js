/**
 * renderer/js/r3-0e-followup-timeline.js — R3.0E E4 · Follow-up Link + Case Timeline service
 * (PRODUCTION).
 *
 * Authoritative entries:
 *   createFollowUpLink(input, opts)
 *   appendTimelineEvent(input, opts)
 *   projectTimeline(caseId, opts)
 *   listFollowUpLinksForParent(parentCaseId, opts)
 *
 * Verifiers (exported for downstream E5 / R3.0F consumers):
 *   verifyAuthoritativeFollowUpLink(candidate)
 *   verifyAuthoritativeTimelineProjection(candidate)
 *
 * Hard contract (SKYLINE 2026-06-30 R3.0 Continuous Resume Directive §7):
 *   • Append-only timeline. Existing events are NEVER overwritten. Corrections are
 *     expressed as NEW events whose params reference the prior eventId.
 *   • Timeline event eventIds are deterministic: hash(caseId, sequence, kind, i18nKey).
 *   • Timeline strictly monotonic by createdAt; duplicate eventId rejected; clock rollback
 *     yielding a timestamp earlier than the previous event → reject.
 *   • Follow-up link existence does NOT imply comparison validity. The classifier (E3)
 *     enforces same-case / same-session / explicit-reference / comparabilityScore as a
 *     separate authority chain.
 *   • Every link / event / projection is deep-frozen and registered in a closure-private
 *     WeakSet. The exported verifiers check identity + structural witnesses.
 *   • All ambient intrinsic operations dispatch via captured intrinsics so post-load
 *     Array.prototype / Object.* / TextEncoder rebinds cannot subvert validation.
 *   • Clock invoked AT MOST ONCE per call, AFTER authority and contract gates. Forged
 *     input → zero clock invocations.
 *   • Output never contains causal claims, driver-blame, raw telemetry, paths, or stacks.
 *
 * UMD: Node require / Electron renderer global (R3_0E_FollowUpTimeline).
 */
(function (root) {
  'use strict';

  // ---------- Module-init contracts -----------------------------------------------------------
  var RC_E = null, TL = null, FU = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { RC_E = require('../../contracts/r3.0e/reason-codes.js'); } catch (e) { RC_E = null; }
    try { TL = require('../../contracts/r3.0e/case-timeline-contract.js'); } catch (e) { TL = null; }
    try { FU = require('../../contracts/r3.0e/follow-up-link-contract.js'); } catch (e) { FU = null; }
  }
  if (RC_E === null && typeof R3_0E_ReasonCodes !== 'undefined') RC_E = R3_0E_ReasonCodes;
  if (TL === null && typeof R3_0E_CaseTimelineContract !== 'undefined') TL = R3_0E_CaseTimelineContract;
  if (FU === null && typeof R3_0E_FollowUpLinkContract !== 'undefined') FU = R3_0E_FollowUpLinkContract;
  if (!RC_E || !TL || !FU) {
    throw new Error('r3-0e-followup-timeline.js: requires R3.0E E1 contracts');
  }

  var CODES = RC_E.REASON_CODES;

  // ---------- Module-init captured intrinsics ------------------------------------------------
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
  // Codex E4-R2-01 closure: capture Date constructor + Date.prototype.toISOString at
  // module init so a post-load Date / Date.prototype mutation cannot subvert the
  // canonicalization step. _canonicalIso uses these captured references via captured
  // Reflect.apply and ALSO re-parses the produced ISO to verify it round-trips to the
  // same ms.
  var _CAPTURED_DATE_CTOR = Date;
  var _CAPTURED_DATE_PROTO_TO_ISO = Date.prototype.toISOString;
  var _CAPTURED_REFLECT_APPLY = Reflect.apply;
  var _CAPTURED_NUMBER_IS_FINITE = Number.isFinite;
  var _CAPTURED_NUMBER_IS_INTEGER = Number.isInteger;
  var _WeakSetCtor = WeakSet;
  var _WS_ADD = WeakSet.prototype.add;
  var _WS_HAS = WeakSet.prototype.has;
  var _ARR_PUSH = Array.prototype.push;
  var _ARR_SLICE = Array.prototype.slice;
  var _ARR_INDEX_OF = Array.prototype.indexOf;
  // Codex E4-R3-01/02 closures: capture String.prototype.toLowerCase + RegExp.prototype.test
  // so post-load ambient mutation cannot subvert the reserved-token blocklist or any
  // grammar regex (ID, i18n key, sober identifier).
  var _STR_TO_LOWER = String.prototype.toLowerCase;
  var _STR_INDEX_OF = String.prototype.indexOf;
  var _RE_TEST = RegExp.prototype.test;
  function _wsAdd(s, v) { try { _CAPTURED_REFLECT_APPLY(_WS_ADD, s, [v]); return true; } catch (e) { return false; } }
  function _wsHas(s, v) { try { return _CAPTURED_REFLECT_APPLY(_WS_HAS, s, [v]) === true; } catch (e) { return false; } }
  function _arrPush(a, v) { try { _CAPTURED_REFLECT_APPLY(_ARR_PUSH, a, [v]); return true; } catch (e) { return false; } }
  function _arrSlice(a) { try { return _CAPTURED_REFLECT_APPLY(_ARR_SLICE, a, []); } catch (e) { return []; } }
  function _arrIndexOf(a, v) { try { return _CAPTURED_REFLECT_APPLY(_ARR_INDEX_OF, a, [v]); } catch (e) { return -1; } }
  // Codex E4-R3-01 closure: capture-based ASCII lowercase via captured String.prototype.toLowerCase.
  function _lower(s) {
    if (typeof s !== 'string') return '';
    try { return _CAPTURED_REFLECT_APPLY(_STR_TO_LOWER, s, []); } catch (e) { return ''; }
  }
  function _strIndexOf(haystack, needle) {
    if (typeof haystack !== 'string') return -1;
    try { return _CAPTURED_REFLECT_APPLY(_STR_INDEX_OF, haystack, [needle]); } catch (e) { return -1; }
  }
  // Codex E4-R3-02 closure: capture-based regex test.
  function _reTest(re, s) {
    if (typeof s !== 'string') return false;
    try { return _CAPTURED_REFLECT_APPLY(_RE_TEST, re, [s]) === true; } catch (e) { return false; }
  }
  function _isFrozenSafe(v) { try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; } catch (e) { return false; } }
  function _isArraySafe(v) { try { return _CAPTURED_ARRAY_IS_ARRAY(v) === true; } catch (e) { return false; } }
  function _isoToMs(s) {
    try {
      if (typeof s !== 'string' || s.length === 0) return null;
      var n = _CAPTURED_DATE_PARSE(s);
      if (typeof n !== 'number' || n !== n) return null;
      return n;
    } catch (e) { return null; }
  }
  // Codex E4-R2-01 closure: capture-based canonical ISO. Builds a Date via the captured
  // constructor, calls captured toISOString via Reflect.apply, then re-parses to verify
  // the produced string round-trips to the exact same ms. Any divergence (post-load
  // tampering, Symbol.toPrimitive shenanigans, etc.) → null → caller blocks.
  function _canonicalIso(ms) {
    try {
      if (typeof ms !== 'number' || ms !== ms || !_CAPTURED_NUMBER_IS_FINITE(ms)) return null;
      var d = new _CAPTURED_DATE_CTOR(ms);
      var iso = _CAPTURED_REFLECT_APPLY(_CAPTURED_DATE_PROTO_TO_ISO, d, []);
      if (typeof iso !== 'string' || iso.length === 0) return null;
      var roundTrip = _CAPTURED_DATE_PARSE(iso);
      if (typeof roundTrip !== 'number' || roundTrip !== roundTrip || roundTrip !== ms) return null;
      return iso;
    } catch (e) { return null; }
  }
  function _utf8Bytes(s) { if (typeof s !== 'string') return 0; return s.length * 4; }

  // Codex E4-R2-03 closure: reserved-token blocklist for params keys + string values.
  // Even though strict id grammar permits "blame", "cause" as keys and "driver_error"
  // as values, these specific tokens are NEVER legitimate diagnostic content. The
  // blocklist is applied to BOTH keys (lowercased) AND string values (lowercased).
  // This pushes the design boundary toward i18n-keyed content for any narrative info.
  var RESERVED_HOSTILE_TOKENS = _CAPTURED_OBJECT_FREEZE([
    'blame', 'cause', 'caused', 'because', 'fault', 'guilt',
    'driver_error', 'driver_fault', 'driver_caused', 'crashed',
  ]);
  function _containsReservedHostileToken(s) {
    if (typeof s !== 'string') return false;
    var lower = _lower(s);
    for (var i = 0; i < RESERVED_HOSTILE_TOKENS.length; i++) {
      var tok = RESERVED_HOSTILE_TOKENS[i];
      if (lower === tok) return true;
      if (_strIndexOf(lower, tok) !== -1) return true;
    }
    return false;
  }
  // Codex E4-R3-02 closure: pre-compile sober-identifier regex once; use captured test.
  var SOBER_PARAM_KEY_RE = /^[a-z][a-z0-9_]{0,31}$/;

  // ---------- Constants ----------------------------------------------------------------------
  var SERVICE_VERSION = 1;
  var LINK_SCHEMA_VERSION = 1;
  var TIMELINE_SCHEMA_VERSION = 1;
  var PROJECTION_SCHEMA_VERSION = 1;
  var EVENT_ID_BYTE_CAP = 256;
  var I18N_KEY_RE = /^[a-z][a-z0-9_]*(?:\.[a-z0-9][a-z0-9_]*){1,5}$/;
  var I18N_KEY_MAX_LEN = 128;
  var ID_GRAMMAR_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
  var ID_FORBIDDEN_RE = /(\.\.|[\/\\]|^\.)/;
  var EVENT_KIND_ALLOWED = _CAPTURED_OBJECT_FREEZE([
    'baseline_captured',
    'hypothesis_recorded',
    'recommendation_made',
    'experiment_planned',
    'experiment_applied',
    'follow_up_case_created',
    'outcome_classified',
    'experiment_abandoned',
  ]);
  var LINK_INPUT_KEYS = _CAPTURED_OBJECT_FREEZE([
    'parentCaseId', 'followUpCaseId', 'experimentId', 'parentStatus',
  ]);
  var EVENT_INPUT_KEYS = _CAPTURED_OBJECT_FREEZE([
    'caseId', 'kind', 'i18nKey', 'params', 'correctionOf',
  ]);
  var OPTS_KEYS = _CAPTURED_OBJECT_FREEZE(['clock', 'referenceNowMs']);

  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isFiniteNumber(v) { return typeof v === 'number' && _CAPTURED_NUMBER_IS_FINITE(v) === true; }
  function _isOriginalPlainObject(v) {
    try {
      if (v === null || typeof v !== 'object' || _CAPTURED_ARRAY_IS_ARRAY(v)) return false;
      var p = _CAPTURED_OBJECT_GET_PROTO(v);
      return p === Object.prototype || p === null;
    } catch (e) { return false; }
  }
  function _idGrammarOk(s) {
    if (!_nonEmptyStr(s)) return false;
    if (_reTest(ID_FORBIDDEN_RE, s)) return false;
    if (!_reTest(ID_GRAMMAR_RE, s)) return false;
    return true;
  }
  function _i18nKeyOk(s) {
    if (!_nonEmptyStr(s)) return false;
    if (s.length > I18N_KEY_MAX_LEN) return false;
    if (!_reTest(I18N_KEY_RE, s)) return false;
    return true;
  }
  function _hasSymbolOwnKey(o) {
    try {
      var syms = _CAPTURED_OBJECT_GET_OWN_SYMS(o);
      return _CAPTURED_ARRAY_IS_ARRAY(syms) && syms.length > 0;
    } catch (e) { return true; }
  }
  function _snapshotPlain(o, allowedKeys, invalidCode) {
    if (!_isOriginalPlainObject(o)) return { valid: false, reasonCodes: [invalidCode, CODES.PROTOTYPE_POLLUTION_REJECTED], detail: 'not plain' };
    if (_hasSymbolOwnKey(o)) return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'symbol own key' };
    var names;
    try { names = _CAPTURED_OBJECT_GET_OWN_NAMES(o); }
    catch (e) { return { valid: false, reasonCodes: [invalidCode], detail: 'desc fail' }; }
    var snap = _CAPTURED_OBJECT_CREATE(null);
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      if (_arrIndexOf(allowedKeys, k) === -1) {
        return { valid: false, reasonCodes: [invalidCode, CODES.UNKNOWN_OWN_KEY], detail: 'unknown key ' + k };
      }
      var d;
      try { d = _CAPTURED_OBJECT_GET_OWN_DESC(o, k); }
      catch (e) { return { valid: false, reasonCodes: [invalidCode], detail: 'desc inaccessible' }; }
      if (!d || d.enumerable !== true) return { valid: false, reasonCodes: [invalidCode], detail: 'non-enum ' + k };
      if (typeof d.get === 'function' || typeof d.set === 'function') {
        return { valid: false, reasonCodes: [invalidCode], detail: 'accessor ' + k };
      }
      snap[k] = d.value;
    }
    return { valid: true, snapshot: snap };
  }
  function _deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    try { _CAPTURED_OBJECT_FREEZE(v); } catch (e) { /* swallow */ }
    var keys;
    try { keys = _CAPTURED_OBJECT_GET_OWN_NAMES(v); } catch (e) { return v; }
    for (var i = 0; i < keys.length; i++) {
      var child;
      try { child = v[keys[i]]; } catch (e) { continue; }
      _deepFreeze(child);
    }
    return v;
  }

  // ---------- Deterministic ID generators ----------------------------------------------------
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
  function _linkId(parentCaseId, followUpCaseId, experimentId) {
    return 'link_' + _fnv2('link|' + parentCaseId + '|' + followUpCaseId + '|' + experimentId);
  }
  function _eventId(caseId, sequence, kind, i18nKey) {
    return 'event_' + _fnv2('event|' + caseId + '|' + sequence + '|' + kind + '|' + i18nKey);
  }
  function _projectionId(caseId, eventCount, lastEventId) {
    return 'projection_' + _fnv2('projection|' + caseId + '|' + eventCount + '|' + (lastEventId || ''));
  }

  // ---------- Producer attestation (WeakSets) -----------------------------------------------
  var _authoritativeLinks = new _WeakSetCtor();
  var _authoritativeProjections = new _WeakSetCtor();
  function _registerAuthoritativeLink(v) { _wsAdd(_authoritativeLinks, v); }
  function _registerAuthoritativeProjection(v) { _wsAdd(_authoritativeProjections, v); }
  function verifyAuthoritativeFollowUpLink(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeLinks, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== LINK_SCHEMA_VERSION) return false;
      if (typeof candidate.linkId !== 'string') return false;
      if (typeof candidate.parentCaseId !== 'string') return false;
      if (typeof candidate.followUpCaseId !== 'string') return false;
      if (typeof candidate.experimentId !== 'string') return false;
      return true;
    } catch (e) { return false; }
  }
  function verifyAuthoritativeTimelineProjection(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeProjections, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== PROJECTION_SCHEMA_VERSION) return false;
      if (typeof candidate.projectionId !== 'string') return false;
      if (typeof candidate.caseId !== 'string') return false;
      if (!_isArraySafe(candidate.events)) return false;
      return true;
    } catch (e) { return false; }
  }

  function _resolveClock(optsIn) {
    var snap;
    if (optsIn === undefined || optsIn === null) snap = _CAPTURED_OBJECT_CREATE(null);
    else {
      var r = _snapshotPlain(optsIn, OPTS_KEYS, CODES.TIMELINE_INVALID);
      if (r.valid !== true) return { valid: false, reasonCodes: r.reasonCodes, detail: r.detail };
      snap = r.snapshot;
      if (snap.clock !== undefined && snap.clock !== null && typeof snap.clock !== 'function') {
        return { valid: false, reasonCodes: [CODES.TIMELINE_INVALID], detail: 'opts.clock not function' };
      }
      if (snap.referenceNowMs !== undefined && snap.referenceNowMs !== null
          && (typeof snap.referenceNowMs !== 'number' || !_CAPTURED_NUMBER_IS_INTEGER(snap.referenceNowMs) || snap.referenceNowMs < 0)) {
        return { valid: false, reasonCodes: [CODES.TIMELINE_INVALID], detail: 'opts.referenceNowMs invalid' };
      }
    }
    var refMs = null;
    var iso = null;
    if (typeof snap.referenceNowMs === 'number') {
      refMs = snap.referenceNowMs;
      // Codex E4-R2-01 closure: canonicalization via captured intrinsics with round-trip
      // verification. Post-load Date / Date.prototype.toISOString mutation cannot affect.
      iso = _canonicalIso(refMs);
    } else if (typeof snap.clock === 'function') {
      var ciso = null;
      try { ciso = snap.clock(); } catch (e) { ciso = null; }
      if (typeof ciso === 'string' && ciso.length > 0) {
        var ms = _isoToMs(ciso);
        if (typeof ms === 'number') {
          refMs = ms;
          iso = _canonicalIso(ms);
        }
      }
    }
    if (typeof refMs !== 'number' || refMs !== refMs || iso === null) {
      return { valid: false, reasonCodes: [CODES.TIMELINE_INVALID], detail: 'cannot resolve clock' };
    }
    return { valid: true, refMs: refMs, iso: iso };
  }

  // ---------- E4 timeline-event params validator (shared by append + project) ---------------
  // Codex E4-R1-01 closure: projectTimeline MUST re-apply the SAME primitive allowlist
  // used by appendTimelineEvent. The E1 contract is structurally permissive (params
  // accepts any plain object); the E4 service layer adds the strict allowlist. A
  // corrupted stored event with hostile params must NOT survive into an authoritative
  // projection.
  function _validateEventParams(params) {
    if (params === null || params === undefined) return { valid: true, value: null };
    if (!_isOriginalPlainObject(params)) return { valid: false, code: 'params not plain' };
    if (_hasSymbolOwnKey(params)) return { valid: false, code: 'params has Symbol key' };
    var names;
    try { names = _CAPTURED_OBJECT_GET_OWN_NAMES(params); }
    catch (e) { return { valid: false, code: 'params desc fail' }; }
    if (names.length > 16) return { valid: false, code: 'params keys exceed cap' };
    var rebuilt = {};
    for (var pi = 0; pi < names.length; pi++) {
      var pk = names[pi];
      // 'correction_of' is the canonical reserved key — its value is a strict id.
      var keyOk = _reTest(SOBER_PARAM_KEY_RE, pk);
      if (!keyOk) return { valid: false, code: 'params key not sober: ' + pk };
      // Codex E4-R2-03 closure: even sober ids that match reserved hostile tokens (blame,
      // cause, driver_error, ...) are forbidden in BOTH keys and string values. Narrative
      // / causal / blame content must travel through i18n keys whose translations live
      // outside the runtime — never as bare strings in the event params.
      if (_containsReservedHostileToken(pk)) return { valid: false, code: 'params key matches reserved hostile token: ' + pk };
      var pd;
      try { pd = _CAPTURED_OBJECT_GET_OWN_DESC(params, pk); }
      catch (e) { return { valid: false, code: 'params desc fail at ' + pk }; }
      if (!pd || pd.enumerable !== true) return { valid: false, code: 'params non-enum at ' + pk };
      if (typeof pd.get === 'function' || typeof pd.set === 'function') {
        return { valid: false, code: 'params accessor at ' + pk };
      }
      var pv = pd.value;
      if (pv === null) {
        // allowed
      } else if (typeof pv === 'boolean') {
        // allowed
      } else if (typeof pv === 'number') {
        if (!_isFiniteNumber(pv)) return { valid: false, code: 'params[' + pk + '] not finite' };
      } else if (typeof pv === 'string') {
        if (!_i18nKeyOk(pv) && !_idGrammarOk(pv)) {
          return { valid: false, code: 'params[' + pk + '] string not strict i18n key / id' };
        }
        // Codex E4-R2-03 closure: reserved hostile tokens in string values are forbidden
        // regardless of grammar match.
        if (_containsReservedHostileToken(pv)) {
          return { valid: false, code: 'params[' + pk + '] string matches reserved hostile token' };
        }
      } else {
        return { valid: false, code: 'params[' + pk + '] not primitive (string/number/boolean/null)' };
      }
      try {
        _CAPTURED_OBJECT_DEFINE_PROPERTY(rebuilt, pk, { value: pv, writable: true, enumerable: true, configurable: true });
      } catch (e) {
        return { valid: false, code: 'params rebuild failed at ' + pk };
      }
      // Codex E4-R1-03 / E3-R4-01 closure pattern: re-read descriptor and verify value
      // identity with Object.is. Defeats pre-load defineProperty poisoning.
      var dCheck;
      try { dCheck = _CAPTURED_OBJECT_GET_OWN_DESC(rebuilt, pk); }
      catch (e) { return { valid: false, code: 'params re-read fail' }; }
      if (!dCheck || dCheck.enumerable !== true || typeof dCheck.get === 'function' || typeof dCheck.set === 'function') {
        return { valid: false, code: 'params post-define corrupt at ' + pk };
      }
      var same = false;
      try { same = _CAPTURED_OBJECT_IS(dCheck.value, pv) === true; } catch (e) { same = false; }
      if (!same) return { valid: false, code: 'params post-define value mismatch at ' + pk };
    }
    return { valid: true, value: rebuilt };
  }

  // ---------- Factory: createFollowUpTimelineService ----------------------------------------
  /**
   * createFollowUpTimelineService({ timelineStore, followUpLinkStore })
   *
   * Returns an authoritative service object. All methods return Promises.
   */
  function createFollowUpTimelineService(deps) {
    if (!_isOriginalPlainObject(deps)) throw new Error('R3_0E_FOLLOWUP_TIMELINE_DEPS_INVALID');
    var timelineStore = deps.timelineStore;
    var followUpLinkStore = deps.followUpLinkStore;
    if (!timelineStore || typeof timelineStore.appendEvent !== 'function' || typeof timelineStore.getTimeline !== 'function') {
      throw new Error('R3_0E_FOLLOWUP_TIMELINE_TIMELINE_STORE_INVALID');
    }
    if (!followUpLinkStore || typeof followUpLinkStore.create !== 'function' || typeof followUpLinkStore.get !== 'function') {
      throw new Error('R3_0E_FOLLOWUP_TIMELINE_LINK_STORE_INVALID');
    }

    function _block(codes, detail) {
      return RC_E.buildBlockedResult(codes, { detail: detail });
    }

    // ---- createFollowUpLink --------------------------------------------------------------
    function createFollowUpLink(inputIn, optsIn) {
      // Step 1: descriptor snapshot (closed key set, no Symbol / accessor / Proxy).
      var inR = _snapshotPlain(inputIn, LINK_INPUT_KEYS, CODES.LINKAGE_INVALID);
      if (inR.valid !== true) return Promise.resolve(_block(inR.reasonCodes, inR.detail));
      var i = inR.snapshot;

      // Step 2: structural validation
      if (!_idGrammarOk(i.parentCaseId)) return Promise.resolve(_block([CODES.LINKAGE_PARENT_MISSING], 'parentCaseId invalid'));
      if (!_idGrammarOk(i.followUpCaseId)) return Promise.resolve(_block([CODES.LINKAGE_INVALID], 'followUpCaseId invalid'));
      if (i.parentCaseId === i.followUpCaseId) return Promise.resolve(_block([CODES.LINKAGE_INVALID], 'self-link forbidden'));
      if (!_idGrammarOk(i.experimentId)) return Promise.resolve(_block([CODES.LINKAGE_INVALID], 'experimentId invalid'));
      var parentStatus = i.parentStatus === undefined ? 'present' : i.parentStatus;
      if (FU.PARENT_STATUS_ALLOWED && _arrIndexOf(FU.PARENT_STATUS_ALLOWED, parentStatus) === -1) {
        return Promise.resolve(_block([CODES.LINKAGE_INVALID], 'parentStatus invalid'));
      }

      // Step 3: opts + clock (post-authority)
      var ck = _resolveClock(optsIn);
      if (ck.valid !== true) return Promise.resolve(_block(ck.reasonCodes, ck.detail));

      // Step 4: build link record
      var link = {
        schemaVersion: LINK_SCHEMA_VERSION,
        linkId: _linkId(i.parentCaseId, i.followUpCaseId, i.experimentId),
        parentCaseId: i.parentCaseId,
        followUpCaseId: i.followUpCaseId,
        experimentId: i.experimentId,
        parentStatus: parentStatus,
        createdAt: ck.iso,
      };

      // Step 5: validate via E1 contract
      var vCheck = FU.validateFollowUpLinkShape(link);
      if (vCheck.valid !== true) return Promise.resolve(_block(vCheck.reasonCodes ? _arrSlice(vCheck.reasonCodes) : [CODES.LINKAGE_INVALID], 'shape invalid'));

      // Step 6: persist via E2 store + register authority
      return followUpLinkStore.create(link).then(function () {
        _deepFreeze(link);
        _registerAuthoritativeLink(link);
        return _CAPTURED_OBJECT_FREEZE({ valid: true, link: link });
      }, function (err) {
        // Surface the E2 error code as a structured BLOCK.
        return _block([CODES.LINKAGE_INVALID], (err && err.code) ? String(err.code) : 'link store failure');
      });
    }

    function getFollowUpLink(linkId) {
      if (!_idGrammarOk(linkId)) return Promise.resolve(null);
      return followUpLinkStore.get(linkId).then(function (rec) {
        if (rec === null || rec === undefined) return null;
        // E2 has already validated via E1 contract on read. Rehydrate authority.
        // Codex pattern: rehydrated records get a fresh frozen plain object so identity
        // is owned by the service, then registered.
        var r = _snapshotPlain(rec, _CAPTURED_OBJECT_FREEZE(['schemaVersion', 'linkId', 'parentCaseId', 'followUpCaseId', 'experimentId', 'parentStatus', 'createdAt']), CODES.LINKAGE_INVALID);
        if (r.valid !== true) return null;
        var rebuilt = {
          schemaVersion: r.snapshot.schemaVersion,
          linkId: r.snapshot.linkId,
          parentCaseId: r.snapshot.parentCaseId,
          followUpCaseId: r.snapshot.followUpCaseId,
          experimentId: r.snapshot.experimentId,
          parentStatus: r.snapshot.parentStatus,
          createdAt: r.snapshot.createdAt,
        };
        var v = FU.validateFollowUpLinkShape(rebuilt);
        if (v.valid !== true) return null;
        _deepFreeze(rebuilt);
        _registerAuthoritativeLink(rebuilt);
        return rebuilt;
      });
    }

    function listFollowUpLinksForParent(parentCaseId) {
      if (!_idGrammarOk(parentCaseId)) return Promise.resolve([]);
      // Use the store's listForParent (E2 already validates each row and enforces
      // parent membership). Re-wrap each into our authority registry.
      if (typeof followUpLinkStore.listForParent !== 'function') return Promise.resolve([]);
      return followUpLinkStore.listForParent(parentCaseId).then(function (rows) {
        var LINK_KEYS_FROZEN = _CAPTURED_OBJECT_FREEZE(['schemaVersion', 'linkId', 'parentCaseId', 'followUpCaseId', 'experimentId', 'parentStatus', 'createdAt']);
        var out = [];
        for (var i = 0; i < rows.length; i++) {
          // Codex E4-R2-02 closure: apply the SAME descriptor snapshot used by
          // getFollowUpLink BEFORE reading any field. Hostile/accessor rows (proxies that
          // return phantom data via getters) cannot leak content into authoritative
          // listings — only data descriptors with the closed key set survive.
          var snap = _snapshotPlain(rows[i], LINK_KEYS_FROZEN, CODES.LINKAGE_INVALID);
          if (snap.valid !== true) continue;
          var rebuilt = {
            schemaVersion: snap.snapshot.schemaVersion,
            linkId: snap.snapshot.linkId,
            parentCaseId: snap.snapshot.parentCaseId,
            followUpCaseId: snap.snapshot.followUpCaseId,
            experimentId: snap.snapshot.experimentId,
            parentStatus: snap.snapshot.parentStatus,
            createdAt: snap.snapshot.createdAt,
          };
          var v = FU.validateFollowUpLinkShape(rebuilt);
          if (v.valid !== true) continue;
          _deepFreeze(rebuilt);
          _registerAuthoritativeLink(rebuilt);
          _arrPush(out, rebuilt);
        }
        return _CAPTURED_OBJECT_FREEZE(out);
      });
    }

    // ---- appendTimelineEvent ------------------------------------------------------------
    function appendTimelineEvent(inputIn, optsIn) {
      // Step 1: descriptor snapshot
      var inR = _snapshotPlain(inputIn, EVENT_INPUT_KEYS, CODES.TIMELINE_INVALID);
      if (inR.valid !== true) return Promise.resolve(_block(inR.reasonCodes, inR.detail));
      var i = inR.snapshot;

      // Step 2: structural validation
      if (!_idGrammarOk(i.caseId)) return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'caseId invalid'));
      if (_arrIndexOf(EVENT_KIND_ALLOWED, i.kind) === -1) {
        return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'kind not in closed enum: ' + i.kind));
      }
      if (!_i18nKeyOk(i.i18nKey)) return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'i18nKey not strict i18n key'));
      // Codex E4-R1-01/03 closure: delegate params validation to the shared E4 helper
      // which applies the primitive allowlist AND the post-define value-equality re-read.
      var pvR = _validateEventParams(i.params);
      if (pvR.valid !== true) return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'params: ' + pvR.code));
      var rebuiltParams = pvR.value;
      // Correction event: correctionOf must be an existing event id (validated grammar)
      // OR null/undefined. The store layer enforces append-only — the original event is
      // never modified.
      if (i.correctionOf !== undefined && i.correctionOf !== null) {
        if (!_idGrammarOk(i.correctionOf)) return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'correctionOf invalid id'));
      }

      // Step 3: opts + clock (post-authority)
      var ck = _resolveClock(optsIn);
      if (ck.valid !== true) return Promise.resolve(_block(ck.reasonCodes, ck.detail));

      // Step 4: fetch existing timeline to derive sequence (post-authority)
      return timelineStore.getTimeline(i.caseId).then(function (existing) {
        var existingEvents = (existing && _isArraySafe(existing.events)) ? existing.events : [];
        var sequence = existingEvents.length;
        // Codex E4-R1-05 closure: STRICT monotonicity. The E1 contract spec is monotonic
        // by createdAt; equal-timestamp appends are ambiguous (the deterministic eventId
        // is derived from sequence which IS unique, but two events at the same ms can
        // still mask the ordering on reload). Reject refMs <= prev so every event is
        // strictly later than the previous.
        if (existingEvents.length > 0) {
          var prevMs = _isoToMs(existingEvents[existingEvents.length - 1].createdAt);
          if (prevMs !== null && ck.refMs <= prevMs) {
            return _block([CODES.TIMELINE_ORDERING_INVALID], 'clock not strictly monotonic: refMs ' + ck.refMs + ' <= prev ' + prevMs);
          }
        }

        // Codex E4-R1-04 closure: correctionOf MUST reference an existing event id in
        // THIS case's timeline. Otherwise a caller could correct a non-existent event,
        // leaving an orphaned reference in the persisted timeline.
        if (i.correctionOf !== undefined && i.correctionOf !== null) {
          var found = false;
          for (var ei = 0; ei < existingEvents.length; ei++) {
            if (existingEvents[ei].eventId === i.correctionOf) { found = true; break; }
          }
          if (!found) {
            return _block([CODES.TIMELINE_INVALID], 'correctionOf references non-existent event: ' + i.correctionOf);
          }
        }

        // Step 5: compose event
        var eventIdStr = _eventId(i.caseId, sequence, i.kind, i.i18nKey);
        if (_utf8Bytes(eventIdStr) > EVENT_ID_BYTE_CAP) {
          return _block([CODES.TIMELINE_INVALID, CODES.BYTE_CAP_EXCEEDED], 'eventId byte cap exceeded');
        }
        // If params include a correctionOf reference, store it in params under canonical key.
        var finalParams = rebuiltParams;
        if (i.correctionOf !== undefined && i.correctionOf !== null) {
          if (finalParams === null) finalParams = {};
          try {
            _CAPTURED_OBJECT_DEFINE_PROPERTY(finalParams, 'correction_of', { value: i.correctionOf, writable: true, enumerable: true, configurable: true });
          } catch (e) {
            return _block([CODES.TIMELINE_INVALID], 'correctionOf injection failed');
          }
          // Codex E4-R1-03 closure: post-define value-equality re-read for correction_of.
          var dCO;
          try { dCO = _CAPTURED_OBJECT_GET_OWN_DESC(finalParams, 'correction_of'); }
          catch (eRR) { return _block([CODES.TIMELINE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], 'correction_of re-read fail'); }
          if (!dCO || dCO.enumerable !== true || typeof dCO.get === 'function' || typeof dCO.set === 'function') {
            return _block([CODES.TIMELINE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], 'correction_of post-define corrupt');
          }
          var coSame = false;
          try { coSame = _CAPTURED_OBJECT_IS(dCO.value, i.correctionOf) === true; } catch (eRR2) { coSame = false; }
          if (!coSame) {
            return _block([CODES.TIMELINE_INVALID, CODES.INTERNAL_CONTRACT_VIOLATION], 'correction_of post-define value mismatch');
          }
        }
        var event = {
          eventId: eventIdStr,
          kind: i.kind,
          createdAt: ck.iso,
          i18nKey: i.i18nKey,
          params: finalParams,
        };

        // Step 6: persist via E2 store (E2 enforces duplicate + out-of-order + future-schema)
        return timelineStore.appendEvent(i.caseId, event).then(function () {
          _deepFreeze(event);
          // Return the event envelope (NOT registered in a WeakSet here — projection is the
          // authoritative aggregate; individual events live inside projections).
          return _CAPTURED_OBJECT_FREEZE({ valid: true, event: event });
        }, function (err) {
          var code = (err && err.code) ? String(err.code) : 'append failure';
          // Map store error codes to E1 reason codes for callers.
          if (code === 'R3_0E_TIMELINE_DUPLICATE_EVENT') return _block([CODES.TIMELINE_INVALID], 'duplicate eventId');
          if (code === 'R3_0E_TIMELINE_OUT_OF_ORDER') return _block([CODES.TIMELINE_ORDERING_INVALID], 'out-of-order timestamp');
          if (code === 'R3_0E_TIMELINE_FUTURE_SCHEMA') return _block([CODES.UNSUPPORTED_FUTURE_SCHEMA], 'future timeline schema');
          return _block([CODES.TIMELINE_INVALID], code);
        });
      }, function (err) {
        var code = (err && err.code) ? String(err.code) : 'getTimeline failure';
        if (code === 'R3_0E_TIMELINE_CORRUPTED') return _block([CODES.TIMELINE_INVALID], 'existing timeline corrupted');
        if (code === 'R3_0E_TIMELINE_FUTURE_SCHEMA') return _block([CODES.UNSUPPORTED_FUTURE_SCHEMA], 'future timeline schema');
        return _block([CODES.TIMELINE_INVALID], code);
      });
    }

    // ---- projectTimeline ----------------------------------------------------------------
    function projectTimeline(caseId, optsIn) {
      if (!_idGrammarOk(caseId)) return Promise.resolve(_block([CODES.TIMELINE_INVALID], 'caseId invalid'));
      var ck = _resolveClock(optsIn);
      if (ck.valid !== true) return Promise.resolve(_block(ck.reasonCodes, ck.detail));
      return timelineStore.getTimeline(caseId).then(function (rec) {
        if (!_isOriginalPlainObject(rec)) return _block([CODES.TIMELINE_INVALID], 'store returned non-plain');
        // Re-validate via E1 contract (defence-in-depth — store already validates on read,
        // but the projection consumer treats this as an authority boundary).
        var v = TL.validateCaseTimelineShape(rec);
        if (v.valid !== true) return _block(v.reasonCodes ? _arrSlice(v.reasonCodes) : [CODES.TIMELINE_INVALID], 'timeline shape invalid');

        // Rebuild events into a service-owned frozen array (deterministic order by sequence
        // index, which by E2's append-only invariant equals chronological order; the E1
        // contract also enforces monotonic createdAt).
        var rebuiltEvents = [];
        for (var i = 0; i < rec.events.length; i++) {
          var e = rec.events[i];
          // Snapshot the event with its closed key set + i18n grammar enforcement.
          var er = _snapshotPlain(e, _CAPTURED_OBJECT_FREEZE(['eventId', 'kind', 'createdAt', 'i18nKey', 'params']), CODES.TIMELINE_INVALID);
          if (er.valid !== true) return _block(er.reasonCodes, 'event ' + i + ': ' + er.detail);
          if (!_idGrammarOk(er.snapshot.eventId)) return _block([CODES.TIMELINE_INVALID], 'event ' + i + ' eventId invalid');
          if (_arrIndexOf(EVENT_KIND_ALLOWED, er.snapshot.kind) === -1) return _block([CODES.TIMELINE_INVALID], 'event ' + i + ' kind invalid');
          if (!_i18nKeyOk(er.snapshot.i18nKey)) return _block([CODES.TIMELINE_INVALID], 'event ' + i + ' i18nKey invalid');
          // Codex E4-R1-01 closure: apply the SAME primitive allowlist to stored params
          // that appendTimelineEvent uses. A corrupted-storage event with hostile params
          // (string blame, path, nested object, raw-telemetry array) must NOT pass through
          // into an authoritative projection.
          var pvR2 = _validateEventParams(er.snapshot.params);
          if (pvR2.valid !== true) return _block([CODES.TIMELINE_INVALID], 'event ' + i + ' params: ' + pvR2.code);
          // Re-freeze a service-owned copy of the event with REBUILT params (caller's
          // reference dropped; outcome envelope carries only sanitized structure).
          var copy = {
            eventId: er.snapshot.eventId,
            kind: er.snapshot.kind,
            createdAt: er.snapshot.createdAt,
            i18nKey: er.snapshot.i18nKey,
            params: pvR2.value,
          };
          _deepFreeze(copy);
          _arrPush(rebuiltEvents, copy);
        }
        var lastEventId = rebuiltEvents.length > 0 ? rebuiltEvents[rebuiltEvents.length - 1].eventId : '';
        var projection = {
          schemaVersion: PROJECTION_SCHEMA_VERSION,
          projectionId: _projectionId(caseId, rebuiltEvents.length, lastEventId),
          caseId: caseId,
          eventCount: rebuiltEvents.length,
          events: rebuiltEvents,
          generatedAt: ck.iso,
        };
        _deepFreeze(projection);
        _registerAuthoritativeProjection(projection);
        return _CAPTURED_OBJECT_FREEZE({ valid: true, projection: projection });
      }, function (err) {
        var code = (err && err.code) ? String(err.code) : 'getTimeline failure';
        if (code === 'R3_0E_TIMELINE_CORRUPTED') return _block([CODES.TIMELINE_INVALID], 'existing timeline corrupted');
        if (code === 'R3_0E_TIMELINE_FUTURE_SCHEMA') return _block([CODES.UNSUPPORTED_FUTURE_SCHEMA], 'future timeline schema');
        return _block([CODES.TIMELINE_INVALID], code);
      });
    }

    var serviceApi = {
      SERVICE_VERSION: SERVICE_VERSION,
      LINK_SCHEMA_VERSION: LINK_SCHEMA_VERSION,
      PROJECTION_SCHEMA_VERSION: PROJECTION_SCHEMA_VERSION,
      EVENT_KIND_ALLOWED: EVENT_KIND_ALLOWED,
      createFollowUpLink: createFollowUpLink,
      getFollowUpLink: getFollowUpLink,
      listFollowUpLinksForParent: listFollowUpLinksForParent,
      appendTimelineEvent: appendTimelineEvent,
      projectTimeline: projectTimeline,
    };
    _CAPTURED_OBJECT_FREEZE(serviceApi);
    return serviceApi;
  }

  // ---------- Public API ---------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    LINK_SCHEMA_VERSION: LINK_SCHEMA_VERSION,
    TIMELINE_SCHEMA_VERSION: TIMELINE_SCHEMA_VERSION,
    PROJECTION_SCHEMA_VERSION: PROJECTION_SCHEMA_VERSION,
    EVENT_KIND_ALLOWED: EVENT_KIND_ALLOWED,
    createFollowUpTimelineService: createFollowUpTimelineService,
    verifyAuthoritativeFollowUpLink: verifyAuthoritativeFollowUpLink,
    verifyAuthoritativeTimelineProjection: verifyAuthoritativeTimelineProjection,
  };
  _CAPTURED_OBJECT_FREEZE(api);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    try { Object.defineProperty(root, 'R3_0E_FollowUpTimeline', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_FollowUpTimeline = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
