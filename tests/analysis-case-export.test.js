'use strict';
const EX = require('../renderer/js/analysis-case-export.js');
const assert = require('assert');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const deepEq = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };

const input = {
  meta: { exportedAt: '2026-06-21T00:00:00Z', appModelVersion: 'v1.6.0', note: 'demo' },
  case: EX.caseSummary({ kind: 'analysis_case', schemaVersion: '1.0.0', caseId: 'c1', caseMetadata: { title: 't', createdAt: '2026-06-21T00:00:00Z' }, vehicleBinding: { profileId: 'veh' }, telemetryBinding: { sessionId: 'sess' }, modelSnapshot: { modelId: 'dynamics-model', modelVersion: 'v1.6.0', canonicalContractVersion: '1.0.0' }, capabilityState: { modelInputEligible: true }, valid: true }),
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
(() => { const c = JSON.parse(JSON.stringify(input)); c.case = { kind: 'analysis_case', caseId: 'c1', caseMetadata: { title: 't' } }; chk('full (un-summarized) case object rejected', EX.exportAnalysisCase(c).ok === false); })();
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
// CP2 re-review: capability is a CLOSED key set (arbitrary boolean key rejected)
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.capability.secret = true; chk('capability unknown key rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e.indexOf('unknown_key') === 0)); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.raceEngineer.eligible.secret = true; chk('eligible unknown key rejected', EX.exportAnalysisCase(bad).ok === false); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.blockers = [{ code: 'x', detail: [{ values: [1,2,3] }] }]; const r = EX.exportAnalysisCase(bad); chk('blocker detail raw object → rejected (no leak)', r.ok === false && !JSON.stringify(r.bundle || {}).includes('values')); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.blockers = [{ code: 'x', detail: new Array(200).fill('x') }]; chk('blocker detail capped', EX.exportAnalysisCase(bad).bundle.blockers[0].detail.length === 16); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.mapping.secret = { values: [1,2,3] }; chk('section-level unknown key rejected', EX.exportAnalysisCase(bad).ok === false && EX.exportAnalysisCase(bad).errors.some(e => e === 'unknown_key:.mapping.secret')); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.warnings = [{ values: [1,2,3] }]; chk('warnings non-string rejected (not silently omitted)', EX.exportAnalysisCase(bad).ok === false); })();
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.window.speedRange = new Array(256).fill(0); chk('speedRange over-cap rejected', EX.exportAnalysisCase(bad).ok === false); })();
// CP2 re-review #3: alias shadow-discard paths removed (no silently-discarded raw values)
(() => { const m={rawColumnId:1,rawName:'s',canonicalChannel:'speed',userConfirmed:true,projection:{scale:1,offset:0,sign:1}}; const r=EX.exportAnalysisCase({mapping:{entries:[m]},mappingEntries:[{values:[1,2,3]}]}); chk('mappingEntries alias rejected (no discard)', r.ok===false && r.errors.some(e=>e==='unknown_input_key:mappingEntries')); })();
(() => { const r=EX.exportAnalysisCase({calibrationSet:[{values:[1,2,3]}]}); chk('calibrationSet alias rejected', r.ok===false); })();
(() => { const r=EX.exportAnalysisCase({case:{},analysisCase:{deep:{values:[1,2,3]}}}); chk('analysisCase alias rejected', r.ok===false && !JSON.stringify(r.bundle||{}).includes('values')); })();
(() => { const r=EX.exportAnalysisCase({mapping:''}); chk('malformed mapping section rejected', r.ok===false && r.errors.some(e=>e==='not_object:.mapping')); })();
// CP2 re-review #4: exotic input (getter/Proxy that throws) → fail-closed, never throws
(() => { const g={}; Object.defineProperty(g,'detail',{enumerable:true,get(){throw new Error('boom');}}); let threw=false,r; try{ r=EX.exportAnalysisCase({blockers:[g]}); }catch(e){ threw=true; } chk('getter-throws blocker → no throw, ok false', threw===false && r.ok===false); })();
(() => { let threw=false; try{ EX.exportAnalysisCase({blockers:[{code:'x',detail:(function(){var c={};c.s=c;return c;})()}]}); }catch(e){ threw=true; } chk('cyclic detail → no throw', threw===false); })();
(() => { let threw=false,r; try{ r=EX.parseAnalysisCaseExport('not json'); }catch(e){ threw=true; } chk('parse invalid json → no throw, ok false', threw===false && r.ok===false); })();
// CP2 re-review #6: blocker detail must be STRING codes (numeric sample-like array rejected)
(() => { const bad = JSON.parse(JSON.stringify(input)); bad.blockers = [{ code: 'x', detail: [0,1,2,3,4,5,6,7,8,9,10] }]; chk('numeric detail array rejected', EX.exportAnalysisCase(bad).ok === false); })();
// CP2 re-review #6: sparse array serializes deterministically and round-trips (no export-accept/parse-reject drift)
(() => { const sp = new Array(5); sp[2]='a'; sp[4]='b'; const r = EX.exportAnalysisCase({ meta:{}, warnings: sp }); const p = EX.parseAnalysisCaseExport(JSON.stringify(r.bundle)); chk('sparse array round-trip stable', deepEq(p.bundle, r.bundle) && r.bundle.warnings.length === 5); })();
// CP3: private file path via createdAt (or any string leaf) must be rejected (no exemption)
(() => { chk('case.createdAt private path rejected', EX.exportAnalysisCase({case:{createdAt:'/Users/alice/private/run.csv'}}).ok===false); })();
(() => { chk('calib.createdAt private path rejected', EX.exportAnalysisCase({calibration:{entries:[{calibrationType:'speed_scale',source:'s',confidence:'high',verified:true,createdAt:'/home/bob/secret.bmsbin'}]}}).ok===false); })();
(() => { chk('ISO timestamp createdAt still passes (no false positive)', EX.exportAnalysisCase({case:{createdAt:'2026-06-21T00:00:00Z'},meta:{exportedAt:'2026-06-21T12:34:56.789Z'}}).ok===true); })();
// CP3 #2: exotic objects (Date/RegExp/Map/class instance) as a section must be REJECTED, not coerced to {}
(() => { class C{constructor(){this.valid=true;}} chk('class-instance observation rejected', EX.exportAnalysisCase({observation:new C()}).ok===false); })();
(() => { chk('Date section rejected', EX.exportAnalysisCase({window:new Date()}).ok===false); })();
(() => { chk('RegExp section rejected', EX.exportAnalysisCase({mapping:/x/}).ok===false); })();
(() => { const v=EX.exportAnalysisCase({observation:{valid:true,blockedReasons:[{code:'x',detail:['a']}]}}); chk('plain observation still valid + normalized', v.ok===true && deepEq(v.bundle.observation.blockedReasons[0].detail,['a'])); })();
// CP3 #3: exotic objects as ARRAY ITEMS (blockers/entries) and meta must be rejected (no Object.assign laundering)
(() => { class B{constructor(){this.code='X';this.detail=['safe'];}} chk('class-instance blocker item rejected', EX.exportAnalysisCase({blockers:[new B()]}).ok===false); })();
(() => { chk('Date blocker item rejected', EX.exportAnalysisCase({blockers:[new Date()]}).ok===false); })();
(() => { class B{constructor(){this.rawColumnId=1;}} chk('class-instance mapping entry rejected', EX.exportAnalysisCase({mapping:{entries:[new B()]}}).ok===false); })();
(() => { class C{constructor(){this.note='x';}} chk('class-instance meta rejected', EX.exportAnalysisCase({meta:new C()}).ok===false); })();
(() => { const v=EX.exportAnalysisCase({blockers:[{code:'x',scope:'global',detail:['reset']}]}); chk('plain blocker still valid', v.ok===true && deepEq(v.bundle.blockers[0].detail,['reset'])); })();
// R2.6: trackIntelligence section is closed (capped corners, closed phase schema, no raw arrays)
(() => { const ti={eligible:true,lapCount:2,credibility:'Heuristic',corners:[{cornerId:'c0',lapId:1,samples:18,summary:'ok',confidence:'low',trackPosRange:[0,100],timeRange:[0,1],entry:{sufficient:true,qualitative:'few_secondary_corrections',confidence:'low'},mid:{sufficient:false,reason:'insufficient_samples',samples:2},exit:{sufficient:true,qualitative:'few_secondary_corrections',confidence:'low'}}],limitations:['x'],cannotConclude:[],blockedReasons:[]}; chk('trackIntelligence section exports closed', EX.exportAnalysisCase({meta:{},trackIntelligence:ti}).ok===true); })();
(() => { const ti={eligible:true,corners:[{cornerId:'c0',secret:{values:[1,2,3]}}]}; chk('unknown corner key rejected', EX.exportAnalysisCase({meta:{},trackIntelligence:ti}).ok===false); })();
(() => { const c={cornerId:'c0',lapId:1,samples:1,summary:'x',confidence:'low',trackPosRange:[0,1],timeRange:[0,1],entry:{sufficient:true,confidence:'low'},mid:{sufficient:true,confidence:'low'},exit:{sufficient:true,confidence:'low'}}; const ti={eligible:true,corners:Array.from({length:100},()=>c)}; chk('over-cap corners (>64) rejected', EX.exportAnalysisCase({meta:{},trackIntelligence:ti}).ok===false); })();
console.log(`analysis-case-export: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
