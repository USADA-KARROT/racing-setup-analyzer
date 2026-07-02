'use strict';
/**
 * tests/h4-upgrade-qualification.test.js — deterministic upgrade/migration qualification.
 *
 * Complements the REAL-binary packaged upgrade harness (tests/packaged/h4-upgrade.mjs, which proves
 * a v1.4.0-authored userData profile is opened correctly by the v2.0.0 binary) with the harder,
 * deterministic scenarios exercised over the SAME production modules the packaged app runs
 * (renderer/js/case-store.js + storage-backend.js + schema-migration.js):
 *
 *   - future-schema fail-closed (a v2 record cannot be opened as-is, nor overwritten by a v1 write)
 *   - downgrade refusal (CANNOT_OVERWRITE_FUTURE)
 *   - idempotent re-open (identical result twice)
 *   - no duplication across re-open
 *   - malformed record handling (garbage payload → fail-closed, never a throw that crashes the caller)
 *   - interrupted-init resilience (a backend with an index but a missing payload recovers gracefully)
 *
 * Since v1.4.0 shipped NO case-persistence layer (4 renderer files, zero IndexedDB — verified against
 * the v1.4.0 tag), a real 1.4.0→2.0.0 transition is NOT a case-data migration; it is a fresh IndexedDB
 * initialization over a 1.4.0-authored profile. This suite therefore qualifies the 2.0.0 persistence
 * contract's forward-compatibility and corruption behavior, which is what an upgrade actually stresses.
 */
const SB = require('../renderer/js/storage-backend.js');
const CSt = require('../renderer/js/case-store.js');
const MIG = require('../renderer/js/schema-migration.js');

let pass = 0, fail = 0;
function chk(name, cond, extra) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); } }

const STAMP = '2026-07-02T00:00:00Z';
function freshStore(be) { return CSt.createCaseStore(be || SB.MemoryBackend(), { stamp: STAMP }); }
function caseInput(title) {
  return { metadata: { title: title || 'upgrade-case', vehicle: 'F312', track: null, status: 'complete' }, setupSnapshot: { mass: 565 }, analysisResults: {}, shellEvidence: { source: 'test' } };
}

(async () => {
  // 1. clean create + schema v1 + round-trip
  {
    const store = freshStore();
    const c = await store.create(caseInput('a'));
    chk('create ok (fresh IndexedDB init path)', c.ok === true && !!c.caseId);
    chk('created record is schema v1', c.record && c.record.schemaVersion === MIG.CASE_SCHEMA_VERSION);
    const o = await store.open(c.caseId);
    chk('open round-trips', o.ok === true && o.metadata.title === 'a');
  }

  // 2. idempotent re-open + no duplication
  {
    const store = freshStore();
    const c = await store.create(caseInput('b'));
    const o1 = await store.open(c.caseId);
    const o2 = await store.open(c.caseId);
    chk('re-open is idempotent (identical metadata)', JSON.stringify(o1.metadata) === JSON.stringify(o2.metadata));
    chk('no duplication (list length 1 after two opens)', (await store.list()).length === 1);
  }

  // 3. future-schema fail-closed — inject a v2 record directly into the backend and try to open it
  {
    const be = SB.MemoryBackend();
    const store = freshStore(be);
    const c = await store.create(caseInput('c'));
    // Simulate a FUTURE version having written this record (schemaVersion 2 > CASE_SCHEMA_VERSION 1).
    const raw = await be.get('cases', c.caseId);
    raw.schemaVersion = MIG.CASE_SCHEMA_VERSION + 1;
    await be.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: c.caseId, value: raw }], result: {} }) });
    const migrated = MIG.migrateCaseRecord(raw);
    chk('future-version record: migration refuses (not ok)', migrated.ok === false, migrated);
    const opened = await store.open(c.caseId);
    chk('future-version record: store.open fail-closes (rejected, not silently coerced)', opened.ok === false && opened.rejected === true, opened);
  }

  // 4. downgrade refusal — a v1 write must never clobber a future-version record
  {
    const be = SB.MemoryBackend();
    const store = freshStore(be);
    const c = await store.create(caseInput('d'));
    const raw = await be.get('cases', c.caseId);
    raw.schemaVersion = MIG.CASE_SCHEMA_VERSION + 5;
    await be.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: c.caseId, value: raw }], result: {} }) });
    const save = await store.save({ caseId: c.caseId, metadata: { title: 'downgrade-attempt', status: 'complete' }, setupSnapshot: {}, analysisResults: {}, shellEvidence: { source: 'test' } });
    chk('downgrade attempt is refused (CANNOT_OVERWRITE_FUTURE)', save.ok === false && save.code === 'CANNOT_OVERWRITE_FUTURE', save);
  }

  // 5. malformed record handling — garbage payload must fail-closed, never throw uncaught
  {
    const be = SB.MemoryBackend();
    const store = freshStore(be);
    await be.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: 'garbage', value: { not: 'a record', schemaVersion: 'x' } }], result: {} }) });
    let threw = false, opened = null;
    try { opened = await store.open('garbage'); } catch (_) { threw = true; }
    chk('malformed record: open does not throw (fail-closed, not a crash)', !threw, { opened });
    chk('malformed record: open reports not-ok', opened && opened.ok === false, opened);
  }

  // 6. interrupted-init resilience — an index entry whose payload never landed (a torn first write)
  {
    const be = SB.MemoryBackend();
    const store = freshStore(be);
    const c = await store.create(caseInput('e'));
    // Delete only the payload, leaving the index pointing at it (simulates an interrupted write).
    await be.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: c.caseId, op: 'delete' }], result: {} }) });
    let threw = false, opened = null, list = null;
    try { opened = await store.open(c.caseId); list = await store.list(); } catch (_) { threw = true; }
    chk('interrupted init: open does not throw', !threw);
    chk('interrupted init: missing payload reported as CASE_NOT_FOUND', opened && opened.ok === false && opened.code === 'CASE_NOT_FOUND', opened);
    chk('interrupted init: list still enumerable (index survives)', Array.isArray(list));
  }

  // 7. recovery — after corruption, a NEW create still works (store is not wedged)
  {
    const be = SB.MemoryBackend();
    const store = freshStore(be);
    await be.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: 'bad', value: null }], result: {} }) });
    const recovered = await store.create(caseInput('f'));
    chk('recovery: a fresh create succeeds after a corrupt entry exists', recovered.ok === true);
  }

  console.log('h4-upgrade-qualification: ' + pass + ' passed, ' + fail + ' failed');
  if (fail) process.exit(1);
})();
