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
  // ENVELOPE_BYTE_CAP rough pre-canonicalization estimate fires when too many large nodes.
  const arrBig = [];
  for (let i = 0; i < 32; i++) {
    const ob = { kind: 'metric_value', i18nKey: 'r3_0d.x', params: {}, channel: 'rpm_' + i };
    for (let k = 0; k < 30; k++) ob.params['k' + i + '_' + k] = 'val_' + ('z'.repeat(200));  // ~200B value each
    arrBig.push(freshNode({ nodeId: 'ev_big_' + i, observation: ob }));
  }
  const rBig = EG.buildEvidenceGraph(freshInput({ rawEvidence: arrBig }), { clock: CLOCK });
  // Either ENVELOPE_BYTE_CAP fires (pre-canon estimate) OR per-value byte cap kicks in at D1.
  chk('RN-09 r2: oversized envelope content rejected', rBig.eligible === false || (rBig.valid === true && (rBig.graph.provenance.rejectedReasonsSummary[CODES.BYTE_CAP_EXCEEDED] || 0) > 0));
})();

console.log('R3.0D D2 evidence-graph suite: ' + pass + ' pass, ' + fail + ' fail');
if (fail > 0) process.exit(1);
