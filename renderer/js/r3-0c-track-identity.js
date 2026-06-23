/**
 * renderer/js/r3-0c-track-identity.js — R3.0C C2 · Track Identity authority (renderer-level).
 *
 * Decides whether a track-identity claim is AUTHORITATIVE for comparison purposes, and whether
 * two authoritative identities are equal. The authority rule is intentionally narrow:
 *
 *   AN IDENTITY IS AUTHORITATIVE ONLY IF its trackId and layoutId are explicit non-empty strings
 *   AND its `source` field is the literal 'explicit'. Anything else — a track name, a filename,
 *   a circuit length, the shape of the sample trace — is REJECTED. The service NEVER infers an
 *   identity from any of those inputs, even when they are present.
 *
 * Why this is its own module (not folded into lap-authority): track identity is the gate that
 * blocks cross-session comparison from accidentally treating "different physical track but same
 * name" as the same track, AND the gate that prevents "same physical track but different layout
 * configurations" (long vs short circuit, with/without chicane) from being silently equated. The
 * derive / equals split lets the comparison-eligibility service ask the two questions separately
 * and emit the correct reason code (MISSING_TRACK_IDENTITY vs TRACK_IDENTITY_MISMATCH).
 *
 * Public surface:
 *   deriveTrackIdentity(metadata)           — authoritative claim or blocked (MISSING_TRACK_IDENTITY)
 *   equalsTrackIdentity(a, b)               — strict equality of authoritative (trackId, layoutId)
 *   ACCEPTED_SOURCES / FORBIDDEN_INFERENCE_FIELDS — for tests and downstream consumers
 *
 * Fail-closed contract:
 *   • Non-object / null metadata → blocked (MISSING_TRACK_IDENTITY).
 *   • metadata.source != 'explicit' → blocked (MISSING_TRACK_IDENTITY) regardless of which
 *     non-explicit value it carries (e.g. 'name', 'filename', 'lap_length_match'). The service
 *     RECORDS in the evidence which inference signal was rejected so downstream UI can explain
 *     to the user what is missing — but never accepts it.
 *   • Strings 'undefined' / 'null' / whitespace-only are treated as missing.
 *   • equalsTrackIdentity: BOTH sides must be authoritative; if either is not, return equal=false
 *     with MISSING_TRACK_IDENTITY (NOT TRACK_IDENTITY_MISMATCH — they are different reasons).
 *
 * NO ALGORITHM beyond the strict structural check: this module does NOT touch UI, does NOT touch
 * the Feature Registry, does NOT load files, does NOT geocode, does NOT cluster.
 *
 * UMD: Node require / Electron renderer global (R3_0C_TrackIdentity).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); }
    catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) {
    throw new Error('renderer/js/r3-0c-track-identity.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }
  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C2_LAP_AUTHORITY';

  // The single accepted source flag. Adding more values here requires governance review because it
  // widens the universe of inputs the comparison layer trusts.
  var ACCEPTED_SOURCES = Object.freeze(['explicit']);

  // Fields the service WILL NOT consult to infer an identity, even when present. Recording these in
  // the rejection evidence prevents silent "we ignored your filename" surprises — the service tells
  // the caller exactly which signals were available but refused.
  var FORBIDDEN_INFERENCE_FIELDS = Object.freeze(['name', 'displayName', 'filename', 'lapLengthMeters', 'sampleShapeFingerprint', 'gpsBoundingBox']);

  function _isPlain(v) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  function _trimmedNonEmptyStr(v) {
    if (typeof v !== 'string') return false;
    var s = v.trim();
    if (s.length === 0) return false;
    // 'undefined' / 'null' string literals from sloppy upstream serialization must NOT pass.
    if (s === 'undefined' || s === 'null') return false;
    return true;
  }

  function _present(v) { return v !== undefined && v !== null && v !== ''; }

  function _blocked(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    return RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
  }

  /**
   * deriveTrackIdentity(metadata) — return an authoritative identity descriptor, or a blocked
   * result listing which inference inputs were present but refused. Inputs:
   *   metadata = { trackId, layoutId, source, ...optional fields the service WILL NOT use }
   * Authoritative output:
   *   { authoritative:true, identity:{trackId, layoutId}, reasonCodes:[], evidence:{...} }
   * Blocked output:
   *   buildBlockedResult([MISSING_TRACK_IDENTITY]) carrying { authoritative:false,
   *     identity:null, rejectedInferenceSignals:[...] } in a wrapping object.
   */
  function deriveTrackIdentity(metadata) {
    var rejectedInference = [];
    if (_isPlain(metadata)) {
      FORBIDDEN_INFERENCE_FIELDS.forEach(function (f) { if (_present(metadata[f])) rejectedInference.push(f); });
    }
    var rejectedFrozen = Object.freeze(rejectedInference.slice());

    if (!_isPlain(metadata)) {
      var b0 = _blocked([CODES.MISSING_TRACK_IDENTITY], 'track identity metadata not an object');
      return Object.freeze({
        authoritative: false,
        identity: null,
        status: 'blocked',
        reasonCodes: b0.reasonCodes,
        explanationKeys: b0.explanationKeys,
        rejectedInferenceSignals: rejectedFrozen,
        detail: b0.detail,
        result: null,
      });
    }
    if (!_trimmedNonEmptyStr(metadata.trackId) || !_trimmedNonEmptyStr(metadata.layoutId)) {
      var b1 = _blocked([CODES.MISSING_TRACK_IDENTITY], 'trackId or layoutId not a non-empty string');
      return Object.freeze({
        authoritative: false,
        identity: null,
        status: 'blocked',
        reasonCodes: b1.reasonCodes,
        explanationKeys: b1.explanationKeys,
        rejectedInferenceSignals: rejectedFrozen,
        detail: b1.detail,
        result: null,
      });
    }
    if (ACCEPTED_SOURCES.indexOf(metadata.source) === -1) {
      var b2 = _blocked([CODES.MISSING_TRACK_IDENTITY], 'track identity source is not "explicit"');
      return Object.freeze({
        authoritative: false,
        identity: null,
        status: 'blocked',
        reasonCodes: b2.reasonCodes,
        explanationKeys: b2.explanationKeys,
        rejectedInferenceSignals: rejectedFrozen,
        // record the rejected source value so the UI can say "we saw source='name' which we won't accept"
        rejectedSource: typeof metadata.source === 'string' ? metadata.source.slice(0, 60) : null,
        detail: b2.detail,
        result: null,
      });
    }
    return Object.freeze({
      authoritative: true,
      identity: Object.freeze({
        trackId: metadata.trackId.trim(),
        layoutId: metadata.layoutId.trim(),
        source: 'explicit',
      }),
      status: 'track_identity_authoritative',
      reasonCodes: Object.freeze([]),
      rejectedInferenceSignals: rejectedFrozen,
      result: null,
    });
  }

  /**
   * equalsTrackIdentity(a, b) — strict equality of two AUTHORITATIVE identity claims.
   *   • Either operand non-authoritative → equal=false + MISSING_TRACK_IDENTITY (record which
   *     side was non-authoritative so the comparison layer can guide the user precisely).
   *   • Both authoritative but trackId+layoutId differ → equal=false + TRACK_IDENTITY_MISMATCH.
   *   • Both authoritative AND (trackId, layoutId) match → equal=true.
   * Operands may be the raw metadata or the result object of deriveTrackIdentity — the service
   * re-derives if it sees a raw metadata shape so callers can chain either way.
   */
  function equalsTrackIdentity(a, b) {
    var aRes = (_isPlain(a) && a.authoritative === true) ? a : deriveTrackIdentity(a);
    var bRes = (_isPlain(b) && b.authoritative === true) ? b : deriveTrackIdentity(b);
    if (!aRes.authoritative || !bRes.authoritative) {
      var which = [];
      if (!aRes.authoritative) which.push('a');
      if (!bRes.authoritative) which.push('b');
      var bm = _blocked([CODES.MISSING_TRACK_IDENTITY], 'non-authoritative side: ' + which.join(','));
      return Object.freeze({
        equal: false,
        status: 'blocked',
        reasonCodes: bm.reasonCodes,
        explanationKeys: bm.explanationKeys,
        nonAuthoritativeSide: Object.freeze(which.slice()),
        result: null,
      });
    }
    var ai = aRes.identity, bi = bRes.identity;
    if (ai.trackId !== bi.trackId || ai.layoutId !== bi.layoutId) {
      var mm = _blocked([CODES.TRACK_IDENTITY_MISMATCH], 'identities differ');
      return Object.freeze({
        equal: false,
        status: 'blocked',
        reasonCodes: mm.reasonCodes,
        explanationKeys: mm.explanationKeys,
        a: Object.freeze({ trackId: ai.trackId, layoutId: ai.layoutId }),
        b: Object.freeze({ trackId: bi.trackId, layoutId: bi.layoutId }),
        result: null,
      });
    }
    return Object.freeze({
      equal: true,
      status: 'track_identity_equal',
      identity: Object.freeze({ trackId: ai.trackId, layoutId: ai.layoutId }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    ACCEPTED_SOURCES: ACCEPTED_SOURCES,
    FORBIDDEN_INFERENCE_FIELDS: FORBIDDEN_INFERENCE_FIELDS,
    deriveTrackIdentity: deriveTrackIdentity,
    equalsTrackIdentity: equalsTrackIdentity,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_TrackIdentity = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
