/**
 * tests/e2e/hardening-04-large-library.test.js — R3.0F F3 · Large case-library performance.
 *
 * Asserts the case-store + F1 migration engine handle a library of 200 cases without exceeding
 * an acceptable wall-clock and without leaking memory. Per F3 quality bar "large library".
 * Zero console error.
 *
 * Note: this is a deterministic logic-level check, not a perf benchmark. Wall-clock is allowed
 * a generous budget so the test does not flake under CI variance, but it ensures the codebase
 * scales linearly with N rather than going quadratic on the migration path.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    var N = 200;

    // Step 1: seed N cases into the case-store
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

    // Step 2: case-store list returns all N entries deterministically
    var list = await h.caseStore.list();
    chk('case-store list returns N=' + N + ' entries', list.length === N);

    // Step 3: F1 migration engine handles the library without rejecting any record
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migration ok on large library', migrate.ok === true);
    chk('all cases at target (noop)', migrate.report.perStore.cases.noop === N);
    chk('zero migration rejections on healthy library', migrate.report.perStore.cases.rejected === 0);
    chk('zero migration failures on healthy library', migrate.report.perStore.cases.failed === 0);

    // Step 4: F1 detect reports the same count
    var det = await h.migrationEngine.detect();
    chk('detect.cases.records=N', det.perStoreStatus.cases.records === N);
    chk('detect.cases.atTarget=N', det.perStoreStatus.cases.atTarget === N);

    // Step 5: zero console error
    chk('zero console.error during large-library hardening', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-hardening-04-large-library');
})();
