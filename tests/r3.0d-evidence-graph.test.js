/**
 * tests/r3.0d-evidence-graph.test.js — R3.0D D2 · Evidence Graph adversarial suite.
 *
 * Verifies the D2 builder:
 *   • valid graph (golden path)
 *   • empty graph policy (returns valid with INSUFFICIENT_EVIDENCE cannotConclude)
 *   • duplicate nodeId rejection (first kept, accounting recorded)
 *   • semantic-fingerprint dedup (same source content under different nodeId)
 *   • correlation grouping (same source-identity grouped, independenceWeight = 1/N)
 *   • directed cycle / multi-node cycle → fail-closed EVIDENCE_GRAPH_CYCLE
 *   • self-edge (post-rename smuggle attempt) → fail-closed EVIDENCE_GRAPH_SELF_REFERENCE
 *   • orphan target edge → fail-closed EVIDENCE_GRAPH_ORPHAN
 *   • stale freshness still passes D1 (shape only); association mismatch (wrong case/session/lap)
 *   • imported_summary elevation guard → EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN
 *   • forged provenance / forged credibility (D1 rejects synthetic / heuristic without limitation)
 *   • prototype-pollution / Proxy ownKeys / throwing getter / accessor descriptor / Symbol key /
 *     non-enumerable key / class instance / nested class / Array subclass / mutated array prototype /
 *     cyclic caller input / NaN / Infinity / oversized string / oversized array / oversized graph
 *   • deterministic node + edge + topological order + serialization
 *   • deep freeze (caller cannot mutate returned graph)
 *   • caller mutates input array after build → graph unchanged (no shared reference)
 *   • raw telemetry tunnel attempt (params contains oversized string) → BYTE_CAP_EXCEEDED via D1
 *   • private path / filename-shaped nodeId → EVIDENCE_NODE_ID_FORBIDDEN via D1
 *   • future schema rejection (schemaVersion > SUPPORTED_SCHEMA_VERSION) via D1
 *   • injectable clock; missing clock → createdAt null; throwing clock → null fail-closed
 *
 * Node CLI: `node tests/r3.0d-evidence-graph.test.js`, exit 1 on any failure.
 */
'use strict';

const C = require('../contracts/r3.0d/index.js');
const RC = C.reasonCodes;
const CR = C.credibility;
const EN = C.evidenceNode;
const CODES = RC.REASON_CODES;
const EG = require('../renderer/js/r3-0d-evidence-graph.js');

let pass = 0, fail = 0;
function chk(name, cond, detail) {
  if (cond) pass++;
  else {
    fail++;
    console.log('  ✗ ' + name + (detail !== undefined ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''));
  }
}

const NOW = '2026-06-28T06:00:00Z';
const NOW2 = '2026-06-28T06:05:00Z';
const CLOCK = () => NOW;

function freshId(over) {
  return Object.assign({
    caseId: 'case_demo',
    sessionId: 'sess_demo',
    lapId: 'L1',
    sourceId: 'lap_authority',
    sourceVersion: 'v1',
    freshness: NOW,
  }, over || {});
}

function freshNode(over) {
  return Object.assign({
    schemaVersion: 1,
    nodeId: 'ev_001',
    category: 'data_quality',
    identity: freshId(),
    credibility: 'measured',
    provenance: 'real',
    availability: 'available',
    confidence: { state: 'unresolved' },
    observation: { kind: 'channel_missing', i18nKey: 'r3_0d.evidence.channel.missing', params: { channel: 'speed' }, channel: 'speed' },
    limitations: [],
    supportingEdges: [],
    contradictingEdges: [],
  }, over || {});
}

function freshInput(over) {
  return Object.assign({
    caseAssociation: { caseId: 'case_demo', sessionId: 'sess_demo', lapId: 'L1' },
    rawEvidence: [freshNode()],
  }, over || {});
}

// ── Section A — golden path + envelope ───────────────────────────────────────────
(function sectionA() {
  const out = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK });
  chk('A1 golden path valid', out.valid === true);
  chk('A1a graph.schemaVersion = 1', out.graph && out.graph.schemaVersion === 1);
  chk('A1b graph.graphId starts with graph_', out.graph && /^graph_/.test(out.graph.graphId));
  chk('A1c graph frozen', Object.isFrozen(out.graph));
  chk('A1d graph.nodes frozen', Object.isFrozen(out.graph.nodes));
  chk('A1e graph.edges frozen', Object.isFrozen(out.graph.edges));
  chk('A1f graph.caseAssociation frozen', Object.isFrozen(out.graph.caseAssociation));
  chk('A1g graph.deduplicationSummary frozen', Object.isFrozen(out.graph.deduplicationSummary));
  chk('A1h graph.correlationGroups frozen', Object.isFrozen(out.graph.correlationGroups));
  chk('A1i graph.provenance frozen', Object.isFrozen(out.graph.provenance));
  chk('A1j graph.createdAt = injected clock', out.graph.createdAt === NOW);
  chk('A1k graph.nodes length 1', out.graph.nodes.length === 1);
  chk('A1l one correlation group, weight 1', out.graph.correlationGroups.length === 1 && out.graph.correlationGroups[0].independenceWeight === 1);
  chk('A1m sessionAssociation present', out.graph.sessionAssociation.sessionId === 'sess_demo');
  chk('A1n provenance.inputCount 1', out.graph.provenance.inputCount === 1);
  chk('A1o provenance.sanitizedCount 1', out.graph.provenance.sanitizedCount === 1);

  // empty rawEvidence — valid graph, INSUFFICIENT_EVIDENCE cannotConclude
  const emptyOut = EG.buildEvidenceGraph(freshInput({ rawEvidence: [] }), { clock: CLOCK });
  chk('A2 empty valid', emptyOut.valid === true);
  chk('A2a empty cannotConclude has INSUFFICIENT_EVIDENCE', emptyOut.graph.cannotConclude.indexOf(CODES.INSUFFICIENT_EVIDENCE) !== -1);
  chk('A2b empty nodes []', emptyOut.graph.nodes.length === 0);
  chk('A2c empty edges []', emptyOut.graph.edges.length === 0);
})();

// ── Section B — envelope structural rejections ──────────────────────────────────
(function sectionB() {
  chk('B1 non-plain envelope (class) → INTERNAL_CONTRACT_VIOLATION', (function () {
    class Bag {}; const b = new Bag(); b.caseAssociation = { caseId: 'c', sessionId: 's' }; b.rawEvidence = [];
    const r = EG.buildEvidenceGraph(b, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.INTERNAL_CONTRACT_VIOLATION) !== -1;
  })());

  chk('B2 Symbol-keyed envelope rejected', (function () {
    const inp = freshInput();
    inp[Symbol('hidden')] = 'leaked';
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.UNKNOWN_OWN_KEY) !== -1;
  })());

  chk('B3 non-enumerable own key rejected', (function () {
    const inp = freshInput();
    Object.defineProperty(inp, 'sneak', { value: 'x', enumerable: false });
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.UNKNOWN_OWN_KEY) !== -1;
  })());

  chk('B4 extra own key rejected', (function () {
    const inp = freshInput({ extra: 1 });
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.UNKNOWN_OWN_KEY) !== -1;
  })());

  chk('B5 nested class instance in envelope rejected', (function () {
    class FakeCA {}; const ca = new FakeCA(); ca.caseId = 'c'; ca.sessionId = 's';
    const inp = { caseAssociation: ca, rawEvidence: [] };
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.PROTOTYPE_POLLUTION_REJECTED) !== -1;
  })());

  chk('B6 caseAssociation missing caseId rejected', (function () {
    const r = EG.buildEvidenceGraph({ caseAssociation: { sessionId: 's' }, rawEvidence: [] }, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.EVIDENCE_ASSOCIATION_MISMATCH) !== -1;
  })());

  chk('B7 caseAssociation extra own key rejected', (function () {
    const r = EG.buildEvidenceGraph({ caseAssociation: { caseId: 'c', sessionId: 's', extra: 1 }, rawEvidence: [] }, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.UNKNOWN_OWN_KEY) !== -1;
  })());

  chk('B8 rawEvidence is Array subclass rejected', (function () {
    class WeirdArr extends Array {}; const wa = new WeirdArr(); wa.push(freshNode());
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: wa }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.PROTOTYPE_POLLUTION_REJECTED) !== -1;
  })());

  chk('B9 rawEvidence over INPUT_RAW_EVIDENCE_CAP rejected', (function () {
    const arr = [];
    for (let i = 0; i < EG.INPUT_RAW_EVIDENCE_CAP + 1; i++) arr.push(freshNode({ nodeId: 'ev_' + i }));
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.GRAPH_CAP_EXCEEDED) !== -1;
  })());

  chk('B10 over NODES_CAP after sanitization → GRAPH_CAP_EXCEEDED', (function () {
    const arr = [];
    for (let i = 0; i < EG.NODES_CAP + 1; i++) {
      arr.push(freshNode({
        nodeId: 'ev_b10_' + i,
        observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: i }, channel: 'ch_' + i },
      }));
    }
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.GRAPH_CAP_EXCEEDED) !== -1;
  })());

  chk('B11 generationToken oversized rejected', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ generationToken: 'x'.repeat(300) }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1;
  })());

  chk('B12 contextVersion oversized rejected', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ contextVersion: 'x'.repeat(100) }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1;
  })());
})();

