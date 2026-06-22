/**
 * tests/r3.0b-persistence-integration.test.js — R3.0B end-to-end through the production modules (MemoryBackend):
 * a realistic hand-built analysis view model is saved, reopened IDENTICALLY, exported to a portable bundle,
 * re-imported as a degraded imported_summary, and re-read by the library view model — with raw-telemetry and
 * future-version guarantees. Fixture is hand-built (NOT a production builder) so fixture ≠ oracle.
 */
'use strict';
const SB = require('../renderer/js/storage-backend.js');
const CSt = require('../renderer/js/case-store.js');
const SS = require('../renderer/js/session-store.js');
const LVM = require('../renderer/js/case-library-viewmodel.js');
const assert = require('assert');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// a realistic VM (the shape buildAnalysisWorkspaceViewModel emits) — hand-built, with the real small arrays
const VM = {
  ok: true,
  caseHeader: { caseId: 'demo_case_001', vehicle: 'demo_f3', telemetrySession: 'sess1', overallStatus: 'analysis_complete', createdAt: '2026-06-22' },
  capabilitySummary: [{ key: 'modelRan', available: true }, { key: 'cornerCoachingEligible', available: false }],
  setupInputs: { frontWheelRate: { value: 240, unit: 'N/mm' }, rearWheelRate: { value: 320, unit: 'N/mm' }, frontArb: { value: 99 }, rearArb: { value: 60 }, mass: { value: 565 }, frontWeightPct: { value: 41.5 }, cgHeight: { value: 280 } },
  modelPrediction: { available: true, understeerGradient: { value: 2.1 }, predictedTendency: { value: 'understeer' }, rollGradient: { value: 1.3 } },
  telemetryObservation: { available: true, warnings: ['short_window'], confounders: ['tyre_state'], limitations: ['directional_only'] },
  measuredMetrics: { available: false, dataProvenance: 'unverified', limitations: ['no_calibration'] },
  modelVsActual: { available: true, confidence: 'low', assumptions: ['same_runner'], blockedReasons: [{ code: 'X' }] },
  quantitativeRecommendation: { available: true, sideEffects: [{ metric: 'roll', delta: 1 }] },
  trackIntelligence: { available: true, dataProvenance: 'unverified', cannotConclude: ['cause'], corners: [{ idx: 1, entry: { sufficient: true }, mid: {}, exit: {} }, { idx: 2, entry: {}, mid: {}, exit: {} }], limitations: ['driver_behaviour_not_a_corner_or_setup_finding'] },
  raceEngineer: { available: true },
  driverCoach: { available: false },
  evidenceDrawer: { allBlockedReasons: [{ layer: 'comparison', code: 'OBS_INCONCLUSIVE' }], allWarnings: ['w1'], credibilityLegend: ['Physics', 'Model'] },
};
const SHELL_EVIDENCE = { capability: { modelRan: true, telemetryObservable: true, measuredKUsEligible: false }, observation: { blockedReasons: [{ code: 'WINDOW' }] }, source: 'demo_case' };

(async () => {
  const store = CSt.createCaseStore(SB.MemoryBackend(), { stamp: '2026-06-22T00:00:00Z' });

  // SAVE the full VM
  const saved = await store.save({ metadata: { title: 'demo_case_001', vehicle: 'demo_f3', status: 'complete' }, setupSnapshot: { frontWheelRate: 240, mass: 565 }, analysisResults: VM, shellEvidence: SHELL_EVIDENCE });
  chk('save full VM ok', saved.ok === true);

  // REOPEN — identical (the real VM with warnings/sideEffects/cannotConclude/corners/credibilityLegend survives)
  const o = await store.open(saved.caseId);
  chk('reopen ok + local_full', o.ok && o.recordType === 'local_full' && o.degraded === false);
  let identical = true; try { assert.deepStrictEqual(o.analysisResults, VM); } catch (e) { identical = false; }
  chk('reopened analysisResults DEEP-EQUAL the saved VM (identical reopen)', identical);
  chk('shellEvidence (incl observation.blockedReasons) preserved', o.shellEvidence.observation.blockedReasons[0].code === 'WINDOW' && o.shellEvidence.source === 'demo_case');

  // EXPORT → portable bundle carries NO raw arrays / NO unlisted VM fields (credibilityLegend etc not in bundle)
  const exp = await store.exportCase(saved.caseId);
  chk('export ok', exp.ok === true);
  const json = JSON.stringify(exp.bundle);
  chk('bundle excludes unlisted VM fields', json.indexOf('credibilityLegend') === -1 && json.indexOf('cannotConclude') === -1 && json.indexOf('allWarnings') === -1);
  chk('bundle carries curated scalars', exp.bundle.resultsSummary.understeerGradient === 2.1 && exp.bundle.resultsSummary.provenance === 'unverified');
  chk('bundle carries capability flags', exp.bundle.shellEvidenceSummary.capability.modelRan === true);

  // IMPORT → imported_summary (degraded, never promoted to local_full)
  const imp = await store.importBundle(exp.bundle);
  chk('import ok, new id', imp.ok && imp.caseId !== saved.caseId);
  const io = await store.open(imp.caseId);
  chk('imported is degraded imported_summary', io.recordType === 'imported_summary' && io.degraded === true);
  chk('imported carries curated result, not full VM', io.analysisResults.modelPrediction.understeerGradient.value === 2.1 && io.analysisResults.evidenceDrawer === undefined);

  // FUTURE-version bundle → rejected fail-closed
  const future = JSON.parse(JSON.stringify(exp.bundle)); future.meta.schemaVersion = 999;
  chk('future-version bundle rejected on import', (await store.importBundle(future)).ok === false);

  // LIBRARY view model reflects stored evidence (capability indicators), not a re-derivation
  const rows = await store.list();
  const view = LVM.buildCaseLibraryView(rows, {});
  chk('library lists both cases', view.counts.total === 2);
  const local = view.rows.find(r => r.recordType === 'local_full');
  chk('local indicator = measured? uncalibrated (from stored capability)', local && local.indicators.measured === 'uncalibrated');

  // raw telemetry session stays in the SEPARATE session store, never in a case bundle
  const sess = SS.createSessionStore(SB.MemoryBackend(), { stamp: 'x' });
  const sp = await sess.put({ summary: { rows: 2000 }, raw: { speed: new Array(400).fill(50) } });
  chk('session stored with raw arrays (its purpose)', sp.ok && (await sess.get(sp.sessionId)).session.raw.speed.length === 400);
  chk('a case bundle never references that raw session payload', json.indexOf('"raw"') === -1 && json.indexOf('"speed"') === -1);

  console.log(`r3.0b-persistence-integration: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
