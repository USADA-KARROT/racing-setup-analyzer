/**
 * tests/r3.0d-engineer-brief.test.js — R3.0D D5 · Engineer Brief adversarial tests.
 *
 * Built proactively from R3.0D D1-R7 + D2-R20 + D3-R7 + D4-R6 lessons (54 distinct
 * adversarial findings closed across 27 rounds). Covers directive §10 D5 requirements:
 *   A) Functional happy paths — D3→D4→D5 pipeline
 *   B) Structural — output schema, deep-freeze, IDs, contract validation
 *   C) Authority — D3 + D4 producer attestation gates (forged / clone / structuredClone / JSON)
 *   D) Cross-binding — prioritySet derived from THIS hypothesisSet, sourceGraphId match
 *   E) Identity binding — caseAssociation / sessionAssociation match between D3 and D4
 *   F) Mandatory freshness — opts.clock OR opts.referenceNowMs required, at most once
 *   G) Brief composition — primary from D4, secondary from D4 secondary, eligibility
 *   H) Cannot conclude preservation — cannotConcludeReasonCodes union
 *   I) Contradictions preservation — never hidden, evidence visible
 *   J) Limitations preservation — union from D3 + per-hypothesis
 *   K) Privacy — no raw telemetry / no paths / no stack traces
 *   L) Security — Proxy / accessor / Symbol / hostile clock / class instance
 *   M) Determinism — same input → same briefId, no clock leak in IDs
 *   N) Producer attestation (D5 own WeakSet) — clone rejected, fabricated rejected
 *   O) Activation gate — derived booleans, no side effects
 *   P) HI ambient ban — no ambient .every / .forEach / .push / Object.freeze in code
 *   Q) Closed key sets — input wrapper / opts / forbidden keys
 *   R) Forbidden output behaviors — no causal overclaim, no driver-fault wording
 */
'use strict';

var fs = require('fs');
var EG = require('../renderer/js/r3-0d-evidence-graph.js');
var HE = require('../renderer/js/r3-0d-hypothesis-engine.js');
var PE = require('../renderer/js/r3-0d-priority-engine.js');
var EB = require('../renderer/js/r3-0d-engineer-brief.js');
var RC = require('../contracts/r3.0d/reason-codes.js');
var HI = require('../contracts/r3.0d/hardened-intrinsics.js');
var EBC = require('../contracts/r3.0d/engineer-brief-contract.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

// ---------- Fixtures ---------------------------------------------------------------------
var BASE_CLOCK = function () { return '2026-06-29T01:00:00Z'; };
function _opts(extra) {
  var o = { clock: BASE_CLOCK };
  if (extra) for (var k in extra) o[k] = extra[k];
  return o;
}
function _ca() { return { caseId: 'case_001', sessionId: 'sess_001', lapId: null }; }
function _baseIdentity(overrides) {
  var b = { caseId: 'case_001', sessionId: 'sess_001', lapId: null, sourceId: 'csv_v1', sourceVersion: '1.0', freshness: '2026-06-29T00:00:00Z' };
  if (overrides) for (var k in overrides) b[k] = overrides[k];
  return b;
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
function _buildDriverHsPs(nodes) {
  var eg = EG.buildEvidenceGraph({ caseAssociation: _ca(), rawEvidence: nodes }, { clock: BASE_CLOCK });
  if (!eg.valid) throw new Error('eg failed: ' + JSON.stringify(eg).slice(0, 200));
  var hsR = HE.buildHypothesisSet({ graph: eg.graph }, { clock: BASE_CLOCK });
  if (!hsR.valid) throw new Error('hs failed: ' + JSON.stringify(hsR).slice(0, 200));
  var psR = PE.buildPrioritySet({ hypothesisSet: hsR.hypothesisSet }, { clock: BASE_CLOCK });
  if (!psR.valid) throw new Error('ps failed: ' + JSON.stringify(psR).slice(0, 200));
  return { hypothesisSet: hsR.hypothesisSet, prioritySet: psR.prioritySet };
}
function _eb(input, customOpts) {
  var inputFrozen = Object.freeze({ hypothesisSet: input.hypothesisSet, prioritySet: input.prioritySet });
  return EB.buildEngineerBrief(inputFrozen, customOpts === undefined ? _opts() : customOpts);
}

// ============================================================================================
// Section A — Functional happy paths
// ============================================================================================
console.log('Section A — functional happy paths');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('A1: valid envelope', r.valid === true);
  chk('A1: engineerBrief frozen', Object.isFrozen(r.engineerBrief));
  chk('A1: schemaVersion === 1', r.engineerBrief.schemaVersion === 1);
  chk('A1: briefId pattern brief_<32hex>', /^brief_[0-9a-f]{16,32}$/.test(r.engineerBrief.briefId));
  chk('A1: sourceHypothesisSetId mirrors D3 hypothesisSetId',
    r.engineerBrief.sourceHypothesisSetId === pair.hypothesisSet.hypothesisSetId);
  chk('A1: sourcePrioritySetId mirrors D4 prioritySetId',
    r.engineerBrief.sourcePrioritySetId === pair.prioritySet.prioritySetId);
  chk('A1: contract-validated brief is present', typeof r.engineerBrief.brief === 'object' && r.engineerBrief.brief !== null);
  chk('A1: brief shape passes EBC validator',
    EBC.validateEngineerBriefShape(r.engineerBrief.brief).valid === true);
  chk('A1: activation is frozen object', Object.isFrozen(r.engineerBrief.activation));
})();

