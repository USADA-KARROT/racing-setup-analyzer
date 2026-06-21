/**
 * tests/analysis-workspace.test.js — R2.2: orchestrator + deriveWorkspaceCapability (pure aggregation).
 * Capability is aggregated from the five results without mutating them; downstream eligibility is NOT
 * set before observation exists.
 */
'use strict';
const WS = require('../renderer/js/analysis-workspace.js');
const OBS = require('../renderer/js/telemetry-observation.js');
const FX = require('./fixtures/synthetic-telemetry.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// ── deriveWorkspaceCapability ──
(() => {
  const exec = { capabilityState: { caseValid: true, modelInputResolved: true, modelRan: true } };
  const obs = { valid: true, channels: { speed: { available: true }, steering: { available: true } } };
  const cmp = { modelTelemetryComparisonEligible: true };
  const re = { eligible: { inspection: true, directional: true } };
  const dc = { eligible: true };
  const cap = WS.deriveWorkspaceCapability(exec, obs, cmp, re, dc);
  chk('all-good: modelRan', cap.modelRan === true);
  chk('all-good: telemetryInspectable', cap.telemetryInspectable === true);
  chk('all-good: telemetryObservable', cap.telemetryObservable === true);
  chk('all-good: comparison eligible', cap.modelTelemetryComparisonEligible === true);
  chk('all-good: RE inspection + directional', cap.raceEngineerInspectionEligible === true && cap.raceEngineerDirectionalEligible === true);
  chk('all-good: driver coaching', cap.driverCoachingEligible === true);
  chk('all-good: quantitative false without a lever probe (pure aggregation)', cap.quantitativeSetupRecommendationEligible === false);
  chk('quantitative eligible follows lever flag true', WS.deriveWorkspaceCapability(exec, obs, cmp, re, dc, true).quantitativeSetupRecommendationEligible === true);
  chk('quantitative eligible follows lever flag false', WS.deriveWorkspaceCapability(exec, obs, cmp, re, dc, false).quantitativeSetupRecommendationEligible === false);
})();
(() => {
  const cap = WS.deriveWorkspaceCapability({ capabilityState: { caseValid: true, modelInputResolved: false, modelRan: false } }, { valid: false, channels: {} }, { modelTelemetryComparisonEligible: false }, { eligible: { inspection: false, directional: false } }, { eligible: false });
  chk('blocked: modelRunnable false', cap.modelRunnable === false);
  chk('blocked: telemetryObservable false', cap.telemetryObservable === false);
  chk('blocked: comparison false', cap.modelTelemetryComparisonEligible === false);
  chk('blocked: RE false', cap.raceEngineerInspectionEligible === false);
})();
(() => {
  // observation present but no required channels confirmed → not inspectable
  const cap = WS.deriveWorkspaceCapability({ capabilityState: { caseValid: true } }, { valid: true, channels: { speed: { available: false }, steering: { available: true } } }, {}, {}, {});
  chk('partial channels: not inspectable', cap.telemetryInspectable === false);
})();

// ── runAnalysisWorkspace wiring + no-mutate (stub model runner) ──
(() => {
  const runner = () => ({ tier: 1, front_wheel_rate: 100, rear_wheel_rate: 90, front_wheel_rate_effective: 80, rear_wheel_rate_effective: 75, total_roll_stiffness: 2000, roll_stiffness_dist_front: 55, understeer_gradient: 0.6, tendency: 'Understeer', tendency_zh: '轉向不足', ride_frequency: { front_hz: 3, rear_hz: 3 }, lltd_front: 52, weight_front_pct: 50 });
  // need a valid case — reuse demo
  const demo = require('../renderer/js/demo-analysis-case.js').buildDemoAnalysisCase();
  const before = JSON.stringify(demo.analysisCase);
  const r = WS.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, null, { modelRunner: runner });
  chk('wiring: all five results present', !!(r.execution && r.observation && r.comparison && r.raceEngineer && r.driverCoach && r.capability));
  chk('wiring: execution ran with stub', r.execution.predictedTendency === 'understeer');
  chk('no-mutate: case unchanged', JSON.stringify(demo.analysisCase) === before);
})();

// ── exotic ──
(() => {
  let threw = false; let r;
  try { r = WS.runAnalysisWorkspace(null, null, null, {}); } catch (e) { threw = true; }
  chk('exotic: no throw', threw === false);
  chk('exotic: results present (all fail-closed)', r && r.execution.valid === false && r.observation.observedTendency === 'unavailable');
})();

console.log(`analysis-workspace: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
