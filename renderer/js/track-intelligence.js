/**
 * track-intelligence.js — R2.6: lap/corner segmentation + per-corner DRIVER-BEHAVIOUR coaching (PURE).
 *
 * deriveTrackIntelligence(session, observation, caseContext, opts) segments a canonical session into laps →
 * corners → entry/mid/exit phases and reports the DRIVER'S raw-steering behaviour per phase (correction
 * frequency + abruptness). It is HEURISTIC and DRIVER-scoped: never a corner's understeer characteristic, a
 * measured magnitude, or a setup recommendation.
 *
 * RED LINES:
 *  • Confirmed-channel gate is RE-DERIVED from session.mappingEntries (exactly-one ∧ userConfirmed ∧ valid
 *    projection ∧ one-to-one) — NEVER trusts observation presence flags. No eligible track_position → no corner
 *    attribution; no eligible lap → no per-corner/lap-to-lap; both fail closed with explicit reasons.
 *  • Per-phase confidence capped at 'low'; a phase < MIN_PHASE_SAMPLES → insufficient (no observation); a corner
 *    < MIN_CORNER_SAMPLES dropped; no corners → blocked (never an empty-but-eligible claim).
 *  • Raw steering only (never road-wheel / K_us). Credibility 'Heuristic', never 'Measured'. Provenance carried.
 *  • Pure; deterministic; never throws (exotic → blocked); never mutates session/observation.
 *
 * UMD: Node require / Electron renderer global (TrackIntelligence).
 */
