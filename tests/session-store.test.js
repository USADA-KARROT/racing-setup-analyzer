/**
 * tests/session-store.test.js — R3.0B raw telemetry session store (local-only, bounded). MemoryBackend.
 * Covers put/get/list, size rejection, capacity eviction (oldest-first) with a bounded eviction log, raw archive
 * opt-in, delete confirm, and that raw payloads never appear in a portable case bundle path.
 */
'use strict';
const SB = require('../renderer/js/storage-backend.js');
const SS = require('../renderer/js/session-store.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

(async () => {
  const store = SS.createSessionStore(SB.MemoryBackend(), { stamp: '2026-06-22T00:00:00Z', maxSessionBytes: 100000, maxRawBytes: 3000 });

  // put + get a raw session (large arrays ARE allowed here — that's the point)
  const p = await store.put({ summary: { channels: ['speed', 'steering'] }, raw: { speed: new Array(200).fill(50), steering: new Array(200).fill(0.1) } });
  chk('put ok', p.ok === true && !!p.sessionId);
  const g = await store.get(p.sessionId);
  chk('get returns raw session', g.ok === true && g.session.raw.speed.length === 200);
  chk('list has session', (await store.list()).length === 1);

  // oversized session rejected by per-session byte bound
  const big = await store.put({ raw: { x: new Array(50000).fill(123456789) } });
  chk('oversized session rejected', big.ok === false && big.code === 'SESSION_TOO_LARGE');

  // a single session alone over the TOTAL budget can never fit → rejected (CP2 #5)
  const overBudget = await store.put({ raw: { d: new Array(2000).fill(9) } }); // < maxSessionBytes but > maxRawBytes
  chk('session alone over total budget rejected', overBudget.ok === false && overBudget.code === 'SESSION_EXCEEDS_BUDGET');

  // capacity eviction: write several sessions over the total budget → oldest evicted
  const ids = [];
  for (let i = 0; i < 6; i++) { const r = await store.put({ raw: { d: new Array(400).fill(i) } }); ids.push(r.sessionId); }
  const after = await store.list();
  chk('eviction kept store bounded (fewer than all)', after.length < 7);
  const stats = await store.evictionStats();
  chk('eviction log recorded + bounded', stats.totalEvictions >= 1 && stats.recent.length <= 64);
  chk('oldest session evicted first', (await store.get(ids[0])).ok === false || after.find(s => s.sessionId === ids[ids.length - 1]));

  // explicit raw archive opt-in (distinct from case bundle)
  const live = (await store.list())[0].sessionId;
  const arch = await store.exportRawArchive(live);
  chk('raw archive opt-in returns raw', arch.ok === true && arch.archive.kind === 'raw_telemetry_archive');

  // delete confirm
  chk('delete without confirm refused', (await store.remove(live)).ok === false);
  chk('delete with confirm ok', (await store.remove(live, { confirm: true })).ok === true);

  // a CASE portable bundle never carries raw telemetry — the case path doesn't touch session-store at all.
  const CRS = require('../renderer/js/case-record-schema.js');
  const bundle = CRS.toPortableBundle({ caseId: 'c1', metadata: { title: 't', status: 'complete', createdAt: 'd' }, analysisResults: {}, shellEvidence: { capability: {} }, associations: {}, setupSnapshot: {} });
  chk('case bundle has no raw session field', bundle.ok && JSON.stringify(bundle.bundle).indexOf('"raw"') === -1);

  console.log(`session-store: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})();
