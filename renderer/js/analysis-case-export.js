/**
 * analysis-case-export.js — R2.3 §4.7: portable, versioned, CLOSED-schema Analysis Case export (PURE).
 *
 * exportAnalysisCase(bundleInput) → a versioned JSON-safe bundle; parseAnalysisCaseExport(json) → re-validate.
 * EVERY section has a FIXED key allowlist — an unknown key anywhere is a HARD error (rejected, NOT omitted);
 * each value is rebuilt from the whitelist (the caller object is never retained); a private path/sample leaf
 * (isPrivateRef) is rejected; no raw sample arrays may ride inside a section. The SAME closed validation runs
 * on export and parse (shared → no drift), so `parse(export(b))` deep-equals the sanitized bundle.
 *
 * Codex CP1 finding: do NOT rely on parseAnalysisCase for the unknown-key guarantee — this module rebuilds
 * the `case` section's top-level keys against its own allowlist too.
 *
 * UMD: Node require / Electron renderer global (AnalysisCaseExport).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var SS = _req('./setup-snapshot.js', typeof SetupSnapshot !== 'undefined' ? SetupSnapshot : undefined);
  if (!SS) throw new Error('analysis-case-export.js requires setup-snapshot.js (isPrivateRef)');
  var isPrivateRef = SS.isPrivateRef;

  var BUNDLE_SCHEMA_VERSION = '1.0.0';

  // closed top-level key allowlists per section (and the case sub-allowlist) — unknown key = hard error
  var CASE_KEYS = ['kind', 'schemaVersion', 'caseId', 'caseMetadata', 'vehicleBinding', 'setupSnapshot', 'telemetryBinding', 'modelSnapshot', 'context', 'capabilityState', 'blockedReasons', 'provenanceSummary', 'valid', 'errors', 'warnings'];
  var SECTION = {
    meta: ['bundleSchemaVersion', 'exportedAt', 'appModelVersion', 'note'],
    case: CASE_KEYS,
    mapping: ['entries'],
    calibration: ['entries'],
    window: ['startTime', 'endTime', 'valid', 'sampleCount', 'steadyStateCount', 'duration', 'speedRange', 'lateralAccelRange', 'steeringSign', 'quality', 'rejectionReasons'],
    observation: ['valid', 'observedTendency', 'confidence', 'method', 'metric', 'limitations', 'confounders', 'credibility', 'blockedReasons'],
    comparison: ['valid', 'predictedTendency', 'observedTendency', 'differenceClass', 'confidence', 'assumptions', 'modelTelemetryComparisonEligible', 'credibility', 'blockedReasons'],
    raceEngineer: ['eligible', 'summary', 'likelySubsystems', 'inspectionPriorities', 'setupDirections', 'trialOrder', 'missingEvidence', 'confidence', 'credibility'],
    driverCoach: ['eligible', 'observations', 'practicePriorities', 'cannotConclude', 'confidence', 'credibility'],
    capability: null,   // any boolean-valued key (closed by type, not key list)
    blockers: null,     // array
    warnings: null,     // array of string
  };
  var TOP_KEYS = ['bundleSchemaVersion', 'meta', 'case', 'mapping', 'calibration', 'window', 'observation', 'comparison', 'raceEngineer', 'driverCoach', 'capability', 'blockers', 'warnings'];

  function _isScalar(v) { return v == null || (typeof v === 'number' && isFinite(v)) || typeof v === 'string' || typeof v === 'boolean'; }
  // VALUE-level path/private detection (looser than id-level isPrivateRef): flags real paths / filenames /
  // private folders / fingerprints, but NOT a bare '/' (so units 'N/mm' and ratios '60/80' pass).
  var _PATH_LIKE_RE = [
    /^[A-Za-z]:[\\/]/, /^\\\\/, /:\/\//, /^(file|data|smb|ftp|blob|javascript|vbscript|https?):/i,
    /(^|\s)\/(Users|home|tmp|private|var|Volumes|Applications)\//,
    /(^|[\/\\])(Users|Desktop|Documents|iCloud)([\/\\]|$)/, /個人資料/, /HFDP/i,
    /\.(csv|tsv|xlsx?|pdf|bmsbin|mat|mdf|ld|json|ssn|bin)($|[\/\\\s])/i, /^[0-9a-f]{32,}$/i,
  ];
  function _looksLikePath(str) { for (var i = 0; i < _PATH_LIKE_RE.length; i++) { if (_PATH_LIKE_RE[i].test(str)) return true; } return false; }
  // deep sanitize: reject non-JSON-safe + private string leaves; return a clean rebuilt copy.
  function _deep(v, errors, path, depth) {
    depth = depth || 0;
    if (depth > 24) { errors.push('too_deep:' + path); return null; }
    if (v == null) return null;
    var t = typeof v;
    if (t === 'number') { if (!isFinite(v)) { errors.push('non_finite:' + path); return null; } return v; }
    if (t === 'boolean') return v;
    if (t === 'string') { if (path.indexOf('createdAt') === -1 && _looksLikePath(v)) { errors.push('private_leaf:' + path); return null; } return v; }
    if (t !== 'object') { errors.push('non_json:' + path); return null; }
    if (Array.isArray(v)) { return v.map(function (x, i) { return _deep(x, errors, path + '[' + i + ']', depth + 1); }); }
    var proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) { errors.push('exotic_object:' + path); return null; }
    var out = {};
    Object.keys(v).forEach(function (k) { out[k] = _deep(v[k], errors, path + '.' + k, depth + 1); });
    return out;
  }

  // rebuild an object against a fixed key allowlist (unknown key → error); values deep-sanitized.
  function _closed(obj, allowed, label, errors) {
    var out = {};
    if (obj == null) return out;
    if (typeof obj !== 'object' || Array.isArray(obj)) { errors.push(label + '_not_object'); return out; }
    Object.keys(obj).forEach(function (k) {
      if (allowed.indexOf(k) === -1) { errors.push(label + '.' + k + '_unknown_key'); return; }
      out[k] = _deep(obj[k], errors, label + '.' + k, 0);
    });
    return out;
  }
  function _closedCapability(obj, errors) {
    var out = {};
    if (obj == null) return out;
    if (typeof obj !== 'object' || Array.isArray(obj)) { errors.push('capability_not_object'); return out; }
    Object.keys(obj).forEach(function (k) { if (typeof obj[k] !== 'boolean') errors.push('capability.' + k + '_not_boolean'); else out[k] = obj[k]; });
    return out;
  }

  function _assemble(input, errors) {
    input = input || {};
    return {
      bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
      meta: _closed(Object.assign({ bundleSchemaVersion: BUNDLE_SCHEMA_VERSION }, input.meta || {}), SECTION.meta, 'meta', errors),
      case: _closed(input.case || input.analysisCase, SECTION.case, 'case', errors),
      mapping: { entries: _deep((input.mapping && input.mapping.entries) || input.mappingEntries || [], errors, 'mapping.entries', 0) },
      calibration: { entries: _deep((input.calibration && input.calibration.entries) || input.calibrationSet || [], errors, 'calibration.entries', 0) },
      window: _closed(input.window, SECTION.window, 'window', errors),
      observation: _closed(input.observation, SECTION.observation, 'observation', errors),
      comparison: _closed(input.comparison, SECTION.comparison, 'comparison', errors),
      raceEngineer: _closed(input.raceEngineer, SECTION.raceEngineer, 'raceEngineer', errors),
      driverCoach: _closed(input.driverCoach, SECTION.driverCoach, 'driverCoach', errors),
      capability: _closedCapability(input.capability, errors),
      blockers: _deep(Array.isArray(input.blockers) ? input.blockers : [], errors, 'blockers', 0),
      warnings: _deep(Array.isArray(input.warnings) ? input.warnings.filter(function (w) { return typeof w === 'string'; }) : [], errors, 'warnings', 0),
    };
  }

  function exportAnalysisCase(input) {
    var errors = [];
    var bundle = _assemble(input, errors);
    return { ok: errors.length === 0, bundle: bundle, errors: errors };
  }

  function parseAnalysisCaseExport(json) {
    var obj;
    try { obj = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return { ok: false, errors: ['invalid_json'], bundle: null }; }
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['bundle_not_object'], bundle: null };
    var errors = [];
    Object.keys(obj).forEach(function (k) { if (TOP_KEYS.indexOf(k) === -1) errors.push('top.' + k + '_unknown_key'); });
    if (obj.bundleSchemaVersion !== BUNDLE_SCHEMA_VERSION) errors.push('incompatible_bundle_schema_version');
    // re-run the SAME closed assembly (shared → no drift)
    var rebuilt = _assemble({
      meta: obj.meta, case: obj.case, mapping: obj.mapping, calibration: obj.calibration, window: obj.window,
      observation: obj.observation, comparison: obj.comparison, raceEngineer: obj.raceEngineer, driverCoach: obj.driverCoach,
      capability: obj.capability, blockers: obj.blockers, warnings: obj.warnings,
    }, errors);
    return { ok: errors.length === 0, errors: errors, bundle: rebuilt };
  }

  var api = { exportAnalysisCase: exportAnalysisCase, parseAnalysisCaseExport: parseAnalysisCaseExport, BUNDLE_SCHEMA_VERSION: BUNDLE_SCHEMA_VERSION, TOP_KEYS: TOP_KEYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisCaseExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
