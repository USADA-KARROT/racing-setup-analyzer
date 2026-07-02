/**
 * renderer/js/r3-0c-corner-segmentation.js — R3.0C C4 · Corner Segmentation Service.
 *
 * Proposes corner segments over a single lap's normalized-distance axis using a closed
 * cornering-signal threshold. The output is a PROPOSAL set, not an official corner list:
 *
 *   • Each segment is a data-driven span on the normalized axis [start, end) where the lateral-
 *     dynamic envelope (|lateral_accel| or |yaw_rate|) exceeds a threshold for at least
 *     MIN_SEGMENT_NORMALIZED_LENGTH of the lap. Sub-threshold spans, segments shorter than the
 *     minimum, and segments straddling a wrap boundary are filtered out fail-closed.
 *   • Authority tier is decided by which channels are present:
 *        FULL  = steering + yaw_rate + lateral_accel + speed → confidence 'full_authority'
 *        REDUCED = lateral_accel only (or lateral_accel + one of the other tier-1 channels) →
 *                  confidence 'reduced_authority' + limitation 'corner_segmentation_reduced'
 *   • The service NEVER claims an apex / corner number / official identity. Each segment carries
 *     a deterministic identity fingerprint (segmentation algorithm version + normalized start +
 *     normalized end rounded to a stable precision) so two runs on identical input produce the
 *     same identity set. A separate user-confirmation step (out of scope here) may LIFT proposal
 *     authority for naming but MAY NOT raise telemetry credibility — that's the
 *     CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY invariant.
 *
 * UMD: Node require / Electron renderer global (R3_0C_CornerSegmentation).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-corner-segmentation.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var RAC = Contracts.referenceAndCorner;

  var SERVICE_VERSION = 1;
  var ALGORITHM_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C4_REFERENCE_AND_CORNER';
  // Cornering threshold (m/s² lateral). 0.5g ≈ 4.9 m/s²; we use a conservative 4.0 m/s² so
  // sustained-load corners are reliably detected and low-grip / wet conditions still surface.
  var LATERAL_ACCEL_THRESHOLD_MPS2 = 4.0;
  var YAW_RATE_THRESHOLD_RAD_PER_S = 0.20;
  // Identity fingerprint precision: round to 1e-4 (≈ 0.01% of lap) so floating-point noise does
  // not perturb the fingerprint across re-runs.
  var FINGERPRINT_PRECISION = 1e-4;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _round(x, prec) { return Math.round(x / prec) * prec; }
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
      segments: null,
      result: null,
    });
  }

  function _decideAuthorityTier(channels) {
    var hasSteering = Array.isArray(channels.steering);
    var hasYaw = Array.isArray(channels.yaw_rate);
    var hasLatAccel = Array.isArray(channels.lateral_accel);
    var hasSpeed = Array.isArray(channels.speed);
    if (hasSteering && hasYaw && hasLatAccel && hasSpeed) return 'full_authority';
    if (hasLatAccel) return 'reduced_authority';
    return null;
  }

  function _detectCorneringMask(positions, channels) {
    var n = positions.length;
    var mask = new Array(n);
    var hasLat = Array.isArray(channels.lateral_accel);
    var hasYaw = Array.isArray(channels.yaw_rate);
    for (var i = 0; i < n; i++) {
      var lat = hasLat ? channels.lateral_accel[i] : 0;
      var yaw = hasYaw ? channels.yaw_rate[i] : 0;
      var corneringLat = _isFiniteNum(lat) && Math.abs(lat) >= LATERAL_ACCEL_THRESHOLD_MPS2;
      var corneringYaw = _isFiniteNum(yaw) && Math.abs(yaw) >= YAW_RATE_THRESHOLD_RAD_PER_S;
      mask[i] = corneringLat || corneringYaw;
    }
    return mask;
  }

  function _runsToSegments(positions, mask) {
    var segments = [];
    var n = positions.length;
    var i = 0;
    while (i < n) {
      if (!mask[i]) { i++; continue; }
      var start = i;
      while (i < n && mask[i]) i++;
      var end = i - 1;
      segments.push({ startIndex: start, endIndex: end, startNorm: positions[start], endNorm: positions[end] });
    }
    return segments;
  }

  function _segmentLength(seg) {
    return seg.endNorm >= seg.startNorm
      ? (seg.endNorm - seg.startNorm)
      : (1 - seg.startNorm + seg.endNorm);
  }

  function _hasOverlap(a, b) {
    return !(a.endNorm <= b.startNorm || b.endNorm <= a.startNorm);
  }

  function _fingerprint(seg) {
    return 'seg:' + _round(seg.startNorm, FINGERPRINT_PRECISION).toFixed(4) + '-' + _round(seg.endNorm, FINGERPRINT_PRECISION).toFixed(4);
  }

  /**
   * segmentCorners(request) — entry point. Returns
   *   { eligible:true, segments:[{id, fingerprint, startNorm, endNorm, length, midNorm,
   *      zones:{entry,mid,exit}, channelsUsed, confidence, limitations}],
   *     identity, trackIdentity, algorithmVersion, evidence, reasonCodes:[] }
   *   or _blocked([codes]).
   */
  function segmentCorners(request) {
    var shape = RAC.evaluateCornerSegmentationRequestShape(request);
    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

    var positions = request.normalizedDistanceAxis.positions;
    var channels = request.channels;
    var tier = _decideAuthorityTier(channels);
    if (tier === null) return _blocked([CODES.CORNER_SEGMENTATION_NO_USABLE_CHANNELS], 'no usable cornering channel');

    // Detect cornering-mask + runs.
    var mask = _detectCorneringMask(positions, channels);
    var raw = _runsToSegments(positions, mask);

    // Drop too-short segments.
    var minLen = RAC.MIN_SEGMENT_NORMALIZED_LENGTH;
    var droppedShort = 0;
    var kept = [];
    for (var s = 0; s < raw.length; s++) {
      if (_segmentLength(raw[s]) < minLen) { droppedShort += 1; continue; }
      kept.push(raw[s]);
    }
    // After filtering, if nothing remains we report fail-closed only when there were no
    // candidate runs at all; an all-straight lap legitimately produces zero segments and that
    // IS a valid (eligible) outcome — corner segmentation is allowed to return [].

    // Overlap detection (post-filter). Mutual exclusion is structurally true after _runsToSegments
    // for INDEX ranges, but the NORMALIZED-position ranges can drift if the request's positions
    // array is non-monotonic (e.g. a wrap-misshapen or hand-crafted axis) so that two non-adjacent
    // index runs map to overlapping normalized intervals. The formal Codex round-2 F10 finding
    // showed a shaped request where seg[0] and seg[2] overlapped in normalized space while seg[1]
    // sat between them. The previous adjacent-only loop missed it. Use an all-pairs scan
    // (kept.length ≤ MAX_CORNERS ≤ 64 so O(n^2) is bounded and cheap) and fail-closed on any
    // overlap detected.
    for (var oi = 0; oi < kept.length; oi++) {
      for (var oj = oi + 1; oj < kept.length; oj++) {
        if (_hasOverlap(kept[oi], kept[oj])) {
          return _blocked([CODES.CORNER_SEGMENTATION_OVERLAPPING_SEGMENTS], 'segment ' + oj + ' overlaps segment ' + oi);
        }
      }
    }

    // Wrap-boundary detection: a segment whose normalized range is non-increasing (start > end)
    // crosses the start/finish line. The contract refuses to silently merge such a segment.
    var droppedWrap = 0;
    var clean = [];
    for (var w = 0; w < kept.length; w++) {
      if (kept[w].endNorm < kept[w].startNorm) { droppedWrap += 1; continue; }
      clean.push(kept[w]);
    }
    if (droppedWrap > 0) {
      return _blocked([CODES.CORNER_SEGMENTATION_WRAP_BOUNDARY], droppedWrap + ' wrap-spanning segments');
    }

    var limitations = [];
    if (tier === 'reduced_authority') limitations.push(CODES.CORNER_SEGMENTATION_REDUCED_AUTHORITY);

    var segments = clean.map(function (seg) {
      var midNorm = (seg.startNorm + seg.endNorm) / 2;
      // Even thirds: entry / mid / exit
      var third = (seg.endNorm - seg.startNorm) / 3;
      var entry = { startNorm: seg.startNorm, endNorm: seg.startNorm + third };
      var mid = { startNorm: seg.startNorm + third, endNorm: seg.startNorm + 2 * third };
      var exit = { startNorm: seg.startNorm + 2 * third, endNorm: seg.endNorm };
      var fp = _fingerprint(seg);
      return Object.freeze({
        id: fp,
        fingerprint: fp,
        startNorm: seg.startNorm,
        endNorm: seg.endNorm,
        midNorm: midNorm,
        length: seg.endNorm - seg.startNorm,
        zones: Object.freeze({ entry: Object.freeze(entry), mid: Object.freeze(mid), exit: Object.freeze(exit) }),
        startIndex: seg.startIndex,
        endIndex: seg.endIndex,
        channelsUsed: Object.freeze(Object.keys(channels).filter(function (k) { return Array.isArray(channels[k]); })),
        confidence: tier,
        limitations: Object.freeze(limitations.slice()),
      });
    });

    return Object.freeze({
      eligible: true,
      status: tier === 'full_authority' ? 'corner_segmentation_full_authority' : 'corner_segmentation_reduced_authority',
      segments: Object.freeze(segments),
      identity: Object.freeze({
        caseId: request.identity.caseId,
        sessionId: request.identity.sessionId,
        lapId: request.identity.lapId,
        sourceId: request.identity.sourceId,
      }),
      trackIdentity: Object.freeze({
        trackId: request.trackIdentity.trackId,
        layoutId: request.trackIdentity.layoutId,
        source: 'explicit',
      }),
      algorithmVersion: ALGORITHM_VERSION,
      evidence: Object.freeze({
        authorityTier: tier,
        thresholdLateralAccelMps2: LATERAL_ACCEL_THRESHOLD_MPS2,
        thresholdYawRateRadPerS: YAW_RATE_THRESHOLD_RAD_PER_S,
        droppedShortSegments: droppedShort,
        rawCandidateCount: raw.length,
        limitations: Object.freeze(limitations.slice()),
      }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  /**
   * applyUserConfirmation(segmentationResult, confirmations) — lifts proposal authority for
   * NAMING / identity confidence only. Returns the same shape with confirmation metadata on
   * each segment. Never raises telemetry credibility, never produces measured magnitudes.
   *
   * confirmations is an array of { segmentId, userLabel, confirmedBy:'user', confirmedAt }.
   * A confirmation that asserts `liftTelemetryCredibility:true` is REFUSED with
   * CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY.
   */
  function applyUserConfirmation(segmentationResult, confirmations) {
    if (!_isPlain(segmentationResult) || segmentationResult.eligible !== true || !Array.isArray(segmentationResult.segments)) {
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'segmentationResult not an eligible segmentation output');
    }
    if (!Array.isArray(confirmations)) {
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'confirmations not an array');
    }
    for (var i = 0; i < confirmations.length; i++) {
      var c = confirmations[i];
      if (!_isPlain(c)) return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'confirmation[' + i + '] not an object');
      if (c.confirmedBy !== 'user') return _blocked([CODES.CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY], 'confirmation must carry confirmedBy=user');
      if (c.liftTelemetryCredibility === true) return _blocked([CODES.CORNER_CONFIRMATION_CANNOT_UPGRADE_TELEMETRY], 'confirmation cannot lift telemetry credibility');
    }
    var byId = {};
    for (var k = 0; k < confirmations.length; k++) byId[confirmations[k].segmentId] = confirmations[k];
    var newSegments = segmentationResult.segments.map(function (seg) {
      var c = byId[seg.id];
      if (!c) return seg;
      return Object.freeze(Object.assign({}, seg, {
        userLabel: typeof c.userLabel === 'string' ? c.userLabel : null,
        proposalAuthority: 'user_confirmed_naming_only',
        // confidence (TELEMETRY credibility) intentionally NOT lifted.
        // limitations preserved verbatim.
      }));
    });
    return Object.freeze(Object.assign({}, segmentationResult, {
      segments: Object.freeze(newSegments),
      status: 'corner_segmentation_with_user_confirmation',
    }));
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    ALGORITHM_VERSION: ALGORITHM_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    LATERAL_ACCEL_THRESHOLD_MPS2: LATERAL_ACCEL_THRESHOLD_MPS2,
    YAW_RATE_THRESHOLD_RAD_PER_S: YAW_RATE_THRESHOLD_RAD_PER_S,
    segmentCorners: segmentCorners,
    applyUserConfirmation: applyUserConfirmation,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_CornerSegmentation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
