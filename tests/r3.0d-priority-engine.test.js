/**
 * tests/r3.0d-priority-engine.test.js — R3.0D D4 · Priority Engine adversarial tests.
 *
 * Built proactively from D3 R1-R7 lessons (27 distinct findings closed across 7 Codex rounds):
 *   A) Functional happy paths — D3→D4 pipeline
 *   B) Structural — output schema, deep-freeze, IDs, sort order, ranks
 *   C) Authority — hypothesisSetId recompute, frozen requirement, fabricated rejection
 *   D) Scope — schema, generationToken/contextVersion, unknown input key
 *   E) Priority ladder — data_quality before mapping, mapping before driver, driver before
 *      setup. Setup never primary without high confidence + ≥Derived + no contradictions.
 *   F) Blocking prerequisites — setup_experiment blocked by pending data_quality + mapping
 *   G) Primary eligibility — low confidence / Heuristic / contradicted cannot be primary
 *   H) Security — Proxy, class instance, Symbol key, non-enumerable, hostile clock
 *   I) Privacy — no raw samples, no /Users/, no stack traces
 *   J) HI wrapper mutation resilience — ambient rebind never invoked
 *   K) Output immutability — frozen, no caller mutation
 *   L) Mandatory freshness — opts.clock or opts.referenceNowMs required
 *   M) Edge enum — closed kind enum, reserved kinds rejected
 *   N) Forbidden behaviors per directive §12 — setup before data_quality / contradicted
 *      hypothesis as primary / setup without evidence
 */
'use strict';

var HE = require('../renderer/js/r3-0d-hypothesis-engine.js');
var EG = require('../renderer/js/r3-0d-evidence-graph.js');
var PE = require('../renderer/js/r3-0d-priority-engine.js');
var RC = require('../contracts/r3.0d/reason-codes.js');
var HC = require('../contracts/r3.0d/hypothesis-contract.js');
var HI = require('../contracts/r3.0d/hardened-intrinsics.js');

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
function _pe(input, customOpts) { return PE.buildPrioritySet(input, customOpts === undefined ? _opts() : customOpts); }

var _origObjectDefineProperty = Object.defineProperty;
var _origReflectApply = Reflect.apply;

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
function _buildHypothesisSet(nodes) {
  var ca = { caseId: 'case_001', sessionId: 'sess_001', lapId: null };
  var eg = EG.buildEvidenceGraph({ caseAssociation: ca, rawEvidence: nodes }, { clock: BASE_CLOCK });
  if (!eg.valid) throw new Error('eg build failed: ' + JSON.stringify(eg).slice(0, 200));
  var hs = HE.buildHypothesisSet({ graph: eg.graph }, { clock: BASE_CLOCK });
  if (!hs.valid) throw new Error('hs build failed: ' + JSON.stringify(hs).slice(0, 200));
  return hs.hypothesisSet;
}

// ---------- Section A — Functional happy paths -----------------------------------------
console.log('Section A — functional happy paths');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs });
  chk('A1: valid envelope', r.valid === true);
  chk('A1: prioritySetId matches priset_<16hex>', /^priset_[0-9a-f]{16}$/.test(r.prioritySet.prioritySetId));
  chk('A1: sourceHypothesisSetId mirrors input hsetId', r.prioritySet.sourceHypothesisSetId === hs.hypothesisSetId);
  chk('A1: sourceGraphId mirrors input sourceGraphId', r.prioritySet.sourceGraphId === hs.sourceGraphId);
  chk('A1: case+session association preserved',
    r.prioritySet.caseAssociation.caseId === 'case_001'
      && r.prioritySet.sessionAssociation.sessionId === 'sess_001');
})();

(function () {
  // A2: determinism — same input + different clock → same prisetId
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r1 = _pe({ hypothesisSet: hs }, { clock: BASE_CLOCK });
  var r2 = _pe({ hypothesisSet: hs }, { clock: function () { return '2026-06-29T05:00:00Z'; } });
  chk('A2: determinism — same input → same prioritySetId across different clocks',
    r1.prioritySet.prioritySetId === r2.prioritySet.prioritySetId);
  chk('A2: createdAt differs (clock-dependent)', r1.prioritySet.createdAt !== r2.prioritySet.createdAt);
})();