(function (root) {
  'use strict';

  var ELEVATED_REVERSAL_RATE_PER_S = 0.5;                  // same threshold as driver-coach-insight
  var DEFAULTS = Object.freeze({
    LAT_FLOOR: 2,            // m/s² — corner detection floor
    CORNER_LAT_PCTL: 0.6,    // data-adaptive |lateral_accel| percentile for the corner threshold
    SPEED_FLOOR_MIN: 5,      // m/s — corner speed floor
    SPEED_FLOOR_PCTL: 0.25,  // data-adaptive speed percentile
    MIN_CORNER_SAMPLES: 9,   // ≥3 per entry/mid/exit third
    MIN_PHASE_SAMPLES: 3,    // a phase below this is insufficient (no observation)
    MAX_CORNERS: 64,         // bounded output
  });

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _validProj(p) { return p && _isFiniteNum(p.scale) && p.scale !== 0 && _isFiniteNum(p.offset) && (p.sign === 1 || p.sign === -1); }
  // EXACT replicate of observation's required-channel eligibility predicate (never trust presence flags)
  function _channelEligible(mappingEntries, canon) {
    var me = mappingEntries || [];
    var es = me.filter(function (m) { return m && m.canonicalChannel === canon; });
    if (es.length !== 1 || es[0].userConfirmed !== true || !_validProj(es[0].projection)) return false;
    var byCanon = 0, byCol = 0;
    me.forEach(function (e) { if (e && e.canonicalChannel === canon) byCanon++; if (e && e.rawColumnId === es[0].rawColumnId) byCol++; });
    return byCanon === 1 && byCol === 1;
  }
  function _pctl(sortedAsc, q) { if (!sortedAsc.length) return 0; return sortedAsc[Math.floor(q * (sortedAsc.length - 1))]; }
  function _firstFinite(a, s, e) { for (var i = s; i <= e; i++) if (_isFiniteNum(a[i])) return a[i]; return null; }
  function _lastFinite(a, s, e) { for (var i = e; i >= s; i--) if (_isFiniteNum(a[i])) return a[i]; return null; }
  function _blocker(code, detail) { return { code: code, scope: 'track_intelligence', severity: 'info', detail: detail || null }; }

  // per-phase RAW steering behaviour — SAME definitions as telemetry-observation (deadband = 2% of p95 |steer|)
  function _phaseSteering(steer, durationS) {
    var absSteer = []; for (var k = 0; k < steer.length; k++) if (_isFiniteNum(steer[k])) absSteer.push(Math.abs(steer[k]));
    absSteer.sort(function (a, b) { return a - b; });
    var scale = absSteer.length ? absSteer[Math.floor(0.95 * (absSteer.length - 1))] : 0;
    var deadband = (scale || 0) * 0.02;
    var reversals = 0, lastSign = 0, absDeltas = [];
    for (var j = 1; j < steer.length; j++) {
      if (steer[j] == null || steer[j - 1] == null) { lastSign = 0; continue; }
      var d = steer[j] - steer[j - 1]; if (Math.abs(d) <= deadband) continue;
      absDeltas.push(Math.abs(d)); var sg = d > 0 ? 1 : -1; if (lastSign !== 0 && sg !== lastSign) reversals++; lastSign = sg;
    }
    absDeltas.sort(function (a, b) { return a - b; });
    var abruptness = absDeltas.length ? absDeltas[Math.floor(0.95 * (absDeltas.length - 1))] : null;
    return { reversalCount: reversals, reversalRatePerS: (durationS > 0) ? reversals / durationS : null, abruptnessP95: abruptness };
  }

  function _phase(arrs, s, e) {
    var samples = e - s + 1;
    if (samples < DEFAULTS.MIN_PHASE_SAMPLES) return { samples: samples, sufficient: false, reason: 'insufficient_samples', confidence: 'low' };
    var steerSlice = arrs.steer.slice(s, e + 1);
    var durationS = (_isFiniteNum(arrs.time[e]) && _isFiniteNum(arrs.time[s])) ? (arrs.time[e] - arrs.time[s]) : 0;
    var ph = _phaseSteering(steerSlice, durationS);
    var elevated = ph.reversalRatePerS != null && ph.reversalRatePerS >= ELEVATED_REVERSAL_RATE_PER_S;
    return {
      samples: samples, sufficient: true,
      qualitative: elevated ? 'elevated_secondary_corrections' : 'few_secondary_corrections',
      reversalRatePerS: ph.reversalRatePerS, abruptnessP95: ph.abruptnessP95,
      note: 'raw_steering_input_not_road_wheel_angle', confidence: 'low',
    };
  }

  function _buildCorner(cornerId, lapId, s, e, arrs) {
    var samples = e - s + 1;
    var third = Math.floor(samples / 3);
    var entry = _phase(arrs, s, s + third - 1);
    var mid = _phase(arrs, s + third, s + 2 * third - 1);
    var exit = _phase(arrs, s + 2 * third, e);
    var elevatedPhase = [['entry', entry], ['mid', mid], ['exit', exit]].filter(function (p) { return p[1].sufficient && p[1].qualitative === 'elevated_secondary_corrections'; }).map(function (p) { return p[0]; });
    return {
      cornerId: 'corner_' + cornerId, lapId: lapId,
      trackPosRange: [_firstFinite(arrs.tp, s, e), _lastFinite(arrs.tp, s, e)],
      timeRange: [_firstFinite(arrs.time, s, e), _lastFinite(arrs.time, s, e)],
      samples: samples, entry: entry, mid: mid, exit: exit,
      summary: elevatedPhase.length ? ('corrections_elevated_in_' + elevatedPhase.join('_')) : 'corrections_within_normal_range',
      confidence: 'low',
    };
  }

  function deriveTrackIntelligence(session, observation, caseContext, opts) {
    try { return _inner(session, observation, opts || {}); }
    catch (e) { return _result(false, false, false, false, 0, [], [_blocker('TRACK_INTELLIGENCE_EXCEPTION', String(e && e.message || e))], [], null, 'Unavailable'); }
  }

  function _result(eligible, tpOk, lapOk, stOk, lapCount, corners, blockedReasons, cannotConclude, dataProvenance, credibility) {
    var lims = ['driver_behaviour_not_a_corner_or_setup_finding', 'raw_steering_input_not_road_wheel_angle']; // ALWAYS carried (the framing of what corner coaching is)
    if (eligible) lims = lims.concat(['heuristic_short_window', 'data_provenance_' + (dataProvenance || 'unverified')]);
    return {
      valid: eligible === true, eligible: eligible === true,
      trackPositionConfirmed: tpOk === true, lapSegmentationConfirmed: lapOk === true, steeringConfirmed: stOk === true,
      lapCount: lapCount, corners: corners,
      segmentationBasis: eligible ? 'lateral_accel_runs_within_lap' : null,
      dataProvenance: dataProvenance || null, limitations: lims,
      cannotConclude: cannotConclude, blockedReasons: blockedReasons, credibility: credibility,
    };
  }

  function _inner(session, observation, opts) {
    var TH = {}; for (var key in DEFAULTS) TH[key] = (opts && _isFiniteNum(opts[key])) ? opts[key] : DEFAULTS[key];
    // NOTE: corner coaching is steering BEHAVIOUR, independent of the directional yaw response — it does NOT
    // require observation.valid (a session can have confirmed channels yet an inconclusive yaw response).
    if (!session || typeof session !== 'object' || session.kind !== 'canonical_telemetry_session') return _result(false, false, false, false, 0, [], [_blocker('NOT_CANONICAL_SESSION', 'track intelligence requires a canonical telemetry session')], [], null, 'Unavailable');

    var me = session.mappingEntries || [];
    var tpOk = _channelEligible(me, 'track_position'), lapOk = _channelEligible(me, 'lap'), stOk = _channelEligible(me, 'steering');
    var spOk = _channelEligible(me, 'speed'), latOk = _channelEligible(me, 'lateral_accel');
    var blockedReasons = [], cannotConclude = [];
    if (!tpOk) { blockedReasons.push(_blocker('NO_TRACK_POSITION', 'no confirmed track position — cannot attribute to a corner/apex')); cannotConclude.push('per_corner_attribution_no_track_position'); }
    if (!lapOk) { blockedReasons.push(_blocker('NO_LAP_SEGMENTATION', 'no confirmed lap channel — cannot segment laps/corners')); cannotConclude.push('lap_to_lap_or_per_corner_consistency_no_lap_segmentation'); }
    if (!stOk) { blockedReasons.push(_blocker('NO_STEERING_CHANNEL', 'no confirmed steering channel — no driver-behaviour observation')); cannotConclude.push('steering_behaviour_no_steering_channel'); }
    if (!spOk) { blockedReasons.push(_blocker('NO_SPEED_CHANNEL', 'no confirmed speed channel — cannot segment corners')); cannotConclude.push('corner_segmentation_no_speed_channel'); }
    if (!latOk) { blockedReasons.push(_blocker('NO_LATERAL_ACCEL_CHANNEL', 'no confirmed lateral acceleration — cannot detect corners')); cannotConclude.push('corner_detection_no_lateral_accel_channel'); }
    if (blockedReasons.length) return _result(false, tpOk, lapOk, stOk, 0, [], blockedReasons, cannotConclude, session.dataProvenance || null, 'Unavailable');

    var ch = session.channels || {};
    var lap = (ch.lap || {}).values || [], tp = (ch.track_position || {}).values || [], steer = (ch.steering || {}).values || [],
      lat = (ch.lateral_accel || {}).values || [], speed = (ch.speed || {}).values || [], time = session.time || [];
    var n = Math.min(lap.length, tp.length, steer.length, lat.length, speed.length, time.length);
    if (n < TH.MIN_CORNER_SAMPLES) return _result(false, tpOk, lapOk, stOk, 0, [], [_blocker('INSUFFICIENT_SAMPLES', 'too few aligned samples for corner segmentation')], cannotConclude, session.dataProvenance || null, 'Unavailable');
    var tpFinite = 0; for (var q = 0; q < n; q++) if (_isFiniteNum(tp[q])) tpFinite++;
    if (tpFinite < TH.MIN_CORNER_SAMPLES) return _result(false, tpOk, lapOk, stOk, 0, [], [_blocker('INSUFFICIENT_TRACK_POSITION_DATA', 'track position confirmed but too few finite values to attribute corners')], cannotConclude, session.dataProvenance || null, 'Unavailable');

    // data-adaptive thresholds
    var absLat = [], spd = [], lapSet = {};
    for (var i = 0; i < n; i++) { if (_isFiniteNum(lat[i])) absLat.push(Math.abs(lat[i])); if (_isFiniteNum(speed[i])) spd.push(speed[i]); if (_isFiniteNum(lap[i])) lapSet[Math.round(lap[i])] = 1; }
    absLat.sort(function (a, b) { return a - b; }); spd.sort(function (a, b) { return a - b; });
    var cornerThresh = Math.max(TH.LAT_FLOOR, _pctl(absLat, TH.CORNER_LAT_PCTL));
    var speedFloor = Math.max(TH.SPEED_FLOOR_MIN, _pctl(spd, TH.SPEED_FLOOR_PCTL));
    var lapCount = Object.keys(lapSet).length;

    var arrs = { steer: steer, tp: tp, time: time };
    var corners = [], cornerId = 0, curLap = null, runStart = -1;
    for (var p = 0; p <= n; p++) {
      var li = (p < n && _isFiniteNum(lap[p])) ? Math.round(lap[p]) : null;
      var active = p < n && _isFiniteNum(lat[p]) && Math.abs(lat[p]) >= cornerThresh && _isFiniteNum(speed[p]) && speed[p] >= speedFloor && li !== null;
      var lapChanged = li !== curLap;
      if (runStart >= 0 && (!active || lapChanged || p === n)) {
        if ((p - runStart) >= TH.MIN_CORNER_SAMPLES && corners.length < TH.MAX_CORNERS) corners.push(_buildCorner(cornerId++, curLap, runStart, p - 1, arrs));
        runStart = -1;
      }
      if (p < n) { curLap = li; if (active && runStart < 0) runStart = p; }
    }

    if (!corners.length) return _result(false, tpOk, lapOk, stOk, lapCount, [], [_blocker('NO_CORNERS_DETECTED', 'channels confirmed but no qualifying corners found')], cannotConclude, session.dataProvenance || null, 'Unavailable');
    return _result(true, tpOk, lapOk, stOk, lapCount, corners, [], cannotConclude, session.dataProvenance || null, 'Heuristic');
  }

  var api = { deriveTrackIntelligence: deriveTrackIntelligence, DEFAULTS: DEFAULTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TrackIntelligence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