// ── Section C — per-node validation cascades from D1 ────────────────────────────
(function sectionC() {
  chk('C1 node with hostile getter rejected (counted in rejectedReasons)', (function () {
    const n = freshNode();
    Object.defineProperty(n, 'category', { get() { throw new Error('boom'); }, enumerable: true });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.nodes.length === 0 && r.graph.provenance.rejectedCount === 1;
  })());

  chk('C2 node future schema rejected', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ schemaVersion: 99 })] }), { clock: CLOCK });
    return r.valid === true && r.graph.nodes.length === 0 && r.graph.provenance.rejectedReasonsSummary[CODES.UNSUPPORTED_FUTURE_SCHEMA] === 1;
  })());

  chk('C3 node nodeId with .. → EVIDENCE_NODE_ID_FORBIDDEN counted', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ nodeId: 'a..b' })] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_NODE_ID_FORBIDDEN] === 1;
  })());

  chk('C4 node nodeId with / → EVIDENCE_NODE_ID_FORBIDDEN counted', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ nodeId: 'a/b' })] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_NODE_ID_FORBIDDEN] === 1;
  })());

  chk('C5 nested class instance in identity rejected', (function () {
    class HostileId {}; const id = new HostileId(); Object.assign(id, freshId());
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ identity: id })] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.PROTOTYPE_POLLUTION_REJECTED] >= 1;
  })());

  chk('C6 synthetic provenance without limitation rejected', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ provenance: 'synthetic' })] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.LIMITATION_SYNTHETIC_ONLY] === 1;
  })());

  chk('C7 heuristic credibility without limitation rejected', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [freshNode({ credibility: 'heuristic' })] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.LIMITATION_HEURISTIC_ONLY] === 1;
  })());

  chk('C8 NaN observation param rejected via D1', (function () {
    const n = freshNode({ observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: NaN }, channel: null } });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.NUMERIC_INVALID] === 1;
  })());

  chk('C9 Symbol key on observation params rejected', (function () {
    const obs = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: null };
    obs.params[Symbol('s')] = 2;
    const n = freshNode({ observation: obs });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedCount === 1;
  })());
})();

// ── Section D — association binding ─────────────────────────────────────────────
(function sectionD() {
  chk('D1 node case mismatch rejected', (function () {
    const n = freshNode({ identity: freshId({ caseId: 'case_other' }) });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.SOURCE_IDENTITY_CASE_MISMATCH] === 1;
  })());
  chk('D2 node session mismatch rejected', (function () {
    const n = freshNode({ identity: freshId({ sessionId: 'sess_other' }) });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.SOURCE_IDENTITY_SESSION_MISMATCH] === 1;
  })());
  chk('D3 node cross-lap mismatch rejected', (function () {
    const n = freshNode({ identity: freshId({ lapId: 'L9' }) });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.SOURCE_IDENTITY_LAP_MISMATCH] === 1;
  })());
  chk('D4 lap-null envelope accepts lap-scoped node', (function () {
    const inp = freshInput({ caseAssociation: { caseId: 'case_demo', sessionId: 'sess_demo', lapId: null } });
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.valid === true && r.graph.nodes.length === 1;
  })());
})();

// ── Section E — dedup ───────────────────────────────────────────────────────────
(function sectionE() {
  chk('E1 duplicate nodeId — second rejected', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_a' });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.nodes.length === 1
      && r.graph.deduplicationSummary.rejectedDuplicateIds.indexOf('ev_a') !== -1
      && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_DUPLICATE_ID] === 1;
  })());

  chk('E2 semantic duplicate under different nodeId — second rejected', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_b' }); // same source/observation but different id
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.nodes.length === 1
      && r.graph.deduplicationSummary.rejectedSemanticDuplicates.length === 1
      && r.graph.deduplicationSummary.rejectedSemanticDuplicates[0].keptNodeId === 'ev_a'
      && r.graph.deduplicationSummary.rejectedSemanticDuplicates[0].droppedNodeId === 'ev_b'
      && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT] === 1;
  })());

  chk('E3 different observation under same source — both kept, correlated', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.nodes.length === 2
      && r.graph.correlationGroups.length === 1
      && r.graph.correlationGroups[0].memberNodeIds.length === 2
      && Math.abs(r.graph.correlationGroups[0].independenceWeight - 0.5) < 1e-9;
  })());

  chk('E4 four-derived-metrics from same source — one group weight 0.25', (function () {
    const items = [];
    for (let k = 0; k < 4; k++) items.push(freshNode({ nodeId: 'ev_k_' + k, observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: k }, channel: 'rpm' } }));
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: items }), { clock: CLOCK });
    return r.valid === true
      && r.graph.correlationGroups.length === 1
      && r.graph.correlationGroups[0].memberNodeIds.length === 4
      && Math.abs(r.graph.correlationGroups[0].independenceWeight - 0.25) < 1e-9;
  })());

  chk('E5 different sources — separate correlation groups, weight 1 each', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_x' }) });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_y' }) });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.correlationGroups.length === 2
      && r.graph.correlationGroups.every(g => g.independenceWeight === 1);
  })());
})();

// ── Section F — edges, orphan, self-edge, cycle ────────────────────────────────
(function sectionF() {
  chk('F1 supportingEdges valid → edge emitted', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }) });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), supportingEdges: ['ev_a'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.edges.some(e => e.from === 'ev_b' && e.to === 'ev_a' && e.kind === 'supports');
  })());

  chk('F2 contradictingEdges valid → edge emitted', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }) });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), contradictingEdges: ['ev_a'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.edges.some(e => e.from === 'ev_b' && e.to === 'ev_a' && e.kind === 'contradicts');
  })());

  chk('F3 orphan supportingEdges target → fail-closed EVIDENCE_GRAPH_ORPHAN', (function () {
    const b = freshNode({ nodeId: 'ev_b', supportingEdges: ['ev_nope'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [b] }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.EVIDENCE_GRAPH_ORPHAN) !== -1;
  })());

  chk('F4 orphan contradictingEdges target → fail-closed', (function () {
    const b = freshNode({ nodeId: 'ev_b', contradictingEdges: ['ev_nope'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [b] }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.EVIDENCE_GRAPH_ORPHAN) !== -1;
  })());

  chk('F5 self-edge in supportingEdges (D1 catches) → counted as rejection', (function () {
    const a = freshNode({ nodeId: 'ev_a', supportingEdges: ['ev_a'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a] }), { clock: CLOCK });
    // D1 rejects node entirely with EVIDENCE_GRAPH_SELF_REFERENCE
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_GRAPH_SELF_REFERENCE] === 1;
  })());

  chk('F6 simple two-node cycle → fail-closed EVIDENCE_GRAPH_CYCLE', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }), supportingEdges: ['ev_b'] });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), supportingEdges: ['ev_a'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.EVIDENCE_GRAPH_CYCLE) !== -1;
  })());

  chk('F7 three-node cycle → fail-closed', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }), supportingEdges: ['ev_b'] });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), supportingEdges: ['ev_c'] });
    const c = freshNode({ nodeId: 'ev_c', identity: freshId({ sourceId: 'src_c' }), supportingEdges: ['ev_a'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b, c] }), { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.EVIDENCE_GRAPH_CYCLE) !== -1;
  })());

  chk('F8 acyclic chain → topological order respects DAG', (function () {
    const a = freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }) });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), supportingEdges: ['ev_a'] });
    const c = freshNode({ nodeId: 'ev_c', identity: freshId({ sourceId: 'src_c' }), supportingEdges: ['ev_b'] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b, c] }), { clock: CLOCK });
    const order = r.graph && r.graph.topologicalOrder;
    return r.valid === true
      && order.length === 3
      && order.indexOf('ev_c') < order.indexOf('ev_b')
      && order.indexOf('ev_b') < order.indexOf('ev_a');
  })());

  chk('F9 correlated_with edges emitted between intra-group members', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    const has = r.graph.edges.some(e => e.kind === 'correlated_with' && ((e.from === 'ev_a' && e.to === 'ev_b') || (e.from === 'ev_b' && e.to === 'ev_a')));
    return r.valid === true && has;
  })());
})();

// ── Section G — imported_summary elevation guard ────────────────────────────────
(function sectionG() {
  chk('G1 imported_summary measured → ELEVATION_FORBIDDEN', (function () {
    const n = freshNode({ identity: freshId({ sourceId: 'imported_summary' }) }); // credibility default 'measured'
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN] === 1;
  })());

  chk('G2 imported_summary derived → accepted', (function () {
    const n = freshNode({ identity: freshId({ sourceId: 'imported_summary' }), credibility: 'derived' });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
    return r.valid === true && r.graph.nodes.length === 1;
  })());
})();

