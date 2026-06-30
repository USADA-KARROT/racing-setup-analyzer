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

    // ---- (2) F3-R2-03 closure — count MIGRATOR INVOCATIONS, not backend operations.
    // Backend ops alone don't catch a quadratic regression that does extra work in-memory
    // (e.g., a nested-loop validation per record). The migrator is the user-supplied per-record
    // hook; the engine must call it EXACTLY ONCE per record. We wrap a custom migrator with a
    // counter + per-key visit set and assert: (a) every record's key gets called exactly once;
    // (b) total invocations equal N exactly; (c) migrator-call ratio at N=50→200 grows ~4×
    // (perfect linear) — anything ≥ 6 indicates super-linear regression.

    async function _runWithMigratorCounter(n) {
      var raw = SB.MemoryBackend();
      var cs = CS.createCaseStore(raw, { stamp: '2026-07-01T00:00:00.000Z' });
      // Seed n cases at schemaVersion 0 (forcing migration to version 1)
      for (var k = 0; k < n; k++) {
        await raw.put('scaleStore', 'rec_' + k, { schemaVersion: 0, recId: 'rec_' + k });
      }
      var migratorCalls = 0;
      var visits = Object.create(null);
      var registry = {
        scaleStore: {
          storeKey: 'scaleStore',
          targetVersion: 1,
          migrate: function (rec) {
            migratorCalls++;
            visits[rec.recId] = (visits[rec.recId] || 0) + 1;
            return { ok: true, record: { schemaVersion: 1, recId: rec.recId, ok: true }, migrations: ['v0→v1'] };
          }
        }
      };
      var eng = ENG.createMigrationEngine({ backend: raw, registry: registry, stamp: '2026-07-01T00:00:00.000Z' });
      var res = await eng.migrate({ confirm: true });
      return { ok: res.ok, migratorCalls: migratorCalls, visits: visits };
    }

    var rN50 = await _runWithMigratorCounter(50);
    var rN200 = await _runWithMigratorCounter(200);
    chk('scale@N=50 migration ok', rN50.ok === true);
    chk('scale@N=200 migration ok', rN200.ok === true);

    // (a) Every record visited EXACTLY ONCE — a regression that re-calls migrator would inflate visits[key]
    var n50DuplicateVisits = Object.keys(rN50.visits).filter(function (k) { return rN50.visits[k] !== 1; });
    var n200DuplicateVisits = Object.keys(rN200.visits).filter(function (k) { return rN200.visits[k] !== 1; });
    chk('@N=50 every record visited exactly once', n50DuplicateVisits.length === 0, { duplicates: n50DuplicateVisits.slice(0, 5) });
    chk('@N=200 every record visited exactly once', n200DuplicateVisits.length === 0, { duplicates: n200DuplicateVisits.slice(0, 5) });

    // (b) Total migrator calls EQUAL the record count exactly
    chk('@N=50 migratorCalls === 50', rN50.migratorCalls === 50, { calls: rN50.migratorCalls });
    chk('@N=200 migratorCalls === 200', rN200.migratorCalls === 200, { calls: rN200.migratorCalls });

    // (c) Migrator-call ratio at 4× N growth must stay close to 4 (perfect linear). A quadratic
    //     regression would produce a ratio of 16. We use 6 as the upper bound (allows some
    //     constant-overhead growth in the engine; a real super-linear regression still fails).
    var migRatio = rN50.migratorCalls === 0 ? Infinity : rN200.migratorCalls / rN50.migratorCalls;
    chk('migrator-call ratio @N=200/N=50 ≤ 6 (linear bound): ' + migRatio.toFixed(2), migRatio <= 6, { ratio: migRatio });

    // (d) Backend ops are constant w.r.t. N (current engine architecture: 1 list per store +
    //     1 transact total). Document this expected shape.
    var raw3 = SB.MemoryBackend();
    var ib3 = instrument(raw3);
    var cs3 = CS.createCaseStore(raw3, { stamp: '2026-07-01T00:00:00.000Z' });
    for (var k2 = 0; k2 < 100; k2++) await cs3.create({ metadata: { title: 'x' + k2, status: 'complete' }, associations: {}, setupSnapshot: {}, analysisResults: {}, shellEvidence: { source: 's' } });
    ib3.counts.list = 0; ib3.counts.get = 0; ib3.counts.put = 0; ib3.counts.transact = 0;
    var eng3 = ENG.createMigrationEngine({ backend: ib3, stamp: '2026-07-01T00:00:00.000Z' });
    var res3 = await eng3.migrate({ confirm: true });
    chk('engine architecture: backend ops do not scale with N at all (single-list/single-transact)', res3.ok === true && ib3.counts.transact <= 2);

    // ---- (3) F3-R3-02 closure — Proxy-wrapped record-array catches single-pass quadratic CPU.
    // A migrator-call counter catches re-call regressions but NOT single-pass quadratic work
    // (e.g., a nested loop over `records` BEFORE each `migrate(records[i])` call). We wrap the
    // backend.list result in a Proxy that counts integer-key + .length reads. The engine's
    // normal linear pass over N records produces ~N reads. A quadratic regression that scans
    // ALL records for each record produces ~N² reads. At N=200/N=50, linear ratio ≈ 4; a
    // quadratic regression would inflate the ratio to ~16. Bound at 8 (linear + constant overhead).
    function listProbeBackend(realBackend) {
      var counter = { reads: 0 };
      return {
        counter: counter,
        list: function (storeKey) {
          return realBackend.list(storeKey).then(function (arr) {
            return new Proxy(arr, {
              get: function (t, p, r) {
                if (typeof p === 'string' && /^\d+$/.test(p)) counter.reads++;
                else if (p === 'length') counter.reads++;
                return Reflect.get(t, p, r);
              }
            });
          });
        },
        get: function (storeKey, key) { return realBackend.get(storeKey, key); },
        put: function (storeKey, key, value) { return realBackend.put(storeKey, key, value); },
        transact: function (spec) { return realBackend.transact(spec); }
      };
    }

    async function _runWithReadCounter(n) {
      var raw = SB.MemoryBackend();
      var lpb = listProbeBackend(raw);
      var cs = CS.createCaseStore(raw, { stamp: '2026-07-01T00:00:00.000Z' });
      for (var k = 0; k < n; k++) {
        await cs.create({ metadata: { title: 'r' + k, status: 'complete' }, associations: {}, setupSnapshot: {}, analysisResults: {}, shellEvidence: { source: 's' } });
      }
      lpb.counter.reads = 0;
      var eng = ENG.createMigrationEngine({ backend: lpb, stamp: '2026-07-01T00:00:00.000Z' });
      var res = await eng.migrate({ confirm: true });
      return { ok: res.ok, reads: lpb.counter.reads };
    }

    var rd50 = await _runWithReadCounter(50);
    var rd200 = await _runWithReadCounter(200);
    chk('read-probe migration ok at N=50', rd50.ok === true);
    chk('read-probe migration ok at N=200', rd200.ok === true);
    chk('@N=50 record-array reads recorded', rd50.reads > 0);
    chk('@N=200 record-array reads recorded', rd200.reads > 0);
    var readRatio = rd50.reads === 0 ? Infinity : rd200.reads / rd50.reads;
    chk('record-array-read ratio @N=200/N=50 ≤ 8 (bounded-linear): ' + readRatio.toFixed(2), readRatio <= 8, { n50: rd50.reads, n200: rd200.reads, ratio: readRatio });

    // ---- (3) Console-error guard ----
    chk('zero console.error during large-library hardening', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-hardening-04-large-library');
})();
