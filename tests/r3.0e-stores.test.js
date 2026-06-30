/**
 * tests/r3.0e-stores.test.js — R3.0E E2 · stores adversarial tests over an in-memory backend.
 *
 * Mirrors the R3.0B case-store test pattern: inject a backend that records every
 * transact() call (stores / mode / work) and replays it against an in-memory map. We test
 * the store-layer semantics (CRUD, idempotency, stale generation, append-only timeline,
 * follow-up reverse index, schema-version fail-closed, contract revalidation on read).
 */
'use strict';
var STORES = require('../renderer/js/r3-0e-stores.js');
// Use the real R3.0B MemoryBackend (which is what production code also uses) — the E2 store
// API contract is verified end-to-end against the SAME transact({stores, reads, compute})
// surface the IndexedDBBackend exposes.
var SB = require('../renderer/js/storage-backend.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

function createMemoryBackend() {
  return SB.MemoryBackend();
}

var BASE_EXP_TS = '2026-06-30T10:00:00Z';

function _validExperiment(overrides) {
  var e = {
    schemaVersion: 1, experimentId: 'exp_0123456789abcdef', sourceCaseId: 'case_e2_demo',
    sourceHypothesisId: 'pri_0123456789abcdef', sourceRecommendationId: 'priority_e2_demo',
    targetMetric: 'roll_gradient_deg_per_g', baselineValue: 3.5, expectedDirection: 'decrease',
    expectedMagnitudeRange: { min: 0.5, max: 1.5 },
    setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
    driverInstruction: null, controlVariables: [],
    validationPlan: 'r3.0e.plan.controlled_repeat_lap',
    stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
    status: 'planned', followUpCaseIds: [], outcome: null, createdAt: BASE_EXP_TS,
  };
  if (overrides) for (var k in overrides) e[k] = overrides[k];
  return e;
}

function _validOutcome(overrides) {
  var o = {
    schemaVersion: 1, outcomeId: 'out_e2', experimentId: 'exp_0123456789abcdef',
    'class': 'confirmed', observedDirection: 'decrease', observedMagnitude: 1.0,
    comparabilityScore: 0.9, confounders: [], driverFeedback: null,
    dataQualityIssues: [], sideEffects: [], limitations: [],
    createdAt: '2026-06-30T11:00:00Z',
  };
  if (overrides) for (var k in overrides) o[k] = overrides[k];
  return o;
}

function _validLink(overrides) {
  var l = {
    schemaVersion: 1, linkId: 'link_e2_demo', parentCaseId: 'case_A',
    followUpCaseId: 'case_B', experimentId: 'exp_e2_demo',
    parentStatus: 'present', createdAt: '2026-06-30T10:00:00Z',
  };
  if (overrides) for (var k in overrides) l[k] = overrides[k];
  return l;
}

// Section A — Experiment store CRUD
console.log('Section A — Experiment store CRUD');
(async function () {
  var backend = createMemoryBackend();
  var store = STORES.createExperimentStore(backend);
  var rec = _validExperiment();
  var id = await store.create(rec);
  chk('A1: create returns id', id === rec.experimentId);
  var got = await store.get(rec.experimentId);
  chk('A2: get returns record', got && got.experimentId === rec.experimentId);
  // Backend already structured-clones reads at the boundary, so callers can never mutate
  // stored references. Verify the returned reference is distinct (mutation isolation) and
  // schemaVersion-valid.
  chk('A3: get returns mutation-isolated record (separate reference)',
    got && got !== rec && got.schemaVersion === rec.schemaVersion);
  // Duplicate id → collision
  var ok = false;
  try { await store.create(rec); } catch (e) { ok = e.code === 'R3_0E_EXPERIMENT_ID_COLLISION'; }
  chk('A4: duplicate create → R3_0E_EXPERIMENT_ID_COLLISION', ok);
  // Update OK
  var updated = _validExperiment({ status: 'applied' });
  var uid = await store.update(updated);
  chk('A5: update returns id', uid === rec.experimentId);
  var afterUpdate = await store.get(rec.experimentId);
  chk('A6: updated record reflects new status', afterUpdate.status === 'applied');
  // Stale generation: update with mismatched createdAt
  var stale = _validExperiment({ createdAt: '2026-06-30T09:00:00Z' });
  var staleOk = false;
  try { await store.update(stale); } catch (e) { staleOk = e.code === 'R3_0E_EXPERIMENT_STALE_WRITE'; }
  chk('A7: stale createdAt → R3_0E_EXPERIMENT_STALE_WRITE', staleOk);
  // Invalid input rejected before write
  var badRec = _validExperiment({ status: 'in_flight' });
  var badOk = false;
  try { await store.create(badRec); } catch (e) { badOk = e.code === 'R3_0E_EXPERIMENT_INVALID'; }
  chk('A8: invalid input → R3_0E_EXPERIMENT_INVALID', badOk);
  // List
  var rows = await store.list();
  chk('A9: list returns index rows', Array.isArray(rows) && rows.length === 1);
  // Remove
  await store.remove(rec.experimentId);
  var removed = await store.get(rec.experimentId);
  chk('A10: after remove get returns null', removed === null);
})().then(runOutcome);

// Section B — Outcome store
function runOutcome() {
  console.log('Section B — Outcome store');
  (async function () {
    var backend = createMemoryBackend();
    var store = STORES.createOutcomeStore(backend);
    var rec = _validOutcome();
    var id = await store.create(rec);
    chk('B1: outcome create returns id', id === rec.outcomeId);
    var got = await store.get(rec.outcomeId);
    chk('B2: outcome get returns record', got && got.outcomeId === rec.outcomeId);
    // listForExperiment
    var rec2 = _validOutcome({ outcomeId: 'out_e2b', experimentId: 'exp_other' });
    await store.create(rec2);
    var listForFirst = await store.listForExperiment(rec.experimentId);
    chk('B3: listForExperiment filters correctly', listForFirst.length === 1 && listForFirst[0].experimentId === rec.experimentId);
    // Invalid (confounders without correct class)
    var bad = _validOutcome({ outcomeId: 'out_bad', confounders: ['weather'], 'class': 'confirmed' });
    var badOk = false;
    try { await store.create(bad); } catch (e) { badOk = e.code === 'R3_0E_OUTCOME_INVALID'; }
    chk('B4: confounder-class invariant enforced at store layer', badOk);
  })().then(runTimeline);
}

// Section C — Timeline store
function runTimeline() {
  console.log('Section C — Timeline store (append-only)');
  (async function () {
    var backend = createMemoryBackend();
    var store = STORES.createTimelineStore(backend);
    var caseId = 'case_e2_c';
    var initial = await store.getTimeline(caseId);
    chk('C1: empty case → empty events list', initial.events.length === 0);
    var e1 = { eventId: 'ev_1', kind: 'baseline_captured', createdAt: '2026-06-30T10:00:00Z', i18nKey: 'r3.0e.tl.baseline', params: null };
    await store.appendEvent(caseId, e1);
    var e2 = { eventId: 'ev_2', kind: 'hypothesis_recorded', createdAt: '2026-06-30T10:05:00Z', i18nKey: 'r3.0e.tl.hypothesis', params: null };
    await store.appendEvent(caseId, e2);
    var tl = await store.getTimeline(caseId);
    chk('C2: 2 events appended in order', tl.events.length === 2 && tl.events[0].eventId === 'ev_1');
    // Duplicate event id rejected
    var dupOk = false;
    try { await store.appendEvent(caseId, e1); } catch (e) { dupOk = e.code === 'R3_0E_TIMELINE_DUPLICATE_EVENT'; }
    chk('C3: duplicate event id rejected', dupOk);
    // Out-of-order timestamp rejected
    var older = { eventId: 'ev_3', kind: 'baseline_captured', createdAt: '2026-06-30T09:00:00Z', i18nKey: 'r3.0e.tl.x', params: null };
    var oooOk = false;
    try { await store.appendEvent(caseId, older); } catch (e) { oooOk = e.code === 'R3_0E_TIMELINE_OUT_OF_ORDER'; }
    chk('C4: out-of-order event rejected', oooOk);
    // Existing events untouched (append-only)
    var tl2 = await store.getTimeline(caseId);
    chk('C5: append-only: prior events unchanged after rejected writes',
      tl2.events.length === 2 && tl2.events[1].eventId === 'ev_2');
  })().then(runLink);
}

// Section D — Follow-up link store
function runLink() {
  console.log('Section D — Follow-up link store');
  (async function () {
    var backend = createMemoryBackend();
    var store = STORES.createFollowUpLinkStore(backend);
    var l1 = _validLink({ linkId: 'link_d1', parentCaseId: 'case_parent', followUpCaseId: 'case_child1' });
    var l2 = _validLink({ linkId: 'link_d2', parentCaseId: 'case_parent', followUpCaseId: 'case_child2', experimentId: 'exp_other' });
    await store.create(l1);
    await store.create(l2);
    var listed = await store.listForParent('case_parent');
    chk('D1: listForParent returns 2 links', listed.length === 2);
    // Duplicate id
    var dupOk = false;
    try { await store.create(l1); } catch (e) { dupOk = e.code === 'R3_0E_LINK_ID_COLLISION'; }
    chk('D2: duplicate linkId rejected', dupOk);
    // Self-link rejected via contract
    var selfLink = _validLink({ linkId: 'link_self', parentCaseId: 'case_x', followUpCaseId: 'case_x' });
    var selfOk = false;
    try { await store.create(selfLink); } catch (e) { selfOk = e.code === 'R3_0E_LINK_INVALID'; }
    chk('D3: self-link rejected at store layer', selfOk);
    // markParentStatus to archived
    await store.markParentStatus('link_d1', 'archived');
    var got = await store.get('link_d1');
    chk('D4: parentStatus updated to archived', got.parentStatus === 'archived');
    // markParentStatus invalid
    var badStatusOk = false;
    try { await store.markParentStatus('link_d1', 'mystery'); } catch (e) { badStatusOk = e.code === 'R3_0E_LINK_PARENT_STATUS_INVALID'; }
    chk('D5: invalid parentStatus rejected', badStatusOk);
  })().then(runFutureSchema);
}

// Section E — Future-schema fail-closed + corrupted-record detection
function runFutureSchema() {
  console.log('Section E — Future-schema + corruption');
  (async function () {
    var backend = createMemoryBackend();
    // Directly inject a future-schema record into the backend via put().
    await backend.put('r3_0e_experiments', 'exp_future', {
      schemaVersion: 99, experimentId: 'exp_future', sourceCaseId: 'c',
    });
    var store = STORES.createExperimentStore(backend);
    var ok = false;
    try { await store.get('exp_future'); } catch (e) { ok = e.code === 'R3_0E_EXPERIMENT_FUTURE_SCHEMA'; }
    chk('E1: future-schema read fails fail-closed', ok);

    // Corrupted record: schemaVersion correct but contract validation fails.
    await backend.put('r3_0e_experiments', 'exp_corrupt', {
      schemaVersion: 1, experimentId: 'exp_corrupt' /* missing required fields */,
    });
    var corrOk = false;
    try { await store.get('exp_corrupt'); } catch (e) { corrOk = e.code === 'R3_0E_EXPERIMENT_CORRUPTED'; }
    chk('E2: corrupted record read fails with CORRUPTED', corrOk);
  })().then(runMetadata);
}

// Section F — Store metadata (migration markers)
function runMetadata() {
  console.log('Section F — Store metadata');
  (async function () {
    var backend = createMemoryBackend();
    var meta = STORES.createStoreMetadata(backend);
    var v0 = await meta.readVersion();
    chk('F1: initial readVersion returns null', v0 === null);
    await meta.writeVersion({ experiment: 1, outcome: 1, timeline: 1, followUpLink: 1 });
    var v1 = await meta.readVersion();
    chk('F2: after writeVersion read returns map', v1 && v1.versions && v1.versions.experiment === 1);
  })().then(runScope);
}

// Section G — Scope: R3.0B case-record schema NOT touched by E2
function runScope() {
  console.log('Section G — scope: R3.0B case-record schema NOT modified by E2');
  (function () {
    var fs = require('fs');
    var path = require('path');
    var src = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'js', 'case-record-schema.js'), 'utf8');
    chk('G1: case-record-schema.js does NOT require renderer/js/r3-0e-stores.js',
      src.indexOf('r3-0e-stores') === -1);
    chk('G2: case-record-schema.js does NOT embed E2 store names',
      src.indexOf('r3_0e_experiments') === -1 && src.indexOf('r3_0e_outcomes') === -1
        && src.indexOf('r3_0e_timelines') === -1 && src.indexOf('r3_0e_followupLinks') === -1);
  })();
  runR1Closures();
}

