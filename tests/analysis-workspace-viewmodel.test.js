/**
 * tests/analysis-workspace-viewmodel.test.js — R2.2 §12: pure view-model builder.
 * Consumes service outputs only (no physics recompute); credibility labels correct; unavailable/blocked
 * states surfaced with reasons and never crash; null inputs fail-closed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');
const WS = require('../renderer/js/analysis-workspace.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'vmtest' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();
const demo = DEMO.buildDemoAnalysisCase();
const ws = WS.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, null, { modelRunner: runner });

// ── null / malformed ──
chk('null workspace → ok false', VM.buildAnalysisWorkspaceViewModel(null, demo.analysisCase, {}).ok === false);

// ── NO physics recompute: every model number equals the service snapshot exactly ──
(() => {
  const v = VM.buildAnalysisWorkspaceViewModel(ws, demo.analysisCase, {});
  const s = ws.execution.modelResultSnapshot;
  chk('no-recompute: understeer gradient identical', v.modelPrediction.understeerGradient.value === s.understeer_gradient);
  chk('no-recompute: total roll stiffness identical', v.modelPrediction.totalRollStiffness.value === s.total_roll_stiffness);
  chk('no-recompute: front wheel rate identical', v.modelPrediction.frontWheelRate.value === s.front_wheel_rate);
  chk('no-recompute: roll gradient identical', v.modelPrediction.rollGradient.value === s.roll_gradient_deg_per_g);
})();

// ── credibility labels ──
(() => {
  const v = VM.buildAnalysisWorkspaceViewModel(ws, demo.analysisCase, {});
  chk('cred: roll stiffness Physics', v.modelPrediction.frontRollStiffness.credibility === 'Physics');
  chk('cred: understeer gradient Model', v.modelPrediction.understeerGradient.credibility === 'Model');
  chk('cred: predicted tendency Model', v.modelPrediction.predictedTendency.credibility === 'Model');
  chk('cred: observation Heuristic', v.telemetryObservation.observedTendency.credibility === 'Heuristic');
  chk('cred: comparison difference Heuristic', v.modelVsActual.difference.credibility === 'Heuristic');
})();

// ── model blocked (engine unavailable) → modelPrediction unavailable with reason, no crash ──
(() => {
  const wsNoModel = WS.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, null, {}); // no runner, no global
  const v = VM.buildAnalysisWorkspaceViewModel(wsNoModel, demo.analysisCase, {});
  chk('model blocked: ok true (no crash)', v.ok === true);
  chk('model blocked: prediction unavailable', v.modelPrediction.available === false);
  chk('model blocked: blockedReasons surfaced', Array.isArray(v.modelPrediction.blockedReasons) && v.modelPrediction.blockedReasons.length > 0);
  chk('model blocked: drawer has blocked reasons', v.evidenceDrawer.allBlockedReasons.length > 0);
})();

// ── completely empty workspace result → all sections unavailable, no crash ──
(() => {
  const v = VM.buildAnalysisWorkspaceViewModel({ capability: {}, execution: {}, observation: null, comparison: null, raceEngineer: null, driverCoach: null, caseContext: {} }, null, {});
  chk('empty: ok true', v.ok === true);
  chk('empty: model unavailable', v.modelPrediction.available === false);
  chk('empty: observation unavailable', v.telemetryObservation.available === false);
  chk('empty: comparison unavailable', v.modelVsActual.available === false);
  chk('empty: capability summary still 10 rows', v.capabilitySummary.length === 10);
})();

// ── pure: no-mutate ──
(() => {
  const before = JSON.stringify(ws);
  VM.buildAnalysisWorkspaceViewModel(ws, demo.analysisCase, { suspensionNormalizationView: demo.suspensionNormalizationView });
  chk('no-mutate workspace result', JSON.stringify(ws) === before);
})();

console.log(`analysis-workspace-viewmodel: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
