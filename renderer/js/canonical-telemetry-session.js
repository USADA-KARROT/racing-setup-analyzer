/**
 * canonical-telemetry-session.js — R2.3: the EVIDENCE-bearing canonical telemetry session (PURE).
 *
 * The single explicit session that observation/workspace consume. It is the home for the mapping
 * projection (applied), the immutable per-assignment `mappingEntries` (so uniqueness is re-checkable in
 * BOTH directions), the raw `calibrationSet`, and the window REQUEST. Pre-computed `advisory` views are for
 * UI display ONLY — observation never gates on them; it re-derives every gate from the raw evidence.
 *
 *  • `buildCanonicalSession(imported, mapping, calibrationSet, windowRequest, opts)` — for imported telemetry.
 *  • `coerceLegacySession({parsed, definitions, sampleRateHz}, windowRequest)` — R2.2 back-compat: reproduces
 *    the legacy {parsed,definitions} extraction byte-for-byte (mapChannels confirmed → userConfirmed:true,
 *    identity projection, convertToCanonical units), carrying the SUPPLIED window request.
 *
 * RED LINES: pure; imports telemetry-core + channel-mapping + calibration-registry + analysis-window; never
 * mutates input; channel values are canonical-unit (projection applied); identity projection + sign +1 keeps
 * R2.2 output identical.
 *
 * UMD: Node require / Electron renderer global (CanonicalTelemetrySession).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var TC = _req('./telemetry-core.js', typeof TelemetryCore !== 'undefined' ? TelemetryCore : undefined);
  var CM = _req('./channel-mapping.js', typeof ChannelMapping !== 'undefined' ? ChannelMapping : undefined);
  var CR = _req('./calibration-registry.js', typeof CalibrationRegistry !== 'undefined' ? CalibrationRegistry : undefined);
  var AW = _req('./analysis-window.js', typeof AnalysisWindow !== 'undefined' ? AnalysisWindow : undefined);
  if (!TC || !CM || !CR || !AW) throw new Error('canonical-telemetry-session.js requires telemetry-core + channel-mapping + calibration-registry + analysis-window');

  var SCHEMA_VERSION = '1.0.0';
  var DIM = { speed: 'speed', lateral_accel: 'acceleration', yaw_rate: 'angular_rate', time: 'time' };
  var REQUIRED = ['speed', 'lateral_accel', 'yaw_rate', 'steering'];

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _normWindow(w) { if (w == null) return null; return { startTime: w.startTime != null ? w.startTime : (w.start != null ? w.start : null), endTime: w.endTime != null ? w.endTime : (w.end != null ? w.end : null) }; }

  // project one raw column to canonical-unit values: v = sign*scale*base + offset; base = unit-convert (or raw)
  function _project(values, rawUnit, canonicalChannel, projection) {
    var dim = DIM[canonicalChannel] || null;
    var sc = projection.scale, off = projection.offset, sg = projection.sign;
    return (values || []).map(function (v) {
      if (v == null || !_isFiniteNum(v)) return null;
      var base = dim ? TC.convertToCanonical(v, rawUnit, dim) : v;
      if (base == null || !_isFiniteNum(base)) return null;
      return sg * sc * base + off;
    });
  }

  // assemble a session from immutable mappingEntries + raw columns (by id) + a resolved time array
  function _assemble(mappingEntries, colsById, time, sampleRateHz, calibrationSet, windowRequest, timebaseStatus, sessionId, sourceMetadata) {
    var channels = {};
    var steerUnit = '(raw)';
    mappingEntries.forEach(function (e) {
      var raw = colsById[e.rawColumnId];
      if (!raw) return;
      var vals = _project(raw.values, e.rawUnit, e.canonicalChannel, e.projection);
      channels[e.canonicalChannel] = { values: vals, unit: e.canonicalUnit, fromColumn: e.rawColumnId, userConfirmed: e.userConfirmed === true };
      if (e.canonicalChannel === 'steering') steerUnit = e.rawUnit || '(raw)';
    });
    var bundle = {
      time: time, speed: (channels.speed || {}).values || [], yawRate: (channels.yaw_rate || {}).values || [],
      steer: (channels.steering || {}).values || [], lateralAccel: (channels.lateral_accel || {}).values || [],
      steerUnit: steerUnit, timebaseStatus: timebaseStatus,
    };
    var win = _normWindow(windowRequest);
    var calibrationCapability = CR.deriveCalibrationCapability(CR.buildCalibrationSet(calibrationSet || []));
    var advisory = {
      validatedWindow: AW.validateAnalysisWindow(bundle, win, {}),
      calibrationCapability: calibrationCapability,
      channelEligibility: _channelEligibility(mappingEntries),
    };
    return {
      ok: true, kind: 'canonical_telemetry_session', schemaVersion: SCHEMA_VERSION, sessionId: sessionId || null,
      mappingEntries: mappingEntries.map(function (e) { return { rawColumnId: e.rawColumnId, rawName: e.rawName, canonicalChannel: e.canonicalChannel, userConfirmed: e.userConfirmed === true, projection: { scale: e.projection.scale, offset: e.projection.offset, sign: e.projection.sign }, rawUnit: e.rawUnit || null, canonicalUnit: e.canonicalUnit || null }; }),
      channels: channels, time: time, sampleRateHz: _isFiniteNum(sampleRateHz) ? sampleRateHz : null, sampleCount: time.length,
      timebaseStatus: timebaseStatus || null,
      calibrationSet: (calibrationSet || []).slice(), windowRequest: win,
      advisory: advisory, sourceMetadata: sourceMetadata || null, quality: advisory.validatedWindow.quality, blockedReasons: [], warnings: [],
    };
  }

  // advisory display: per-channel eligibility (the AUTHORITATIVE check is re-run in observation from mappingEntries)
  function _channelEligibility(mappingEntries) {
    var byCanon = {}, byCol = {};
    mappingEntries.forEach(function (e) { byCanon[e.canonicalChannel] = (byCanon[e.canonicalChannel] || 0) + 1; byCol[e.rawColumnId] = (byCol[e.rawColumnId] || 0) + 1; });
    var out = {};
    REQUIRED.forEach(function (canon) {
      var e = mappingEntries.filter(function (m) { return m.canonicalChannel === canon; });
      var ok = e.length === 1 && e[0].userConfirmed === true && _validProjection(e[0].projection) && byCanon[canon] === 1 && byCol[e[0].rawColumnId] === 1;
      out[canon] = { eligible: ok, reason: ok ? null : (e.length === 0 ? 'unmapped' : (e.length > 1 ? 'duplicate_canonical' : (!e[0].userConfirmed ? 'not_user_confirmed' : (!_validProjection(e[0].projection) ? 'bad_projection' : 'duplicate_column')))) };
    });
    return out;
  }
  function _validProjection(p) { return p && _isFiniteNum(p.scale) && p.scale !== 0 && _isFiniteNum(p.offset) && (p.sign === 1 || p.sign === -1); }

  function _resolveTime(imported, mappingEntries, colsById) {
    // 1) an explicit time mapping wins
    var te = mappingEntries.filter(function (e) { return e.canonicalChannel === 'time'; })[0];
    if (te && colsById[te.rawColumnId]) return _project(colsById[te.rawColumnId].values, te.rawUnit, 'time', te.projection);
    // 2) canonical_json carried a time array
    if (Array.isArray(imported.time)) return imported.time.slice();
    // 3) the import adapter's detected time column
    var tn = imported.timebase && imported.timebase.timeName;
    if (tn) { for (var id in colsById) { if (colsById[id].rawName && colsById[id].rawName.toLowerCase() === String(tn).toLowerCase()) { var u = colsById[id].rawUnit || 's'; return colsById[id].values.map(function (v) { return v == null ? null : (TC.convertToCanonical(v, u, 'time') != null ? TC.convertToCanonical(v, u, 'time') : v); }); } } }
    return [];
  }

  function buildCanonicalSession(imported, mapping, calibrationSet, windowRequest, opts) {
    opts = opts || {};
    if (!imported || imported.ok !== true) return { ok: false, kind: 'canonical_telemetry_session', errors: ['import_not_ok'], blockedReasons: [{ code: 'IMPORT_NOT_OK' }] };
    var colsById = {};
    (imported.rawChannels || []).forEach(function (c) { colsById[c.rawColumnId] = c; });
    var mappingEntries = (mapping && Array.isArray(mapping.mappingEntries)) ? mapping.mappingEntries : [];
    var time = _resolveTime(imported, mappingEntries, colsById);
    var timebaseStatus = (imported.timebase && imported.timebase.status) || null;
    var sessionId = opts.sessionId || (imported.sourceMetadata && imported.sourceMetadata.sessionId) || null;
    return _assemble(mappingEntries, colsById, time, opts.sampleRateHz != null ? opts.sampleRateHz : (imported.timebase && imported.timebase.sampleRateHz), calibrationSet, windowRequest, timebaseStatus, sessionId, imported.sourceMetadata);
  }

  // R2.2 back-compat: {parsed, definitions, sampleRateHz} + supplied legacy window → the same evidence session
  function coerceLegacySession(legacy, windowRequest) {
    legacy = legacy || {};
    var parsed = legacy.parsed;
    if (!parsed || !Array.isArray(parsed.columns)) return { ok: false, kind: 'canonical_telemetry_session', errors: ['no_parsed'], blockedReasons: [{ code: 'NO_PARSED' }] };
    var colsById = {};
    parsed.columns.forEach(function (c, i) { colsById[i] = { rawColumnId: i, rawName: c.rawName, rawUnit: c.rawUnit || null, values: c.values }; });
    var defs = legacy.definitions || { channels: {} };
    var reports = TC.mapChannels(parsed, defs);
    var mappingEntries = [];
    reports.forEach(function (r, i) {
      if (!r.canonicalName) return;
      if (r.status !== TC.GRADE.DEFINITION_CONFIRMED) return; // only user-confirmed channels enter analysis
      var canonUnit = CM.CANONICAL_UNITS[r.canonicalName];
      mappingEntries.push({ rawColumnId: i, rawName: r.rawName, canonicalChannel: r.canonicalName, userConfirmed: true, projection: { scale: 1, offset: 0, sign: 1 }, rawUnit: r.rawUnit || null, canonicalUnit: canonUnit !== undefined ? canonUnit : null });
    });
    var tel = TC.columnMap(parsed);
    var tb = TC.timebaseReport(tel);
    // time from the detected time column
    var time = [];
    if (tb.timeName) { var tn = tb.timeName; for (var id in colsById) { if (colsById[id].rawName && colsById[id].rawName.toLowerCase() === tn.toLowerCase()) { var u = tel.units[tn] || 's'; time = colsById[id].values.map(function (v) { return v == null ? null : (TC.convertToCanonical(v, u, 'time') != null ? TC.convertToCanonical(v, u, 'time') : v); }); break; } } }
    return _assemble(mappingEntries, colsById, time, legacy.sampleRateHz != null ? legacy.sampleRateHz : tb.sampleRateHz, [], windowRequest, tb.status, legacy.sessionId || null, { format: 'legacy', channelCount: mappingEntries.length });
  }

  function isCanonicalSession(s) { return !!(s && s.kind === 'canonical_telemetry_session'); }

  var api = { buildCanonicalSession: buildCanonicalSession, coerceLegacySession: coerceLegacySession, isCanonicalSession: isCanonicalSession, SCHEMA_VERSION: SCHEMA_VERSION, REQUIRED: REQUIRED, DIM: DIM };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CanonicalTelemetrySession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
