/**
 * case-record-schema.js — R3.0B: local-record sanitization + portable-bundle build/validate (PURE).
 *
 * LOCAL fidelity: sanitizeForStorage(value) → all-or-nothing. JSON-safe; reject cyclic / non-plain (Date/RegExp/
 * class) / function; every array length ≤ ARRAY_CAP, depth ≤ DEPTH_CAP, total bytes ≤ BYTES_CAP. If ANY node
 * violates, it REJECTS ({ok:false, violations}) and stores NOTHING — so a `local_full` record always round-trips
 * identically. (Raw telemetry = thousands of samples > ARRAY_CAP → rejected; the real view model's small arrays pass.)
 *
 * PORTABLE safety: toPortableBundle(localRecord) → a curated, strictly-allowlisted, value-constrained bundle (the
 * only artifact export/import use). Required fields validated; optional fields failing a constraint are EXCLUDED +
 * logged in meta.excludedFields (schema-owned tokens, never source keys); >EXCL_CAP exclusions → reject.
 * validatePortableBundle(bundle) re-enforces on import AND fail-closes on an unsupported FUTURE schemaVersion
 * (never silently downgraded). Grammar fields reject any value violating their grammar/length; free-text title/note
 * are length-capped user metadata.
 *
 * UMD: Node require / Electron renderer global (CaseRecordSchema).
 */
