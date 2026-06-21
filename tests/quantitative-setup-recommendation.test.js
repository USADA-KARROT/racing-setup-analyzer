/**
 * tests/quantitative-setup-recommendation.test.js — R2.5 quantitative: model-grounded physical-unit setup
 * recommendation, fail-closed, clicks gated, never measured/guaranteed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const QR = require('../renderer/js/quantitative-setup-recommendation.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'qr' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const baseCase = () => DEMO.buildDemoAnalysisCase().analysisCase;

// roll-stiffness distribution +0.5% via front ARB → available, lands near target, side-effects, clicks gated
(() => {
  const c = baseCase();
  const r = QR.recommendSetupChange({ analysisCase: c, target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('roll-dist via front ARB: available', r.available === true, r.blockedReasons);
  chk('roll-dist: physical unit Nm/deg', r.unit === 'Nm/deg');
  chk('roll-dist: recommended delta finite', typeof r.recommendedDeltaPhysical === 'number' && isFinite(r.recommendedDeltaPhysical));
  chk('roll-dist: lands near target (residual small)', Math.abs(r.residual) < 0.25, r.residual);
  chk('roll-dist: predicted-after near baseline+target', Math.abs(r.predictedMetricAfter - (r.baselineMetric + 0.5)) < 0.25, [r.predictedMetricAfter, r.baselineMetric]);
  chk('roll-dist: side effects reported', Array.isArray(r.sideEffects) && r.sideEffects.length >= 1);
  chk('roll-dist: clicks gated', r.clicksEligible === false);
  chk('roll-dist: credibility Model', r.credibility === 'Model');
  chk('roll-dist: validation step present', typeof r.validationStep === 'string' && r.validationStep.length > 10);
  chk('roll-dist: linearization limitation', r.limitations.indexOf('local_linearization') !== -1);
  chk('roll-dist: not mutate input case', c.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value === DEMO.buildDemoAnalysisCase().analysisCase.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value);
})();

// understeer gradient via front ARB → DEGENERATE (front ARB does not move K_us in this model) → blocked
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'understeer_gradient', delta: -0.2 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('K_us via front ARB → degenerate blocked', r.available === false && r.blockedReasons.some(b => b.code === 'DEGENERATE_SENSITIVITY'), r.blockedReasons);
})();

// understeer gradient via front weight % → available (weight moves K_us strongly)
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'understeer_gradient', delta: 0.1 }, parameterKey: 'frontWeightPct', runner });
  chk('K_us via front weight: available', r.available === true, r.blockedReasons);
  chk('K_us via front weight: % unit', r.unit === '%');
})();

// fail-closed inputs
(() => {
  chk('no target metric → blocked', QR.recommendSetupChange({ analysisCase: baseCase(), target: {}, parameterKey: 'frontArbRollStiffnessNmDeg', runner }).available === false);
  chk('unknown metric → blocked', QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'lap_time', delta: 1 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner }).available === false);
  chk('unknown parameter → blocked', QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 1 }, parameterKey: 'tyre_pressure', runner }).available === false);
  chk('zero delta → blocked', QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 0 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner }).available === false);
  chk('no case → blocked', QR.recommendSetupChange({ target: { metric: 'roll_stiffness_dist_front', delta: 1 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner }).available === false);
})();

// implausible target (forces a negative ARB) → blocked
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: -60 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('implausible recommended value → blocked', r.available === false && r.blockedReasons.some(b => b.code === 'IMPLAUSIBLE_RECOMMENDED_VALUE' || b.code === 'PREDICTED_RESULT_OUT_OF_BAND'), r.blockedReasons);
})();

// hasQuantitativeLever
(() => {
  chk('lever true for roll_stiffness_dist_front', QR.hasQuantitativeLever(baseCase(), 'roll_stiffness_dist_front', runner) === true);
  chk('lever true for understeer_gradient (weight)', QR.hasQuantitativeLever(baseCase(), 'understeer_gradient', runner) === true);
})();

// determinism + never throws on garbage
(() => {
  const inp = { analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner };
  chk('deterministic', JSON.stringify(QR.recommendSetupChange(inp)) === JSON.stringify(QR.recommendSetupChange(inp)));
  let threw = false; try { QR.recommendSetupChange({ analysisCase: { junk: true }, target: { metric: 'roll_stiffness_dist_front', delta: 1 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner }); } catch (e) { threw = true; }
  chk('garbage case → no throw, blocked', threw === false);
})();

// CP1 fix: finite plausible bounds — an arbitrarily large target is blocked (no unbounded recommendation)
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'total_roll_stiffness', delta: 50000 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('huge target → IMPLAUSIBLE_RECOMMENDED_VALUE (bounded)', r.available === false && r.blockedReasons.some(b => b.code === 'IMPLAUSIBLE_RECOMMENDED_VALUE'), r.blockedReasons);
})();
// CP1 fix: leverType labels suspension vs weight-distribution (frontWeightPct is a distinct ballast lever)
(() => {
  const a = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('ARB lever labelled suspension', a.leverType === 'suspension_roll_stiffness');
  const w = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'understeer_gradient', delta: 0.1 }, parameterKey: 'frontWeightPct', runner });
  chk('front weight lever labelled ballast', w.leverType === 'weight_distribution_ballast');
})();

// CP1 re-review fix: an out-of-range BASELINE is rejected (never derive sensitivity from an out-of-range setup)
(() => {
  const c = baseCase(); c.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value = 3500; // > 3000 cap
  const r = QR.recommendSetupChange({ analysisCase: c, target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('out-of-range baseline → blocked', r.available === false && r.blockedReasons.some(b => b.code === 'BASELINE_PARAMETER_OUT_OF_RANGE'), r.blockedReasons);
})();
// CP1 re-review fix: near the upper bound, the probe steps INWARD (no out-of-range probe); result stays in range or blocks
(() => {
  const c = baseCase(); c.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value = 2995; // just under 3000
  const r = QR.recommendSetupChange({ analysisCase: c, target: { metric: 'roll_stiffness_dist_front', delta: -0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('near-upper baseline: in-range or blocked (never out-of-range)', (r.available === true && r.recommendedValue >= 0 && r.recommendedValue <= 3000) || r.available === false, r.recommendedValue);
})();

// CP1 re-review fix: sideEffects reports ALL tracked metrics (incl unchanged = 0), unambiguously
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  chk('sideEffects include an unchanged (zero) metric', r.available === true && r.sideEffects.some(s => s.delta === 0), r.sideEffects);
})();
// CP1 re-review fix: the recommendation is an EPHEMERAL hypothetical model override — scalars only, no case leakage
(() => {
  const r = QR.recommendSetupChange({ analysisCase: baseCase(), target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg', runner });
  const blob = JSON.stringify(r);
  chk('no AnalysisCase / snapshot leaked into output', blob.indexOf('canonicalInputSnapshot') === -1 && blob.indexOf('modelSnapshot') === -1 && r.analysisCase === undefined);
  chk('labelled hypothetical model override (not provenance-validated)', r.limitations.indexOf('hypothetical_model_override_not_provenance_validated') !== -1);
})();
console.log(`quantitative-setup-recommendation: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
