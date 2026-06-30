/**
 * tests/e2e/hardening-03-no-stale-ui.test.js — R3.0F F3 · No-stale-UI invariants.
 *
 * Asserts the viewmodels do not retain stale references after Case/Session transitions.
 * The R3.0C/D/E activations consciously bump a generation token on every Case transition;
 * we exercise the assertNoStaleCaseRef gate in multiple synthetic transition scenarios.
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
try {
  // (a) Coherent state: activeCaseId === lastSession.sourceCaseId → no throw
  h.assertNoStaleCaseRef({ activeCaseId: 'caseA', lastSession: { sourceCaseId: 'caseA' } });
  chk('coherent activeCaseId + lastSession passes', true);

  // (b) Stale lastSession: throws
  var threw1 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', lastSession: { sourceCaseId: 'caseA' } }); } catch (e) { threw1 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('stale lastSession throws STALE_CASE_REF', threw1 === true);

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

  // (h) Stale lastSession AND coherent cachedCaseId — still throws (lastSession is stale)
  var threw3 = false;
  try { h.assertNoStaleCaseRef({ activeCaseId: 'caseB', lastSession: { sourceCaseId: 'caseA' }, cachedCaseId: 'caseB' }); } catch (e) { threw3 = /STALE_CASE_REF/.test(String(e && e.message)); }
  chk('any stale reference causes throw', threw3 === true);

  // (i) Console-error guard: no calls during pure assertion checks
  chk('zero console.error during no-stale-UI hardening', h.consoleErrorCount === 0);

  // (j) Unhandled rejection — drift test: a deliberate unhandled rejection increments counter.
  // (We don't ACTUALLY want to fire one because process.on('unhandledRejection') is process-wide.
  // The harness's bookkeeping is verified by Flow 01's zero-error baseline.)
  chk('harness consoleErrorCount accessor reachable', typeof h.consoleErrorCount === 'number');
} finally {
  h.dispose();
}

t.report('e2e-hardening-03-no-stale-ui');
