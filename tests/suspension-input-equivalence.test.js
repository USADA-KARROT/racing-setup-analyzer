/**
 * tests/suspension-input-equivalence.test.js — R2.2 §5.4: 501-preset equivalence proof.
 *
 * Proves the legacy normalizer reproduces the physics core's spring→wheel behaviour for EVERY preset,
 * at two SEPARATE levels (never conflated):
 *   (a) RAW exact (Object.is, bit-for-bit): normalizer.normalized vs an INDEPENDENT literal oracle that
 *       does NOT import the normalizer, does NOT reuse its constants/helpers (anti-fake-green).
 *   (b) OBSERVABLE (deepStrictEqual): Tier1/Tier2 calculate() output is identical whether the model is
 *       fed the legacy input (spring×MR²) or the normalized wheel rate with use_wheel_rate=true.
 *
 * Anti-fake-green: no skip, no .filter(Boolean), no sampling, no shim-vs-shim; the preset count is
 * asserted to be EXACTLY 501 before iterating; any preset inequality is a hard FAIL.
 * dynamics-model.js + car-presets.js are bare-global scripts → loaded read-only via vm (verify-dynamics pattern).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const N = require('../renderer/js/suspension-input-normalizer.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

// ── load bare-global modules read-only via vm ──
const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src =
  fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' +
  fs.readFileSync(path.join(jsDir, 'car-presets.js'), 'utf8') + '\n' +
  'this.__h = { Tier1BasicBalance: Tier1BasicBalance, Tier2TireAware: Tier2TireAware, CAR_PRESETS: CAR_PRESETS };';
const ctx = {};
vm.createContext(ctx);
vm.runInContext(src, ctx, { filename: 'equivalence-bundle.js' });
const Tier1 = ctx.__h.Tier1BasicBalance;
const Tier2 = ctx.__h.Tier2TireAware;
const CAR_PRESETS = ctx.__h.CAR_PRESETS;

// ── INDEPENDENT literal oracle (no import of the normalizer; literal formula only) ──
function oracleLegacy(p) {
  const fMr = p.front_motion_ratio, rMr = p.rear_motion_ratio;
  return {
    front: p.use_wheel_rate === true ? p.front_spring_rate : p.front_spring_rate * Math.pow(fMr, 2),
    rear: p.use_wheel_rate === true ? p.rear_spring_rate : p.rear_spring_rate * Math.pow(rMr, 2),
  };
}
function legacyInputOf(params) {
  return { front_spring_rate: params.front_spring_rate, rear_spring_rate: params.rear_spring_rate, front_motion_ratio: params.front_motion_ratio, rear_motion_ratio: params.rear_motion_ratio };
}

// ── preset count must be EXACTLY 501 (anti-fake-green: prove we iterate the whole corpus) ──
const ids = Object.keys(CAR_PRESETS);
chk('preset count === 501', ids.length === 501, ids.length);

let rawAsserts = 0, obsAsserts = 0;
ids.forEach((id) => {
  const params = CAR_PRESETS[id].params;
  chk('preset ' + id + ': has complete legacy fields', typeof params.front_spring_rate === 'number' && typeof params.rear_spring_rate === 'number' && typeof params.front_motion_ratio === 'number' && typeof params.rear_motion_ratio === 'number');
  const legacy = legacyInputOf(params);
  const snap = JSON.stringify(legacy);

  // (a) RAW exact — default (undefined use_wheel_rate) path
  const norm = N.normalizeLegacySuspensionInput(legacy);
  const oracle = oracleLegacy(legacy);
  if (!norm.valid) { chk('preset ' + id + ': normalizer valid', false, norm.errors); return; }
  chk('preset ' + id + ': RAW front Object.is', Object.is(norm.normalized.frontWheelRateNmm, oracle.front), [norm.normalized.frontWheelRateNmm, oracle.front]); rawAsserts++;
  chk('preset ' + id + ': RAW rear Object.is', Object.is(norm.normalized.rearWheelRateNmm, oracle.rear), [norm.normalized.rearWheelRateNmm, oracle.rear]); rawAsserts++;

  // three-state synthetic: use_wheel_rate=true (identity) and =false (explicit) oracle parity
  const wtrue = { front_spring_rate: oracle.front, rear_spring_rate: oracle.rear, front_motion_ratio: params.front_motion_ratio, rear_motion_ratio: params.rear_motion_ratio, use_wheel_rate: true };
  const nTrue = N.normalizeLegacySuspensionInput(wtrue);
  chk('preset ' + id + ': identity frontIs', Object.is(nTrue.normalized.frontWheelRateNmm, oracle.front));
  chk('preset ' + id + ': identity rearIs', Object.is(nTrue.normalized.rearWheelRateNmm, oracle.rear));
  const wfalse = Object.assign({}, legacy, { use_wheel_rate: false });
  chk('preset ' + id + ': false ≡ undefined', deepEq(N.normalizeLegacySuspensionInput(wfalse).normalized, norm.normalized));

  // no-mutate over the legacy input
  chk('preset ' + id + ': legacy input not mutated', JSON.stringify(legacy) === snap);
  // deterministic
  chk('preset ' + id + ': deterministic', Object.is(N.normalizeLegacySuspensionInput(legacy).normalized.frontWheelRateNmm, norm.normalized.frontWheelRateNmm));

  // (b) OBSERVABLE — Tier1 path1 (spring×MR²) vs path2 (normalized wheel rate, use_wheel_rate=true)
  const path1 = new Tier1(params).calculate();
  const path2In = Object.assign({}, params, { front_spring_rate: norm.normalized.frontWheelRateNmm, rear_spring_rate: norm.normalized.rearWheelRateNmm, use_wheel_rate: true });
  const path2 = new Tier1(path2In).calculate();
  chk('preset ' + id + ': OBSERVABLE Tier1 deepStrictEqual', deepEq(path1, path2)); obsAsserts++;

  // Tier2 propagation regression (reuses Tier1 internally)
  const t2a = new Tier2(params, {}).calculate();
  const t2b = new Tier2(path2In, {}).calculate();
  chk('preset ' + id + ': OBSERVABLE Tier2 deepStrictEqual', deepEq(t2a, t2b));
});

// ── tire_spring_rate three-state (Codex F2): tireK>0 vs tireK===0 branch, observable parity holds ──
(() => {
  const sample = ids.slice(0, 3);
  [undefined, 220, 0].forEach((tireK) => {
    sample.forEach((id) => {
      const params = Object.assign({}, CAR_PRESETS[id].params);
      if (tireK === undefined) delete params.tire_spring_rate; else params.tire_spring_rate = tireK;
      const legacy = legacyInputOf(params);
      const norm = N.normalizeLegacySuspensionInput(legacy);
      const path1 = new Tier1(params).calculate();
      const path2In = Object.assign({}, params, { front_spring_rate: norm.normalized.frontWheelRateNmm, rear_spring_rate: norm.normalized.rearWheelRateNmm, use_wheel_rate: true });
      const path2 = new Tier1(path2In).calculate();
      chk('tireK=' + tireK + ' ' + id + ': observable parity', deepEq(path1, path2));
    });
  });
})();

console.log(`suspension-input-equivalence: ${pass} passed, ${fail} failed  (raw=${rawAsserts}, observable=${obsAsserts})`);
process.exit(fail === 0 ? 0 : 1);
