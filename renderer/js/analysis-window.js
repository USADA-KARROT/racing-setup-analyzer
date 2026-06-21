/**
 * analysis-window.js — R2.3 §4.5: analysis window proposal + AUTHORITATIVE validation (PURE).
 *
 * validateAnalysisWindow is the single window authority:
 *  1. FIRST hard-fails on a BLOCKED / global-reset / non-monotonic timebase (`timebase_blocked`) — this
 *     explicitly re-enforces the existing TELEMETRY_TIMEBASE_BLOCKED gate, NOT via the yaw engine.
 *  2. THEN decides qualifying-sample sufficiency by CALLING the yaw engine's own steady-state filter
 *     (`telemetry-yaw.computeObservedYawResponse` over the windowed series) — validator and engine share ONE
 *     qualifying logic (no drift). `normalizeYawOptions` is exported so observation passes the SAME options.
 * Window validity = ENOUGH qualifying samples remain AFTER per-sample exclusion (a threshold), NOT the
 * absence of any excluded sample; normal left/right steering sign-changes are NEVER a whole-window rejection.
 *
 * RED LINES: pure; imports telemetry-yaw only; never mutates input; the user can REQUEST a window but never
 * inject a verdict — observation re-runs this validator.
 *
 * UMD: Node require / Electron renderer global (AnalysisWindow).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var TY = _req('./telemetry-yaw.js', typeof TelemetryYaw !== 'undefined' ? TelemetryYaw : undefined);
  if (!TY) throw new Error('analysis-window.js requires telemetry-yaw.js');

  // single normalized yaw options object — shared by validation AND observation (no eligibility drift)
  function normalizeYawOptions(opts) {
    opts = opts || {};
    var out = {};
    if (opts.strictness && TY.STRICTNESS && TY.STRICTNESS[opts.strictness]) out.strictness = opts.strictness;
    ['lateralActivityPercentile', 'stabilityPercentile', 'minSegmentSamples', 'speedBinCount', 'cvMinSamples', 'minAbsSteer'].forEach(function (k) {
      if (typeof opts[k] === 'number') out[k] = opts[k];
    });
    return out;
  }

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _finiteList(a) { var o = []; for (var i = 0; i < (a || []).length; i++) if (_isFiniteNum(a[i])) o.push(a[i]); return o; }
  function _range(a) { var c = _finiteList(a); if (!c.length) return null; var mn = c[0], mx = c[0]; for (var i = 1; i < c.length; i++) { if (c[i] < mn) mn = c[i]; if (c[i] > mx) mx = c[i]; } return [mn, mx]; }

  // slice a series bundle to [startTime, endTime] (null window = full range, preserving R2.2 behaviour)
  function _slice(bundle, window) {
    var time = bundle.time || [];
    var lo = (window && window.startTime != null) ? window.startTime : -Infinity;
    var hi = (window && window.endTime != null) ? window.endTime : Infinity;
    var idx = [];
    for (var i = 0; i < time.length; i++) { if (time[i] != null && time[i] >= lo && time[i] <= hi) idx.push(i); }
    var pick = function (arr) { return idx.map(function (i) { return (arr || [])[i]; }); };
    return { idx: idx, time: pick(time), speed: pick(bundle.speed), yawRate: pick(bundle.yawRate), steer: pick(bundle.steer), lateralAccel: pick(bundle.lateralAccel), steerUnit: bundle.steerUnit };
  }

  function _dominantSign(steer) {
    var pos = 0, neg = 0;
    for (var i = 0; i < (steer || []).length; i++) { var s = steer[i]; if (!_isFiniteNum(s)) continue; if (s > 0) pos++; else if (s < 0) neg++; }
    if (pos > 0 && neg > 0) return 'mixed';
    if (pos > 0) return 'positive';
    if (neg > 0) return 'negative';
    return 'none';
  }

  /**
   * validateAnalysisWindow(bundle, window, opts)
   *   bundle = { time:[s], speed:[m/s], yawRate:[rad/s], steer:[raw], lateralAccel:[m/s²], steerUnit?, timebaseStatus }
   *   window = { startTime, endTime } | null
   */
  function validateAnalysisWindow(bundle, window, opts) {
    bundle = bundle || {};
    var rejectionReasons = [];
    // 1) timebase hard-fail (independent of the yaw engine)
    if (bundle.timebaseStatus === 'blocked') rejectionReasons.push('timebase_blocked');
    var time = bundle.time || [];
    var monotonic = true; var prev = null;
    for (var i = 0; i < time.length; i++) { if (time[i] == null) continue; if (prev != null && time[i] < prev) { monotonic = false; break; } prev = time[i]; }
    if (!monotonic) rejectionReasons.push('timebase_non_monotonic');
    if (rejectionReasons.length) return _result(false, window, [], rejectionReasons, bundle);

    // 2) qualifying-sample sufficiency via the SHARED yaw engine
    var sliced = _slice(bundle, window);
    var yawOpts = normalizeYawOptions(opts);
    var yaw = TY.computeObservedYawResponse({ time: sliced.time, yawRate: sliced.yawRate, steer: sliced.steer, speed: sliced.speed, lateralAccel: sliced.lateralAccel, steerUnit: sliced.steerUnit }, yawOpts);
    if (!yaw.available) rejectionReasons.push('insufficient_qualifying_samples:' + (yaw.reason || 'unavailable'));
    return _result(yaw.available, window, sliced.idx, rejectionReasons, bundle, yaw);
  }

  function _result(valid, window, idx, rejectionReasons, bundle, yaw) {
    var t = bundle.time || [];
    var startTime = idx.length ? t[idx[0]] : (window && window.startTime != null ? window.startTime : (t.length ? t[0] : null));
    var endTime = idx.length ? t[idx[idx.length - 1]] : (window && window.endTime != null ? window.endTime : (t.length ? t[t.length - 1] : null));
    var sliced = idx.length ? { speed: idx.map(function (i) { return (bundle.speed || [])[i]; }), lateralAccel: idx.map(function (i) { return (bundle.lateralAccel || [])[i]; }), steer: idx.map(function (i) { return (bundle.steer || [])[i]; }) } : { speed: [], lateralAccel: [], steer: [] };
    var steady = yaw && yaw.sampleCounts ? yaw.sampleCounts.steadyState : 0;
    return {
      valid: valid === true,
      startTime: _isFiniteNum(startTime) ? startTime : null, endTime: _isFiniteNum(endTime) ? endTime : null,
      duration: (_isFiniteNum(startTime) && _isFiniteNum(endTime)) ? (endTime - startTime) : null,
      sampleCount: idx.length, steadyStateCount: steady,
      speedRange: _range(sliced.speed), lateralAccelRange: _range(sliced.lateralAccel), steeringSign: _dominantSign(sliced.steer),
      quality: valid ? (steady >= 40 ? 'good' : 'fair') : 'poor',
      rejectionReasons: rejectionReasons,
    };
  }

  /**
   * proposeAnalysisWindows(bundle, opts) → candidate windows (active cornering segments).
   * Excludes low-speed/low-activity samples, then proposes contiguous active runs of sufficient length.
   */
  function proposeAnalysisWindows(bundle, opts) {
    opts = opts || {};
    var time = bundle.time || [], speed = bundle.speed || [], ay = bundle.lateralAccel || [];
    var n = Math.min(time.length, speed.length, ay.length);
    var posSpeed = _finiteList(speed).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    var speedFloor = posSpeed.length ? posSpeed[Math.floor(0.25 * (posSpeed.length - 1))] : 0;
    var ayFloor = opts.lateralActivityFloor != null ? opts.lateralActivityFloor : 2; // m/s² minimal cornering
    var minRun = opts.minRunSamples != null ? opts.minRunSamples : 20;
    var runs = [], start = -1;
    for (var i = 0; i < n; i++) {
      var active = _isFiniteNum(time[i]) && _isFiniteNum(speed[i]) && _isFiniteNum(ay[i]) && speed[i] >= speedFloor && Math.abs(ay[i]) >= ayFloor;
      if (active) { if (start < 0) start = i; }
      else { if (start >= 0 && (i - start) >= minRun) runs.push([start, i - 1]); start = -1; }
    }
    if (start >= 0 && (n - start) >= minRun) runs.push([start, n - 1]);
    var candidates = runs.map(function (r) {
      return { startTime: time[r[0]], endTime: time[r[1]], sampleCount: r[1] - r[0] + 1, speedRange: _range(speed.slice(r[0], r[1] + 1)), source: 'active_segment' };
    });
    // always offer the full window as a candidate too
    if (n > 0) candidates.unshift({ startTime: null, endTime: null, sampleCount: n, speedRange: _range(speed), source: 'full_session' });
    return candidates;
  }

  var api = { validateAnalysisWindow: validateAnalysisWindow, proposeAnalysisWindows: proposeAnalysisWindows, normalizeYawOptions: normalizeYawOptions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisWindow = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
