/**
 * tests/setup-ab.test.js — R2.5 setup A/B: model-grounded predicted deltas between two setups (not measured).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const AB = require('../renderer/js/setup-ab.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'ab' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const baseCase = () => DEMO.buildDemoAnalysisCase().analysisCase;
const withParam = (key, mul) => { const c = baseCase(); const p = c.modelSnapshot.canonicalInputSnapshot[key]; p.value = p.value * mul; return c; };

// identical setups → zero deltas
(() => {
  const r = AB.compareSetups(baseCase(), baseCase(), { modelRunner: runner });
  chk('identical: valid', r.valid === true, r.blockedReasons);
  chk('identical: zero understeer delta', r.deltas.understeer_gradient === 0);
  chk('identical: no meaningful change', r.directionalSummary === 'no_meaningful_balance_change');
  chk('identical: credibility Model', r.credibility === 'Model');
  chk('no laptime claim', r.assumptions.indexOf('no_laptime_claim') !== -1);
})();

// B with much higher front weight % → more understeer
(() => {
  const r = AB.compareSetups(baseCase(), withParam('frontWeightPct', 1.08), { modelRunner: runner });
  chk('weight: valid', r.valid === true, r.blockedReasons);
  chk('weight: understeer delta positive', r.deltas.understeer_gradient > 0, r.deltas.understeer_gradient);
  chk('weight: directional b_more_understeer', r.directionalSummary === 'b_more_understeer', r.directionalSummary);
})();

// B with higher front ARB → roll-stiffness distribution moves forward
(() => {
  const r = AB.compareSetups(baseCase(), withParam('frontArbRollStiffnessNmDeg', 1.2), { modelRunner: runner });
  chk('arb: roll_stiffness_dist_front delta positive', r.deltas.roll_stiffness_dist_front > 0, r.deltas.roll_stiffness_dist_front);
  chk('arb: total roll stiffness delta nonzero', Math.abs(r.deltas.total_roll_stiffness) > 0);
})();

// invalid setup B → blocked, A still reported
(() => {
  const bad = baseCase(); bad.modelSnapshot.canonicalInputSnapshot.frontWheelRateNmm.value = NaN;
  const r = AB.compareSetups(baseCase(), bad, { modelRunner: runner });
  chk('invalid B → blocked', r.valid === false && r.blockedReasons.some(b => b.code === 'SETUP_B_MODEL_RUN_FAILED'));
})();

// no runner → blocked, never throws
(() => { let threw = false, r; try { r = AB.compareSetups(baseCase(), baseCase(), {}); } catch (e) { threw = true; } chk('no runner → no throw, blocked', threw === false && r.valid === false); })();

// CP1 re-review fix: an out-of-range what-if is flagged (non-blocking) so it is not read as a clean model result
(() => {
  const r = AB.compareSetups(baseCase(), withParam('frontArbRollStiffnessNmDeg', 3), { modelRunner: runner }); // ~1190 → in range
  chk('in-range what-if: no plausibility warning', Array.isArray(r.plausibilityWarnings) && r.plausibilityWarnings.length === 0);
  const r2 = AB.compareSetups(baseCase(), withParam('frontArbRollStiffnessNmDeg', 25), { modelRunner: runner }); // ~9900 → out of range
  chk('out-of-range what-if: plausibility warning', r2.plausibilityWarnings.some(w => w.parameter === 'frontArbRollStiffnessNmDeg'), r2.plausibilityWarnings);
})();
console.log(`setup-ab: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