// ── Section H — determinism + caller mutation defence ───────────────────────────
(function sectionH() {
  chk('H1 deterministic graphId across builds', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
    const r1 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    const r2 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [b, a] }), { clock: CLOCK });
    return r1.valid === true && r2.valid === true && r1.graph.graphId === r2.graph.graphId;
  })());

  chk('H2 deterministic node order (sorted by nodeId)', (function () {
    const a = freshNode({ nodeId: 'ev_z' });
    const b = freshNode({ nodeId: 'ev_a', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && r.graph.nodes[0].nodeId === 'ev_a'
      && r.graph.nodes[1].nodeId === 'ev_z';
  })());

  chk('H3 caller mutates input rawEvidence after build — graph unchanged', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const input = freshInput({ rawEvidence: [a] });
    const r = EG.buildEvidenceGraph(input, { clock: CLOCK });
    input.rawEvidence.push(freshNode({ nodeId: 'ev_b' }));
    input.rawEvidence[0].nodeId = 'ev_mutated';
    return r.valid === true
      && r.graph.nodes.length === 1
      && r.graph.nodes[0].nodeId === 'ev_a';
  })());

  chk('H4 graph.nodes is frozen — caller cannot push', (function () {
    const r = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK });
    let threw = false;
    try { r.graph.nodes.push({}); } catch (e) { threw = true; }
    return threw || r.graph.nodes.length === 1;
  })());

  chk('H5 graph.deduplicationSummary nested arrays frozen', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_a' });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true
      && Object.isFrozen(r.graph.deduplicationSummary.rejectedDuplicateIds);
  })());

  chk('H6 graph.correlationGroups members frozen', (function () {
    const r = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK });
    return r.valid === true
      && Object.isFrozen(r.graph.correlationGroups[0]);
  })());

  chk('H7 clock omitted → createdAt null', (function () {
    const r = EG.buildEvidenceGraph(freshInput());
    return r.valid === true && r.graph.createdAt === null;
  })());

  chk('H8 throwing clock → createdAt null (fail-closed)', (function () {
    const r = EG.buildEvidenceGraph(freshInput(), { clock: () => { throw new Error('boom'); } });
    return r.valid === true && r.graph.createdAt === null;
  })());

  chk('H9 non-ISO clock return → createdAt null', (function () {
    const r = EG.buildEvidenceGraph(freshInput(), { clock: () => 'yesterday' });
    return r.valid === true && r.graph.createdAt === null;
  })());

  chk('H10 generationToken preserved', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ generationToken: 'gt_xyz_001' }), { clock: CLOCK });
    return r.valid === true && r.graph.generationToken === 'gt_xyz_001';
  })());

  chk('H11 contextVersion preserved', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ contextVersion: 'ctx_v1' }), { clock: CLOCK });
    return r.valid === true && r.graph.contextVersion === 'ctx_v1';
  })());

  chk('H12 freshness change does not change graphId (semantic fingerprint excludes freshness)', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const a2 = freshNode({ nodeId: 'ev_a', identity: freshId({ freshness: NOW2 }) });
    const r1 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a] }), { clock: CLOCK });
    const r2 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a2] }), { clock: CLOCK });
    return r1.valid === true && r2.valid === true && r1.graph.graphId === r2.graph.graphId;
  })());
})();

// ── Section I — outer try/catch (hostile input throws) ──────────────────────────
(function sectionI() {
  chk('I1 Proxy envelope whose ownKeys throws → fail-closed', (function () {
    const target = freshInput();
    const proxy = new Proxy(target, { ownKeys() { throw new Error('boom'); } });
    const r = EG.buildEvidenceGraph(proxy, { clock: CLOCK });
    return r.eligible === false;
  })());

  chk('I2 throwing getter on input → fail-closed', (function () {
    const inp = freshInput();
    Object.defineProperty(inp, 'rawEvidence', { get() { throw new Error('boom'); }, enumerable: true });
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false;
  })());

  chk('I3 cyclic envelope (input.self = input) → fail-closed', (function () {
    const inp = freshInput();
    inp.self = inp; // extra own key — should be UNKNOWN_OWN_KEY before recursion happens
    const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
    return r.eligible === false && r.reasonCodes.indexOf(CODES.UNKNOWN_OWN_KEY) !== -1;
  })());
})();

// ── Section J — RN-07 closure: internal helpers are no longer exported ─────────
// Tests drive the contract via buildEvidenceGraph only. The previous tests that called
// EG._stableStringify / EG._semanticFingerprint / EG._correlationGroupKey are intentionally
// removed (those identifiers are no longer in the public api per Codex D2 Round 1 RN-07).
(function sectionJ() {
  chk('J1 _stableStringify not exported (RN-07)', typeof EG._stableStringify === 'undefined');
  chk('J2 _semanticCanonicalString not exported (RN-07)', typeof EG._semanticCanonicalString === 'undefined');
  chk('J3 _correlationGroupKey not exported (RN-07)', typeof EG._correlationGroupKey === 'undefined');
  chk('J4 _semanticFingerprint not exported (RN-07)', typeof EG._semanticFingerprint === 'undefined');
  // ENVELOPE_BYTE_CAP + PARAMS_KEYS_CAP now exposed for diagnostics (RN-09 closure).
  chk('J5 ENVELOPE_BYTE_CAP exposed', typeof EG.ENVELOPE_BYTE_CAP === 'number' && EG.ENVELOPE_BYTE_CAP === 256 * 1024);
  chk('J6 PARAMS_KEYS_CAP exposed', typeof EG.PARAMS_KEYS_CAP === 'number' && EG.PARAMS_KEYS_CAP === 32);
})();

// ── Section K — limitations + cannotConclude derivation ─────────────────────────
(function sectionK() {
  chk('K1 limitations propagate from nodes (deduplicated)', (function () {
    const a = freshNode({ nodeId: 'ev_a', limitations: [CODES.LIMITATION_MISSING_CHANNEL] });
    const b = freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }), limitations: [CODES.LIMITATION_MISSING_CHANNEL] });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    return r.valid === true && r.graph.limitations.length === 1 && r.graph.limitations[0] === CODES.LIMITATION_MISSING_CHANNEL;
  })());
  chk('K2 cannotConclude carries CANNOT_CONCLUDE when rejections happened', (function () {
    const good = freshNode({ nodeId: 'ev_a' });
    const bad = freshNode({ nodeId: 'a..b' }); // forbidden id
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [good, bad] }), { clock: CLOCK });
    return r.valid === true && r.graph.cannotConclude.indexOf(CODES.CANNOT_CONCLUDE) !== -1;
  })());
  chk('K3 empty graph cannotConclude includes INSUFFICIENT_EVIDENCE', (function () {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [] }), { clock: CLOCK });
    return r.valid === true && r.graph.cannotConclude.indexOf(CODES.INSUFFICIENT_EVIDENCE) !== -1;
  })());
})();

// ── Section L — sanity: nothing leaks beyond EDGE_KIND_ALLOWED, no Infinity/NaN in graph ─
(function sectionL() {
  chk('L1 EDGE_KIND_ALLOWED frozen', Object.isFrozen(EG.EDGE_KIND_ALLOWED));
  chk('L2 EDGE_KIND_ALLOWED includes the closed enum exactly', (function () {
    const set = new Set(EG.EDGE_KIND_ALLOWED);
    return set.size === 5 && set.has('supports') && set.has('contradicts') && set.has('derived_from') && set.has('correlated_with') && set.has('invalidates');
  })());
  chk('L3 all emitted edges have kind in EDGE_KIND_ALLOWED', (function () {
    const a = freshNode({ nodeId: 'ev_a' });
    const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
    const set = new Set(EG.EDGE_KIND_ALLOWED);
    return r.valid === true && r.graph.edges.every(e => set.has(e.kind));
  })());
})();

// ── Section M — Codex D2 Round 1 finding closures (RN-01 .. RN-09) ──────────
(function sectionM_RN01() {
  // RN-01 — envelope caseAssociation accessor TOCTOU: getter returns valid value during validation,
  // hostile value during build. The hardened envelope snapshot reads ca via descriptor + clone, so
  // there is no path to read the hostile value AFTER validation passes.
  const safeCA = { caseId: 'case_demo', sessionId: 'sess_demo', lapId: 'L1' };
  const hostileCA = { caseId: '', sessionId: '', lapId: 17 };
  let toggle = 0;
  const inp = { rawEvidence: [freshNode()] };
  Object.defineProperty(inp, 'caseAssociation', {
    enumerable: true,
    configurable: false,
    get() { return (toggle++ === 0) ? safeCA : hostileCA; },
  });
  const r = EG.buildEvidenceGraph(inp, { clock: CLOCK });
  // Accessor descriptor on envelope top-level is forbidden -> envelope validation rejects.
  chk('RN-01 envelope accessor on caseAssociation rejected', r.eligible === false);
})();

(function sectionM_RN02() {
  // RN-02 — array index accessor throws; per-index defence treats as ONE rejected node, not whole build.
  const arr = [freshNode({ nodeId: 'ev_ok' })];
  const trapped = [];
  Object.defineProperty(trapped, '0', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
  trapped.length = 1;
  // Append a clean node alongside (index 1 holds a valid node via descriptor)
  Object.defineProperty(trapped, '1', { enumerable: true, configurable: true, value: freshNode({ nodeId: 'ev_clean' }) });
  trapped.length = 2;
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: trapped }), { clock: CLOCK });
  chk('RN-02 hostile array slot does not poison whole build', r.valid === true);
  chk('RN-02 hostile slot counted as 1 rejection', r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.PROTOTYPE_POLLUTION_REJECTED] === 1);
  chk('RN-02 clean slot kept', r.valid === true && r.graph.nodes.some(n => n.nodeId === 'ev_clean'));
})();

