/**
 * tests/e2e/flow-02-real-telemetry.test.js — R3.0F F2 · Flow 02: real telemetry import.
 *
 * Asserts a CSV-import-style telemetry session lands deterministically into sessionStore,
 * F1 migration engine treats the session as at-target (no migration needed), and the
 * session is retrievable. Zero console error. No raw telemetry leakage into a case bundle.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: create a deterministic telemetry session (raw samples kept ONLY in sessionStore)
    var samples = [];
    for (var i = 0; i < 50; i++) samples.push({ t: i * 0.1, ay: 0.0, vx: 30 + i * 0.5 });
    var putRes = await h.sessionStore.put({
      summary: { source: 'flow02-fixture', channels: ['t', 'ay', 'vx'], sampleCount: samples.length, durationSec: 5.0 },
      raw: samples
    });
    chk('session put ok', putRes.ok === true);
    chk('session id returned', typeof putRes.sessionId === 'string' && putRes.sessionId.length > 0);
    var sid = putRes.sessionId;

    // Step 2: session is retrievable + has the right shape
    var getRes = await h.sessionStore.get(sid);
    chk('session get ok', getRes.ok === true);
    chk('session schemaVersion=1', getRes.session.schemaVersion === 1);
    chk('session raw samples preserved', Array.isArray(getRes.session.raw) && getRes.session.raw.length === 50);
    chk('session summary.source preserved', getRes.session.summary.source === 'flow02-fixture');

    // Step 3: session also visible in list
    var list = await h.sessionStore.list();
    chk('sessionStore.list contains the new session', list.some(function (e) { return e.sessionId === sid; }));

    // Step 4: F1 migration engine — session is at target, no migration
    var det = await h.migrationEngine.detect();
    var sessionsStatus = det.perStoreStatus.sessions;
    chk('detect.sessions.records=1', sessionsStatus.records === 1);
    chk('detect.sessions.atTarget=1', sessionsStatus.atTarget === 1);
    chk('detect.sessions.belowTarget=0', sessionsStatus.belowTarget === 0);

    // Step 5: migrate is no-op (no migration needed, just one at-target session)
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('migrate ok with existing at-target session', migrate.ok === true);
    chk('sessions count noop=1', migrate.report.perStore.sessions && migrate.report.perStore.sessions.noop === 1);
    chk('zero migrated, zero rejected, zero failed', migrate.report.perStore.sessions.migrated === 0 && migrate.report.perStore.sessions.rejected === 0 && migrate.report.perStore.sessions.failed === 0);

    // Step 6: case bundle exclusion — raw telemetry must NEVER appear in a portable case bundle.
    // Build a case, then exportCase — verify no raw telemetry was attached.
    var caseRes = await h.caseStore.create({
      metadata: { title: 'Flow02 case', vehicle: 'F3', track: 'TestTrack', status: 'complete' },
      associations: { telemetrySessionId: sid },
      setupSnapshot: {},
      analysisResults: {},
      shellEvidence: { source: 'imported', capability: {} }
    });
    chk('case create ok', caseRes.ok === true);
    var exportRes = await h.caseStore.exportCase(caseRes.caseId);
    chk('case export ok', exportRes.ok === true);
    var bundleStr = JSON.stringify(exportRes.bundle);
    chk('exported bundle does NOT contain raw samples (no "samples" field with arrays)', bundleStr.indexOf('"raw":[{') === -1 && bundleStr.indexOf('"samples":[{') === -1);

    // Step 7: zero console error
    chk('zero console.error events during real-telemetry flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-02-real-telemetry');
})();