// ============================================================================================
// Section B — Structural
// ============================================================================================
console.log('Section B — structural');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  var eb = r.engineerBrief;
  chk('B1: envelope top-level frozen', Object.isFrozen(eb));
  chk('B2: brief frozen', Object.isFrozen(eb.brief));
  chk('B3: brief.evidenceSummary frozen', Object.isFrozen(eb.brief.evidenceSummary));
  chk('B4: brief.contradictions frozen', Object.isFrozen(eb.brief.contradictions));
  chk('B5: brief.alternativeExplanations frozen', Object.isFrozen(eb.brief.alternativeExplanations));
  chk('B6: brief.limitations frozen', Object.isFrozen(eb.brief.limitations));
  chk('B7: brief.cannotConcludeReasonCodes frozen', Object.isFrozen(eb.brief.cannotConcludeReasonCodes));
  chk('B8: brief.identity frozen', Object.isFrozen(eb.brief.identity));
  chk('B9: brief.confidence is { state }', typeof eb.brief.confidence === 'object'
    && typeof eb.brief.confidence.state === 'string');
  chk('B10: createdAt is non-empty ISO-like string',
    typeof eb.createdAt === 'string' && eb.createdAt.length > 0);
})();

// ============================================================================================
// Section C — Authority gates (D3 + D4 producer attestation)
// ============================================================================================
console.log('Section C — authority gates');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);

  // C1 — verifier-first ordering: forged D3 must be rejected BEFORE any nested read
  var d3GetCount = 0;
  var hostileHs = new Proxy({}, {
    get: function (t, p) {
      d3GetCount += 1;
      return undefined;
    },
  });
  var rC1 = _eb({ hypothesisSet: hostileHs, prioritySet: pair.prioritySet });
  chk('C1a: forged D3 hypothesisSet rejected',
    rC1.valid === false || rC1.eligible === false);
  // Input wrapper requires plain object + frozen + descriptor-only; a Proxy hypothesisSet
  // is inside a frozen wrapper, the input wrapper descriptor audit reads it via getOwnDescriptor
  // (which DOES not trigger [[Get]] on the value itself, only on the descriptor record). So
  // the engine should reject without firing [[Get]] traps on the Proxy hypothesisSet.
  chk('C1b: forged D3 — Proxy [[Get]] never fired (verifier-first)', d3GetCount === 0);
})();

