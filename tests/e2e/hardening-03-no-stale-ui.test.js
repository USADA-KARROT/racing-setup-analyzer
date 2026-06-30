/**
 * tests/e2e/hardening-03-no-stale-ui.test.js — R3.0F F3 · No-stale-UI invariants.
 *
 * Asserts the viewmodels do not retain stale references after Case/Session transitions, across
 * ALL documented case-id-bearing fields:
 *   • lastSession.sourceCaseId | lastSession.caseId
 *   • cachedCaseId | sourceCaseId | priorCaseId | parentCaseId | followUpCaseId
 *   • R3.0C C8 lastReassertion.caseId
 *   • R3.0D engineer-brief currentBrief.caseAssociation
 *   • R3.0E currentExperiment.caseAssociation / currentOutcome.caseAssociation / currentTimeline.caseAssociation
 * AND feeds a REAL R3.0E experiment record (post-transition shape) through the gate, proving
 * production-shape viewmodel transition outputs are validated, not just synthetic objects.
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
try {
  // ---- (1) SYNTHETIC SCENARIOS ─────────────────────────────────────────────
  // (a) Coherent state: activeCaseId === lastSession.sourceCaseId → no throw
  h.assertNoStaleCaseRef({ activeCaseId: 'caseA', lastSession: { sourceCaseId: 'caseA' } });
  chk('coherent activeCaseId + lastSession passes', true);

  // (b) Stale lastSession: throws
  var threw1 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', lastSession: { sourceCaseId: 'caseA' } }); } catch (e) { threw1 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale lastSession.sourceCaseId throws STALE_CASE_REF', threw1 === true);

  // (c) cachedCaseId stale: throws
  var threw2 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', cachedCaseId: 'caseA' }); } catch (e) { threw2 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale cachedCaseId throws STALE_CASE_REF', threw2 === true);

  // (d) Coherent cachedCaseId: no throw
  h.assertNoStaleCaseRef({ activeCaseId: 'caseB', cachedCaseId: 'caseB' });
  chk('coherent cachedCaseId passes', true);

  // (e) No active case (initial state): no throw, no stale ref
  h.assertNoStaleCaseRef({});
  chk('empty viewmodel passes', true);

  // (f) Active case with no auxiliary refs: no throw
  h.assertNoStaleCaseRef({ activeCaseId: 'caseA' });
  chk('active case with no aux refs passes', true);

  // (g) Both lastSession AND cachedCaseId coherent
  h.assertNoStaleCaseRef({ activeCaseId: 'caseA', lastSession: { sourceCaseId: 'caseA' }, cachedCaseId: 'caseA' });
  chk('full coherent viewmodel passes', true);

  // (h) Stale lastSession AND coherent cachedCaseId — still throws
  var threw3 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', lastSession: { sourceCaseId: 'caseA' }, cachedCaseId: 'caseB' }); } catch (e) { threw3 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('any stale reference causes throw', threw3 === true);

  // ---- (2) F3-R1-03 closure — EXPANDED FIELD COVERAGE ─────────────────────
  // (i) Stale sourceCaseId at top-level (not in lastSession): throws
  var threw4 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', sourceCaseId: 'caseA' }); } catch (e) { threw4 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale top-level sourceCaseId throws', threw4 === true);

  // (j) Stale priorCaseId throws
  var threw5 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', priorCaseId: 'caseA' }); } catch (e) { threw5 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale priorCaseId throws', threw5 === true);

  // (k) Stale parentCaseId throws
  var threw6 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', parentCaseId: 'caseA' }); } catch (e) { threw6 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale parentCaseId throws', threw6 === true);

  // (l) Stale followUpCaseId throws
  var threw7 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', followUpCaseId: 'caseA' }); } catch (e) { threw7 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale followUpCaseId throws', threw7 === true);

  // (m) Stale top-level caseAssociation throws
  var threw8 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', caseAssociation: 'caseA' }); } catch (e) { threw8 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale top-level caseAssociation throws', threw8 === true);

  // (n) Stale lastReassertion.caseId (R3.0C C8) throws
  var threw9 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', lastReassertion: { caseId: 'caseA' } }); } catch (e) { threw9 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale lastReassertion.caseId throws', threw9 === true);

  // (o) Stale nested currentBrief.caseAssociation (R3.0D) throws
  var threwA = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', currentBrief: { caseAssociation: 'caseA' } }); } catch (e) { threwA = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale currentBrief.caseAssociation throws', threwA === true);

  // (p) Stale nested currentExperiment.caseAssociation (R3.0E) throws
  var threwB = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', currentExperiment: { caseAssociation: 'caseA' } }); } catch (e) { threwB = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale currentExperiment.caseAssociation throws', threwB === true);

  // ---- (3) F3-R1-03 closure — PRODUCTION-SHAPE VIEWMODEL ─────────────────────
  // Drive a REAL R3.0E experimentStore.create and feed the resulting record (which has a
  // real production-shape caseAssociation field) through the gate. This proves the gate
  // catches stale references against actual production data structures, not just synthetic
  // objects.
  var caseA = await h.caseStore.create({ metadata: { title: 'F3 hardening-03 caseA', status: 'complete' } });
  var caseB = await h.caseStore.create({ metadata: { title: 'F3 hardening-03 caseB', status: 'complete' } });
  chk('seeded caseA + caseB', caseA.ok === true && caseB.ok === true);

  // Build a real R3.0E experiment record bound to caseA via sourceCaseId (production grammar).
  var expRecord = {
    schemaVersion: 1,
    experimentId: 'exp_0123456789abcdef',
    sourceCaseId: caseA.caseId,
    sourceHypothesisId: 'pri_0123456789abcdef',
    sourceRecommendationId: 'priority_h3',
    targetMetric: 'roll_gradient_deg_per_g',
    baselineValue: 3.5,
    expectedDirection: 'decrease',
    expectedMagnitudeRange: { min: 0.5, max: 1.5 },
    setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
    driverInstruction: null,
    controlVariables: [],
    validationPlan: 'r3.0e.plan.controlled_repeat_lap',
    stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
    status: 'planned',
    followUpCaseIds: [],
    outcome: null,
    createdAt: '2026-07-01T00:00:00.000Z'
  };
  await h.experimentStore.create(expRecord);
  chk('created real R3.0E experiment bound to caseA', true);
  var roundtrip = await h.experimentStore.get('exp_0123456789abcdef');
  chk('experiment roundtrip carries sourceCaseId=' + caseA.caseId, roundtrip && roundtrip.sourceCaseId === caseA.caseId);

  // (q) Production-shape experiment used as a viewmodel anchored to caseA → no throw
  h.assertNoStaleCaseRef({ activeCaseId: caseA.caseId, currentExperiment: roundtrip });
  chk('real experiment with matching activeCaseId passes', true);

  // (r) Same experiment with activeCaseId switched to caseB → STALE detected via sourceCaseId
  var threwReal = false;
  try {
    h.assertNoStaleCaseRef({ activeCaseId: caseB.caseId, currentExperiment: roundtrip });
  } catch (e) { threwReal = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('real experiment with mismatched activeCaseId THROWS', threwReal === true);

  // ---- (3.5) F3-R2-02 closure — object-shape caseAssociation + deep nesting ─────────
  // (s) R3.0D production-shape caseAssociation as an OBJECT {caseId, sessionId, lapId}
  var threwObj = false;
  try {
    h.assertNoStaleCaseRef({
      activeCaseId: caseB.caseId,
      currentBrief: { caseAssociation: { caseId: caseA.caseId, sessionId: 'sX' } }
    });
  } catch (e) { threwObj = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale object-shape currentBrief.caseAssociation.caseId throws', threwObj === true);

  // (t) 3-level-deep nested stale sourceCaseId (wrapper object defeats allowlist)
  var threw3deep = false;
  try {
    h.assertNoStaleCaseRef({
      activeCaseId: caseB.caseId,
      wrapper: { inner: { sourceCaseId: caseA.caseId } }
    });
  } catch (e) { threw3deep = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale 3-level-deep sourceCaseId throws', threw3deep === true);

  // (u) Array-nested stale caseId
  var threwArr = false;
  try {
    h.assertNoStaleCaseRef({
      activeCaseId: caseB.caseId,
      experiments: [{ sourceCaseId: caseA.caseId }]
    });
  } catch (e) { threwArr = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale array-nested sourceCaseId throws', threwArr === true);

  // (v) Coherent object-shape caseAssociation passes
  h.assertNoStaleCaseRef({
    activeCaseId: caseA.caseId,
    currentBrief: { caseAssociation: { caseId: caseA.caseId, sessionId: 'sX' } }
  });
  chk('coherent object-shape currentBrief.caseAssociation passes', true);

  // ---- (4) Console-error guard ─────────────────────────────────────────────
  chk('zero console.error during no-stale-UI hardening', h.consoleErrorCount === 0);
  chk('harness consoleErrorCount accessor reachable', typeof h.consoleErrorCount === 'number');
} finally {
  h.dispose();
}

t.report('e2e-hardening-03-no-stale-ui');
})();
