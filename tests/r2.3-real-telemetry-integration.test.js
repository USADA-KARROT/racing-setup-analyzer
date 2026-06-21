/**
 * tests/r2.3-real-telemetry-integration.test.js — R2.3 §4.8: imported telemetry → SAME workspace orchestrator.
 * import → channel mapping → canonical session → AnalysisCase → runAnalysisWorkspace → view model → export
 * round-trip. Real/imported path uses the SAME orchestrator (no real-only logic). §14: unconfirmed mapping
 * → observation unavailable → comparison blocked (telemetry inspectable, comparison blocked).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const IA = require('../renderer/js/telemetry-import-adapter.js');
const CM = require('../renderer/js/channel-mapping.js');
const CTS = require('../renderer/js/canonical-telemetry-session.js');
const WS = require('../renderer/js/analysis-workspace.js');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');
const EX = require('../renderer/js/analysis-case-export.js');
const DEMO = require('../renderer/js/demo-analysis-case.js');
const assert = require('assert');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'r23' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();

// import the demo telemetry CSV through the real adapter
const csv = DEMO.buildDemoTelemetryCsv();
const imported = IA.importTelemetry({ format: 'csv', text: csv });
chk('import ok', imported.ok === true);

function assignAll(confirmed) {
  const byName = {}; imported.rawChannels.forEach(c => byName[c.rawName.toLowerCase()] = c.rawColumnId);
  return [['time', 'time'], ['speed', 'speed'], ['yaw_rate', 'yaw_rate'], ['steering', 'steering'], ['accy', 'lateral_accel']].map(p => ({ rawColumnId: byName[p[0]], canonicalChannel: p[1], userConfirmed: confirmed }));
}

// ── confirmed mapping → full chain on the SAME orchestrator ──
(() => {
  const mapping = CM.buildChannelMapping(imported.rawChannels, assignAll(true));
  const session = CTS.buildCanonicalSession(imported, mapping, [], null, { sessionId: 'imported_demo' });
  const demoCase = DEMO.buildDemoAnalysisCase().analysisCase;
  const ws = WS.runAnalysisWorkspace(demoCase, session, null, { modelRunner: runner });
  chk('chain: model understeer', ws.execution.predictedTendency === 'understeer');
  chk('chain: observed understeer_tendency (imported)', ws.observation.observedTendency === 'understeer_tendency', ws.observation.blockedReasons);
  chk('chain: comparison observed_more_understeer', ws.comparison.differenceClass === 'observed_more_understeer');
  chk('chain: RE directional', ws.raceEngineer.eligible.directional === true);
  chk('chain: DC eligible', ws.driverCoach.eligible === true);
  chk('chain: capability comparison eligible', ws.capability.modelTelemetryComparisonEligible === true);
  chk('chain: observation calibration higher-metrics false', ws.observation.calibrationCapability && ws.observation.calibrationCapability.calibratedMagnitudeEligible === false);

  const view = VM.buildAnalysisWorkspaceViewModel(ws, demoCase, {});
  chk('view ok', view.ok === true);
  chk('view F observed_more_understeer', view.modelVsActual.difference.value === 'observed_more_understeer');

  // export round trip
  const bundleInput = {
    meta: { exportedAt: '2026-06-21T00:00:00Z', appModelVersion: 'v1.6.0' },
    case: EX.caseSummary(demoCase), mapping: { entries: mapping.mappingEntries }, calibration: { entries: [] },
    window: session.advisory.validatedWindow,
    observation: { valid: ws.observation.valid, observedTendency: ws.observation.observedTendency, confidence: ws.observation.confidence, method: ws.observation.method, metric: ws.observation.observedMetrics.metric, limitations: ws.observation.limitations, confounders: ws.observation.confounders, credibility: ws.observation.credibility, blockedReasons: ws.observation.blockedReasons },
    comparison: { valid: ws.comparison.valid, predictedTendency: ws.comparison.predictedTendency, observedTendency: ws.comparison.observedTendency, differenceClass: ws.comparison.differenceClass, confidence: ws.comparison.confidence, assumptions: ws.comparison.assumptions, modelTelemetryComparisonEligible: ws.comparison.modelTelemetryComparisonEligible, credibility: ws.comparison.credibility, blockedReasons: ws.comparison.blockedReasons },
    raceEngineer: { eligible: ws.raceEngineer.eligible, summary: ws.raceEngineer.summary, likelySubsystems: ws.raceEngineer.likelySubsystems, inspectionPriorities: ws.raceEngineer.inspectionPriorities, setupDirections: ws.raceEngineer.setupDirections, trialOrder: ws.raceEngineer.trialOrder, missingEvidence: ws.raceEngineer.missingEvidence, confidence: ws.raceEngineer.confidence, credibility: ws.raceEngineer.credibility },
    driverCoach: { eligible: ws.driverCoach.eligible, observations: ws.driverCoach.observations, practicePriorities: ws.driverCoach.practicePriorities, cannotConclude: ws.driverCoach.cannotConclude, confidence: ws.driverCoach.confidence, credibility: ws.driverCoach.credibility },
    capability: ws.capability, blockers: [], warnings: [],
  };
  const exp = EX.exportAnalysisCase(bundleInput);
  chk('export ok (real chain)', exp.ok === true, exp.errors);
  const parsed = EX.parseAnalysisCaseExport(JSON.stringify(exp.bundle));
  chk('export round-trip', parsed.ok === true && deepEq(parsed.bundle, exp.bundle));
  chk('export private-source-free', exp.errors.length === 0);
})();

// ── §14: unconfirmed mapping → observation unavailable → comparison blocked (inspectable, not analysable) ──
(() => {
  const mapping = CM.buildChannelMapping(imported.rawChannels, assignAll(false));
  const session = CTS.buildCanonicalSession(imported, mapping, [], null, {});
  const demoCase = DEMO.buildDemoAnalysisCase().analysisCase;
  const ws = WS.runAnalysisWorkspace(demoCase, session, null, { modelRunner: runner });
  chk('§14: observation unavailable', ws.observation.valid === false && ws.observation.observedTendency === 'unavailable');
  chk('§14: required-channel-not-eligible blockers', ws.observation.blockedReasons.some(b => b.code === 'REQUIRED_CHANNEL_NOT_ELIGIBLE'));
  chk('§14: comparison blocked', ws.comparison.modelTelemetryComparisonEligible === false);
  chk('§14: model still ran (case inspectable)', ws.execution.valid === true);
})();
console.log(`r2.3-real-telemetry-integration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
