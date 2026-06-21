/**
 * tests/fixtures/suspension-normalization-synthetic.js — synthetic suspension-normalization cases.
 *
 * Clean-room synthetic numbers only (no real private data). Shared by the normalizer unit test and the
 * equivalence test. `expectedFront/Rear` are computed with the SAME operation ORDER the normalizer uses
 * (rate * mr * mr) so an Object.is (bit-for-bit) comparison is meaningful, not a rounded approximation.
 */
'use strict';

var SW = { numerator: 'spring_travel', denominator: 'wheel_travel' }; // supported (software) direction

// ── 6 mixed-axis explicit cases (every front/rear basis combination required by §5.2) ──
var MIXED_AXIS = [
  { id: 'M1', front: { rate: 100, basis: 'wheel' }, rear: { rate: 80, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: { numerator: 'spring_travel', denominator: 'wheel_travel' } },
    expectedFront: 100, expectedRear: 80 * Math.pow(1.2, 2), frontBasis: 'wheel', rearBasis: 'spring_element' },
  { id: 'M2', front: { rate: 80, basis: 'spring_element', motionRatio: 1.2, ratioDefinition: { numerator: 'spring_travel', denominator: 'wheel_travel' } }, rear: { rate: 100, basis: 'wheel' },
    expectedFront: 80 * Math.pow(1.2, 2), expectedRear: 100, frontBasis: 'spring_element', rearBasis: 'wheel' },
  { id: 'M3', front: { rate: 81.6, basis: 'ground' }, rear: { rate: 90, basis: 'spring_element', motionRatio: 1.3, ratioDefinition: { numerator: 'spring_travel', denominator: 'wheel_travel' } },
    expectedFront: 81.6, expectedRear: 90 * Math.pow(1.3, 2), frontBasis: 'ground', rearBasis: 'spring_element' },
  { id: 'M4', front: { rate: 90, basis: 'spring_element', motionRatio: 1.3, ratioDefinition: { numerator: 'spring_travel', denominator: 'wheel_travel' } }, rear: { rate: 81.6, basis: 'ground' },
    expectedFront: 90 * Math.pow(1.3, 2), expectedRear: 81.6, frontBasis: 'spring_element', rearBasis: 'ground' },
  { id: 'M5', front: { rate: 100, basis: 'wheel' }, rear: { rate: 120, basis: 'ground' },
    expectedFront: 100, expectedRear: 120, frontBasis: 'wheel', rearBasis: 'ground' },
  { id: 'M6', front: { rate: 120, basis: 'ground' }, rear: { rate: 100, basis: 'wheel' },
    expectedFront: 120, expectedRear: 100, frontBasis: 'ground', rearBasis: 'wheel' },
];

// ── synthetic legacy cases (three-state use_wheel_rate) ──
var LEGACY = [
  { id: 'L_false', input: { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25, use_wheel_rate: false },
    expectedFront: 50 * Math.pow(1.1, 2), expectedRear: 70 * Math.pow(1.25, 2), identity: false },
  { id: 'L_undef', input: { front_spring_rate: 50, rear_spring_rate: 70, front_motion_ratio: 1.1, rear_motion_ratio: 1.25 },
    expectedFront: 50 * Math.pow(1.1, 2), expectedRear: 70 * Math.pow(1.25, 2), identity: false },
  { id: 'L_true', input: { front_spring_rate: 60.5, rear_spring_rate: 109.375, front_motion_ratio: 1.1, rear_motion_ratio: 1.25, use_wheel_rate: true },
    expectedFront: 60.5, expectedRear: 109.375, identity: true },
  { id: 'L_true_no_mr', input: { front_spring_rate: 130, rear_spring_rate: 145, use_wheel_rate: true },
    expectedFront: 130, expectedRear: 145, identity: true },
];

module.exports = { SW: SW, MIXED_AXIS: MIXED_AXIS, LEGACY: LEGACY };
