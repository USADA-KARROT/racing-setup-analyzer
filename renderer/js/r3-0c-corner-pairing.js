/**
 * renderer/js/r3-0c-corner-pairing.js — R3.0C C4 · Cross-Lap Corner Pairing Service.
 *
 * Pairs corner segments between a reference lap segmentation and a comparison lap segmentation.
 * The pairing rule is intentionally narrow:
 *
 *   TWO CORNERS PAIR ONLY IF they overlap on the canonical normalized axis by at least
 *   MIN_PAIR_NORMALIZED_OVERLAP (default 0.5 = 50% of the shorter segment). Ordinal pairing
 *   ("the 3rd corner of lap A is the 3rd corner of lap B") is FAIL-CLOSED
 *   (CORNER_PAIRING_ORDINAL_FORBIDDEN). One-to-many candidacy is FAIL-CLOSED
 *   (CORNER_PAIRING_AMBIGUOUS) when more than one comparison corner would qualify; the service
 *   may NOT pick a "best" tie. Partial coverage of the reference set surfaces as
 *   CORNER_PAIRING_PARTIAL_COVERAGE but does NOT block — it is recorded so downstream
 *   credibility can downgrade aggregate metrics.
 *
 *   Identity equality (same case + session + track) is independently re-checked here; the
 *   contract layer already gates the input shape but the service is the second refusal layer.
 *
 * UMD: Node require / Electron renderer global (R3_0C_CornerPairing).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-corner-pairing.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var RAC = Contracts.referenceAndCorner;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C4_REFERENCE_AND_CORNER';
  // Minimum fraction of REFERENCE segments that must pair before aggregate metrics are considered
  // representative. Below this, CORNER_PAIRING_PARTIAL_COVERAGE is added to the limitations.
  var MIN_AGGREGATE_COVERAGE = 0.8;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
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
      pairs: null,
      result: null,
    });
  }

  function _segLen(s) { return Math.max(0, s.endNorm - s.startNorm); }
  function _overlap(a, b) {
    var start = Math.max(a.startNorm, b.startNorm);
    var end = Math.min(a.endNorm, b.endNorm);
    return Math.max(0, end - start);
  }
  function _overlapFraction(a, b) {
    var ov = _overlap(a, b);
    var minLen = Math.min(_segLen(a), _segLen(b));
    return minLen > 0 ? ov / minLen : 0;
  }

  /**
   * pairCorners(request) — entry point. Returns
   *   { eligible:true, pairs:[{referenceId, comparisonId, overlap, overlapFraction}],
   *     unpairedReference:[ids], unpairedComparison:[ids], coverage,
   *     identity, trackIdentity, evidence, reasonCodes:[], result:null }
   *   or _blocked([codes]).
   *
   * Algorithm:
   *   1. For each reference segment, build the candidate set = comparison segments whose
   *      overlap fraction >= MIN_PAIR_NORMALIZED_OVERLAP.
   *   2. If a reference segment has >1 candidate → AMBIGUOUS. If a comparison segment ends up
   *      a candidate for >1 reference → AMBIGUOUS. (Mutual one-to-one only.)
   *   3. Pair the surviving 1-1 matches. Reference / comparison segments without a partner are
   *      recorded in `unpairedReference` / `unpairedComparison`.
   *   4. coverage = pairs.length / max(refSegments.length, 1). If < MIN_AGGREGATE_COVERAGE,
   *      add 'corner_pairing_partial_coverage' to limitations (still eligible).
   */
  function pairCorners(request) {
    var shape = RAC.evaluateCornerPairingRequestShape(request);
    if (!shape.eligible) return _blocked(shape.reasonCodes.slice(), shape.detail);

    var ref = request.referenceSegmentation;
    var cmp = request.comparisonSegmentation;
    // Independent identity re-check (defence in depth).
    if (!_isPlain(ref.identity) || !_isPlain(cmp.identity)
      || ref.identity.caseId !== cmp.identity.caseId
      || ref.identity.sessionId !== cmp.identity.sessionId) {
      return _blocked([CODES.CROSS_SESSION_COMPARISON_UNSUPPORTED], 'service-layer identity recheck failed');
    }

    var minFrac = RAC.MIN_PAIR_NORMALIZED_OVERLAP;
    var refSegs = ref.segments.slice();
    var cmpSegs = cmp.segments.slice();
    // Build per-ref candidate list
    var perRef = refSegs.map(function (r) {
      return cmpSegs.map(function (c, idx) { return { idx: idx, frac: _overlapFraction(r, c), overlap: _overlap(r, c), comparison: c }; })
        .filter(function (cand) { return cand.frac >= minFrac; });
    });
    // Ambiguity per-reference
    for (var i = 0; i < perRef.length; i++) {
      if (perRef[i].length > 1) {
        return _blocked([CODES.CORNER_PAIRING_AMBIGUOUS], 'reference segment ' + refSegs[i].id + ' has ' + perRef[i].length + ' candidate comparison segments');
      }
    }
    // Ambiguity per-comparison: a comparison index can be the (only) candidate of only one ref.
    var cmpUsage = {};
    for (var p = 0; p < perRef.length; p++) {
      if (perRef[p].length === 1) {
        var ci = perRef[p][0].idx;
        cmpUsage[ci] = (cmpUsage[ci] || 0) + 1;
      }
    }
    var ambiguousCmp = Object.keys(cmpUsage).filter(function (k) { return cmpUsage[k] > 1; });
    if (ambiguousCmp.length) {
      return _blocked([CODES.CORNER_PAIRING_AMBIGUOUS], 'comparison segment(s) ' + ambiguousCmp.join(',') + ' selected by >1 reference');
    }

    var pairs = [];
    var unpairedReference = [];
    var pairedCmpIdx = {};
    for (var rr = 0; rr < perRef.length; rr++) {
      if (perRef[rr].length === 1) {
        var cand = perRef[rr][0];
        pairs.push(Object.freeze({
          referenceId: refSegs[rr].id,
          comparisonId: cand.comparison.id,
          overlap: cand.overlap,
          overlapFraction: cand.frac,
        }));
        pairedCmpIdx[cand.idx] = true;
      } else {
        unpairedReference.push(refSegs[rr].id);
      }
    }
    var unpairedComparison = [];
    for (var cc = 0; cc < cmpSegs.length; cc++) if (!pairedCmpIdx[cc]) unpairedComparison.push(cmpSegs[cc].id);

    var coverage = refSegs.length > 0 ? pairs.length / refSegs.length : 1;
    var limitations = [];
    if (coverage < MIN_AGGREGATE_COVERAGE) limitations.push(CODES.CORNER_PAIRING_PARTIAL_COVERAGE);

    return Object.freeze({
      eligible: true,
      status: 'corner_pairing_complete',
      pairs: Object.freeze(pairs),
      unpairedReference: Object.freeze(unpairedReference.slice()),
      unpairedComparison: Object.freeze(unpairedComparison.slice()),
      coverage: coverage,
      identity: Object.freeze({
        caseId: ref.identity.caseId,
        sessionId: ref.identity.sessionId,
      }),
      trackIdentity: _isPlain(ref.trackIdentity) ? Object.freeze({
        trackId: ref.trackIdentity.trackId,
        layoutId: ref.trackIdentity.layoutId,
        source: ref.trackIdentity.source || 'explicit',
      }) : null,
      evidence: Object.freeze({
        algorithmVersion: 1,
        minOverlapFraction: minFrac,
        minAggregateCoverage: MIN_AGGREGATE_COVERAGE,
        referenceSegmentCount: refSegs.length,
        comparisonSegmentCount: cmpSegs.length,
        pairCount: pairs.length,
        coverage: coverage,
        limitations: Object.freeze(limitations.slice()),
      }),
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    MIN_AGGREGATE_COVERAGE: MIN_AGGREGATE_COVERAGE,
    pairCorners: pairCorners,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_CornerPairing = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
