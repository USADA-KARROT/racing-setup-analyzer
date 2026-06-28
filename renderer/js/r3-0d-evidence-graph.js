/**
 * renderer/js/r3-0d-evidence-graph.js — R3.0D D2 · Evidence Graph Service.
 *
 * Builds the Evidence Graph from caller-supplied raw evidence-node candidates. Every node enters
 * the graph ONLY via the D1 evidence-node contract's structural validator
 * (R3_0D_EvidenceNodeContract.validateEvidenceNodeShape) — the builder NEVER trusts a caller
 * object directly. The graph output is a deep-frozen immutable structure whose downstream
 * consumers (D3 hypothesis engine, D4 priority engine, D5 engineer brief) can rely on for
 * deterministic semantics.
 *
 * Hard rules (R3.0D D2 EVIDENCE GRAPH):
 *   • Dedup is by both nodeId AND semantic fingerprint (source identity + observation + correlation
 *     group). A second copy under a different nodeId is rejected as EVIDENCE_GRAPH_DUPLICATED_SOURCE
 *     to prevent double-count.
 *   • Correlation grouping: nodes sharing the same (caseId, sessionId, lapId, sourceId) are placed in
 *     a single correlation group; independenceWeight = 1 / groupSize so a 4-derived-metrics source
 *     does not present as four independent supports. D2 marks correlation; D3 priority engine consumes.
 *   • Edge kinds are a closed enum {supports, contradicts, derived_from, correlated_with,
 *     invalidates}. supports/contradicts come from per-node supportingEdges/contradictingEdges (D1
 *     sanitized fields); correlated_with comes from intra-group pairs; derived_from + invalidates are
 *     reserved for future inputs (D2 emits NONE today). An emitted edge whose kind is outside the
 *     closed enum fails closed (cannot occur in practice because the builder only emits closed kinds).
 *   • Orphan edges (supportingEdges / contradictingEdges referencing an unknown nodeId) → fail-closed
 *     EVIDENCE_GRAPH_ORPHAN.
 *   • Self-edges are already caught at D1 (EVIDENCE_GRAPH_SELF_REFERENCE); the builder additionally
 *     re-checks after dedup so a renamed-id source replay cannot smuggle a self-edge through.
 *   • Cycle detection: any directed cycle over supports/contradicts/correlated_with → fail-closed
 *     EVIDENCE_GRAPH_CYCLE. The graph is not partially returned.
 *   • Association binding: every sanitized node's identity.caseId / sessionId MUST equal the input's
 *     caseAssociation; otherwise EVIDENCE_ASSOCIATION_MISMATCH per node.
 *   • Imported-summary elevation: an evidence node with sourceId === 'imported_summary' MUST NOT
 *     present credibility > 'derived' (no 'measured'). A higher claim → EVIDENCE_IMPORTED_SUMMARY_
 *     ELEVATION_FORBIDDEN. The builder enforces this even when D1 accepted the node shape.
 *   • Determinism: same sanitized input produces the same graphId, the same node order, edge order,
 *     topological order, correlation order, and dedup summary. The clock is INJECTABLE
 *     (opts.clock()); the createdAt field reflects the injected value; graphId is INDEPENDENT of
 *     the clock (it depends only on canonical content).
 *   • Deep freeze: the entire returned graph (including every nested array / object) is frozen so a
 *     caller holding the result cannot mutate downstream consumer input.
 *
 * Defence-in-depth surface (mirrors R3.0D D1 RN-01..RN-11 closures):
 *   • Every external entry validates the original input prototype, hidden own keys, nested-non-plain
 *     objects pre-clone (R3_0D_ReasonCodes helpers).
 *   • Builder wraps the whole work in an outer try/catch; any internal throw collapses to
 *     INTERNAL_CONTRACT_VIOLATION (never bubbles to caller).
 *   • Every node passes through D1 validateEvidenceNodeShape — sanitized = the only object that
 *     enters the graph. The original caller object is never referenced after validation.
 *   • Closed key set for the input envelope; extra own key → UNKNOWN_OWN_KEY.
 *   • Caps: NODES_CAP = 256; EDGES_CAP_TOTAL = 1024; CORRELATION_GROUPS_CAP = 64; CANNOT_CONCLUDE_CAP
 *     = 64; LIMITATIONS_CAP = 64; ENVELOPE_BYTE_CAP = 256 KiB (rough JSON size of input rawEvidence).
 *
 * UMD: Node require / Electron renderer global (R3_0D_EvidenceGraph).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0d/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0D_Contracts !== 'undefined') Contracts = R3_0D_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0d-evidence-graph.js requires contracts/r3.0d/index.js');

  var RC = Contracts.reasonCodes;
  var SI = Contracts.sourceIdentity;
  var EN = Contracts.evidenceNode;
  var CODES = RC.REASON_CODES;

  var SERVICE_VERSION = 1;
  var GRAPH_SCHEMA_VERSION = 1;

  // Closed enum — directive §8 Edge closed enum. derived_from + invalidates are reserved (D2 emits
  // none; later D-phase or test-fixture inputs may introduce them via dedicated APIs).
  var EDGE_KIND_ALLOWED = Object.freeze(['supports', 'contradicts', 'derived_from', 'correlated_with', 'invalidates']);

  // Caps. Mirror D1 envelope language so the contract surface is consistent.
  var NODES_CAP = 256;
  var EDGES_CAP_TOTAL = 1024;
  var CORRELATION_GROUPS_CAP = 64;
  var CANNOT_CONCLUDE_CAP = 64;
  var LIMITATIONS_CAP = 64;
  var INPUT_RAW_EVIDENCE_CAP = 512;   // pre-validation cap on caller array length

  // Allowed evidence sourceId values for which credibility may climb to 'measured'. 'imported_summary'
  // is the canonical example of a source that MUST stay capped at 'derived' (R3.0E future imports).
  // The builder enforces a SINGLE deny rule today (imported_summary). Future allowlist expansion is a
  // separate D-checkpoint review.
  var IMPORTED_SUMMARY_SOURCE_ID = 'imported_summary';
  var IMPORTED_SUMMARY_MAX_CREDIBILITY = 'derived'; // 'measured' is denied

  // Input envelope closed key set.
  var INPUT_KEYS = Object.freeze(['caseAssociation', 'rawEvidence', 'generationToken', 'contextVersion']);
  var CASE_ASSOCIATION_KEYS = Object.freeze(['caseId', 'sessionId', 'lapId']);
  var CASE_ASSOCIATION_REQUIRED = Object.freeze(['caseId', 'sessionId']);

  // Defence-in-depth helpers (mirror R3.0D D1 RN-01..RN-11 closures via the contract re-exports).
  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _isIsoTimestamp(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s); }
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys; try { keys = Reflect.ownKeys(o); } catch (e) { return false; }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (allowed.indexOf(k) === -1) return false;
    }
    return true;
  }
  // Stable string compare for deterministic ordering.
  function _strcmp(a, b) { if (a === b) return 0; return a < b ? -1 : 1; }

  // Stable canonical JSON serialiser — sorted keys at every depth; arrays preserved in order.
  // Used for semantic fingerprints + graphId hashing. Operates on D1-sanitized values, which are
  // guaranteed plain objects with primitive leaves (no Proxy, no class instances).
  function _stableStringify(value) {
    if (value === null) return 'null';
    var t = typeof value;
    if (t === 'string') return JSON.stringify(value);
    if (t === 'number') {
      if (!_isFiniteNum(value)) return 'null';
      return String(value);
    }
    if (t === 'boolean') return value ? 'true' : 'false';
    if (t === 'undefined') return 'null';
    if (Array.isArray(value)) {
      var parts = [];
      for (var i = 0; i < value.length; i++) parts.push(_stableStringify(value[i]));
      return '[' + parts.join(',') + ']';
    }
    if (t === 'object') {
      var keys = Object.keys(value).sort();
      var pp = [];
      for (var j = 0; j < keys.length; j++) {
        var k = keys[j];
        pp.push(JSON.stringify(k) + ':' + _stableStringify(value[k]));
      }
      return '{' + pp.join(',') + '}';
    }
    return 'null';
  }

  // FNV-1a 32-bit hash → lowercase hex. Deterministic; no crypto dependency; suitable as a content
  // discriminator for graphId / correlationGroupId fingerprints. We follow with a second pass to widen
  // collision resistance (cheap double-hash).
  function _hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function _hash64(s) { return _hash32(s) + _hash32(s + '|' + s.length); }

  // Semantic fingerprint — the canonical "is this the same evidence content?" key. Includes:
  //   caseId, sessionId, lapId, sourceId, sourceVersion, category, observation.kind, observation.channel,
  //   observation.i18nKey, observation.params (sorted JSON). Excludes nodeId (so renamed-id replays
  //   collide), excludes freshness (so a re-issue at a later timestamp still collides), excludes
  //   credibility / provenance / availability (those are downstream attributes, not the fact itself).
  function _semanticFingerprint(node) {
    var id = node.identity;
    var ob = node.observation;
    var payload = {
      caseId: id.caseId,
      sessionId: id.sessionId,
      lapId: id.lapId == null ? null : id.lapId,
      sourceId: id.sourceId,
      sourceVersion: id.sourceVersion,
      category: node.category,
      observation: {
        kind: ob.kind,
        channel: ob.channel == null ? null : ob.channel,
        i18nKey: ob.i18nKey,
        params: ob.params == null ? null : ob.params,
      },
    };
    return _hash64('semfp|' + _stableStringify(payload));
  }

  // Correlation group key — nodes sharing this key are correlated (same source observing the same
  // (case, session, lap, sourceId) origin). independenceWeight = 1 / group.length.
  function _correlationGroupKey(node) {
    var id = node.identity;
    var payload = id.caseId + '|' + id.sessionId + '|' + (id.lapId == null ? '-' : id.lapId) + '|' + id.sourceId;
    return _hash64('corr|' + payload);
  }

  // Validate input envelope shape. Fail-closed on any structural anomaly. IMPORTANT: this gate does
  // NOT recurse into rawEvidence items — each item is validated independently in the per-node loop
  // (so a hostile getter / class instance on ONE caller-supplied evidence node fails THAT node only
  // and is counted in rejectedReasonsSummary; it does not poison the whole envelope). The envelope
  // checks here cover ONLY:
  //   • top-level envelope shape (plain prototype, no hidden own key, closed key set)
  //   • caseAssociation deep (plain prototype + closed key + no hidden + no nested non-plain)
  //   • rawEvidence is a true Array.prototype-array with length within INPUT_RAW_EVIDENCE_CAP
  //   • optional generationToken / contextVersion top-level shape and byte caps
  function _validateInputEnvelope(input) {
    if (!RC.isOriginalPlainObject(input)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'input envelope is not a plain object (Proxy / class instance rejected)' });
    if (RC.hasHiddenOwnKey(input)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'input envelope carries Symbol-keyed or non-enumerable own property' });
    if (!_hasOnlyAllowedKeys(input, INPUT_KEYS)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'input envelope carries forbidden own key' });
    // caseAssociation deep validation (small, primitive-keyed — recursion is safe here).
    var ca = input.caseAssociation;
    if (!RC.isOriginalPlainObject(ca)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'caseAssociation prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(ca)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'caseAssociation carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(ca)) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'caseAssociation contains a nested non-plain object' });
    if (!_hasOnlyAllowedKeys(ca, CASE_ASSOCIATION_KEYS)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'caseAssociation carries forbidden own key' });
    for (var i = 0; i < CASE_ASSOCIATION_REQUIRED.length; i++) {
      if (!_nonEmptyStr(ca[CASE_ASSOCIATION_REQUIRED[i]])) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation.' + CASE_ASSOCIATION_REQUIRED[i] + ' missing' });
    }
    if ('lapId' in ca && ca.lapId !== null && !_nonEmptyStr(ca.lapId)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation.lapId must be null or non-empty string' });
    // rawEvidence — array gate ONLY (per-node body validates contents independently).
    if (!Array.isArray(input.rawEvidence)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence must be an array' });
    try { if (Object.getPrototypeOf(input.rawEvidence) !== Array.prototype) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence is not a plain Array (subclass / mutated prototype rejected)' }); }
    catch (e) { return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence prototype access threw' }); }
    if (input.rawEvidence.length > INPUT_RAW_EVIDENCE_CAP) return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'rawEvidence array length ' + input.rawEvidence.length + ' exceeds cap ' + INPUT_RAW_EVIDENCE_CAP });
    // optional generationToken
    if ('generationToken' in input && input.generationToken !== null && !_nonEmptyStr(input.generationToken)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken must be null or non-empty string' });
    if ('generationToken' in input && typeof input.generationToken === 'string' && input.generationToken.length > 256) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'generationToken exceeds 256 chars' });
    // optional contextVersion
    if ('contextVersion' in input && input.contextVersion !== null && !_nonEmptyStr(input.contextVersion)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion must be null or non-empty string' });
    if ('contextVersion' in input && typeof input.contextVersion === 'string' && input.contextVersion.length > 64) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'contextVersion exceeds 64 chars' });
    return { ok: true };
  }

  // Validate opts.clock injection — must be a function or absent. clock() must return an ISO-8601
  // string (or null to opt out). A throwing clock fails closed (graph still built with createdAt=null).
  function _resolveClock(opts) {
    if (!opts || opts.clock === undefined) return null; // no clock — createdAt null in graph
    if (typeof opts.clock !== 'function') return null;  // fail-closed: malformed clock
    try {
      var v = opts.clock();
      if (v === null) return null;
      if (!_isIsoTimestamp(v)) return null;
      return v;
    } catch (e) { return null; }
  }

  // DFS cycle detection over the directed edge list. Returns null if no cycle, or a representative
  // node id participating in the cycle. White/grey/black colouring.
  function _findCycle(nodeIds, adjacency) {
    var WHITE = 0, GREY = 1, BLACK = 2;
    var color = {};
    for (var i = 0; i < nodeIds.length; i++) color[nodeIds[i]] = WHITE;
    var stack = [];
    function visit(u) {
      color[u] = GREY;
      stack.push(u);
      var nbrs = adjacency[u] || [];
      for (var k = 0; k < nbrs.length; k++) {
        var v = nbrs[k];
        if (color[v] === GREY) return v;
        if (color[v] === WHITE) {
          var c = visit(v);
          if (c !== null) return c;
        }
      }
      color[u] = BLACK;
      stack.pop();
      return null;
    }
    // Iterate in deterministic order (caller passes sorted nodeIds).
    for (var j = 0; j < nodeIds.length; j++) {
      var n = nodeIds[j];
      if (color[n] === WHITE) {
        var hit = visit(n);
        if (hit !== null) return hit;
      }
    }
    return null;
  }

  // Kahn's algorithm — deterministic by tie-breaking on sorted nodeId. Assumes no cycle (callers
  // must check via _findCycle first).
  function _topologicalOrder(nodeIds, adjacency) {
    var inDegree = {};
    var i;
    for (i = 0; i < nodeIds.length; i++) inDegree[nodeIds[i]] = 0;
    for (i = 0; i < nodeIds.length; i++) {
      var nbrs = adjacency[nodeIds[i]] || [];
      for (var k = 0; k < nbrs.length; k++) {
        if (Object.prototype.hasOwnProperty.call(inDegree, nbrs[k])) inDegree[nbrs[k]]++;
      }
    }
    var queue = [];
    for (i = 0; i < nodeIds.length; i++) if (inDegree[nodeIds[i]] === 0) queue.push(nodeIds[i]);
    queue.sort(_strcmp);
    var out = [];
    while (queue.length > 0) {
      var u = queue.shift();
      out.push(u);
      var nbrs2 = (adjacency[u] || []).slice().sort(_strcmp);
      for (var m = 0; m < nbrs2.length; m++) {
        var v = nbrs2[m];
        if (Object.prototype.hasOwnProperty.call(inDegree, v)) {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            // insert sorted
            var lo = 0, hi = queue.length;
            while (lo < hi) { var mid = (lo + hi) >>> 1; if (queue[mid] < v) lo = mid + 1; else hi = mid; }
            queue.splice(lo, 0, v);
          }
        }
      }
    }
    return out;
  }

  // Build a closed-shape sanitized output graph from already-validated internals. Performs the
  // deep freeze + ordering + provenance summary in one pass.
  function _materializeGraph(o) {
    var graph = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      graphId: o.graphId,
      caseAssociation: Object.freeze({
        caseId: o.caseAssociation.caseId,
        sessionId: o.caseAssociation.sessionId,
        lapId: o.caseAssociation.lapId == null ? null : o.caseAssociation.lapId,
      }),
      sessionAssociation: Object.freeze({ sessionId: o.caseAssociation.sessionId }),
      nodes: Object.freeze(o.nodes.slice()),
      edges: Object.freeze(o.edges.slice()),
      topologicalOrder: Object.freeze(o.topologicalOrder.slice()),
      deduplicationSummary: Object.freeze({
        rejectedDuplicateIds: Object.freeze(o.dedup.rejectedDuplicateIds.slice()),
        rejectedSemanticDuplicates: Object.freeze(o.dedup.rejectedSemanticDuplicates.map(Object.freeze)),
        rejectedSourceReplays: Object.freeze(o.dedup.rejectedSourceReplays.map(Object.freeze)),
      }),
      correlationGroups: Object.freeze(o.correlationGroups.map(Object.freeze)),
      limitations: Object.freeze(o.limitations.slice()),
      cannotConclude: Object.freeze(o.cannotConclude.slice()),
      provenance: Object.freeze({
        builderVersion: SERVICE_VERSION,
        inputCount: o.provenance.inputCount,
        sanitizedCount: o.provenance.sanitizedCount,
        rejectedCount: o.provenance.rejectedCount,
        rejectedReasonsSummary: Object.freeze(Object.assign({}, o.provenance.rejectedReasonsSummary)),
      }),
      createdAt: o.createdAt,
      generationToken: o.generationToken,
      contextVersion: o.contextVersion,
    };
    return Object.freeze(graph);
  }

  /**
   * buildEvidenceGraph(input, opts) — primary entry.
   *
   *   input = {
   *     caseAssociation: { caseId, sessionId, lapId? },
   *     rawEvidence: [array of caller evidence node candidates],
   *     generationToken?: string,
   *     contextVersion?: string,
   *   }
   *   opts  = { clock?: function returning ISO-8601 string or null }
   *
   *   returns { valid: true, graph: <frozen graph> }  OR  RC.buildBlockedResult([codes], { detail }).
   */
  function buildEvidenceGraph(inputIn, optsIn) {
    try {
      // Step 0 — opts vetting (clock is the only field; everything else is ignored)
      var createdAt = _resolveClock(optsIn);

      // Step 1 — input envelope structural gate
      var env = _validateInputEnvelope(inputIn);
      if (!env.ok) return env;
      var caseAssociation = {
        caseId: inputIn.caseAssociation.caseId,
        sessionId: inputIn.caseAssociation.sessionId,
        lapId: ('lapId' in inputIn.caseAssociation) ? inputIn.caseAssociation.lapId : null,
      };
      var generationToken = ('generationToken' in inputIn && _nonEmptyStr(inputIn.generationToken)) ? inputIn.generationToken : null;
      var contextVersion = ('contextVersion' in inputIn && _nonEmptyStr(inputIn.contextVersion)) ? inputIn.contextVersion : null;

      // Step 2 — per-node validation through D1; collect sanitized + rejected accounting
      var inputCount = inputIn.rawEvidence.length;
      var sanitized = [];
      var rejectedCount = 0;
      var rejectedReasons = {};
      function tally(code) { rejectedReasons[code] = (rejectedReasons[code] || 0) + 1; }

      for (var i = 0; i < inputCount; i++) {
        var raw = inputIn.rawEvidence[i];
        // outer defence — even before invoking D1 validator, refuse non-plain prototype to keep the
        // failure mode surface unified with envelope-level checks.
        if (!RC.isOriginalPlainObject(raw)) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        if (RC.hasHiddenOwnKey(raw)) { rejectedCount++; tally(CODES.UNKNOWN_OWN_KEY); continue; }
        if (RC.hasNonPlainNestedObject(raw)) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        var check = EN.validateEvidenceNodeShape(raw);
        if (check.valid !== true) {
          rejectedCount++;
          var codes = Array.isArray(check.reasonCodes) ? check.reasonCodes : [CODES.EVIDENCE_NODE_INVALID];
          for (var rci = 0; rci < codes.length; rci++) tally(codes[rci]);
          continue;
        }
        var san = check.sanitized;
        // Step 2a — association binding: caseId / sessionId MUST equal envelope.caseAssociation.
        if (san.identity.caseId !== caseAssociation.caseId) { rejectedCount++; tally(CODES.SOURCE_IDENTITY_CASE_MISMATCH); continue; }
        if (san.identity.sessionId !== caseAssociation.sessionId) { rejectedCount++; tally(CODES.SOURCE_IDENTITY_SESSION_MISMATCH); continue; }
        // lapId binding — if envelope declares a lap, the node MUST be either lap-scoped (matching
        // lapId) OR case/session-scoped (lapId === null). A lap-scoped envelope and a different
        // lap-scoped node is a mismatch (cross-lap pollution).
        if (caseAssociation.lapId !== null && san.identity.lapId !== null && san.identity.lapId !== caseAssociation.lapId) {
          rejectedCount++; tally(CODES.SOURCE_IDENTITY_LAP_MISMATCH); continue;
        }
        // Step 2b — imported-summary elevation guard.
        if (san.identity.sourceId === IMPORTED_SUMMARY_SOURCE_ID && san.credibility === 'measured') {
          rejectedCount++; tally(CODES.EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN); continue;
        }
        sanitized.push(san);
      }

      // Step 3 — cap on accepted nodes (defence — D1 + envelope already capped, but the post-
      // validation count is the canonical authority for graph caps).
      if (sanitized.length > NODES_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'sanitized node count ' + sanitized.length + ' exceeds NODES_CAP=' + NODES_CAP });
      }

      // Step 4 — duplicate-ID dedup. Same nodeId twice → first kept, subsequent rejected.
      var byId = {};
      var keptById = [];
      var rejectedDuplicateIds = [];
      for (var d = 0; d < sanitized.length; d++) {
        var n = sanitized[d];
        if (Object.prototype.hasOwnProperty.call(byId, n.nodeId)) {
          rejectedDuplicateIds.push(n.nodeId);
          tally(CODES.EVIDENCE_DUPLICATE_ID);
          rejectedCount++;
          continue;
        }
        byId[n.nodeId] = n;
        keptById.push(n);
      }

      // Step 5 — semantic fingerprint dedup. Same fingerprint under different nodeId → first kept,
      // subsequent rejected. EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT.
      var fpSeen = {};
      var keptAfterSemantic = [];
      var rejectedSemanticDuplicates = [];
      for (var s = 0; s < keptById.length; s++) {
        var nn = keptById[s];
        var fp = _semanticFingerprint(nn);
        if (Object.prototype.hasOwnProperty.call(fpSeen, fp)) {
          rejectedSemanticDuplicates.push({ fingerprint: fp, keptNodeId: fpSeen[fp], droppedNodeId: nn.nodeId });
          tally(CODES.EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT);
          rejectedCount++;
          delete byId[nn.nodeId];
          continue;
        }
        fpSeen[fp] = nn.nodeId;
        keptAfterSemantic.push(nn);
      }

      // Step 6 — source-replay dedup. Two nodes that share sourceIdentityMatches (same case/session/
      // lap/sourceId/sourceVersion) but DIFFERENT observation are treated as RELATED but not
      // collapsed (they go into the same correlation group; D2 does NOT delete them). The semantic
      // fingerprint above already collapses identical observations. So this step only emits the
      // bookkeeping for the dedup summary — no further deletion.
      // (Intentionally empty: rejectedSourceReplays remains empty for D2.)
      var rejectedSourceReplays = [];

      // Step 7 — orphan edge detection. Any supportingEdges / contradictingEdges target nodeId that
      // is not in the surviving graph triggers EVIDENCE_GRAPH_ORPHAN. Whole graph rejected.
      var orphanDetected = false;
      var orphanDetail = null;
      for (var e = 0; e < keptAfterSemantic.length; e++) {
        var nx = keptAfterSemantic[e];
        var allEdges = nx.supportingEdges.concat(nx.contradictingEdges);
        for (var ek = 0; ek < allEdges.length; ek++) {
          var tgt = allEdges[ek];
          if (!Object.prototype.hasOwnProperty.call(byId, tgt)) {
            orphanDetected = true;
            orphanDetail = 'node ' + nx.nodeId + ' references unknown nodeId ' + tgt;
            break;
          }
        }
        if (orphanDetected) break;
      }
      if (orphanDetected) {
        return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_ORPHAN], { detail: orphanDetail });
      }

      // Step 8 — build edges + adjacencies.
      //   • edges          — every emitted edge, sorted deterministically (supports / contradicts / correlated_with)
      //   • adjacencyCausal — only supports + contradicts (used for cycle + topological order). correlated_with
      //                       is INTENTIONALLY excluded because it is symmetric / non-causal, so a 1-edge
      //                       correlation pair must not appear as a cycle, and downstream consumers do not
      //                       need a causal order over correlation.
      var edges = [];
      var adjacencyCausal = {};
      function addEdge(from, to, kind) {
        if (EDGE_KIND_ALLOWED.indexOf(kind) === -1) return false; // closed enum
        edges.push({ from: from, to: to, kind: kind });
        if (kind === 'supports' || kind === 'contradicts') {
          if (!adjacencyCausal[from]) adjacencyCausal[from] = [];
          adjacencyCausal[from].push(to);
        }
        return true;
      }
      // supports / contradicts from per-node edges
      for (var f = 0; f < keptAfterSemantic.length; f++) {
        var nf = keptAfterSemantic[f];
        // self-edge defence (D1 catches single-node; re-check after rename collisions)
        for (var sf = 0; sf < nf.supportingEdges.length; sf++) {
          if (nf.supportingEdges[sf] === nf.nodeId) {
            return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_SELF_REFERENCE], { detail: nf.nodeId + ' supportingEdges self-reference' });
          }
          addEdge(nf.nodeId, nf.supportingEdges[sf], 'supports');
        }
        for (var cf = 0; cf < nf.contradictingEdges.length; cf++) {
          if (nf.contradictingEdges[cf] === nf.nodeId) {
            return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_SELF_REFERENCE], { detail: nf.nodeId + ' contradictingEdges self-reference' });
          }
          addEdge(nf.nodeId, nf.contradictingEdges[cf], 'contradicts');
        }
      }

      // Step 9 — correlation groups. Same (caseId, sessionId, lapId, sourceId) → one group.
      var groupBucket = {};
      for (var g = 0; g < keptAfterSemantic.length; g++) {
        var ng = keptAfterSemantic[g];
        var gk = _correlationGroupKey(ng);
        if (!groupBucket[gk]) groupBucket[gk] = [];
        groupBucket[gk].push(ng.nodeId);
      }
      var groupKeysSorted = Object.keys(groupBucket).sort(_strcmp);
      var correlationGroups = [];
      for (var gi = 0; gi < groupKeysSorted.length; gi++) {
        var gk2 = groupKeysSorted[gi];
        var members = groupBucket[gk2].slice().sort(_strcmp);
        var iw = members.length > 0 ? 1 / members.length : 0;
        correlationGroups.push({
          correlationGroupId: gk2,
          memberNodeIds: members,
          independenceWeight: iw,
        });
        // emit correlated_with edges only for groups of size >= 2 (size 1 → independenceWeight=1, no edges).
        // correlated_with is SYMMETRIC: emit a SINGLE canonical-direction edge per pair (from =
        // lexicographically smaller nodeId, to = larger) so that two correlated nodes do NOT trip
        // cycle detection on their own (which would otherwise force-block every multi-metric source).
        // Downstream consumers (D3 priority engine) treat correlated_with as undirected.
        if (members.length >= 2) {
          for (var mi = 0; mi < members.length; mi++) {
            for (var mj = mi + 1; mj < members.length; mj++) {
              var from = members[mi] < members[mj] ? members[mi] : members[mj];
              var to = members[mi] < members[mj] ? members[mj] : members[mi];
              addEdge(from, to, 'correlated_with');
            }
          }
        }
      }
      if (correlationGroups.length > CORRELATION_GROUPS_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'correlation groups ' + correlationGroups.length + ' exceeds CORRELATION_GROUPS_CAP=' + CORRELATION_GROUPS_CAP });
      }

      // Step 10 — edge cap.
      if (edges.length > EDGES_CAP_TOTAL) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'edges ' + edges.length + ' exceeds EDGES_CAP_TOTAL=' + EDGES_CAP_TOTAL });
      }

      // Step 11 — cycle detection over CAUSAL edges only (supports + contradicts).
      var sortedNodeIds = keptAfterSemantic.map(function (x) { return x.nodeId; }).slice().sort(_strcmp);
      var cycleHit = _findCycle(sortedNodeIds, adjacencyCausal);
      if (cycleHit !== null) {
        return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_CYCLE], { detail: 'cycle involves nodeId ' + cycleHit });
      }

      // Step 12 — topological order over the acyclic causal subgraph. Nodes with no causal edges
      // appear in nodeId-sorted order at the front (Kahn's algorithm seeds in-degree-zero nodes).
      var topo = _topologicalOrder(sortedNodeIds, adjacencyCausal);

      // Step 13 — sort nodes deterministically by nodeId; sort edges by (from, to, kind).
      var nodesOut = keptAfterSemantic.slice().sort(function (a, b) { return _strcmp(a.nodeId, b.nodeId); });
      var edgesOut = edges.slice().sort(function (a, b) {
        var c = _strcmp(a.from, b.from); if (c !== 0) return c;
        c = _strcmp(a.to, b.to); if (c !== 0) return c;
        return _strcmp(a.kind, b.kind);
      });
      // Freeze nodes (they are already frozen by D1 sanitized output — re-freeze is a no-op but
      // confirms the contract).
      for (var ni = 0; ni < nodesOut.length; ni++) Object.freeze(nodesOut[ni]);
      for (var ei = 0; ei < edgesOut.length; ei++) Object.freeze(edgesOut[ei]);

      // Step 14 — limitations / cannotConclude derivation.
      var limitations = [];
      var cannotConclude = [];
      // collect limitation codes from per-node limitations (deduplicated, deterministic)
      var limSeen = {};
      for (var li = 0; li < nodesOut.length; li++) {
        var lims = nodesOut[li].limitations;
        for (var lj = 0; lj < lims.length; lj++) {
          if (!limSeen[lims[lj]]) { limSeen[lims[lj]] = true; limitations.push(lims[lj]); }
        }
      }
      // Add INSUFFICIENT_EVIDENCE when sanitized is empty (we still produce a valid empty graph;
      // the caller can act on the cannotConclude signal).
      if (nodesOut.length === 0) {
        if (cannotConclude.indexOf(CODES.INSUFFICIENT_EVIDENCE) === -1) cannotConclude.push(CODES.INSUFFICIENT_EVIDENCE);
      }
      // Add CANNOT_CONCLUDE if any rejection reason that hides evidence happened (we don't fail the
      // build but the downstream priority engine should know).
      if (rejectedCount > 0) {
        if (cannotConclude.indexOf(CODES.CANNOT_CONCLUDE) === -1) cannotConclude.push(CODES.CANNOT_CONCLUDE);
      }
      limitations.sort(_strcmp);
      cannotConclude.sort(_strcmp);
      if (limitations.length > LIMITATIONS_CAP) limitations = limitations.slice(0, LIMITATIONS_CAP);
      if (cannotConclude.length > CANNOT_CONCLUDE_CAP) cannotConclude = cannotConclude.slice(0, CANNOT_CONCLUDE_CAP);

      // Step 15 — derive graphId (content-only; clock-independent).
      var idPayload = {
        caseAssociation: caseAssociation,
        nodes: nodesOut.map(function (n) {
          return {
            nodeId: n.nodeId,
            category: n.category,
            credibility: n.credibility,
            provenance: n.provenance,
            availability: n.availability,
            identity: {
              caseId: n.identity.caseId,
              sessionId: n.identity.sessionId,
              lapId: n.identity.lapId,
              sourceId: n.identity.sourceId,
              sourceVersion: n.identity.sourceVersion,
            },
            observation: {
              kind: n.observation.kind,
              channel: n.observation.channel,
              i18nKey: n.observation.i18nKey,
              params: n.observation.params,
            },
            limitations: n.limitations,
            supportingEdges: n.supportingEdges,
            contradictingEdges: n.contradictingEdges,
          };
        }),
        edges: edgesOut,
        correlationGroups: correlationGroups.map(function (g) { return { correlationGroupId: g.correlationGroupId, memberNodeIds: g.memberNodeIds, independenceWeight: g.independenceWeight }; }),
      };
      var graphId = 'graph_' + _hash64('graphid|v' + GRAPH_SCHEMA_VERSION + '|' + _stableStringify(idPayload));

      // Step 16 — final materialisation
      var graph = _materializeGraph({
        graphId: graphId,
        caseAssociation: caseAssociation,
        nodes: nodesOut,
        edges: edgesOut,
        topologicalOrder: topo,
        dedup: {
          rejectedDuplicateIds: rejectedDuplicateIds,
          rejectedSemanticDuplicates: rejectedSemanticDuplicates,
          rejectedSourceReplays: rejectedSourceReplays,
        },
        correlationGroups: correlationGroups,
        limitations: limitations,
        cannotConclude: cannotConclude,
        provenance: {
          inputCount: inputCount,
          sanitizedCount: nodesOut.length,
          rejectedCount: rejectedCount,
          rejectedReasonsSummary: rejectedReasons,
        },
        createdAt: createdAt,
        generationToken: generationToken,
        contextVersion: contextVersion,
      });

      return Object.freeze({ valid: true, graph: graph });
    } catch (e) {
      return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'buildEvidenceGraph threw on hostile input' });
    }
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    GRAPH_SCHEMA_VERSION: GRAPH_SCHEMA_VERSION,
    EDGE_KIND_ALLOWED: EDGE_KIND_ALLOWED,
    NODES_CAP: NODES_CAP,
    EDGES_CAP_TOTAL: EDGES_CAP_TOTAL,
    CORRELATION_GROUPS_CAP: CORRELATION_GROUPS_CAP,
    INPUT_RAW_EVIDENCE_CAP: INPUT_RAW_EVIDENCE_CAP,
    IMPORTED_SUMMARY_SOURCE_ID: IMPORTED_SUMMARY_SOURCE_ID,
    IMPORTED_SUMMARY_MAX_CREDIBILITY: IMPORTED_SUMMARY_MAX_CREDIBILITY,
    buildEvidenceGraph: buildEvidenceGraph,
    // Test hooks (deliberately exported — adversarial suite covers them).
    _stableStringify: _stableStringify,
    _semanticFingerprint: _semanticFingerprint,
    _correlationGroupKey: _correlationGroupKey,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EvidenceGraph = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
