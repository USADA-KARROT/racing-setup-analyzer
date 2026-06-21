/**
 * tests/canonical-model-input.test.js — R2.2 §6: canonical→model-params adapter.
 * Full usable snapshot → resolved params (use_wheel_rate:true); any required input not model-usable →
 * fail-closed (resolved:false, no params); authoritative modelUsable recompute rejects injected flags;
 * pure (no-mutate, deterministic). Cross-checks against the real F312 fixture (partially blocked).
 */
'use strict';
const assert = require('assert');
const CMI = require('../renderer/js/canonical-model-input.js');
const CP = require('../renderer/js/canonical-parameters.js');
const VP = require('../renderer/js/vehicle-profile-f312.js');
const K = CP.CANONICAL_PARAM;

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

// builders for authoritatively model-usable canonical params
function usableRate(param, value, ref) {
  return CP.makeCanonicalParameter({ parameter: param, value: value, provenance: 'derived', confidence: 'high', conversionStatus: 'verified', applicability: 'both', conversionRef: ref || 'spring_element_to_wheel_rate' });
}
function usableGeo(param, value) {
  return CP.makeCanonicalParameter({ parameter: param, value: value, provenance: 'documented', confidence: 'high', conversionStatus: 'not_required', applicability: 'both' });
}
function fullSnapshot() {
  return {
    frontWheelRateNmm: usableRate(K.FRONT_WHEEL_RATE, 81.6),
    rearWheelRateNmm: usableRate(K.REAR_WHEEL_RATE, 120.4),
    frontArbRollStiffnessNmDeg: usableRate(K.FRONT_ARB_ROLL_STIFFNESS, 350, 'arb_component_to_axle_roll_stiffness'),
    rearArbRollStiffnessNmDeg: usableRate(K.REAR_ARB_ROLL_STIFFNESS, 300, 'arb_component_to_axle_roll_stiffness'),
    frontTrackMm: usableGeo(K.FRONT_TRACK, 1595),
    rearTrackMm: usableGeo(K.REAR_TRACK, 1540),
    wheelbaseMm: usableGeo(K.WHEELBASE, 2800),
    massKg: usableGeo(K.MASS, 565),
    frontWeightPct: usableGeo(K.FRONT_WEIGHT_PCT, 49.4),
    cgHeightMm: usableGeo(K.CG_HEIGHT, 290),
    frontRollCentreHeightMm: usableGeo(K.FRONT_ROLL_CENTRE_HEIGHT, 30),
    rearRollCentreHeightMm: usableGeo(K.REAR_ROLL_CENTRE_HEIGHT, 45),
  };
}

// ── full usable snapshot → resolved ──
(() => {
  const snap = fullSnapshot();
  const r = CMI.buildModelParamsFromCanonical(snap);
  chk('full: resolved true', r.resolved === true, r.blockedReasons);
  chk('full: params present', r.params && typeof r.params === 'object');
  chk('full: use_wheel_rate true', r.params.use_wheel_rate === true);
  chk('full: front_spring_rate = canonical wheel rate', r.params.front_spring_rate === 81.6);
  chk('full: rear_spring_rate', r.params.rear_spring_rate === 120.4);
  chk('full: front_arb mapped', r.params.front_arb === 350);
  chk('full: front_track mapped', r.params.front_track === 1595);
  chk('full: total_weight from massKg', r.params.total_weight === 565);
  chk('full: weight_front_pct', r.params.weight_front_pct === 49.4);
  chk('full: cg_height', r.params.cg_height === 290);
  chk('full: front_roll_center_height', r.params.front_roll_center_height === 30);
  chk('full: no blockedReasons', r.blockedReasons.length === 0);
  chk('full: usedParameters count = 12', r.usedParameters.length === 12, r.usedParameters.length);
  chk('full: provenance recorded', r.provenance.front_spring_rate && r.provenance.front_spring_rate.canonicalKey === 'frontWheelRateNmm');
})();

// ── optional tyre vertical maps to tire_spring_rate when usable ──
(() => {
  const snap = fullSnapshot();
  snap.frontTyreVerticalRateNmm = usableRate(K.FRONT_TYRE_VERTICAL_RATE, 170, 'ground_rate_to_wheel_rate');
  const r = CMI.buildModelParamsFromCanonical(snap);
  chk('optional tyre: resolved', r.resolved === true);
  chk('optional tyre: tire_spring_rate set', r.params.tire_spring_rate === 170);
})();