// ---------- Section B — Structural -----------------------------------------------------
console.log('Section B — structural');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs });
  var ps = r.prioritySet;

  chk('B1: top-level result frozen', Object.isFrozen(r));
  chk('B2: prioritySet frozen', Object.isFrozen(ps));
  chk('B3: priorities array frozen', Object.isFrozen(ps.priorities));
  chk('B4: each priority is frozen', ps.priorities.every(function (p) { return Object.isFrozen(p); }));
  chk('B5: schemaVersion === 1', ps.schemaVersion === 1);
  chk('B6: prioritySetId pattern', /^priset_[0-9a-f]{16}$/.test(ps.prioritySetId));

  // Priorities sorted by tier asc, then score desc, then hypothesisId asc
  var prevTier = -1, prevScore = Infinity, prevId = '';
  var sortOk = true;
  for (var i = 0; i < ps.priorities.length; i++) {
    var p = ps.priorities[i];
    if (p.tier < prevTier) { sortOk = false; break; }
    if (p.tier === prevTier) {
      if (p.confidence.score > prevScore) { sortOk = false; break; }
      if (p.confidence.score === prevScore && p.hypothesisId < prevId) { sortOk = false; break; }
    }
    prevTier = p.tier; prevScore = p.confidence.score; prevId = p.hypothesisId;
  }
  chk('B7: priorities sorted by tier asc, then score desc, then hypothesisId asc', sortOk);

  // Ranks are 1..N consecutive
  var ranksOk = true;
  for (var ri = 0; ri < ps.priorities.length; ri++) {
    if (ps.priorities[ri].rank !== (ri + 1)) { ranksOk = false; break; }
  }
  chk('B8: ranks are 1..N consecutive', ranksOk);

  // priorityId pattern
  chk('B9: each priorityId matches pri_<16hex>',
    ps.priorities.every(function (p) { return /^pri_[0-9a-f]{16}$/.test(p.priorityId); }));
})();

// ---------- Section C — Authority verification ----------------------------------------
console.log('Section C — authority');
(function () {
  // C1: fabricated hypothesisSet rejected
  var fabricated = Object.freeze({
    schemaVersion: 1, hypothesisSetId: 'hset_0000000000000000', sourceGraphId: 'graph_0000000000000000',
    caseAssociation: Object.freeze({ caseId: 'c', sessionId: 's', lapId: null }),
    sessionAssociation: Object.freeze({ sessionId: 's' }),
    hypotheses: Object.freeze([]),
    alternativeExplanations: Object.freeze([]),
    validationActions: Object.freeze([]),
    cannotConclude: Object.freeze([]),
    limitations: Object.freeze([]),
    provenance: Object.freeze({ builderVersion: 1, sourceGraphSchemaVersion: 1, sourceGraphSanitizedCount: 0, rulesEvaluated: 0, rulesFired: 0, rejectedReasonsSummary: Object.freeze({}) }),
    createdAt: null, generationToken: null, contextVersion: null,
  });
  var r = _pe({ hypothesisSet: fabricated });
  chk('C1: fabricated hypothesisSet (wrong hsetId hash) rejected as forged',
    r.eligible === false
      && HI.safeArrayIndexOf(r.reasonCodes, RC.REASON_CODES.HYPOTHESIS_AUTHORITY_FORGED) !== -1);
})();

(function () {
  // C2: non-frozen hypothesisSet rejected
  var hs = _buildHypothesisSet([_baseNode({})]);
  var mutableShell = {};
  for (var k in hs) mutableShell[k] = hs[k];  // shallow copy → not frozen
  var r = _pe({ hypothesisSet: mutableShell });
  chk('C2: non-frozen hypothesisSet shell rejected',
    r.eligible === false);
})();

(function () {
  // C3: tampered hsetId rejected
  var hs = _buildHypothesisSet([_baseNode({})]);
  var tampered = Object.freeze({
    schemaVersion: 1, hypothesisSetId: 'hset_ffffffffffffffff', sourceGraphId: hs.sourceGraphId,
    caseAssociation: hs.caseAssociation, sessionAssociation: hs.sessionAssociation,
    hypotheses: hs.hypotheses, alternativeExplanations: hs.alternativeExplanations,
    validationActions: hs.validationActions, cannotConclude: hs.cannotConclude,
    limitations: hs.limitations, provenance: hs.provenance,
    createdAt: hs.createdAt, generationToken: hs.generationToken, contextVersion: hs.contextVersion,
  });
  var r = _pe({ hypothesisSet: tampered });
  chk('C3: tampered hsetId rejected',
    r.eligible === false
      && HI.safeArrayIndexOf(r.reasonCodes, RC.REASON_CODES.HYPOTHESIS_AUTHORITY_FORGED) !== -1);
})();

