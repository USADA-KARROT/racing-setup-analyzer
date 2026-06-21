/**
 * setup-snapshot.js — R2.1D: SetupSnapshot data contract (PURE).
 *
 * "What was ACTUALLY run this session" — NOT the VehicleProfile's option tables. A SetupSnapshot
 * references which option was selected (by opaque id), records measured settings as provenance-tagged
 * raw sources, and lists selections whose canonical value is still blocked (e.g. ARB with unknown MR).
 *
 * RED LINES (must not break):
 *  • Pure data + fail-closed validation. No model, no UI, no Advisor, no telemetry runtime. Imports
 *    only canonical-parameters.js (the R2.1A contract) for raw-source shape + enums.
 *  • Opaque ids only. snapshotId / vehicleProfileId / optionId must NOT be a filesystem path, real
 *    filename, private-folder name, or fingerprint (isPrivateRef rejects them).
 *  • Raw value / unit / basis / provenance preserved (measured settings are RawSourceValues). A ratio
 *    is never a bare number (inherited from makeRawSource). Unknown stays unknown — no generic fill.
 *  • The option table (on the VehicleProfile) and the actual selection (here) stay separate.
 *
 * UMD: Node require / Electron renderer global (SetupSnapshot).
 */
(function (root) {
  'use strict';

  var _cp = null;
  if (typeof module !== 'undefined' && module.exports) { try { _cp = require('./canonical-parameters.js'); } catch (e) { _cp = null; } }
  var CP = _cp || (typeof CanonicalParameters !== 'undefined' ? CanonicalParameters : null);
  if (!CP) throw new Error('setup-snapshot.js requires canonical-parameters.js');

  var SCHEMA_VERSION = '1.0.0';

  var SETUP_OPTION_CATEGORY = Object.freeze({
    TORSION_BAR: 'torsion_bar', SPRING: 'spring', ARB: 'arb', DAMPER: 'damper',
    WING: 'wing', RIDE_HEIGHT: 'ride_height', DIFFERENTIAL: 'differential', OTHER: 'other',
  });

  // ── clean-room id guard (shared with analysis-case.js) ────────────────────────────────────────
  var _PRIVATE_RE = [
    /[\/\\]/,                                   // any path separator
    /^[A-Za-z]:[\\/]/,                          // windows drive
    /^(file|data|smb|ftp|blob|javascript|vbscript|https?):/i, // any URL/data scheme (incl. data: ids)
    /\.(csv|tsv|xlsx?|pdf|bmsbin|mat|mdf|ld|json|ssn|bin)$/i, // a real filename extension
    /(^|[\/\\])(Users|Desktop|Documents|iCloud)([\/\\]|$)/,   // private folders
    /個人資料/, /HFDP/i,
    /^[0-9a-f]{32,}$/i,                         // hash / fingerprint
  ];
  // Normalize percent-/plus-/%uXXXX encoding, up to 3 passes until stable. Malformed encoding fails closed
  // (returns malformed:true → caller treats it as private/path). NO unbounded loop.
  function _decoded(s) {
    var out = s;
    for (var i = 0; i < 3; i++) {
      var prev = out;
      out = out.replace(/%u([0-9a-fA-F]{4})/g, function (_m, h) { return String.fromCharCode(parseInt(h, 16)); });
      if (/%[0-9a-fA-F]{2}/.test(out)) { // only decode when a real %XX hex sequence is present (a bare '%' is a literal)
        try { out = decodeURIComponent(out.replace(/\+/g, '%20')); } catch (e) { return { value: out, malformed: true }; }
      }
      if (out === prev) break;
    }
    return { value: out, malformed: false };
  }
  function _matchAny(reList, s) { for (var i = 0; i < reList.length; i++) { if (reList[i].test(s)) return true; } return false; }
  function isPrivateRef(s) {
    if (typeof s !== 'string' || s.length === 0) return true; // non-string / empty → reject
    if (_matchAny(_PRIVATE_RE, s)) return true;
    var d = _decoded(s);
    return d.malformed || _matchAny(_PRIVATE_RE, d.value);    // malformed encoding OR decoded-private → reject
  }
  function _idError(label, v) { return isPrivateRef(v) ? (label + '_invalid_or_private') : null; }
  function _idError(label, v) { return isPrivateRef(v) ? (label + '_invalid_or_private') : null; }
  // VALUE-level path detection (looser than the id rule): flags real paths / filenames / private folders /
  // fingerprints, but does NOT reject a bare '/' (so legitimate values like a '60/80' diff ramp pass).
  var _PATH_LIKE_RE = [
    /^[A-Za-z]:[\\/]/,                                                  // windows drive
    /^\\\\/,                                                            // UNC \\server\share
    /:\/\//,                                                            // any scheme:// (file://, smb://, https://)
    /^(file|data|smb|ftp|blob|javascript|vbscript|https?):/i,          // scheme without slashes (data:…)
    /(^|\s)\/(Users|home|tmp|private|var|Volumes|Applications)\//,      // unix path root
    /(^|[\/\\])(Users|Desktop|Documents|iCloud)([\/\\]|$)/,             // private folders
    /\.(csv|tsv|xlsx?|pdf|bmsbin|mat|mdf|ld|json|ssn|bin)($|[\/\\\s])/i, // filename extension
    /個人資料/, /HFDP/i,
    /^[0-9a-f]{32,}$/i,                                                  // fingerprint
  ];
  function _looksLikePath(s) {
    if (typeof s !== 'string' || !s) return false;
    if (_matchAny(_PATH_LIKE_RE, s)) return true;
    var d = _decoded(s);
    return d.malformed || _matchAny(_PATH_LIKE_RE, d.value); // malformed encoding OR decoded-path → flag
  }
  // FAIL-CLOSED on non-JSON-safe input: Map/Set/Date/TypedArray/function/symbol/bigint must NOT be silently
  // normalized to {} / a string by the JSON clone. Only plain objects/arrays/primitives are accepted.
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
          if (!ad || !ad.enumerable || typeof ad.get === 'function' || typeof ad.set === 'function') return false; // non-enum / accessor
          if (!_isJsonSafe(ad.value, depth + 1)) return false;
        }
        return true;
      }
      var proto = Object.getPrototypeOf(v);
      if (proto !== Object.prototype && proto !== null) return false; // Map/Set/Date/TypedArray/RegExp/Proxy-exotic/host
      var keys = Reflect.ownKeys(v);                           // includes symbol + non-enumerable own keys
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        if (typeof k === 'symbol') return false;               // symbol own key
        var desc = Object.getOwnPropertyDescriptor(v, k);
        if (!desc || !desc.enumerable) return false;           // non-enumerable own property
        if (typeof desc.get === 'function' || typeof desc.set === 'function') return false; // accessor — never run getter
        if (!_isJsonSafe(desc.value, depth + 1)) return false; // descriptor value, never v[k] (no getter trigger)
      }
      return true;
    } catch (e) { return false; } // a getter / Proxy trap threw → fail closed
  }

  // FIXED allowlists (an unknown key is a hard error — not a silent drop).
  var TYRE_CONTEXT_KEYS = ['compoundId', 'note', 'set', 'pressureSet', 'stintNote', 'wear'];
  var ELECTRONIC_KEYS = ['differential', 'tractionControl', 'abs', 'engineMap', 'escMode', 'regenLevel', 'boost', 'antiLag', 'launchControl', 'brakeBias'];
  function _isScalarOk(v) { return v == null || (typeof v === 'number' && isFinite(v)) || typeof v === 'string' || typeof v === 'boolean'; }
  // SHARED tyre-context schema check (used by both make and validate so the rule never drifts).
  function _checkTyreContext(tc, errors) {
    if (tc == null) return;
    if (typeof tc !== 'object' || Array.isArray(tc)) { errors.push('tyre_context_not_object'); return; }
    Object.keys(tc).forEach(function (k) {
      if (TYRE_CONTEXT_KEYS.indexOf(k) === -1) { errors.push('tyre_context_' + k + '_unknown_key'); return; }
      var v = tc[k];
      if (!_isScalarOk(v)) errors.push('tyre_context_' + k + '_not_scalar');
      else if (typeof v === 'string' && _looksLikePath(v)) errors.push('tyre_context_' + k + '_private_value');
    });
  }
  // SHARED electronic-settings schema check (used by both make and validate).
  function _checkElectronic(es, errors) {
    if (es == null) return;
    if (typeof es !== 'object' || Array.isArray(es)) { errors.push('electronic_not_object'); return; }
    Object.keys(es).forEach(function (k) {
      if (ELECTRONIC_KEYS.indexOf(k) === -1) { errors.push('electronic_' + k + '_unknown_key'); return; }
      var e = es[k];
      if (e == null || typeof e !== 'object' || Array.isArray(e)) { errors.push('electronic_' + k + '_not_object'); return; } // primitive entry fails closed, never throws
      var val = ('value' in e) ? e.value : null;
      if (val != null && !_isScalarOk(val)) errors.push('electronic_' + k + '_value_not_scalar');
      else if (typeof val === 'string' && _looksLikePath(val)) errors.push('electronic_' + k + '_value_private');
      if (typeof e.note === 'string' && _looksLikePath(e.note)) errors.push('electronic_' + k + '_note_private');
    });
  }

  function _isEnum(obj, v) { for (var k in obj) { if (obj[k] === v) return true; } return false; }
  function _majorOf(ver) { return (typeof ver === 'string' && /^\d+(\.|$)/.test(ver)) ? ver.split('.')[0] : null; }
  function _isCompatibleVersion(ver) { return _majorOf(ver) === _majorOf(SCHEMA_VERSION); }
  function _isScalar(v) { return v == null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean'; }
  // deep clone of plain JSON data → caller input is never aliased; later caller edits cannot reach the snapshot.
  function _clone(o) { try { return JSON.parse(JSON.stringify(o == null ? null : o)); } catch (e) { return null; } }

  // ── selected option (a REFERENCE to a profile option-table row, never a value copy) ───────────
  function makeSelectedOption(o) {
    o = o || {};
    var errors = [];
    if (!_isEnum(SETUP_OPTION_CATEGORY, o.category)) errors.push('bad_category');
    var idErr = _idError('option_id', o.optionId); if (idErr) errors.push(idErr);
    return {
      kind: 'selected_option',
      category: o.category || null,
      optionId: o.optionId || null,
      appliesToParameter: o.appliesToParameter || null, // canonical param key this option feeds (optional)
      note: o.note || null,
      valid: errors.length === 0, errors: errors,
    };
  }

  // ── measured setting (a provenance-tagged RawSourceValue; ratio/unit rules inherited) ─────────
  function _asRawSource(v) {
    return CP.makeRawSource(v || {});               // ALWAYS rebuild + revalidate — never trust a caller kind/valid flag
  }

  /**
   * Build a SetupSnapshot. Fail-closed: any contract violation yields valid:false + errors[]; it never
   * throws and never auto-fills a missing value. Does not mutate the caller input.
   */
  function _failClosedSnapshot(err) { return { kind: 'setup_snapshot', schemaVersion: SCHEMA_VERSION, snapshotId: null, vehicleProfileId: null, selectedOptions: [], measuredSettings: {}, electronicSettings: {}, tyreContext: null, unresolvedSelections: [], provenanceSummary: { measuredCount: 0, byProvenance: { documented: 0, derived: 0, measured: 0, estimated: 0, unknown: 0 }, selectedOptionCount: 0, unresolvedCount: 0 }, valid: false, errors: [err] }; }
  function makeSetupSnapshot(rawInput) {
    // public boundary: any structural-read exception (getter/Proxy trap) → fail closed, never crash
    try { return _makeSetupSnapshotInner(rawInput); }
    catch (e) { return _failClosedSnapshot('exotic_or_unreadable_input'); }
  }
  function _makeSetupSnapshotInner(rawInput) {
    // run the JSON-safety check BEFORE cloning → an accessor/getter is never executed
    if (!_isJsonSafe(rawInput)) return _failClosedSnapshot('non_json_safe_input');
    var errors = [];
    var input = _clone(rawInput) || {}; // clone: never alias caller input; snapshot isolated from later edits

    var snapErr = _idError('snapshot_id', input.snapshotId); if (snapErr) errors.push(snapErr);
    var vpErr = _idError('vehicle_profile_id', input.vehicleProfileId); if (vpErr) errors.push(vpErr);
    var schemaVersion = input.schemaVersion || SCHEMA_VERSION;
    if (!_isCompatibleVersion(schemaVersion)) errors.push('incompatible_schema_version');

    // selected options
    var selectedOptions = Array.isArray(input.selectedOptions) ? input.selectedOptions.map(makeSelectedOption) : [];
    if (input.selectedOptions != null && !Array.isArray(input.selectedOptions)) errors.push('selected_options_not_array');
    selectedOptions.forEach(function (s, i) { if (!s.valid) errors.push('selected_option_' + i + '_invalid'); });

    // measured settings (each a RawSourceValue)
    var measuredSettings = {};
    var msIn = input.measuredSettings || {};
    Object.keys(msIn).forEach(function (k) {
      var rs = _asRawSource(msIn[k]);
      measuredSettings[k] = rs;
      if (!rs.valid) errors.push('measured_' + k + '_invalid');
      if (typeof rs.source === 'string' && _looksLikePath(rs.source)) errors.push('measured_' + k + '_source_private');
    });

    // electronic settings: FIXED allowlist + scalar value + private-ref on strings (SHARED schema check),
    // then whitelist-rebuilt {value, unit, note}; an unknown setting key is a hard error and is not stored.
    var esIn = input.electronicSettings || {};
    _checkElectronic(esIn, errors);
    var electronicSettings = {};
    Object.keys(esIn).forEach(function (k) {
      if (ELECTRONIC_KEYS.indexOf(k) === -1) return; // unknown key already errored above; never stored
      var e = esIn[k];
      if (e == null || typeof e !== 'object' || Array.isArray(e)) return; // primitive/array entry already errored; never stored
      var val = ('value' in e) ? e.value : null;
      if (val != null && !_isScalarOk(val)) val = null;
      else if (typeof val === 'string' && _looksLikePath(val)) val = null;
      electronicSettings[k] = { value: val, unit: e.unit || null, note: e.note || null };
    });

    // tyre context (nullable; FIXED allowlist + scalar + private-ref on every string — SHARED schema check)
    var tyreContext = input.tyreContext || null;
    _checkTyreContext(tyreContext, errors);

    // unresolved selections: chosen, but canonical value is blocked (e.g. unknown ARB MR)
    var unresolvedSelections = Array.isArray(input.unresolvedSelections) ? input.unresolvedSelections.map(function (u) {
      u = u || {};
      var bad = !_isEnum(SETUP_OPTION_CATEGORY, u.category) || typeof u.reason !== 'string' || !u.reason;
      if (bad) errors.push('unresolved_selection_malformed');
      return { category: u.category || null, optionId: u.optionId || null, reason: u.reason || null, parameterKey: u.parameterKey || null };
    }) : [];
    if (input.unresolvedSelections != null && !Array.isArray(input.unresolvedSelections)) errors.push('unresolved_selections_not_array');

    var snapshot = {
      kind: 'setup_snapshot',
      schemaVersion: schemaVersion,
      snapshotId: input.snapshotId || null,
      vehicleProfileId: input.vehicleProfileId || null,
      selectedOptions: selectedOptions,
      measuredSettings: measuredSettings,
      electronicSettings: electronicSettings,
      tyreContext: tyreContext,
      unresolvedSelections: unresolvedSelections,
      valid: errors.length === 0,
      errors: errors,
    };
    snapshot.provenanceSummary = summarizeSetupProvenance(snapshot);
    return snapshot;
  }

  /** Pure validation of an already-built snapshot (used by analysis-case binding checks). */
  function validateSetupSnapshot(snapshot) {
    try { return _validateSetupSnapshotInner(snapshot); }
    catch (e) { return { ok: false, errors: ['exotic_or_unreadable_input'], warnings: [] }; }
  }
  function _validateSetupSnapshotInner(snapshot) {
    var errors = [];
    if (!snapshot || snapshot.kind !== 'setup_snapshot') return { ok: false, errors: ['not_setup_snapshot'], warnings: [] };
    // JSON-safety check FIRST; on failure return IMMEDIATELY so a rejected accessor's getter is never executed
    if (!_isJsonSafe(snapshot)) return { ok: false, errors: ['non_json_safe_input'], warnings: [] };
    if (_idError('snapshot_id', snapshot.snapshotId)) errors.push('snapshot_id_invalid_or_private');
    if (_idError('vehicle_profile_id', snapshot.vehicleProfileId)) errors.push('vehicle_profile_id_invalid_or_private');
    if (!_isCompatibleVersion(snapshot.schemaVersion)) errors.push('incompatible_schema_version');
    // RE-RUN the builders — never trust a nested `.valid` flag a tamperer could set
    if (snapshot.selectedOptions != null && !Array.isArray(snapshot.selectedOptions)) errors.push('selected_options_not_array');
    (snapshot.selectedOptions || []).forEach(function (s, i) { if (!makeSelectedOption(s).valid) errors.push('selected_option_' + i + '_invalid'); });
    var msv = snapshot.measuredSettings || {};
    if (typeof msv !== 'object' || Array.isArray(msv)) errors.push('measured_settings_not_object');
    else Object.keys(msv).forEach(function (k) {
      var rs = CP.makeRawSource(msv[k] || {});
      if (!rs.valid) errors.push('measured_' + k + '_invalid');
      if (typeof rs.source === 'string' && _looksLikePath(rs.source)) errors.push('measured_' + k + '_source_private');
    });
    // re-run the SAME tyre / electronic schema check as make() (shared helpers → no rule drift)
    _checkTyreContext(snapshot.tyreContext, errors);
    _checkElectronic(snapshot.electronicSettings, errors);
    return { ok: errors.length === 0 && snapshot.valid !== false, errors: errors, warnings: [] };
  }

  /** Provenance tally over the measured settings (pure; derived/estimated/unknown never collapse). */
  function summarizeSetupProvenance(snapshot) {
    var counts = { documented: 0, derived: 0, measured: 0, estimated: 0, unknown: 0 };
    var ms = (snapshot && snapshot.measuredSettings) || {};
    Object.keys(ms).forEach(function (k) {
      var p = ms[k] && ms[k].provenance;
      if (counts[p] != null) counts[p] += 1; else counts.unknown += 1;
    });
    return {
      measuredCount: Object.keys(ms).length,
      byProvenance: counts,
      selectedOptionCount: (snapshot && snapshot.selectedOptions || []).length,
      unresolvedCount: (snapshot && snapshot.unresolvedSelections || []).length,
    };
  }

  var api = {
    SCHEMA_VERSION: SCHEMA_VERSION, SETUP_OPTION_CATEGORY: SETUP_OPTION_CATEGORY,
    isPrivateRef: isPrivateRef,
    makeSelectedOption: makeSelectedOption, makeSetupSnapshot: makeSetupSnapshot,
    validateSetupSnapshot: validateSetupSnapshot, summarizeSetupProvenance: summarizeSetupProvenance,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SetupSnapshot = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
