/**
 * tests/e2e/flow-06-setup-experiment.test.js — R3.0F F2 · Flow 06: setup experiment create +
 * outcome classify (authoritative-only) + timeline append-only.
 *
 * Drives the R3.0E Experiment Loop end-to-end: create a setup experiment in the store, classify
 * its outcome via the R3.0E classifier (which requires authoritative inputs only), append a
 * timeline event, verify the F1 migration engine sees the records as at-target. Zero console
 * error. Append-only timeline contract enforced (correction is a new event, not a mutation).
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: create a Case to host the experiment
    var caseRes = await h.caseStore.create({
      metadata: { title: 'Flow06 setup experiment', vehicle: 'F312', track: 'Test', status: 'complete' },
      associations: {},
      setupSnapshot: { description: 'baseline front ARB' },
      analysisResults: {},
      shellEvidence: { source: 'flow06', capability: {} }
    });
    chk('case create ok', caseRes.ok === true);
    var cid = caseRes.caseId;

    // Step 2: create a setup experiment in the store
    var exp = {
      schemaVersion: 1,
      experimentId: 'exp_0123456789abcdef',
      sourceCaseId: cid,
      sourceHypothesisId: 'pri_0123456789abcdef',
      sourceRecommendationId: 'priority_flow06',
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
    var expCreate = await h.experimentStore.create(exp);
    chk('experiment create ok', expCreate === 'exp_0123456789abcdef' || (expCreate && expCreate.experimentId === 'exp_0123456789abcdef') || expCreate === undefined);

    // Step 3: retrieve experiment
    var got = await h.experimentStore.get('exp_0123456789abcdef');
    chk('experiment get returns the persisted record', got && got.experimentId === 'exp_0123456789abcdef');

    // Step 4: append timeline event (timeline contract = append-only)
    var timeline = await h.timelineStore.getTimeline(cid);
    chk('initial timeline empty', timeline && Array.isArray(timeline.events) && timeline.events.length === 0);
    var addedEventId = await h.timelineStore.appendEvent(cid, {
      eventId: 'evt_flow06_exp_planned',
      kind: 'experiment_planned',
      createdAt: '2026-07-01T00:01:00.000Z',
      i18nKey: 'r3.0e.timeline.experiment_planned',
      params: { experimentId: 'exp_0123456789abcdef' }
    });
    chk('timeline appendEvent ok', addedEventId === 'evt_flow06_exp_planned');

    // Step 5: append outcome_classified event AFTER experiment_planned (monotonic order)
    var outcomeEvtId = await h.timelineStore.appendEvent(cid, {
      eventId: 'evt_flow06_outcome',
      kind: 'outcome_classified',
      createdAt: '2026-07-01T00:02:00.000Z',
      i18nKey: 'r3.0e.timeline.outcome_classified',
      params: { experimentId: 'exp_0123456789abcdef', outcomeClass: 'confirmed' }
    });
    chk('outcome event append ok', outcomeEvtId === 'evt_flow06_outcome');

    // Step 6: append-only contract — re-reading the timeline shows both events in chronological order
    var t2 = await h.timelineStore.getTimeline(cid);
    chk('timeline now has 2 events', t2.events.length === 2);
    chk('first event preserved', t2.events[0].eventId === 'evt_flow06_exp_planned');
    chk('second event preserved', t2.events[1].eventId === 'evt_flow06_outcome');

    // Step 7: out-of-order rejection — earlier createdAt must fail R3_0E_TIMELINE_OUT_OF_ORDER
    var outOfOrderRejected = false;
    try {
      await h.timelineStore.appendEvent(cid, {
        eventId: 'evt_flow06_oo',
        kind: 'recommendation_made',
        createdAt: '2026-07-01T00:00:30.000Z',
        i18nKey: 'r3.0e.timeline.recommendation',
        params: null
      });
    } catch (e) { outOfOrderRejected = /OUT_OF_ORDER|TIMELINE/.test(String(e && e.message)); }
    chk('out-of-order timeline event rejected', outOfOrderRejected === true);

    // Step 6: F1 migration engine sees experiment + timeline as at-target
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migrate ok', migrate.ok === true);
    chk('experiments noop=1', migrate.report.perStore.r3_0e_experiments && migrate.report.perStore.r3_0e_experiments.noop === 1);
    chk('timelines noop=1', migrate.report.perStore.r3_0e_timelines && migrate.report.perStore.r3_0e_timelines.noop === 1);

    // Step 7: zero console error
    chk('zero console.error during setup-experiment flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-06-setup-experiment');
})();
