/**
 * tests/suspension-input-adversarial.test.js — R2.2 §5 / R2.1E-0 §14: fail-closed + trust-boundary matrix.
 * Every contract violation → {valid:false} + the expected fixed error code; both normalized rates null;
 * never throws; input never mutated; injected trust flags rejected and output canonicalTrustUpgraded stays false.
 */
'use strict';
const assert = require('assert');
const N = require('../renderer/js/suspension-input-normalizer.js');
const E = N.ERROR_CODE;

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };
const has = (r, code) => Array.isArray(r.errors) && r.errors.some((e) => e.code === code);
const bothNull = (r) => r.normalized.frontWheelRateNmm === null && r.normalized.rearWheelRateNmm === null;
const SW = { numerator: 'spring_travel', denominator: 'wheel_travel' };

// ── whole-input type rejection (both APIs) ──
[null, undefined, 'x', 42, true, [1, 2]].forEach((bad, i) => {
  const rl = N.normalizeLegacySuspensionInput(bad);
  chk('legacy invalid-input-type #' + i, rl.valid === false && has(rl, E.INVALID_INPUT_TYPE) && bothNull(rl) && rl.provenance.canonicalTrustUpgraded === false, rl.errors);
  const re = N.normalizeExplicitSuspensionInput(bad);
  chk('explicit invalid-input-type #' + i, re.valid === false && has(re, E.INVALID_INPUT_TYPE) && bothNull(re), re.errors);
});

// ── legacy rate / ratio / flag errors ──
(() => {
  chk('legacy missing rate', has(N.normalizeLegacySuspensionInput({ rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 }), E.MISSING_RATE));
  chk('legacy rate=0', has(N.normalizeLegacySuspensionInput({ front_spring_rate: 0, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 }), E.NON_POSITIVE_RATE));
  chk('legacy rate<0', has(N.normalizeLegacySuspensionInput({ front_spring_rate: -5, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 }), E.NON_POSITIVE_RATE));
  chk('legacy rate=NaN', has(N.normalizeLegacySuspensionInput({ front_spring_rate: NaN, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 }), E.EXOTIC_OR_UNREADABLE_INPUT)); // NaN → not JSON-safe
  chk('legacy rate=Infinity', has(N.normalizeLegacySuspensionInput({ front_spring_rate: Infinity, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 }), E.EXOTIC_OR_UNREADABLE_INPUT));
  chk('legacy spring-path missing motion ratio', has(N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, rear_motion_ratio: 1 }), E.MISSING_MOTION_RATIO));
  chk('legacy ratio=0 (spring path)', has(N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 0, rear_motion_ratio: 1 }), E.NON_POSITIVE_MOTION_RATIO));
  // flag wrong type → LEGACY_FLAG_INVALID_TYPE (NOT silently treated as false)
  [1, 'true', {}, null].forEach((flag, i) => {
    const r = N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1, use_wheel_rate: flag });
    chk('legacy flag-invalid-type #' + i, r.valid === false && has(r, E.LEGACY_FLAG_INVALID_TYPE), r.errors);
  });
  // identity path: motion ratio may be ABSENT (not required) but a bad one if present is still rejected
  chk('legacy identity no-mr ok', N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, use_wheel_rate: true }).valid === true);
  chk('legacy identity bad-mr rejected', has(N.normalizeLegacySuspensionInput({ front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: -1, use_wheel_rate: true }), E.NON_POSITIVE_MOTION_RATIO));
})();

// ── legacy unknown top-level field (incl. injected trust flags) ──
['junk', 'canonicalTrustUpgraded', 'modelUsable'].forEach((k) => {
  const inj = { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 };
  inj[k] = true;
  const r = N.normalizeLegacySuspensionInput(inj);
  chk('legacy unknown/injected field "' + k + '" rejected', r.valid === false && has(r, E.UNKNOWN_TOP_LEVEL_FIELD) && bothNull(r), r.errors);
  chk('legacy injected "' + k + '" output canonicalTrustUpgraded still false', r.provenance.canonicalTrustUpgraded === false);
});