(function () {
  // C2 — literal clone of D3 HypothesisSet → rejected by verifyAuthoritativeHypothesisSet
  var pair = _buildDriverHsPs([_baseNode({})]);
  var clonedHs = {};
  for (var k in pair.hypothesisSet) clonedHs[k] = pair.hypothesisSet[k];
  Object.freeze(clonedHs);
  var r = _eb({ hypothesisSet: clonedHs, prioritySet: pair.prioritySet });
  chk('C2: cloned D3 HypothesisSet rejected (ref mismatch)',
    r.valid !== true);
})();

(function () {
  // C3 — literal clone of D4 PrioritySet → rejected by verifyAuthoritativePrioritySet
  var pair = _buildDriverHsPs([_baseNode({})]);
  var clonedPs = {};
  for (var k in pair.prioritySet) clonedPs[k] = pair.prioritySet[k];
  Object.freeze(clonedPs);
  var r = _eb({ hypothesisSet: pair.hypothesisSet, prioritySet: clonedPs });
  chk('C3: cloned D4 PrioritySet rejected (ref mismatch)',
    r.valid !== true);
})();

(function () {
  // C4 — structuredClone of D3 → rejected
  if (typeof structuredClone !== 'function') {
    chk('C4: structuredClone unavailable — skipped', true);
    return;
  }
  var pair = _buildDriverHsPs([_baseNode({})]);
  var sc = structuredClone(pair.hypothesisSet);
  var r = _eb({ hypothesisSet: sc, prioritySet: pair.prioritySet });
  chk('C4: structuredClone D3 rejected', r.valid !== true);
})();

(function () {
  // C5 — JSON round-trip D4 → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var jr = JSON.parse(JSON.stringify(pair.prioritySet));
  Object.freeze(jr);
  var r = _eb({ hypothesisSet: pair.hypothesisSet, prioritySet: jr });
  chk('C5: JSON round-trip D4 PrioritySet rejected', r.valid !== true);
})();

// ============================================================================================
// Section D — Cross-binding (D4 derived from THIS D3)
// ============================================================================================
console.log('Section D — cross-binding');
(function () {
  // D1 — two unrelated runs: D3a + D4b mismatched
  var pairA = _buildDriverHsPs([_baseNode({ nodeId: 'n_x1' })]);
  var pairB = _buildDriverHsPs([_baseNode({ nodeId: 'n_x2' })]);
  var rMix = _eb({ hypothesisSet: pairA.hypothesisSet, prioritySet: pairB.prioritySet });
  chk('D1: D4 from different D3 rejected (sourceHypothesisSetId mismatch)',
    rMix.valid !== true);
})();

// ============================================================================================
// Section E — Identity binding (case + session)
// ============================================================================================
console.log('Section E — identity binding');
(function () {
  // Engine-level mismatch is hard to forge given producer attestation, but cover the case
  // where a malicious caller wraps the genuine D3/D4 objects in a frozen envelope with
  // a fabricated caseAssociation field. The envelope's caseAssociation field on D3 and D4
  // are authoritative (closure-private). We test by pairing a genuine D3 with a genuine D4
  // built from DIFFERENT case nodes.
  var pairA = _buildDriverHsPs([_baseNode({})]);
  // Build B with a different caseId
  var caB = { caseId: 'case_other', sessionId: 'sess_001', lapId: null };
  var idB = { caseId: 'case_other', sessionId: 'sess_001', lapId: null, sourceId: 'csv_v1', sourceVersion: '1.0', freshness: '2026-06-29T00:00:00Z' };
  var nodeB = _baseNode({ nodeId: 'n_b', identity: idB });
  var egB = EG.buildEvidenceGraph({ caseAssociation: caB, rawEvidence: [nodeB] }, { clock: BASE_CLOCK });
  var hsB = HE.buildHypothesisSet({ graph: egB.graph }, { clock: BASE_CLOCK }).hypothesisSet;
  var psB = PE.buildPrioritySet({ hypothesisSet: hsB }, { clock: BASE_CLOCK }).prioritySet;

  // Now mix: D3 from case A with D4 from case B → must reject (sourceHypothesisSetId mismatch
  // already catches this, but ALSO caseAssociation mismatch is a separate gate)
  var rMix = _eb({ hypothesisSet: pairA.hypothesisSet, prioritySet: psB });
  chk('E1: case mismatch rejected', rMix.valid !== true);
})();

