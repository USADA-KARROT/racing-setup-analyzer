/**
 * tests/case-store.test.js — R3.0B case CRUD over MemoryBackend. Covers round-trip identical reopen, duplicate
 * (no shared refs), archive≠delete, delete-confirm, export→import as imported_summary (never promoted),
 * save-after-delete fails (no resurrection), id collision, raw-array rejection, broken ref tolerance.
 */
'use strict';
const SB = require('../renderer/js/storage-backend.js');
const CSt = require('../renderer/js/case-store.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

function freshStore() { return CSt.createCaseStore(SB.MemoryBackend(), { stamp: '2026-06-22T00:00:00Z' }); }
function caseInput(over) {
  return Object.assign({ metadata: { title: 'Run A', vehicle: 'F3', track: 'Lihpao', status: 'complete' },
    setupSnapshot: { frontWheelRate: 240, mass: 565 },
    analysisResults: { caseHeader: { overallStatus: 'analysis_complete' }, capabilitySummary: [{ key: 'modelRan', available: true }], telemetryObservation: { available: true }, modelPrediction: { understeerGradient: { value: 2.1 } }, modelVsActual: { blockedReasons: [{ code: 'X' }] } },
    shellEvidence: { capability: { modelRan: true, telemetryObservable: true }, observation: { blockedReasons: [{ code: 'OBS' }] }, source: 'demo_case' } }, over || {});
}

(async () => {
  const store = freshStore();

  // create + open round-trip IDENTICAL
  const c = await store.create(caseInput());
  chk('create ok', c.ok === true && !!c.caseId);
  const o = await store.open(c.caseId);
  chk('open ok', o.ok === true);
  chk('analysisResults preserved', o.analysisResults.modelPrediction.understeerGradient.value === 2.1);
  chk('shellEvidence (incl observation.blockedReasons) preserved', o.shellEvidence.observation.blockedReasons[0].code === 'OBS');
  chk('recordType local_full', o.recordType === 'local_full' && o.degraded === false);

  // save (update) round-trips + requires existing entry
  const up = await store.save({ caseId: c.caseId, metadata: { title: 'Run A v2', status: 'complete' }, analysisResults: o.analysisResults, shellEvidence: o.shellEvidence, setupSnapshot: o.setupSnapshot });
  chk('save update ok', up.ok === true);
  chk('updated title persisted', (await store.open(c.caseId)).metadata.title === 'Run A v2');

  // list reflects the case
  chk('list has 1 case', (await store.list()).length === 1);

  // duplicate: fresh id, deep clone (no shared mutable refs)
  const d = await store.duplicate(c.caseId);
  chk('duplicate ok + new id', d.ok === true && d.caseId !== c.caseId);
  const dOpen = await store.open(d.caseId);
  dOpen.analysisResults.modelPrediction.understeerGradient.value = 99; // mutate the copy
  chk('duplicate independent of original', (await store.open(c.caseId)).analysisResults.modelPrediction.understeerGradient.value === 2.1);
  chk('duplicate records parent', dOpen.associations.parentCaseId === c.caseId);

  // archive ≠ delete (data retained)
  const a = await store.archive(c.caseId);
  chk('archive ok', a.ok === true);
  chk('archived case still openable', (await store.open(c.caseId)).ok === true);
  chk('archived flag set', (await store.open(c.caseId)).metadata.archived === true);
  await store.unarchive(c.caseId);
  chk('unarchive clears flag', (await store.open(c.caseId)).metadata.archived === false);

  // delete requires confirm (fail-closed)
  chk('delete without confirm refused', (await store.remove(c.caseId)).ok === false);
  chk('delete with confirm ok', (await store.remove(c.caseId, { confirm: true })).ok === true);
  chk('deleted case gone', (await store.open(c.caseId)).ok === false);

  // save-after-delete does NOT resurrect (update requires existing entry)
  const resurrect = await store.save({ caseId: c.caseId, metadata: { title: 'zombie', status: 'complete' }, analysisResults: {}, shellEvidence: {} });
  chk('save after delete → CASE_NOT_FOUND (no resurrection)', resurrect.ok === false && resurrect.code === 'CASE_NOT_FOUND');

  // create id collision
  const e1 = await store.create(caseInput({ caseId: 'fixed_id' }));
  const e2 = await store.create(caseInput({ caseId: 'fixed_id' }));
  chk('id collision rejected', e1.ok === true && e2.ok === false && e2.code === 'ID_COLLISION');

  // raw telemetry array in analysisResults → save REJECTS (all-or-nothing, nothing stored)
  const rawSave = await store.create(caseInput({ analysisResults: { samples: new Array(5000).fill(0) } }));
  chk('raw array case rejected', rawSave.ok === false && rawSave.code === 'RECORD_NOT_STORABLE');

  // export → import as imported_summary (never promoted to local_full)
  const exp = await store.exportCase('fixed_id');
  chk('export ok', exp.ok === true && exp.bundle.caseId === 'fixed_id');
  const imp = await store.importBundle(exp.bundle);
  chk('import ok', imp.ok === true && imp.caseId !== 'fixed_id');
  const impOpen = await store.open(imp.caseId);
  chk('imported is imported_summary (degraded, not promoted)', impOpen.recordType === 'imported_summary' && impOpen.degraded === true);
  chk('imported carries curated results', impOpen.analysisResults.modelPrediction.understeerGradient.value === 2.1);

  // import a FUTURE-version bundle → rejected fail-closed
  const future = JSON.parse(JSON.stringify(exp.bundle)); future.meta.schemaVersion = 999;
  chk('import future-version bundle rejected', (await store.importBundle(future)).ok === false);

  // CP2 #2: saving over an imported_summary must NOT promote it to local_full
  const promote = await store.save({ caseId: imp.caseId, metadata: { title: 'promote', status: 'complete' }, analysisResults: {}, shellEvidence: {} });
  chk('cannot overwrite imported_summary (no promotion)', promote.ok === false && promote.code === 'CANNOT_OVERWRITE_IMPORTED');
  // CP2 #1: a raw array hidden in associations is caught by whole-record sanitize (not just analysisResults)
  const rawAssoc = await store.create(caseInput({ associations: { rawSamples: new Array(300).fill(1) } }));
  chk('raw array in associations rejected (whole-record sanitize)', rawAssoc.ok === false && rawAssoc.code === 'RECORD_NOT_STORABLE');

  // CP3: a future-schema local record cannot be silently overwritten as v1 (no data loss)
  const be3 = SB.MemoryBackend(); const st3 = CSt.createCaseStore(be3, { stamp: 'x' });
  await be3.transact({ stores: ['cases', 'caseIndex'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: 'fut', value: { schemaVersion: 999, caseId: 'fut', recordType: 'local_full', metadata: { title: 'future', status: 'complete' } } }, { store: 'caseIndex', key: '__index', value: { ids: { fut: { recordType: 'local_full', title: 'future' } } } }], result: 1 }) });
  chk('future-version record open rejected', (await st3.open('fut')).ok === false);
  const futSave = await st3.save({ caseId: 'fut', metadata: { title: 'clobber', status: 'complete' }, analysisResults: {}, shellEvidence: {} });
  chk('save cannot overwrite a future-version record', futSave.ok === false && futSave.code === 'CANNOT_OVERWRITE_FUTURE');
  chk('archive cannot mutate a future-version record', (await st3.archive('fut')).code === 'CANNOT_OVERWRITE_FUTURE');
  chk('setPinned cannot mutate a future-version record', (await st3.setPinned('fut', true)).code === 'CANNOT_OVERWRITE_FUTURE');

  // §7.4: pin / unpin (persisted)
  const pinC = await store.create(caseInput({ caseId: 'pin_me', metadata: { title: 'pinme', status: 'complete' } }));
  chk('pin sets pinned', (await store.setPinned('pin_me', true)).pinned === true && (await store.open('pin_me')).metadata.pinned === true);
  chk('unpin clears pinned', (await store.setPinned('pin_me', false)).ok === true && (await store.open('pin_me')).metadata.pinned === false);

  // open a missing case → not found (broken-ref tolerance)
  chk('open missing → not found', (await store.open('nope')).ok === false);

  // compact removes orphan payloads (defensive)
  const be = SB.MemoryBackend(); const st2 = CSt.createCaseStore(be, { stamp: 'x' });
  await be.put('cases', 'orphan', { schemaVersion: 1, caseId: 'orphan' });
  const comp = await st2.compact();
  chk('compact removes orphan', comp.ok === true && comp.removed === 1);

  console.log(`case-store: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