// ── missing/blocked required → fail-closed ──
(() => {
  const snap = fullSnapshot();
  delete snap.cgHeightMm;
  const r = CMI.buildModelParamsFromCanonical(snap);
  chk('missing required: resolved false', r.resolved === false);
  chk('missing required: params null', r.params === null);
  chk('missing required: missingParameters has cgHeightMm', r.missingParameters.indexOf('cgHeightMm') !== -1);
  chk('missing required: blockedReason code', r.blockedReasons.some((b) => b.code === 'CANONICAL_INPUT_NOT_MODEL_USABLE' && b.parameterKey === 'cgHeightMm'));

  const snap2 = fullSnapshot();
  snap2.frontWheelRateNmm = CP.makeCanonicalParameter({ parameter: K.FRONT_WHEEL_RATE, value: null, provenance: 'unknown', confidence: 'unknown', conversionStatus: 'blocked', applicability: 'both', blockers: ['x'] });
  const r2 = CMI.buildModelParamsFromCanonical(snap2);
  chk('blocked required: resolved false', r2.resolved === false);
})();

// ── authoritative recompute rejects an injected modelUsable on a non-usable param ──
(() => {
  const snap = fullSnapshot();
  const tampered = Object.assign({}, snap.cgHeightMm, { value: null, provenance: 'unknown', conversionStatus: 'blocked', modelUsable: true });
  snap.cgHeightMm = tampered;
  const r = CMI.buildModelParamsFromCanonical(snap);
  chk('injected modelUsable:true on blocked value → still fail-closed', r.resolved === false && r.missingParameters.indexOf('cgHeightMm') !== -1);
})();

// ── pure: no-mutate + deterministic ──
(() => {
  const snap = fullSnapshot();
  const before = JSON.stringify(snap);
  const a = CMI.buildModelParamsFromCanonical(snap);
  chk('no-mutate', JSON.stringify(snap) === before);
  const b = CMI.buildModelParamsFromCanonical(snap);
  chk('deterministic', JSON.stringify(a.params) === JSON.stringify(b.params));
  a.params.front_spring_rate = -1;
  const c = CMI.buildModelParamsFromCanonical(snap);
  chk('output not aliased', c.params.front_spring_rate === 81.6);
})();

// ── malformed snapshot fail-closed ──
[null, undefined, [1], 'x', 42].forEach((bad, i) => {
  const r = CMI.buildModelParamsFromCanonical(bad);
  chk('malformed snapshot #' + i + ' fail-closed', r.resolved === false && r.params === null);
});

// ── real F312 fixture: ARB blocked (unknown MR) + CG/RC unknown → resolved:false (honest) ──
(() => {
  const fx = VP.buildF312Fixture();
  const ot = fx.canonicalModelParameters.optionTables;
  const fixed = fx.canonicalModelParameters.fixed;
  const unk = fx.unknowns;
  const snap = {
    frontWheelRateNmm: ot.frontWheelRate[1].canonical, rearWheelRateNmm: ot.rearWheelRate[1].canonical,
    frontArbRollStiffnessNmDeg: ot.frontArb[0].canonical, rearArbRollStiffnessNmDeg: ot.rearArb[0].canonical,
    frontTrackMm: fixed.frontTrackMm, rearTrackMm: fixed.rearTrackMm, wheelbaseMm: fixed.wheelbaseMm,
    massKg: fixed.massKg, frontWeightPct: fixed.frontWeightPct,
    cgHeightMm: unk.cgHeightMm, frontRollCentreHeightMm: unk.frontRollCentreHeightMm, rearRollCentreHeightMm: unk.rearRollCentreHeightMm,
  };
  const r = CMI.buildModelParamsFromCanonical(snap);
  chk('F312: front/rear wheel rate ARE usable', r.usedParameters.indexOf('frontWheelRateNmm') !== -1 && r.usedParameters.indexOf('rearWheelRateNmm') !== -1);
  chk('F312: resolved false (ARB+CG+RC blocked)', r.resolved === false);
  chk('F312: ARB + CG flagged missing', r.missingParameters.indexOf('frontArbRollStiffnessNmDeg') !== -1 && r.missingParameters.indexOf('cgHeightMm') !== -1, r.missingParameters);
})();

console.log(`canonical-model-input: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