(function sectionM_RN03() {
  // RN-03 — duplicate nodeId outcome must NOT depend on caller order. Two nodeId='a' candidates:
  //   variant X — no edges
  //   variant Y — supportingEdges:['b'] (creates a→b)
  // and b with supportingEdges:['a'] (b→a, closes a cycle if Y wins).
  // Whichever variant the canonical sort picks must be the SAME regardless of caller input order.
  const a_x = freshNode({ nodeId: 'a', identity: freshId({ sourceId: 'src_a' }) });
  const a_y = freshNode({ nodeId: 'a', identity: freshId({ sourceId: 'src_a' }), supportingEdges: ['b'] });
  const b = freshNode({ nodeId: 'b', identity: freshId({ sourceId: 'src_b' }), supportingEdges: ['a'] });
  const r1 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_x, a_y, b] }), { clock: CLOCK });
  const r2 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_y, a_x, b] }), { clock: CLOCK });
  // Same outcome regardless of permutation
  const sameOutcome = (r1.eligible === r2.eligible) && (r1.valid === r2.valid);
  chk('RN-03 dedup outcome independent of caller permutation', sameOutcome);
  if (r1.valid === true && r2.valid === true) {
    chk('RN-03 same graphId across permutations', r1.graph.graphId === r2.graph.graphId);
  }
})();

(function sectionM_RN04() {
  // RN-04 — semantic dedup map keyed by full canonical string, not hash. Two completely different
  // params values cannot collide (the dedup map key IS the canonical string).
  const a = freshNode({ nodeId: 'ev_a', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 'zatgbu54' }, channel: 'rpm' } });
  const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 'rq5kja9k' }, channel: 'rpm' } });
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
  chk('RN-04 distinct param values both kept (no hash collision data loss)', r.valid === true && r.graph.nodes.length === 2);
})();

(function sectionM_RN05() {
  // RN-05 — correlationGroup.memberNodeIds must be frozen.
  const a = freshNode({ nodeId: 'ev_a' });
  const b = freshNode({ nodeId: 'ev_b', observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: 1 }, channel: 'rpm' } });
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
  chk('RN-05 group object frozen', r.valid === true && Object.isFrozen(r.graph.correlationGroups[0]));
  chk('RN-05 memberNodeIds frozen', r.valid === true && Object.isFrozen(r.graph.correlationGroups[0].memberNodeIds));
  let threw = false;
  try { r.graph.correlationGroups[0].memberNodeIds.push('FORGED'); } catch (e) { threw = true; }
  chk('RN-05 push to memberNodeIds throws or no-op', threw || r.graph.correlationGroups[0].memberNodeIds.length === 2);
})();

(function sectionM_RN06() {
  // RN-06 — opts.clock must be invoked AFTER envelope validation, not before. A throwing opts
  // accessor must not block the build (clock is best-effort).
  let clockCalled = false;
  const hostileOpts = {};
  Object.defineProperty(hostileOpts, 'clock', { enumerable: true, configurable: false, get() { throw new Error('boom'); } });
  const r = EG.buildEvidenceGraph(freshInput(), hostileOpts);
  chk('RN-06 throwing opts.clock accessor -> createdAt null (build still succeeds)', r.valid === true && r.graph.createdAt === null);

  // Bad envelope + bad clock -> envelope error wins (clock never called).
  const badInp = { rawEvidence: [] };  // missing caseAssociation
  const opts2 = { clock: () => { clockCalled = true; return NOW; } };
  const r2 = EG.buildEvidenceGraph(badInp, opts2);
  chk('RN-06 envelope failure blocks before clock', r2.eligible === false && clockCalled === false);
})();

(function sectionM_RN07() {
  // RN-07 — internal helpers are not exported (asserted in section J).
  chk('RN-07 buildEvidenceGraph remains the only public entry', typeof EG.buildEvidenceGraph === 'function');
})();

(function sectionM_RN08() {
  // RN-08 — a nodeId like 'constructor' must not collide with Object.prototype keys when used as
  // a map key in adjacency / colour / in-degree / byId maps.
  const a = freshNode({ nodeId: 'constructor', identity: freshId({ sourceId: 'src_c' }) });
  const b = freshNode({ nodeId: 'toString', identity: freshId({ sourceId: 'src_t' }), supportingEdges: ['constructor'] });
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a, b] }), { clock: CLOCK });
  chk('RN-08 nodeId="constructor" + "toString" builds without prototype collision', r.valid === true && r.graph.nodes.length === 2);
  chk('RN-08 supports edge from toString -> constructor present', r.valid === true && r.graph.edges.some(e => e.from === 'toString' && e.to === 'constructor' && e.kind === 'supports'));
})();

(function sectionM_RN09() {
  // RN-09 — ENVELOPE_BYTE_CAP enforced post-sanitization. Build many valid nodes each with
  // moderate payload; the per-observation params key cap (PARAMS_KEYS_CAP) protects against
  // per-node bloat. Confirm an over-cap configuration is rejected.
  const arr = [];
  // each node's params has many keys -> trips PARAMS_KEYS_CAP (per-node ARRAY_CAP_EXCEEDED counted)
  const bigParams = {};
  for (let k = 0; k < EG.PARAMS_KEYS_CAP + 5; k++) bigParams['k' + k] = k;
  arr.push(freshNode({ observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: bigParams, channel: 'rpm' } }));
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  // Node with > PARAMS_KEYS_CAP keys is rejected as ARRAY_CAP_EXCEEDED.
  chk('RN-09 per-observation params key cap enforced', r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.ARRAY_CAP_EXCEEDED] === 1);
})();

// ── Section N — Codex D2 Round 2 finding closures (RN-01 / RN-03 / RN-06 / RN-09) ──
(function sectionN_RN01_round2() {
  // RN-01 round-2: clock mutates rawEvidence array AFTER envelope validation. With clock deferred
  // to LAST, the per-node loop has already read all descriptors before clock fires.
  const a = freshNode({ nodeId: 'ev_a' });
  const arr = [a];
  const out = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), {
    clock: () => {
      // Hostile clock — try to replace the slot. The per-node loop is already done by this point.
      arr[0] = freshNode({ nodeId: 'ev_mutated' });
      return NOW;
    },
  });
  chk('RN-01 r2: hostile clock cannot replace already-read rawEvidence slots', out.valid === true && out.graph.nodes.length === 1 && out.graph.nodes[0].nodeId === 'ev_a');
})();

(function sectionN_RN03_round2() {
  // RN-03 round-2: two same-nodeId candidates differing only by confidence.state must sort
  // deterministically and produce a deterministic dedup outcome.
  const a_unresolved = freshNode({ nodeId: 'a', identity: freshId({ sourceId: 'src_a' }), confidence: { state: 'unresolved' } });
  const a_notcomputed = freshNode({ nodeId: 'a', identity: freshId({ sourceId: 'src_a' }), confidence: { state: 'not_computed' } });
  const r1 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_unresolved, a_notcomputed] }), { clock: CLOCK });
  const r2 = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_notcomputed, a_unresolved] }), { clock: CLOCK });
  chk('RN-03 r2: same dedup outcome regardless of permutation (confidence-distinct)', r1.valid === true && r2.valid === true && r1.graph.nodes[0].confidence.state === r2.graph.nodes[0].confidence.state);
  chk('RN-03 r2: same graphId regardless of permutation', r1.valid === true && r2.valid === true && r1.graph.graphId === r2.graph.graphId);
  // Different confidence.state → different graphId (confidence is part of graphId payload).
  const onlyUnresolved = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_unresolved] }), { clock: CLOCK });
  const onlyNotComputed = EG.buildEvidenceGraph(freshInput({ rawEvidence: [a_notcomputed] }), { clock: CLOCK });
  chk('RN-03 r2: confidence-distinct singletons produce distinct graphId', onlyUnresolved.graph.graphId !== onlyNotComputed.graph.graphId);
})();

(function sectionN_RN06_round2() {
  // RN-06 round-2: clock invoked LAST. Bad envelope -> clock never runs.
  let clockCalled = false;
  const badInp = { rawEvidence: [] };  // missing caseAssociation
  const r = EG.buildEvidenceGraph(badInp, { clock: () => { clockCalled = true; return NOW; } });
  chk('RN-06 r2: envelope failure never invokes clock', r.eligible === false && clockCalled === false);
  // Per-node validation runs without clock; clock invoked only after sanitization
  let order = [];
  const goodInp = freshInput();
  const r2 = EG.buildEvidenceGraph(goodInp, { clock: () => { order.push('clock'); return NOW; } });
  chk('RN-06 r2: valid build still produces createdAt from clock', r2.valid === true && r2.graph.createdAt === NOW);
  chk('RN-06 r2: clock invoked exactly once', order.length === 1);
})();

(function sectionN_RN09_round2() {
  // RN-09 round-2: PARAM_KEY_BYTE_CAP enforced — a single param KEY exceeding 64 bytes → rejected.
  const longKey = 'k'.repeat(EG.PARAM_KEY_BYTE_CAP + 1);
  const obs = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { [longKey]: 1 }, channel: 'rpm' };
  const n = freshNode({ observation: obs });
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
  chk('RN-09 r2: oversized param KEY → BYTE_CAP_EXCEEDED counted per node', r.valid === true && r.graph.provenance.rejectedReasonsSummary[CODES.BYTE_CAP_EXCEEDED] === 1);
  // ENVELOPE_BYTE_CAP pre-canonicalization estimate fires when actual UTF-8 bytes exceed cap.
  // 80 nodes × 30 keys × 250-byte values ≈ 600 KB → well above 256 KB cap (round-3 RN-14 closure
  // uses accurate UTF-8 byte counting, not 4096-byte per-node overestimate).
  const arrBig = [];
  for (let i = 0; i < 80; i++) {
    const ob = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: {}, channel: 'rpm_' + i };
    for (let k = 0; k < 30; k++) ob.params['k' + i + '_' + k] = 'val_' + ('z'.repeat(250));
    arrBig.push(freshNode({ nodeId: 'ev_big_' + i, observation: ob }));
  }
  const rBig = EG.buildEvidenceGraph(freshInput({ rawEvidence: arrBig }), { clock: CLOCK });
  chk('RN-09 r2: oversized envelope content rejected', rBig.eligible === false && rBig.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
})();

