/**
 * contracts/r3.0c/reference-and-corner-contract.js — R3.0C C4 · Reference & Corner contract surface.
 *
 * Defines the structural input contracts the C4 production services consume:
 *   • reference-lap selection — must be EXPLICIT (selectedBy === 'user'); any non-user selection
 *     mode (fastestValid / medianValid / bestSectorComposite / implicitPrevious / autoFirstLap)
 *     is fail-closed (REFERENCE_AUTO_SELECTION_FORBIDDEN);
 *   • corner segmentation — input shape gate over a single normalized-distance axis result + the
 *     channels the segmentation algorithm may consume;
 *   • cross-lap corner pairing — pair two corner segmentation results within the same case +
 *     session + track identity and refuse ordinal-based pairing.
 *
 * This contract layer is the FIRST refusal layer; the production services are the SECOND. Both
 * sides must agree on the reason-code allowlist exposed here as R4C_REFERENCE_REASON_CODES /
 * R4C_SEGMENTATION_REASON_CODES / R4C_PAIRING_REASON_CODES (and R4C_REASON_CODES, the union).
 * The contract NEVER computes anything: no telemetry traversal, no segment detection, no pairing
 * heuristic, no credibility derivation.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ReferenceAndCornerContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('reference-and-corner-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // ── Reference-selection contract ──
  // Only 'user' is accepted. Adding more values widens the trusted-selection universe and requires
  // a documented governance decision; the scope pin in train.schema.json
  // (referenceSelectionPolicy.explicitUserSelectionOnly === true) blocks any drift here.
  var ACCEPTED_REFERENCE_SELECTION_MODES = Object.freeze(['user']);
  // Selection modes that MUST NOT appear — the schema pin records them as `false`. A request
  // declaring any of these as the selection mode is refused with REFERENCE_AUTO_SELECTION_FORBIDDEN.
  var FORBIDDEN_REFERENCE_SELECTION_MODES = Object.freeze([
    'fastestValid', 'medianValid', 'bestSectorComposite', 'implicitPrevious', 'autoFirstLap',
    'lastSelectedAcrossDifferentSession', 'auto',
  ]);

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  function _bld(reasons, detail) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    return RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
  }

  /**
   * evaluateReferenceSelectionRequestShape(request) — structural fail-closed gate for the
   * reference-selection production service input. Verifies:
   *   • identity quadruple binds the request to caseId / sessionId
   *   • selection.selectedBy === 'user' (no fastestValid / median / composite / implicit)
   *   • the candidate lap descriptor names a concrete lapId + sourceId + selectedAt timestamp
   *   • track-identity is present as an explicit { trackId, layoutId, source:'explicit' } block
   *
   * A caller-attached `{ selectedBy:'user', authoritative:true }` flag without selectedAt /
   * sourceId / lapId is treated as REFERENCE_AUTHORITY_FORGED — the contract refuses to honour
   * an authority that does not carry the supporting evidence fields. (`REFERENCE_NOT_SELECTED`
   * is emitted ONLY when selection is absent / null; forged claims are surfaced separately.)
   */
  function evaluateReferenceSelectionRequestShape(request) {
    if (!_isPlain(request)) return _bld([CODES.INTERNAL_CONTRACT_VIOLATION], 'request not an object');
    var reasons = [];
    var id = request.identity;
    if (!_isPlain(id) || !_nonEmptyStr(id.caseId) || !_nonEmptyStr(id.sessionId)) reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    var ti = request.trackIdentity;
    if (!_isPlain(ti) || !_nonEmptyStr(ti.trackId) || !_nonEmptyStr(ti.layoutId) || ti.source !== 'explicit') reasons.push(CODES.MISSING_TRACK_IDENTITY);
    var sel = request.selection;
    if (sel === null || sel === undefined) {
      reasons.push(CODES.REFERENCE_NOT_SELECTED);
    } else if (!_isPlain(sel)) {
      reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    } else {
      if (FORBIDDEN_REFERENCE_SELECTION_MODES.indexOf(sel.selectedBy) !== -1) {
        reasons.push(CODES.REFERENCE_AUTO_SELECTION_FORBIDDEN);
      } else if (ACCEPTED_REFERENCE_SELECTION_MODES.indexOf(sel.selectedBy) === -1) {
        reasons.push(CODES.REFERENCE_NOT_SELECTED);
      } else {
        // selectedBy === 'user' but supporting evidence missing → forged claim.
        var evidenceOk = _nonEmptyStr(sel.lapId) && _nonEmptyStr(sel.sourceId) && _nonEmptyStr(sel.selectedAt);
        if (!evidenceOk) reasons.push(CODES.REFERENCE_AUTHORITY_FORGED);
      }
    }
    if (reasons.length) return _bld(reasons);
    return Object.freeze({
      eligible: true,
      status: 'reference_selection_request_shape_valid',
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  // ── Corner-segmentation contract ──
  // Channel allowlist. Authority tiers below describe combinations the production service may use;
  // any input with FEWER than the lowest authority's channel set falls to NO_USABLE_CHANNELS.
  var CORNER_SEGMENTATION_CHANNELS = Object.freeze(['steering', 'yaw_rate', 'lateral_accel', 'speed', 'brake', 'throttle']);
  // Authority tiers — full = all six channels; reduced = the high-confidence subset {steering, yaw_rate, lateral_accel}.
  var FULL_AUTHORITY_REQUIRED_CHANNELS = Object.freeze(['steering', 'yaw_rate', 'lateral_accel', 'speed']);
  var REDUCED_AUTHORITY_REQUIRED_CHANNELS = Object.freeze(['lateral_accel']);
  // Minimum lap-fraction a corner segment may occupy. A segment shorter than this is fail-closed
  // (SEGMENT_TOO_SHORT) — the threshold is exposed so tests can pin a deterministic boundary.
  var MIN_SEGMENT_NORMALIZED_LENGTH = 0.005; // 0.5% of lap

  function evaluateCornerSegmentationRequestShape(request) {
    if (!_isPlain(request)) return _bld([CODES.INTERNAL_CONTRACT_VIOLATION], 'request not an object');
    var reasons = [];
    var id = request.identity;
    if (!_isPlain(id) || !_nonEmptyStr(id.caseId) || !_nonEmptyStr(id.sessionId) || !_nonEmptyStr(id.lapId) || !_nonEmptyStr(id.sourceId)) {
      reasons.push(CODES.INTERNAL_CONTRACT_VIOLATION);
    }
    var ti = request.trackIdentity;
    if (!_isPlain(ti) || !_nonEmptyStr(ti.trackId) || !_nonEmptyStr(ti.layoutId) || ti.source !== 'explicit') reasons.push(CODES.MISSING_TRACK_IDENTITY);
    var axis = request.normalizedDistanceAxis;
    if (!_isPlain(axis) || axis.eligible !== true || !Array.isArray(axis.positions) || axis.positions.length < 2) {
      reasons.push(CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY);
    }
    var channels = request.channels;
    if (!_isPlain(channels)) {
      reasons.push(CODES.CORNER_SEGMENTATION_NO_USABLE_CHANNELS);
    } else {
      // The contract requires AT LEAST the reduced-authority channel(s) to be present. The
      // production service decides full vs reduced authority based on which channels are present.
      var present = Object.keys(channels).filter(function (c) { return CORNER_SEGMENTATION_CHANNELS.indexOf(c) !== -1 && Array.isArray(channels[c]); });
      var reducedOk = REDUCED_AUTHORITY_REQUIRED_CHANNELS.every(function (c) { return present.indexOf(c) !== -1; });
      if (present.length === 0) reasons.push(CODES.CORNER_SEGMENTATION_NO_USABLE_CHANNELS);
      else if (!reducedOk) reasons.push(CODES.CORNER_SEGMENTATION_INSUFFICIENT_CHANNELS);
    }
    var algoVersion = request.algorithmVersion;
    if (algoVersion !== 1) reasons.push(CODES.CORNER_SEGMENTATION_ALGORITHM_VERSION_MISMATCH);
    if (reasons.length) return _bld(reasons);
    return Object.freeze({
      eligible: true,
      status: 'corner_segmentation_request_shape_valid',
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  // ── Cross-lap corner-pairing contract ──
  // Minimum normalized overlap a paired corner needs (independently per side). A pair below this
  // is fail-closed (INSUFFICIENT_OVERLAP) — the threshold is exposed so tests pin the boundary.
  var MIN_PAIR_NORMALIZED_OVERLAP = 0.5;
  function evaluateCornerPairingRequestShape(request) {
    if (!_isPlain(request)) return _bld([CODES.INTERNAL_CONTRACT_VIOLATION], 'request not an object');
    var reasons = [];
    var ref = request.referenceSegmentation;
    var cmp = request.comparisonSegmentation;
    if (!_isPlain(ref) || ref.eligible !== true || !Array.isArray(ref.segments)) reasons.push(CODES.CORNER_PAIRING_INSUFFICIENT_OVERLAP);
    if (!_isPlain(cmp) || cmp.eligible !== true || !Array.isArray(cmp.segments)) reasons.push(CODES.CORNER_PAIRING_INSUFFICIENT_OVERLAP);
    if (_isPlain(ref) && _isPlain(cmp) && _isPlain(ref.identity) && _isPlain(cmp.identity)) {
      if (!_nonEmptyStr(ref.identity.caseId) || ref.identity.caseId !== cmp.identity.caseId) reasons.push(CODES.CROSS_CASE_COMPARISON_UNSUPPORTED);
      if (!_nonEmptyStr(ref.identity.sessionId) || ref.identity.sessionId !== cmp.identity.sessionId) reasons.push(CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED);
    }
    if (_isPlain(ref) && _isPlain(cmp) && _isPlain(ref.trackIdentity) && _isPlain(cmp.trackIdentity)) {
      if (ref.trackIdentity.trackId !== cmp.trackIdentity.trackId || ref.trackIdentity.layoutId !== cmp.trackIdentity.layoutId) {
        reasons.push(CODES.TRACK_IDENTITY_MISMATCH);
      }
    }
    var policy = request.policy;
    if (!_isPlain(policy) || policy.allowOrdinalPairing === true) reasons.push(CODES.CORNER_PAIRING_ORDINAL_FORBIDDEN);
    if (reasons.length) return _bld(reasons);
    return Object.freeze({
      eligible: true,
      status: 'corner_pairing_request_shape_valid',
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  // ── Closed reason-code allowlists per service ──
  var R4C_REFERENCE_REASON_CODES = Object.freeze([
    CODES.REFERENCE_NOT_SELECTED,
    CODES.REFERENCE_AUTO_SELECTION_FORBIDDEN,
    CODES.REFERENCE_STALE_OR_DELETED,
    CODES.REFERENCE_AUTHORITY_FORGED,
    CODES.REFERENCE_LAP_UNAVAILABLE,
    CODES.MISSING_TRACK_IDENTITY,
    CODES.TRACK_IDENTITY_MISMATCH,
    CODES.CROSS_CASE_COMPARISON_UNSUPPORTED,
    CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED,
    CODES.INTERNAL_CONTRACT_VIOLATION,
  ]);
  var R4C_SEGMENTATION_REASON_CODES = Object.freeze([
    CODES.CORNER_SEGMENTATION_INSUFFICIENT_CHANNELS,
    CODES.CORNER_SEGMENTATION_REDUCED_AUTHORITY,
    CODES.CORNER_SEGMENTATION_NO_USABLE_CHANNELS,
    CODES.CORNER_SEGMENTATION_SEGMENT_TOO_SHORT,
    CODES.CORNER_SEGMENTATION_OVERLAPPING_SEGMENTS,
    CODES.CORNER_SEGMENTATION_WRAP_BOUNDARY,
    CODES.CORNER_SEGMENTATION_ALGORITHM_VERSION_MISMATCH,
    CODES.CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY,
    CODES.MISSING_NORMALIZED_DISTANCE_AUTHORITY,
    CODES.MISSING_TRACK_IDENTITY,
    CODES.INTERNAL_CONTRACT_VIOLATION,
  ]);
  var R4C_PAIRING_REASON_CODES = Object.freeze([
    CODES.CORNER_PAIRING_INSUFFICIENT_OVERLAP,
    CODES.CORNER_PAIRING_AMBIGUOUS,
    CODES.CORNER_PAIRING_ORDINAL_FORBIDDEN,
    CODES.CORNER_PAIRING_PARTIAL_COVERAGE,
    CODES.CORNER_PAIRING_UNAVAILABLE,
    CODES.TRACK_IDENTITY_MISMATCH,
    CODES.CROSS_CASE_COMPARISON_UNSUPPORTED,
    CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED,
    CODES.INTERNAL_CONTRACT_VIOLATION,
  ]);
  var R4C_REASON_CODES = Object.freeze(
    [].concat(R4C_REFERENCE_REASON_CODES, R4C_SEGMENTATION_REASON_CODES, R4C_PAIRING_REASON_CODES)
  );

  var api = {
    ACCEPTED_REFERENCE_SELECTION_MODES: ACCEPTED_REFERENCE_SELECTION_MODES,
    FORBIDDEN_REFERENCE_SELECTION_MODES: FORBIDDEN_REFERENCE_SELECTION_MODES,
    CORNER_SEGMENTATION_CHANNELS: CORNER_SEGMENTATION_CHANNELS,
    FULL_AUTHORITY_REQUIRED_CHANNELS: FULL_AUTHORITY_REQUIRED_CHANNELS,
    REDUCED_AUTHORITY_REQUIRED_CHANNELS: REDUCED_AUTHORITY_REQUIRED_CHANNELS,
    MIN_SEGMENT_NORMALIZED_LENGTH: MIN_SEGMENT_NORMALIZED_LENGTH,
    MIN_PAIR_NORMALIZED_OVERLAP: MIN_PAIR_NORMALIZED_OVERLAP,
    R4C_REFERENCE_REASON_CODES: R4C_REFERENCE_REASON_CODES,
    R4C_SEGMENTATION_REASON_CODES: R4C_SEGMENTATION_REASON_CODES,
    R4C_PAIRING_REASON_CODES: R4C_PAIRING_REASON_CODES,
    R4C_REASON_CODES: R4C_REASON_CODES,
    evaluateReferenceSelectionRequestShape: evaluateReferenceSelectionRequestShape,
    evaluateCornerSegmentationRequestShape: evaluateCornerSegmentationRequestShape,
    evaluateCornerPairingRequestShape: evaluateCornerPairingRequestShape,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ReferenceAndCornerContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
