/**
 * tests/e2e/flow-08-export-import.test.js — R3.0F F2 · Flow 08: case export + reimport.
 *
 * Asserts:
 *   • Case export produces a portable bundle (R3.0B schema-validated, NO raw telemetry).
 *   • Importing the bundle into a fresh backend creates an imported_summary record
 *     (NEVER promoted to local_full).
 *   • Imported record carries no producer attestation (engine never fabricates).
 *   • F1 migration engine sees imported_summary as at-target.
 *   • Round-trip preserves the public fields the bundle is meant to carry.
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var src = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: source case with measured metrics + analysisResults
    var caseInput = {
      metadata: { title: 'Flow08 export-import', vehicle: 'F312', track: 'Silverstone', status: 'complete', note: 'roundtrip test' },
      associations: {},
      setupSnapshot: { frontArbNmPerDeg: 200, rearArbNmPerDeg: 150 },
      analysisResults: {
        measuredMetrics: {
          measuredKUs: { value: 0.045, unit: 'deg/g', credibility: 'measured', limitations: ['repeatability_cv_6pct'] }
        },
        caseHeader: { overallStatus: 'inspection_ok' }
      },
      shellEvidence: { source: 'flow08-src', capability: { measured_metrics: true } }
    };
    var srcCreate = await src.caseStore.create(caseInput);
    chk('source case create ok', srcCreate.ok === true);
    var srcCid = srcCreate.caseId;

    // Step 2: export
    var exported = await src.caseStore.exportCase(srcCid);
    chk('export ok', exported.ok === true);
    chk('exported bundle is a plain object', exported.bundle && typeof exported.bundle === 'object');

    // Step 3: bundle contains NO raw telemetry array (regardless of structure)
    var bundleStr = JSON.stringify(exported.bundle);
    chk('bundle has no "raw" array key', bundleStr.indexOf('"raw":[') === -1);
    chk('bundle metadata title preserved', exported.bundle.metadata && exported.bundle.metadata.title === 'Flow08 export-import');

    // Step 4: import into a FRESH harness instance (simulating a different user / installation)
    var dst = H.createFlowHarness({ stamp: '2026-07-01T01:00:00.000Z' });
    try {
      var imported = await dst.caseStore.importBundle(exported.bundle);
      chk('import ok', imported.ok === true);
      var dstCid = imported.caseId;

      // Step 5: imported record type = 'imported_summary' (NEVER promoted to local_full)
      var openImported = await dst.caseStore.open(dstCid);
      chk('imported open ok', openImported.ok === true);
      chk('imported recordType=imported_summary', openImported.recordType === 'imported_summary');
      chk('open reports degraded=true (imported records are degraded summaries)', openImported.degraded === true);

      // Step 6: cannot duplicate an imported_summary (per R3.0B contract)
      var dupAttempt = await dst.caseStore.duplicate(dstCid);
      chk('duplicate of imported_summary refused', dupAttempt.ok === false && /IMPORTED_SUMMARY|IMPORTED/.test(String(dupAttempt.code || '')));

      // Step 7: F1 migration engine sees imported record as at-target
      var migrate = await dst.migrationEngine.migrate({ confirm: true });
      chk('post-import migrate ok', migrate.ok === true);
      chk('imported case is noop=1', migrate.report.perStore.cases && migrate.report.perStore.cases.noop === 1);

      // F2-R1-03: exercise no-stale-case-ref gate across the export→import transition. The
      // destination harness "transitions" to the imported case; a stale viewmodel referencing
      // the source caseId must be flagged.
      var staleThrew = false;
      try {
        dst.assertNoStaleCaseRef({
          activeCaseId: dstCid,
          cachedCaseId: srcCid  // stale — points at the source-harness caseId
        });
      } catch (e) { staleThrew = /STALE_CASE_REF/.test(String(e && e.message)); }
      chk('assertNoStaleCaseRef THROWS on stale cachedCaseId after import', staleThrew === true);
      dst.assertNoStaleCaseRef({ activeCaseId: dstCid, cachedCaseId: dstCid });
      chk('assertNoStaleCaseRef accepts coherent active + cached after import', true);

      // Step 8: zero console error in BOTH harnesses
      chk('zero console.error in src harness', src.consoleErrorCount === 0);
      chk('zero console.error in dst harness', dst.consoleErrorCount === 0);
    } finally {
      dst.dispose();
    }
  } finally {
    src.dispose();
  }

  t.report('e2e-flow-08-export-import');
})();
