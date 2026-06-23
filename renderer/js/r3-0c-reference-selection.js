/**
 * renderer/js/r3-0c-reference-selection.js — R3.0C C4 · Reference-Lap Selection Service.
 *
 * The ONLY reference-lap selection authority for the comparison surface. The rule is the scope
 * pin (governance/r3.0/train.schema.json :: scopePin.referenceSelectionPolicy):
 *
 *   AN ELIGIBLE REFERENCE EXISTS ONLY IF the request declares selectedBy === 'user' with
 *   complete supporting evidence (lapId + sourceId + selectedAt), the candidate lap descriptor
 *   passes the C2 lap-authority service AND has track identity equal to the request's, AND the
 *   candidate's identity (caseId, sessionId) matches the request's identity. fastestValid /
 *   medianValid / bestSectorComposite / implicitPrevious / autoFirstLap / any other auto-mode
 *   are FAIL-CLOSED (REFERENCE_AUTO_SELECTION_FORBIDDEN).
 *
 *   A caller-attached `{ selectedBy:'user', authoritative:true }` flag without supporting evidence
 *   is REFERENCE_AUTHORITY_FORGED. A persisted reference whose candidate lap is no longer present
 *   (deleted / out-of-session / out-of-case) is REFERENCE_STALE_OR_DELETED.
 *
 * The service NEVER selects a lap on its own; it ONLY validates an EXPLICIT user choice.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ReferenceSelection).
 */
(function (root) {
  'use strict';

  var Contracts = null, LapAuthority = null, TrackIdentity = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    try { LapAuthority = require('./r3-0c-lap-authority.js'); } catch (e) { LapAuthority = null; }
    try { TrackIdentity = require('./r3-0c-track-identity.js'); } catch (e) { TrackIdentity = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!LapAuthority && typeof R3_0C_LapAuthority !== 'undefined') LapAuthority = R3_0C_LapAuthority;
  if (!TrackIdentity && typeof R3_0C_TrackIdentity !== 'undefined') TrackIdentity = R3_0C_TrackIdentity;
  if (!Contracts) throw new Error('renderer/js/r3-0c-reference-selection.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var RAC = Contracts.referenceAndCorner;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C4_REFERENCE_AND_CORNER';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _blocked(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    return Object.freeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      selection: null,
      result: null,
    });
  }

  /**
   * selectReference(request) — entry point. Verifies the explicit user selection against the
   * candidate lap evidence and produces an authoritative reference descriptor. Returns either:
   *   { eligible:true, selection:{...frozen}, trackIdentity:{...frozen}, evidence:{...frozen},
   *     reasonCodes:[], result:null }
   *   or _blocked([codes]).
   *
   * request shape (consumed by the contract shape gate first):
   *   {
   *     identity: { caseId, sessionId },
   *     trackIdentity: { trackId, layoutId, source:'explicit' },
   *     selection: { selectedBy:'user', lapId, sourceId, selectedAt },
   *     candidateLap: <lapEvidence the C2 lap-authority service consumes> | null
   *   }
   *
   * If candidateLap === null the service emits REFERENCE_STALE_OR_DELETED — the stored selection
   * pointed at a lap that no longer exists in the current case/session view.
   */
  function selectReference(request) {
    var shape = RAC.evaluateReferenceSelectionRequestShape(request);
    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

    // Candidate-lap presence — caller passes null when the persisted selection points at a
    // lap that has been deleted or otherwise removed from the current session view.
    var lapEv = request.candidateLap;
    if (lapEv === null || lapEv === undefined) {
      return _blocked([CODES.REFERENCE_STALE_OR_DELETED], 'candidate lap not present');
    }
    if (!_isPlain(lapEv)) return _blocked([CODES.REFERENCE_LAP_UNAVAILABLE], 'candidate lap evidence not an object');

    // Identity equality between selection and candidate lap evidence.
    if (lapEv.caseId !== request.identity.caseId) return _blocked([CODES.CROSS_CASE_COMPARISON_UNSUPPORTED], 'candidate lap caseId mismatch');
    if (lapEv.sessionId !== request.identity.sessionId) return _blocked([CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], 'candidate lap sessionId mismatch');
    if (lapEv.lapId !== request.selection.lapId) return _blocked([CODES.REFERENCE_STALE_OR_DELETED], 'selection lapId does not match candidate');

    // Track identity equality — must be the same trackId + layoutId AND lapEv must declare its
    // own explicit identity (per C2 track-identity service). When TrackIdentity is unavailable
    // (fixture environment), fall back to a structural-equality check.
    var requestTrackOk;
    if (TrackIdentity) {
      var eq = TrackIdentity.equalsTrackIdentity(request.trackIdentity, lapEv.trackIdentity);
      requestTrackOk = eq.equal === true;
      if (!requestTrackOk) {
        var matchedReasons = Array.isArray(eq.reasonCodes) ? eq.reasonCodes.slice() : [CODES.MISSING_TRACK_IDENTITY];
        return _blocked(matchedReasons, 'reference track identity mismatch');
      }
    } else {
      if (!_isPlain(lapEv.trackIdentity)
        || lapEv.trackIdentity.trackId !== request.trackIdentity.trackId
        || lapEv.trackIdentity.layoutId !== request.trackIdentity.layoutId
        || lapEv.trackIdentity.source !== 'explicit') {
        return _blocked([CODES.TRACK_IDENTITY_MISMATCH], 'lap-vs-request track identity mismatch');
      }
    }

    // C2 lap-authority re-derivation — the lap must independently survive the C2 gate.
    if (LapAuthority) {
      var lapResult = LapAuthority.deriveLapAuthority(lapEv);
      if (!lapResult.eligible) {
        // Surface REFERENCE_LAP_UNAVAILABLE on top of the C2 codes so the comparison eligibility
        // layer downstream can route this to the right user-facing reason without losing the C2 evidence.
        return _blocked([CODES.REFERENCE_LAP_UNAVAILABLE].concat(lapResult.reasonCodes), 'candidate lap rejected by lap-authority');
      }
    }

    var selectionOut = Object.freeze({
      selectedBy: 'user',
      lapId: request.selection.lapId,
      sourceId: request.selection.sourceId,
      selectedAt: request.selection.selectedAt,
      caseId: request.identity.caseId,
      sessionId: request.identity.sessionId,
    });
    var trackOut = Object.freeze({
      trackId: request.trackIdentity.trackId,
      layoutId: request.trackIdentity.layoutId,
      source: 'explicit',
    });

    return Object.freeze({
      eligible: true,
      status: 'reference_selection_authoritative',
      selection: selectionOut,
      trackIdentity: trackOut,
      evidence: Object.freeze({
        candidateLapProvenance: lapEv.provenance || null,
        schemaVersion: 1,
        limitations: Object.freeze(['reference_authority_is_user_explicit_only']),
      }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    selectReference: selectReference,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ReferenceSelection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
