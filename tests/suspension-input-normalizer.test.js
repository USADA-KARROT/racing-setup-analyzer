/**
 * tests/suspension-input-normalizer.test.js — R2.2 §5 unit tests for suspension-input-normalizer.
 * Legacy three-state + explicit per-axle basis + mixed-axis + output schema + pure-function properties.
 * (501-preset equivalence and the adversarial matrix live in their own files.)
 */
'use strict';
const assert = require('assert');
const N = require('../renderer/js/suspension-input-normalizer.js');
const FX = require('./fixtures/suspension-normalization-synthetic.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };
const E = N.ERROR_CODE;

// ── output schema shape ──
(() => {
  const r = N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25 });
  chk('schema: has valid boolean', typeof r.valid === 'boolean');
  chk('schema: errors is array', Array.isArray(r.errors));
  chk('schema: normalized has both keys', 'frontWheelRateNmm' in r.normalized && 'rearWheelRateNmm' in r.normalized);
  chk('schema: semantics keys', deepEq(Object.keys(r.semantics).sort(), ['compatibilityMode', 'frontBasis', 'frontRatioDefinition', 'rearBasis', 'rearRatioDefinition']));
  chk('schema: provenance.canonicalTrustUpgraded === false', r.provenance.canonicalTrustUpgraded === false);
  chk('schema: provenance.source legacy', r.provenance.source === 'legacy_input');
})();

// ── legacy three-state ──
FX.LEGACY.forEach((c) => {
  const r = N.normalizeLegacySuspensionInput(c.input);
  chk('legacy ' + c.id + ': valid', r.valid === true, r.errors);
  chk('legacy ' + c.id + ': front exact (Object.is)', Object.is(r.normalized.frontWheelRateNmm, c.expectedFront), [r.normalized.frontWheelRateNmm, c.expectedFront]);
  chk('legacy ' + c.id + ': rear exact (Object.is)', Object.is(r.normalized.rearWheelRateNmm, c.expectedRear), [r.normalized.rearWheelRateNmm, c.expectedRear]);
  chk('legacy ' + c.id + ': compatibilityMode true', r.semantics.compatibilityMode === true);
  chk('legacy ' + c.id + ': canonicalTrustUpgraded false', r.provenance.canonicalTrustUpgraded === false);
  if (c.identity) {
    chk('legacy ' + c.id + ': basis legacy_wheel_rate', r.semantics.frontBasis === 'legacy_wheel_rate' && r.semantics.rearBasis === 'legacy_wheel_rate');
    chk('legacy ' + c.id + ': ratioDefinition null', r.semantics.frontRatioDefinition === null && r.semantics.rearRatioDefinition === null);
  } else {
    chk('legacy ' + c.id + ': basis legacy_spring_element', r.semantics.frontBasis === 'legacy_spring_element' && r.semantics.rearBasis === 'legacy_spring_element');
    chk('legacy ' + c.id + ': ratioDefinition software + legacy_implicit', deepEq(r.semantics.frontRatioDefinition, { numerator: 'spring_travel', denominator: 'wheel_travel', source: 'legacy_implicit' }));
  }
});

// undefined ≡ false (faithful to the model's `?? 1.0` / falsy branch)
(() => {
  const a = N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25 });
  const b = N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25, use_wheel_rate: false });
  chk('legacy: undefined ≡ false', deepEq(a, b));
})();

// ── explicit per-axle: each basis ──
(() => {
  const sw = { numerator: 'spring_travel', denominator: 'wheel_travel' };
  const se = N.normalizeExplicitSuspensionInput({ front: { rate: 80, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: sw }, rear: { rate: 90, basis: 'spring_element', motionRatio: 1.3, ratioDefinition: sw } });
  chk('explicit spring_element: front = rate×MR² exact', Object.is(se.normalized.frontWheelRateNmm, 80 * Math.pow(1.2, 2)));
  chk('explicit spring_element: rear = rate×MR² exact', Object.is(se.normalized.rearWheelRateNmm, 90 * Math.pow(1.3, 2)));
  chk('explicit spring_element: ratioDefinition present (no source)', deepEq(se.semantics.frontRatioDefinition, { numerator: 'spring_travel', denominator: 'wheel_travel' }));
  chk('explicit: compatibilityMode false', se.semantics.compatibilityMode === false);
  chk('explicit: source explicit_input', se.provenance.source === 'explicit_input');

  const wh = N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'wheel' }, rear: { rate: 120, basis: 'wheel' } });
  chk('explicit wheel: identity front', Object.is(wh.normalized.frontWheelRateNmm, 100));
  chk('explicit wheel: ratioDefinition null', wh.semantics.frontRatioDefinition === null && wh.semantics.rearRatioDefinition === null);

  const gr = N.normalizeExplicitSuspensionInput({ front: { rate: 81.6, basis: 'ground' }, rear: { rate: 200, basis: 'ground' } });
  chk('explicit ground: identity', Object.is(gr.normalized.frontWheelRateNmm, 81.6) && Object.is(gr.normalized.rearWheelRateNmm, 200));
})();