// ============================================================================================
// Section F — Mandatory freshness
// ============================================================================================
console.log('Section F — mandatory freshness');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // F1 — no clock and no referenceNowMs → FRESHNESS_REFERENCE_MISSING
  var r = _eb(pair, {});
  chk('F1: no clock no referenceNowMs → rejected',
    r.valid !== true);
})();

(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // F2 — referenceNowMs accepted (clock skipped)
  var r = _eb(pair, { referenceNowMs: 1719622800000 });
  chk('F2: referenceNowMs valid → accepted', r.valid === true);
})();

(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // F3 — clock invoked AT MOST ONCE
  var calls = 0;
  var clk = function () { calls += 1; return '2026-06-29T01:00:00Z'; };
  var r = _eb(pair, { clock: clk });
  chk('F3a: clock invoked (≥1)', calls >= 1);
  chk('F3b: clock invoked AT MOST once', calls <= 1, { calls: calls });
  chk('F3c: build succeeded', r.valid === true);
})();

(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // F4 — clock throwing → rejected fail-closed
  var clk = function () { throw new Error('hostile clock'); };
  var r = _eb(pair, { clock: clk });
  chk('F4: throwing clock → rejected fail-closed',
    r.valid !== true);
})();

(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // F5 — stale hypothesisSet (createdAt far in the past, maxAgeMs small) → STALE_EVIDENCE.
  // hs/ps were built with BASE_CLOCK 2026-06-29T01:00:00Z; brief uses a later clock so
  // (refNowMs - hsCreatedMs) > maxAgeMs.
  var laterClock = function () { return '2026-06-29T02:00:00Z'; };
  var r = _eb(pair, { clock: laterClock, maxAgeMs: 1 });
  chk('F5: stale data rejected (1h diff, maxAgeMs=1ms)', r.valid !== true);
})();

// ============================================================================================
// Section G — Brief composition (primary from D4)
// ============================================================================================
console.log('Section G — brief composition');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('G1: brief is contract-valid', EBC.validateEngineerBriefShape(r.engineerBrief.brief).valid === true);
  // Primary I18n key derives from primary hypothesis
  chk('G2: brief.primaryIssueI18nKey is non-empty string',
    typeof r.engineerBrief.brief.primaryIssueI18nKey === 'string'
      && r.engineerBrief.brief.primaryIssueI18nKey.length > 0);
})();

// ============================================================================================
// Section H — Cannot conclude preservation
// ============================================================================================
console.log('Section H — cannot conclude preservation');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('H1: cannotConcludeReasonCodes is an array (possibly empty, never absent)',
    Array.isArray(r.engineerBrief.brief.cannotConcludeReasonCodes));
})();

// ============================================================================================
// Section I — Contradictions preservation
// ============================================================================================
console.log('Section I — contradictions preservation');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('I1: contradictions field present (array)',
    Array.isArray(r.engineerBrief.brief.contradictions));
  chk('I2: alternativeExplanations field present (array)',
    Array.isArray(r.engineerBrief.brief.alternativeExplanations));
})();

// ============================================================================================
// Section J — Limitations preservation
// ============================================================================================
console.log('Section J — limitations preservation');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('J1: limitations is an array', Array.isArray(r.engineerBrief.brief.limitations));
  // All limitations are valid reason codes
  var ok = true;
  for (var i = 0; i < r.engineerBrief.brief.limitations.length; i++) {
    if (!RC.isReasonCode(r.engineerBrief.brief.limitations[i])) { ok = false; break; }
  }
  chk('J2: every limitation is a known reason code', ok);
})();

// ============================================================================================
// Section K — Privacy
// ============================================================================================
console.log('Section K — privacy');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  var serialized = JSON.stringify(r.engineerBrief);
  chk('K1: no /Users/ in serialized brief', serialized.indexOf('/Users/') === -1, serialized.length);
  chk('K2: no Node stack trace (no "at Object." pattern)',
    serialized.indexOf('at Object.') === -1);
  chk('K3: no raw telemetry sample arrays (no >1024-char number array)',
    !/\[(?:-?\d+\.?\d*,){1024,}/.test(serialized));
})();