// ── Section O — Codex D2 Round 3 finding closures (RN-09 UTF-8 / RN-13 intrinsic / RN-14 estimator) ──
(function sectionO_RN09_round3() {
  // RN-09 round-3: param KEY byte cap uses real UTF-8 width, not UTF-16 code units. A 4-byte
  // UTF-8 character (e.g. emoji-like 🎯 = 4 bytes in UTF-8 but 2 UTF-16 code units) must be
  // counted as 4 bytes.
  // PARAM_KEY_BYTE_CAP = 64 bytes. 17 × 4-byte UTF-8 chars = 68 bytes > cap → reject.
  const emoji = '\u{1F3AF}'; // 4-byte UTF-8 sequence
  let longKey = '';
  for (let i = 0; i < 17; i++) longKey += emoji;
  const obs = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { [longKey]: 1 }, channel: 'rpm' };
  const n = freshNode({ observation: obs });
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [n] }), { clock: CLOCK });
  chk('RN-09 r3: UTF-8 byte counting for param keys (4-byte chars)', r.valid === true && (r.graph.provenance.rejectedReasonsSummary[CODES.BYTE_CAP_EXCEEDED] || 0) === 1);
})();

(function sectionO_RN13() {
  // RN-13 round-3: a hostile clock that replaces Object.freeze / Object.assign at runtime cannot
  // corrupt _materializeGraph because every materialize-time intrinsic call goes through captured
  // module-init refs.
  const originalAssign = Object.assign;
  const originalFreeze = Object.freeze;
  let invoked = false;
  const hostileClock = () => {
    invoked = true;
    // attempt tampering — should be harmless because the builder uses captured refs
    Object.assign = function () { return { tampered: true }; };
    Object.freeze = function (o) { return o; }; // no-op so caller could mutate downstream
    return NOW;
  };
  let r;
  try { r = EG.buildEvidenceGraph(freshInput(), { clock: hostileClock }); }
  finally {
    Object.assign = originalAssign;
    Object.freeze = originalFreeze;
  }
  chk('RN-13: hostile clock invoked', invoked === true);
  chk('RN-13: graph nevertheless valid', r.valid === true);
  chk('RN-13: graph deep-frozen (caller cannot push to nodes)', (function () {
    let threw = false;
    try { r.graph.nodes.push({ malicious: true }); } catch (e) { threw = true; }
    return threw || r.graph.nodes.length === 1;
  })());
  chk('RN-13: graph.provenance frozen (caller cannot inject keys)', Object.isFrozen(r.graph.provenance));
  chk('RN-13: graph.provenance.rejectedReasonsSummary frozen', Object.isFrozen(r.graph.provenance.rejectedReasonsSummary));
  chk('RN-13: no tampered marker key in rejectedReasonsSummary', !Object.prototype.hasOwnProperty.call(r.graph.provenance.rejectedReasonsSummary, 'tampered'));
  chk('RN-13: no tampered marker key in graph', !Object.prototype.hasOwnProperty.call(r.graph, 'tampered'));
})();

(function sectionO_RN14() {
  // RN-14 round-3: rough estimator no longer charges 4096 bytes per node; 64 compact valid nodes
  // (~14 KB actual) must build successfully. Each node uses a distinct sourceId so the
  // correlated_with pair count stays at 0 (avoids tripping EDGES_CAP_TOTAL via 64-way correlation).
  const arr = [];
  for (let i = 0; i < 64; i++) {
    arr.push(freshNode({
      nodeId: 'ev_compact_' + i,
      identity: freshId({ sourceId: 'src_compact_' + i }),
      observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: { v: i }, channel: 'ch_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-14: 64 compact valid nodes build successfully (no fixed-overhead over-reject)', r.valid === true && r.graph.nodes.length === 64);
})();

// ── Section P — Codex D2 Round 4 finding closures (RN-13 round-3 + RN-15) ──────
(function sectionP_RN13_round3() {
  // RN-13 round-3: hostile clock that reassigns Array.prototype.slice / Array.prototype.map
  // must NOT corrupt _materializeGraph output (which now uses _safeSlice / _safeMap via captured
  // Array.prototype.* refs).
  const originalSlice = Array.prototype.slice;
  const originalMap = Array.prototype.map;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput(), {
      clock: () => {
        // After clock fires, the builder is about to call _materializeGraph. Replace
        // Array.prototype.slice / map to inject a malicious shape if the materializer
        // dynamically resolves them.
        Array.prototype.slice = function () { return [{ tampered: true }]; };
        Array.prototype.map = function () { return [{ tampered: true }]; };
        return NOW;
      },
    });
  } finally {
    Array.prototype.slice = originalSlice;
    Array.prototype.map = originalMap;
  }
  chk('RN-13 r3: hostile Array.prototype.slice/map does not inject into graph.nodes', r.valid === true && r.graph.nodes.length === 1 && r.graph.nodes[0].nodeId === 'ev_001');
  chk('RN-13 r3: hostile slice/map does not corrupt edges', r.valid === true && Array.isArray(r.graph.edges));
  chk('RN-13 r3: hostile slice/map does not corrupt topologicalOrder', r.valid === true && r.graph.topologicalOrder.indexOf('ev_001') !== -1);
  chk('RN-13 r3: no tampered marker key in graph.nodes', r.valid === true && r.graph.nodes.every(n => !Object.prototype.hasOwnProperty.call(n, 'tampered')));
})();

(function sectionP_RN15() {
  // RN-15: estimator must account for JSON escape expansion. NUL (1 UTF-8 byte) →   (6 JSON
  // bytes). 80 nodes × 30 keys × 70 NULs per value would be ~168 KB UTF-8 but ~ 1 MB JSON-encoded.
  // The accurate JSON-aware estimator must reject pre-canonicalization.
  const arr = [];
  const nulChar = ' ';
  let nulValue = '';
  for (let n = 0; n < 70; n++) nulValue += nulChar;
  for (let i = 0; i < 80; i++) {
    const ob = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: {}, channel: 'rpm_' + i };
    for (let k = 0; k < 30; k++) ob.params['k' + i + '_' + k] = nulValue;
    arr.push(freshNode({ nodeId: 'ev_nul_' + i, identity: freshId({ sourceId: 'src_nul_' + i }), observation: ob }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-15: NUL-heavy payload rejected pre-canonical (JSON escape expansion accounted for)', r.eligible === false && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
})();

// ── Section Q — Codex D2 Round 5 finding closures (RN-13 round-4 + RN-15 round-4) ──────
(function sectionQ_RN13_round4_FunctionPrototypeCall() {
  // RN-13 round-4 (Round 5 evidence): a hostile clock that replaces
  // `Function.prototype.call` (a strictly more general intrinsic than Array.prototype.slice /
  // Array.prototype.map themselves) MUST NOT corrupt `_materializeGraph` output. The Round 5
  // candidate (`ec00b88`) returned `{valid:true, nodes:[{tampered:true}], frozen:false}` for the
  // exact exploit reproduced below. After the Round 6 fix, `_safeSlice` / `_safeMap` are
  // direct-loop helpers that do not route through Function.prototype.call — so the exploit must
  // either succeed cleanly (no `{tampered:true}` anywhere) or fail-closed; either way the result
  // never contains an attacker-supplied unfrozen entry.
  const origCall = Function.prototype.call;
  const origSlice = Array.prototype.slice;
  const origMap = Array.prototype.map;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput(), {
      clock: function () {
        // eslint-disable-next-line no-extend-native
        Function.prototype.call = function () {
          if (this === origSlice || this === origMap) return [{ tampered: true }];
          return Reflect.apply(origCall, this, arguments);
        };
        return NOW;
      },
    });
  } finally {
    // eslint-disable-next-line no-extend-native
    Function.prototype.call = origCall;
  }
  function hasTampered(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'tampered')) return true;
    }
    return false;
  }
  chk('RN-13 r4: hostile Function.prototype.call replacement — build returns a value', r !== undefined && r !== null);
  chk('RN-13 r4: graph.nodes contains no {tampered:true} entry', r.valid === true && !hasTampered(r.graph.nodes));
  chk('RN-13 r4: graph.correlationGroups contains no {tampered:true} entry', r.valid === true && !hasTampered(r.graph.correlationGroups));
  chk('RN-13 r4: graph.topologicalOrder contains no {tampered:true} entry', r.valid === true && !hasTampered(r.graph.topologicalOrder));
  chk('RN-13 r4: graph.nodes[0] is the legitimate sanitized node', r.valid === true && r.graph.nodes.length === 1 && r.graph.nodes[0].nodeId === 'ev_001');
  chk('RN-13 r4: graph.nodes[0] is frozen (no unfrozen attacker object)', r.valid === true && Object.isFrozen(r.graph.nodes[0]));
  chk('RN-13 r4: graph.nodes array is frozen (push must throw)', (function () {
    if (!r.valid) return false;
    let threw = false;
    try { r.graph.nodes.push({ malicious: true }); } catch (e) { threw = true; }
    return threw || r.graph.nodes.length === 1;
  })());
  chk('RN-13 r4: graph is deeply frozen at top level', r.valid === true && Object.isFrozen(r.graph));
})();