// ── explicit axle errors ──
(() => {
  chk('explicit missing front', has(N.normalizeExplicitSuspensionInput({ rear: { rate: 100, basis: 'wheel' } }), E.MISSING_FRONT_AXLE));
  chk('explicit missing rear', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'wheel' } }), E.MISSING_REAR_AXLE));
  chk('explicit bad basis', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'foo' }, rear: { rate: 100, basis: 'wheel' } }), E.UNKNOWN_BASIS));
  chk('explicit spring_element missing ratioDef', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'spring_element', motionRatio: 1.2 }, rear: { rate: 100, basis: 'wheel' } }), E.MISSING_RATIO_DEFINITION));
  chk('explicit spring_element missing motionRatio', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'spring_element', ratioDefinition: SW }, rear: { rate: 100, basis: 'wheel' } }), E.MISSING_MOTION_RATIO));
  // reverse (manual) ratio direction → UNSUPPORTED_RATIO_DIRECTION (never silently reciprocated)
  chk('explicit reverse ratio direction', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: { numerator: 'wheel_travel', denominator: 'spring_travel' } }, rear: { rate: 100, basis: 'wheel' } }), E.UNSUPPORTED_RATIO_DIRECTION));
  // degenerate numerator===denominator → INVALID_RATIO_DEFINITION
  chk('explicit degenerate ratio', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: { numerator: 'spring_travel', denominator: 'spring_travel' } }, rear: { rate: 100, basis: 'wheel' } }), E.INVALID_RATIO_DEFINITION));
  // wheel/ground must NOT carry motionRatio or ratioDefinition
  chk('explicit wheel carries motionRatio rejected', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'wheel', motionRatio: 1.2 }, rear: { rate: 100, basis: 'wheel' } }), E.INVALID_RATIO_DEFINITION));
  chk('explicit ground carries ratioDef rejected', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'ground', ratioDefinition: SW }, rear: { rate: 100, basis: 'wheel' } }), E.INVALID_RATIO_DEFINITION));
  // unknown nested axle field
  chk('explicit unknown axle subfield', has(N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'wheel', junk: 1 }, rear: { rate: 100, basis: 'wheel' } }), E.UNKNOWN_TOP_LEVEL_FIELD));
})();

// ── partial valid front + invalid rear → valid:false and BOTH normalized null (no half result) ──
(() => {
  const r = N.normalizeExplicitSuspensionInput({ front: { rate: 100, basis: 'wheel' }, rear: { rate: -5, basis: 'wheel' } });
  chk('partial: valid false', r.valid === false);
  chk('partial: front (valid axle) normalized still null', bothNull(r));
  chk('partial: error is rear NON_POSITIVE_RATE', has(r, E.NON_POSITIVE_RATE));
})();

// ── exotic / unreadable input → EXOTIC_OR_UNREADABLE_INPUT, never throws ──
(() => {
  const base = { rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 };
  const cyclic = Object.assign({ front_spring_rate: 50 }, base); cyclic.self = cyclic;
  chk('exotic: cyclic', has(N.normalizeLegacySuspensionInput(cyclic), E.EXOTIC_OR_UNREADABLE_INPUT));
  const sym = Object.assign({ front_spring_rate: 50 }, base); sym[Symbol('x')] = 1;
  chk('exotic: symbol key', has(N.normalizeLegacySuspensionInput(sym), E.EXOTIC_OR_UNREADABLE_INPUT));
  chk('exotic: function value', has(N.normalizeLegacySuspensionInput(Object.assign({ front_spring_rate: function () {} }, base)), E.EXOTIC_OR_UNREADABLE_INPUT));
  chk('exotic: bigint value', has(N.normalizeLegacySuspensionInput(Object.assign({ front_spring_rate: 50n }, base)), E.EXOTIC_OR_UNREADABLE_INPUT));
  chk('exotic: Map', has(N.normalizeLegacySuspensionInput(new Map()), E.INVALID_INPUT_TYPE)); // not a plain object → INVALID_INPUT_TYPE
  chk('exotic: Date', has(N.normalizeLegacySuspensionInput(new Date()), E.INVALID_INPUT_TYPE));
  // getter that throws (and any accessor) → fail closed, never executed
  const g = Object.assign({}, base);
  Object.defineProperty(g, 'front_spring_rate', { enumerable: true, get() { throw new Error('boom'); } });
  let threw = false; let r;
  try { r = N.normalizeLegacySuspensionInput(g); } catch (e) { threw = true; }
  chk('exotic: getter-throws does not throw', threw === false);
  chk('exotic: getter-throws → EXOTIC', r && has(r, E.EXOTIC_OR_UNREADABLE_INPUT));
})();

// ── input never mutated on reject; mutation-after-return isolation ──
(() => {
  const inj = { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1, canonicalTrustUpgraded: true };
  const snap = JSON.stringify(inj);
  N.normalizeLegacySuspensionInput(inj);
  chk('reject: input not mutated', JSON.stringify(inj) === snap);

  const good = { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1, rear_motion_ratio: 1 };
  const r = N.normalizeLegacySuspensionInput(good);
  r.normalized.frontWheelRateNmm = -1; r.provenance.canonicalTrustUpgraded = true; r.errors.push({ code: 'X' });
  const r2 = N.normalizeLegacySuspensionInput(good);
  chk('mutation-after-return isolated', r2.provenance.canonicalTrustUpgraded === false && r2.errors.length === 0 && Object.is(r2.normalized.frontWheelRateNmm, 50));
})();

console.log(`suspension-input-adversarial: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