// ── mixed-axis (all 6 basis combinations) ──
FX.MIXED_AXIS.forEach((c) => {
  const r = N.normalizeExplicitSuspensionInput({ front: c.front, rear: c.rear });
  chk('mixed ' + c.id + ': valid', r.valid === true, r.errors);
  chk('mixed ' + c.id + ': front exact', Object.is(r.normalized.frontWheelRateNmm, c.expectedFront), [r.normalized.frontWheelRateNmm, c.expectedFront]);
  chk('mixed ' + c.id + ': rear exact', Object.is(r.normalized.rearWheelRateNmm, c.expectedRear), [r.normalized.rearWheelRateNmm, c.expectedRear]);
  chk('mixed ' + c.id + ': frontBasis', r.semantics.frontBasis === c.frontBasis);
  chk('mixed ' + c.id + ': rearBasis', r.semantics.rearBasis === c.rearBasis);
  chk('mixed ' + c.id + ': front ratioDef per basis', (c.frontBasis === 'spring_element') === (r.semantics.frontRatioDefinition !== null));
  chk('mixed ' + c.id + ': rear ratioDef per basis', (c.rearBasis === 'spring_element') === (r.semantics.rearRatioDefinition !== null));
  chk('mixed ' + c.id + ': canonicalTrustUpgraded false', r.provenance.canonicalTrustUpgraded === false);
});

// ── pure-function properties: no-mutate, deterministic, no-alias ──
(() => {
  const input = { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25 };
  const snapshot = JSON.parse(JSON.stringify(input));
  const r1 = N.normalizeLegacySuspensionInput(input);
  chk('no-mutate: legacy input unchanged', deepEq(input, snapshot));
  const r2 = N.normalizeLegacySuspensionInput(input);
  chk('deterministic: same output twice', deepEq(r1, r2) && Object.is(r1.normalized.frontWheelRateNmm, r2.normalized.frontWheelRateNmm));

  // no-alias: mutating returned object never affects a later call
  r1.semantics.frontRatioDefinition.numerator = 'TAMPERED';
  r1.normalized.frontWheelRateNmm = 99999;
  const r3 = N.normalizeLegacySuspensionInput(input);
  chk('no-alias: later call unaffected by mutating prior output', r3.semantics.frontRatioDefinition.numerator === 'spring_travel' && Object.is(r3.normalized.frontWheelRateNmm, 50 * Math.pow(1.1, 2)));

  // no-alias: explicit ratioDefinition object is a fresh copy (mutating input after the call doesn't reach the result)
  const sw = { numerator: 'spring_travel', denominator: 'wheel_travel' };
  const ein = { front: { rate: 80, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: sw }, rear: { rate: 100, basis: 'wheel' } };
  const er = N.normalizeExplicitSuspensionInput(ein);
  sw.numerator = 'wheel_travel';
  chk('no-alias: explicit output not aliased to input ratioDef', er.semantics.frontRatioDefinition.numerator === 'spring_travel');
})();

// ── shared front/rear object alias handled independently ──
(() => {
  const shared = { rate: 100, basis: 'wheel' };
  const r = N.normalizeExplicitSuspensionInput({ front: shared, rear: shared });
  chk('shared axle alias: both normalized independently', Object.is(r.normalized.frontWheelRateNmm, 100) && Object.is(r.normalized.rearWheelRateNmm, 100) && r.valid === true);
})();

console.log(`suspension-input-normalizer: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