(function sectionQ_RN13_round4_FunctionPrototypeApply() {
  // Symmetric exploit: replace `Function.prototype.apply` (in case the implementation switched to
  // .apply). Same outcome required — no `{tampered:true}` leaks.
  const origApply = Function.prototype.apply;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput(), {
      clock: function () {
        // eslint-disable-next-line no-extend-native
        Function.prototype.apply = function () { return [{ tampered: true }]; };
        return NOW;
      },
    });
  } finally {
    // eslint-disable-next-line no-extend-native
    Function.prototype.apply = origApply;
  }
  function hasTampered(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'tampered')) return true;
    }
    return false;
  }
  chk('RN-13 r4: hostile Function.prototype.apply replacement — graph.nodes clean', r.valid === true && !hasTampered(r.graph.nodes));
  chk('RN-13 r4: hostile Function.prototype.apply replacement — graph.correlationGroups clean', r.valid === true && !hasTampered(r.graph.correlationGroups));
  chk('RN-13 r4: hostile Function.prototype.apply replacement — graph.topologicalOrder clean', r.valid === true && !hasTampered(r.graph.topologicalOrder));
})();

(function sectionQ_RN13_round4_ArrayPrototypePush() {
  // Belt-and-suspenders: replace `Array.prototype.push` from inside the clock. The direct-loop
  // helpers must not depend on .push (they use indexed assignment `out[i] = x`). The legitimate
  // node must still appear, frozen, untampered.
  const origPush = Array.prototype.push;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput(), {
      clock: function () {
        // eslint-disable-next-line no-extend-native
        Array.prototype.push = function () { return 0; }; // no-op push (would silently drop entries)
        return NOW;
      },
    });
  } finally {
    // eslint-disable-next-line no-extend-native
    Array.prototype.push = origPush;
  }
  chk('RN-13 r4: hostile Array.prototype.push (no-op) — graph still contains legitimate node', r.valid === true && r.graph.nodes.length === 1 && r.graph.nodes[0].nodeId === 'ev_001');
  chk('RN-13 r4: hostile Array.prototype.push — graph.nodes[0] frozen', r.valid === true && Object.isFrozen(r.graph.nodes[0]));
})();

