'use strict';
const EX = require('../renderer/js/analysis-case-export.js');
const assert = require('assert');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

const input = {
  meta: { exportedAt: '2026-06-21T00:00:00Z', appModelVersion: 'v1.6.0', note: 'demo' },
  case: { kind: 'analysis_case', schemaVersion: '1.0.0', caseId: 'c1', valid: true },
  mapping: { entries: [{ rawColumnId: 1, canonicalChannel: 'speed', userConfirmed: true }] },
  calibration: { entries: [] },
  window: { startTime: 0, endTime: 10, valid: true, sampleCount: 200, quality: 'good', rejectionReasons: [] },
  observation: { valid: true, observedTendency: 'understeer_tendency', confidence: 'medium', method: 'speed_dependent_yaw_per_steer_trend', metric: 'yaw_rate_per_raw_steering', limitations: ['x'], confounders: ['y'], credibility: 'Heuristic', blockedReasons: [] },
  comparison: { valid: true, predictedTendency: 'understeer', observedTendency: 'understeer', differenceClass: 'observed_more_understeer', confidence: 'medium', assumptions: ['a'], modelTelemetryComparisonEligible: true, credibility: 'Heuristic', blockedReasons: [] },
  raceEngineer: { eligible: { inspection: true, directional: true, quantitative: false }, summary: 's', likelySubsystems: ['front_tyre_state'], inspectionPriorities: [], setupDirections: [], trialOrder: [], missingEvidence: [], confidence: 'medium', credibility: 'Heuristic' },
  driverCoach: { eligible: true, observations: [], practicePriorities: [], cannotConclude: [], confidence: 'low', credibility: 'Heuristic' },
  capability: { modelRan: true, telemetryObservable: true, quantitativeSetupRecommendationEligible: false },
  blockers: [], warnings: ['note'],
};

(() => {
  const r = EX.exportAnalysisCase(input);
  chk('export ok', r.ok === true, r.errors);
  chk('bundle versioned', r.bundle.bundleSchemaVersion === '1.0.0');
  // round trip
  const json = JSON.stringify(r.bundle);
  const p = EX.parseAnalysisCaseExport(json);
  chk('parse ok', p.ok === true, p.errors);
  chk('round-trip deep equal', deepEq(p.bundle, r.bundle));
})();
// unknown key in a section → rejected
(() => {
  const bad = JSON.parse(JSON.stringify(input)); bad.observation.secretRawArray = [1, 2, 3];
  chk('unknown section key rejected', EX.exportAnalysisCase(bad).ok === false);
})();
// private path leaf → rejected
(() => {
  const bad = JSON.parse(JSON.stringify(input)); bad.meta.note = '/Users/secret/run.csv';
  chk('private leaf rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('private_leaf') === 0));
})();
// capability non-boolean → rejected
(() => {
  const bad = JSON.parse(JSON.stringify(input)); bad.capability.modelRan = 'yes';
  chk('capability non-boolean rejected', EX.exportAnalysisCase(bad).ok === false);
})();
// parse unknown top key → rejected
(() => {
  chk('parse unknown top key rejected', EX.parseAnalysisCaseExport(JSON.stringify({ bundleSchemaVersion: '1.0.0', junk: 1 })).ok === false);
})();
console.log(`analysis-case-export: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