(function (root) {
  'use strict';

  var ARRAY_CAP = 256, DEPTH_CAP = 12, BYTES_CAP = 2000000, EXCL_CAP = 256;
  var BUNDLE_SCHEMA_VERSION = 1;
  var ENUMS = {
    status: ['draft', 'ready', 'complete', 'archived'],
    recordType: ['local_full', 'imported_summary'],
    provenance: ['synthetic', 'real', 'unverified', 'imported_bundle'],
    source: ['demo_case', 'imported_csv', 'imported_bundle'],
    credibility: ['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable'],
  };
  var RE_ID = /^[A-Za-z0-9_.:-]{1,64}$/, RE_CODE = /^[A-Z0-9_]{1,64}$/, RE_KEY = /^[A-Za-z0-9_]{1,64}$/;

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  function _utf8Len(str) { try { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str).length; } catch (e) { } var n = 0; for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); n += c < 0x80 ? 1 : c < 0x800 ? 2 : (c >= 0xD800 && c <= 0xDBFF) ? (i++, 4) : 3; } return n; }
  function _scalarOk(v) { return v === null || typeof v === 'string' || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)); }

  // ── LOCAL: all-or-nothing universal bounded sanitizer ──
  // Builds the sanitized clone via property DESCRIPTORS (never invokes a getter), detects cycles with a visited
  // stack, and serializes ONLY the resulting clean clone for the byte cap (no JSON.stringify over the raw input).
  function sanitizeForStorage(value) {
    var violations = [], seen = [];
    function bad(at, kind) { violations.push({ at: at, kind: kind }); return undefined; }
    function walk(v, depth, at) {
      if (violations.length) return undefined;
      if (depth > DEPTH_CAP) return bad(at, 'too_deep');
      if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
      if (typeof v === 'number') return isFinite(v) ? v : bad(at, 'non_finite');
      if (typeof v === 'undefined') return bad(at, 'undefined_value');
      if (typeof v === 'function' || typeof v === 'symbol' || typeof v === 'bigint') return bad(at, 'non_plain');
      if (seen.indexOf(v) !== -1) return bad(at, 'cyclic');
      seen.push(v); var out;
      if (Array.isArray(v)) {
        if (v.length > ARRAY_CAP) { seen.pop(); return bad(at, 'oversized_array'); }
        if (Object.getOwnPropertySymbols(v).length) { seen.pop(); return bad(at, 'symbol_key'); }
        var ak = Object.getOwnPropertyNames(v);
        for (var ai = 0; ai < ak.length; ai++) { var akey = ak[ai]; if (akey === 'length') continue; var aidx = Number(akey); if (String(aidx) !== akey || !Number.isInteger(aidx) || aidx < 0 || aidx >= v.length) { seen.pop(); return bad(at + '.' + akey, 'array_extra_property'); } var ad = Object.getOwnPropertyDescriptor(v, akey); if (ad && (typeof ad.get === 'function' || typeof ad.set === 'function')) { seen.pop(); return bad(at + '[' + akey + ']', 'accessor_property'); } if (!ad || ad.enumerable !== true) { seen.pop(); return bad(at + '[' + akey + ']', 'non_data_property'); } }
        out = [];
        for (var i = 0; i < v.length; i++) { var idesc = Object.getOwnPropertyDescriptor(v, i); if (!idesc) { seen.pop(); return bad(at + '[' + i + ']', 'sparse_array'); } if (typeof idesc.get === 'function' || typeof idesc.set === 'function') { seen.pop(); return bad(at + '[' + i + ']', 'accessor_property'); } out[i] = walk(idesc.value, depth + 1, at + '[]'); if (violations.length) { seen.pop(); return undefined; } }
      } else {
        if (!_isPlain(v)) { seen.pop(); return bad(at, 'non_plain'); }
        if (Object.getOwnPropertySymbols(v).length) { seen.pop(); return bad(at, 'symbol_key'); }
        out = {};
        var names = Object.getOwnPropertyNames(v);
        for (var k = 0; k < names.length; k++) {
          var nk = names[k], d = Object.getOwnPropertyDescriptor(v, nk);
          if (!d || typeof d.get === 'function' || typeof d.set === 'function') { seen.pop(); return bad(at + '.' + nk, 'accessor_property'); }
          if (d.enumerable !== true) { seen.pop(); return bad(at + '.' + nk, 'non_enumerable_property'); }
          if (d.value === undefined) { seen.pop(); return bad(at + '.' + nk, 'undefined_value'); }
          var cval = walk(d.value, depth + 1, at + '.' + nk);
          if (violations.length) { seen.pop(); return undefined; }
          // define (not assign) so a "__proto__"/"constructor" key becomes a real OWN data property — no prototype pollution
          Object.defineProperty(out, nk, { value: cval, enumerable: true, writable: true, configurable: true });
        }
      }
      seen.pop();
      return out;
    }
    var clone = walk(value, 0, '$');
    if (violations.length) return { ok: false, violations: violations.slice(0, 64) };
    var json;
    try { json = JSON.stringify(clone); } catch (e) { return { ok: false, violations: [{ at: '$', kind: 'cyclic' }] }; }
    if (json && _utf8Len(json) > BYTES_CAP) return { ok: false, violations: [{ at: '$', kind: 'too_large' }] }; // UTF-8 bytes, not UTF-16 units
    return { ok: true, value: clone };
  }

  // ── PORTABLE: curated, value-constrained allowlist ──
  function _str(v, cap) { return (typeof v === 'string' && v.length <= cap) ? v : undefined; }
  function _num(v) { return (typeof v === 'number' && isFinite(v)) ? v : undefined; }
  function _bool(v) { return typeof v === 'boolean' ? v : undefined; }
  function _enum(v, name) { return ENUMS[name].indexOf(v) !== -1 ? v : undefined; }
  function _id(v) { return (typeof v === 'string' && RE_ID.test(v)) ? v : undefined; }
  function _codeArr(arr, ex, at) { if (!Array.isArray(arr)) return []; var out = []; for (var i = 0; i < arr.length && i < 64; i++) { var c = arr[i] && (arr[i].code != null ? arr[i].code : arr[i]); if (typeof c === 'string' && RE_CODE.test(c)) out.push({ code: c }); else ex.push({ at: at, kind: 'constraint_violation', n: 1 }); } if (arr.length > 64) ex.push({ at: at, kind: 'oversized_array', n: arr.length }); return out; }

  // non-silent exclusion: count keys NOT on the allowlist for a level → ONE aggregated entry (no source key copied)
  function _logUnknown(src, allow, level, ex) { if (!_isPlain(src)) return; var n = 0; var ks = Object.keys(src); for (var i = 0; i < ks.length; i++) if (allow.indexOf(ks[i]) === -1) n++; if (n > 0) ex.push({ at: level, kind: 'not_allowlisted', n: n }); }
  var ALLOW = {
    top: ['caseId', 'recordType', 'schemaVersion', 'metadata', 'associations', 'setupSnapshot', 'setupSnapshotSummary', 'analysisResults', 'shellEvidence', 'sanitizedEvidenceSummary', 'telemetrySourceRef'],
    metadata: ['title', 'note', 'vehicle', 'track', 'status', 'createdAt', 'updatedAt', 'pinned', 'archived'],
    associations: ['vehicleProfileId', 'setupRevisionId', 'telemetrySessionId', 'trackId', 'parentCaseId', 'comparisonGroupId', 'experimentId', 'followUpCaseIds'],
    setupSnapshot: ['frontWheelRate', 'rearWheelRate', 'frontArb', 'rearArb', 'mass', 'frontWeightPct', 'cgHeight'],
    analysisResults: ['caseHeader', 'capabilitySummary', 'setupInputs', 'modelPrediction', 'telemetryObservation', 'measuredMetrics', 'modelVsActual', 'quantitativeRecommendation', 'trackIntelligence', 'raceEngineer', 'driverCoach', 'evidenceDrawer'],
    shellEvidence: ['capability', 'observation', 'source'],
  };

  function toPortableBundle(rec) {
    if (!_isPlain(rec)) return { ok: false, reason: 'BUNDLE_INVALID', field: '$' };
    var ex = [];
    var md = rec.metadata || {}, as = rec.associations || {}, ar = rec.analysisResults || {}, se = rec.shellEvidence || {}, ss = rec.setupSnapshot || rec.setupSnapshotSummary || {};
    _logUnknown(rec, ALLOW.top, '$', ex); _logUnknown(md, ALLOW.metadata, 'metadata', ex); _logUnknown(as, ALLOW.associations, 'associations', ex);
    _logUnknown(ss, ALLOW.setupSnapshot, 'setupSnapshot', ex); _logUnknown(ar, ALLOW.analysisResults, 'analysisResults', ex); _logUnknown(se, ALLOW.shellEvidence, 'shellEvidence', ex);
    // required
    var title = _str(md.title, 200), status = _enum(md.status, 'status'), createdAt = _str(md.createdAt, 40), caseId = _id(rec.caseId), recordType = _enum(rec.recordType, 'recordType') || 'local_full';
    if (title === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.title' };
    if (status === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.status' };
    if (createdAt === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.createdAt' };
    if (caseId === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'caseId' };
    // capability: keys grammar + boolean values, ≤64
    var cap = {}; var capSrc = se.capability || {}; var capKeys = Object.keys(capSrc); if (capKeys.length > 64) ex.push({ at: 'shellEvidence.capability', kind: 'oversized_object', n: capKeys.length });
    capKeys.slice(0, 64).forEach(function (k) { if (RE_KEY.test(k) && typeof capSrc[k] === 'boolean') cap[k] = capSrc[k]; else ex.push({ at: 'shellEvidence.capability', kind: 'constraint_violation', n: 1 }); });
    var followUp = []; if (Array.isArray(as.followUpCaseIds)) { as.followUpCaseIds.slice(0, 256).forEach(function (x) { var id = _id(x); if (id) followUp.push(id); else ex.push({ at: 'associations.followUpCaseIds', kind: 'constraint_violation', n: 1 }); }); if (as.followUpCaseIds.length > 256) ex.push({ at: 'associations.followUpCaseIds', kind: 'oversized_array', n: as.followUpCaseIds.length }); }
    var rs = (ar.modelVsActual || {}), mm = (ar.measuredMetrics || {}), mp = (ar.modelPrediction || {});
    var bundle = {
      meta: { schemaVersion: BUNDLE_SCHEMA_VERSION, recordType: recordType, excludedFields: [] },
      caseId: caseId,
      metadata: { title: title, note: _str(md.note, 200) || null, vehicle: _str(md.vehicle, 80) || null, track: _str(md.track, 80) || null, status: status, createdAt: createdAt, updatedAt: _str(md.updatedAt, 40) || null, pinned: _bool(md.pinned) || false, archived: _bool(md.archived) || false },
      associations: { vehicleProfileId: _id(as.vehicleProfileId) || null, setupRevisionId: _id(as.setupRevisionId) || null, telemetrySessionId: _id(as.telemetrySessionId) || null, trackId: _id(as.trackId) || null, parentCaseId: _id(as.parentCaseId) || null, comparisonGroupId: _id(as.comparisonGroupId) || null, experimentId: _id(as.experimentId) || null, followUpCaseIds: followUp },
      setupSnapshotSummary: { frontWheelRate: _num(ss.frontWheelRate) != null ? _num(ss.frontWheelRate) : null, rearWheelRate: _num(ss.rearWheelRate) != null ? _num(ss.rearWheelRate) : null, frontArb: _num(ss.frontArb) != null ? _num(ss.frontArb) : null, rearArb: _num(ss.rearArb) != null ? _num(ss.rearArb) : null, mass: _num(ss.mass) != null ? _num(ss.mass) : null, frontWeightPct: _num(ss.frontWeightPct) != null ? _num(ss.frontWeightPct) : null, cgHeight: _num(ss.cgHeight) != null ? _num(ss.cgHeight) : null },
      resultsSummary: {
        overallStatus: _str((ar.caseHeader || {}).overallStatus, 64) || null,
        understeerGradient: _num((mp.understeerGradient || {}).value) != null ? _num((mp.understeerGradient || {}).value) : null,
        predictedTendency: _str(((mp.predictedTendency || {}).value), 64) || null,
        measuredKUs: _num((mm.measuredKUs || {}).value) != null ? _num((mm.measuredKUs || {}).value) : null,
        agreementClass: _str(mm.agreementClass, 64) || null,
        provenance: _enum(mm.dataProvenance, 'provenance') || null,
        capabilitySummary: (Array.isArray(ar.capabilitySummary) ? ar.capabilitySummary.slice(0, 64).map(function (c) { return (c && typeof c.key === 'string' && RE_KEY.test(c.key) && typeof c.available === 'boolean') ? { key: c.key, available: c.available } : null; }).filter(Boolean) : []),
        blockedReasons: _codeArr((rs.blockedReasons || []), ex, 'resultsSummary.blockedReasons'),
      },
      shellEvidenceSummary: { capability: cap, observationBlockedReasons: _codeArr(((se.observation || {}).blockedReasons || []), ex, 'shellEvidenceSummary.observationBlockedReasons'), source: _enum(se.source, 'source') || null },
    };
    if (ex.length > EXCL_CAP) return { ok: false, reason: 'TOO_MANY_EXCLUSIONS', count: ex.length };
    bundle.meta.excludedFields = ex.slice(0, EXCL_CAP);
    return { ok: true, bundle: bundle, excludedFields: bundle.meta.excludedFields };
  }

  // an imported bundle is an UNTRUSTED surface: any field off the bundle allowlist is rejected fail-closed.
  var BUNDLE_ALLOW = {
    $: ['meta', 'caseId', 'metadata', 'associations', 'setupSnapshotSummary', 'resultsSummary', 'shellEvidenceSummary'],
    meta: ['schemaVersion', 'recordType', 'excludedFields'],
    metadata: ['title', 'note', 'vehicle', 'track', 'status', 'createdAt', 'updatedAt', 'pinned', 'archived'],
    associations: ['vehicleProfileId', 'setupRevisionId', 'telemetrySessionId', 'trackId', 'parentCaseId', 'comparisonGroupId', 'experimentId', 'followUpCaseIds'],
    setupSnapshotSummary: ['frontWheelRate', 'rearWheelRate', 'frontArb', 'rearArb', 'mass', 'frontWeightPct', 'cgHeight'],
    resultsSummary: ['overallStatus', 'understeerGradient', 'predictedTendency', 'measuredKUs', 'agreementClass', 'provenance', 'capabilitySummary', 'blockedReasons'],
    shellEvidenceSummary: ['capability', 'observationBlockedReasons', 'source'],
  };
  // per-array-element allowed key shapes (capability is a dynamic flag map validated separately by RE_KEY)
  var ARR_SHAPE = [
    { at: 'resultsSummary.capabilitySummary', get: function (b) { return b.resultsSummary && b.resultsSummary.capabilitySummary; }, keys: ['key', 'available'], vals: function (it) { return typeof it.key === 'string' && typeof it.available === 'boolean'; } },
    { at: 'resultsSummary.blockedReasons', get: function (b) { return b.resultsSummary && b.resultsSummary.blockedReasons; }, keys: ['code'], vals: function (it) { return typeof it.code === 'string'; } },
    { at: 'shellEvidenceSummary.observationBlockedReasons', get: function (b) { return b.shellEvidenceSummary && b.shellEvidenceSummary.observationBlockedReasons; }, keys: ['code'], vals: function (it) { return typeof it.code === 'string'; } },
    { at: 'meta.excludedFields', get: function (b) { return b.meta && b.meta.excludedFields; }, keys: ['at', 'kind', 'n'], vals: function (it) { return typeof it.at === 'string' && it.at.length <= 80 && /^[A-Za-z0-9_.[\]$<>]+$/.test(it.at) && typeof it.kind === 'string' && it.kind.length <= 40 && /^[A-Za-z0-9_]+$/.test(it.kind) && Number.isInteger(it.n) && it.n >= 0; } },
  ];
  function _firstUnknown(bundle) {
    var levels = Object.keys(BUNDLE_ALLOW);
    for (var i = 0; i < levels.length; i++) { var lv = levels[i]; var obj = lv === '$' ? bundle : bundle[lv]; if (!_isPlain(obj)) continue; var ks = Object.keys(obj); for (var j = 0; j < ks.length; j++) if (BUNDLE_ALLOW[lv].indexOf(ks[j]) === -1) return lv + '.' + ks[j]; }
    // descend into array-element shapes — reject an injected KEY or a wrong-TYPE value (not silently dropped)
    for (var a = 0; a < ARR_SHAPE.length; a++) {
      var spec = ARR_SHAPE[a], arr = spec.get(bundle);
      if (!Array.isArray(arr)) continue;
      for (var e = 0; e < arr.length; e++) { var it = arr[e]; if (!_isPlain(it)) return spec.at + '[' + e + ']'; var ik = Object.keys(it); for (var k = 0; k < ik.length; k++) if (spec.keys.indexOf(ik[k]) === -1) return spec.at + '[' + e + '].' + ik[k]; if (spec.vals && !spec.vals(it)) return spec.at + '[' + e + '].<value>'; }
    }
    var fu = bundle.associations && bundle.associations.followUpCaseIds;
    if (Array.isArray(fu)) { for (var f = 0; f < fu.length; f++) if (typeof fu[f] !== 'string') return 'associations.followUpCaseIds[' + f + ']'; }
    return null;
  }

  // strict VALUE validator for an untrusted imported bundle — reject any value that fails its grammar/enum/cap/type
  function _strOrNull(x, cap) { return x === null || x === undefined || (typeof x === 'string' && x.length <= cap); }
  function _numOrNull(x) { return x === null || x === undefined || (typeof x === 'number' && isFinite(x)); }
  function _idOrNull(x) { return x === null || x === undefined || (typeof x === 'string' && RE_ID.test(x)); }
  function _strictBundleErrors(b) {
    if (!(typeof b.caseId === 'string' && RE_ID.test(b.caseId))) return 'caseId';
    if (!(b.meta && Number.isInteger(b.meta.schemaVersion))) return 'meta.schemaVersion';
    if (ENUMS.recordType.indexOf(b.meta.recordType) === -1) return 'meta.recordType';
    var md = b.metadata || {};
    if (!(typeof md.title === 'string' && md.title.length <= 200)) return 'metadata.title';
    if (!_strOrNull(md.note, 200)) return 'metadata.note';
    if (!_strOrNull(md.vehicle, 80)) return 'metadata.vehicle';
    if (!_strOrNull(md.track, 80)) return 'metadata.track';
    if (ENUMS.status.indexOf(md.status) === -1) return 'metadata.status';
    if (!(typeof md.createdAt === 'string' && md.createdAt.length <= 40)) return 'metadata.createdAt';
    if (!_strOrNull(md.updatedAt, 40)) return 'metadata.updatedAt';
    if (md.pinned !== undefined && typeof md.pinned !== 'boolean') return 'metadata.pinned';
    if (md.archived !== undefined && typeof md.archived !== 'boolean') return 'metadata.archived';
    var as = b.associations || {};
    var idf = ['vehicleProfileId', 'setupRevisionId', 'telemetrySessionId', 'trackId', 'parentCaseId', 'comparisonGroupId', 'experimentId'];
    for (var i = 0; i < idf.length; i++) if (!_idOrNull(as[idf[i]])) return 'associations.' + idf[i];
    if (as.followUpCaseIds !== undefined) { if (!Array.isArray(as.followUpCaseIds) || as.followUpCaseIds.length > 256) return 'associations.followUpCaseIds'; for (var f = 0; f < as.followUpCaseIds.length; f++) if (!(typeof as.followUpCaseIds[f] === 'string' && RE_ID.test(as.followUpCaseIds[f]))) return 'associations.followUpCaseIds[' + f + ']'; }
    var ss = b.setupSnapshotSummary || {}, sk = ['frontWheelRate', 'rearWheelRate', 'frontArb', 'rearArb', 'mass', 'frontWeightPct', 'cgHeight'];
    for (var s = 0; s < sk.length; s++) if (!_numOrNull(ss[sk[s]])) return 'setupSnapshotSummary.' + sk[s];
    var rs = b.resultsSummary || {};
    if (!_strOrNull(rs.overallStatus, 64)) return 'resultsSummary.overallStatus';
    if (!_numOrNull(rs.understeerGradient)) return 'resultsSummary.understeerGradient';
    if (!_strOrNull(rs.predictedTendency, 64)) return 'resultsSummary.predictedTendency';
    if (!_numOrNull(rs.measuredKUs)) return 'resultsSummary.measuredKUs';
    if (!_strOrNull(rs.agreementClass, 64)) return 'resultsSummary.agreementClass';
    if (!(rs.provenance === null || rs.provenance === undefined || ENUMS.provenance.indexOf(rs.provenance) !== -1)) return 'resultsSummary.provenance';
    if (rs.capabilitySummary !== undefined) { if (!Array.isArray(rs.capabilitySummary) || rs.capabilitySummary.length > 64) return 'resultsSummary.capabilitySummary'; for (var c = 0; c < rs.capabilitySummary.length; c++) { var it = rs.capabilitySummary[c]; if (!_isPlain(it) || typeof it.key !== 'string' || !RE_KEY.test(it.key) || typeof it.available !== 'boolean') return 'resultsSummary.capabilitySummary[' + c + ']'; } }
    if (rs.blockedReasons !== undefined) { if (!Array.isArray(rs.blockedReasons) || rs.blockedReasons.length > 64) return 'resultsSummary.blockedReasons'; for (var br = 0; br < rs.blockedReasons.length; br++) { var b2 = rs.blockedReasons[br]; if (!_isPlain(b2) || typeof b2.code !== 'string' || !RE_CODE.test(b2.code)) return 'resultsSummary.blockedReasons[' + br + ']'; } }
    var se = b.shellEvidenceSummary || {};
    if (se.capability !== undefined) { if (!_isPlain(se.capability)) return 'shellEvidenceSummary.capability'; var cks = Object.keys(se.capability); if (cks.length > 64) return 'shellEvidenceSummary.capability'; for (var ck = 0; ck < cks.length; ck++) if (!(RE_KEY.test(cks[ck]) && typeof se.capability[cks[ck]] === 'boolean')) return 'shellEvidenceSummary.capability.' + cks[ck]; }
    if (se.observationBlockedReasons !== undefined) { if (!Array.isArray(se.observationBlockedReasons) || se.observationBlockedReasons.length > 256) return 'shellEvidenceSummary.observationBlockedReasons'; for (var ob = 0; ob < se.observationBlockedReasons.length; ob++) { var o2 = se.observationBlockedReasons[ob]; if (!_isPlain(o2) || typeof o2.code !== 'string' || !RE_CODE.test(o2.code)) return 'shellEvidenceSummary.observationBlockedReasons[' + ob + ']'; } }
    if (!(se.source === null || se.source === undefined || ENUMS.source.indexOf(se.source) !== -1)) return 'shellEvidenceSummary.source';
    return null;
  }

  function validatePortableBundle(bundle) {
    // sanitize the ROOT FIRST — before ANY field access — so a getter on bundle/meta/etc cannot fire. Only a
    // plain-data (no accessors/inherited/non-enumerable), bounded, JSON-stable clone survives.
    var gate = sanitizeForStorage(bundle);
    if (!gate.ok) return { ok: false, reason: 'BUNDLE_NOT_PLAIN', violations: gate.violations };
    bundle = gate.value;
    if (!_isPlain(bundle) || !_isPlain(bundle.meta)) return { ok: false, reason: 'NOT_A_BUNDLE' };
    var v = bundle.meta.schemaVersion;
    if (typeof v !== 'number' || !isFinite(v)) return { ok: false, reason: 'BAD_VERSION' };
    if (v > BUNDLE_SCHEMA_VERSION) return { ok: false, reason: 'UNSUPPORTED_FUTURE_VERSION', detail: { found: v, current: BUNDLE_SCHEMA_VERSION } }; // fail-closed (CP1 r15)
    var unknown = _firstUnknown(bundle);
    if (unknown) return { ok: false, reason: 'BUNDLE_HAS_UNKNOWN_FIELDS', field: unknown }; // untrusted import: reject off-allowlist fields
    var verr = _strictBundleErrors(bundle);
    if (verr) return { ok: false, reason: 'BUNDLE_VALUE_INVALID', field: verr }; // reject constraint-invalid values (no silent recanonicalization)
    // (v < current would migrate here; none defined at v1)
    var md = bundle.metadata || {};
    if (_id(bundle.caseId) === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'caseId' };
    if (_str(md.title, 200) === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.title' };
    if (_enum(md.status, 'status') === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.status' };
    if (_str(md.createdAt, 40) === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'metadata.createdAt' };
    if (_enum(bundle.meta.recordType, 'recordType') === undefined) return { ok: false, reason: 'BUNDLE_INVALID', field: 'meta.recordType' };
    // re-run the curated builder over the bundle to re-enforce every value constraint (idempotent for a clean bundle)
    var rebuilt = toPortableBundle({ caseId: bundle.caseId, recordType: bundle.meta.recordType, metadata: md, associations: bundle.associations, setupSnapshot: bundle.setupSnapshotSummary, analysisResults: { caseHeader: { overallStatus: (bundle.resultsSummary || {}).overallStatus }, capabilitySummary: (bundle.resultsSummary || {}).capabilitySummary, modelPrediction: { understeerGradient: { value: (bundle.resultsSummary || {}).understeerGradient }, predictedTendency: { value: (bundle.resultsSummary || {}).predictedTendency } }, measuredMetrics: { measuredKUs: { value: (bundle.resultsSummary || {}).measuredKUs }, agreementClass: (bundle.resultsSummary || {}).agreementClass, dataProvenance: (bundle.resultsSummary || {}).provenance }, modelVsActual: { blockedReasons: (bundle.resultsSummary || {}).blockedReasons } }, shellEvidence: { capability: (bundle.shellEvidenceSummary || {}).capability, observation: { blockedReasons: (bundle.shellEvidenceSummary || {}).observationBlockedReasons }, source: (bundle.shellEvidenceSummary || {}).source } });
    if (!rebuilt.ok) return { ok: false, reason: rebuilt.reason, field: rebuilt.field };
    return { ok: true, bundle: rebuilt.bundle };
  }

  var api = { sanitizeForStorage: sanitizeForStorage, toPortableBundle: toPortableBundle, validatePortableBundle: validatePortableBundle, ARRAY_CAP: ARRAY_CAP, DEPTH_CAP: DEPTH_CAP, BUNDLE_SCHEMA_VERSION: BUNDLE_SCHEMA_VERSION, ENUMS: ENUMS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CaseRecordSchema = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
