/**
 * telemetry-yaw.js — V2: Observed Yaw-Response (PURE, descriptive, fail-closed, source-agnostic).
 *
 * It answers ONE question: "in this CSV, under these (transparent) steady-state filters, what does
 * the observed steering→yaw relationship look like, and how stable is it?" — nothing else.
 *
 * RED LINES (must not break):
 *  • Descriptive only. NO K_us fit, NO model-vs-actual overlay, NO correctness/over-estimate verdict.
 *  • RAW steering only. We do NOT convert steering-wheel angle to road-wheel angle and do NOT divide
 *    by any steering ratio. The metric is literally yaw_rate ÷ raw_steering, with the raw unit kept.
 *    Forbidden names (must never appear): road-wheel gain / normalized vehicle yaw response /
 *    steering sensitivity corrected / understeer response. (Those imply a calibration we don't have.)
 *  • Source-agnostic. Steady-state thresholds come from the data's OWN robust percentiles, never from
 *    a hardcoded vehicle number (no 12.5 / wheelbase / etc. anywhere in this file).
 *  • Dispersion is reported as median / IQR / MAD / count, split by RAW steering sign (positive /
 *    negative / combined; near-centre steering excluded, never folded by |abs|). CV is offered ONLY when the mean is not
 *    near zero, the sign is consistent, and the sample is large enough — otherwise null + a reason.
 *  • Transparent. Every result carries total / valid / steady-state counts, per-filter exclusion
 *    counts, and the ACTUAL threshold values used.
 *
 * Deliberately NOT here (all deferred to V2.1, behind a user-confirmed ratio + provenance):
 *  road-wheel conversion · sensitivity envelope · app model overlay.
 *
 * Input contract (caller / view layer resolves canonical conversion via the same pipeline as the
 * curve viewer): yawRate in rad/s (canonical, sign already sanity-checked upstream), speed in m/s
 * (canonical), lateralAccel in m/s² (canonical), steer in its RAW unit (NOT converted), time in s.
 *
 * UMD: Node require / Electron renderer global (TelemetryYaw). No deps, no DOM.
 */