// Section H — Codex E2 R1 closures
function runR1Closures() {
  console.log('Section H — Codex E2 R1 closures');
  (async function () {
    // H1 — listForParent re-validates each fetched record (E2-R1-02 closure).
    var backend = createMemoryBackend();
    // Inject a future-schema link directly into the store + reverse index.
    await backend.put('r3_0e_followupLinks', 'link_future', {
      schemaVersion: 99, linkId: 'link_future', parentCaseId: 'case_parent_h1',
      followUpCaseId: 'case_child', experimentId: 'exp_z', parentStatus: 'present',
      createdAt: '2026-06-30T10:00:00Z',
    });
    await backend.put('r3_0e_followupLinksByCase', 'case_parent_h1', {
      parentCaseId: 'case_parent_h1', linkIds: ['link_future'],
    });
    var store = STORES.createFollowUpLinkStore(backend);
    var futureOk = false;
    try { await store.listForParent('case_parent_h1'); } catch (e) { futureOk = e.code === 'R3_0E_LINK_FUTURE_SCHEMA'; }
    chk('H1: listForParent rejects future-schema link (fail-closed)', futureOk);

    // H2 — listForParent rejects corrupted link.
    await backend.put('r3_0e_followupLinks', 'link_corrupt', {
      schemaVersion: 1, linkId: 'link_corrupt' /* missing required fields */,
    });
    await backend.put('r3_0e_followupLinksByCase', 'case_parent_h2', {
      parentCaseId: 'case_parent_h2', linkIds: ['link_corrupt'],
    });
    var corrOk = false;
    try { await store.listForParent('case_parent_h2'); } catch (e) { corrOk = e.code === 'R3_0E_LINK_CORRUPTED'; }
    chk('H2: listForParent rejects corrupted link', corrOk);

    // H3 — E2-R1-03 closure: path-shaped follow-up IDs are rejected at the contract layer.
    var bad1 = { schemaVersion: 1, linkId: 'link_../etc/passwd', parentCaseId: 'case_A',
                 followUpCaseId: 'case_B', experimentId: 'exp_z', parentStatus: 'present',
                 createdAt: '2026-06-30T10:00:00Z' };
    var pathOk = false;
    try { await store.create(bad1); } catch (e) { pathOk = e.code === 'R3_0E_LINK_INVALID'; }
    chk('H3a: path-shaped linkId rejected', pathOk);
    var bad2 = { schemaVersion: 1, linkId: 'link_ok', parentCaseId: 'case_/etc',
                 followUpCaseId: 'case_B', experimentId: 'exp_z', parentStatus: 'present',
                 createdAt: '2026-06-30T10:00:00Z' };
    var path2Ok = false;
    try { await store.create(bad2); } catch (e) { path2Ok = e.code === 'R3_0E_LINK_INVALID'; }
    chk('H3b: path-shaped parentCaseId rejected', path2Ok);
    var bad3 = { schemaVersion: 1, linkId: 'link_ok', parentCaseId: 'case_A',
                 followUpCaseId: 'case_B\\hostile', experimentId: 'exp_z', parentStatus: 'present',
                 createdAt: '2026-06-30T10:00:00Z' };
    var path3Ok = false;
    try { await store.create(bad3); } catch (e) { path3Ok = e.code === 'R3_0E_LINK_INVALID'; }
    chk('H3c: path-shaped followUpCaseId rejected', path3Ok);
  })().then(function () {
    console.log('R3.0E E2 stores suite: ' + pass + ' passed, ' + fail + ' failed');
    if (fail > 0) process.exit(1);
  });
}
