'use strict';
const EX = require('../renderer/js/analysis-case-export.js');
const assert = require('assert');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

const input = {
  meta: { exportedAt: '2026-06-21T00:00:00Z', appModelVersion: 'v1.6.0', note: 'demo' },
  case: { kind: 'analysis_case', schemaVersion: '1.0.0', caseId: 'c1', caseMetadata: { title: 't', createdAt: '2026-06-21T00:00:00Z' }, vehicleBinding: { profileId: 'veh' }, telemetryBinding: { sessionId: 'sess' }, modelSnapshot: { modelId: 'dynamics-model', modelVersion: 'v1.6.0', canonicalContractVersion: '1.0.0' }, capabilityState: { modelInputEligible: true }, valid: true },
  mapping: { entries: [{ rawColumnId: 1, rawName: 'speed', canonicalChannel: 'speed', userConfirmed: true, projection: { scale: 1, offset: 0, sign: 1 }, rawUnit: 'm/s', canonicalUnit: 'm/s' }] },
  calibration: { entries: [{ calibrationType: 'steering_sign', value: 1, unit: ':1', source: 'sheet', confidence: 'high', verified: true, applicableSessionIds: ['s1'], createdAt: '2026-06-21T00:00:00Z' }] },
  window: { startTime: 0, endTime: 10, valid: true, sampleCount: 200, steadyStateCount: 150, quality: 'good', speedRange: [15, 40], lateralAccelRange: [2, 9], steeringSign: 'positive', rejectionReasons: [] },
  observation: { valid: true, observedTendency: 'understeer_tendency', confidence: 'medium', method: 'speed_dependent_yaw_per_steer_trend', metric: 'yaw_rate_per_raw_steering', limitations: ['steering_is_raw_uncalibrated'], confounders: ['transient_driving'], credibility: 'Heuristic', blockedReasons: [] },
  comparison: { valid: true, predictedTendency: 'understeer', observedTendency: 'understeer', differenceClass: 'observed_more_understeer', confidence: 'medium', assumptions: ['a'], modelTelemetryComparisonEligible: true, credibility: 'Heuristic', blockedReasons: [] },
  raceEngineer: { eligible: { inspection: true, directional: true, quantitative: false }, summary: 's', likelySubsystems: ['front_tyre_state'], inspectionPriorities: [], setupDirections: [], trialOrder: [], missingEvidence: [], confidence: 'medium', credibility: 'Heuristic' },
  driverCoach: { eligible: true, observations: [], practicePriorities: [], cannotConclude: [], confidence: 'low', credibility: 'Heuristic' },
  capability: { modelRan: true, quantitativeSetupRecommendationEligible: false },
  blockers: [], warnings: ['note'],
};

(() => {
  const r = EX.exportAnalysisCase(input);
  chk('export ok', r.ok === true, r.errors);
  chk('case summarized (scalars; vehicleProfileId extracted)', r.bundle.case.vehicleProfileId === 'veh' && r.bundle.case.modelVersion === 'v1.6.0');
  const p = EX.parseAnalysisCaseExport(JSON.stringify(r.bundle));
  chk('parse ok', p.ok === true, p.errors);
  chk('round-trip deep equal', deepEq(p.bundle, r.bundle));
})();
// CP2 finding: unknown TOP-LEVEL input key rejected
(() => { const bad = Object.assign({ junk: 1 }, input); chk('unknown input top key rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('unknown_input_key') === 0)); })();
// CP2 finding: unknown NESTED case key never leaks (case summarized) → export still ok, summary clean
(() => { const c = JSON.parse(JSON.stringify(input)); c.case.secretNested = { raw: [1, 2, 3] }; const r = EX.exportAnalysisCase(c); chk('unknown nested case key does not leak (summarized)', r.ok === true && !('secretNested' in r.bundle.case)); })();
// CP2 finding: a raw values array in a mapping entry rejected (unknown key)
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.mapping.entries[0].values = [1, 2, 3, 4]; chk('mapping entry raw values rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('unknown_key') === 0)); })();
// malformed entry (missing projection) fails closed
(() => { const bad = JSON.parse(JSON.stringify(input)); delete bad.mapping.entries[0].projection; chk('entry missing projection rejected', EX.exportAnalysisCase(bad).ok === false); })();
// unknown section key rejected
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.observation.secretRawArray = [1, 2, 3]; chk('unknown section key rejected', EX.exportAnalysisCase(bad).ok === false); })();
// private path leaf rejected
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.meta.note = '/Users/secret/run.csv'; chk('private leaf rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('private_leaf') === 0)); })();
// unit N/mm and ratio 60/80 allowed (not private)
(() => { const ok = JSON.parse(JSON.stringify(input)); ok.mapping.entries[0].rawUnit = 'N/mm'; ok.calibration.entries[0].unit = '60/80'; chk('units N/mm and 60/80 allowed', EX.exportAnalysisCase(ok).ok === true); })();
// capability non-boolean rejected
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.capability.modelRan = 'yes'; chk('capability non-boolean rejected', EX.exportAnalysisCase(bad).ok === false); })();
// over-long array rejected (defensive raw-sample guard)
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.warnings = new Array(300).fill('x'); chk('over-long array rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('array_too_long') === 0)); })();
// parse unknown top key rejected
(() => { chk('parse unknown top key rejected', EX.parseAnalysisCaseExport(JSON.stringify({ bundleSchemaVersion: '1.0.0', junk: 1 })).ok === false); })();
console.log(`analysis-case-export: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