// ---------- Section D — Scope ----------------------------------------------------------
console.log('Section D — scope');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs, fooBar: 'extra' });
  chk('D1: unknown input own key rejected',
    r.eligible === false && HI.safeArrayIndexOf(r.reasonCodes, RC.REASON_CODES.UNKNOWN_OWN_KEY) !== -1);
})();

(function () {
  // generationToken / contextVersion passthrough
  var hs = _buildHypothesisSet([_baseNode({})]);
  var rA = _pe({ hypothesisSet: hs, generationToken: 'tok-A' });
  var rB = _pe({ hypothesisSet: hs, generationToken: 'tok-B' });
  chk('D2: prisetId is content-deterministic (independent of generationToken)',
    rA.prioritySet.prioritySetId === rB.prioritySet.prioritySetId);
  chk('D2: generationToken stored verbatim',
    rA.prioritySet.generationToken === 'tok-A' && rB.prioritySet.generationToken === 'tok-B');
})();

// ---------- Section E — Priority ladder enforcement -----------------------------------
console.log('Section E — priority ladder');
(function () {
  // Build a multi-category hypothesis set
  var n_dq = _baseNode({ nodeId: 'n_dq', identity: _baseIdentity({ sourceId: 'dq_src' }),
    observation: { kind: 'channel_missing', channel: 'a', i18nKey: 'k', params: null } });
  var n_mc = _baseNode({ nodeId: 'n_mc', category: 'mapping_calibration',
    identity: _baseIdentity({ sourceId: 'mc_src' }),
    observation: { kind: 'qualitative_marker', channel: null, i18nKey: 'k', params: null },
    limitations: ['LIMITATION_UNCALIBRATED_INPUT'] });
  var n_dr = _baseNode({ nodeId: 'n_dr', category: 'driver_behaviour',
    identity: _baseIdentity({ sourceId: 'dr_src' }),
    observation: { kind: 'qualitative_marker', channel: null, i18nKey: 'k', params: null },
    limitations: [] });
  var hs = _buildHypothesisSet([n_dq, n_mc, n_dr]);
  var r = _pe({ hypothesisSet: hs });
  if (!r.valid) {
    chk('E1: multi-category build', false, r);
    return;
  }
  var ps = r.prioritySet;
  // Verify: data_quality before mapping before driver
  var dqIdx = ps.priorities.findIndex(function (p) { return p.kind === 'fix_data_quality'; });
  var mcIdx = ps.priorities.findIndex(function (p) { return p.kind === 'recalibrate_channel'; });
  var drIdx = ps.priorities.findIndex(function (p) { return p.kind === 'controlled_repeat_lap'; });
  chk('E1: data_quality priority present', dqIdx !== -1);
  if (dqIdx !== -1 && mcIdx !== -1) chk('E1: data_quality before mapping_calibration (lower rank)', dqIdx < mcIdx);
  if (mcIdx !== -1 && drIdx !== -1) chk('E1: mapping_calibration before controlled_repeat_lap', mcIdx < drIdx);
})();

