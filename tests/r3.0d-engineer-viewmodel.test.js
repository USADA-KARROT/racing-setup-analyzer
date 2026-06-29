/**
 * tests/r3.0d-engineer-viewmodel.test.js — R3.0D D5 · ViewModel + Orchestrator adversarial tests.
 *
 * Covers:
 *   A) ViewModel — functional re-projection from authoritative envelope
 *   B) ViewModel — authority gate (forged / cloned / structuredClone / JSON / null)
 *   C) ViewModel — display state derivation (available / inconclusive / blocked / stale)
 *   D) ViewModel — producer attestation (D5's own WeakSet)
 *   E) ViewModel — privacy (no path / no telemetry / no stack)
 *   F) ViewModel — closed key sets (opts shape)
 *   G) Orchestrator — pipeline (D3→D4→D5 → published snapshot)
 *   H) Orchestrator — generation token & stale-async drop
 *   I) Orchestrator — invalidate() across all 13 reasons
 *   J) Orchestrator — subscribe / unsubscribe / listener error isolation
 *   K) Orchestrator — sanitized errors
 *   L) Orchestrator — getCurrentAuthoritativeEnvelope leak protection
 */
'use strict';

var fs = require('fs');
var EG = require('../renderer/js/r3-0d-evidence-graph.js');
var HE = require('../renderer/js/r3-0d-hypothesis-engine.js');
var PE = require('../renderer/js/r3-0d-priority-engine.js');
var EB = require('../renderer/js/r3-0d-engineer-brief.js');
var VM = require('../renderer/js/r3-0d-engineer-viewmodel.js');
var ORC = require('../renderer/js/r3-0d-engineer-orchestrator.js');
var RC = require('../contracts/r3.0d/reason-codes.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

// ---------- Fixtures ---------------------------------------------------------------------
var BASE_CLOCK = function () { return '2026-06-29T01:00:00Z'; };
function _opts() { return { clock: BASE_CLOCK }; }
function _ca() { return { caseId: 'case_001', sessionId: 'sess_001', lapId: null }; }
function _baseIdentity() {
  return { caseId: 'case_001', sessionId: 'sess_001', lapId: null, sourceId: 'csv_v1', sourceVersion: '1.0', freshness: '2026-06-29T00:00:00Z' };
}
function _baseNode(overrides) {
  var n = {
    schemaVersion: 1, nodeId: 'n_default', category: 'data_quality',
    identity: _baseIdentity(), credibility: 'measured', provenance: 'real', availability: 'available',
    confidence: { state: 'not_computed' },
    observation: { kind: 'channel_missing', channel: 'brake', i18nKey: 'k', params: null },
    limitations: ['LIMITATION_MISSING_CHANNEL'], supportingEdges: [], contradictingEdges: [],
  };
  if (overrides) for (var k in overrides) n[k] = overrides[k];
  return n;
}
function _buildEnvelope(nodes) {
  var eg = EG.buildEvidenceGraph({ caseAssociation: _ca(), rawEvidence: nodes || [_baseNode({})] }, _opts());
  if (!eg.valid) throw new Error('eg failed');
  var hs = HE.buildHypothesisSet({ graph: eg.graph }, _opts());
  if (!hs.valid) throw new Error('hs failed');
  var ps = PE.buildPrioritySet({ hypothesisSet: hs.hypothesisSet }, _opts());
  if (!ps.valid) throw new Error('ps failed');
  var eb = EB.buildEngineerBrief(Object.freeze({ hypothesisSet: hs.hypothesisSet, prioritySet: ps.prioritySet }), _opts());
  if (!eb.valid) throw new Error('eb failed: ' + JSON.stringify(eb).slice(0, 200));
  return { eg: eg.graph, hs: hs.hypothesisSet, ps: ps.prioritySet, eb: eb.engineerBrief };
}

// =============================================================================================
// Section A — ViewModel functional re-projection
// =============================================================================================
console.log('Section A — ViewModel functional re-projection');
(function () {
  var fix = _buildEnvelope();
  var r = VM.buildEngineerViewModel(fix.eb);
  chk('A1: valid viewmodel from authoritative envelope', r.valid === true);
  chk('A1: viewModel frozen', Object.isFrozen(r.viewModel));
  chk('A1: schemaVersion === 1', r.viewModel.schemaVersion === 1);
  chk('A1: viewModelId is string', typeof r.viewModel.viewModelId === 'string' && r.viewModel.viewModelId.length > 0);
  chk('A1: sourceBriefId === envelope.briefId', r.viewModel.sourceBriefId === fix.eb.briefId);
  chk('A1: sourceHypothesisSetId mirrors envelope', r.viewModel.sourceHypothesisSetId === fix.eb.sourceHypothesisSetId);
  chk('A1: sourcePrioritySetId mirrors envelope', r.viewModel.sourcePrioritySetId === fix.eb.sourcePrioritySetId);
  chk('A1: primaryIssue is a frozen { i18nKey, params }',
    Object.isFrozen(r.viewModel.primaryIssue)
      && typeof r.viewModel.primaryIssue.i18nKey === 'string');
  chk('A1: contradictions reference brief.contradictions (same ref)',
    r.viewModel.contradictions === fix.eb.brief.contradictions);
  chk('A1: cannotConcludeReasonCodes preserved (same ref)',
    r.viewModel.cannotConcludeReasonCodes === fix.eb.brief.cannotConcludeReasonCodes);
  chk('A1: credibility preserved', r.viewModel.credibility === fix.eb.brief.credibility);
  chk('A1: provenance preserved', r.viewModel.provenance === fix.eb.brief.provenance);
  chk('A1: activation reference preserved', r.viewModel.activation === fix.eb.activation);
})();

// =============================================================================================
// Section B — ViewModel authority gate
// =============================================================================================
console.log('Section B — ViewModel authority gate');
(function () {
  var fix = _buildEnvelope();
  // B1 — null / undefined
  chk('B1a: null envelope → blocked', VM.buildEngineerViewModel(null).valid === false);
  chk('B1b: undefined envelope → blocked', VM.buildEngineerViewModel(undefined).valid === false);
  chk('B1c: primitive → blocked', VM.buildEngineerViewModel('not-an-object').valid === false);

  // B2 — literal clone of envelope → rejected
  var clone = {};
  for (var k in fix.eb) clone[k] = fix.eb[k];
  Object.freeze(clone);
  chk('B2: cloned envelope rejected (different ref)', VM.buildEngineerViewModel(clone).valid === false);

  // B3 — structuredClone
  if (typeof structuredClone === 'function') {
    var sc = structuredClone(fix.eb);
    chk('B3: structuredClone envelope rejected', VM.buildEngineerViewModel(sc).valid === false);
  } else {
    chk('B3: structuredClone unavailable — skipped', true);
  }

  // B4 — JSON round-trip
  var jr = JSON.parse(JSON.stringify(fix.eb));
  Object.freeze(jr);
  chk('B4: JSON round-trip envelope rejected', VM.buildEngineerViewModel(jr).valid === false);

  // B5 — Proxy with hostile getter (verifier should not throw / fire trap)
  var trapCount = 0;
  var hostile = new Proxy({}, { get: function () { trapCount += 1; throw new Error('hostile'); } });
  var threw = false;
  var rh;
  try { rh = VM.buildEngineerViewModel(hostile); } catch (e) { threw = true; }
  chk('B5a: hostile Proxy does NOT throw', threw === false);
  chk('B5b: hostile Proxy returns blocked', rh && rh.valid === false);
  chk('B5c: hostile Proxy [[Get]] traps NEVER fired (verifier-first)', trapCount === 0);
})();

// =============================================================================================
// Section C — Display state derivation
// =============================================================================================
console.log('Section C — Display state derivation');
(function () {
  var fix = _buildEnvelope();
  // C1 — default derivation
  var r = VM.buildEngineerViewModel(fix.eb);
  chk('C1: displayState ∈ closed enum',
    VM.DISPLAY_STATE_ALLOWED.indexOf(r.viewModel.displayState) !== -1);

  // C2 — explicit displayHint 'loading'
  var rL = VM.buildEngineerViewModel(fix.eb, { displayHint: 'loading' });
  chk('C2: explicit loading hint accepted', rL.valid === true && rL.viewModel.displayState === 'loading');

  // C3 — explicit displayHint 'stale-cleared'
  var rS = VM.buildEngineerViewModel(fix.eb, { displayHint: 'stale-cleared' });
  chk('C3: stale-cleared hint accepted', rS.valid === true && rS.viewModel.displayState === 'stale-cleared');

  // C4 — invalid displayHint → blocked
  var rX = VM.buildEngineerViewModel(fix.eb, { displayHint: 'not-a-state' });
  chk('C4: invalid displayHint rejected', rX.valid === false);

  // C5 — opts with unknown key → blocked
  var rU = VM.buildEngineerViewModel(fix.eb, { hostileKey: true });
  chk('C5: unknown opts key rejected', rU.valid === false);

  // C6 — opts is not plain object → blocked
  var rP = VM.buildEngineerViewModel(fix.eb, 'not-plain');
  chk('C6: non-plain opts rejected', rP.valid === false);
})();

// =============================================================================================
// Section D — D5 ViewModel producer attestation
// =============================================================================================
console.log('Section D — ViewModel producer attestation');
(function () {
  var fix = _buildEnvelope();
  var r = VM.buildEngineerViewModel(fix.eb);
  chk('D1: authoritative viewmodel verified', VM.verifyAuthoritativeEngineerViewModel(r.viewModel) === true);

  // D2 — clone
  var clone = {};
  for (var k in r.viewModel) clone[k] = r.viewModel[k];
  Object.freeze(clone);
  chk('D2: cloned viewmodel rejected', VM.verifyAuthoritativeEngineerViewModel(clone) === false);

  // D3 — blocked viewmodel never registered as authoritative
  var blocked = VM.buildBlockedViewModel('blocked', [RC.REASON_CODES.STALE_EVIDENCE]);
  chk('D3a: blocked viewmodel has valid===false', blocked.valid === false);
  chk('D3b: blocked viewmodel NOT registered as authoritative',
    VM.verifyAuthoritativeEngineerViewModel(blocked) === false);

  // D4 — buildBlockedViewModel rejects success-like states
  var rA = VM.buildBlockedViewModel('available', []);
  chk('D4a: buildBlockedViewModel("available") rejected', rA.valid === false);
  var rI = VM.buildBlockedViewModel('inconclusive', []);
  chk('D4b: buildBlockedViewModel("inconclusive") rejected', rI.valid === false);

  // D5 — no register/secret/registry in API
  var apiKeys = Object.keys(VM);
  var leaks = apiKeys.filter(function (k) { return /^_?register/i.test(k) || /sign/i.test(k) || /secret/i.test(k) || /registry/i.test(k); });
  chk('D5: VM API does NOT expose register/sign/secret/registry', leaks.length === 0, leaks);
})();

// =============================================================================================
// Section E — Privacy
// =============================================================================================
console.log('Section E — Privacy');
(function () {
  var fix = _buildEnvelope();
  var r = VM.buildEngineerViewModel(fix.eb);
  var serialized = JSON.stringify(r.viewModel);
  chk('E1: no /Users/ in serialized viewmodel', serialized.indexOf('/Users/') === -1);
  chk('E2: no "at Object." stack frame', serialized.indexOf('at Object.') === -1);
  chk('E3: no large telemetry sample array', !/\[(?:-?\d+\.?\d*,){512,}/.test(serialized));
})();

// =============================================================================================
// Section F — HI ambient ban audit
// =============================================================================================
console.log('Section F — HI ambient ban audit');
(function () {
  var src = fs.readFileSync(__dirname + '/../renderer/js/r3-0d-engineer-viewmodel.js', 'utf8');
  var nocom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  chk('F1: no ambient `.every(`', nocom.indexOf('.every(') === -1);
  chk('F2: no ambient `.forEach(`', nocom.indexOf('.forEach(') === -1);
  chk('F3: no direct `.push(` outside HI namespace',
    (nocom.match(/[^A-Za-z_]\.push\(/g) || []).length === 0,
    (nocom.match(/[^A-Za-z_]\.push\(/g) || []).slice(0, 3));
  chk('F4: no bare `Object.freeze(`', !/[^a-zA-Z_]Object\.freeze\(/.test(nocom));
  chk('F5: no bare `Array.isArray(`', !/[^a-zA-Z_]Array\.isArray\(/.test(nocom));
})();

// =============================================================================================
// Section G — Orchestrator pipeline
// =============================================================================================
console.log('Section G — Orchestrator pipeline');
(function () {
  ORC.__test.resetForTests();
  var fix = _buildEnvelope();
  var r = ORC.prepareEngineerInsight({
    hypothesisSet: fix.hs,
    prioritySet: fix.ps,
    generationToken: 'gen_001',
  }, _opts());
  chk('G1: pipeline yields valid viewmodel', r.valid === true);
  chk('G2: currentState() returns non-null snapshot', ORC.currentState() !== null);
  chk('G3: currentState().valid === true', ORC.currentState().valid === true);
  chk('G4: currentState().generationToken === input token',
    ORC.currentState().generationToken === 'gen_001');
  chk('G5: getCurrentAuthoritativeViewModel verified by VM',
    VM.verifyAuthoritativeEngineerViewModel(ORC.getCurrentAuthoritativeViewModel()) === true);
  chk('G6: getCurrentAuthoritativeEnvelope verified by EB',
    EB.verifyAuthoritativeEngineerBrief(ORC.getCurrentAuthoritativeEnvelope()) === true);
})();

// =============================================================================================
// Section H — Generation token & stale-async drop
// =============================================================================================
console.log('Section H — Generation token & stale-async drop');
(function () {
  ORC.__test.resetForTests();
  var fix1 = _buildEnvelope();
  var r1 = ORC.prepareEngineerInsight({ hypothesisSet: fix1.hs, prioritySet: fix1.ps, generationToken: 'gen_001' }, _opts());
  chk('H1: first publish succeeds', r1.valid === true);

  // Invalidate then attempt another prepare with stale token
  ORC.invalidate('session_changed');
  chk('H2: after invalidate currentState reflects stale-cleared',
    ORC.currentState().displayState === 'stale-cleared');

  // Re-prepare with new token — should succeed
  var r2 = ORC.prepareEngineerInsight({ hypothesisSet: fix1.hs, prioritySet: fix1.ps, generationToken: 'gen_002' }, _opts());
  chk('H3: second publish with new token succeeds', r2.valid === true);
  chk('H4: currentState token reflects gen_002', ORC.currentState().generationToken === 'gen_002');
})();

// =============================================================================================
// Section I — Invalidate covers all reason codes
// =============================================================================================
console.log('Section I — invalidate covers all reasons');
(function () {
  var reasons = ORC.INVALIDATION_REASONS;
  for (var i = 0; i < reasons.length; i++) {
    ORC.__test.resetForTests();
    var fix = _buildEnvelope();
    ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'gen_' + i }, _opts());
    ORC.invalidate(reasons[i]);
    var snap = ORC.currentState();
    chk('I.' + reasons[i] + ': currentState displayState === "stale-cleared"',
      snap !== null && snap.displayState === 'stale-cleared');
  }
})();

// =============================================================================================
// Section J — Subscribe / unsubscribe / listener error isolation
// =============================================================================================
console.log('Section J — subscribe/unsubscribe');
(function () {
  ORC.__test.resetForTests();
  var calls = [];
  var unsub = ORC.subscribe(function (snap) { calls.push(snap.displayState); });
  var fix = _buildEnvelope();
  ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'gen_J1' }, _opts());
  chk('J1: subscriber notified on publish', calls.length === 1);
  ORC.invalidate('session_changed');
  chk('J2: subscriber notified on invalidate', calls.length === 2 && calls[1] === 'stale-cleared');

  unsub();
  ORC.invalidate('case_changed');
  chk('J3: unsubscribe stops notifications', calls.length === 2);

  // Listener that throws does NOT block other listeners
  ORC.__test.resetForTests();
  var safeCalls = 0;
  ORC.subscribe(function () { throw new Error('hostile listener'); });
  ORC.subscribe(function () { safeCalls += 1; });
  var fix2 = _buildEnvelope();
  ORC.prepareEngineerInsight({ hypothesisSet: fix2.hs, prioritySet: fix2.ps, generationToken: 'gen_J4' }, _opts());
  chk('J4: hostile listener does NOT block other listeners', safeCalls === 1);
})();

// =============================================================================================
// Section K — Sanitized errors (forged input)
// =============================================================================================
console.log('Section K — sanitized errors');
(function () {
  ORC.__test.resetForTests();
  // K1 — missing generationToken
  var fix = _buildEnvelope();
  var r1 = ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps }, _opts());
  chk('K1: missing generationToken → blocked', r1.valid === false);

  // K2 — non-string generationToken
  var r2 = ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 42 }, _opts());
  chk('K2: non-string generationToken rejected', r2.valid === false);

  // K3 — unknown input own key
  var r3 = ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'g', hostile: 'x' }, _opts());
  chk('K3: unknown input key rejected', r3.valid === false);

  // K4 — non-plain input
  var r4 = ORC.prepareEngineerInsight('not-plain', _opts());
  chk('K4: non-plain input rejected', r4.valid === false);

  // K5 — forged D3
  var rF = ORC.prepareEngineerInsight({ hypothesisSet: {}, prioritySet: fix.ps, generationToken: 'g' }, _opts());
  chk('K5: forged D3 rejected', rF.valid === false);
})();

