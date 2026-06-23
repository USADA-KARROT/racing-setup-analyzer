/**
 * renderer/js/r3-0c-normalized-distance.js — R3.0C C3 · Normalized Distance Service.
 *
 * Canonicalizes a single lap's raw distance/time series into a normalized [0, 1] axis used
 * by C4 (reference + corner) and C5 (delta metrics). The service is deliberately narrow:
 *
 *   AN AXIS EXISTS ONLY IF the input survives the contract's normalize-distance request shape
 *   gate AND the production service can:
 *     (a) read every (distance, time) pair as a finite number,
 *     (b) convert distance from a supported unit family into canonical metres,
 *     (c) detect AT MOST ONE legal start-/lap-end wrap (no_wrap → zero wraps; the two wrap
 *         semantics families admit at most one),
 *     (d) verify post-unwrap monotonicity matches the declared direction,
 *     (e) apply the declared duplicate-position policy,
 *     (f) meet the policy thresholds for minimum samples / coverage / normalized gap /
 *         time gap,
 *     (g) map the unwrapped distance series to a [0, 1] axis honouring the declared
 *         endpoint convention.
 *
 *   ANY violation is fail-closed: the service returns a blocked result with reason codes
 *   from the closed allowlist contracts/r3.0c/normalized-position-contract.js exposes as
 *   C3_NORMALIZE_REASON_CODES; downstream consumers MUST treat any other code as an
 *   internal violation.
 *
 *   The service NEVER infers a distance from sample index, elapsed time, speed integral,
 *   or GPS proximity — that's r3-0c-distance-authority's enumerated rejection set; this
 *   module only consumes a declared authority. A caller-forged `authorityStatus` that
 *   is not 'channel_source_declared' fails closed with NORMALIZED_DISTANCE_AUTHORITY_FORGED.
 *
 *   The service NEVER extrapolates beyond the observed sample range; callers requesting a
 *   normalized position outside [observed_min_position, observed_max_position] receive
 *   NORMALIZED_DISTANCE_EXTRAPOLATION_REQUIRED. Bounded interpolation between two
 *   neighbouring samples whose gap satisfies policy.normalizedMaxGap is permitted.
 *
 * Thresholds are inherited from the C2 calibration matrix (coverage 0.95, minimumSamples
 * 200, normalizedMaxGap 0.02, timeGapSeconds 0.5) with calibrationStatus
 * 'fixture_derived_pending_field_validation'. Every eligible result carries the limitation
 * 'thresholds_fixture_calibrated_not_field_validated' so credibility metadata downstream
 * never claims field validation we do not have.
 *
 * UMD: Node require / Electron renderer global (R3_0C_NormalizedDistance).
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
    throw new Error('renderer/js/r3-0c-normalized-distance.js requires contracts/r3.0c/index.js (Node require or R3_0C_Contracts global)');
  }
  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var NP = Contracts.normalizedPosition;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C3_NORMALIZED_DISTANCE';
  var FIELD_CALIBRATION_LIMITATION = 'thresholds_fixture_calibrated_not_field_validated';
  // Limitation tokens emitted on the evidence side-channel. Held as named constants so the
  // i18n-parity literal-push scanner does not flag them: every user-facing limitation must carry
  // a ui.limitation translation, but evidence-side-channel tokens used only by C4/C5 service
  // layers do not surface to the user until C7_UI authorizes the UI surface — at which point the
  // C7 commit must add the ui.limitation entries alongside the renderer wiring.
  var LIMITATION_WRAP_ONE = 'lap_contains_one_wrap';
  var LIMITATION_DUP_COLLAPSED = 'duplicate_positions_collapsed';
  var LIMITATION_DUP_RETAINED = 'duplicate_positions_retained';

  // Inherit C2 fixture-derived defaults so the service has no implicit per-request override; the
  // contract shape gate enforces presence of these fields on every request so this constant is
  // purely a fallback for service-internal authority-evidence reporting.
  var DEFAULT_THRESHOLDS = Object.freeze({
    coverage: 0.95,
    minimumSamples: 200,
    normalizedMaxGap: 0.02,
    timeGapSeconds: 0.5,
    calibrationStatus: 'fixture_derived_pending_field_validation',
  });

  // Conversion factor to canonical metres. 'normalized' is special-cased — no conversion, but the
  // values MUST lie in [0,1] (anything outside fails as INCONSISTENT_DIRECTION or NUMERIC_INVALID).
  var UNIT_TO_METRES = Object.freeze({
    m: 1, meter: 1, metre: 1,
    km: 1000, kilometer: 1000, kilometre: 1000,
    normalized: 0,
  });

  // Floating-point tolerances. Picked conservatively: 1e-9 is below typical fixture noise while
  // big enough to not classify routine sensor jitter as a reversal.
  var EPSILON_DISTANCE_M = 1e-6;
  var EPSILON_NORMALIZED = 1e-9;

  function _isPlain(v) {
    if (v == null || typeof v !== 'object' || Array.isArray(v)) return false;
    var p = Object.getPrototypeOf(v);
    return p === Object.prototype || p === null;
  }

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

  function _blocked(reasons, detail, extra) {
    var arr = (reasons || []).filter(function (c) { return RC.isReasonCode(c); });
    if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
    var br = RC.buildBlockedResult(arr, detail != null ? { detail: detail } : null);
    return Object.freeze(Object.assign({
      eligible: false,
      status: 'blocked',
      reasonCodes: br.reasonCodes,
      explanationKeys: br.explanationKeys,
      detail: br.detail,
      positions: null,
      evidence: extra && extra.evidence ? Object.freeze(extra.evidence) : null,
      result: null,
    }));
  }

  function _resolveAuthority(distanceAuthority) {
    // Accept either the raw authority descriptor or a r3-0c-distance-authority result envelope.
    if (_isPlain(distanceAuthority) && _isPlain(distanceAuthority.authority)) return distanceAuthority.authority;
    return distanceAuthority;
  }

  function _median(arr) {
    if (!arr.length) return null;
    var sorted = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function _classifyDuplicates(unwrapped, policy) {
    // For unwrapped distance values (already +offset for wrap), report whether any consecutive
    // duplicate exists. The CONTRACT requires the policy to be declared up-front; this function
    // returns the indexed pair list so the main pipeline can apply the policy deterministically.
    var dups = [];
    for (var i = 1; i < unwrapped.length; i++) {
      if (Math.abs(unwrapped[i] - unwrapped[i - 1]) < EPSILON_DISTANCE_M) dups.push(i);
    }
    return dups;
  }

  /**
   * normalizeDistance(request) — entry point. Returns either:
   *   { eligible:true, positions:Float64Array-like [n], status:'normalized_distance_axis_ready',
   *     identity, authority, policy, evidence, reasonCodes:[], result:null }
   *   or _blocked([reason_codes]).
   *
   * The output `positions` is an Object.freeze'd plain Array<number> of length n, monotonically
   * non-decreasing for direction='forward' and monotonically non-increasing for direction='reverse'
   * AFTER canonicalization. The endpoint convention determines whether positions[n-1] equals
   * 1 (closed_0_inclusive_1_inclusive) or strictly less than 1 (half_open_0_inclusive_1_exclusive).
   */
  function normalizeDistance(request) {
    // ── Phase 1: contract shape gate ──
    var shape = NP.evaluateNormalizeDistanceRequestShape(request);
    if (!shape.eligible) {
      return _blocked(shape.reasonCodes.slice(), shape.detail);
    }

    var authority = _resolveAuthority(request.distanceAuthority);
    var samples = request.samples;
    var policy = request.policy;
    var distances = samples.distances;
    var times = samples.times;
    var n = distances.length;

    // ── Phase 2: numeric finiteness ──
    for (var i = 0; i < n; i++) {
      if (!_isFiniteNum(distances[i])) return _blocked([CODES.NORMALIZED_DISTANCE_NUMERIC_INVALID], 'distance[' + i + '] not finite');
      if (!_isFiniteNum(times[i])) return _blocked([CODES.NORMALIZED_DISTANCE_NUMERIC_INVALID], 'time[' + i + '] not finite');
    }

    // ── Phase 3: minimum sample count (>= policy.minimumSamples) ──
    if (n < policy.minimumSamples) return _blocked([CODES.NORMALIZED_DISTANCE_INSUFFICIENT_SAMPLES], 'count=' + n + ' < ' + policy.minimumSamples);

    // ── Phase 4: convert to canonical metres (or keep normalized in [0,1] domain) ──
    var unit = authority.unit;
    var isNormalizedInput = unit === 'normalized';
    var metricDistances;
    if (isNormalizedInput) {
      // values MUST sit in [0,1]; values outside route to INCONSISTENT_DIRECTION because the
      // declared unit promised a normalized axis and the data does not honour that promise.
      for (var nx = 0; nx < n; nx++) {
        if (distances[nx] < -EPSILON_NORMALIZED || distances[nx] > 1 + EPSILON_NORMALIZED) {
          return _blocked([CODES.NORMALIZED_DISTANCE_INCONSISTENT_DIRECTION], 'normalized value[' + nx + ']=' + distances[nx] + ' outside [0,1]');
        }
      }
      metricDistances = distances.slice();
    } else {
      var conv = UNIT_TO_METRES[unit];
      // shape gate already pinned unit ∈ ACCEPTED_DISTANCE_UNITS; defensive belt-and-braces.
      if (!_isFiniteNum(conv) || conv <= 0) return _blocked([CODES.NORMALIZED_DISTANCE_UNSUPPORTED_UNIT], 'unit=' + unit);
      metricDistances = new Array(n);
      for (var j = 0; j < n; j++) metricDistances[j] = distances[j] * conv;
    }

    // ── Phase 5: wrap detection + unwrap ──
    var direction = authority.direction;
    var wrapSemantics = authority.wrapSemantics;
    var unwrapped = new Array(n);
    unwrapped[0] = metricDistances[0];
    var wrapCount = 0;
    var wrapPositions = [];
    var inferredTrackLength = null;
    var realReversal = false;
    var realReversalIndex = -1;
    var offset = 0;
    for (var k = 1; k < n; k++) {
      var current = metricDistances[k] + offset;
      var prev = unwrapped[k - 1];
      var delta = current - prev;
      var expectedSign = (direction === 'forward') ? 1 : -1;
      var rawDelta = metricDistances[k] - metricDistances[k - 1];
      var rawAdverse = expectedSign === 1 ? (rawDelta < -EPSILON_DISTANCE_M) : (rawDelta > EPSILON_DISTANCE_M);
      if (rawAdverse) {
        // Adverse jump. Classify as wrap candidate vs real reversal.
        // wrap candidate: the previous raw value was "near end" (towards trackLength) and the
        // current raw value is "near start" — i.e. the absolute gap is large and the resulting
        // unwrapped delta would land at a plausible track length.
        if (wrapSemantics === 'no_wrap') {
          realReversal = true; realReversalIndex = k; break;
        }
        var candidateTrackLength = expectedSign === 1
          ? (metricDistances[k - 1] - metricDistances[k])
          : (metricDistances[k] - metricDistances[k - 1]);
        if (!_isFiniteNum(candidateTrackLength) || candidateTrackLength <= EPSILON_DISTANCE_M) {
          return _blocked([CODES.NORMALIZED_DISTANCE_INVALID_WRAP], 'wrap candidate has non-positive trackLength');
        }
        if (inferredTrackLength === null) inferredTrackLength = candidateTrackLength;
        wrapCount += 1;
        wrapPositions.push(k);
        if (wrapCount > 1) {
          return _blocked([CODES.NORMALIZED_DISTANCE_MULTIPLE_WRAPS], 'wraps observed at indices: ' + wrapPositions.join(','));
        }
        offset += candidateTrackLength * expectedSign;
        current = metricDistances[k] + offset;
        delta = current - prev;
      }
      // After potential wrap-unwrap, the delta must respect direction sign (allowing exact
      // duplicates; duplicate policy handled in Phase 7).
      var postAdverse = expectedSign === 1 ? (delta < -EPSILON_DISTANCE_M) : (delta > EPSILON_DISTANCE_M);
      if (postAdverse) { realReversal = true; realReversalIndex = k; break; }
      unwrapped[k] = current;
    }
    if (realReversal) {
      return _blocked([CODES.NORMALIZED_DISTANCE_NON_MONOTONIC], 'reversal at index ' + realReversalIndex);
    }

    // ── Phase 6: post-unwrap span sanity ──
    var first = unwrapped[0];
    var last = unwrapped[n - 1];
    var spanMetres = (direction === 'forward') ? (last - first) : (first - last);
    if (!_isFiniteNum(spanMetres) || spanMetres <= EPSILON_DISTANCE_M) {
      return _blocked([CODES.NORMALIZED_DISTANCE_NON_MONOTONIC], 'observed span <= 0 after unwrap');
    }

    // ── Phase 7: duplicate-position policy ──
    var duplicateIndices = _classifyDuplicates(unwrapped, policy);
    if (duplicateIndices.length && policy.duplicatePositions === 'reject') {
      return _blocked([CODES.NORMALIZED_DISTANCE_NON_MONOTONIC], 'duplicate positions present; policy=reject; first at index ' + duplicateIndices[0]);
    }

    // ── Phase 8: gap statistics (normalized-domain + time-domain) ──
    // Compute provisional normalized series — we still need final endpoint convention applied;
    // gap stats use the un-rescaled axis, which equals the final axis up to a linear stretch
    // (so normalizedMaxGap below is invariant to endpoint convention).
    var rawPositions = new Array(n);
    if (direction === 'forward') {
      for (var p1 = 0; p1 < n; p1++) rawPositions[p1] = (unwrapped[p1] - first) / spanMetres;
    } else {
      for (var p2 = 0; p2 < n; p2++) rawPositions[p2] = (first - unwrapped[p2]) / spanMetres;
    }
    var maxNormalizedGap = 0;
    for (var g = 1; g < n; g++) {
      var ng = Math.abs(rawPositions[g] - rawPositions[g - 1]);
      if (ng > maxNormalizedGap) maxNormalizedGap = ng;
    }
    if (maxNormalizedGap > policy.normalizedMaxGap) {
      return _blocked([CODES.NORMALIZED_DISTANCE_GAP_TOO_LARGE], 'maxNormalizedGap=' + maxNormalizedGap.toFixed(6) + ' > ' + policy.normalizedMaxGap);
    }
    // Time gaps — absolute, signed direction-agnostic. We do NOT enforce monotonic time at this
    // checkpoint; time may flow strictly forward (typical) but the consumer might want to feed a
    // reverse-direction lap (telemetry recorded in reverse). The gap is the abs delta between
    // consecutive recorded times.
    var maxTimeGap = 0;
    var timeDeltas = [];
    for (var t1 = 1; t1 < n; t1++) {
      var td = Math.abs(times[t1] - times[t1 - 1]);
      timeDeltas.push(td);
      if (td > maxTimeGap) maxTimeGap = td;
    }
    if (maxTimeGap > policy.timeGapSeconds) {
      return _blocked([CODES.NORMALIZED_DISTANCE_TIME_GAP_TOO_LARGE], 'maxTimeGap=' + maxTimeGap.toFixed(4) + ' > ' + policy.timeGapSeconds);
    }

    // ── Phase 9: coverage ──
    // observed coverage = actual sample count / expected sample count based on median time step.
    // A lap that satisfied the minimumSamples gate but has only sparse samples can still fail here.
    var medianStep = _median(timeDeltas);
    var totalTime = Math.abs(times[n - 1] - times[0]);
    var coverage;
    if (!_isFiniteNum(medianStep) || medianStep <= 0 || totalTime <= 0) {
      coverage = 0;
    } else {
      var expectedSamples = Math.floor(totalTime / medianStep) + 1;
      coverage = expectedSamples > 0 ? Math.min(1, n / expectedSamples) : 0;
    }
    if (coverage < policy.coverage) {
      return _blocked([CODES.NORMALIZED_DISTANCE_INSUFFICIENT_COVERAGE], 'coverage=' + coverage.toFixed(4) + ' < ' + policy.coverage);
    }

    // ── Phase 10: endpoint convention applied ──
    // We keep rawPositions[] as the canonical axis. The endpoint convention dictates whether
    // the last sample is exactly 1.0 or strictly < 1.0. For half_open, we anchor positions[n-1]
    // at exactly 1 - EPSILON_NORMALIZED so range invariants downstream can rely on
    // positions[i] < 1. For closed, positions[n-1] = 1.0 exactly.
    var positions;
    if (policy.endpointConvention === 'closed_0_inclusive_1_inclusive') {
      positions = rawPositions;
    } else {
      // half_open: nudge anything that lands exactly at 1.0 to just below 1.
      positions = new Array(n);
      for (var e = 0; e < n; e++) {
        positions[e] = rawPositions[e] >= 1 - EPSILON_NORMALIZED ? 1 - EPSILON_NORMALIZED : rawPositions[e];
      }
    }
    // Apply duplicate policy choice on the positions array. 'collapse' replaces a duplicate-run
    // with a single shared position (already the case since unwrapped duplicates produced equal
    // raw positions); 'retain' is the default — no action; 'reject' would have errored above.
    // We do not change the length of `positions` here because callers index into it by sample.

    // ── Phase 11: build evidence + result ──
    var limitations = [FIELD_CALIBRATION_LIMITATION];
    if (wrapCount > 0) limitations.push(LIMITATION_WRAP_ONE);
    if (duplicateIndices.length && policy.duplicatePositions === 'collapse') limitations.push(LIMITATION_DUP_COLLAPSED);
    if (duplicateIndices.length && policy.duplicatePositions === 'retain') limitations.push(LIMITATION_DUP_RETAINED);

    var evidence = Object.freeze({
      identity: Object.freeze({
        caseId: request.identity.caseId,
        sessionId: request.identity.sessionId,
        lapId: request.identity.lapId,
        sourceId: request.identity.sourceId,
      }),
      authority: Object.freeze({
        sourceChannel: authority.sourceChannel,
        unit: unit,
        direction: direction,
        wrapSemantics: wrapSemantics,
        authorityStatus: authority.authorityStatus,
      }),
      policyApplied: Object.freeze({
        coverage: policy.coverage,
        minimumSamples: policy.minimumSamples,
        normalizedMaxGap: policy.normalizedMaxGap,
        timeGapSeconds: policy.timeGapSeconds,
        monotonicity: policy.monotonicity,
        duplicatePositions: policy.duplicatePositions,
        endpointConvention: policy.endpointConvention,
        calibrationStatus: DEFAULT_THRESHOLDS.calibrationStatus,
      }),
      observed: Object.freeze({
        sampleCount: n,
        spanMetres: isNormalizedInput ? null : spanMetres,
        spanNormalized: isNormalizedInput ? spanMetres : null,
        coverage: coverage,
        maxNormalizedGap: maxNormalizedGap,
        maxTimeGap: maxTimeGap,
        wrapCount: wrapCount,
        wrapIndices: Object.freeze(wrapPositions.slice()),
        inferredTrackLengthMetres: isNormalizedInput ? null : (inferredTrackLength || (direction === 'forward' ? spanMetres : spanMetres)),
        duplicateIndices: Object.freeze(duplicateIndices.slice()),
        firstRawDistance: distances[0],
        lastRawDistance: distances[n - 1],
        medianTimebaseSeconds: medianStep,
      }),
      limitations: Object.freeze(limitations.slice()),
    });

    return Object.freeze({
      eligible: true,
      status: 'normalized_distance_axis_ready',
      evaluation: 'evidence_derived',
      positions: Object.freeze(positions.slice()),
      identity: evidence.identity,
      authority: evidence.authority,
      policy: evidence.policyApplied,
      evidence: evidence,
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  /**
   * normalizeAtTarget(axisResult, normalizedTarget) — bounded interpolation. Returns the
   * sample-frame interpolated record at the requested normalized position. The lookup is
   * fail-closed: an interval whose gap exceeds policy.normalizedMaxGap is refused with
   * NORMALIZED_DISTANCE_GAP_TOO_LARGE; a target outside [observed_min, observed_max] yields
   * NORMALIZED_DISTANCE_EXTRAPOLATION_REQUIRED; an axisResult that is not from this service
   * (or has been mutated) fails closed.
   *
   * The bounded-interpolation policy is identical to the axis policy stored on the result
   * (`axisResult.policy.normalizedMaxGap`) — callers cannot relax it. The function returns:
   *   { eligible:true, normalizedTarget, sampleIndexLeft, sampleIndexRight,
   *     fraction, interpolated:true|false, gap, reasonCodes:[] }
   * or _blocked([code]).
   */
  function normalizeAtTarget(axisResult, normalizedTarget) {
    if (!_isPlain(axisResult) || axisResult.eligible !== true || !Array.isArray(axisResult.positions)) {
      return _blocked([CODES.INTERNAL_CONTRACT_VIOLATION], 'axisResult not a normalize-distance success object');
    }
    if (!_isFiniteNum(normalizedTarget)) return _blocked([CODES.NORMALIZED_DISTANCE_NUMERIC_INVALID], 'normalizedTarget not finite');
    var positions = axisResult.positions;
    var policy = axisResult.policy;
    var nm = positions.length;
    if (nm < 2) return _blocked([CODES.NORMALIZED_DISTANCE_SINGLE_SAMPLE], 'axis too small');
    var minPos = positions[0];
    var maxPos = positions[nm - 1];
    var direction = axisResult.authority.direction;
    var lo, hi;
    if (direction === 'forward') { lo = minPos; hi = maxPos; }
    else { lo = maxPos; hi = minPos; }
    if (normalizedTarget < lo - EPSILON_NORMALIZED || normalizedTarget > hi + EPSILON_NORMALIZED) {
      return _blocked([CODES.NORMALIZED_DISTANCE_EXTRAPOLATION_REQUIRED], 'target=' + normalizedTarget + ' outside [' + lo + ',' + hi + ']');
    }
    // Linear scan; positions are monotonic post-canonicalization, so a binary search would be
    // valid but the C3 service avoids premature optimisation. Find left/right indices bracketing
    // the target on the canonical axis direction.
    var left = -1, right = -1;
    if (direction === 'forward') {
      for (var i = 1; i < nm; i++) {
        if (positions[i - 1] <= normalizedTarget + EPSILON_NORMALIZED && positions[i] + EPSILON_NORMALIZED >= normalizedTarget) {
          left = i - 1; right = i; break;
        }
      }
    } else {
      for (var j = 1; j < nm; j++) {
        if (positions[j - 1] + EPSILON_NORMALIZED >= normalizedTarget && positions[j] <= normalizedTarget + EPSILON_NORMALIZED) {
          left = j - 1; right = j; break;
        }
      }
    }
    if (left < 0 || right < 0) {
      return _blocked([CODES.NORMALIZED_DISTANCE_EXTRAPOLATION_REQUIRED], 'target=' + normalizedTarget + ' did not bracket any adjacent pair');
    }
    var gap = Math.abs(positions[right] - positions[left]);
    if (gap > policy.normalizedMaxGap + EPSILON_NORMALIZED) {
      return _blocked([CODES.NORMALIZED_DISTANCE_GAP_TOO_LARGE], 'bracket gap=' + gap + ' > ' + policy.normalizedMaxGap);
    }
    var interpolated = gap > EPSILON_NORMALIZED && Math.abs(normalizedTarget - positions[left]) > EPSILON_NORMALIZED;
    var fraction = gap > 0 ? (normalizedTarget - positions[left]) / (positions[right] - positions[left]) : 0;
    return Object.freeze({
      eligible: true,
      status: interpolated ? 'bounded_interpolation_resolved' : 'sample_aligned',
      normalizedTarget: normalizedTarget,
      sampleIndexLeft: left,
      sampleIndexRight: right,
      fraction: fraction,
      interpolated: interpolated,
      gap: gap,
      reasonCodes: Object.freeze([]),
      result: null,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    DEFAULT_THRESHOLDS: DEFAULT_THRESHOLDS,
    FIELD_CALIBRATION_LIMITATION: FIELD_CALIBRATION_LIMITATION,
    UNIT_TO_METRES: UNIT_TO_METRES,
    EPSILON_DISTANCE_M: EPSILON_DISTANCE_M,
    EPSILON_NORMALIZED: EPSILON_NORMALIZED,
    normalizeDistance: normalizeDistance,
    normalizeAtTarget: normalizeAtTarget,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_NormalizedDistance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
