/**
 * tests/storage-backend.test.js — R3.0B storage backend (MemoryBackend; IndexedDB is browser-only).
 * Verifies the async KV contract, the IndexedDB-safe read-declared atomic transact, create-if-absent add,
 * clone isolation (callers can't mutate stored refs), and serialized concurrency.
 */
'use strict';
const SB = require('../renderer/js/storage-backend.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

(async () => {
  const b = SB.MemoryBackend();

  // basic KV
  await b.put('cases', 'c1', { x: 1 });
  chk('get returns stored', (await b.get('cases', 'c1')).x === 1);
  chk('list returns rows', (await b.list('cases')).length === 1);
  await b.del('cases', 'c1');
  chk('del removes', (await b.get('cases', 'c1')) === undefined);

  // clone isolation: mutating the object passed to put / returned by get must not corrupt the store
  const obj = { a: { b: 2 } };
  await b.put('cases', 'c2', obj);
  obj.a.b = 999;
  chk('put clones (caller mutation ignored)', (await b.get('cases', 'c2')).a.b === 2);
  const got = await b.get('cases', 'c2'); got.a.b = 777;
  chk('get clones (returned mutation ignored)', (await b.get('cases', 'c2')).a.b === 2);

  // add = create-if-absent
  await b.add('caseIndex', 'k', { n: 1 });
  let threw = false; try { await b.add('caseIndex', 'k', { n: 2 }); } catch (e) { threw = (e.code === SB.CODES.KEY_EXISTS); }
  chk('add rejects on existing key', threw);
  chk('add did not overwrite', (await b.get('caseIndex', 'k')).n === 1);

  // transact: declared reads → sync compute → atomic writes
  await b.put('caseIndex', '__index', { ids: {}, nextRev: 0 });
  const res = await b.transact({
    stores: ['cases', 'caseIndex'],
    reads: [{ store: 'caseIndex', key: '__index' }],
    compute: (rv) => { const idx = rv[0]; idx.ids['cA'] = { rev: 0 }; return { writes: [{ store: 'cases', key: 'cA/0', value: { hi: 1 } }, { store: 'caseIndex', key: '__index', value: idx }], result: { caseId: 'cA' } }; },
  });
  chk('transact returns compute result', res.caseId === 'cA');
  chk('transact wrote payload', (await b.get('cases', 'cA/0')).hi === 1);
  chk('transact wrote index', !!(await b.get('caseIndex', '__index')).ids.cA);

  // transact compute throwing → nothing written (atomic abort), error surfaced
  let abortThrew = false; const before = JSON.stringify(await b.get('caseIndex', '__index'));
  try { await b.transact({ stores: ['caseIndex'], reads: [{ store: 'caseIndex', key: '__index' }], compute: () => { throw new Error('boom'); } }); } catch (e) { abortThrew = true; }
  chk('transact aborts on compute throw', abortThrew && JSON.stringify(await b.get('caseIndex', '__index')) === before);

  // transact delete op
  await b.transact({ stores: ['cases'], reads: [], compute: () => ({ writes: [{ store: 'cases', key: 'cA/0', op: 'delete' }], result: 1 }) });
  chk('transact delete op', (await b.get('cases', 'cA/0')) === undefined);

  // update = atomic RMW sugar
  await b.put('meta', 'counter', 0);
  await Promise.all([b.update('meta', 'counter', v => (v || 0) + 1), b.update('meta', 'counter', v => (v || 0) + 1), b.update('meta', 'counter', v => (v || 0) + 1)]);
  chk('concurrent update serialized (no lost update)', (await b.get('meta', 'counter')) === 3);

  // estimateBytes
  chk('estimateBytes > 0', (await b.estimateBytes('caseIndex')) > 0);

  // bad txn spec rejected
  let badThrew = false; try { await b.transact({ stores: [], compute: () => ({}) }); } catch (e) { badThrew = (e.code === SB.CODES.BAD_TXN); }
  chk('bad txn spec rejected', badThrew);

  console.log(`storage-backend: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