// =============================================================================================
// Section L — Authoritative envelope leak protection
// =============================================================================================
console.log('Section L — authoritative envelope leak protection');
(function () {
  ORC.__test.resetForTests();
  var fix = _buildEnvelope();
  ORC.prepareEngineerInsight({ hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'gen_L1' }, _opts());
  var snap = ORC.currentState();
  // L1 — Subscriber snapshot is NOT authoritative
  chk('L1: subscriber snapshot is NOT authoritative (different ref / not in WeakSet)',
    VM.verifyAuthoritativeEngineerViewModel(snap) === false);
  // L2 — But getCurrentAuthoritativeViewModel IS
  chk('L2: getCurrentAuthoritativeViewModel IS authoritative',
    VM.verifyAuthoritativeEngineerViewModel(ORC.getCurrentAuthoritativeViewModel()) === true);
})();

// =============================================================================================
// Section M — Codex D5 R1 closures
// =============================================================================================
console.log('Section M — Codex D5 R1 closures');

// M1 — D5-R1-01 closure: bump _internalSeq at entry to prepareEngineerInsight so a stale
// in-flight result cannot overwrite newer state. We exercise this via a hostile clock that
// fires invalidate as a side-effect mid-build (simulating a stale async path returning after
// the orchestrator has been invalidated by a real event).
(function () {
  ORC.__test.resetForTests();
  var fix = _buildEnvelope();
  var listenerCalls = [];
  var unsub = ORC.subscribe(function (snap) { listenerCalls.push(snap.displayState); });

  // Hostile clock that invalidates mid-build. The clock runs AFTER the authority gates and
  // BEFORE the publish step (per the EB pipeline: freshness clock runs at Step 7, publish at
  // Step 12). When invalidate fires, _internalSeq bumps, and the orchestrator's publish gate
  // catches the seq mismatch (because the entry already bumped seq, and invalidate bumps
  // again, so seqAtEntry < _internalSeq at publish time → DROP).
  var hostileClock = function () {
    ORC.invalidate('session_changed');
    return '2026-06-29T01:00:00Z';
  };
  var r = ORC.prepareEngineerInsight({
    hypothesisSet: fix.hs,
    prioritySet: fix.ps,
    generationToken: 'gen_stale_test',
  }, { clock: hostileClock });

  chk('M1a: stale prepare result is dropped (does NOT publish over invalidate)',
    r.valid === false && r.displayState === 'stale-cleared');
  // The orchestrator should reflect the invalidate's stale-cleared state, not the prepare's
  // partial result. currentState() must show stale-cleared, not 'available'/'inconclusive'.
  var snap = ORC.currentState();
  chk('M1b: after stale drop, currentState.displayState === stale-cleared',
    snap !== null && snap.displayState === 'stale-cleared');
  chk('M1c: no authoritative envelope leaked (getCurrentAuthoritativeEnvelope === null)',
    ORC.getCurrentAuthoritativeEnvelope() === null);
  unsub();
})();