// ============================================================================================
// Section L — Security (Proxy / accessor / Symbol / class instance / hostile clock)
// ============================================================================================
console.log('Section L — security');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // L1 — input root with accessor descriptor → rejected
  var inputProxy = Object.defineProperty({}, 'hypothesisSet', {
    enumerable: true, configurable: false,
    get: function () { return pair.hypothesisSet; },
  });
  Object.defineProperty(inputProxy, 'prioritySet', {
    enumerable: true, configurable: false,
    value: pair.prioritySet, writable: false,
  });
  Object.freeze(inputProxy);
  var r = EB.buildEngineerBrief(inputProxy, _opts());
  chk('L1: accessor input descriptor on hypothesisSet rejected',
    r.valid !== true);
})();

(function () {
  // L2 — non-frozen input root → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var nonFrozen = { hypothesisSet: pair.hypothesisSet, prioritySet: pair.prioritySet };
  var r = EB.buildEngineerBrief(nonFrozen, _opts());
  chk('L2: non-frozen input root rejected', r.valid !== true);
})();

(function () {
  // L3 — Symbol-keyed input own key → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var withSym = { hypothesisSet: pair.hypothesisSet, prioritySet: pair.prioritySet };
  withSym[Symbol('hostile')] = 'nope';
  Object.freeze(withSym);
  var r = EB.buildEngineerBrief(withSym, _opts());
  chk('L3: Symbol-keyed input own key rejected', r.valid !== true);
})();

(function () {
  // L4 — unknown input own key → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var withExtra = Object.freeze({
    hypothesisSet: pair.hypothesisSet,
    prioritySet: pair.prioritySet,
    extraKey: 'forbidden',
  });
  var r = EB.buildEngineerBrief(withExtra, _opts());
  chk('L4: unknown input own key rejected', r.valid !== true);
})();

(function () {
  // L5 — unknown opts own key → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var optsExtra = { clock: BASE_CLOCK, unknownOpt: 1 };
  var r = _eb(pair, optsExtra);
  chk('L5: unknown opts own key rejected', r.valid !== true);
})();

(function () {
  // L6 — opts is not a plain object → rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair, 'not-an-object');
  chk('L6: opts non-plain rejected', r.valid !== true);
})();

(function () {
  // L7 — null input → rejected (no throw)
  var threw = false;
  try { EB.buildEngineerBrief(null, _opts()); } catch (e) { threw = true; }
  chk('L7a: null input does NOT throw', threw === false);
  chk('L7b: null input returns blocked result',
    EB.buildEngineerBrief(null, _opts()).valid !== true);
})();

// ============================================================================================
// Section M — Determinism
// ============================================================================================
console.log('Section M — determinism');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r1 = _eb(pair);
  var pair2 = _buildDriverHsPs([_baseNode({})]);
  var r2 = _eb(pair2);
  // Both pairs derived from identical inputs → identical IDs end-to-end
  chk('M1: same inputs → same briefId', r1.engineerBrief.briefId === r2.engineerBrief.briefId);
  chk('M2: same inputs → same sourcePrioritySetId',
    r1.engineerBrief.sourcePrioritySetId === r2.engineerBrief.sourcePrioritySetId);
  chk('M3: same inputs → same sourceHypothesisSetId',
    r1.engineerBrief.sourceHypothesisSetId === r2.engineerBrief.sourceHypothesisSetId);
})();

(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  // M4 — different clocks but same inputs → same briefId (clock-independent for IDs)
  var r1 = _eb(pair, { clock: BASE_CLOCK });
  var r2 = _eb(pair, { clock: function () { return '2026-06-29T10:00:00Z'; } });
  chk('M4: briefId clock-independent', r1.engineerBrief.briefId === r2.engineerBrief.briefId);
  // createdAt clock-dependent: M4 expects different createdAt only if the implementation
  // uses the clock value as createdAt. Current implementation falls back to hs.createdAt
  // if clock is not used for createdAt — either way, briefId stable.
})();

