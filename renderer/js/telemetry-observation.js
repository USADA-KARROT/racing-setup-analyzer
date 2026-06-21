/**
 * telemetry-observation.js — R2.2 §8: Telemetry observation layer (PURE, fail-closed, HONEST).
 *
 * observeTelemetry(session, window, opts): runs the production preflight gate + the production observed
 * yaw-response engine, then derives a DIRECTIONAL handling tendency from the SHAPE of the
 * yaw_rate÷raw_steering ratio vs speed. It is deliberately a heuristic/derived DIRECTIONAL observation,
 * NOT a measured vehicle understeer gradient.
 *
 * RED LINES (must not break — these mirror telemetry-yaw.js and the Codex CP1 findings):
 *  • RAW steering only. We never convert steering-wheel angle to road-wheel angle, never divide by a
 *    steering ratio, never emit / serialize / imply K_us, road-wheel gain, or any calibrated magnitude.
 *    The trend is honest ONLY because a fixed (unknown) steering ratio is a constant scale that does not
 *    change whether the ratio rises or falls with speed.
 *  • Every result carries method + confounders + limitations + confidence + evidence. observedTendency is
 *    'understeer_tendency'/'neutral_tendency'/'oversteer_tendency'/'mixed_or_speed_dependent'/
 *    'inconclusive'/'unavailable'. Confidence is capped at 'medium' (directional heuristic, never 'high').
 *  • Fail-closed: no timebase / missing-or-unconfirmed required channels / unsupported units / too few
 *    speed bins → blocked with structured reasons; never a fabricated tendency. Imports telemetry-core +
 *    telemetry-yaw only; reuses their parser/stats (does NOT rewrite the parser). Never mutates input.
 *
 * Session contract: { sessionId, parsed:<telemetry-core.parseCsv output>, definitions:{channels:{...}},
 *                     sampleRateHz? }. window: { startTime, endTime } | null.
 *
 * UMD: Node require / Electron renderer global (TelemetryObservation).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var TC = _req('./telemetry-core.js', typeof TelemetryCore !== 'undefined' ? TelemetryCore : undefined);
  var TY = _req('./telemetry-yaw.js', typeof TelemetryYaw !== 'undefined' ? TelemetryYaw : undefined);
  if (!TC || !TY) throw new Error('telemetry-observation.js requires telemetry-core + telemetry-yaw');

  var REQUIRED = ['speed', 'yaw_rate', 'steering', 'lateral_accel'];
  var DEFAULT_MIN_BIN_SAMPLES = 6;
  var DEFAULT_TREND_THRESHOLD = 0.12;   // |relative change| in the ratio to call a directional trend
  var FORBIDDEN_NAMES = ['k_us', 'kus', 'road_wheel_gain', 'understeer_gradient', 'measured_understeer', 'calibrated'];
  // Limitations are stated WITHOUT naming K_us / road-wheel gain (Codex F4: never name/serialize/imply
  // them, even in a negation). The UI renders friendlier prose; these machine codes stay neutral+honest.
  var LIMITATIONS = Object.freeze(['steering_is_raw_uncalibrated', 'no_steering_calibration', 'directional_tendency_only_not_a_measured_magnitude', 'assumes_fixed_steering_ratio_within_session']);
  var CONFOUNDERS = Object.freeze(['changing_steering_amplitude', 'transient_driving', 'variable_steering_ratio', 'track_curvature_and_corner_radius']);
  var DIM = { speed: 'speed', yaw_rate: 'angular_rate', lateral_accel: 'acceleration', time: 'time' };

  function _blocker(code, detail) { return { code: code, scope: 'telemetry', severity: 'error', detail: detail || null }; }
  function _unavailable(reason, blockedReasons, channels, warnings) {
    return {
      valid: false, quality: null, channels: channels || null, selectedWindow: null,
      observedTendency: 'unavailable', observedMetrics: null, evidence: { reason: reason },
      confidence: null, method: null, limitations: LIMITATIONS, confounders: CONFOUNDERS,
      blockedReasons: blockedReasons || [], warnings: warnings || [], credibility: 'Unavailable',
    };
  }

  // ── extract canonical analysis series from the parsed CSV (reuses telemetry-core; never re-parses) ──
  function _extractSeries(parsed, definitions, tel, tb) {
    var reports = TC.mapChannels(parsed, definitions);
    var byCanon = {};
    reports.forEach(function (r) { if (r.canonicalName && !byCanon[r.canonicalName]) byCanon[r.canonicalName] = r; });
    var channelStatus = {};
    REQUIRED.concat(['time']).forEach(function (canon) {
      var rep = byCanon[canon];
      channelStatus[canon] = { available: !!rep, rawName: rep ? rep.rawName : null, status: rep ? rep.status : 'absent', rawUnit: rep ? rep.rawUnit : null };
    });
    // time uses the timebase report's detected column (time is not a mapChannels canonical)
    var timeName = tb.timeName;
    channelStatus.time = { available: !!timeName, rawName: timeName || null, status: timeName ? 'present' : 'absent', rawUnit: timeName ? (tel.units[timeName] || '') : null };

    function colCanonical(canon) {
      var rep = byCanon[canon]; if (!rep) return null;
      var key = rep.rawName.toLowerCase(); var col = tel.data[key]; if (!Array.isArray(col)) return null;
      var unit = rep.rawUnit || tel.units[key] || '';
      return col.map(function (v) { return v == null ? null : TC.convertToCanonical(v, unit, DIM[canon]); });
    }
    function colRaw(canon) {
      var rep = byCanon[canon]; if (!rep) return null;
      var key = rep.rawName.toLowerCase(); var col = tel.data[key]; if (!Array.isArray(col)) return null;
      return col.slice();
    }
    function colTime() {
      if (!timeName) return null; var col = tel.data[timeName]; if (!Array.isArray(col)) return null;
      var unit = tel.units[timeName] || 's';
      return col.map(function (v) { return v == null ? null : (TC.convertToCanonical(v, unit, 'time') != null ? TC.convertToCanonical(v, unit, 'time') : v); });
    }
    var steerRep = byCanon.steering;
    return {
      time: colTime(), yawRate: colCanonical('yaw_rate'), steer: colRaw('steering'),
      speed: colCanonical('speed'), lateralAccel: colCanonical('lateral_accel'),
      steerUnit: steerRep ? (steerRep.rawUnit || '(raw)') : '(raw)',
      channelStatus: channelStatus,
    };
  }

  // window filter by canonical time (s); returns sliced series + selectedWindow descriptor.
  function _applyWindow(series, window) {
    var t = series.time;
    if (!window || !Array.isArray(t) || (window.startTime == null && window.endTime == null)) {
      var n0 = (t || series.speed || []).length;
      return { series: series, selectedWindow: { startTime: t && t[0] != null ? t[0] : null, endTime: t && t[n0 - 1] != null ? t[n0 - 1] : null, sampleCount: n0, applied: false } };
    }
    var lo = window.startTime != null ? window.startTime : -Infinity;
    var hi = window.endTime != null ? window.endTime : Infinity;
    var idx = [];
    for (var i = 0; i < t.length; i++) { if (t[i] != null && t[i] >= lo && t[i] <= hi) idx.push(i); }
    var pick = function (arr) { return Array.isArray(arr) ? idx.map(function (i) { return arr[i]; }) : arr; };
    var sliced = { time: pick(series.time), yawRate: pick(series.yawRate), steer: pick(series.steer), speed: pick(series.speed), lateralAccel: pick(series.lateralAccel), steerUnit: series.steerUnit, channelStatus: series.channelStatus };
    return { series: sliced, selectedWindow: { startTime: lo === -Infinity ? null : lo, endTime: hi === Infinity ? null : hi, sampleCount: idx.length, applied: true } };
  }

  // ── derive a DIRECTIONAL tendency from the yaw/steer-vs-speed trend (heuristic; never measured K_us) ──
  function _deriveTendency(yawResp, opts) {
    var minBin = opts.minBinSamples != null ? opts.minBinSamples : DEFAULT_MIN_BIN_SAMPLES;
    var thr = opts.trendThreshold != null ? opts.trendThreshold : DEFAULT_TREND_THRESHOLD;
    if (!yawResp.available) return { tendency: 'unavailable', confidence: null, evidence: { reason: yawResp.reason } };
    var bins = (yawResp.speedBins || []).filter(function (b) {
      return b.combined && b.combined.yawPerSteerStats && b.combined.yawPerSteerStats.n >= minBin && b.combined.yawPerSteerStats.median != null && isFinite(b.combined.yawPerSteerStats.median);
    });
    if (bins.length < 2) return { tendency: 'inconclusive', confidence: 'low', evidence: { reason: 'insufficient_speed_bins', usableBins: bins.length } };
    var low = bins[0], high = bins[bins.length - 1];
    var rLow = low.combined.yawPerSteerStats.median, rHigh = high.combined.yawPerSteerStats.median;
    // the ratio must keep a consistent sign across speed (else it isn't a clean single trend)
    var sameSign = (rLow > 0 && rHigh > 0) || (rLow < 0 && rHigh < 0);
    if (!sameSign) return { tendency: 'mixed_or_speed_dependent', confidence: 'low', evidence: { reason: 'ratio_sign_inconsistent', rLow: rLow, rHigh: rHigh } };
    var relChange = (Math.abs(rHigh) - Math.abs(rLow)) / Math.abs(rLow);
    var tendency;
    if (relChange < -thr) tendency = 'understeer_tendency';     // yaw response falls with speed → more understeer
    else if (relChange > thr) tendency = 'oversteer_tendency';  // yaw response grows with speed → more oversteer
    else tendency = 'neutral_tendency';
    // confidence: directional heuristic — capped at medium; needs several bins + samples to reach it.
    var totalSteady = yawResp.sampleCounts ? yawResp.sampleCounts.steadyState : 0;
    var confidence = (bins.length >= 4 && totalSteady >= 40 && Math.abs(relChange) >= thr) ? 'medium' : 'low';
    return {
      tendency: tendency, confidence: confidence,
      evidence: {
        method: 'speed_dependent_yaw_per_steer_trend', metric: yawResp.dispersion ? yawResp.dispersion.metric : 'yaw_rate_per_raw_steering',
        ratioLowSpeed: rLow, ratioHighSpeed: rHigh, relativeChange: relChange, trendThreshold: thr,
        speedLow: low.speedStart, speedHigh: high.speedEnd, binsUsed: bins.length, steadySamples: totalSteady,
      },
    };
  }

  // ── driver-input summary (for the Driver Coach layer): steering smoothness/correction frequency +
  // honest channel availability for pedals / track-position / lap segmentation. Raw steering only. ──
  var PEDAL_THROTTLE_RE = [/throttle/i, /^tps$/i, /accel.*ped/i, /gas/i];
  var PEDAL_BRAKE_RE = [/brake/i, /^bps$/i, /brk/i];
  var TRACK_POS_RE = [/track.*pos/i, /lap.*dist/i, /^dist/i, /gps/i, /^s$/i, /curv/i];
  var LAP_RE = [/^lap$/i, /lapno/i, /lap.*num/i, /lap.*idx/i, /lap.*ctr/i];
  function _matchAny(reList, names) { return names.some(function (n) { return reList.some(function (re) { return re.test(n); }); }); }
  function _driverInputs(tel, series) {
    var names = tel.channels || [];
    var steer = series.steer || [], time = series.time || [];
    // robust steering scale (deadband so sensor jitter isn't counted as a correction)
    var absSteer = [];
    for (var i = 0; i < steer.length; i++) { if (steer[i] != null && isFinite(steer[i])) absSteer.push(Math.abs(steer[i])); }
    absSteer.sort(function (a, b) { return a - b; });
    var scale = absSteer.length ? absSteer[Math.floor(0.95 * (absSteer.length - 1))] : 0;
    var deadband = (scale || 0) * 0.02;
    var reversals = 0, lastSign = 0, absDeltas = [];
    for (var j = 1; j < steer.length; j++) {
      if (steer[j] == null || steer[j - 1] == null) { lastSign = 0; continue; }
      var d = steer[j] - steer[j - 1];
      if (Math.abs(d) <= deadband) continue;
      absDeltas.push(Math.abs(d));
      var sign = d > 0 ? 1 : -1;
      if (lastSign !== 0 && sign !== lastSign) reversals++;
      lastSign = sign;
    }
    absDeltas.sort(function (a, b) { return a - b; });
    var abruptness = absDeltas.length ? absDeltas[Math.floor(0.95 * (absDeltas.length - 1))] : null;
    var t0 = null, t1 = null;
    for (var k = 0; k < time.length; k++) { if (time[k] != null) { if (t0 == null) t0 = time[k]; t1 = time[k]; } }
    var durationS = (t0 != null && t1 != null && t1 > t0) ? (t1 - t0) : null;
    return {
      steeringChannelAvailable: true,
      steeringReversalCount: reversals,
      steeringReversalRatePerS: durationS ? reversals / durationS : null,
      steeringAbruptnessP95: abruptness,
      steerUnit: series.steerUnit || '(raw)',
      pedalChannelsAvailable: { throttle: _matchAny(PEDAL_THROTTLE_RE, names), brake: _matchAny(PEDAL_BRAKE_RE, names) },
      trackPositionAvailable: _matchAny(TRACK_POS_RE, names),
      lapSegmentationAvailable: _matchAny(LAP_RE, names),
      durationS: durationS,
    };
  }

  function observeTelemetry(session, window, opts) {
    try { return _observeInner(session, window, opts || {}); }
    catch (e) { return _unavailable('observation_exception', [_blocker('OBSERVATION_EXCEPTION', String(e && e.message || e))]); }
  }
  function _observeInner(session, window, opts) {
    if (!session || typeof session !== 'object' || !session.parsed) {
      return _unavailable('no_session', [_blocker('TELEMETRY_SESSION_MISSING', 'session or parsed CSV absent')]);
    }
    var parsed = session.parsed, definitions = session.definitions || { channels: {} };
    var tel = TC.columnMap(parsed);
    var tb = TC.timebaseReport(tel);
    var pf = TC.runTelemetryPreflight(parsed, definitions);
    var warnings = [], blockedReasons = [];

    var series0 = _extractSeries(parsed, definitions, tel, tb);
    var channels = series0.channelStatus;

    // hard gate: timebase must not be BLOCKED (a global timestamp reset breaks any dynamic comparison)
    if (tb.status === TC.GRADE.BLOCKED) blockedReasons.push(_blocker('TELEMETRY_TIMEBASE_BLOCKED', tb.reason));
    if (!tb.timeName) blockedReasons.push(_blocker('TELEMETRY_TIMEBASE_UNCONFIRMED', 'no time column — dynamic trend needs a timebase'));
    // required channels present AND user-confirmed?
    REQUIRED.forEach(function (canon) {
      var ch = channels[canon];
      if (!ch || !ch.available) { blockedReasons.push(_blocker('REQUIRED_CHANNEL_MISSING', canon)); return; }
      // §8 honesty: an auto-mapped but UNCONFIRMED channel identity must NOT be treated as a confirmed
      // physical quantity. Observation requires user-confirmed (definition_confirmed) required channels;
      // a provisional/unknown identity fails closed (the session stays inspectable, comparison blocked).
      if (ch.status !== TC.GRADE.DEFINITION_CONFIRMED) blockedReasons.push(_blocker('REQUIRED_CHANNEL_NOT_CONFIRMED', canon + ' (' + ch.status + ')'));
    });
    if (blockedReasons.length) return _unavailable('preflight_blocked', blockedReasons, channels, warnings);

    var quality = { grade: pf.grade, sampleRateHz: (session.sampleRateHz != null ? session.sampleRateHz : tb.sampleRateHz) || null, sampleCount: tel.n, timebaseStatus: tb.status };

    var win = _applyWindow(series0, window);
    var series = win.series;
    var driverInputs = _driverInputs(tel, series);

    // run the production observed yaw-response engine (raw steering only)
    var yawResp = TY.computeObservedYawResponse({ time: series.time, yawRate: series.yawRate, steer: series.steer, speed: series.speed, lateralAccel: series.lateralAccel, steerUnit: series.steerUnit }, { strictness: opts.strictness });
    if (!yawResp.available) {
      return {
        valid: false, quality: quality, channels: channels, selectedWindow: win.selectedWindow,
        observedTendency: 'unavailable', observedMetrics: { yawResponseReason: yawResp.reason, sampleCounts: yawResp.sampleCounts },
        driverInputs: driverInputs,
        evidence: { reason: 'yaw_response_unavailable', detail: yawResp.reason }, confidence: null,
        method: 'speed_dependent_yaw_per_steer_trend', limitations: LIMITATIONS, confounders: CONFOUNDERS,
        blockedReasons: [_blocker('OBSERVED_YAW_RESPONSE_UNAVAILABLE', yawResp.reason)], warnings: warnings, credibility: 'Unavailable',
      };
    }

    var derived = _deriveTendency(yawResp, opts);
    // honesty self-check: the metric name must NEVER be a calibrated/road-wheel/K_us name (defensive).
    var metricName = (yawResp.dispersion && yawResp.dispersion.metric) || '';
    if (FORBIDDEN_NAMES.some(function (f) { return metricName.toLowerCase().indexOf(f) !== -1; })) {
      return _unavailable('forbidden_metric_name_guard', [_blocker('FORBIDDEN_METRIC_NAME', metricName)], channels, warnings);
    }

    var observable = derived.tendency !== 'unavailable';
    return {
      valid: observable,
      quality: quality,
      channels: channels,
      selectedWindow: win.selectedWindow,
      observedTendency: derived.tendency,
      observedMetrics: {
        metric: metricName,                      // 'yaw_rate_per_raw_steering' — NOT K_us
        dispersion: yawResp.dispersion, speedBins: yawResp.speedBins, thresholds: yawResp.thresholds,
        sampleCounts: yawResp.sampleCounts, units: yawResp.units,
      },
      driverInputs: driverInputs,
      evidence: derived.evidence,
      confidence: derived.confidence,
      method: 'speed_dependent_yaw_per_steer_trend',
      limitations: LIMITATIONS,
      confounders: CONFOUNDERS,
      blockedReasons: [],
      warnings: warnings,
      credibility: 'Heuristic',                  // directional heuristic from raw telemetry — never 'Measured'
    };
  }

  var api = { observeTelemetry: observeTelemetry, REQUIRED: REQUIRED, LIMITATIONS: LIMITATIONS, CONFOUNDERS: CONFOUNDERS, FORBIDDEN_NAMES: FORBIDDEN_NAMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryObservation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