// M2 — Two prepare calls in sequence both succeed and the latter overwrites the former.
// This is the happy path that proves the seq bump does NOT introduce a regression.
(function () {
  ORC.__test.resetForTests();
  var fix = _buildEnvelope();
  var r1 = ORC.prepareEngineerInsight({
    hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'gen_M2_first',
  }, _opts());
  var r2 = ORC.prepareEngineerInsight({
    hypothesisSet: fix.hs, prioritySet: fix.ps, generationToken: 'gen_M2_second',
  }, _opts());
  chk('M2a: first prepare publishes', r1.valid === true);
  chk('M2b: second prepare publishes (does not stale-drop the legitimate replay)',
    r2.valid === true);
  chk('M2c: currentState reflects second token',
    ORC.currentState().generationToken === 'gen_M2_second');
})();

// M3 — D5-R1-02 closure: render-only UI source has NO innerHTML assignment.
(function () {
  var src = fs.readFileSync(__dirname + '/../renderer/js/r3-0d-engineer-ui.js', 'utf8');
  var nocom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  chk('M3a: no `.innerHTML =` assignment in r3-0d-engineer-ui.js',
    !/\.innerHTML\s*=/.test(nocom),
    (nocom.match(/\.innerHTML\s*=[^\n]*/g) || []).slice(0, 3));
  chk('M3b: no `.outerHTML =` assignment either',
    !/\.outerHTML\s*=/.test(nocom));
  chk('M3c: no `insertAdjacentHTML(`',
    !/\.insertAdjacentHTML\(/.test(nocom));
})();

// M4 — D5-R1-03 closure: D5.json authorizedPaths is the exact superset that includes
// feature-registry.js (required for feature_registry_active capability activation).
(function () {
  var fs2 = require('fs');
  var d5 = JSON.parse(fs2.readFileSync(__dirname + '/../governance/r3.0d/checkpoints/D5.json', 'utf8'));
  var paths = (d5.authorizedPaths || []).map(function (e) { return e.path; });
  chk('M4a: D5.json authorizes renderer/js/feature-registry.js',
    paths.indexOf('renderer/js/feature-registry.js') !== -1, paths);
  chk('M4b: D5.json authorizes renderer/js/r3-0d-contracts-bundle.js',
    paths.indexOf('renderer/js/r3-0d-contracts-bundle.js') !== -1, paths);
  chk('M4c: D5.json authorizes all 5 D5 production modules',
    paths.indexOf('renderer/js/r3-0d-engineer-brief.js') !== -1
      && paths.indexOf('renderer/js/r3-0d-engineer-viewmodel.js') !== -1
      && paths.indexOf('renderer/js/r3-0d-engineer-orchestrator.js') !== -1
      && paths.indexOf('renderer/js/r3-0d-engineer-ui.js') !== -1
      && paths.indexOf('renderer/js/i18n-r3-0d.js') !== -1, paths);
  // The D5.json authorizedPaths must be a SUPERSET of state.json's authorizedProductionPaths.
  var st = JSON.parse(fs2.readFileSync(__dirname + '/../governance/r3.0d/state.json', 'utf8'));
  var stPaths = (st.authorizedProductionPaths || []).map(function (e) { return e.path; });
  var stateMinusD5 = stPaths.filter(function (p) { return paths.indexOf(p) === -1; });
  chk('M4d: every state.json authorizedProductionPath appears in D5.json authorizedPaths',
    stateMinusD5.length === 0, stateMinusD5);
})();

// =============================================================================================
// Done
// =============================================================================================
console.log('R3.0D D5 viewmodel + orchestrator adversarial suite: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
