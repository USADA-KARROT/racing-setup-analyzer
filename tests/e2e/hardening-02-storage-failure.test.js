/**
 * tests/e2e/hardening-02-storage-failure.test.js — R3.0F F3 · Storage failure handling.
 *
 * Asserts the storage layer handles backend failures gracefully — no silent data loss, no
 * orphaned writes, no partial state — through the F1 migration engine + R3.0B case-store +
 * R3.0E experiment-store. Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var SB = require('../../renderer/js/storage-backend.js');
var CS = require('../../renderer/js/case-store.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: case-store remove requires {confirm: true} — destructive guard
    var realBackend = SB.MemoryBackend();
    var caseStore = CS.createCaseStore(realBackend, { stamp: '2026-07-01T00:00:00.000Z' });
    var c = await caseStore.create({ metadata: { title: 'F3 test', status: 'complete' } });
    chk('case create ok', c.ok === true);

    var removeNoConfirm = await caseStore.remove(c.caseId, {});
    chk('case remove WITHOUT confirm:true is fail-closed', removeNoConfirm.ok === false && removeNoConfirm.code === 'CONFIRM_REQUIRED');

    // F3-R1-02 closure: full truthy-non-boolean class must be rejected. Only literal `true` succeeds.
    var truthyNonBoolean = [
      ['confirm: "yes" (string)', { confirm: 'yes' }],
      ['confirm: "true" (string)', { confirm: 'true' }],
      ['confirm: 1 (number)', { confirm: 1 }],
      ['confirm: -1 (negative number)', { confirm: -1 }],
      ['confirm: {} (object)', { confirm: {} }],
      ['confirm: [] (array)', { confirm: [] }],
      ['confirm: new Boolean(true)', { confirm: new Boolean(true) }],
      ['confirm: null', { confirm: null }],
      ['confirm: undefined explicit', { confirm: undefined }]
    ];
    for (var k = 0; k < truthyNonBoolean.length; k++) {
      var label = truthyNonBoolean[k][0];
      var opts = truthyNonBoolean[k][1];
      var r = await caseStore.remove(c.caseId, opts);
      chk('case remove rejects ' + label, r.ok === false && r.code === 'CONFIRM_REQUIRED');
    }

    var removeWithConfirm = await caseStore.remove(c.caseId, { confirm: true });
    chk('case remove with confirm:true (literal boolean) succeeds', removeWithConfirm.ok === true);

    // Step 2: backend.transact() failure → BACKEND_REJECTED, no partial write, no journal corruption
    var failBackend = {
      list: realBackend.list.bind(realBackend),
      get: realBackend.get.bind(realBackend),
      put: realBackend.put.bind(realBackend),
      transact: function () { return Promise.reject(new Error('STORAGE_DISK_FULL')); }
    };
    var failHarness = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
    try {
      // seed a record via the real backend so the failing migration has something to attempt
      await realBackend.put('cases', 'cFail', { schemaVersion: 1, caseId: 'cFail' });
      var registry = { cases: { storeKey: 'cases', targetVersion: 1, migrate: function (rec) {
        return { ok: true, record: { schemaVersion: 1, caseId: rec.caseId, x: 1 }, migrations: ['delta'] };
      } } };
      // Engine uses the failBackend; backend.list works via realBackend.list bound, transact rejects
      var ENG = require('../../renderer/js/r3-0f-migration-engine.js');
      var failEng = ENG.createMigrationEngine({ backend: failBackend, registry: registry, stamp: '2026-07-01T00:00:00.000Z' });
      var res = await failEng.migrate({ confirm: true });
      chk('backend transact failure → ok:false', res.ok === false);
      chk('reasonCode = BACKEND_REJECTED', res.reasonCode === 'BACKEND_REJECTED');
      chk('status = halted', res.report.status === 'halted');
      // Verify the source record is UNCHANGED on the underlying backend
      var srcRec = await realBackend.get('cases', 'cFail');
      chk('source record UNCHANGED after backend failure (no partial write)', srcRec && srcRec.schemaVersion === 1 && !srcRec.x);
    } finally {
      failHarness.dispose();
    }

    // Step 3: oversized record (>maxRecordBytes) is rejected
    var bigText = '';
    for (var i = 0; i < 9_000_000; i++) bigText += 'A'; // 9MB > 8MB default cap
    var bigBackend = SB.MemoryBackend();
    await bigBackend.put('cases', 'cBig', { schemaVersion: 1, caseId: 'cBig', payload: bigText });
    var ENG2 = require('../../renderer/js/r3-0f-migration-engine.js');
    var bigEng = ENG2.createMigrationEngine({ backend: bigBackend, stamp: '2026-07-01T00:00:00.000Z' });
    var bigRes = await bigEng.migrate({ confirm: true });
    chk('oversized record handled (engine completes)', bigRes && bigRes.ok !== undefined);
    chk('oversized record rejected by record-bytes cap', bigRes.report.perStore.cases.rejected === 1 || bigRes.report.perStore.cases.failed === 1);

    // Step 4: zero console error
    chk('zero console.error during storage-failure hardening', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-hardening-02-storage-failure');
})();
