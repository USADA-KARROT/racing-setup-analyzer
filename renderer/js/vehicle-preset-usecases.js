/**
 * vehicle-preset-usecases.js — R3-UX0: renderer-independent vehicle-preset read pipeline + non-persistent draft (PURE/UMD).
 *
 * Browse is READ-ONLY and returns deep-copy projections (never the live CAR_PRESETS reference, so a UI consumer
 * cannot mutate preset data). Building a draft yields an in-memory object only — never persisted, never analysed,
 * never a case. Apply-to-case is preview + opaque revision/expiry-bound token + confirm (surfaced `unavailable`
 * until safely wired). The preset source is injected (Node-testable with a fixture source ≠ the production api).
 *
 * UMD: Node require / Electron renderer global (VehiclePresetUseCases).
 */
(function (root) {
  'use strict';

  function _clone(v) { if (v == null) return v; try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; } }
  function _manufacturerOf(id) { return (typeof id === 'string' && id.indexOf('_') !== -1) ? id.split('_')[0] : (id || ''); }
  function _lc(s) { return (s == null ? '' : String(s)).toLowerCase(); }

  // default source reads the existing global api / car-presets (the production wiring)
  function _defaultSource() {
    var g = root || (typeof globalThis !== 'undefined' ? globalThis : {});
    var api = g.api || null;
    return {
      getSummaries: function () { if (api && typeof api.getPresets === 'function') return api.getPresets(); if (typeof g.getAllPresetsSummary === 'function') return g.getAllPresetsSummary(); return []; },
      getPreset: function (id) { if (api && typeof api.getPreset === 'function') return api.getPreset(id); if (typeof g.getPreset === 'function') return g.getPreset(id); return null; },
    };
  }

  function createVehiclePresetUseCases(source) {
    var src = source || _defaultSource();

    // READ-ONLY: list (deep-copied summaries) with search + manufacturer + layout filters
    function listVehiclePresets(filters) {
      filters = filters || {};
      var q = _lc(filters.search), fm = _lc(filters.manufacturer), fl = _lc(filters.layout);
      var rows = (src.getSummaries() || []).map(function (s) {
        var m = _manufacturerOf(s.id);
        return _clone({ id: s.id, name: s.name, name_zh: s.name_zh, manufacturer: m, category: s.category, years: s.years, layout: s.layout, weight: s.weight, weight_dist: s.weight_dist, oem_tire: s.oem_tire, damper_adjustable: s.damper_adjustable, arb_adjustable: s.arb_adjustable });
      });
      return rows.filter(function (r) {
        if (fm && _lc(r.manufacturer) !== fm) return false;
        if (fl && _lc(r.layout).indexOf(fl) === -1) return false;
        if (q) { var hay = _lc(r.name) + ' ' + _lc(r.name_zh) + ' ' + _lc(r.id) + ' ' + _lc(r.manufacturer); if (hay.indexOf(q) === -1) return false; }
        return true;
      });
    }

    function manufacturers() { var set = {}; (src.getSummaries() || []).forEach(function (s) { set[_manufacturerOf(s.id)] = true; }); return Object.keys(set).sort(); }
    function layouts() { var set = {}; (src.getSummaries() || []).forEach(function (s) { if (s.layout) set[s.layout] = true; }); return Object.keys(set).sort(); }

    // READ-ONLY: detail projection (deep-copy; never the live object)
    function getVehiclePresetDetail(presetId) {
      var p = src.getPreset(presetId); if (!p) return null;
      var params = p.params || {};
      return _clone({
        presetId: presetId,
        identity: { name: p.name, name_zh: p.name_zh, manufacturer: _manufacturerOf(presetId), category: p.category, years: p.years, layout: p.layout, suspensionType: p.suspension_type, oemTire: p.oem_tire, oemTireSize: p.oem_tire_size },
        setupInputs: { front_spring_rate: params.front_spring_rate, rear_spring_rate: params.rear_spring_rate, front_arb: params.front_arb, rear_arb: params.rear_arb, front_track: params.front_track, rear_track: params.rear_track, front_motion_ratio: params.front_motion_ratio, rear_motion_ratio: params.rear_motion_ratio, weight_front_pct: params.weight_front_pct, total_weight: params.total_weight, cg_height: params.cg_height, wheelbase: params.wheelbase },
        tireDefaults: p.tire_defaults || null,
        geometryDefaults: p.geometry_defaults || null,
        oemTireSpecs: p.oem_tire_specs || null,
        provenance: { source: 'preset', presetId: presetId, isCompleteVehicleModel: false },
        confidence: p.confidence || null,
        assumptions: _assumptions(p),
        warnings: _warnings(p),
        damperAdjustable: !!p.damper_adjustable, arbAdjustable: !!p.arb_adjustable,
      });
    }
    function _assumptions(p) { var a = ['preset_baseline_not_measured_vehicle_model']; if (!p.oem_tire_specs) a.push('tire_spring_estimated'); return a; }
    function _warnings(p) { var w = []; var c = p.confidence || {}; var keys = Object.keys(c); var est = keys.filter(function (k) { return c[k] === 'estimated' || c[k] === 'unknown'; }); if (est.length) w.push('contains_estimated_or_unknown_parameters'); return w; }

    function buildVehiclePresetSummary(row) {
      if (!row) return null;
      return _clone({ presetId: row.id, name: row.name, name_zh: row.name_zh, manufacturer: row.manufacturer || _manufacturerOf(row.id), layout: row.layout, category: row.category });
    }

    // NON-PERSISTENT draft (in-memory only)
    function buildSetupDraftFromPreset(presetId) {
      var d = getVehiclePresetDetail(presetId); if (!d) return null;
      return _clone({
        presetId: presetId, vehicleIdentity: d.identity, setupInputs: d.setupInputs, tireDefaults: d.tireDefaults,
        geometryDefaults: d.geometryDefaults, provenance: d.provenance, confidence: d.confidence,
        assumptions: d.assumptions, warnings: d.warnings, persisted: false, source: 'preset_draft',
      });
    }

    // Deep-copy snapshot of a full preset (same shape as api.getPreset) for the LEGACY editor adapter, so the
    // street/pro selector never holds a live CAR_PRESETS reference. Read-only: mutating the result cannot touch source.
    function getPresetSnapshot(presetId) { var p = src.getPreset(presetId); return p ? _clone(p) : null; }

    // Apply-to-case (preview + opaque token + confirm) — surfaced 'unavailable' until safely wired through R3.0B case-store.
    function previewApplyPresetToCase() { return { ok: false, code: 'UNAVAILABLE', reason: 'apply_to_case_not_yet_wired' }; }
    function confirmApplyPresetToCase() { return { ok: false, code: 'UNAVAILABLE', reason: 'apply_to_case_not_yet_wired' }; }
    function applyAvailability() { return 'unavailable'; }

    return { listVehiclePresets: listVehiclePresets, manufacturers: manufacturers, layouts: layouts, getVehiclePresetDetail: getVehiclePresetDetail, buildVehiclePresetSummary: buildVehiclePresetSummary, buildSetupDraftFromPreset: buildSetupDraftFromPreset, getPresetSnapshot: getPresetSnapshot, previewApplyPresetToCase: previewApplyPresetToCase, confirmApplyPresetToCase: confirmApplyPresetToCase, applyAvailability: applyAvailability };
  }

  var api = { createVehiclePresetUseCases: createVehiclePresetUseCases };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VehiclePresetUseCases = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