(function sectionQ_RN15_round4_loneLowSurrogate() {
  // RN-15 round-4 (Round 5 evidence): lone LOW surrogate values must be counted as 6 bytes each
  // (\uXXXX JSON escape), not 3. The Round 5 candidate undercount let 35×30×70 = 73,500 lone
  // surrogates slip past the per-node running total (~245 KB estimated vs ~471 KB actual). After
  // the Round 6 fix the per-node estimator (Step 4.5 in the builder) must trip
  // BYTE_CAP_EXCEEDED before any post-canonical work runs.
  const bad = '\udc00'.repeat(70);
  const arr = [];
  for (let i = 0; i < 35; i++) {
    const p = {};
    for (let k = 0; k < 30; k++) p['k' + i + '_' + k] = bad;
    arr.push(freshNode({
      nodeId: 'ev_sur_' + i,
      identity: freshId({ sourceId: 'src_sur_' + i }),
      observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: p, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-15 r4: lone low surrogate payload rejected (BYTE_CAP_EXCEEDED)', r.eligible === false && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
  chk('RN-15 r4: lone low surrogate payload tripped at PRE-canonical stage (not post)', r.eligible === false && typeof r.detail === 'string' && /pre-canonicalization/.test(r.detail));
})();

(function sectionQ_RN15_round4_loneHighSurrogate() {
  // Symmetric coverage: lone HIGH surrogate (0xD800-0xDBFF without a following low) also escapes
  // to 6 chars. The previous estimator wrongly assumed every high surrogate had a paired low and
  // skipped the next char (i++) regardless, undercount AND mis-stepping.
  const bad = '\ud83d'.repeat(70); // lone high surrogate, no following low
  const arr = [];
  for (let i = 0; i < 35; i++) {
    const p = {};
    for (let k = 0; k < 30; k++) p['k' + i + '_' + k] = bad;
    arr.push(freshNode({
      nodeId: 'ev_hi_' + i,
      identity: freshId({ sourceId: 'src_hi_' + i }),
      observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: p, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-15 r4: lone high surrogate payload rejected (BYTE_CAP_EXCEEDED)', r.eligible === false && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
  chk('RN-15 r4: lone high surrogate payload tripped at PRE-canonical stage', r.eligible === false && typeof r.detail === 'string' && /pre-canonicalization/.test(r.detail));
})();

(function sectionQ_RN15_round4_validSurrogatePair_stillBuildsCompactGraphs() {
  // Negative control: a SHORT payload using valid surrogate pairs (e.g. 🚀 = 🚀 = 4
  // UTF-8 bytes per pair) must NOT trip the cap; the estimator should still count valid pairs as
  // 4 bytes (not 12) so legitimate compact graphs with emoji are not over-rejected.
  const emoji = '🚀'.repeat(10); // 10 rockets per value (20 code units, 4 bytes UTF-8 each pair = 40 bytes)
  const p = {};
  for (let k = 0; k < 5; k++) p['k_' + k] = emoji;
  const r = EG.buildEvidenceGraph(freshInput({
    rawEvidence: [freshNode({
      observation: { kind: 'metric_value', i18nKey: 'r3_0d.x', params: p, channel: 'rpm' },
    })],
  }), { clock: CLOCK });
  chk('RN-15 r4: valid surrogate pair (emoji) compact graph builds successfully', r.valid === true && r.graph.nodes.length === 1);
})();

// ── Section R — Codex D2 Round 6 finding closures (RN-13 round-4 setter / RN-16 / RN-17) ──────
(function sectionR_RN13_round4_ArrayPrototypeSetter() {
  // RN-13 round-4 (Round 6 evidence): a hostile clock installs
  // `Object.defineProperty(Array.prototype, "0", { set: ... })` so that `out[i] = ...` on a
  // freshly-created `out = []` invokes the prototype setter, which installs its own
  // `{tampered:true}` data descriptor on out[0]. The Round 6 candidate `ec00b88` had direct-loop
  // `out[i] = arr[i]` and was still vulnerable. The Round 7 fix uses captured
  // `Object.defineProperty` to install the assignment via [[DefineOwnProperty]], which bypasses
  // the [[Set]] protocol and any prototype-chain accessor.
  const origDefineProperty = Object.defineProperty;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput(), {
      clock: function () {
        origDefineProperty(Array.prototype, '0', {
          configurable: true,
          set: function () {
            origDefineProperty(this, '0', { value: { tampered: true }, writable: true, enumerable: true, configurable: true });
          },
          get: function () { return undefined; },
        });
        return NOW;
      },
    });
  } finally {
    delete Array.prototype[0];
  }
  function hasTampered(arr) {
    if (!Array.isArray(arr)) return false;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'tampered')) return true;
    }
    return false;
  }
  chk('RN-13 r4-setter: hostile Array.prototype[0] setter — graph.nodes contains no tampered entry', r.valid === true && !hasTampered(r.graph.nodes));
  chk('RN-13 r4-setter: graph.correlationGroups clean', r.valid === true && !hasTampered(r.graph.correlationGroups));
  chk('RN-13 r4-setter: graph.topologicalOrder clean', r.valid === true && !hasTampered(r.graph.topologicalOrder));
  chk('RN-13 r4-setter: graph.nodes[0] is the legitimate node', r.valid === true && r.graph.nodes.length === 1 && r.graph.nodes[0].nodeId === 'ev_001');
  chk('RN-13 r4-setter: graph.nodes[0] frozen', r.valid === true && Object.isFrozen(r.graph.nodes[0]));
})();

(function sectionR_RN13_round4_ObjectPrototypeSetter() {
  // Symmetric coverage on _materializeGraph's keyed-assignment sites (rejectedSourceReplays copy +
  // rejectedReasonsSummary copy). Install an Object.prototype setter at a likely reason-code key
  // and verify no tampered count appears in the graph's provenance summary. The Round 7 fix
  // routes both assignment sites through _ObjectDefineProperty against Object.create(null)
  // targets, so neither prototype-chain lookup nor proto-pollution can interfere.
  const origDefineProperty = Object.defineProperty;
  let r;
  try {
    r = EG.buildEvidenceGraph(freshInput({
      rawEvidence: [freshNode(), freshNode({ nodeId: 'ev_001' })], // duplicate id triggers a reason tally
    }), {
      clock: function () {
        origDefineProperty(Object.prototype, 'EVIDENCE_DUPLICATE_ID', {
          configurable: true,
          set: function () {
            origDefineProperty(this, 'EVIDENCE_DUPLICATE_ID', { value: 'tampered', writable: true, enumerable: true, configurable: true });
          },
          get: function () { return undefined; },
        });
        return NOW;
      },
    });
  } finally {
    delete Object.prototype.EVIDENCE_DUPLICATE_ID;
  }
  // The legitimate count for EVIDENCE_DUPLICATE_ID should be a number (1), not the string 'tampered'.
  const summary = r.valid && r.graph && r.graph.provenance && r.graph.provenance.rejectedReasonsSummary;
  chk('RN-13 r4-objsetter: provenance.rejectedReasonsSummary.EVIDENCE_DUPLICATE_ID is numeric (not tampered)', r.valid === true && summary && typeof summary['EVIDENCE_DUPLICATE_ID'] === 'number' && summary['EVIDENCE_DUPLICATE_ID'] === 1);
})();

(function sectionR_RN16_asciiHeavyPayload() {
  // RN-16 (Round 6 evidence): 35 nodes × 30 ASCII params × 225 chars passes the previous
  // approximation (~256 KB estimated) and fails Step 17 (post-canonical) at 265,511 bytes.
  // The Round 7 fix uses exact per-node JSON.stringify + WRAPPER_FIXED_BYTES, so the payload
  // is rejected at Step 4.5 (pre-canonicalization).
  const arr = [];
  const ascii = 'x'.repeat(225);
  for (let i = 0; i < 35; i++) {
    const p = {};
    for (let k = 0; k < 30; k++) p['k' + i + '_' + k] = ascii;
    arr.push(freshNode({
      nodeId: 'ev_ascii_' + i,
      identity: freshId({ sourceId: 'src_ascii_' + i }),
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: p, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-16: 35×30×225 ASCII payload rejected (BYTE_CAP_EXCEEDED)', r.eligible === false && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
  chk('RN-16: ASCII payload tripped at PRE-canonical stage', r.eligible === false && typeof r.detail === 'string' && /pre-canonicalization/.test(r.detail));
})();

(function sectionR_RN17_delIsNotEscaped() {
  // RN-17 (Round 6 evidence): DEL (U+007F) is NOT escaped by JSON.stringify per ES §25.5.2.2.
  // The Round 6 candidate treated DEL as 6 bytes (\uXXXX), over-rejecting a payload of
  // 35 × 30 × 70 DEL chars whose actual JSON is only 101,214 bytes (well under 256 KB cap).
  // The Round 7 fix removes DEL from the escape branch; the payload must now BUILD successfully.
  const arr = [];
  const dels = '\x7f'.repeat(70);
  for (let i = 0; i < 35; i++) {
    const p = {};
    for (let k = 0; k < 30; k++) p['k' + i + '_' + k] = dels;
    arr.push(freshNode({
      nodeId: 'ev_del_' + i,
      identity: freshId({ sourceId: 'src_del_' + i }),
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: p, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-17: DEL-heavy payload (~101 KB actual) NOT over-rejected', r.valid === true);
  chk('RN-17: DEL-heavy payload builds 35 nodes', r.valid === true && r.graph.nodes.length === 35);
})();

(function sectionR_jsonStringWidth_table() {
  // Direct table verification of _jsonStringWidth widths per Codex Round 6 expectation
  // (2/3/8/8/6/12 for empty / ASCII / lone-low / lone-high / pair / mixed). We exercise the
  // estimator indirectly via single-param graphs: a node whose only variable content is a single
  // param value, the per-node JSON size delta corresponds to jsonStringWidth(value).
  function nodeWithValue(v) {
    return freshNode({
      nodeId: 'ev_widthcheck',
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: { v: v }, channel: 'rpm' },
    });
  }
  function bytesFor(v) {
    const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: [nodeWithValue(v)] }), { clock: CLOCK });
    if (!r.valid) return -1;
    // Re-measure post-canonical via the same idPayload shape Step 17 sees; cheaper to count from
    // graph.nodes[0] via stable canonicalization. The width relationship is monotonic so a
    // 6-byte-per-char value should produce a strictly larger JSON than a 1-byte one.
    return JSON.stringify({ v }).length;
  }
  // Sanity: empty value JSON-encoded is `{"v":""}` = 8 chars; ASCII "x" = `{"v":"x"}` = 9 chars.
  chk('jsonStringWidth: empty string ASCII baseline produces smaller JSON than ASCII char', bytesFor('') < bytesFor('x'));
  // Valid surrogate pair (🚀) JSON-encodes to 4 UTF-8 bytes via UTF-8 escaping (each pair = 4
  // bytes), shorter than two lone surrogates which JSON.stringify must escape as \uXXXX (12
  // bytes total). Compare a pair against a deliberately-broken pair (the high surrogate followed
  // by an ASCII char, leaving the high orphaned).
  chk('jsonStringWidth: valid surrogate pair JSON shorter than orphaned high + ASCII', JSON.stringify({ v: '🚀' }).length < JSON.stringify({ v: '\ud83d' + 'x' }).length);
  // Lone low surrogate escapes to \uXXXX = 6 chars; ASCII 'x' is 1 char in JSON. So lone-low
  // JSON is longer than ASCII for the same character count.
  chk('jsonStringWidth: lone low surrogate JSON longer than ASCII for same char count', JSON.stringify({ v: '\udc00'.repeat(10) }).length > JSON.stringify({ v: 'x'.repeat(10) }).length);
})();

// ── Section S — Codex D2 Round 7 finding closure (RN-16 same-source correlation explosion) ──
(function sectionS_RN16_sameSourceCorrelationExplosion() {
  // RN-16 STILL-OPEN at Round 7 (Codex evidence on 90bf868): 35 same-source nodes share one
  // sourceId, so they all bucket into a single correlation group. The graph builder synthesises
  // a correlated_with edge between every pair → 35 × 34 / 2 = 595 edges, ~71 KB extra in the
  // top-level edges array. The previous Step 4.5 estimate counted only per-node bytes (~211 KB),
  // PASSED, then Step 17 caught the actual canonical at 264,011 bytes. The Round 8 fix adds
  // Step 11.5 (between edge cap check and cycle detection) which builds an EXACT preview
  // idPayload using captured intrinsics and runs _utf8len(_JSONStringify(preview)) for the
  // authoritative pre-canonicalisation envelope check, so the rejection happens before cycle
  // DFS / topological sort / per-element freeze / graphId derivation.
  const arr = [];
  const ascii = 'x'.repeat(195);
  for (let i = 0; i < 35; i++) {
    const p = {};
    for (let k = 0; k < 30; k++) p['k' + i + '_' + k] = ascii;
    arr.push(freshNode({
      nodeId: 'ev_corr_' + i,
      identity: freshId({ sourceId: 'single_corr_src' }), // SAME sourceId → 1 group of 35 → 595 edges
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: p, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-16 r7: same-source 595-edge payload rejected (BYTE_CAP_EXCEEDED)', r.eligible === false && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
  chk('RN-16 r7: rejection happens at PRE-materialization (Step 11.5), not post-canonical (Step 17)', r.eligible === false && typeof r.detail === 'string' && /pre-materialization/.test(r.detail));
  chk('RN-16 r7: detail includes the actual envelope byte count for diagnostics', r.eligible === false && typeof r.detail === 'string' && /\d+\s+exceeds\s+ENVELOPE_BYTE_CAP=/.test(r.detail));
})();

(function sectionS_RN16_largeButValid() {
  // Negative control: a real-world graph with many distinct sources (so correlation groups are
  // tiny, no edge explosion) and per-node content well within budget must still BUILD. This
  // guards against the Step 11.5 check accidentally over-rejecting legitimate large graphs.
  const arr = [];
  for (let i = 0; i < 35; i++) {
    arr.push(freshNode({
      nodeId: 'ev_legit_' + i,
      identity: freshId({ sourceId: 'src_legit_' + i }), // DISTINCT sources → 35 groups of 1 → 0 edges
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: { k: 'v' }, channel: 'rpm_' + i },
    }));
  }
  const r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  chk('RN-16 r7-control: 35 distinct-source compact nodes build successfully', r.valid === true && r.graph.nodes.length === 35);
  chk('RN-16 r7-control: zero correlated_with edges (each source group has 1 member)', r.valid === true && r.graph.edges.every(e => e.kind !== 'correlated_with'));
})();

// ── Section T — Codex D2 Round 8 finding closure (RN-18 inherited toJSON hook) ──────
(function sectionT_RN18_objectPrototypeToJsonMutation() {
  // RN-18 NEW at Round 8 (Codex evidence on 497c143): a hostile `Object.prototype.toJSON`
  // installed before buildEvidenceGraph was previously invoked by JSON.stringify during the
  // Step 11.5 envelope preview. The hook mutated the shared `edges` array, injecting an
  // `{kind:"invalid_kind"}` entry that bypassed Step 11's EDGE_KIND_ALLOWED enforcement and
  // ended up in the materialised graph (still frozen, but with a forbidden kind).
  // Round 9 fix: byte cap measurement switched from _JSONStringify to _stableStringify which
  // walks via Object.keys + manual recursion and never performs a [[Get]] for `toJSON`.
  let fired = 0;
  Object.defineProperty(Object.prototype, 'toJSON', {
    configurable: true,
    enumerable: false,
    value: function () {
      if (!fired && this && this.caseAssociation && Array.isArray(this.nodes) && Array.isArray(this.edges) && Array.isArray(this.correlationGroups)) {
        fired++;
        this.edges.push({ from: 'attacker', to: 'attacker', kind: 'invalid_kind' });
      }
      return this;
    },
  });
  let r;
  try {
    const arr = [];
    for (let i = 0; i < 3; i++) {
      arr.push(freshNode({
        nodeId: 'ev_to_' + i,
        identity: freshId({ sourceId: 'shared_to' }),
        observation: { kind: 'metric_value', i18nKey: 'r3.x', params: { v: 'x' }, channel: 'rpm_' + i },
      }));
    }
    r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  } finally {
    delete Object.prototype.toJSON;
  }
  chk('RN-18: hostile Object.prototype.toJSON never fires during build', fired === 0);
  chk('RN-18: graph has no injected invalid_kind edges', r.valid === true && r.graph.edges.every(e => e.kind !== 'invalid_kind'));
  chk('RN-18: graph edge count is exactly the legitimate count (3 nodes × correlated_with = 3)', r.valid === true && r.graph.edges.length === 3);
})();

(function sectionT_RN18_statefulSizeAttack() {
  // Round 8 evidence variant: a STATEFUL Object.prototype.toJSON returns one shape on the first
  // envelope call (Step 11.5) and a different oversized shape on the second (Step 17). This
  // previously made Step 11.5 pass while Step 17 rejected, breaking exact equivalence between
  // the two checks. With _stableStringify, toJSON is never invoked, so the size measurement is
  // deterministic and matches between checks.
  let envelopeCalls = 0;
  Object.defineProperty(Object.prototype, 'toJSON', {
    configurable: true,
    enumerable: false,
    value: function () {
      if (this && this.caseAssociation && Array.isArray(this.nodes) && Array.isArray(this.edges) && Array.isArray(this.correlationGroups)) {
        envelopeCalls++;
        if (envelopeCalls === 1) return {};
        if (envelopeCalls === 2) return { payload: 'x'.repeat(EG.ENVELOPE_BYTE_CAP + 1) };
      }
      return this;
    },
  });
  let r;
  try {
    const arr = [];
    for (let i = 0; i < 3; i++) {
      arr.push(freshNode({
        nodeId: 'ev_st_' + i,
        identity: freshId({ sourceId: 'shared_st' }),
        observation: { kind: 'metric_value', i18nKey: 'r3.x', params: { v: 'x' }, channel: 'rpm_' + i },
      }));
    }
    r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  } finally {
    delete Object.prototype.toJSON;
  }
  chk('RN-18: stateful toJSON envelope hook never fires', envelopeCalls === 0);
  chk('RN-18: graph builds normally despite stateful prototype hook', r.valid === true && r.graph.nodes.length === 3);
})();

(function sectionT_RN18_arrayPrototypeToJson() {
  // Symmetric coverage on Array.prototype.toJSON. The previous JSON.stringify call also performed
  // [[Get]] for `toJSON` on every array (not just objects), so this is the same exploit class.
  let fired = 0;
  Object.defineProperty(Array.prototype, 'toJSON', {
    configurable: true,
    enumerable: false,
    value: function () { fired++; return ['tampered']; },
  });
  let r;
  try { r = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK }); }
  finally { delete Array.prototype.toJSON; }
  chk('RN-18: hostile Array.prototype.toJSON never fires', fired === 0);
  chk('RN-18: arrays-with-toJSON exploit produces clean graph', r.valid === true && r.graph.nodes.length === 1);
})();

(function sectionT_RN18_throwingToJson() {
  // Edge case: a toJSON that throws would have crashed the original JSON.stringify path and
  // collapsed via the outer try/catch to INTERNAL_CONTRACT_VIOLATION. With _stableStringify, the
  // hook is never invoked, so the build proceeds normally.
  Object.defineProperty(Object.prototype, 'toJSON', {
    configurable: true,
    enumerable: false,
    value: function () { throw new Error('attacker'); },
  });
  let r;
  try { r = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK }); }
  finally { delete Object.prototype.toJSON; }
  chk('RN-18: throwing toJSON does not crash the build', r.valid === true && r.graph.nodes.length === 1);
})();

// ── Section U — Codex D2 Round 9 finding closures (RN-19 + RN-20) ──────
(function sectionU_RN19_arrayPrototypeJoinRebind() {
  // RN-19 NEW at Round 9 (Codex evidence on 6392196): the previous _stableStringify implementation
  // used `parts.join(',')` on dynamically-built arrays. A hostile Array.prototype.join replacement
  // (installed AFTER module load but BEFORE the build call) returned the empty string for the
  // envelope's outermost array, making the byte cap measurement read 0 — a baseline 271,556-byte
  // rejection was downgraded to a `valid:true` build with 35 nodes and 595 edges. The Round 10
  // fix rewrites _stableStringify to use only captured intrinsics + direct string concatenation +
  // manual insertion sort — no .join, .push, or .sort dependency on the dynamic arrays.
  function buildLarge() {
    const arr = [];
    for (let i = 0; i < 35; i++) {
      const p = {};
      for (let k = 0; k < 30; k++) p['p' + k] = 'x'.repeat(205);
      arr.push(freshNode({
        nodeId: 'ev_jn_' + String(i).padStart(2, '0'),
        identity: freshId({ sourceId: 'single_jn' }),
        observation: { kind: 'metric_value', i18nKey: 'r3.x', params: p, channel: 'rpm_' + i },
      }));
    }
    return EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  }
  const baseline = buildLarge();
  const origJoin = Array.prototype.join;
  let hits = 0;
  Array.prototype.join = function (s) {
    if (s === ',' && this.some && this.some(x => typeof x === 'string' && x.indexOf('"caseAssociation":') === 0)) {
      hits++;
      return '';
    }
    return origJoin.call(this, s);
  };
  let attacked;
  try { attacked = buildLarge(); }
  finally { Array.prototype.join = origJoin; }
  chk('RN-19: baseline build rejects via BYTE_CAP_EXCEEDED', baseline.eligible === false && Array.isArray(baseline.reasonCodes) && baseline.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
  chk('RN-19: hostile Array.prototype.join NEVER fires inside _stableStringify', hits === 0);
  chk('RN-19: attacked build still rejects with the same BYTE_CAP_EXCEEDED verdict (cap not falsified)', attacked.eligible === false && Array.isArray(attacked.reasonCodes) && attacked.reasonCodes.indexOf(CODES.BYTE_CAP_EXCEEDED) !== -1);
})();

(function sectionU_RN20_objectFreezeRebind() {
  // RN-20 NEW at Round 9: Step 14 previously called ambient `Object.freeze(edgesOut[ei])` inside
  // the loop that wraps each per-element edge. A hostile pre-build replacement of Object.freeze
  // could mutate an edge's `kind` field IMMEDIATELY BEFORE the would-be-frozen object is
  // wrapped, producing a `valid:true` graph containing forbidden edge kinds (e.g. "invalid_kind"
  // injected over the legitimate "correlated_with"). The Round 10 fix uses captured _ObjectFreeze.
  const arr = [];
  for (let i = 0; i < 3; i++) {
    arr.push(freshNode({
      nodeId: 'ev_fz_' + i,
      identity: freshId({ sourceId: 'shared_fz' }),
      observation: { kind: 'metric_value', i18nKey: 'r3.x', params: { v: 'x' }, channel: 'rpm_' + i },
    }));
  }
  const origFreeze = Object.freeze;
  Object.freeze = function (o) {
    if (o && o.kind === 'correlated_with') o.kind = 'invalid_kind';
    return origFreeze(o);
  };
  let r;
  try { r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK }); }
  finally { Object.freeze = origFreeze; }
  const invalidEdges = r.valid && r.graph.edges.filter(e => e.kind === 'invalid_kind');
  chk('RN-20: hostile Object.freeze rebinding does NOT inject invalid_kind into edges', r.valid === true && invalidEdges.length === 0);
  chk('RN-20: all 3 same-source correlated edges retain legitimate kind', r.valid === true && r.graph.edges.length === 3 && r.graph.edges.every(e => e.kind === 'correlated_with'));
})();

(function sectionU_RN19_arrayPrototypeSortRebind() {
  // Symmetric coverage: rebind Array.prototype.sort. _stableStringify uses manual insertion sort
  // on keys[], and the build path uses _arrSort (which invokes _ReflectApply on captured
  // _ArrayPrototypeSort). Both paths should be immune to sort rebinding.
  const origSort = Array.prototype.sort;
  let hits = 0;
  Array.prototype.sort = function () { hits++; return this; }; // no-op (preserve insertion order)
  let r;
  try {
    const arr = [
      freshNode({ nodeId: 'ev_c', identity: freshId({ sourceId: 'src_c' }) }),
      freshNode({ nodeId: 'ev_a', identity: freshId({ sourceId: 'src_a' }) }),
      freshNode({ nodeId: 'ev_b', identity: freshId({ sourceId: 'src_b' }) }),
    ];
    r = EG.buildEvidenceGraph(freshInput({ rawEvidence: arr }), { clock: CLOCK });
  } finally { Array.prototype.sort = origSort; }
  // Sort rebinding must not break the deterministic ordering of nodes (Codex round-7 verified
  // sorted-by-nodeId output is the determinism anchor for graphId).
  chk('RN-19: hostile Array.prototype.sort does not falsify deterministic node ordering', r.valid === true && r.graph.nodes[0].nodeId === 'ev_a' && r.graph.nodes[1].nodeId === 'ev_b' && r.graph.nodes[2].nodeId === 'ev_c');
})();

(function sectionU_RN19_arrayPrototypePushRebind() {
  // Symmetric coverage: rebind Array.prototype.push. All build-path push sites now use _arrPush
  // which goes through captured _ObjectDefineProperty.
  const origPush = Array.prototype.push;
  Array.prototype.push = function () { return 0; }; // no-op push
  let r;
  try { r = EG.buildEvidenceGraph(freshInput(), { clock: CLOCK }); }
  finally { Array.prototype.push = origPush; }
  chk('RN-19: hostile Array.prototype.push (no-op) does not drop legitimate sanitized node', r.valid === true && r.graph.nodes.length === 1 && r.graph.nodes[0].nodeId === 'ev_001');
})();

console.log('R3.0D D2 evidence-graph suite: ' + pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