(function (root) {
  'use strict';

  // Minimum steady-state points below which we refuse to characterise anything (fail-closed).
  var MIN_STEADY_POINTS = 10;
  // Default consecutive-run length (a steady "segment" must be at least this many samples).
  var DEFAULT_MIN_SEGMENT = 3;
  // Default speed-bin count when the caller doesn't pick one.
  var DEFAULT_SPEED_BINS = 6;
  // Default minimum samples in a bin before a CV is even considered.
  var DEFAULT_CV_MIN_SAMPLES = 8;
  // Near-centre steering guard. The "near centre" band is MIN_ABS_STEER_FRAC of a data-adaptive
  // steering SCALE; below it, steering is excluded from BOTH direction stats and the yaw/steer ratio
  // (so a near-zero denominator can't blow the ratio up). The scale is the upper-end percentile below,
  // NOT a median — a near-centre-heavy/bimodal mix would drag a median toward 0 and disable the guard.
  var MIN_ABS_STEER_FRAC = 0.02;
  // Fallback steering scale when no clear two-cluster split is found (single-peak data): a high
  // percentile of NON-ZERO |steer| (upper end → robust to a near-centre majority; percentile not max
  // → robust to a lone outlier). When a clear near-centre / real-cornering split IS found, the split
  // boundary is used instead (see _findNearCentreSplit).
  var MIN_ABS_STEER_SCALE_PCTL = 0.95;
  // A log-gap between the two |steer| clusters must exceed Q3 + this×IQR of all gaps to count as a
  // genuine cluster boundary (distribution-shape heuristic, NOT a vehicle/unit constant).
  var GAP_STANDOUT_IQR_K = 3;
  // A steering-direction side (positive/negative) needs at least this many points to be 'available'.
  var MIN_DIRECTION_POINTS = 5;

  // strictness → (lateral-activity percentile to clear, stability percentile to keep).
  // lateralActivityPercentile: keep |ay| ABOVE this percentile (0.45 ⇒ drop the lowest-activity 45%).
  // stabilityPercentile: keep |d/dt| BELOW this percentile (0.35 ⇒ keep the steadiest 35%).
  var STRICTNESS = {
    loose:  { lateralActivityPercentile: 0.35, stabilityPercentile: 0.50 },
    normal: { lateralActivityPercentile: 0.45, stabilityPercentile: 0.35 },
    strict: { lateralActivityPercentile: 0.55, stabilityPercentile: 0.22 },
  };

  // Names this module must never emit for a metric (asserted by the invariant tests).
  var FORBIDDEN_METRIC_NAMES = ['road_wheel_gain', 'normalized_vehicle_yaw_response',
    'steering_sensitivity_corrected', 'understeer_response', 'k_us', 'kus'];

  // ── robust stats (all tolerate nulls/NaN by filtering first) ──
  function _clean(a) { var out = []; for (var i = 0; i < a.length; i++) { var v = a[i]; if (v != null && typeof v === 'number' && isFinite(v)) out.push(v); } return out; }
  function _sortedClean(a) { var c = _clean(a); c.sort(function (x, y) { return x - y; }); return c; }
  function _median(a) { var s = Array.isArray(a) && a._sorted ? a : _sortedClean(a); if (!s.length) return null; var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function _medianSorted(s) { if (!s.length) return null; var m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  // linear-interpolation percentile on a sorted-clean array; p in [0,1].
  function _percentile(sorted, p) {
    var n = sorted.length; if (!n) return null; if (n === 1) return sorted[0];
    var idx = Math.min(1, Math.max(0, p)) * (n - 1);
    var lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  function _iqr(sorted) { if (sorted.length < 2) return null; return _percentile(sorted, 0.75) - _percentile(sorted, 0.25); }
  function _mad(arr) { var s = _sortedClean(arr); if (!s.length) return null; var med = _medianSorted(s); var dev = []; for (var i = 0; i < s.length; i++) dev.push(Math.abs(s[i] - med)); dev.sort(function (x, y) { return x - y; }); return _medianSorted(dev); }
  function _mean(arr) { var c = _clean(arr); if (!c.length) return null; var s = 0; for (var i = 0; i < c.length; i++) s += c[i]; return s / c.length; }
  function _std(arr) { var c = _clean(arr); if (c.length < 2) return null; var m = _mean(c), s = 0; for (var i = 0; i < c.length; i++) s += (c[i] - m) * (c[i] - m); return Math.sqrt(s / (c.length - 1)); }

  /**
   * Coefficient of variation, but fail-closed: returns { value, reason }.
   * reason ∈ null | 'too_few' | 'mean_near_zero' | 'sign_inconsistent'. value is null when reason set.
   * mean-near-zero guard is relative to the spread (std) so a signed quantity straddling 0 is rejected.
   */
  function _safeCv(arr, minSamples) {
    var c = _clean(arr);
    if (c.length < (minSamples || DEFAULT_CV_MIN_SAMPLES)) return { value: null, reason: 'too_few' };
    var mn = Math.min.apply(null, c), mx = Math.max.apply(null, c);
    if (!(mn > 0) && !(mx < 0)) return { value: null, reason: 'sign_inconsistent' }; // straddles or touches 0
    var m = _mean(c), sd = _std(c);
    if (sd == null) return { value: null, reason: 'too_few' };
    if (Math.abs(m) <= sd) return { value: null, reason: 'mean_near_zero' };
    return { value: sd / Math.abs(m), reason: null };
  }

  // ── direction-aware ratio aggregation (raw steering sign; never absolute value) ──
  // yawPerSteerStats over a list of finite ratios: median / IQR / MAD / fail-closed CV / count.
  function _ratioStats(ratios, cvMinSamples) {
    var s = ratios.slice().sort(function (a, b) { return a - b; });
    return { median: _medianSorted(s), iqr: _iqr(s), mad: _mad(ratios), cv: _safeCv(ratios, cvMinSamples), n: ratios.length };
  }
  // one steering-direction block: SIGNED medians (NOT abs — opposite-lock corners keep their own sign,
  // so the two sides can't cancel into a misleading ~0) + ratio stats + count + availability.
  function _dirBlock(pts, cvMinSamples) {
    var yaws = [], steers = [], ratios = [];
    for (var i = 0; i < pts.length; i++) {
      yaws.push(pts[i].yawRate); steers.push(pts[i].steer);
      if (pts[i].ratio != null && isFinite(pts[i].ratio)) ratios.push(pts[i].ratio);
    }
    return {
      count: pts.length, available: pts.length >= MIN_DIRECTION_POINTS,
      medianYawRate: _median(yaws), medianSteer: _median(steers),
      yawPerSteerStats: _ratioStats(ratios, cvMinSamples),
    };
  }

  // Find a near-centre / real-cornering split in NON-ZERO |steer|, or null if the data is single-peak.
  // Looks for a log-scale gap that (1) stands out from the overall gap distribution, (2) is wider than
  // either cluster's own internal spread, and (3) has an UPPER cluster that forms a sustained run in
  // time order — so a lone huge outlier (one bad sample) is NOT mistaken for "the real steering".
  // Returns the geometric-midpoint boundary of the best such split. Pure, source-agnostic.
  function _findNearCentreSplit(sortedNzAbsSteer, absSteerInSteadyOrder, minRun) {
    var m = sortedNzAbsSteer.length;
    if (m < 4) return null; // too few to identify two clusters
    var logs = new Array(m);
    for (var i = 0; i < m; i++) logs[i] = Math.log(sortedNzAbsSteer[i]);
    var gaps = [];
    for (var g = 0; g < m - 1; g++) gaps.push(logs[g + 1] - logs[g]);
    var sg = gaps.slice().sort(function (a, b) { return a - b; });
    var gapQ3 = _percentile(sg, 0.75) || 0;
    var gapIqr = _iqr(sg) || 0;
    var standoutThresh = gapQ3 + GAP_STANDOUT_IQR_K * gapIqr;
    var best = null;
    for (var k = 0; k < m - 1; k++) {
      var gap = gaps[k];
      var lowerSpread = _iqr(logs.slice(0, k + 1)) || 0;
      var upperSpread = _iqr(logs.slice(k + 1)) || 0;
      var standout = (gapIqr > 0) ? (gap > standoutThresh) : (gap > gapQ3);
      if (!standout) continue;
      if (gap <= Math.max(lowerSpread, upperSpread)) continue; // a wide tail / gradient, not two clusters
      var boundary = Math.sqrt(sortedNzAbsSteer[k] * sortedNzAbsSteer[k + 1]); // geometric midpoint
      var run = 0, maxRun = 0;
      for (var j = 0; j < absSteerInSteadyOrder.length; j++) {
        if (absSteerInSteadyOrder[j] > boundary) { run++; if (run > maxRun) maxRun = run; } else run = 0;
      }
      if (maxRun < minRun) continue; // upper cluster is not a sustained steering segment (e.g. lone outlier)
      var score = gap - Math.max(standoutThresh, lowerSpread, upperSpread);
      if (!best || score > best.score) best = { boundary: boundary, score: score };
    }
    return best ? best.boundary : null;
  }

  // central-difference d(arr)/d(time); falls back to one-sided at gaps/ends; null where undecidable.
  function _derivative(arr, time) {
    var n = arr.length, d = new Array(n).fill(null);
    var fin = function (x) { return x != null && typeof x === 'number' && isFinite(x); };
    for (var i = 0; i < n; i++) {
      var a = arr[i - 1], b = arr[i + 1], ta = time[i - 1], tb = time[i + 1];
      if (fin(a) && fin(b) && fin(ta) && fin(tb) && (tb - ta) > 0) { d[i] = (b - a) / (tb - ta); continue; }
      var c = arr[i], tc = time[i];
      if (fin(c) && fin(tc)) {
        if (fin(b) && fin(tb) && (tb - tc) > 0) d[i] = (b - c) / (tb - tc);
        else if (fin(a) && fin(ta) && (tc - ta) > 0) d[i] = (c - a) / (tc - ta);
      }
    }
    return d;
  }

  function _notAvailable(reason, counts, thresholds) {
    return {
      available: false, reason: reason,
      thresholds: thresholds || null, sampleCounts: counts,
      scatter: [], speedBins: [], dispersion: null,
      units: null, notes: ['descriptive_only', 'raw_steering_only'],
    };
  }

  /**
   * computeObservedYawResponse(series, opts)
   *   series = { time:[s], yawRate:[rad/s], steer:[raw], speed:[m/s], lateralAccel:[m/s²], steerUnit?:string }
   *   opts   = { strictness?, lateralActivityPercentile?, stabilityPercentile?, lateralActivityFloor?,
   *              speedFloorPercentile?, minSegmentSamples?, speedBinCount?, steerEps?, minAbsSteer?, cvMinSamples? }
   * Returns the descriptive result documented at the top of this file.
   */
  function computeObservedYawResponse(series, opts) {
    series = series || {}; opts = opts || {};
    var strict = STRICTNESS[opts.strictness] || STRICTNESS.normal;
    var latPct = opts.lateralActivityPercentile != null ? opts.lateralActivityPercentile : strict.lateralActivityPercentile;
    var stabPct = opts.stabilityPercentile != null ? opts.stabilityPercentile : strict.stabilityPercentile;
    var latFloor = opts.lateralActivityFloor != null ? opts.lateralActivityFloor : 0; // canonical m/s²
    var speedFloorPct = opts.speedFloorPercentile != null ? opts.speedFloorPercentile : 0.05;
    var minRun = opts.minSegmentSamples != null ? opts.minSegmentSamples : DEFAULT_MIN_SEGMENT;
    var steerEps = opts.steerEps != null ? opts.steerEps : 0; // raw-steer guard for the ratio denominator
    var cvMinSamples = opts.cvMinSamples != null ? opts.cvMinSamples : DEFAULT_CV_MIN_SAMPLES;
    var binCount = Math.max(1, opts.speedBinCount != null ? opts.speedBinCount : DEFAULT_SPEED_BINS);

    var time = series.time || [], yaw = series.yawRate || [], steer = series.steer || [],
        speed = series.speed || [], ay = series.lateralAccel || [];
    var n = Math.min(time.length, yaw.length, steer.length, speed.length, ay.length);

    var counts = { total: n, valid: 0, steadyState: 0,
      excluded: { invalid: 0, lowSpeed: 0, lowActivity: 0, unsteadySteering: 0, unsteadySpeed: 0, shortSegment: 0 } };
    var units = { yawRate: 'rad/s', steer: series.steerUnit || '(raw)', speed: 'm/s',
      ratio: 'rad/s per ' + (series.steerUnit || 'raw-steer') };
    var notes = ['descriptive_only', 'raw_steering_only', 'data_adaptive_thresholds', 'direction_split_by_raw_steer_sign'];

    if (n < MIN_STEADY_POINTS) return _notAvailable('insufficient_samples', counts);

    var fin = function (x) { return x != null && typeof x === 'number' && isFinite(x); };
    var dSteer = _derivative(steer, time);
    var dSpeed = _derivative(speed, time);

    // ── pass 1: validity + speed-floor / lateral-activity pools (derived from ALL valid rows) ──
    // valid = all five channels finite AND both derivatives decidable. (Undecidable derivative at a
    // gap/end can't be judged for stability, so it's conservatively excluded as 'invalid'.)
    var valid = new Array(n).fill(false);
    var posSpeeds = [], ayPool = [];
    for (var i = 0; i < n; i++) {
      if (!(fin(time[i]) && fin(yaw[i]) && fin(steer[i]) && fin(speed[i]) && fin(ay[i]) && fin(dSteer[i]) && fin(dSpeed[i]))) {
        counts.excluded.invalid++; continue;
      }
      valid[i] = true; counts.valid++;
      if (speed[i] > 0) posSpeeds.push(speed[i]);
      ayPool.push(Math.abs(ay[i]));
    }
    if (counts.valid < MIN_STEADY_POINTS) return _notAvailable('insufficient_valid', counts);

    // lateral-activity + speed-floor thresholds from the data's OWN robust percentiles (no vehicle constants)
    var sAy = ayPool.slice().sort(function (a, b) { return a - b; });
    var sPos = posSpeeds.slice().sort(function (a, b) { return a - b; });
    var lateralActivity = Math.max(latFloor, _percentile(sAy, latPct) || 0);
    var speedFloor = Math.max(opts.speedFloor != null ? opts.speedFloor : 0, _percentile(sPos, speedFloorPct) || 0);

    // ── pass 2: speed-floor + lateral-activity gate. The stability percentile is then computed on the
    // SURVIVING (lateral-active) rows only — "keep the steadiest X% of the CORNERING samples" — so
    // straight-line / low-g rows (whose steering barely moves) can't drag the stability bar down. ──
    var active = [];
    for (var j = 0; j < n; j++) {
      if (!valid[j]) continue; // already counted as invalid
      if (!(speed[j] >= speedFloor) || speed[j] <= 0) { counts.excluded.lowSpeed++; continue; }
      if (Math.abs(ay[j]) < lateralActivity) { counts.excluded.lowActivity++; continue; }
      active.push(j);
    }

    var actDSteer = active.map(function (k) { return Math.abs(dSteer[k]); }).sort(function (a, b) { return a - b; });
    var actDSpeed = active.map(function (k) { return Math.abs(dSpeed[k]); }).sort(function (a, b) { return a - b; });
    var steeringRateMax = _percentile(actDSteer, stabPct);
    var speedRateMax = _percentile(actDSpeed, stabPct);
    // relative tolerance: a genuinely steady stretch has a (near-)constant rate, so the percentile
    // collapses onto one value ± float noise; without tolerance ~(1-stabPct) of those points get
    // chopped purely by rounding. Real transients dwarf this, so they're still excluded.
    var stol = function (m) { return (m != null ? Math.abs(m) : 0) * 1e-9 + 1e-12; };

    var thresholds = {
      source: 'data_adaptive',
      lateralActivity: lateralActivity, steeringRateMax: steeringRateMax, speedRateMax: speedRateMax,
      speedFloor: speedFloor, minSegmentSamples: minRun,
      lateralActivityPercentile: latPct, stabilityPercentile: stabPct,
    };

    // ── pass 3: stability gate on the lateral-active rows (steady steering AND steady speed) ──
    var pass = new Array(n).fill(false);
    for (var a1 = 0; a1 < active.length; a1++) {
      var jj = active[a1];
      if (steeringRateMax != null && Math.abs(dSteer[jj]) > steeringRateMax + stol(steeringRateMax)) { counts.excluded.unsteadySteering++; continue; }
      if (speedRateMax != null && Math.abs(dSpeed[jj]) > speedRateMax + stol(speedRateMax)) { counts.excluded.unsteadySpeed++; continue; }
      pass[jj] = true;
    }

    // ── pass 4: enforce minimum consecutive-run length (drop isolated/too-short steady segments) ──
    var steadyIdx = [];
    var runStart = -1;
    var flushRun = function (end) {
      if (runStart < 0) return;
      var len = end - runStart;
      if (len >= minRun) { for (var k = runStart; k < end; k++) steadyIdx.push(k); }
      else { counts.excluded.shortSegment += len; }
      runStart = -1;
    };
    for (var r = 0; r < n; r++) {
      if (pass[r]) { if (runStart < 0) runStart = r; }
      else flushRun(r);
    }
    flushRun(n);
    counts.steadyState = steadyIdx.length;

    if (counts.steadyState < MIN_STEADY_POINTS) return _notAvailable('insufficient_steady_state', counts, thresholds);

    // ── near-centre steering guard (data-adaptive, source-agnostic) ──
    // Two clusters can hide in |steer|: a near-centre group (≈0 — straight-line / sensor noise) and a
    // real-cornering group; the yaw/steer ratio must use ONLY the real-cornering group. A single
    // percentile/median fails when real corners are a tiny minority (the near-centre group dominates the
    // statistic and a near-zero denominator blows the ratio up). So: look for a clear log-gap separating
    // the two clusters and accept it ONLY when the upper cluster forms a sustained run in time order (so
    // one huge outlier sample can't pose as "the real steering"); the split boundary becomes minAbsSteer.
    // No gap / no sustained upper run → fall back to the upper-percentile fraction (single-peak data —
    // all-tiny or all-normal — is unchanged). No non-zero steering at all → fail closed (likewise if too
    // few samples clear the guard, checked once the scatter is built, below).
    var nzAbsSteer = [], absSteadySteer = [];
    for (var z = 0; z < steadyIdx.length; z++) { var asz = Math.abs(steer[steadyIdx[z]]); absSteadySteer.push(asz); if (asz > 0) nzAbsSteer.push(asz); }
    if (!nzAbsSteer.length) return _notAvailable('insufficient_steering', counts, thresholds);
    nzAbsSteer.sort(function (a, b) { return a - b; });
    var splitBoundary = _findNearCentreSplit(nzAbsSteer, absSteadySteer, minRun);
    var steerScale = _percentile(nzAbsSteer, MIN_ABS_STEER_SCALE_PCTL); // upper-end fallback scale
    var fallbackMinAbsSteer = Math.max(steerEps, (steerScale || 0) * MIN_ABS_STEER_FRAC);
    var minAbsSteer = opts.minAbsSteer != null ? opts.minAbsSteer
      : (splitBoundary != null ? Math.max(steerEps, splitBoundary) : fallbackMinAbsSteer);
    thresholds.minAbsSteer = minAbsSteer;
    thresholds.minAbsSteerSource = opts.minAbsSteer != null ? 'override' : (splitBoundary != null ? 'gap_split' : 'upper_percentile_frac');

    // ── build scatter (raw steer vs canonical yaw) + per-sample ratio + RAW-SIGN direction ──
    // direction is classified by the RAW steering sign (never |steer|): positive / negative / neutral.
    // We do NOT call these left/right — a source-agnostic viewer doesn't know the source's sign convention.
    // neutral (|steer| ≤ minAbsSteer) gets NO ratio (avoids a near-zero-denominator blow-up) and is kept
    // out of both direction aggregates, but still counted (conservation: n = positive + negative + neutral).
    var scatter = [];
    var sMin = Infinity, sMax = -Infinity;
    for (var a2 = 0; a2 < steadyIdx.length; a2++) {
      var ix = steadyIdx[a2];
      var sp = speed[ix], st = steer[ix];
      if (sp < sMin) sMin = sp; if (sp > sMax) sMax = sp;
      var dir = st > minAbsSteer ? 'positive' : (st < -minAbsSteer ? 'negative' : 'neutral');
      var ratio = (dir === 'neutral') ? null : (yaw[ix] / st);
      if (ratio != null && !isFinite(ratio)) ratio = null;
      scatter.push({ steer: st, yawRate: yaw[ix], speed: sp, ratio: ratio, dir: dir });
    }

    // Final guard against a near-centre-dominated set: if too few steady samples clear minAbsSteer to
    // yield a trustworthy yaw/steer ratio, there is no yaw response to characterise → fail closed.
    var ratioPointCount = 0;
    for (var rc = 0; rc < scatter.length; rc++) if (scatter[rc].ratio != null) ratioPointCount++;
    if (ratioPointCount < MIN_STEADY_POINTS) return _notAvailable('insufficient_steering', counts, thresholds);

    // ── speed-binned descriptive summary, split by raw-steer sign ──
    var speedBins = [];
    var span = (sMax > sMin) ? (sMax - sMin) : 1;
    var binW = span / binCount;
    var buckets = [];
    for (var b = 0; b < binCount; b++) buckets.push({ start: sMin + b * binW, end: sMin + (b + 1) * binW, all: [], pos: [], neg: [], neu: 0, ratios: [] });
    for (var s2 = 0; s2 < scatter.length; s2++) {
      var pt = scatter[s2];
      var bi = (binW > 0) ? Math.min(binCount - 1, Math.floor((pt.speed - sMin) / binW)) : 0;
      var bk = buckets[bi];
      bk.all.push(pt);
      if (pt.dir === 'positive') { bk.pos.push(pt); if (pt.ratio != null) bk.ratios.push(pt.ratio); }
      else if (pt.dir === 'negative') { bk.neg.push(pt); if (pt.ratio != null) bk.ratios.push(pt.ratio); }
      else bk.neu++;
    }
    for (var b2 = 0; b2 < buckets.length; b2++) {
      var bb = buckets[b2];
      if (!bb.all.length) continue; // skip empty bins
      speedBins.push({
        speedStart: bb.start, speedEnd: bb.end,
        n: bb.all.length, neutralCount: bb.neu,
        combined: { count: bb.ratios.length, yawPerSteerStats: _ratioStats(bb.ratios, cvMinSamples) },
        positive: _dirBlock(bb.pos, cvMinSamples),
        negative: _dirBlock(bb.neg, cvMinSamples),
      });
    }

    // ── overall dispersion across all steady points, split by raw-steer sign ──
    var allPos = [], allNeg = [], allRatio = [], neutralAll = 0;
    for (var d2 = 0; d2 < scatter.length; d2++) {
      var p2 = scatter[d2];
      if (p2.dir === 'positive') { allPos.push(p2); if (p2.ratio != null) allRatio.push(p2.ratio); }
      else if (p2.dir === 'negative') { allNeg.push(p2); if (p2.ratio != null) allRatio.push(p2.ratio); }
      else neutralAll++;
    }
    var dispersion = {
      metric: 'yaw_rate_per_raw_steering', // intentionally NOT a road-wheel / normalized / understeer name
      n: scatter.length, neutralCount: neutralAll,
      combined: { count: allRatio.length, yawPerSteerStats: _ratioStats(allRatio, cvMinSamples) },
      positive: _dirBlock(allPos, cvMinSamples),
      negative: _dirBlock(allNeg, cvMinSamples),
    };

    return {
      available: true, reason: null,
      thresholds: thresholds, sampleCounts: counts,
      scatter: scatter, speedBins: speedBins, dispersion: dispersion,
      units: units, notes: notes,
    };
  }

  var api = {
    computeObservedYawResponse: computeObservedYawResponse,
    STRICTNESS: STRICTNESS, FORBIDDEN_METRIC_NAMES: FORBIDDEN_METRIC_NAMES, MIN_STEADY_POINTS: MIN_STEADY_POINTS,
    // exposed for unit tests
    _percentile: _percentile, _median: _median, _iqr: _iqr, _mad: _mad, _safeCv: _safeCv, _derivative: _derivative,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryYaw = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
