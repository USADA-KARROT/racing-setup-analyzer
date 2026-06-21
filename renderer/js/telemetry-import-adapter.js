/**
 * telemetry-import-adapter.js — R2.3 §4.2: imported-telemetry adapter framework (PURE, parser-only).
 *
 * importTelemetry(source, opts) → a uniform raw-channel bundle. It NEVER produces a handling conclusion —
 * it only parses + structurally describes. First version: generic CSV (via telemetry-core.parseCsv) and a
 * canonical-JSON session. Extensible via a small adapter registry.
 *
 * RED LINES (Codex CP1):
 *  • Parser only — no canonical mapping, no calibration, no observation, no handling claim.
 *  • Stable column identity: every raw channel carries an immutable `rawColumnId` (column INDEX). DUPLICATE
 *    headers are REJECTED at import (fail-closed) so a later assignment can never select the wrong physical
 *    column (telemetry-core.columnMap collapses by lower-cased name; we refuse that ambiguity up front).
 *  • Pure; imports telemetry-core only; never mutates input; no file paths / private data retained.
 *
 * UMD: Node require / Electron renderer global (TelemetryImportAdapter).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var TC = _req('./telemetry-core.js', typeof TelemetryCore !== 'undefined' ? TelemetryCore : undefined);
  if (!TC) throw new Error('telemetry-import-adapter.js requires telemetry-core.js');

  var SUPPORTED_FORMATS = ['csv', 'canonical_json'];

  function _err(code, detail) { return { code: code, detail: detail != null ? detail : null }; }
  function _fail(code, detail, partial) {
    return Object.assign({ ok: false, sourceMetadata: null, rawChannels: [], timebase: null, sampleCount: 0, warnings: [], parseErrors: [_err(code, detail)] }, partial || {});
  }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }

  function importTelemetry(source, opts) {
    try { return _importInner(source, opts || {}); }
    catch (e) { return _fail('IMPORT_EXCEPTION', String(e && e.message || e)); }
  }
  function _importInner(source, opts) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return _fail('INVALID_SOURCE', 'source must be an object');
    if (SUPPORTED_FORMATS.indexOf(source.format) === -1) return _fail('UNSUPPORTED_FORMAT', String(source.format));
    if (source.format === 'csv') return _importCsv(source.text, opts);
    return _importCanonicalJson(source.object != null ? source.object : source.text, opts);
  }

  // ── CSV path (reuses telemetry-core.parseCsv; rejects duplicate headers) ──
  function _importCsv(text, opts) {
    var parsed = TC.parseCsv(text);
    var parseErrors = (parsed.errors || []).map(function (e) { return _err(e.code || 'PARSE_ERROR', e.message || String(e)); });
    var warnings = (parsed.warnings || []).map(function (w) { return _err(w.code || 'WARNING', w.message || String(w)); });
    if (parseErrors.length) return _fail(parseErrors[0].code, parseErrors[0].detail, { warnings: warnings, parseErrors: parseErrors });

    // reject duplicate headers (case-insensitive) — ambiguous physical column identity
    var seen = {}, dup = null;
    (parsed.columns || []).forEach(function (c) { var k = String(c.rawName).toLowerCase(); if (seen[k] != null) dup = c.rawName; else seen[k] = true; });
    if (dup != null) return _fail('CSV_DUPLICATE_HEADER', 'duplicate header "' + dup + '" — ambiguous column identity', { warnings: warnings });

    var rawChannels = (parsed.columns || []).map(function (c, i) {
      return { rawColumnId: i, rawName: c.rawName, rawUnit: c.rawUnit || null, values: c.values.slice(), missingCount: c.missingCount, invalidCount: c.invalidCount };
    });
    var tel = TC.columnMap(parsed);
    var tb = TC.timebaseReport(tel);
    return {
      ok: true,
      sourceMetadata: { format: 'csv', channelCount: rawChannels.length, rowCount: parsed.rowCount },
      rawChannels: rawChannels,
      timebase: { hasTime: tb.hasTime, timeName: tb.timeName || null, sampleRateHz: tb.sampleRateHz, monotonic: tb.monotonic, resets: tb.resets, dups: tb.dups, gaps: tb.gaps, status: tb.status },
      sampleCount: parsed.rowCount,
      warnings: warnings,
      parseErrors: [],
    };
  }

  // ── canonical-JSON session path (closed schema; parser-only) ──
  // shape: { schemaVersion, sessionId?, sampleRateHz?, time:[s], channels:{ <name>:{ values:[], unit } } }
  var _CANON_SESSION_KEYS = ['schemaVersion', 'sessionId', 'sampleRateHz', 'time', 'channels'];
  function _importCanonicalJson(obj, opts) {
    if (obj == null) return _fail('INVALID_CANONICAL_JSON', 'null session');
    if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch (e) { return _fail('INVALID_JSON', String(e && e.message || e)); } }
    if (typeof obj !== 'object' || Array.isArray(obj)) return _fail('INVALID_CANONICAL_JSON', 'session must be an object');
    var unknown = Object.keys(obj).filter(function (k) { return _CANON_SESSION_KEYS.indexOf(k) === -1; });
    if (unknown.length) return _fail('CANONICAL_JSON_UNKNOWN_KEY', unknown[0]);
    if (!Array.isArray(obj.time)) return _fail('CANONICAL_JSON_BAD_TIME', 'time must be an array');
    var time = obj.time;
    for (var t = 0; t < time.length; t++) { if (time[t] != null && !_isFiniteNum(time[t])) return _fail('CANONICAL_JSON_NON_FINITE_TIME', 'index ' + t); }
    var channels = obj.channels;
    if (channels == null || typeof channels !== 'object' || Array.isArray(channels)) return _fail('CANONICAL_JSON_BAD_CHANNELS', 'channels must be an object');
    var names = Object.keys(channels), seenName = {};
    var rawChannels = [];
    for (var i = 0; i < names.length; i++) {
      var nm = names[i], ch = channels[nm];
      var lk = nm.toLowerCase(); if (seenName[lk] != null) return _fail('CSV_DUPLICATE_HEADER', 'duplicate channel "' + nm + '"'); seenName[lk] = true;
      if (!ch || typeof ch !== 'object' || Array.isArray(ch) || !Array.isArray(ch.values)) return _fail('CANONICAL_JSON_BAD_CHANNEL', nm);
      var chKeys = Object.keys(ch).filter(function (k) { return k !== 'values' && k !== 'unit'; });
      if (chKeys.length) return _fail('CANONICAL_JSON_CHANNEL_UNKNOWN_KEY', nm + '.' + chKeys[0]);
      if (ch.values.length !== time.length) return _fail('CANONICAL_JSON_LENGTH_MISMATCH', nm + ' (' + ch.values.length + ' vs ' + time.length + ')');
      var miss = 0, inv = 0;
      for (var v = 0; v < ch.values.length; v++) { var val = ch.values[v]; if (val == null) miss++; else if (!_isFiniteNum(val)) inv++; }
      rawChannels.push({ rawColumnId: i, rawName: nm, rawUnit: (typeof ch.unit === 'string' ? ch.unit : null), values: ch.values.slice(), missingCount: miss, invalidCount: inv });
    }
    // synthesize timebase from the time array
    var monotonic = true, resets = 0; var prev = null;
    for (var k = 0; k < time.length; k++) { if (time[k] == null) continue; if (prev != null && time[k] < prev) { monotonic = false; resets++; } prev = time[k]; }
    var sr = _isFiniteNum(obj.sampleRateHz) ? obj.sampleRateHz : null;
    return {
      ok: true,
      sourceMetadata: { format: 'canonical_json', channelCount: rawChannels.length, rowCount: time.length, schemaVersion: typeof obj.schemaVersion === 'string' ? obj.schemaVersion : null },
      rawChannels: rawChannels,
      timebase: { hasTime: true, timeName: 'time', sampleRateHz: sr, monotonic: monotonic, resets: resets, dups: 0, gaps: 0, status: monotonic ? TC.GRADE.DEFINITION_CONFIRMED : TC.GRADE.BLOCKED },
      sampleCount: time.length,
      // time goes into rawChannels-adjacent metadata so the session builder can use it
      time: time.slice(),
      warnings: [],
      parseErrors: [],
    };
  }

  var api = { importTelemetry: importTelemetry, SUPPORTED_FORMATS: SUPPORTED_FORMATS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TelemetryImportAdapter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
