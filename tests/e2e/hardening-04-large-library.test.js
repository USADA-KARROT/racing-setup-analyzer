/**
 * tests/e2e/hardening-04-large-library.test.js — R3.0F F3 · Large case-library performance.
 *
 * Asserts the case-store + F1 migration engine handle a large library and scale BOUNDED-LINEAR.
 * Per F3 quality bar "large library".
 *
 * F3-R1-04 closure: use an instrumented backend that COUNTS list/get/transact operations,
 * then run the migration at N and 2N. Assert operation counts grow no faster than linear
 * with N (allowing a small constant overhead). A quadratic regression would inflate the
 * ratio above the linear bound and trip the assertion.
 *
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var SB = require('../../renderer/js/storage-backend.js');
var CS = require('../../renderer/js/case-store.js');
var ENG = require('../../renderer/js/r3-0f-migration-engine.js');
var t = H.makeChk();
var chk = t.chk;

function instrument(realBackend) {
  var counts = { list: 0, get: 0, put: 0, transact: 0 };
  return {
    counts: counts,
    list: function (storeKey) { counts.list++; return realBackend.list(storeKey); },
    get: function (storeKey, key) { counts.get++; return realBackend.get(storeKey, key); },
    put: function (storeKey, key, value) { counts.put++; return realBackend.put(storeKey, key, value); },
    transact: function (spec) { counts.transact++; return realBackend.transact(spec); }
  };
}

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // ---- (1) Fixed-size correctness (N=200) ----
    var N = 200;
    var seeded = 0;
    for (var i = 0; i < N; i++) {
      var r = await h.caseStore.create({
        metadata: { title: 'F3 large library case ' + i, vehicle: 'F312', track: 'TestTrack', status: 'complete' },
        associations: {},
        setupSnapshot: { springRateFrontNmPerMm: 80 + (i % 20), springRateRearNmPerMm: 70 + (i % 15) },
        analysisResults: {},
        shellEvidence: { source: 'flow-large', capability: {} }
      });
      if (r.ok) seeded++;
    }
    chk('seeded ' + N + ' cases', seeded === N);

    var list = await h.caseStore.list();
    chk('case-store list returns N=' + N + ' entries', list.length === N);

    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migration ok on large library', migrate.ok === true);
    chk('all cases at target (noop)', migrate.report.perStore.cases.noop === N);
    chk('zero migration rejections', migrate.report.perStore.cases.rejected === 0);
    chk('zero migration failures', migrate.report.perStore.cases.failed === 0);

    var det = await h.migrationEngine.detect();
    chk('detect.cases.records=N', det.perStoreStatus.cases.records === N);

    // ---- (2) F3-R1-04 — N-doubling bounded-linear scaling check ----
    var N1 = 50;
    var N2 = 100;

    async function _runAt(n) {
      var raw = SB.MemoryBackend();
      var ib = instrument(raw);
      var cs = CS.createCaseStore(raw, { stamp: '2026-07-01T00:00:00.000Z' });
      for (var k = 0; k < n; k++) {
        await cs.create({ metadata: { title: 'scale-' + k, status: 'complete' }, associations: {}, setupSnapshot: {}, analysisResults: {}, shellEvidence: { source: 's' } });
      }
      // Reset counts AFTER seeding — only measure the migration cost
      ib.counts.list = 0; ib.counts.get = 0; ib.counts.put = 0; ib.counts.transact = 0;
      var eng = ENG.createMigrationEngine({ backend: ib, stamp: '2026-07-01T00:00:00.000Z' });
      var res = await eng.migrate({ confirm: true });
      return { ok: res.ok, counts: { list: ib.counts.list, get: ib.counts.get, put: ib.counts.put, transact: ib.counts.transact } };
    }

    var run1 = await _runAt(N1);
    var run2 = await _runAt(N2);
    chk('migration ok at N1=' + N1, run1.ok === true);
    chk('migration ok at N2=' + N2, run2.ok === true);

    // Bounded-linear: doubling N should multiply each op-count by at most ~3 (linear bound + fixed overhead).
    // A quadratic engine would multiply by ~4. We use 3 as the linear bound.
    var LINEAR_BOUND = 3;
    function ratio(a, b) { return a === 0 ? (b === 0 ? 1 : Infinity) : b / a; }
    var rList = ratio(run1.counts.list, run2.counts.list);
    var rGet = ratio(run1.counts.get, run2.counts.get);
    var rTransact = ratio(run1.counts.transact, run2.counts.transact);
    chk('list ops bounded-linear (ratio ≤ ' + LINEAR_BOUND + '): ' + rList.toFixed(2), rList <= LINEAR_BOUND, { run1: run1.counts.list, run2: run2.counts.list, ratio: rList });
    chk('get ops bounded-linear (ratio ≤ ' + LINEAR_BOUND + '): ' + rGet.toFixed(2), rGet <= LINEAR_BOUND, { run1: run1.counts.get, run2: run2.counts.get, ratio: rGet });
    chk('transact ops bounded-linear (ratio ≤ ' + LINEAR_BOUND + '): ' + rTransact.toFixed(2), rTransact <= LINEAR_BOUND, { run1: run1.counts.transact, run2: run2.counts.transact, ratio: rTransact });

    // ---- (3) Console-error guard ----
    chk('zero console.error during large-library hardening', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-hardening-04-large-library');
})();
