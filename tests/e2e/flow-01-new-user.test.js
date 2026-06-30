/**
 * tests/e2e/flow-01-new-user.test.js — R3.0F F2 · Flow 01: new user empty-state journey.
 *
 * Asserts a fresh launch with an empty IndexedDB backend produces a deterministic empty Case
 * Library state, the F1 migration engine reports zero records, the F1 envelope is at v1, and
 * none of the forbidden actions (auto reference lap / auto setup apply / runtime-LLM authority /
 * causation / driver blame) are enabled by the harness. Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: fresh launch — case-library list returns empty
    var list = await h.caseStore.list();
    chk('caseStore.list() returns empty array on fresh launch', Array.isArray(list) && list.length === 0);

    // Step 2: session store is empty
    var sessions = await h.sessionStore.list();
    chk('sessionStore.list() returns empty array on fresh launch', Array.isArray(sessions) && sessions.length === 0);

    // Step 3: F1 migration engine detect — zero records across all stores
    var det = await h.migrationEngine.detect();
    chk('migration engine detect ok', det.ok === true);
    chk('migration engine knows 6 stores', det.knownStores.length === 6);
    chk('all per-store counts zero on fresh launch', Object.keys(det.perStoreStatus).every(function (k) { return det.perStoreStatus[k].records === 0; }));
    chk('envelope mismatch=false on fresh launch (no prior envelope)', det.envelopeMismatch === false);
    chk('currentEnvelope null on fresh launch', det.currentEnvelope === null);

    // Step 4: F1 migrate with confirm — empty-backend is no-op (zero journal append, idempotent)
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('empty-backend migrate ok', migrate.ok === true);
    chk('empty-backend migrate status=no-op', migrate.report.status === 'no-op');
    chk('empty-backend migrate idempotentSkipped', migrate.report.idempotentSkipped === true);
    chk('zero journal append on no-op', migrate.report.journalAppended === 0);

    // Step 5: forbidden-actions gate
    h.assertForbiddenActionsDisabled({
      autoReferenceLap: false,
      autoApplySetup: false,
      runtimeLLMDecisionAuthority: false,
      causationClaim: false,
      driverBlame: false
    });
    chk('forbidden actions disabled (fresh launch baseline)', true);

    // Step 6: no console error during the entire flow
    chk('zero console.error events during new-user flow', h.consoleErrorCount === 0);

  } finally {
    h.dispose();
  }

  t.report('e2e-flow-01-new-user');
})();
