/**
 * tests/canonical-parameters.test.js — R2.1A schema-contract tests (PURE).
 * Run: node tests/canonical-parameters.test.js
 *
 * Locks the data contract: enum vocabularies, fail-closed RawSourceValue construction, the
 * "motion ratio is never a bare number" rule, and the modelUsable CAPABILITY gate that depends on
 * {provenance, conversionStatus, value-present, blockers} — NEVER on confidence.
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const { SOURCE_BASIS: B, TRAVEL_TERM: T, PROVENANCE: P, CONFIDENCE: C, APPLICABILITY: A, CONVERSION_STATUS: S, CANONICAL_PARAM: K, CANONICAL_UNIT: U } = CP;

console.log('=== canonical-parameters schema tests ===');

// ── enums ─────────────────────────────────────────────────────────────────────────────────────
(() => {
  chk('enum: frozen', Object.isFrozen(B) && Object.isFrozen(P) && Object.isFrozen(S) && Object.isFrozen(K));
  chk('enum: provenance has the 5 grades', P.DOCUMENTED && P.DERIVED && P.MEASURED && P.ESTIMATED && P.UNKNOWN);
  chk('enum: conversion status has rejected + not_required', S.REJECTED && S.NOT_REQUIRED && S.VERIFIED && S.UNVERIFIED && S.BLOCKED);
  chk('enum: applicability covers f312/f317/both/unclear', A.F312 && A.F317 && A.BOTH && A.UNCLEAR);
  chk('enum: canonical params include both mandated cores', K.FRONT_WHEEL_RATE && K.REAR_WHEEL_RATE && K.FRONT_ARB_ROLL_STIFFNESS && K.REAR_ARB_ROLL_STIFFNESS);
  chk('enum: every canonical param has a fixed unit', Object.keys(K).every(k => !!U[K[k]]));
  chk('unit: wheel rate N/mm, arb Nm/deg', U[K.FRONT_WHEEL_RATE] === 'N/mm' && U[K.FRONT_ARB_ROLL_STIFFNESS] === 'Nm/deg');
})();

// ── RawSourceValue: valid + fail-closed ─────────────────────────────────────────────────────────
const goodRaw = (o) => CP.makeRawSource(Object.assign({
  value: 60, unit: 'kgf/mm', definition: 'ARB blade component', basis: B.ARB_BLADE_COMPONENT,
  source: 'manual', provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH,
}, o));
(() => {
  const r = goodRaw({});
  chk('raw: valid base case', r.valid && r.errors.length === 0, r.errors);
  chk('raw: bad basis → invalid', !goodRaw({ basis: 'nonsense' }).valid && goodRaw({ basis: 'nonsense' }).errors.indexOf('bad_basis') !== -1);
  chk('raw: bad provenance → invalid', goodRaw({ provenance: 'x' }).errors.indexOf('bad_provenance') !== -1);
  chk('raw: bad confidence → invalid', goodRaw({ confidence: 'x' }).errors.indexOf('bad_confidence') !== -1);
  chk('raw: bad applicability → invalid', goodRaw({ applicability: 'x' }).errors.indexOf('bad_applicability') !== -1);
  chk('raw: missing unit → invalid', goodRaw({ unit: '' }).errors.indexOf('missing_unit') !== -1);
  chk('raw: missing definition → invalid', goodRaw({ definition: '' }).errors.indexOf('missing_definition') !== -1);
  chk('raw: non-finite value → invalid', goodRaw({ value: Infinity }).errors.indexOf('non_finite_value') !== -1);
  // null value is allowed (an honestly-unknown datum), as long as the rest is well-formed
  const unk = goodRaw({ value: null, provenance: P.UNKNOWN });
  chk('raw: null value (unknown) is VALID', unk.valid && unk.value === null, unk.errors);
  // missing the value KEY entirely is not allowed (must be explicit)
  const noKey = CP.makeRawSource({ unit: 'mm', definition: 'd', basis: B.CHASSIS, source: 's', provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH });
  chk('raw: missing value key → invalid', noKey.errors.indexOf('missing_value_key') !== -1);
})();

// ── motion ratio is never a bare number ─────────────────────────────────────────────────────────
(() => {
  const withRatio = goodRaw({ value: 1.3, unit: 'dimensionless', definition: 'wheel/spring', basis: B.WHEEL,
    ratioDefinition: { numerator: T.WHEEL, denominator: T.SPRING } });
  chk('ratio: explicit numerator/denominator is valid', withRatio.valid && withRatio.ratioDefinition.numerator === T.WHEEL, withRatio.errors);
  const badRatio = goodRaw({ ratioDefinition: { numerator: 'foo', denominator: T.SPRING } });
  chk('ratio: unknown term → bad_ratio_definition', badRatio.errors.indexOf('bad_ratio_definition') !== -1);
  const degen = goodRaw({ ratioDefinition: { numerator: T.WHEEL, denominator: T.WHEEL } });
  chk('ratio: numerator==denominator → degenerate', degen.errors.indexOf('degenerate_ratio_definition') !== -1);
})();

// ── CanonicalModelParameter: modelUsable capability gate ────────────────────────────────────────
const mk = (o) => CP.makeCanonicalParameter(o);
(() => {
  // documented + identity transform + value → usable
  const doc = mk({ parameter: K.FRONT_TRACK, value: 1595, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.F312 });
  chk('canon: documented + not_required + value → usable; unit auto', doc.modelUsable === true && doc.unit === 'mm', doc);
  // derived + verified (+ conversionRef trail) → usable (derived is model-grade)
  chk('canon: derived + verified + conversionRef → usable', mk({ parameter: K.REAR_WHEEL_RATE, value: 98.4, provenance: P.DERIVED, confidence: C.MEDIUM, conversionStatus: S.VERIFIED, applicability: A.BOTH, conversionRef: 'spring_element_to_wheel_rate' }).modelUsable === true);
  // value null → not usable, value stays null
  const nullv = mk({ parameter: K.CG_HEIGHT, value: null, provenance: P.UNKNOWN, confidence: C.UNKNOWN, conversionStatus: S.BLOCKED, applicability: A.BOTH });
  chk('canon: unknown/null → not usable, value null, blocker value_unavailable', nullv.modelUsable === false && nullv.value === null && nullv.blockers.indexOf('value_unavailable') !== -1, nullv.blockers);
  // unverified transform → not usable
  chk('canon: unverified → not usable', mk({ parameter: K.FRONT_ARB_ROLL_STIFFNESS, value: 1451, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.UNVERIFIED, applicability: A.BOTH }).modelUsable === false);
  // rejected transform → not usable
  chk('canon: rejected → not usable', mk({ parameter: K.FRONT_ARB_ROLL_STIFFNESS, value: 999, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.REJECTED, applicability: A.BOTH }).modelUsable === false);
  // explicit blocker → not usable even if everything else is fine
  chk('canon: explicit blocker → not usable', mk({ parameter: K.FRONT_WHEEL_RATE, value: 81.6, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.F312, blockers: ['renderer_use_wheel_rate_gap'] }).modelUsable === false);

  // CONFIDENCE MUST NOT GATE: low-confidence documented value IS usable; high-confidence estimated is NOT.
  const lowConf = mk({ parameter: K.FRONT_TRACK, value: 1595, provenance: P.DOCUMENTED, confidence: C.LOW, conversionStatus: S.NOT_REQUIRED, applicability: A.F312 });
  const hiEst = mk({ parameter: K.CG_HEIGHT, value: 290, provenance: P.ESTIMATED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.BOTH });
  chk('canon: confidence does NOT gate (low+documented usable, high+estimated not)', lowConf.modelUsable === true && hiEst.modelUsable === false, { low: lowConf.modelUsable, hi: hiEst.modelUsable });

  // bad parameter → invalid
  chk('canon: bad parameter → invalid', mk({ parameter: 'nope', value: 1, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.BOTH }).valid === false);
  // legacy use_wheel_rate note is carried but does not change the value (front WR is rate-like → needs conversionRef)
  const legacy = mk({ parameter: K.FRONT_WHEEL_RATE, value: 81.6, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.F312, conversionRef: 'ground_rate_to_wheel_rate', legacyUseWheelRate: true });
  chk('canon: legacyUseWheelRate carried as note only', legacy.legacyUseWheelRate === true && legacy.value === 81.6 && legacy.modelUsable === true);
})();

// ── provenance-trail gate + fail-closed hardening (adversarial-review regressions) ───────────────
(() => {
  // HIGH finding: a non-array blockers input must FAIL CLOSED, never be silently dropped
  const malformed = mk({ parameter: K.CG_HEIGHT, value: 290, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.BOTH, blockers: 'should_block' });
  chk('trail: non-array blockers → fail closed (not usable, malformed marker present)',
    malformed.modelUsable === false && malformed.blockers.indexOf('malformed_blockers_input') !== -1, malformed.blockers);

  // MED finding: a rate/stiffness param can never be a bare documented number — needs a conversionRef
  const bareRate = mk({ parameter: K.REAR_WHEEL_RATE, value: 950, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.F312 });
  chk('trail: rate param without conversionRef → blocked (raw lb/in cannot masquerade as canonical N/mm)',
    bareRate.modelUsable === false && bareRate.blockers.indexOf('rate_param_without_conversion_ref') !== -1, bareRate.blockers);

  // MED finding: a derived value without a conversionRef → blocked
  const derivedNoRef = mk({ parameter: K.MASS, value: 565, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.VERIFIED, applicability: A.F312 });
  chk('trail: derived without conversionRef → blocked', derivedNoRef.modelUsable === false && derivedNoRef.blockers.indexOf('derived_without_conversion_ref') !== -1, derivedNoRef.blockers);

  // a non-rate documented identity (track) is still fine without a conversionRef
  chk('trail: non-rate documented identity (track) usable without conversionRef',
    mk({ parameter: K.FRONT_TRACK, value: 1595, provenance: P.DOCUMENTED, confidence: C.HIGH, conversionStatus: S.NOT_REQUIRED, applicability: A.F312, sourceRef: 'manual' }).modelUsable === true);

  // referential integrity against a registry
  const registry = { spring_element_to_wheel_rate: { verified: true }, f320_ground_arb_to_axle_roll_stiffness: { verified: false } };
  const good = mk({ parameter: K.REAR_WHEEL_RATE, value: 98.4, provenance: P.DERIVED, confidence: C.MEDIUM, conversionStatus: S.VERIFIED, applicability: A.BOTH, conversionRef: 'spring_element_to_wheel_rate' });
  const ghost = mk({ parameter: K.REAR_WHEEL_RATE, value: 9999, provenance: P.DERIVED, confidence: C.HIGH, conversionStatus: S.VERIFIED, applicability: A.BOTH, conversionRef: 'does_not_exist' });
  const verMismatch = mk({ parameter: K.FRONT_ARB_ROLL_STIFFNESS, value: 1, provenance: P.DERIVED, confidence: C.LOW, conversionStatus: S.VERIFIED, applicability: A.NA, conversionRef: 'f320_ground_arb_to_axle_roll_stiffness' });
  chk('integrity: real registered conversion → ok', CP.checkConversionIntegrity(good, registry).ok === true);
  chk('integrity: ghost conversionRef → not in registry', CP.checkConversionIntegrity(ghost, registry).reason === 'conversion_ref_not_in_registry');
  chk('integrity: VERIFIED status but registry says unverified → caught', CP.checkConversionIntegrity(verMismatch, registry).reason === 'verified_status_but_registry_unverified');
})();

// ── motion ratio: structural enforcement at the raw layer ────────────────────────────────────────
(() => {
  // a dimensionless datum that calls itself a "ratio" MUST carry a ratioDefinition
  const bareRatio = CP.makeRawSource({ value: 1.3, unit: 'dimensionless', definition: 'rear wheel/spring travel ratio', basis: B.WHEEL, source: 'm', provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH });
  chk('raw-ratio: ratio-like definition without ratioDefinition → invalid', bareRatio.valid === false && bareRatio.errors.indexOf('motion_ratio_missing_definition') !== -1, bareRatio.errors);
  // with the ratioDefinition it is valid
  chk('raw-ratio: same datum WITH ratioDefinition → valid', CP.makeRawSource({ value: 1.3, unit: 'dimensionless', definition: 'rear wheel/spring travel ratio', basis: B.WHEEL, ratioDefinition: { numerator: T.WHEEL, denominator: T.SPRING }, source: 'm', provenance: P.DOCUMENTED, confidence: C.MEDIUM, applicability: A.BOTH }).valid === true);
  // a non-ratio dimensionless datum (e.g. a percentage-like count) is unaffected
  chk('raw-ratio: non-ratio dimensionless datum unaffected', CP.makeRawSource({ value: 28, unit: 'dimensionless', definition: 'ackermann percent', basis: B.CHASSIS, source: 'm', provenance: P.DOCUMENTED, confidence: C.HIGH, applicability: A.BOTH }).valid === true);
})();

console.log(`canonical-parameters: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
