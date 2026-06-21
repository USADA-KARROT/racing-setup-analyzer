/**
 * tests/vehicle-profile-f312.test.js — R2.1C F312/F317 audit fixture tests (PURE).
 * Run: node tests/vehicle-profile-f312.test.js
 *
 * Verifies the fixture honours the brief: audit-only values, full option tables kept (not reduced),
 * ARB fail-closed (unknown MR), unknowns stay unknown (no placeholder), every datum tagged with a
 * valid applicability, and the canonical layer reproduces the expected wheel rates.
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
const PC = require('../renderer/js/parameter-conversions.js');
const VP = require('../renderer/js/vehicle-profile-f312.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e = 0.05) => a != null && Math.abs(a - b) <= e;
const { PROVENANCE: P, APPLICABILITY: A, CONVERSION_STATUS: S } = CP;

console.log('=== vehicle-profile-f312 fixture tests ===');

const fx = VP.buildF312Fixture();

// ── all documented raw sources are schema-valid (no contract violations baked in) ────────────────
(() => {
  const all = [];
  Object.keys(VP.FIXED_SOURCES).forEach(k => all.push(['fixed.' + k, VP.FIXED_SOURCES[k]]));
  Object.keys(VP.OPTION_SOURCES).forEach(t => VP.OPTION_SOURCES[t].forEach((r, i) => all.push(['opt.' + t + '[' + i + ']', r])));
  Object.keys(VP.TYRE_SOURCES).forEach(k => all.push(['tyre.' + k, VP.TYRE_SOURCES[k]]));
  const bad = all.filter(([, r]) => !r.valid);
  chk('raw: every documented source is schema-valid', bad.length === 0, bad.map(([n, r]) => n + ':' + r.errors.join(',')));
  // every source carries a valid applicability tag
  const badApp = all.filter(([, r]) => [A.F312, A.F317, A.BOTH, A.UNCLEAR].indexOf(r.applicability) === -1);
  chk('raw: every source has a valid applicability tag', badApp.length === 0, badApp.map(([n]) => n));
})();

// ── fixed canonical params: documented identity, model-usable ────────────────────────────────────
(() => {
  const f = fx.canonicalModelParameters.fixed;
  chk('fixed: front track 1595 mm usable', f.frontTrackMm.value === 1595 && f.frontTrackMm.modelUsable && f.frontTrackMm.unit === 'mm');
  chk('fixed: rear track 1540, wheelbase 2800, steering 12.5 usable',
    f.rearTrackMm.value === 1540 && f.wheelbaseMm.value === 2800 && f.steeringRatioOverall.value === 12.5 && f.steeringRatioOverall.modelUsable);
  chk('fixed: applicability — track/steering BOTH, mass/weight F312',
    f.frontTrackMm.applicability === A.BOTH && f.steeringRatioOverall.applicability === A.BOTH && f.massKg.applicability === A.F312 && f.frontWeightPct.applicability === A.F312);
  chk('fixed: front weight is measured-provenance', f.frontWeightPct.provenance === P.MEASURED);
})();

// ── front wheel rate option table: GROUND identity (no MR²), full table kept, usable ─────────────
(() => {
  const t = fx.canonicalModelParameters.optionTables.frontWheelRate;
  chk('frontWR: full table kept (2 audit rows, not reduced to one)', t.length === 2);
  chk('frontWR: ground identity values 71.8 / 81.6 preserved', near(t[0].canonical.value, 71.8) && near(t[1].canonical.value, 81.6), t.map(x => x.canonical.value));
  chk('frontWR: conversion is NOT_REQUIRED identity (not multiplied by MR²)', t[0].conversion.status === S.NOT_REQUIRED && t[1].conversion.status === S.NOT_REQUIRED);
  chk('frontWR: derived + usable + legacy note', t[0].canonical.provenance === P.DERIVED && t[0].canonical.modelUsable === true && t[0].canonical.legacyUseWheelRate === true);
})();

// ── rear wheel rate option table: element × MR², both spring options kept ────────────────────────
(() => {
  const t = fx.canonicalModelParameters.optionTables.rearWheelRate;
  const mr = 1 / 1.30;
  const exp850 = 850 * PC.LBF_IN_TO_N_MM * mr * mr;
  const exp950 = 950 * PC.LBF_IN_TO_N_MM * mr * mr;
  chk('rearWR: both spring options kept (850 + 950)', t.length === 2);
  chk('rearWR: 850 lb/in → ~88 N/mm (independent recompute)', near(t[0].canonical.value, exp850, 1e-6), { got: t[0].canonical.value, exp850 });
  chk('rearWR: 950 lb/in → ~98 N/mm (independent recompute)', near(t[1].canonical.value, exp950, 1e-6), { got: t[1].canonical.value, exp950 });
  chk('rearWR: verified conversion → derived + usable', t[1].conversion.status === S.VERIFIED && t[1].canonical.modelUsable === true);
  chk('rearWR: 950 row tagged F312 (from setup sheet)', t[1].source.applicability === A.F312);
})();

// ── ARB: fail-closed (MR unknown) → BLOCKED, not usable, no value ────────────────────────────────
(() => {
  const fa = fx.canonicalModelParameters.optionTables.frontArb;
  const ra = fx.canonicalModelParameters.optionTables.rearArb;
  chk('ARB: front + rear baseline rows kept', fa.length === 1 && ra.length === 1);
  chk('ARB: front BLOCKED, value null, not usable', fa[0].canonical.value === null && fa[0].canonical.modelUsable === false, fa[0].canonical);
  chk('ARB: blocker names the missing motion ratio', fa[0].canonical.blockers.indexOf('arb_motion_ratio_unknown') !== -1, fa[0].canonical.blockers);
  chk('ARB: rear equally fail-closed', ra[0].canonical.value === null && ra[0].canonical.modelUsable === false);
  // the underlying component value is still preserved in the source row (not lost)
  chk('ARB: raw component value preserved (60 / 90 kgf/mm)', fa[0].source.value === 60 && ra[0].source.value === 90 && fa[0].source.unit === 'kgf/mm');
})();

// ── unknowns: stay unknown, NO placeholder ───────────────────────────────────────────────────────
(() => {
  const u = fx.unknowns;
  const fields = ['cgHeightMm', 'frontRollCentreHeightMm', 'rearRollCentreHeightMm', 'frontTyreVerticalRateNmm', 'rearTyreVerticalRateNmm'];
  const allNull = fields.every(k => u[k].value === null && u[k].provenance === P.UNKNOWN && u[k].modelUsable === false);
  chk('unknown: CG / RC / tyre vertical all null + unknown + not usable', allNull, fields.map(k => k + '=' + u[k].value));
  // guard against the specific generic placeholders the audit warned about (cg280 / RC50 / tyre220)
  chk('unknown: no generic placeholder leaked (280/50/220)', ![280, 290, 50, 220].some(v => fields.some(k => u[k].value === v)));
  chk('unknown: third element has no canonical parameter (model heave gap)', u.thirdElementHeaveRate.available === false && /heave/.test(u.thirdElementHeaveRate.reason));
  // tyre datasheet single points ARE preserved as documented raw, just not promoted to canonical
  chk('unknown: tyre datasheet single point kept as documented raw (170/200)', VP.TYRE_SOURCES.frontTyreVertical.value === 170 && VP.TYRE_SOURCES.frontTyreVertical.provenance === P.DOCUMENTED && u.frontTyreVerticalRateNmm.value === null);
})();

// ── validation status: honest counts ────────────────────────────────────────────────────────────
(() => {
  const v = fx.validationStatus;
  chk('validation: has usable + blocked + unknown counts', typeof v.modelUsableCount === 'number' && typeof v.blockedCount === 'number' && typeof v.unknownCount === 'number', v);
  // fixed(6 usable) + frontWR(2 usable) + rearWR(2 usable) = 10 usable ; ARB(2 blocked) ; unknowns(5 unknown)
  chk('validation: 10 model-usable canonical values', v.modelUsableCount === 10, v);
  chk('validation: 2 blocked (ARB), 5 unknown (cg/rc/tyre×2)', v.blockedCount === 2 && v.unknownCount === 5, v);
  chk('validation: note flags the renderer use_wheel_rate caveat', v.notes.some(s => /use_wheel_rate/.test(s)));
})();

// ── referential integrity: every derived canonical points at a real REGISTERED conversion ────────
(() => {
  const reg = PC.CONVERSIONS;
  const derived = [];
  const ot = fx.canonicalModelParameters.optionTables;
  ['frontWheelRate', 'rearWheelRate', 'frontArb', 'rearArb'].forEach(t => ot[t].forEach(row => { if (row.canonical.provenance === P.DERIVED) derived.push([t, row.canonical]); }));
  const broken = derived.filter(([, c]) => !CP.checkConversionIntegrity(c, reg).ok);
  chk('integrity: every derived fixture canonical references a real registered conversion', broken.length === 0, broken.map(([t, c]) => t + ':' + CP.checkConversionIntegrity(c, reg).reason));
  chk('integrity: at least the wheel-rate candidates were checked (non-empty)', derived.length >= 4, derived.length);
})();

console.log(`vehicle-profile-f312: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
