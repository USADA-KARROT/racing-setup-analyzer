/**
 * analysis-case.js — R2.1D: Minimal AnalysisCase data contract (PURE binding container).
 *
 * Binds VehicleProfile + SetupSnapshot + TelemetrySessionRef + ModelSnapshot into ONE versioned,
 * serializable, fail-closed analysis case. It answers only: which car/profile, which actual setup,
 * which telemetry session, which model+calibration version, what is allowed, what is blocked and why.
 *
 * IT IS NOT AN ANALYSIS ENGINE. RED LINES (must not break):
 *  • No model run, no model output, no predicted-vs-observed, no measured K_us, no setup recommendation,
 *    no Advisor, no overlay. Imports only canonical-parameters + parameter-conversions + setup-snapshot.
 *  • An INCOMPLETE case is still assembled & savable — but it must honestly report modelInputEligible /
 *    comparisonEligible / recommendationEligible = false, with structured blockedReasons. No generic fill.
 *  • capabilityState is DERIVED from data by a pure function; the caller can NEVER inject/override it
 *    (a tampered capability or a tampered modelUsable is recomputed and rejected).
 *  • Opaque ids only — never a path / filename / private folder / fingerprint. No raw telemetry samples,
 *    no raw binary, no CSV text inside the case. The R2.1A three layers are never flattened.
 *  • modelTelemetryComparisonEligible and setupRecommendationEligible are HARD false in v1.
 *
 * UMD: Node require / Electron renderer global (AnalysisCase).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var CP = _req('./canonical-parameters.js', typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : undefined);
  var PC = _req('./parameter-conversions.js', typeof ParameterConversions !== 'undefined' ? ParameterConversions : undefined);
  var SS = _req('./setup-snapshot.js', typeof SetupSnapshot !== 'undefined' ? SetupSnapshot : undefined);
  if (!CP || !PC || !SS) throw new Error('analysis-case.js requires canonical-parameters + parameter-conversions + setup-snapshot');

  var isPrivateRef = SS.isPrivateRef;
  var CANONICAL_UNIT_KEYS = CP.CANONICAL_UNIT; // closed set of valid canonical parameter keys (key → unit)
  var SCHEMA_VERSION = '1.0.0';

  // canonical inputs the physics core would minimally need (used only to DECIDE eligibility, never to run)
  var REQUIRED_MODEL_INPUTS = [
    'frontWheelRateNmm', 'rearWheelRateNmm', 'frontArbRollStiffnessNmDeg', 'rearArbRollStiffnessNmDeg',
    'frontTrackMm', 'rearTrackMm', 'wheelbaseMm', 'massKg', 'frontWeightPct',
    'cgHeightMm', 'frontRollCentreHeightMm', 'rearRollCentreHeightMm',
  ];

  var BLOCKER_CODE = Object.freeze({
    MISSING_REQUIRED_CANONICAL_PARAMETER: 'MISSING_REQUIRED_CANONICAL_PARAMETER',
    UNRESOLVED_SETUP_SELECTION: 'UNRESOLVED_SETUP_SELECTION',
    ARB_MOTION_RATIO_UNCONFIRMED: 'ARB_MOTION_RATIO_UNCONFIRMED',
    STEERING_CALIBRATION_UNCONFIRMED: 'STEERING_CALIBRATION_UNCONFIRMED',
    TELEMETRY_TIMEBASE_UNCONFIRMED: 'TELEMETRY_TIMEBASE_UNCONFIRMED',
    MODEL_INPUT_INCOMPLETE: 'MODEL_INPUT_INCOMPLETE',
    MODEL_COMPARISON_NOT_IMPLEMENTED: 'MODEL_COMPARISON_NOT_IMPLEMENTED',
    RECOMMENDATION_NOT_IMPLEMENTED: 'RECOMMENDATION_NOT_IMPLEMENTED',
    PRIVATE_SOURCE_REFERENCE_FORBIDDEN: 'PRIVATE_SOURCE_REFERENCE_FORBIDDEN',
    CAPABILITY_TAMPERED: 'CAPABILITY_TAMPERED',
    FORBIDDEN_FIELD_PRESENT: 'FORBIDDEN_FIELD_PRESENT',
    TELEMETRY_SESSION_SCHEMA_INCOMPATIBLE: 'TELEMETRY_SESSION_SCHEMA_INCOMPATIBLE',
  });
  var _BLOCKER_SCOPE = Object.freeze({ VEHICLE: 'vehicle', SETUP: 'setup', TELEMETRY: 'telemetry', MODEL: 'model', CASE: 'case' });

  // object KEY names that must never appear anywhere in a case (analysis results / overlays / outputs)
  var FORBIDDEN_KEYS = [
    'measuredkus', 'measured_kus', 'setuprecommendation', 'setup_recommendation', 'recommendationoutput',
    'modeloverlay', 'model_overlay', 'overlay', 'predictedvsobserved', 'predicted_vs_observed',
    'advisoroutput', 'modeloutput', 'predictedkus', 'yawgainoutput', 'laptimeoutput',
  ];
  // telemetry keys that would smuggle raw data into the case. Intent-specific names only — generic
  // English words ('path'/'csv'/'filename') are deliberately NOT here (a future adapter may want them);
  // a private VALUE under any key is caught separately by the string-leaf isPrivateRef scan below.
  var FORBIDDEN_TELEMETRY_KEYS = ['samples', 'rawsamples', 'samplearray', 'rawdata', 'csvtext', 'rawbinary', 'fingerprint', 'filepath', 'sourcepath', 'rawfile'];

  function _major(v) { return (typeof v === 'string' && /^\d+(\.|$)/.test(v)) ? v.split('.')[0] : null; }
  function _isCompat(ver) { return _major(ver) === _major(SCHEMA_VERSION); }
  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  var _PVR_RE = [
    /^[A-Za-z]:[\\/]/, /^\\\\/,                                       // windows drive, UNC
    /:\/\//, /^(file|data|smb|ftp|blob|javascript|vbscript|https?):/i, // scheme:// or scheme:
    /(^|\s)\/(Users|home|tmp|private|var|Volumes|Applications)\//,
    /(^|[\/\\])(Users|Desktop|Documents|iCloud)([\/\\]|$)/,
    /個人資料/, /HFDP/i,
    /(^|\s)[^\s\/\\]+\.(csv|tsv|xlsx?|pdf|bmsbin|mat|mdf|ld|json|ssn|bin)(\s|$)/i,
    /^[0-9a-f]{32,}$/i,
  ];
  function _pvrDecode(s) { var out = s; for (var i = 0; i < 3; i++) { var prev = out; out = out.replace(/%u([0-9a-fA-F]{4})/g, function (_m, h) { return String.fromCharCode(parseInt(h, 16)); }); if (/%[0-9a-fA-F]{2}/.test(out)) { try { out = decodeURIComponent(out.replace(/\+/g, '%20')); } catch (e) { return { value: out, malformed: true }; } } if (out === prev) break; } return { value: out, malformed: false }; }
  function _containsPrivateValueRef(s) {
    if (typeof s !== 'string' || !s) return false;
    var hit = function (x) { for (var i = 0; i < _PVR_RE.length; i++) { if (_PVR_RE[i].test(x)) return true; } return false; };
    if (hit(s)) return true;
    var d = _pvrDecode(s);
    return d.malformed || hit(d.value); // multi-decode + malformed fail-closed
  }
  // deep clone of plain JSON data → caller input is never mutated and the case is isolated from it.
  function _clone(o) { try { return JSON.parse(JSON.stringify(o == null ? null : o)); } catch (e) { return null; } }
  function _isScalar(v) { return v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'; }
  function _privateLike(v) { return typeof v === 'string' && (isPrivateRef(v) || _containsPrivateValueRef(v)); }
  // FAIL-CLOSED on non-JSON-safe input (Map/Set/Date/TypedArray/function/symbol/bigint) so the JSON clone
  // cannot silently coerce it into a valid-but-altered case.
  function _isJsonSafe(v, depth) {
    try {
      depth = depth || 0;
      if (depth > 24) return false;                            // cyclic / too deep → fail closed
      if (v == null) return true;
      var t = typeof v;
      if (t === 'number') return Number.isFinite(v);           // NaN / Infinity / -Infinity rejected
      if (t === 'string' || t === 'boolean') return true;
      if (t !== 'object') return false;                        // function / symbol / bigint
      if (Array.isArray(v)) {
        var ak = Reflect.ownKeys(v);
        for (var ai = 0; ai < ak.length; ai++) {
          var akk = ak[ai];
          if (akk === 'length') continue;                      // the only allowed non-enumerable on an array
          if (typeof akk === 'symbol') return false;           // symbol own key on the array object
          var ad = Object.getOwnPropertyDescriptor(v, akk);
          if (!ad || !ad.enumerable || typeof ad.get === 'function' || typeof ad.set === 'function') return false;
          if (!_isJsonSafe(ad.value, depth + 1)) return false;
        }
        return true;
      }
      var proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null) return false; // Map/Set/Date/TypedArray/Proxy-exotic/host
      var keys = Reflect.ownKeys(v);                           // includes symbol + non-enumerable own keys
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (typeof k === 'symbol') return false;               // symbol own key
        var desc = Object.getOwnPropertyDescriptor(v, k);
        if (!desc || !desc.enumerable) return false;           // non-enumerable own property
        if (typeof desc.get === 'function' || typeof desc.set === 'function') return false; // accessor — never run getter
        if (!_isJsonSafe(desc.value, depth + 1)) return false; // descriptor value, never v[k]
      }
      return true;
    } catch (e) { return false; } // getter / Proxy trap threw → fail closed
  }

  // CLOSED schemas: each summary has a FIXED set of allowed keys and a per-key type/enum spec. NOT an
  // "any key flat scalar map" — an unknown key is a hard error, a value off-type/enum is rejected, and a
  // non-finite number / array / nested object never enters. No length / base64 / key-blacklist heuristics.
  var CHANNEL_STATE_ENUM = ['confirmed', 'provisional', 'unconfirmed', 'unavailable', 'present', 'absent', 'detected'];
  var QUALITY_VALUE_ENUM = ['low', 'medium', 'high', 'good', 'fair', 'poor', 'ok', 'none', 'partial', 'full', 'unknown', 'nominal'];
  var _CHANNEL_KEYS = ['speed', 'steeringRaw', 'steeringWheelAngle', 'roadWheelAngle', 'yawRate', 'lateralAcceleration', 'longitudinalAcceleration', 'throttle', 'brakePressure', 'rpm', 'gear', 'wheelSpeedFL', 'wheelSpeedFR', 'wheelSpeedRL', 'wheelSpeedRR', 'damperFL', 'damperFR', 'damperRL', 'damperRR', 'rideHeightFront', 'rideHeightRear', 'tyrePressureFL', 'tyrePressureFR', 'tyrePressureRL', 'tyrePressureRR'];
  function _enumSchema(keys, vals) { var s = {}; keys.forEach(function (k) { s[k] = { kind: 'enum', values: vals }; }); return s; }
  var TELEMETRY_SCHEMAS = {
    channelCapabilitySummary: _enumSchema(_CHANNEL_KEYS, CHANNEL_STATE_ENUM),
    qualitySummary: { sampleRateHz: { kind: 'number' }, sampleCount: { kind: 'number' }, durationS: { kind: 'number' }, completeness: { kind: 'number' }, noise: { kind: 'number' }, dropout: { kind: 'enum', values: QUALITY_VALUE_ENUM }, sync: { kind: 'enum', values: QUALITY_VALUE_ENUM } },
    confirmationState: _enumSchema(['timebase', 'steeringCalibration', 'units', 'scaling', 'sync', 'dropout'], CHANNEL_STATE_ENUM),
  };
  // Validate an object against a {key → {kind}} schema. Returns the cleaned (whitelist-rebuilt) map and
  // pushes errors. SHARED by create and validate (and therefore parse) so the rule can never drift.
  function _sanitizeBySchema(obj, schema, label, errors) {
    var clean = {};
    if (obj == null) return clean;
    if (typeof obj !== 'object' || Array.isArray(obj)) { errors.push(label + '_not_object'); return clean; }
    Object.keys(obj).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(schema, k)) { errors.push(label + '.' + k + '_unknown_key'); return; } // prototype-safe: 'constructor'/'__proto__' are unknown keys
      var spec = schema[k];
      var v = obj[k];
      if (spec.kind === 'number') { if (typeof v === 'number' && isFinite(v)) clean[k] = v; else errors.push(label + '.' + k + '_not_finite_number'); return; }
      if (spec.kind === 'enum') { if (typeof v === 'string' && spec.values.indexOf(v) !== -1) clean[k] = v; else errors.push(label + '.' + k + '_value_not_allowed'); return; }
      if (spec.kind === 'boolean') { if (typeof v === 'boolean') clean[k] = v; else errors.push(label + '.' + k + '_not_boolean'); return; }
      errors.push(label + '.' + k + '_bad_spec');
    });
    return clean;
  }

  // CLOSED schema for the canonical input snapshot: real canonical-parameter keys only; each value is
  // REBUILT from a fixed field whitelist via makeCanonicalParameter (the caller object is NEVER retained),
  // and any undefined extra field is a hard error — so no payload can hide inside a canonical parameter.
  var _CANON_PARAM_FIELDS = ['kind', 'parameter', 'value', 'unit', 'provenance', 'confidence', 'conversionStatus', 'applicability', 'conversionRef', 'sourceRef', 'legacyUseWheelRate', 'modelUsable', 'blockers', 'valid', 'errors'];
  function _rebuildCanonicalParam(p) {
    return CP.makeCanonicalParameter({ parameter: p.parameter, value: p.value, provenance: p.provenance, confidence: p.confidence, conversionStatus: p.conversionStatus, applicability: p.applicability, conversionRef: p.conversionRef, sourceRef: p.sourceRef, blockers: p.blockers, legacyUseWheelRate: p.legacyUseWheelRate });
  }
  function _canonParamExtraFields(p) { return Object.keys(p).filter(function (f) { return _CANON_PARAM_FIELDS.indexOf(f) === -1; }); }
  function _sanitizeCanonicalInputSnapshot(obj, errors) {
    var clean = {};
    if (obj == null) return clean;
    if (typeof obj !== 'object' || Array.isArray(obj)) { errors.push('canonical_input_snapshot_not_object'); return clean; }
    Object.keys(obj).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(CANONICAL_UNIT_KEYS, k)) { errors.push('canonical_input_unknown_key:' + k); return; } // prototype-safe closed key set
      var p = obj[k];
      if (!p || p.kind !== 'canonical_parameter') { errors.push('canonical_input_' + k + '_not_canonical_parameter'); return; }
      if (p.parameter !== k) { errors.push('canonical_input_' + k + '_parameter_mismatch'); return; }
      var extra = _canonParamExtraFields(p);
      if (extra.length) { errors.push('canonical_input_' + k + '_unexpected_field:' + extra[0]); return; }
      clean[k] = _rebuildCanonicalParam(p); // store a clean REBUILT copy, never the caller object
    });
    return clean;
  }

  // ── structured blocker ────────────────────────────────────────────────────────────────────────
  function makeBlocker(o) {
    o = o || {};
    var bad = !o.code || !o.scope; // missing code OR scope → malformed (fail-closed, never silently kept usable)
    return {
      kind: 'blocker',
      code: o.code || null, scope: o.scope || null,
      severity: o.severity || (bad ? 'error' : 'info'),
      parameterKey: o.parameterKey || null, sourceRef: o.sourceRef || null,
      details: o.details || null,
      valid: !bad,
    };
  }
  var _SEV_RANK = { error: 3, warning: 2, info: 1 };
  function _mergeDetails(a, b) {
    var arr = [].concat(a == null ? [] : a, b == null ? [] : b).filter(function (x) { return x != null; });
    var seen = {}, out = [];
    arr.forEach(function (x) { var s = JSON.stringify(x); if (!seen[s]) { seen[s] = true; out.push(x); } });
    return out.length ? out : null;
  }
  /** Normalize a blockers input: non-array → fail-closed; malformed kept (flagged); on a key collision keep
   * the HIGHEST severity and MERGE details (never drop a distinct cause or demote an error to info). */
  function normalizeBlockers(arr) {
    if (!Array.isArray(arr)) return { blockers: [makeBlocker({ code: 'MALFORMED_BLOCKERS_INPUT', scope: _BLOCKER_SCOPE.CASE, severity: 'error' })], malformed: true };
    var byKey = {};
    arr.map(makeBlocker).forEach(function (b) {
      var key = [b.code, b.scope, b.parameterKey].join('|');
      var cur = byKey[key];
      if (!cur) { byKey[key] = b; return; }
      var merged = _mergeDetails(cur.details, b.details);
      var winner = (_SEV_RANK[b.severity] || 0) > (_SEV_RANK[cur.severity] || 0) ? b : cur;
      winner.details = merged;
      byKey[key] = winner;
    });
    var out = Object.keys(byKey).map(function (k) { return byKey[k]; });
    out.sort(function (a, b) { return (a.code + a.scope + (a.parameterKey || '')).localeCompare(b.code + b.scope + (b.parameterKey || '')); });
    return { blockers: out, malformed: out.some(function (b) { return !b.valid; }) };
  }

  // ── forbidden-content + privacy scan (recursive over keys) ───────────────────────────────────
  function scanForbidden(obj, telemetryScope, acc, depth) {
    acc = acc || [];
    depth = depth || 0;
    if (obj == null || typeof obj !== 'object') return acc;
    if (depth > 24) { acc.push({ code: BLOCKER_CODE.FORBIDDEN_FIELD_PRESENT, key: '__depth_exceeded__' }); return acc; } // fail-closed, never a silent return
    Object.keys(obj).forEach(function (k) {
      var lk = String(k).toLowerCase();
      if (FORBIDDEN_KEYS.indexOf(lk) !== -1) acc.push({ code: BLOCKER_CODE.FORBIDDEN_FIELD_PRESENT, key: k });
      if (telemetryScope && FORBIDDEN_TELEMETRY_KEYS.indexOf(lk) !== -1) acc.push({ code: BLOCKER_CODE.FORBIDDEN_FIELD_PRESENT, key: k });
      var v = obj[k];
      // a private-looking VALUE under ANY key (e.g. logFile:'/Users/x/run.csv') is caught here,
      // without treating legitimate domain strings like "F312/F317", "N/mm", or "60/80" as paths.
      if (typeof v === 'string' && lk !== 'createdat' && _containsPrivateValueRef(v)) acc.push({ code: BLOCKER_CODE.PRIVATE_SOURCE_REFERENCE_FORBIDDEN, key: k });
      if (v && typeof v === 'object') scanForbidden(v, telemetryScope, acc, depth + 1);
    });
    return acc;
  }

  // ── authoritative re-evaluation of a canonical input (never trust caller's modelUsable) ───────
  function _authoritativeParam(p) {
    if (!p || p.kind !== 'canonical_parameter') return null;
    return CP.makeCanonicalParameter({
      parameter: p.parameter, value: p.value, provenance: p.provenance, confidence: p.confidence,
      conversionStatus: p.conversionStatus, applicability: p.applicability,
      conversionRef: p.conversionRef, sourceRef: p.sourceRef, blockers: p.blockers,
      legacyUseWheelRate: p.legacyUseWheelRate,
    });
  }

  function evaluateModelInputEligibility(c) {
    var blockers = [];
    var snap = (c.modelSnapshot && c.modelSnapshot.canonicalInputSnapshot) || {};
    REQUIRED_MODEL_INPUTS.forEach(function (key) {
      var auth = _authoritativeParam(snap[key]);
      if (!auth || !auth.modelUsable) {
        blockers.push(makeBlocker({ code: BLOCKER_CODE.MISSING_REQUIRED_CANONICAL_PARAMETER, scope: _BLOCKER_SCOPE.MODEL, severity: 'error', parameterKey: key, details: auth ? auth.blockers : ['absent'] }));
      } else if (auth.conversionRef && !Object.prototype.hasOwnProperty.call(PC.CONVERSIONS, auth.conversionRef)) {
        // ANY param claiming a conversion must reference a REAL registered one (not only DERIVED) —
        // closes the ghost-ref bypass where a DOCUMENTED rate-like value carries a fabricated conversionRef.
        blockers.push(makeBlocker({ code: BLOCKER_CODE.MISSING_REQUIRED_CANONICAL_PARAMETER, scope: _BLOCKER_SCOPE.MODEL, severity: 'error', parameterKey: key, details: ['conversion_ref_not_in_registry'] }));
      } else if (auth.provenance === CP.PROVENANCE.DERIVED) {
        var integ = CP.checkConversionIntegrity(auth, PC.CONVERSIONS);
        if (!integ.ok) blockers.push(makeBlocker({ code: BLOCKER_CODE.MISSING_REQUIRED_CANONICAL_PARAMETER, scope: _BLOCKER_SCOPE.MODEL, severity: 'error', parameterKey: key, details: [integ.reason] }));
      }
    });
    // unresolved setup selections block model input
    var unresolved = (c.setupSnapshot && c.setupSnapshot.unresolvedSelections) || [];
    unresolved.forEach(function (u) {
      blockers.push(makeBlocker({ code: BLOCKER_CODE.UNRESOLVED_SETUP_SELECTION, scope: _BLOCKER_SCOPE.SETUP, severity: 'error', parameterKey: u.parameterKey || u.category, details: [u.reason] }));
    });
    if (blockers.length) blockers.push(makeBlocker({ code: BLOCKER_CODE.MODEL_INPUT_INCOMPLETE, scope: _BLOCKER_SCOPE.MODEL, severity: 'error', details: ['one or more required canonical inputs unavailable'] }));
    return { eligible: blockers.length === 0, blockers: blockers };
  }

  function _hasMinimalTelemetryQuality(tb) {
    if (!tb || isPrivateRef(tb.sessionId)) return false;
    var ccs = tb.channelCapabilitySummary || {};
    // minimal descriptive inspection needs at least speed + one motion channel as 'confirmed'
    var confirmed = function (k) { return ccs[k] === 'confirmed'; };
    return confirmed('speed') && (confirmed('yawRate') || confirmed('lateralAcceleration'));
  }

  // ── pure capability derivation (no caller override; comparison/recommendation HARD false) ─────
  function deriveCapabilityState(c) {
    c = c || {};
    var vehicleProfileLinked = !!(c.vehicleBinding && !isPrivateRef(c.vehicleBinding.profileId));
    var ssVal = SS.validateSetupSnapshot(c.setupSnapshot);
    var setupSnapshotLinked = ssVal.ok && !!(c.vehicleBinding) && c.setupSnapshot.vehicleProfileId === c.vehicleBinding.profileId;
    var telemetrySessionLinked = !!(c.telemetryBinding && !isPrivateRef(c.telemetryBinding.sessionId));
    var modelSnapshotLinked = !!(c.modelSnapshot && !isPrivateRef(c.modelSnapshot.modelId) && c.modelSnapshot.canonicalContractVersion);
    var caseAssembled = vehicleProfileLinked && setupSnapshotLinked && telemetrySessionLinked && modelSnapshotLinked;
    var mi = evaluateModelInputEligibility(c);
    return {
      caseAssembled: caseAssembled,
      vehicleProfileLinked: vehicleProfileLinked,
      setupSnapshotLinked: setupSnapshotLinked,
      telemetrySessionLinked: telemetrySessionLinked,
      modelSnapshotLinked: modelSnapshotLinked,
      modelInputEligible: caseAssembled && mi.eligible,
      telemetryInspectionEligible: telemetrySessionLinked && _hasMinimalTelemetryQuality(c.telemetryBinding),
      modelTelemetryComparisonEligible: false, // HARD false in v1
      setupRecommendationEligible: false,      // HARD false in v1
    };
  }

  function summarizeCaseProvenance(c) {
    var counts = { documented: 0, derived: 0, measured: 0, estimated: 0, unknown: 0, blocked: 0 };
    var snap = (c.modelSnapshot && c.modelSnapshot.canonicalInputSnapshot) || {};
    var privateSourceCount = 0;
    Object.keys(snap).forEach(function (k) {
      var p = snap[k]; if (!p) return;
      if (p.value == null && p.provenance === CP.PROVENANCE.UNKNOWN) counts.unknown += 1;
      else if (p.blockers && p.blockers.length && !p.modelUsable) counts.blocked += 1;
      else if (counts[p.provenance] != null) counts[p.provenance] += 1; else counts.unknown += 1;
      if (p.sourceRef && isPrivateRef(p.sourceRef)) privateSourceCount += 1;
    });
    // measured-setting provenance from setup snapshot too
    var ssp = c.setupSnapshot && c.setupSnapshot.provenanceSummary;
    return { canonicalInputs: counts, setup: ssp || null, privateSourceCount: privateSourceCount };
  }

  // ── create / validate ─────────────────────────────────────────────────────────────────────────
  function _failClosedCase(err) { return { kind: 'analysis_case', valid: false, errors: [err], warnings: [], capabilityState: { caseAssembled: false, vehicleProfileLinked: false, setupSnapshotLinked: false, telemetrySessionLinked: false, modelSnapshotLinked: false, modelInputEligible: false, telemetryInspectionEligible: false, modelTelemetryComparisonEligible: false, setupRecommendationEligible: false }, blockedReasons: [] }; }
  function createAnalysisCase(rawInput) {
    // public boundary: any structural-read exception (getter/Proxy trap) → fail closed, never crash
    try { return _createAnalysisCaseInner(rawInput); }
    catch (e) { return _failClosedCase('exotic_or_unreadable_input'); }
  }
  function _createAnalysisCaseInner(rawInput) {
    // run the JSON-safety check BEFORE cloning → an accessor/getter is never executed
    if (!_isJsonSafe(rawInput)) return _failClosedCase('non_json_safe_input');
    var input = _clone(rawInput) || {};
    var errors = [];

    if (isPrivateRef(input.caseId)) errors.push('case_id_invalid_or_private');
    var schemaVersion = input.schemaVersion;
    if (schemaVersion == null) errors.push('schema_version_required');
    else if (!_isCompat(schemaVersion)) errors.push('incompatible_schema_version');

    // metadata: createdAt MUST be caller-provided (no implicit clock)
    var md = input.caseMetadata || {};
    if (md.createdAt == null) errors.push('case_metadata_createdAt_required');
    if (md.notes != null && typeof md.notes === 'string' && isPrivateRef(md.notes)) errors.push('case_metadata_notes_contains_private_ref');
    var caseMetadata = { title: md.title || null, createdAt: md.createdAt != null ? md.createdAt : null, notes: md.notes || null };

    // vehicle binding (version-locked)
    var vb = input.vehicleBinding || {};
    if (isPrivateRef(vb.profileId)) errors.push('vehicle_profile_id_invalid_or_private');
    if (vb.profileDigest != null && isPrivateRef(String(vb.profileDigest)) && !/^[0-9a-f]{8,}$/i.test(String(vb.profileDigest))) errors.push('vehicle_profile_digest_invalid');
    if (!vb.profileVersion && !vb.profileDigest) errors.push('vehicle_binding_version_lock_missing'); // can't reproduce without a lock
    if (vb.profileSchemaVersion != null && !_isCompat(vb.profileSchemaVersion)) errors.push('profile_schema_version_incompatible');
    var vehicleBinding = {
      profileId: vb.profileId || null, profileSchemaVersion: vb.profileSchemaVersion || null,
      profileVersion: vb.profileVersion || null, profileDigest: vb.profileDigest || null,
      applicability: vb.applicability || null,
    };

    // setup snapshot (must be a SetupSnapshot bound to the SAME vehicle profile)
    var ss = input.setupSnapshot;
    var ssVal = SS.validateSetupSnapshot(ss);
    if (!ssVal.ok) errors.push('setup_snapshot_invalid');
    if (ss && ss.vehicleProfileId !== vehicleBinding.profileId) errors.push('setup_snapshot_vehicle_profile_mismatch');

    // telemetry binding (reference only — no raw data). Summaries are CLOSED flat scalar maps (no
    // arrays / nested objects / blobs / paths can ride inside them under an aliased key).
    var tb = input.telemetryBinding || {};
    if (isPrivateRef(tb.sessionId)) errors.push('telemetry_session_id_invalid_or_private');
    if (tb.adapterId != null && isPrivateRef(tb.adapterId)) errors.push('telemetry_adapter_id_invalid_or_private');
    if (tb.sourceFormat != null && _privateLike(String(tb.sourceFormat))) errors.push('telemetry_source_format_private');
    var telemetryBinding = {
      sessionId: tb.sessionId || null, adapterId: tb.adapterId || null,
      canonicalSessionSchemaVersion: tb.canonicalSessionSchemaVersion || null,
      sourceFormat: tb.sourceFormat || null,
      channelCapabilitySummary: _sanitizeBySchema(tb.channelCapabilitySummary, TELEMETRY_SCHEMAS.channelCapabilitySummary, 'channelCapabilitySummary', errors),
      qualitySummary: _sanitizeBySchema(tb.qualitySummary, TELEMETRY_SCHEMAS.qualitySummary, 'qualitySummary', errors),
      confirmationState: _sanitizeBySchema(tb.confirmationState, TELEMETRY_SCHEMAS.confirmationState, 'confirmationState', errors),
    };

    // model snapshot (input + version snapshot; NEVER model results)
    var ms = input.modelSnapshot || {};
    if (isPrivateRef(ms.modelId)) errors.push('model_id_invalid_or_private');
    if (!ms.modelVersion) errors.push('model_version_required'); // build identity needed for reproducibility
    if (!ms.canonicalContractVersion) errors.push('model_canonical_contract_version_required');
    else if (!_isCompat(ms.canonicalContractVersion)) errors.push('model_canonical_contract_version_incompatible');
    var modelSnapshot = {
      modelId: ms.modelId || null, modelVersion: ms.modelVersion || null,
      calibrationVersion: ms.calibrationVersion || null,
      canonicalContractVersion: ms.canonicalContractVersion || null,
      // CLOSED key set: only real canonical parameters, each an actual canonical_parameter object —
      // an aliased model result (unknown key) is a hard error and never stored.
      canonicalInputSnapshot: _sanitizeCanonicalInputSnapshot(ms.canonicalInputSnapshot, errors),
      // modelInputEligibility is DERIVED below — caller value ignored
    };

    // context (nullable track etc.)
    var ctx = input.context || {};
    var context = { trackProfileRef: ctx.trackProfileRef != null ? ctx.trackProfileRef : null, weatherContext: ctx.weatherContext != null ? ctx.weatherContext : null, sessionTyreContext: ctx.sessionTyreContext != null ? ctx.sessionTyreContext : null };
    if (context.trackProfileRef != null && isPrivateRef(String(context.trackProfileRef))) errors.push('track_profile_ref_invalid_or_private');

    // assemble draft (without capability) for scanning + derivation
    var draft = {
      kind: 'analysis_case', schemaVersion: schemaVersion,
      caseId: input.caseId || null, caseMetadata: caseMetadata,
      vehicleBinding: vehicleBinding, setupSnapshot: ss || null, telemetryBinding: telemetryBinding,
      modelSnapshot: modelSnapshot, context: context,
    };

    // forbidden-content / privacy scan over the ORIGINAL input (so a raw-data injection is explicitly
    // REJECTED, not silently dropped by the whitelist rebuild). Telemetry scope flags raw-data keys.
    var forb = scanForbidden({ caseMetadata: input.caseMetadata, vehicleBinding: input.vehicleBinding, modelSnapshot: input.modelSnapshot, context: input.context, setupSnapshot: input.setupSnapshot || {} }, false)
      .concat(scanForbidden({ telemetryBinding: input.telemetryBinding || {} }, true));
    var derivedBlockers = [];
    forb.forEach(function (f) {
      var isPriv = f.code === BLOCKER_CODE.PRIVATE_SOURCE_REFERENCE_FORBIDDEN;
      errors.push((isPriv ? 'private_value:' : 'forbidden_field:') + f.key);
      derivedBlockers.push(makeBlocker({ code: f.code, scope: _BLOCKER_SCOPE.CASE, severity: 'error', details: [f.key] }));
    });

    // forward-compat: unknown future fields are SURFACED as warnings, never silently dropped by the whitelist rebuild
    var warnings = [];
    var _surfaceDropped = function (inObj, allowed, label) {
      if (inObj && typeof inObj === 'object') Object.keys(inObj).forEach(function (k) { if (allowed.indexOf(k) === -1) warnings.push('dropped_unknown_field:' + label + '.' + k); });
    };
    _surfaceDropped(input.context, ['trackProfileRef', 'weatherContext', 'sessionTyreContext'], 'context');
    _surfaceDropped(input.telemetryBinding, ['sessionId', 'adapterId', 'canonicalSessionSchemaVersion', 'sourceFormat', 'channelCapabilitySummary', 'qualitySummary', 'confirmationState'], 'telemetryBinding');
    _surfaceDropped(input.modelSnapshot, ['modelId', 'modelVersion', 'calibrationVersion', 'canonicalContractVersion', 'canonicalInputSnapshot'], 'modelSnapshot');
    _surfaceDropped(input.vehicleBinding, ['profileId', 'profileSchemaVersion', 'profileVersion', 'profileDigest', 'applicability'], 'vehicleBinding');

    // soft gate: a present-but-incompatible canonical telemetry session schema → warning blocker (not a hard fail —
    // the binding layer should not hard-reject telemetry; downstream decides).
    if (tb.canonicalSessionSchemaVersion != null && !_isCompat(tb.canonicalSessionSchemaVersion)) {
      derivedBlockers.push(makeBlocker({ code: BLOCKER_CODE.TELEMETRY_SESSION_SCHEMA_INCOMPATIBLE, scope: _BLOCKER_SCOPE.TELEMETRY, severity: 'warning', details: [String(tb.canonicalSessionSchemaVersion)] }));
    }

    // reject any caller-supplied capabilityState (must be derived, never injected)
    if (input.capabilityState != null) errors.push('capability_state_must_not_be_supplied');

    // derive capability + collect model-input blockers
    var capabilityState = deriveCapabilityState(draft);
    var mi = evaluateModelInputEligibility(draft);
    derivedBlockers = derivedBlockers.concat(mi.blockers);
    // telemetry honesty blockers
    var ccs = telemetryBinding.channelCapabilitySummary || {};
    if (ccs.roadWheelAngle === 'confirmed' && (telemetryBinding.confirmationState || {}).steeringCalibration !== 'confirmed') {
      derivedBlockers.push(makeBlocker({ code: BLOCKER_CODE.STEERING_CALIBRATION_UNCONFIRMED, scope: _BLOCKER_SCOPE.TELEMETRY, severity: 'warning', details: ['road-wheel angle cannot be confirmed from raw steering without calibration'] }));
    }
    if ((telemetryBinding.confirmationState || {}).timebase !== 'confirmed') {
      derivedBlockers.push(makeBlocker({ code: BLOCKER_CODE.TELEMETRY_TIMEBASE_UNCONFIRMED, scope: _BLOCKER_SCOPE.TELEMETRY, severity: 'info', details: ['timebase not confirmed'] }));
    }
    // the two hard-deferred capabilities always carry their blocker
    derivedBlockers.push(makeBlocker({ code: BLOCKER_CODE.MODEL_COMPARISON_NOT_IMPLEMENTED, scope: _BLOCKER_SCOPE.MODEL, severity: 'info', details: ['model-vs-telemetry comparison is not implemented in R2.1D'] }));
    derivedBlockers.push(makeBlocker({ code: BLOCKER_CODE.RECOMMENDATION_NOT_IMPLEMENTED, scope: _BLOCKER_SCOPE.MODEL, severity: 'info', details: ['setup recommendation is not implemented in R2.1D'] }));

    // merge any caller-declared blockers (structured), normalize + dedupe
    var callerBlockers = input.blockedReasons != null ? input.blockedReasons : [];
    var norm = normalizeBlockers(derivedBlockers.concat(Array.isArray(callerBlockers) ? callerBlockers : []));
    if (!Array.isArray(callerBlockers) && input.blockedReasons != null) errors.push('blocked_reasons_not_array');

    var theCase = {
      kind: 'analysis_case', schemaVersion: schemaVersion,
      caseId: input.caseId || null, caseMetadata: caseMetadata,
      vehicleBinding: vehicleBinding, setupSnapshot: ss || null, telemetryBinding: telemetryBinding,
      modelSnapshot: modelSnapshot, context: context,
      capabilityState: capabilityState,
      blockedReasons: norm.blockers,
      provenanceSummary: summarizeCaseProvenance(draft),
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
    return theCase;
  }

  /** Re-validate an assembled case: re-derives capability + recomputes canonical usability and rejects tampering. */
  function validateAnalysisCase(c) {
    try { return _validateAnalysisCaseInner(c); }
    catch (e) { return { ok: false, errors: ['exotic_or_unreadable_input'], warnings: [] }; }
  }
  function _validateAnalysisCaseInner(c) {
    var errors = [], warnings = [];
    if (!c || c.kind !== 'analysis_case') return { ok: false, errors: ['not_analysis_case'], warnings: [] };
    // JSON-safety check FIRST; on failure return IMMEDIATELY so no further property is read (a rejected accessor's getter is never executed)
    if (!_isJsonSafe(c)) return { ok: false, errors: ['non_json_safe_input'], warnings: [] };
    if (!_isCompat(c.schemaVersion)) errors.push('incompatible_schema_version');
    if (isPrivateRef(c.caseId)) errors.push('case_id_invalid_or_private');
    if (!c.caseMetadata || c.caseMetadata.createdAt == null) errors.push('case_metadata_createdAt_required');
    if (!c.vehicleBinding || isPrivateRef(c.vehicleBinding.profileId)) errors.push('vehicle_profile_id_invalid_or_private');
    if (!c.modelSnapshot || !c.modelSnapshot.canonicalContractVersion) errors.push('model_canonical_contract_version_required');
    else if (!_isCompat(c.modelSnapshot.canonicalContractVersion)) errors.push('model_canonical_contract_version_incompatible');
    if (c.modelSnapshot && !c.modelSnapshot.modelVersion) errors.push('model_version_required');
    if (c.vehicleBinding && c.vehicleBinding.profileSchemaVersion != null && !_isCompat(c.vehicleBinding.profileSchemaVersion)) errors.push('profile_schema_version_incompatible');

    // re-run create-time STRUCTURAL invariants — a tamper to the binding data must be caught even if
    // capabilityState was recomputed to stay self-consistent.
    if (!c.vehicleBinding || (!c.vehicleBinding.profileVersion && !c.vehicleBinding.profileDigest)) errors.push('vehicle_binding_version_lock_missing');
    if (!c.telemetryBinding || isPrivateRef(c.telemetryBinding.sessionId)) errors.push('telemetry_session_id_invalid_or_private');
    if (c.telemetryBinding && c.telemetryBinding.adapterId != null && isPrivateRef(c.telemetryBinding.adapterId)) errors.push('telemetry_adapter_id_invalid_or_private');
    var ssVal = SS.validateSetupSnapshot(c.setupSnapshot);
    if (!ssVal.ok) errors.push('setup_snapshot_invalid');
    if (c.setupSnapshot && c.vehicleBinding && c.setupSnapshot.vehicleProfileId !== c.vehicleBinding.profileId) errors.push('setup_snapshot_vehicle_profile_mismatch');
    // telemetry summaries must still be CLOSED flat scalar maps (no array/nested/blob/private re-injected)
    ['channelCapabilitySummary', 'qualitySummary', 'confirmationState'].forEach(function (f) {
      var m = c.telemetryBinding && c.telemetryBinding[f];
      if (m == null) return;
      _sanitizeBySchema(m, TELEMETRY_SCHEMAS[f], f, errors); // SAME schema as create-time (no drift)
    });
    // canonical input snapshot: re-run the SAME closed-schema sanitizer as create-time (shared → no drift)
    _sanitizeCanonicalInputSnapshot(c.modelSnapshot && c.modelSnapshot.canonicalInputSnapshot, errors);

    // forbidden / privacy (a private VALUE under any key is flagged too)
    var forb = scanForbidden({ md: c.caseMetadata, vb: c.vehicleBinding, ms: c.modelSnapshot, ctx: c.context, ss: c.setupSnapshot || {} }, false)
      .concat(scanForbidden({ tb: c.telemetryBinding }, true));
    forb.forEach(function (f) { errors.push((f.code === BLOCKER_CODE.PRIVATE_SOURCE_REFERENCE_FORBIDDEN ? 'private_value:' : 'forbidden_field:') + f.key); });

    // canonical input tampering: recompute modelUsable and compare to stored
    var snap = (c.modelSnapshot && c.modelSnapshot.canonicalInputSnapshot) || {};
    Object.keys(snap).forEach(function (k) {
      var stored = snap[k];
      var auth = _authoritativeParam(stored);
      if (auth && stored && typeof stored.modelUsable === 'boolean' && stored.modelUsable !== auth.modelUsable) {
        errors.push('canonical_input_' + k + '_usability_tampered');
      }
    });

    // capability tampering: re-derive and compare
    var derived = deriveCapabilityState(c);
    var derivedKeys = Object.keys(derived);
    if (c.capabilityState) {
      derivedKeys.forEach(function (flag) {
        if (typeof c.capabilityState[flag] === 'boolean' && c.capabilityState[flag] !== derived[flag]) {
          errors.push('capability_' + flag + '_tampered');
        }
      });
      // capability is a CLOSED, fully-derived vocabulary — any extra key is a hard error
      Object.keys(c.capabilityState).forEach(function (k) { if (derivedKeys.indexOf(k) === -1) errors.push('capability_unexpected_key:' + k); });
    }
    // the two hard-false capabilities can never be true
    if (c.capabilityState && (c.capabilityState.modelTelemetryComparisonEligible === true || c.capabilityState.setupRecommendationEligible === true)) {
      errors.push('forbidden_capability_enabled');
    }
    // blockedReasons must be an array of well-formed blockers
    if (!Array.isArray(c.blockedReasons)) errors.push('blocked_reasons_not_array');
    else c.blockedReasons.forEach(function (b, i) { if (!b || !b.code || !b.scope) errors.push('blocker_' + i + '_missing_code_or_scope'); });

    // structural blockers must be PRESENT — they cannot be silently emptied/edited away after build
    var storedCodes = Array.isArray(c.blockedReasons) ? c.blockedReasons.map(function (b) { return b && b.code; }) : [];
    var expectedCodes = [BLOCKER_CODE.MODEL_COMPARISON_NOT_IMPLEMENTED, BLOCKER_CODE.RECOMMENDATION_NOT_IMPLEMENTED];
    if (!derived.modelInputEligible) expectedCodes.push(BLOCKER_CODE.MODEL_INPUT_INCOMPLETE);
    expectedCodes.forEach(function (code) { if (storedCodes.indexOf(code) === -1) errors.push('blocker_dropped:' + code); });

    return { ok: errors.length === 0 && c.valid !== false, errors: errors, warnings: warnings };
  }

  // ── serialize / parse (JSON round-trip; re-validate on parse; no functions, no paths) ─────────
  function serializeAnalysisCase(c) {
    // public boundary: run the JSON-safety descriptor check FIRST (no getter executed); a function/getter/
    // Proxy/exotic object → null (fail closed), never an uncaught throw, never a getter side effect.
    try { if (!_isJsonSafe(c)) return null; return JSON.stringify(c, function (k, v) { if (typeof v === 'function') throw new Error('refuse_to_serialize_function'); return v; }); }
    catch (e) { return null; }
  }
  function parseAnalysisCase(json) {
    var obj;
    try { obj = JSON.parse(json); } catch (e) { return { ok: false, errors: ['invalid_json'], case: null }; }
    var v = validateAnalysisCase(obj);
    return { ok: v.ok, errors: v.errors, warnings: v.warnings, case: obj };
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, BLOCKER_CODE: BLOCKER_CODE, REQUIRED_MODEL_INPUTS: REQUIRED_MODEL_INPUTS,
    makeBlocker: makeBlocker, normalizeBlockers: normalizeBlockers,
    createAnalysisCase: createAnalysisCase, validateAnalysisCase: validateAnalysisCase,
    deriveCapabilityState: deriveCapabilityState, summarizeCaseProvenance: summarizeCaseProvenance,
    evaluateModelInputEligibility: evaluateModelInputEligibility,
    serializeAnalysisCase: serializeAnalysisCase, parseAnalysisCase: parseAnalysisCase,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisCase = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
