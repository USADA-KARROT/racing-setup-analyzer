/**
 * tests/e2e/flow-03-measured.test.js — R3.0F F2 · Flow 03: measured-metrics flow.
 *
 * Asserts that a Case with measured-metric data (e.g., K_us measured) preserves the credibility
 * rung exactly = "measured" through storage roundtrip and migration. NO credibility upgrade.
 * NO warning/qualifier merged into the rung — qualifiers go in limitations[]. Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: create a Case carrying measured-metric data with a limitations[] entry (not in rung)
    var caseInput = {
      metadata: { title: 'Flow03 measured K_us', vehicle: 'F312', track: 'Calibration test', status: 'complete' },
      associations: {},
      setupSnapshot: {},
      analysisResults: {
        measuredMetrics: {
          measuredKUs: { value: 0.045, unit: 'deg/g', credibility: 'measured', limitations: ['repeatability_cv_6pct'] }
        }
      },
      shellEvidence: { source: 'flow03-fixture', capability: { measured_metrics: true } }
    };
    var createRes = await h.caseStore.create(caseInput);
    chk('case create ok', createRes.ok === true);
    var cid = createRes.caseId;

    // Step 2: open + verify credibility rung preserved EXACTLY
    var openRes = await h.caseStore.open(cid);
    chk('case open ok', openRes.ok === true);
    var measured = openRes.analysisResults && openRes.analysisResults.measuredMetrics && openRes.analysisResults.measuredMetrics.measuredKUs;
    chk('measured value preserved', measured && measured.value === 0.045);
    chk('credibility rung preserved exactly as "measured"', measured && measured.credibility === 'measured');
    chk('credibility is NOT upgraded (no "measured_with_warning" or similar)', measured.credibility === 'measured');

    // Step 3: limitations preserved (qualifier in limitations[], NOT in rung)
    chk('limitations array preserved', Array.isArray(measured.limitations) && measured.limitations.length === 1);
    chk('limitation string preserved', measured.limitations[0] === 'repeatability_cv_6pct');

    // Step 4: rung MUST be one of measured/derived/heuristic/synthetic (closed enum)
    var validRungs = ['measured', 'derived', 'heuristic', 'synthetic'];
    chk('credibility is in closed enum', validRungs.indexOf(measured.credibility) !== -1);

    // Step 5: migration engine treats this case as at-target (no migration)
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migrate ok', migrate.ok === true);
    chk('cases.noop=1', migrate.report.perStore.cases && migrate.report.perStore.cases.noop === 1);
    chk('zero migrated/rejected/failed', migrate.report.perStore.cases.migrated === 0 && migrate.report.perStore.cases.rejected === 0 && migrate.report.perStore.cases.failed === 0);

    // Step 6: re-open after migration — credibility rung still EXACTLY measured
    var reopen = await h.caseStore.open(cid);
    chk('post-migration open ok', reopen.ok === true);
    var m2 = reopen.analysisResults.measuredMetrics.measuredKUs;
    chk('post-migration credibility unchanged', m2.credibility === 'measured');
    chk('post-migration limitations unchanged', m2.limitations[0] === 'repeatability_cv_6pct');

    // Step 7: zero console error
    chk('zero console.error events during measured flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-03-measured');
})();