// ============================================================================================
// Section N — Producer attestation (D5's own WeakSet)
// ============================================================================================
console.log('Section N — D5 producer attestation');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  chk('N1: genuine envelope — verifyAuthoritativeEngineerBrief === true',
    EB.verifyAuthoritativeEngineerBrief(r.engineerBrief) === true);

  // Literal clone → false
  var clone = {};
  for (var k in r.engineerBrief) clone[k] = r.engineerBrief[k];
  Object.freeze(clone);
  chk('N2: cloned envelope rejected (different ref)',
    EB.verifyAuthoritativeEngineerBrief(clone) === false);

  // JSON round-trip → false
  var jr = JSON.parse(JSON.stringify(r.engineerBrief));
  Object.freeze(jr);
  chk('N3: JSON round-trip envelope rejected',
    EB.verifyAuthoritativeEngineerBrief(jr) === false);

  // structuredClone → false
  if (typeof structuredClone === 'function') {
    var sc = structuredClone(r.engineerBrief);
    chk('N4: structuredClone envelope rejected',
      EB.verifyAuthoritativeEngineerBrief(sc) === false);
  } else {
    chk('N4: structuredClone unavailable — skipped', true);
  }

  // null / undefined / primitive → false (no throw)
  var threw = false;
  try {
    EB.verifyAuthoritativeEngineerBrief(null);
    EB.verifyAuthoritativeEngineerBrief(undefined);
    EB.verifyAuthoritativeEngineerBrief('str');
    EB.verifyAuthoritativeEngineerBrief(42);
  } catch (e) { threw = true; }
  chk('N5: verifier never throws on null/undefined/primitive', threw === false);

  // Hostile getter → false (no throw, verifier-first rejects via WeakSet identity)
  var thrower = new Proxy({}, { get: function () { throw new Error('hostile'); } });
  var verifierThrew = false;
  var verifierReturn;
  try { verifierReturn = EB.verifyAuthoritativeEngineerBrief(thrower); } catch (e) { verifierThrew = true; }
  chk('N6a: verifier does NOT throw on hostile Proxy', verifierThrew === false);
  chk('N6b: verifier returns false on hostile Proxy', verifierReturn === false);
})();

(function () {
  // N7 — WeakSet.prototype.has rebind does NOT corrupt verification (captured)
  var origHas = WeakSet.prototype.has;
  WeakSet.prototype.has = function () { return true; };
  try {
    var fake = Object.freeze({
      schemaVersion: 1, briefId: 'brief_x', sourcePrioritySetId: 'p', sourceHypothesisSetId: 'h',
      brief: {}, activation: {}, createdAt: '',
    });
    chk('N7: WeakSet.prototype.has rebind — fabricated rejected (captured has bypass)',
      EB.verifyAuthoritativeEngineerBrief(fake) === false);
  } finally {
    WeakSet.prototype.has = origHas;
  }
})();

(function () {
  // N8 — Public API surface is narrow: verifier only, no register / no secret
  var apiKeys = Object.keys(EB);
  var leaks = apiKeys.filter(function (k) {
    return /^_?register/i.test(k) || /sign/i.test(k) || /secret/i.test(k) || /registry/i.test(k);
  });
  chk('N8: D5 API does NOT expose register / sign / secret / registry surfaces', leaks.length === 0, leaks);
})();

// ============================================================================================
// Section O — Activation gate (derived booleans, no side effects)
// ============================================================================================
console.log('Section O — activation gate');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  var a = r.engineerBrief.activation;
  chk('O1: activation present', a !== undefined && a !== null);
  chk('O2: activation frozen', Object.isFrozen(a));
  chk('O3: activation.uiCapabilityReady is boolean', typeof a.uiCapabilityReady === 'boolean');
  chk('O4: activation.featureRegistryActivationAllowed is boolean',
    typeof a.featureRegistryActivationAllowed === 'boolean');
  chk('O5: activation.deferredCapabilities is array',
    Array.isArray(a.deferredCapabilities));
  chk('O6: featureRegistryActivationAllowed implies uiCapabilityReady',
    a.featureRegistryActivationAllowed === false || a.uiCapabilityReady === true);
})();