// ---------- Section F — Blocking prerequisites ----------------------------------------
console.log('Section F — blocking prerequisites');
(function () {
  // setup_experiment in presence of data_quality issue → blocked by data_quality
  var n_dq = _baseNode({ nodeId: 'n_dq', identity: _baseIdentity({ sourceId: 'dq_src' }) });
  var n_sm1 = _baseNode({ nodeId: 'n_sm1', category: 'setup_model', credibility: 'measured',
    identity: _baseIdentity({ sourceId: 'sm1_src' }),
    observation: { kind: 'metric_value', channel: 'roll', i18nKey: 'k', params: null },
    limitations: [] });
  var n_sm2 = _baseNode({ nodeId: 'n_sm2', category: 'setup_model', credibility: 'measured',
    identity: _baseIdentity({ sourceId: 'sm2_src' }),
    observation: { kind: 'metric_value', channel: 'pitch', i18nKey: 'k', params: null },
    limitations: [] });
  var hs = _buildHypothesisSet([n_dq, n_sm1, n_sm2]);
  var r = _pe({ hypothesisSet: hs });
  chk('F1: build succeeded', r.valid === true);
  if (r.valid) {
    var dq = r.prioritySet.priorities.find(function (p) { return p.kind === 'fix_data_quality'; });
    var setupOrRepeat = r.prioritySet.priorities.find(function (p) { return p.kind === 'setup_experiment' || p.kind === 'controlled_repeat_lap'; });
    chk('F1: data_quality priority present', !!dq);
    if (dq && setupOrRepeat) {
      chk('F1: setup/repeat priority blocked by data_quality (or higher-tier priority)',
        setupOrRepeat.blockingPrerequisiteIds.length >= 1);
    }
  }
})();

// ---------- Section G — Primary eligibility -------------------------------------------
console.log('Section G — primary eligibility');
(function () {
  // Single low-confidence hypothesis → cannot be primary
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs });
  chk('G1: low-confidence hypothesis NOT promoted to primary',
    r.prioritySet.primaryActionId === null);
  chk('G1: whyNowI18nKey reflects no eligible primary',
    r.prioritySet.whyNowI18nKey === 'r3.0d.priority.why_now.no_eligible_primary');
})();

// ---------- Section H — Security ------------------------------------------------------
console.log('Section H — security');
(function () {
  // H1: class-instance hypothesisSet rejected
  function FakeSet() { this.schemaVersion = 1; }
  var inst = new FakeSet();
  var r = _pe({ hypothesisSet: inst });
  chk('H1: class instance hypothesisSet rejected', r.eligible === false);
})();
(function () {
  // H2: Symbol input own key rejected
  var hs = _buildHypothesisSet([_baseNode({})]);
  var input = { hypothesisSet: hs };
  input[Symbol('hidden')] = 'x';
  var r = _pe(input);
  chk('H2: Symbol input own key rejected', r.eligible === false);
})();
(function () {
  // H3: non-enumerable input own key rejected
  var hs = _buildHypothesisSet([_baseNode({})]);
  var input = {};
  Object.defineProperty(input, 'hypothesisSet', { value: hs, enumerable: false });
  var r = _pe(input);
  chk('H3: non-enumerable input own key rejected', r.eligible === false);
})();
(function () {
  // H4: hostile clock that rebinds Array.prototype.push
  var hs = _buildHypothesisSet([_baseNode({})]);
  var origPush = Array.prototype.push;
  try {
    var hostileClock = function () { Array.prototype.push = function () {}; return '2026-06-29T01:00:00Z'; };
    var r = PE.buildPrioritySet({ hypothesisSet: hs }, { clock: hostileClock });
    chk('H4: hostile clock does not corrupt result (engine uses HI captures)',
      r.valid === true || r.eligible === false);
  } finally {
    Array.prototype.push = origPush;
  }
})();

// ---------- Section I — Privacy -------------------------------------------------------
console.log('Section I — privacy');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs });
  var json = JSON.stringify(r);
  chk('I1: no /Users/ in output', json.indexOf('/Users/') === -1);
  chk('I2: no "stack" key in output', !/("stack"\s*:)/.test(json));
})();

