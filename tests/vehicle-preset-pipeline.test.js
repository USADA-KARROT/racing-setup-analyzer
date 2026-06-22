/**
 * tests/vehicle-preset-pipeline.test.js — R3-UX0: CAR_PRESETS → use-case → view-model → detail → draft.
 * Pure logic is tested with a HAND-BUILT fixture source (≠ the production api; fixture ≠ oracle). Count (501),
 * preset-ID stability, and content immutability are checked against the REAL car-presets via a vm context.
 */
'use strict';
const fs = require('fs'), vm = require('vm');
const UC = require('../renderer/js/vehicle-preset-usecases.js');
const VM = require('../renderer/js/vehicle-preset-viewmodel.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// ── fixture source (hand-built) ──
const FIX = {
  porsche_996_gt3: { name: 'Porsche 996 GT3', name_zh: '保時捷 996 GT3', category: 'GT', years: '1999', layout: 'RR', suspension_type: 'strut', oem_tire: '265', oem_tire_size: '265/35', oem_tire_specs: { width: 265 }, tire_defaults: { pressure: 2.0 }, geometry_defaults: { camber: -2 }, params: { front_spring_rate: 80, rear_spring_rate: 120, front_arb: 20, rear_arb: 15, front_track: 1490, rear_track: 1500, front_motion_ratio: 1, rear_motion_ratio: 1, weight_front_pct: 42, total_weight: 1380, cg_height: 480, wheelbase: 2350 }, damper_adjustable: false, arb_adjustable: true, confidence: { front_spring_rate: 'documented', rear_arb: 'estimated' } },
  honda_civic_ek: { name: 'Honda Civic EK', name_zh: '本田 Civic EK', category: 'FF', years: '1996', layout: 'FF', params: { front_spring_rate: 40, rear_spring_rate: 35, front_arb: 18, rear_arb: 14, front_track: 1470, rear_track: 1460, front_motion_ratio: 1, rear_motion_ratio: 1, weight_front_pct: 62, total_weight: 1100, cg_height: 510, wheelbase: 2620 }, damper_adjustable: true, arb_adjustable: false, confidence: { front_spring_rate: 'confirmed' } },
};
const fixSource = {
  getSummaries: () => Object.keys(FIX).map(id => ({ id, name: FIX[id].name, name_zh: FIX[id].name_zh, category: FIX[id].category, years: FIX[id].years, layout: FIX[id].layout, weight: FIX[id].params.total_weight, weight_dist: FIX[id].params.weight_front_pct + '/' + (100 - FIX[id].params.weight_front_pct), oem_tire: FIX[id].oem_tire, damper_adjustable: FIX[id].damper_adjustable, arb_adjustable: FIX[id].arb_adjustable })),
  getPreset: (id) => FIX[id],
};
const uc = UC.createVehiclePresetUseCases(fixSource);

// list + filters
chk('list returns all', uc.listVehiclePresets({}).length === 2);
chk('search by name', uc.listVehiclePresets({ search: 'civic' }).length === 1 && uc.listVehiclePresets({ search: 'civic' })[0].id === 'honda_civic_ek');
chk('search by zh name', uc.listVehiclePresets({ search: '保時捷' }).length === 1);
chk('manufacturer filter (id prefix)', uc.listVehiclePresets({ manufacturer: 'porsche' }).length === 1);
chk('layout filter', uc.listVehiclePresets({ layout: 'FF' }).length === 1 && uc.listVehiclePresets({ layout: 'FF' })[0].id === 'honda_civic_ek');
chk('manufacturers list', uc.manufacturers().join(',') === 'honda,porsche');

// detail projection + honesty fields
(() => { const d = uc.getVehiclePresetDetail('porsche_996_gt3'); chk('detail setupInputs', d.setupInputs.front_spring_rate === 80 && d.setupInputs.weight_front_pct === 42); chk('detail provenance not a complete model', d.provenance.isCompleteVehicleModel === false); chk('detail carries assumptions/confidence', d.assumptions.indexOf('preset_baseline_not_measured_vehicle_model') !== -1 && !!d.confidence); chk('detail warns on estimated params', d.warnings.indexOf('contains_estimated_or_unknown_parameters') !== -1); })();

// IMMUTABILITY: results are deep copies; mutating them does not touch the source
(() => { const before = JSON.stringify(FIX.porsche_996_gt3); const d = uc.getVehiclePresetDetail('porsche_996_gt3'); d.setupInputs.front_spring_rate = 9999; d.identity.name = 'HACKED'; const rows = uc.listVehiclePresets({}); rows[0].name = 'HACKED'; chk('mutating detail/list does NOT mutate the source preset', JSON.stringify(FIX.porsche_996_gt3) === before); })();

// draft is NON-PERSISTENT + carries provenance/confidence
(() => { const dr = uc.buildSetupDraftFromPreset('honda_civic_ek'); chk('draft persisted:false', dr.persisted === false && dr.source === 'preset_draft'); chk('draft has setupInputs + provenance + confidence', !!dr.setupInputs && dr.provenance.isCompleteVehicleModel === false && !!dr.confidence); chk('draft has no UI label keys', JSON.stringify(dr).indexOf('labelKey') === -1); })();

// apply is fail-closed / unavailable until wired
chk('apply unavailable', uc.applyAvailability() === 'unavailable' && uc.previewApplyPresetToCase().code === 'UNAVAILABLE' && uc.confirmApplyPresetToCase().code === 'UNAVAILABLE');

// view models: TWO consumers, same use-case source, neither reads CAR_PRESETS
(() => { const lv = VM.buildPresetListView(uc, {}); chk('list view rows', lv.rows.length === 2 && lv.rows[0].presetId); chk('list view filters meta', lv.manufacturers.length === 2 && lv.layouts.length === 2); const cv = VM.buildPresetCardView(uc, 'porsche_996_gt3'); chk('card view (2nd consumer) builds', cv && cv.presetId === 'porsche_996_gt3' && cv.confidence && cv.provenance.credibility === 'Derived'); const dv = VM.buildPresetDetailView(uc, 'porsche_996_gt3'); chk('detail view + apply unavailable surfaced', dv.setupInputs.front_spring_rate === 80 && dv.applyAvailability === 'unavailable'); })();

// ── REAL data: count 501 + IDs stable + content immutable ──
(() => {
  const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(__dirname + '/../renderer/js/car-presets.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/../renderer/js/api.js', 'utf8') + '\n; ctx_api=(typeof api!=="undefined")?api:null; ctx_presets=CAR_PRESETS;', ctx, { filename: 'real' });
  const realApi = ctx.ctx_api, CAR_PRESETS = ctx.ctx_presets;
  const realSource = { getSummaries: () => realApi.getPresets(), getPreset: (id) => realApi.getPreset(id) };
  const realUc = UC.createVehiclePresetUseCases(realSource);
  const idsBefore = Object.keys(CAR_PRESETS).slice().sort().join(',');
  const snapshot = JSON.stringify(CAR_PRESETS);
  chk('real pipeline lists PRESET_BASELINE_COUNT = 501', realUc.listVehiclePresets({}).length === 501);
  // run detail + draft on a sample; preset data must be unchanged (immutability against the live object)
  const firstId = Object.keys(CAR_PRESETS)[0];
  const d = realUc.getVehiclePresetDetail(firstId); d.setupInputs.front_spring_rate = -1; d.identity.name = 'X';
  realUc.buildSetupDraftFromPreset(firstId);
  realUc.listVehiclePresets({ search: 'gt' });
  chk('preset IDs unchanged before/after', Object.keys(CAR_PRESETS).slice().sort().join(',') === idsBefore);
  chk('preset CONTENT unchanged (deep) after read pipeline', JSON.stringify(CAR_PRESETS) === snapshot);
  chk('real detail is a deep copy (not the live preset)', d.setupInputs.front_spring_rate === -1 && CAR_PRESETS[firstId].params.front_spring_rate !== -1);
})();

console.log(`vehicle-preset-pipeline: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
