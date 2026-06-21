/**
 * tests/r2.5-setup-ab-quantitative-integration.test.js — R2.5: model-grounded Setup A/B + quantitative
 * recommendation through the SAME runAnalysisWorkspace orchestrator + view model + export. Physical units only
 * (hardware clicks gated), model-grounded (not measured / no lap-time claim), fail-closed on degenerate levers.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const WS = require('../renderer/js/analysis-workspace.js');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');
const AB = require('../renderer/js/setup-ab.js');
const EX = require('../renderer/js/analysis-case-export.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'r25' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const baseCase = () => DEMO.buildDemoAnalysisCase().analysisCase;

// ── 1) quantitative recommendation through the SAME orchestrator ──
(() => {
  const c = baseCase();
  const ws = WS.runAnalysisWorkspace(c, null, null, { modelRunner: runner, quantitative: { target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg' } });
  chk('same orchestrator: model ran', ws.execution.valid === true);
  chk('capability: quantitative eligible', ws.capability.quantitativeSetupRecommendationEligible === true);
  chk('capability: setup A/B eligible', ws.capability.setupAbEligible === true);
  const qr = ws.quantitativeRecommendation;
  chk('recommendation produced', qr && qr.available === true, qr && qr.blockedReasons);
  chk('physical units (Nm/deg)', qr.unit === 'Nm/deg');
  chk('lands near target (residual small)', Math.abs(qr.residual) < 0.25, qr.residual);
  chk('clicks gated (no click count)', qr.clicksEligible === false);
  chk('model-grounded (credibility Model)', qr.credibility === 'Model');
  chk('side effects reported', Array.isArray(qr.sideEffects) && qr.sideEffects.length >= 1);
  chk('validation step present', typeof qr.validationStep === 'string');
  chk('input case not mutated', c.modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value === baseCase().modelSnapshot.canonicalInputSnapshot.frontArbRollStiffnessNmDeg.value);
})();

// ── 2) view model surfaces the recommendation + capability rows ──
(() => {
  const ws = WS.runAnalysisWorkspace(baseCase(), null, null, { modelRunner: runner, quantitative: { target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg' } });
  const v = VM.buildAnalysisWorkspaceViewModel(ws, baseCase(), {});
  chk('viewmodel: quantitativeRecommendation available', v.quantitativeRecommendation.available === true);
  chk('viewmodel: clicks gated', v.quantitativeRecommendation.clicksEligible === false);
  chk('viewmodel: capability rows include quantitative + A/B', v.capabilitySummary.some(r => r.key === 'quantitativeSetupRecommendationEligible') && v.capabilitySummary.some(r => r.key === 'setupAbEligible'));
})();

// ── 3) no quantitative target → no recommendation, layer still eligible ──
(() => {
  const ws = WS.runAnalysisWorkspace(baseCase(), null, null, { modelRunner: runner });
  chk('no target: quantitativeRecommendation null', ws.quantitativeRecommendation === null);
  chk('no target: layer still eligible', ws.capability.quantitativeSetupRecommendationEligible === true);
  const v = VM.buildAnalysisWorkspaceViewModel(ws, baseCase(), {});
  chk('no target: viewmodel section requested=false', v.quantitativeRecommendation.requested === false && v.quantitativeRecommendation.available === false);
})();

// ── 4) degenerate lever (front ARB → understeer gradient) → recommendation blocked, layer still eligible ──
(() => {
  const ws = WS.runAnalysisWorkspace(baseCase(), null, null, { modelRunner: runner, quantitative: { target: { metric: 'understeer_gradient', delta: -0.2 }, parameterKey: 'frontArbRollStiffnessNmDeg' } });
  chk('degenerate lever: recommendation blocked', ws.quantitativeRecommendation.available === false && ws.quantitativeRecommendation.blockedReasons.some(b => b.code === 'DEGENERATE_SENSITIVITY'));
  chk('degenerate lever: layer still eligible', ws.capability.quantitativeSetupRecommendationEligible === true);
})();

// ── 5) Setup A/B is model-grounded, not measured / no lap-time ──
(() => {
  const a = baseCase();
  const b = baseCase(); b.modelSnapshot.canonicalInputSnapshot.frontWeightPct.value *= 1.08;
  const r = AB.compareSetups(a, b, { modelRunner: runner });
  chk('A/B: valid + credibility Model', r.valid === true && r.credibility === 'Model');
  chk('A/B: B more understeer (more front weight)', r.directionalSummary === 'b_more_understeer', r.directionalSummary);
  chk('A/B: no lap-time claim', r.assumptions.indexOf('no_laptime_claim') !== -1);
})();

// ── 6) export stays closed with the new capability key ──
(() => {
  const ws = WS.runAnalysisWorkspace(baseCase(), null, null, { modelRunner: runner });
  const r = EX.exportAnalysisCase({ meta: {}, capability: ws.capability });
  chk('export: capability with setupAbEligible accepted (closed)', r.ok === true, r.errors);
  chk('export: still rejects an unknown capability key', EX.exportAnalysisCase({ meta: {}, capability: Object.assign({}, ws.capability, { secret: true }) }).ok === false);
})();

// CP1 re-review fix: runner consistency — a workspace run via opts.modelEngine threads the SAME engine to the
// quantitative probe + recommendation (not a divergent global fallback)
(() => {
  const ws = WS.runAnalysisWorkspace(baseCase(), null, null, { modelEngine: ctx.__h.Tier1BasicBalance, quantitative: { target: { metric: 'roll_stiffness_dist_front', delta: 0.5 }, parameterKey: 'frontArbRollStiffnessNmDeg' } });
  chk('modelEngine: exec + quant consistent', ws.execution.valid === true && ws.capability.quantitativeSetupRecommendationEligible === true && ws.quantitativeRecommendation.available === true, ws.quantitativeRecommendation && ws.quantitativeRecommendation.blockedReasons);
})();
console.log(`r2.5-setup-ab-quantitative-integration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