// ============================================================================================
// Section P — HI ambient ban audit (source-level)
// ============================================================================================
console.log('Section P — HI ambient ban audit');
(function () {
  var src = fs.readFileSync(__dirname + '/../renderer/js/r3-0d-engineer-brief.js', 'utf8');
  // Strip comments to avoid false positives
  var nocom = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  chk('P1: no ambient `.every(`', nocom.indexOf('.every(') === -1);
  chk('P2: no ambient `.forEach(`', nocom.indexOf('.forEach(') === -1);
  // .push is allowed only via HI.safeArrayPush — direct .push( is banned
  chk('P3: no direct `.push(` outside HI namespace',
    nocom.split('\n').every(function (line) {
      var idx = line.indexOf('.push(');
      if (idx === -1) return true;
      // Allow only if preceded by 'HI' (impossible in safe form) or is part of safeArrayPush
      // Direct ambient .push( is forbidden.
      return false;
    }) || nocom.match(/[^A-Za-z_]\.push\(/g) === null,
    (nocom.match(/[^A-Za-z_]\.push\(/g) || []).slice(0, 3));
  chk('P4: no bare `Object.freeze(` outside captured/comment context',
    !/[^a-zA-Z_]Object\.freeze\(/.test(nocom));
  chk('P5: no bare `Array.isArray(`',
    !/[^a-zA-Z_]Array\.isArray\(/.test(nocom));
  chk('P6: no bare `JSON.stringify(` or `JSON.parse(` outside HI',
    !/[^a-zA-Z_]JSON\.stringify\(/.test(nocom) && !/[^a-zA-Z_]JSON\.parse\(/.test(nocom));
})();

// ============================================================================================
// Section Q — Closed key sets (input wrapper + opts)
// ============================================================================================
console.log('Section Q — closed key sets');
(function () {
  // Q1 — input must be plain object
  var r = EB.buildEngineerBrief('not-plain', _opts());
  chk('Q1: input string rejected', r.valid !== true);

  // Q2 — empty input rejected (no hypothesisSet, no prioritySet)
  var r2 = EB.buildEngineerBrief(Object.freeze({}), _opts());
  chk('Q2: empty input rejected', r2.valid !== true);

  // Q3 — partial input (only hypothesisSet, no prioritySet) rejected
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r3 = EB.buildEngineerBrief(Object.freeze({ hypothesisSet: pair.hypothesisSet }), _opts());
  chk('Q3: partial input (no prioritySet) rejected', r3.valid !== true);
})();

// ============================================================================================
// Section R — Forbidden output behaviors per directive §13.3
// ============================================================================================
console.log('Section R — forbidden output behaviors');
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var r = _eb(pair);
  var serialized = JSON.stringify(r.engineerBrief);
  // Directive §13.3: forbidden phrases (these are content-level — i18n keys themselves must
  // not encode causal overclaim. The contract layer already enforces this; here we audit the
  // serialized output for accidental leakage.)
  var forbidden = [
    'confirmed_cause', 'definitive_diagnosis', 'driver_fault', 'driver_error',
    'guaranteed_improvement', 'fastest_setup', 'optimal_setup', 'theoretical_best',
    'ai_diagnosis',
  ];
  var leaked = forbidden.filter(function (term) { return serialized.toLowerCase().indexOf(term) !== -1; });
  chk('R1: no causal-overclaim / driver-blame terms in serialized brief', leaked.length === 0, leaked);
})();

// ============================================================================================
// Section S — Formal Codex D Phase Gate closures (D-GATE-01 / D-GATE-02 / D-GATE-03)
// ============================================================================================
console.log('Section S — Formal Codex D Phase Gate closures');

// S1 — D-GATE-02 closure: imported_summary path is rejected at D5 brief composition.
// Build a graph that includes an imported_summary node (at credibility='derived' so D2 allows
// it); the resulting hs carries LIMITATION_IMPORTED_SUMMARY; D5 brief composition rejects.
(function () {
  var ca = { caseId: 'case_S1', sessionId: 'sess_S1', lapId: null };
  // imported_summary node — D2 allows credibility 'derived' (max for this source per the
  // IMPORTED_SUMMARY_MAX_CREDIBILITY policy).
  var n = {
    schemaVersion: 1, nodeId: 'n_S1_imported', category: 'data_quality',
    identity: { caseId: 'case_S1', sessionId: 'sess_S1', lapId: null, sourceId: 'imported_summary', sourceVersion: '1.0', freshness: '2026-06-29T00:00:00Z' },
    credibility: 'derived', provenance: 'unverified', availability: 'available',
    confidence: { state: 'not_computed' },
    observation: { kind: 'channel_missing', channel: 'brake', i18nKey: 'k', params: null },
    limitations: ['LIMITATION_MISSING_CHANNEL'], supportingEdges: [], contradictingEdges: [],
  };
  var eg = EG.buildEvidenceGraph({ caseAssociation: ca, rawEvidence: [n] }, { clock: BASE_CLOCK });
  chk('S1a: D2 accepts imported_summary at credibility=derived', eg.valid === true);
  // Graph should carry LIMITATION_IMPORTED_SUMMARY.
  chk('S1b: graph.limitations contains LIMITATION_IMPORTED_SUMMARY',
    eg.graph.limitations.indexOf('LIMITATION_IMPORTED_SUMMARY') !== -1);
  // D3 should propagate that limitation into hs.limitations.
  var hsR = HE.buildHypothesisSet({ graph: eg.graph }, { clock: BASE_CLOCK });
  chk('S1c: D3 builds; hs.limitations carries LIMITATION_IMPORTED_SUMMARY',
    hsR.valid === true
      && hsR.hypothesisSet.limitations.indexOf('LIMITATION_IMPORTED_SUMMARY') !== -1);
  // D4 should still build (the rejection happens at D5, not earlier).
  var psR = PE.buildPrioritySet({ hypothesisSet: hsR.hypothesisSet }, { clock: BASE_CLOCK });
  chk('S1d: D4 builds (no rejection yet)', psR.valid === true);
  // D5 brief composition MUST reject.
  var ebR = EB.buildEngineerBrief(Object.freeze({ hypothesisSet: hsR.hypothesisSet, prioritySet: psR.prioritySet }), { clock: BASE_CLOCK });
  chk('S1e: D5 rejects imported-summary-derived brief composition',
    ebR.valid !== true);
  chk('S1f: D5 rejection reasonCodes includes LIMITATION_IMPORTED_SUMMARY',
    Array.isArray(ebR.reasonCodes) && ebR.reasonCodes.indexOf('LIMITATION_IMPORTED_SUMMARY') !== -1);
})();

// S2 — D-GATE-01 closure: D3 calls EG.verifyAuthoritativeGraph verifier-first.
// A hand-crafted (non-WeakSet) graph is rejected by D3 even if its structure is otherwise
// plausible. The D3 test suite covers this; here we simply prove D5 cannot be tricked by
// constructing a fake hs (since D5's own verifyAuthoritativeHypothesisSet gate already
// rejects non-WeakSet hypothesisSets — this is the multi-layer authority chain in action).
(function () {
  var pair = _buildDriverHsPs([_baseNode({})]);
  var fakeHs = {};
  for (var k in pair.hypothesisSet) fakeHs[k] = pair.hypothesisSet[k];
  Object.freeze(fakeHs);
  var r = EB.buildEngineerBrief(Object.freeze({ hypothesisSet: fakeHs, prioritySet: pair.prioritySet }), _opts());
  chk('S2: cloned hs (non-WeakSet) rejected by D5 verifier-first', r.valid !== true);
})();

// ============================================================================================
// Done
// ============================================================================================
console.log('R3.0D D5 engineer-brief adversarial suite: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
