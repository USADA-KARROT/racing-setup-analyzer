/**
 * analysis-case-export.js — R2.3 §4.7: portable, versioned, FULLY-CLOSED Analysis Case export (PURE).
 *
 * exportAnalysisCase(input) → a versioned, JSON-safe bundle; parseAnalysisCaseExport(json) → re-validate.
 * The bundle is a CURATED, recursively CLOSED summary: every object node has a fixed key allowlist (an
 * unknown key ANYWHERE is rejected, not omitted), every leaf is a scalar / fixed-length / bounded array, no
 * deep case object is embedded (the `case` section is a scalar summary), and NO raw sample arrays can ride
 * in (no section schema has a values field; arrays are bounded). A private path/sample string leaf is
 * rejected (value-level detection that still allows units like `N/mm` and ratios like `60/80`). The SAME
 * schema validates export and parse (shared → no drift), so `parse(export(b))` deep-equals the bundle.
 *
 * Codex CP2 finding: closed "anywhere" — unknown top-level INPUT keys, unknown nested keys, and raw values
 * arrays must all be rejected; the case is summarized (not embedded) so its unknown keys can never leak in.
 *
 * UMD: Node require / Electron renderer global (AnalysisCaseExport).
 */
(function (root) {
  'use strict';

  var BUNDLE_SCHEMA_VERSION = '1.0.0';
  var MAX_ARRAY = 256; // bounded arrays (defensive raw-sample guard — no legitimate bundle field is longer)

  // ── value-level path/private detection (allows 'N/mm', '60/80'; rejects real paths/files/fingerprints) ──
  var _PATH_LIKE_RE = [
    /^[A-Za-z]:[\\/]/, /^\\\\/, /:\/\//, /^(file|data|smb|ftp|blob|javascript|vbscript|https?):/i,
    /(^|\s)\/(Users|home|tmp|private|var|Volumes|Applications)\//,
    /(^|[\/\\])(Users|Desktop|Documents|iCloud)([\/\\]|$)/, /個人資料/, /HFDP/i,
    /\.(csv|tsv|xlsx?|pdf|bmsbin|mat|mdf|ld|json|ssn|bin)($|[\/\\\s])/i, /^[0-9a-f]{32,}$/i,
  ];
  function _looksLikePath(s) { for (var i = 0; i < _PATH_LIKE_RE.length; i++) { if (_PATH_LIKE_RE[i].test(s)) return true; } return false; }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  // a section/object must be a PLAIN object — Date/RegExp/Map/class instances (own-enumerable-key-empty) must NOT slip through as {}
  function _isPlainObject(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }

  // ── recursive closed-schema validator ──
  // schema: 'scalar' | 'string' | 'number' | 'boolean' | {obj:{k:schema}} | {arr:itemSchema} | {boolMap:true}
  function _val(value, schema, pathStr, errors, depth) {
    depth = depth || 0;
    if (depth > 32) { errors.push('too_deep:' + pathStr); return null; }
    if (schema === 'scalar' || schema === 'string' || schema === 'number' || schema === 'boolean') {
      if (value == null) return (schema === 'scalar') ? null : (errors.push('null:' + pathStr), null);
      var t = typeof value;
      if (t === 'object') { errors.push('not_scalar:' + pathStr); return null; }
      if (schema === 'number') { if (!_isFiniteNum(value)) { errors.push('not_finite_number:' + pathStr); return null; } return value; }
      if (schema === 'boolean') { if (t !== 'boolean') { errors.push('not_boolean:' + pathStr); return null; } return value; }
      if (schema === 'string') { if (t !== 'string') { errors.push('not_string:' + pathStr); return null; } }
      if (t === 'number') { if (!_isFiniteNum(value)) { errors.push('not_finite:' + pathStr); return null; } return value; }
      if (t === 'string') { if (_looksLikePath(value)) { errors.push('private_leaf:' + pathStr); return null; } return value; } // EVERY string leaf is path-checked (no createdAt exemption — ISO timestamps start with a digit, never match)
      if (t === 'boolean') return value;
      errors.push('bad_scalar:' + pathStr); return null;
    }
    if (schema && schema.arr) {
      if (!Array.isArray(value)) { errors.push('not_array:' + pathStr); return []; }
      var cap = schema.max != null ? schema.max : MAX_ARRAY;
      if (value.length > cap) { errors.push('array_too_long:' + pathStr); return []; }
      var aout = []; for (var ai = 0; ai < value.length; ai++) { aout.push(_val(value[ai], schema.arr, pathStr + '[' + ai + ']', errors, depth + 1)); } return aout; // dense (sparse holes → validated null)
    }
    if (schema && schema.boolMap) {
      if (value == null) return {};
      if (!_isPlainObject(value)) { errors.push('not_object:' + pathStr); return {}; }
      var bm = {};
      Object.keys(value).forEach(function (k) { if (typeof value[k] !== 'boolean') errors.push('not_boolean:' + pathStr + '.' + k); else bm[k] = value[k]; });
      return bm;
    }
    if (schema && schema.obj) {
      if (value == null) return null;
      if (!_isPlainObject(value)) { errors.push('not_object:' + pathStr); return {}; }
      var out = {};
      Object.keys(value).forEach(function (k) {
        if (!Object.prototype.hasOwnProperty.call(schema.obj, k)) { errors.push('unknown_key:' + pathStr + '.' + k); return; } // CLOSED
      });
      if (schema.req) schema.req.forEach(function (rk) { if (!(rk in value)) errors.push('missing_required:' + pathStr + '.' + rk); });
      Object.keys(schema.obj).forEach(function (k) { if (k in value) out[k] = _val(value[k], schema.obj[k], pathStr + '.' + k, errors, depth + 1); });
      return out;
    }
    errors.push('bad_schema:' + pathStr); return null;
  }

  // ── section schemas ──
  var DETAIL = 'scalar'; // blocker detail kept scalar (string/null); structured details summarize to a string upstream
  var BLOCKER = { obj: { code: 'scalar', scope: 'scalar', severity: 'scalar', detail: { arr: 'string' }, parameterKey: 'scalar', sourceRef: 'scalar', layer: 'scalar' } };
  var MAPPING_ENTRY = { obj: { rawColumnId: 'number', rawName: 'string', canonicalChannel: 'string', userConfirmed: 'boolean', projection: { obj: { scale: 'number', offset: 'number', sign: 'number' }, req: ['scale', 'offset', 'sign'] }, rawUnit: 'scalar', canonicalUnit: 'scalar' }, req: ['rawColumnId', 'rawName', 'canonicalChannel', 'projection'] };
  var CALIB_ENTRY = { obj: { calibrationType: 'string', value: 'scalar', unit: 'scalar', source: 'string', confidence: 'string', verified: 'boolean', applicableSessionIds: { arr: 'string' }, createdAt: 'string' }, req: ['calibrationType', 'source', 'confidence', 'verified', 'createdAt'] };
  var BUNDLE_SCHEMA = { obj: {
    bundleSchemaVersion: 'string',
    meta: { obj: { bundleSchemaVersion: 'scalar', exportedAt: 'scalar', appModelVersion: 'scalar', note: 'scalar' } },
    case: { obj: { caseId: 'scalar', schemaVersion: 'scalar', modelId: 'scalar', modelVersion: 'scalar', calibrationVersion: 'scalar', canonicalContractVersion: 'scalar', vehicleProfileId: 'scalar', telemetrySessionId: 'scalar', modelInputEligible: 'boolean', title: 'scalar', createdAt: 'scalar' } },
    mapping: { obj: { entries: { arr: MAPPING_ENTRY } } },
    calibration: { obj: { entries: { arr: CALIB_ENTRY } } },
    window: { obj: { startTime: 'scalar', endTime: 'scalar', valid: 'boolean', sampleCount: 'scalar', steadyStateCount: 'scalar', duration: 'scalar', speedRange: { arr: 'number', max: 4 }, lateralAccelRange: { arr: 'number', max: 4 }, steeringSign: 'scalar', quality: 'scalar', rejectionReasons: { arr: 'string' } } },
    observation: { obj: { valid: 'boolean', observedTendency: 'scalar', confidence: 'scalar', method: 'scalar', metric: 'scalar', limitations: { arr: 'string' }, confounders: { arr: 'string' }, credibility: 'scalar', blockedReasons: { arr: BLOCKER } } },
    comparison: { obj: { valid: 'boolean', predictedTendency: 'scalar', observedTendency: 'scalar', differenceClass: 'scalar', confidence: 'scalar', assumptions: { arr: 'string' }, modelTelemetryComparisonEligible: 'boolean', credibility: 'scalar', blockedReasons: { arr: BLOCKER } } },
    raceEngineer: { obj: { eligible: { obj: { inspection: 'boolean', directional: 'boolean', quantitative: 'boolean' } }, summary: 'scalar', likelySubsystems: { arr: 'string' }, inspectionPriorities: { arr: 'string' }, setupDirections: { arr: 'string' }, trialOrder: { arr: 'string' }, missingEvidence: { arr: 'string' }, confidence: 'scalar', credibility: 'scalar' } },
    driverCoach: { obj: { eligible: 'boolean', observations: { arr: { obj: { type: 'scalar', code: 'scalar', qualitative: 'scalar', note: 'scalar', reversalCount: 'scalar', reversalRatePerS: 'scalar', abruptnessP95: 'scalar', unit: 'scalar', throttle: 'scalar', brake: 'scalar' } } }, practicePriorities: { arr: 'string' }, cannotConclude: { arr: 'string' }, confidence: 'scalar', credibility: 'scalar' } },
    capability: { obj: { caseAssembled: 'boolean', modelRunnable: 'boolean', modelRan: 'boolean', telemetryInspectable: 'boolean', telemetryObservable: 'boolean', modelTelemetryComparisonEligible: 'boolean', calibratedMagnitudeEligible: 'boolean', measuredKUsEligible: 'boolean', raceEngineerInspectionEligible: 'boolean', raceEngineerDirectionalEligible: 'boolean', driverCoachingEligible: 'boolean', quantitativeSetupRecommendationEligible: 'boolean', setupAbEligible: 'boolean' } },
    blockers: { arr: BLOCKER },
    warnings: { arr: 'string' },
  } };

  var INPUT_ALLOWLIST = ['meta', 'case', 'mapping', 'calibration', 'window', 'observation', 'comparison', 'raceEngineer', 'driverCoach', 'capability', 'blockers', 'warnings'];

  // extract a SCALAR-ONLY case summary from a full R2.1D case (unknown case keys never enter the bundle)
  function _caseSummary(c) {
    c = c || {};
    var ms = c.modelSnapshot || {}, vb = c.vehicleBinding || {}, tb = c.telemetryBinding || {}, md = c.caseMetadata || {}, cap = c.capabilityState || {};
    return { caseId: c.caseId || null, schemaVersion: c.schemaVersion || null, modelId: ms.modelId || null, modelVersion: ms.modelVersion || null, calibrationVersion: ms.calibrationVersion || null, canonicalContractVersion: ms.canonicalContractVersion || null, vehicleProfileId: vb.profileId || null, telemetrySessionId: tb.sessionId || null, modelInputEligible: cap.modelInputEligible === true, title: md.title || null, createdAt: md.createdAt || null };
  }
  // normalize a blocker detail (string/array/object) to a bounded scalar array
  function _detailArr(d) { if (d == null) return []; return (Array.isArray(d) ? d : [d]).slice(0, 16); } // wrap only; non-scalar items are left for the closed validator to REJECT (no transform/placeholder)
  function _blocker(b) { return _isPlainObject(b) ? Object.assign({}, b, { detail: _detailArr(b.detail) }) : b; } // non-plain (Date/RegExp/class/array) passes through → _val REJECTS it (no laundering)

  function _normBlockers(arr) { if (arr == null) return []; if (!Array.isArray(arr)) return arr; return arr.map(_blocker); }
  // shallow-copy each section (keep ALL keys so the closed schema can REJECT unknowns — never silently omit);
  // only the `case` is summarized to scalars, and blocker detail is normalized to a bounded scalar array.
  function _assemble(input) {
    input = input || {};
    var obs = input.observation === undefined ? {} : (_isPlainObject(input.observation) ? Object.assign({}, input.observation) : input.observation); // non-plain (Date/class) passes through so _val REJECTS it (no Object.assign laundering)
    if (_isPlainObject(obs)) obs.blockedReasons = _normBlockers(obs.blockedReasons);
    var cmp = input.comparison === undefined ? {} : (_isPlainObject(input.comparison) ? Object.assign({}, input.comparison) : input.comparison);
    if (_isPlainObject(cmp)) cmp.blockedReasons = _normBlockers(cmp.blockedReasons);
    return {
      bundleSchemaVersion: BUNDLE_SCHEMA_VERSION,
      meta: input.meta === undefined ? { bundleSchemaVersion: BUNDLE_SCHEMA_VERSION } : (_isPlainObject(input.meta) ? Object.assign({ bundleSchemaVersion: BUNDLE_SCHEMA_VERSION }, input.meta) : input.meta), // non-plain meta passes through → _val REJECTS it
      case: input.case !== undefined ? input.case : {},                // PASS-THROUGH scalar summary (caller builds it via caseSummary()); closed-validated, no transform
      mapping: input.mapping !== undefined ? input.mapping : { entries: [] },        // passed THROUGH → schema rejects unknowns
      calibration: input.calibration !== undefined ? input.calibration : { entries: [] },
      window: input.window !== undefined ? input.window : {},
      observation: obs,                                                // shallow copy + normalized blocker detail
      comparison: cmp,
      raceEngineer: input.raceEngineer !== undefined ? input.raceEngineer : {},
      driverCoach: input.driverCoach !== undefined ? input.driverCoach : {},
      capability: input.capability !== undefined ? input.capability : {},
      blockers: _normBlockers(input.blockers),
      warnings: input.warnings !== undefined ? input.warnings : [],
    };
  }

  function exportAnalysisCase(input) {
    try {
      var errors = [];
      if (input != null && typeof input === 'object' && !Array.isArray(input)) {
        Object.keys(input).forEach(function (k) { if (INPUT_ALLOWLIST.indexOf(k) === -1) errors.push('unknown_input_key:' + k); }); // CLOSED input
        if (input.case != null && !_isPlainObject(input.case)) errors.push('case_not_object');
      } else { errors.push('input_not_object'); }
      var bundle = _val(_assemble(input), BUNDLE_SCHEMA, '', errors);
      return { ok: errors.length === 0, bundle: bundle, errors: errors };
    } catch (e) { return { ok: false, bundle: null, errors: ['export_exception'] }; } // exotic/getter/Proxy → fail-closed, never throw
  }

  function parseAnalysisCaseExport(json) {
    var obj;
    try { obj = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return { ok: false, errors: ['invalid_json'], bundle: null }; }
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, errors: ['bundle_not_object'], bundle: null };
    try {
      var errors = [];
      if (obj.bundleSchemaVersion !== BUNDLE_SCHEMA_VERSION) errors.push('incompatible_bundle_schema_version');
      var bundle = _val(obj, BUNDLE_SCHEMA, '', errors); // SAME closed schema (no drift; unknown key anywhere rejected)
      return { ok: errors.length === 0, errors: errors, bundle: bundle };
    } catch (e) { return { ok: false, errors: ['parse_exception'], bundle: null }; }
  }

  var api = { exportAnalysisCase: exportAnalysisCase, parseAnalysisCaseExport: parseAnalysisCaseExport, caseSummary: _caseSummary, BUNDLE_SCHEMA_VERSION: BUNDLE_SCHEMA_VERSION, INPUT_ALLOWLIST: INPUT_ALLOWLIST };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisCaseExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