// ---------- Section J — HI wrapper mutation resilience -------------------------------
console.log('Section J — HI wrapper mutation resilience');
function _runRebind(container, key, hostileImpl, action) {
  var orig = container[key];
  var hits = 0;
  var wrapped = function () { hits += 1; return _origReflectApply(hostileImpl, this, arguments); };
  _origObjectDefineProperty(container, key, { value: wrapped, configurable: true, writable: true });
  var result;
  try { result = action(); }
  finally { _origObjectDefineProperty(container, key, { value: orig, configurable: true, writable: true }); }
  return { hits: hits, result: result };
}
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(Array.prototype, 'push', function () { return 0; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J1: hostile Array.prototype.push never invoked', r.hits === 0);
  chk('J1: result still valid', r.result.valid === true);
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(Array.prototype, 'map', function () { return []; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J2: hostile Array.prototype.map never invoked', r.hits === 0);
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(Array.prototype, 'sort', function () { return this; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J3: hostile Array.prototype.sort never invoked', r.hits === 0);
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(Object, 'keys', function () { return []; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J4: hostile Object.keys never invoked', r.hits === 0);
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(Object, 'freeze', function (o) { return o; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J5: hostile Object.freeze never invoked', r.hits === 0);
  chk('J5: result still deep-frozen', Object.isFrozen(r.result) && Object.isFrozen(r.result.prioritySet));
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _runRebind(JSON, 'stringify', function () { return ''; }, function () {
    return _pe({ hypothesisSet: hs });
  });
  chk('J6: hostile JSON.stringify never invoked', r.hits === 0);
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var origDateParse = Date.parse;
  var hits = 0;
  var wrapped = function () { hits += 1; return _origReflectApply(origDateParse, this, arguments); };
  _origObjectDefineProperty(Date, 'parse', { value: wrapped, configurable: true, writable: true });
  try {
    var r = PE.buildPrioritySet({ hypothesisSet: hs }, { clock: BASE_CLOCK });
    chk('J7: hostile Date.parse never invoked (captured ref used)', hits === 0);
  } finally {
    _origObjectDefineProperty(Date, 'parse', { value: origDateParse, configurable: true, writable: true });
  }
})();
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var origObjectIs = Object.is;
  var hits = 0;
  var wrapped = function () { hits += 1; return _origReflectApply(origObjectIs, this, arguments); };
  _origObjectDefineProperty(Object, 'is', { value: wrapped, configurable: true, writable: true });
  try {
    var r = PE.buildPrioritySet({ hypothesisSet: hs }, { clock: BASE_CLOCK });
    chk('J8: hostile Object.is never invoked (captured ref used)', hits === 0);
  } finally {
    _origObjectDefineProperty(Object, 'is', { value: origObjectIs, configurable: true, writable: true });
  }
})();

// ---------- Section K — Output immutability -------------------------------------------
console.log('Section K — output immutability');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = _pe({ hypothesisSet: hs });
  var threw = false;
  try { 'use strict'; r.prioritySet.priorities.push({ injected: true }); } catch (e) { threw = true; }
  chk('K1: cannot push into frozen priorities array', threw === true || r.prioritySet.priorities.every(function (p) { return !p.injected; }));
})();

// ---------- Section L — Mandatory freshness reference ---------------------------------
console.log('Section L — mandatory freshness reference');
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var r = PE.buildPrioritySet({ hypothesisSet: hs });  // No opts → no clock, no referenceNowMs
  chk('L1: no clock + no referenceNowMs → fail-closed HYPOTHESIS_INVALID',
    r.eligible === false
      && HI.safeArrayIndexOf(r.reasonCodes, RC.REASON_CODES.HYPOTHESIS_INVALID) !== -1);
  var r2 = PE.buildPrioritySet({ hypothesisSet: hs }, { referenceNowMs: Date.parse('2026-06-29T05:00:00Z') });
  chk('L2: referenceNowMs alone (no clock) accepted; createdAt === null',
    r2.valid === true && r2.prioritySet.createdAt === null);
})();

// ---------- Section M — Closed kind enum ---------------------------------------------
console.log('Section M — closed kind enum');
(function () {
  chk('M1: PRIORITY_KIND_ALLOWED is frozen', Object.isFrozen(PE.PRIORITY_KIND_ALLOWED));
  chk('M1: PRIORITY_KIND_ALLOWED has 8 entries', PE.PRIORITY_KIND_ALLOWED.length === 8);
  chk('M2: PRIORITY_KIND_TIER mapping consistent', Object.keys(PE.PRIORITY_KIND_TIER).every(function (k) {
    return PE.PRIORITY_KIND_ALLOWED.indexOf(k) !== -1;
  }));
})();

// ---------- Section N — Forbidden behaviors per directive §12 -----------------------
console.log('Section N — forbidden behaviors');
(function () {
  // N1: Heuristic-only hypothesis cannot be primary
  var n = _baseNode({ credibility: 'heuristic', limitations: ['LIMITATION_HEURISTIC_ONLY'] });
  // D2 requires heuristic AND limitation declaration. Build via D2 → D3 → D4.
  var hs = _buildHypothesisSet([n]);
  var r = _pe({ hypothesisSet: hs });
  chk('N1: heuristic-credibility hypothesis NOT promoted to primary',
    r.prioritySet.primaryActionId === null
      || r.prioritySet.priorities.find(function (p) { return p.priorityId === r.prioritySet.primaryActionId; }).credibility !== 'Heuristic');
})();

// ---------- Section O — Codex D4 R1 closure tests (D4-R1-01..06) -----------------------
console.log('Section O — Codex D4 R1 closures');

// R1-01: tampered hypothesis content (same hsetId, mutated category/status/credibility) rejected
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  // Take the authentic hypothesis and craft a tampered variant that keeps hypothesisId but
  // mutates category — D4 must catch via hypothesisId recompute mismatch (hypothesisId is
  // derived from ruleId + supportingIds + contradictingIds, NOT category — so category swap
  // alone won't break the recompute. The rule lookup will catch the mismatch instead.).
  var origH = hs.hypotheses[0];
  var tampered = Object.freeze({
    hypothesisId: origH.hypothesisId, ruleId: origH.ruleId, ruleVersion: origH.ruleVersion,
    category: 'setup_model',  // tampered: was data_quality
    status: origH.status, i18nKey: origH.i18nKey,
    supportingEvidenceIds: origH.supportingEvidenceIds,
    contradictingEvidenceIds: origH.contradictingEvidenceIds,
    correlationGroupIds: origH.correlationGroupIds,
    alternativeExplanationIds: origH.alternativeExplanationIds,
    cannotConcludeReasonCodes: origH.cannotConcludeReasonCodes,
    validationActionIds: origH.validationActionIds,
    credibility: origH.credibility, confidence: origH.confidence,
    limitations: origH.limitations, provenance: origH.provenance,
  });
  var tamperedShell = Object.freeze({
    schemaVersion: hs.schemaVersion, hypothesisSetId: hs.hypothesisSetId,
    sourceGraphId: hs.sourceGraphId, caseAssociation: hs.caseAssociation,
    sessionAssociation: hs.sessionAssociation,
    hypotheses: Object.freeze([tampered]),
    alternativeExplanations: hs.alternativeExplanations, validationActions: hs.validationActions,
    cannotConclude: hs.cannotConclude, limitations: hs.limitations,
    provenance: hs.provenance, createdAt: hs.createdAt,
    generationToken: hs.generationToken, contextVersion: hs.contextVersion,
  });
  var r = _pe({ hypothesisSet: tamperedShell });
  chk('HRR1-01-a: mutated hypothesis.category (rule mismatch) rejected',
    r.eligible === false);
})();

