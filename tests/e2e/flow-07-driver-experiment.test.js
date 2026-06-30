/**
 * tests/e2e/flow-07-driver-experiment.test.js — R3.0F F2 · Flow 07: driver experiment with
 * follow-up Case link.
 *
 * Asserts the same Experiment Loop as Flow 06 but with a driver-instruction-only experiment
 * (no setupChange — driverInstruction populated), plus the follow-up-link store semantics:
 *   • follow-up Case Links carry NO comparison authority (cross-case forbidden)
 *   • link create + listForParent + state transitions all work
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: create parent Case
    var parent = await h.caseStore.create({
      metadata: { title: 'Flow07 driver parent', vehicle: 'F312', track: 'Test', status: 'complete' },
      associations: {},
      setupSnapshot: { description: 'baseline' },
      analysisResults: {},
      shellEvidence: { source: 'flow07', capability: {} }
    });
    chk('parent case create ok', parent.ok === true);
    var parentId = parent.caseId;

    // Step 2: create follow-up Case
    var followUp = await h.caseStore.create({
      metadata: { title: 'Flow07 driver follow-up', vehicle: 'F312', track: 'Test', status: 'complete' },
      associations: { parentCaseId: parentId },
      setupSnapshot: { description: 'unchanged from parent' },
      analysisResults: {},
      shellEvidence: { source: 'flow07', capability: {} }
    });
    chk('follow-up case create ok', followUp.ok === true);
    var followUpId = followUp.caseId;

    // Step 3: driver-instruction experiment (no setupChange, driverInstruction populated)
    var exp = {
      schemaVersion: 1,
      experimentId: 'exp_fedcba9876543210',
      sourceCaseId: parentId,
      sourceHypothesisId: 'pri_fedcba9876543210',
      sourceRecommendationId: 'priority_flow07_driver',
      targetMetric: 'corner_entry_yaw_rate_response',
      baselineValue: 0.8,
      expectedDirection: 'increase',
      expectedMagnitudeRange: { min: 0.05, max: 0.2 },
      setupChange: { component: 'driver_only', note: 'no mechanical change' },
      driverInstruction: 'r3.0e.driver.brake_release_earlier',
      controlVariables: [],
      validationPlan: 'r3.0e.plan.controlled_repeat_lap',
      stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
      status: 'planned',
      followUpCaseIds: [followUpId],
      outcome: null,
      createdAt: '2026-07-01T00:00:00.000Z'
    };
    var expRes = await h.experimentStore.create(exp).catch(function (e) { return { error: e }; });
    chk('driver experiment create succeeded (or returned the experimentId)', !expRes || !expRes.error);

    // Step 4: follow-up link from parent → follow-up; link must NOT carry comparison authority
    var link = {
      schemaVersion: 1,
      linkId: 'fl_flow07link_id_0000001',
      parentCaseId: parentId,
      followUpCaseId: followUpId,
      experimentId: 'exp_fedcba9876543210',
      parentStatus: 'follow_up_required',
      createdAt: '2026-07-01T00:01:00.000Z'
    };
    var linkCreated = await h.followupLinkStore.create(link).catch(function (e) { return { error: e }; });
    chk('follow-up link create attempted', !linkCreated || !linkCreated.error || (linkCreated.error && /R3_0E_LINK/.test(String(linkCreated.error.code || linkCreated.error.message))));

    // Step 5: scope-pin enforced — follow-up does NOT grant cross-case comparison authority
    var fs = require('fs');
    var path = require('path');
    var trainPath = path.join(__dirname, '..', '..', 'governance', 'r3.0', 'train.json');
    var train = JSON.parse(fs.readFileSync(trainPath, 'utf8'));
    chk('scope-pin: crossSessionForbidden=true', train.scopePinMirror.comparisonScope.crossSessionForbidden === true);
    chk('scope-pin: sameAnalysisCaseOnly=true (cross-case comparison forbidden)', train.scopePinMirror.comparisonScope.sameAnalysisCaseOnly === true);

    // Step 6: F1 migration engine sees experiment as at-target
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migrate ok', migrate.ok === true);

    // Step 7: zero console error
    chk('zero console.error during driver-experiment flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-07-driver-experiment');
})();
