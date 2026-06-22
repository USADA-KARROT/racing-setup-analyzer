/**
 * vehicle-preset-viewmodel.js — R3-UX0: pure view models for the vehicle-preset UI (PURE/UMD).
 *
 * Consumers (a list/select consumer and a card/summary consumer) BOTH render from these view models and NEVER read
 * CAR_PRESETS directly — proving the renderer is replaceable. View models carry data + stable codes (no localized
 * strings); the UI maps codes → labels via i18n at display time.
 *
 * UMD: Node require / Electron renderer global (VehiclePresetViewModel).
 */
(function (root) {
  'use strict';

  // a list/select consumer's view model
  function buildPresetListView(useCases, filters) {
    if (!useCases) return { rows: [], manufacturers: [], layouts: [], count: 0 };
    var rows = useCases.listVehiclePresets(filters || {});
    return {
      rows: rows.map(function (r) { return { presetId: r.id, name: r.name, name_zh: r.name_zh, manufacturer: r.manufacturer, layout: r.layout, category: r.category, weight: r.weight, weightDist: r.weight_dist, oemTire: r.oem_tire, damperAdjustable: r.damper_adjustable, arbAdjustable: r.arb_adjustable }; }),
      manufacturers: useCases.manufacturers(),
      layouts: useCases.layouts(),
      count: rows.length,
    };
  }

  // a card/summary consumer's view model (the SECOND consumer — same use-case source, no CAR_PRESETS access)
  function buildPresetCardView(useCases, presetId) {
    if (!useCases) return null;
    var d = useCases.getVehiclePresetDetail(presetId);
    if (!d) return null;
    return {
      presetId: presetId, name: d.identity.name, name_zh: d.identity.name_zh, manufacturer: d.identity.manufacturer,
      layout: d.identity.layout, category: d.identity.category,
      confidence: _confidenceView(d.confidence), provenance: _provenanceView(d.provenance),
    };
  }

  // a detail consumer's view model (read-only detail page)
  function buildPresetDetailView(useCases, presetId) {
    if (!useCases) return null;
    var d = useCases.getVehiclePresetDetail(presetId);
    if (!d) return null;
    return {
      presetId: presetId, identity: d.identity, setupInputs: d.setupInputs, tireDefaults: d.tireDefaults,
      geometryDefaults: d.geometryDefaults, oemTireSpecs: d.oemTireSpecs,
      confidence: _confidenceView(d.confidence), provenance: _provenanceView(d.provenance),
      assumptions: d.assumptions, warnings: d.warnings,
      damperAdjustable: d.damperAdjustable, arbAdjustable: d.arbAdjustable,
      applyAvailability: useCases.applyAvailability ? useCases.applyAvailability() : 'unavailable',
    };
  }

  // confidence view: a grade summary + per-field credibility levels (codes only)
  function _confidenceView(conf) {
    if (!conf || typeof conf !== 'object') return { grade: 'unknown', fields: [] };
    var fields = Object.keys(conf).filter(function (k) { return k !== 'grade'; }).map(function (k) { return { key: k, level: conf[k] }; });
    var levels = fields.map(function (f) { return f.level; });
    var grade = conf.grade || (levels.indexOf('unknown') !== -1 ? 'D' : levels.indexOf('estimated') !== -1 ? 'C' : levels.indexOf('documented') !== -1 ? 'B' : 'A');
    return { grade: grade, fields: fields };
  }
  function _provenanceView(prov) {
    prov = prov || {};
    return { source: prov.source || 'preset', isCompleteVehicleModel: prov.isCompleteVehicleModel === true, badge: 'preset', credibility: 'Derived' };
  }

  var api = { buildPresetListView: buildPresetListView, buildPresetCardView: buildPresetCardView, buildPresetDetailView: buildPresetDetailView };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VehiclePresetViewModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