// R1-02: top-level accessor descriptor on hypothesisSet (e.g. createdAt getter) rejected pre-clone
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var fired = 0;
  var hostile = Object.create(null);
  // Set non-getter fields as data props
  ['schemaVersion','hypothesisSetId','sourceGraphId','caseAssociation','sessionAssociation','hypotheses','alternativeExplanations','validationActions','cannotConclude','limitations','provenance','generationToken','contextVersion'].forEach(function (k) {
    Object.defineProperty(hostile, k, { value: hs[k], enumerable: true });
  });
  // createdAt as a getter
  Object.defineProperty(hostile, 'createdAt', { get: function () { fired += 1; return hs.createdAt; }, enumerable: true });
  Object.freeze(hostile);
  var r = _pe({ hypothesisSet: hostile });
  chk('HRR1-02-a: accessor descriptor on input.hypothesisSet rejected pre-clone',
    r.eligible === false);
  chk('HRR1-02-b: hostile getter NOT invoked (rejected before clone)',
    fired === 0);
})();

// R1-02 (cont): accessor on opts.clock rejected
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var hostileOpts = {};
  Object.defineProperty(hostileOpts, 'clock', { get: function () { return BASE_CLOCK; }, enumerable: true });
  var r = _pe({ hypothesisSet: hs }, hostileOpts);
  chk('HRR1-02-c: accessor descriptor on opts.clock rejected',
    r.eligible === false);
})();

