/**
 * tests/parameter-conversions.test.js — R2.1B conversion proof tests (PURE, no UI/model/CSV).
 * Run: node tests/parameter-conversions.test.js
 *
 * Locks the physical MEANING of every transform: ratio direction, MR², the legacy ARB chain
 * (inverse-square + track²/2 with NO extra ×2), F320 basis rejection, full provenance trail,
 * fail-closed on illegal input, and "derived ≠ documented".
 */
'use strict';
const CP = require('../renderer/js/canonical-parameters.js');
const PC = require('../renderer/js/parameter-conversions.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e = 1e-6) => a != null && Math.abs(a - b) <= e;
const T = CP.TRAVEL_TERM, B = CP.SOURCE_BASIS, S = CP.CONVERSION_STATUS, PARAM = CP.CANONICAL_PARAM;

console.log('=== parameter-conversions proof tests ===');

// helper to build a raw source quickly
const raw = (o) => CP.makeRawSource(Object.assign({
  unit: 'N/mm', definition: 'x', basis: B.WHEEL, source: 'test',
  provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH,
}, o));

// ── C1: manual wheel/spring ratio → software MR (reciprocal), with ratio-direction gate ──────────
(() => {
  const mk = (v) => CP.makeRawSource({
    value: v, unit: 'dimensionless', definition: 'wheel/spring travel ratio', basis: B.WHEEL,
    ratioDefinition: { numerator: T.WHEEL, denominator: T.SPRING },
    source: 'manual', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH,
  });
  const a = PC.manualRatioToSoftwareMr(mk(1.131)); // F308 front
  const b = PC.manualRatioToSoftwareMr(mk(1.299)); // F308 rear
  const c = PC.manualRatioToSoftwareMr(mk(1.30));  // F312 rear
  chk('C1: F308 front 1.131 → 0.884', a.ok && near(a.output.value, 0.884173, 1e-5), a.output);
  chk('C1: F308 rear 1.299 → 0.770', b.ok && near(b.output.value, 0.769823, 1e-5), b.output);
  chk('C1: F312 rear 1.30 → 0.769', c.ok && near(c.output.value, 0.769231, 1e-5), c.output);
  chk('C1: round-trip 1/(1/x)=x', near(1 / a.output.value, 1.131, 1e-6));
  chk('C1: output ratioDefinition flips to spring/wheel',
    a.output.ratioDefinition.numerator === T.SPRING && a.output.ratioDefinition.denominator === T.WHEEL);
  chk('C1: status VERIFIED', a.status === S.VERIFIED);
  // gate: missing ratio definition → REJECTED, value null, no throw
  const noRatio = CP.makeRawSource({ value: 1.3, unit: 'dimensionless', definition: 'ratio', basis: B.WHEEL,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  const r = PC.manualRatioToSoftwareMr(noRatio);
  chk('C1 gate: no ratioDefinition → REJECTED + null', !r.ok && r.status === S.REJECTED && r.output.value === null, { s: r.status, v: r.output.value });
  // gate: reversed ratio (spring/wheel) → REJECTED (we require wheel/spring as the documented manual form)
  const rev = CP.makeRawSource({ value: 1.3, unit: 'dimensionless', definition: 'ratio', basis: B.WHEEL,
    ratioDefinition: { numerator: T.SPRING, denominator: T.WHEEL },
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  chk('C1 gate: reversed ratio → REJECTED', !PC.manualRatioToSoftwareMr(rev).ok);
})();

// ── C2: spring-element rate → wheel rate (× MR²); units; basis gate ──────────────────────────────
(() => {
  const el = (v, u) => CP.makeRawSource({ value: v, unit: u, definition: 'coil element rate', basis: B.SPRING_ELEMENT,
    source: 'manual', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  // N/mm path: 100 N/mm × 0.8² = 64
  const a = PC.springElementToWheelRate(el(100, 'N/mm'), 0.8, PARAM.REAR_WHEEL_RATE);
  chk('C2: 100 N/mm × 0.8² = 64', a.ok && near(a.output.value, 64), a.output);
  // F312 rear 950 lb/in with MR=1/1.30: lb/in→N/mm then ×MR²
  const mr = 1 / 1.30;
  const expected = 950 * PC.LBF_IN_TO_N_MM * mr * mr;
  const b = PC.springElementToWheelRate(el(950, 'lb/in'), mr, PARAM.REAR_WHEEL_RATE);
  chk('C2: F312 rear 950 lb/in × MR² (independent recompute)', b.ok && near(b.output.value, expected, 1e-9), { got: b.output.value, expected });
  chk('C2: F312 rear lands ~98 N/mm (magnitude sanity)', b.output.value > 90 && b.output.value < 110, b.output.value);
  chk('C2: canonical unit is N/mm', b.output.unit === 'N/mm');
  // basis gate: a ground value must NOT go through element→wheel (would double-count MR)
  const gnd = CP.makeRawSource({ value: 81.6, unit: 'N/mm', definition: 'ground', basis: B.GROUND,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  const g = PC.springElementToWheelRate(gnd, 0.8, PARAM.FRONT_WHEEL_RATE);
  chk('C2 gate: ground basis → REJECTED', !g.ok && g.status === S.REJECTED);
  // missing MR → BLOCKED
  chk('C2 gate: missing MR → BLOCKED + null', !PC.springElementToWheelRate(el(100, 'N/mm'), null, PARAM.REAR_WHEEL_RATE).ok);
})();

// ── C3: ground/wheel-referred rate → wheel rate (identity, NOT_REQUIRED) ──────────────────────────
(() => {
  const gnd = CP.makeRawSource({ value: 81.6, unit: 'N/mm', definition: 'manufacturer ground stiffness (torsion)', basis: B.GROUND,
    source: 'f312_manual', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  const r = PC.groundRateToWheelRate(gnd, PARAM.FRONT_WHEEL_RATE);
  chk('C3: ground 81.6 → wheel 81.6 (identity)', r.ok && near(r.output.value, 81.6) && r.status === S.NOT_REQUIRED, r.output);
  chk('C3: ground is NOT multiplied by MR² (no aux MR used)', r.inputs.auxiliary == null);
  // an element-basis value must NOT pass as ground identity
  const el = CP.makeRawSource({ value: 166, unit: 'N/mm', definition: 'coil', basis: B.SPRING_ELEMENT,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH });
  chk('C3 gate: spring_element basis → REJECTED', !PC.groundRateToWheelRate(el, PARAM.FRONT_WHEEL_RATE).ok);
})();

// ── MIXED axle case: front = ground identity, rear = spring-element × MR² (same car, two paths) ───
(() => {
  const front = PC.groundRateToWheelRate(CP.makeRawSource({ value: 81.6, unit: 'N/mm', definition: 'torsion ground', basis: B.GROUND,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH }), PARAM.FRONT_WHEEL_RATE);
  const rear = PC.springElementToWheelRate(CP.makeRawSource({ value: 950, unit: 'lb/in', definition: 'coil', basis: B.SPRING_ELEMENT,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, applicability: CP.APPLICABILITY.BOTH }), 1 / 1.30, PARAM.REAR_WHEEL_RATE);
  chk('MIX: front uses NOT_REQUIRED identity, rear uses VERIFIED MR² — both ok, different paths',
    front.ok && rear.ok && front.status === S.NOT_REQUIRED && rear.status === S.VERIFIED &&
    front.conversionId !== rear.conversionId, { f: front.status, r: rear.status });
  chk('MIX: both produce canonical N/mm wheel rate', front.output.unit === 'N/mm' && rear.output.unit === 'N/mm');
})();

// ── C4 + C5: legacy ARB component kgf/mm → axle Nm/deg ; inverse-square ; track² ; NO extra ×2 ────
(() => {
  const comp = (k) => CP.makeRawSource({ value: k, unit: 'kgf/mm', definition: 'ARB blade component (one end locked)', basis: B.ARB_BLADE_COMPONENT,
    source: 'manual', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH });
  const docMr = { value: 3.0, provenance: CP.PROVENANCE.DOCUMENTED };
  const r1 = PC.arbComponentToAxleRollStiffness(comp(60), docMr, 1595, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C4: legacy ARB ok + Nm/deg', r1.ok && r1.output.unit === 'Nm/deg' && r1.status === S.VERIFIED, r1.output);

  // independent recompute of the SAME chain, written differently, to lock the absolute factor
  const kWheelNmm = 60 * PC.KGF_TO_N / (3.0 * 3.0);
  const tM = 1.595;
  const indep = kWheelNmm * 1000 * (tM * tM) / 2 / PC.DEG_PER_RAD;
  chk('C4: absolute value matches independent recompute', near(r1.output.value, indep, 1e-9), { got: r1.output.value, indep });
  chk('C4: magnitude in plausible open-wheel band (hundreds–low thousands)', r1.output.value > 200 && r1.output.value < 6000, r1.output.value);
  // arbMr provenance gates per-car trust: a bare/guessed MR yields UNVERIFIED (math identical)
  const bareMr = PC.arbComponentToAxleRollStiffness(comp(60), 3.0, 1595, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C4: bare/guessed arbMr → UNVERIFIED, value still computed', bareMr.ok && bareMr.status === S.UNVERIFIED && near(bareMr.output.value, indep, 1e-9), { s: bareMr.status });
  chk('C4: documented arbMr → VERIFIED', r1.status === S.VERIFIED);

  // linearity in k_comp
  const r2 = PC.arbComponentToAxleRollStiffness(comp(120), 3.0, 1595, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C4: doubling component doubles axle (linear)', near(r2.output.value / r1.output.value, 2, 1e-9));
  // inverse-square in MR_arb
  const rMr = PC.arbComponentToAxleRollStiffness(comp(60), 6.0, 1595, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C4: doubling MR_arb quarters axle (inverse-square)', near(rMr.output.value / r1.output.value, 0.25, 1e-9));
  // track squared
  const rT = PC.arbComponentToAxleRollStiffness(comp(60), 3.0, 3190, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C4: doubling track quadruples axle (track²)', near(rT.output.value / r1.output.value, 4, 1e-9));

  // C5: track²/2 already carries BOTH sides → equals 2×K_wheel×(t/2)², and is NOT the ×2 (K×t²) form
  const kWheelNm = kWheelNmm * 1000; // N/m
  const bothSides = 2 * kWheelNm * Math.pow(tM / 2, 2) / PC.DEG_PER_RAD; // explicit two springs at ±t/2
  const wrongDouble = kWheelNm * (tM * tM) / PC.DEG_PER_RAD;             // the erroneous extra-×2 form
  chk('C5: chain == 2×K×(t/2)² (both sides already included)', near(r1.output.value, bothSides, 1e-9));
  chk('C5: chain != K×t² (no extra ×2)', !near(r1.output.value, wrongDouble, 1e-6) && near(wrongDouble / r1.output.value, 2, 1e-9));
})();

// ── C6: F320 anti-symmetric ground must NOT use the legacy component chain ────────────────────────
(() => {
  const f320 = CP.makeRawSource({ value: 100, unit: 'N/mm', definition: 'F320 @ground anti-symmetric', basis: B.ARB_GROUND_ANTI_SYMMETRIC,
    source: 'f320_manual', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.NA });
  const wrong = PC.arbComponentToAxleRollStiffness(f320, 3.0, 1500, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C6: F320 ground through legacy chain → REJECTED + null', !wrong.ok && wrong.status === S.REJECTED && wrong.output.value === null && /anti_symmetric/.test(wrong.reason), { s: wrong.status, r: wrong.reason });
  // F320's own conversion runs (convention-correct) but is deliberately UNVERIFIED (not corpus-locked)
  const own = PC.f320GroundArbToAxleRollStiffness(f320, 1500, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  chk('C6: F320 own conversion → UNVERIFIED (never silently trusted)', own.ok && own.status === S.UNVERIFIED && own.output.value > 0, { s: own.status, v: own.output.value });
  // and a legacy component must NOT use the F320 chain
  const comp = CP.makeRawSource({ value: 60, unit: 'kgf/mm', definition: 'blade component', basis: B.ARB_BLADE_COMPONENT,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH });
  chk('C6: component basis through F320 chain → REJECTED', !PC.f320GroundArbToAxleRollStiffness(comp, 1500, PARAM.FRONT_ARB_ROLL_STIFFNESS).ok);
})();

// ── C7: unknown / illegal input → fail-closed (no throw, value null) ──────────────────────────────
(() => {
  const badUnit = CP.makeRawSource({ value: 100, unit: 'psi', definition: 'x', basis: B.SPRING_ELEMENT,
    source: 'm', provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.LOW, applicability: CP.APPLICABILITY.BOTH });
  let threw = false, res = null;
  try { res = PC.springElementToWheelRate(badUnit, 0.8, PARAM.REAR_WHEEL_RATE); } catch (e) { threw = true; }
  chk('C7: unrecognised unit → no throw, ok:false, null', !threw && res && !res.ok && res.output.value === null, { threw, ok: res && res.ok });
  chk('C7: ARB missing track → BLOCKED', !PC.arbComponentToAxleRollStiffness(
    CP.makeRawSource({ value: 60, unit: 'kgf/mm', definition: 'c', basis: B.ARB_BLADE_COMPONENT, source: 'm',
      provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH }), 3.0, null, PARAM.FRONT_ARB_ROLL_STIFFNESS).ok);
})();

// ── C8: full provenance trail is preserved on every record ───────────────────────────────────────
(() => {
  const r = PC.arbComponentToAxleRollStiffness(
    CP.makeRawSource({ value: 60, unit: 'kgf/mm', definition: 'ARB blade component', basis: B.ARB_BLADE_COMPONENT, source: 'f312_manual_p9',
      provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.MEDIUM, applicability: CP.APPLICABILITY.BOTH }), 3.0, 1595, PARAM.FRONT_ARB_ROLL_STIFFNESS);
  const has = r.conversionId && r.version && r.formula && r.source === 'f312_manual_p9' &&
    r.inputs.rawValue === 60 && r.inputs.rawUnit === 'kgf/mm' && r.inputs.rawDefinition && r.inputs.rawBasis === B.ARB_BLADE_COMPONENT &&
    r.inputs.auxiliary && r.inputs.auxiliary.trackMm === 1595 && r.output.value != null && r.output.unit === 'Nm/deg';
  chk('C8: record keeps raw value/unit/definition/basis/aux/formula/version/source/result', !!has, {
    id: r.conversionId, ver: r.version, src: r.source, rv: r.inputs.rawValue, ru: r.inputs.rawUnit, rb: r.inputs.rawBasis });
})();

// ── C9: derived ≠ documented — capability gate at the canonical layer ─────────────────────────────
(() => {
  // a verified transform of documented inputs → 'derived', and derived IS model-grade when verified
  const usable = CP.makeCanonicalParameter({ parameter: PARAM.REAR_WHEEL_RATE, value: 98.4,
    provenance: CP.PROVENANCE.DERIVED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: S.VERIFIED,
    applicability: CP.APPLICABILITY.BOTH, conversionRef: 'spring_element_to_wheel_rate' });
  chk('C9: derived + verified + value → modelUsable TRUE (derived is model-grade)', usable.modelUsable === true, usable.blockers);
  // an UNVERIFIED transform is NEVER usable, even if someone mislabels provenance as documented
  const mislabel = CP.makeCanonicalParameter({ parameter: PARAM.FRONT_ARB_ROLL_STIFFNESS, value: 1451,
    provenance: CP.PROVENANCE.DOCUMENTED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: S.UNVERIFIED,
    applicability: CP.APPLICABILITY.BOTH, conversionRef: 'arb_component_to_axle_roll_stiffness' });
  chk('C9: documented label cannot rescue an UNVERIFIED transform → modelUsable FALSE',
    mislabel.modelUsable === false && mislabel.blockers.indexOf('conversion_not_verified') !== -1, mislabel.blockers);
  // estimated provenance is never usable regardless of confidence
  const est = CP.makeCanonicalParameter({ parameter: PARAM.CG_HEIGHT, value: 290,
    provenance: CP.PROVENANCE.ESTIMATED, confidence: CP.CONFIDENCE.HIGH, conversionStatus: S.NOT_REQUIRED,
    applicability: CP.APPLICABILITY.BOTH });
  chk('C9: estimated + high confidence → still NOT usable', est.modelUsable === false && est.blockers.indexOf('provenance_not_model_grade') !== -1, est.blockers);
})();

console.log(`parameter-conversions: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