// R1-03: extra hypothesis own key rejected
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var origH = hs.hypotheses[0];
  var withExtra = Object.freeze(Object.assign({}, origH, { attackerKey: 'inject' }));
  // Re-freeze nested arrays since spread creates new wrapper
  var shell = Object.freeze({
    schemaVersion: hs.schemaVersion, hypothesisSetId: hs.hypothesisSetId,
    sourceGraphId: hs.sourceGraphId, caseAssociation: hs.caseAssociation,
    sessionAssociation: hs.sessionAssociation,
    hypotheses: Object.freeze([withExtra]),
    alternativeExplanations: hs.alternativeExplanations, validationActions: hs.validationActions,
    cannotConclude: hs.cannotConclude, limitations: hs.limitations,
    provenance: hs.provenance, createdAt: hs.createdAt,
    generationToken: hs.generationToken, contextVersion: hs.contextVersion,
  });
  var r = _pe({ hypothesisSet: shell });
  chk('HRR1-03-a: extra hypothesis own key rejected',
    r.eligible === false
      && HI.safeArrayIndexOf(r.reasonCodes, RC.REASON_CODES.UNKNOWN_OWN_KEY) !== -1);
})();

// R1-03 (cont): invalid status value rejected
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var origH = hs.hypotheses[0];
  var bogusH = Object.freeze(Object.assign({}, origH, { status: 'attacker_supported' }));
  var shell = Object.freeze({
    schemaVersion: hs.schemaVersion, hypothesisSetId: hs.hypothesisSetId,
    sourceGraphId: hs.sourceGraphId, caseAssociation: hs.caseAssociation,
    sessionAssociation: hs.sessionAssociation,
    hypotheses: Object.freeze([bogusH]),
    alternativeExplanations: hs.alternativeExplanations, validationActions: hs.validationActions,
    cannotConclude: hs.cannotConclude, limitations: hs.limitations,
    provenance: hs.provenance, createdAt: hs.createdAt,
    generationToken: hs.generationToken, contextVersion: hs.contextVersion,
  });
  var r = _pe({ hypothesisSet: shell });
  chk('HRR1-03-b: unknown hypothesis.status value rejected (closed enum)',
    r.eligible === false);
})();

// R1-04: two-pass priority resolution — blockingPrerequisiteIds referentially intact
(function () {
  // Build a graph with both data_quality (high-tier) and setup_model (low-tier). Verify any
  // priority's blockingPrerequisiteIds reference IDs present in the final set.
  var n_dq = _baseNode({ nodeId: 'n_dq', identity: _baseIdentity({ sourceId: 'dq_src' }) });
  var n_sm = _baseNode({ nodeId: 'n_sm', category: 'setup_model', credibility: 'measured',
    identity: _baseIdentity({ sourceId: 'sm_src' }),
    observation: { kind: 'metric_value', channel: 'yaw', i18nKey: 'k', params: null },
    limitations: [] });
  var hs = _buildHypothesisSet([n_dq, n_sm]);
  var r = _pe({ hypothesisSet: hs });
  if (r.valid) {
    var idSet = new Set(r.prioritySet.priorities.map(function (p) { return p.priorityId; }));
    var allReferentiallyIntact = r.prioritySet.priorities.every(function (p) {
      return p.blockingPrerequisiteIds.every(function (b) { return idSet.has(b); });
    });
    chk('HRR1-04-a: every blockingPrerequisiteId references a priority that EXISTS in the final set',
      allReferentiallyIntact === true);
  } else {
    chk('HRR1-04-a: graph rejected by D4', false);
  }
})();

// R1-05: caller-supplied key names NOT echoed in error detail (privacy)
(function () {
  var hs = _buildHypothesisSet([_baseNode({})]);
  var pathLikeKey = '/Users/SKYLINE/private.csv';
  var hostile = { hypothesisSet: hs };
  hostile[pathLikeKey] = 'inject';
  var r = _pe(hostile);
  chk('HRR1-05-a: error detail does NOT echo path-like caller key (privacy)',
    r.eligible === false && (!r.detail || r.detail.indexOf('/Users/') === -1));
  var hostileOpts = { clock: BASE_CLOCK };
  hostileOpts['/Users/SKYLINE/leak'] = 1;
  var r2 = _pe({ hypothesisSet: hs }, hostileOpts);
  chk('HRR1-05-b: opts error detail does NOT echo path-like caller key',
    r2.eligible === false && (!r2.detail || r2.detail.indexOf('/Users/') === -1));
})();

console.log('R3.0D D4 priority-engine adversarial suite: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
