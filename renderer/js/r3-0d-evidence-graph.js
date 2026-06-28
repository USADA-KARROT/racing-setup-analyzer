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
 *   • Dedup is by both nodeId AND a SEMANTIC CANONICAL STRING (not just a 64-bit hash) — the
 *     full canonical serialization of (source identity + observation + category + nodeId) is the
 *     dedup key, so two distinct observations cannot collide under the dedup map even if their
 *     hash matches.
 *   • A renamed-id source replay (same canonical content under different nodeId) is rejected as
 *     EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT.
 *   • Correlation grouping: nodes sharing the same (caseId, sessionId, lapId, sourceId) are placed
 *     in a single correlation group; independenceWeight = 1 / groupSize so a 4-derived-metrics
 *     source does not present as four independent supports.
 *   • Edge kinds are a closed enum {supports, contradicts, derived_from, correlated_with,
 *     invalidates}. supports/contradicts come from per-node supportingEdges/contradictingEdges (D1
 *     sanitized fields); correlated_with is emitted SINGLE canonical-direction (from = smaller
 *     nodeId, to = larger) so symmetric correlation does NOT trip cycle detection on its own.
 *     derived_from + invalidates are reserved for future inputs (D2 emits NONE today).
 *   • Orphan edges (supportingEdges / contradictingEdges referencing an unknown nodeId) → fail-
 *     closed EVIDENCE_GRAPH_ORPHAN.
 *   • Self-edges are already caught at D1 (EVIDENCE_GRAPH_SELF_REFERENCE); the builder additionally
 *     re-checks after dedup so a renamed-id source replay cannot smuggle a self-edge through.
 *   • Cycle detection: over CAUSAL edges only (supports + contradicts); a directed cycle → fail-
 *     closed EVIDENCE_GRAPH_CYCLE. correlated_with is excluded (symmetric / non-causal).
 *   • Association binding: every sanitized node's identity.caseId / sessionId MUST equal the
 *     envelope's caseAssociation; per-node rejection on mismatch.
 *   • Imported-summary elevation: an evidence node with sourceId === 'imported_summary' MUST NOT
 *     present credibility > 'derived' — sanitized.credibility === 'measured' for that source is
 *     rejected as EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN.
 *   • Determinism: independent of caller permutation of rawEvidence. The post-validation sanitized
 *     array is sorted by canonical content BEFORE dedup; the dedup winner is therefore the same
 *     regardless of input order. Same sanitized input → same graphId / node order / edge order /
 *     topological order / correlation order / dedup summary. The clock is INJECTABLE
 *     (opts.clock()); createdAt reflects the injected value; graphId is INDEPENDENT of the clock.
 *   • Deep freeze: the entire returned graph (including every nested array / object, including
 *     correlationGroup.memberNodeIds) is frozen so a caller holding the result cannot mutate
 *     downstream consumer input.
 *
 * Codex D2 Round 1 closures embedded (RN-01..RN-12):
 *   RN-01: envelope is snapshot ONCE via descriptor-safe per-field reads + RC.toCleanCopy on
 *          caseAssociation BEFORE any subsequent property read; no TOCTOU window.
 *   RN-02: each rawEvidence array index descriptor is inspected without invoking accessors; an
 *          accessor / sparse / inherited slot is rejected as ONE node (PROTOTYPE_POLLUTION_REJECTED),
 *          not as a whole-build INTERNAL_CONTRACT_VIOLATION.
 *   RN-03: sanitized candidates are sorted by canonical content BEFORE dedup; caller permutation
 *          cannot change which duplicate wins or whether a real cycle is detected.
 *   RN-04: dedup map keys are FULL canonical serialization strings, not 64-bit hashes; distinct
 *          observations cannot collide.
 *   RN-05: correlationGroup.memberNodeIds is Object.freeze'd before its enclosing group object.
 *   RN-06: opts.clock() is invoked AFTER input envelope validation succeeds, via a descriptor-safe
 *          read on opts.clock; a throwing opts getter → createdAt = null (fail-soft on clock only).
 *   RN-07: helper functions _stableStringify / _semanticCanonical / _correlationGroupKey are NO
 *          LONGER exported — production surface is buildEvidenceGraph + constants only.
 *   RN-08: every node-indexed map uses Object.create(null) (or a Map) so a valid nodeId like
 *          'constructor' cannot collide with Object.prototype keys.
 *   RN-09: ENVELOPE_BYTE_CAP (256 KiB) is implemented and enforced post-sanitization (safe to
 *          JSON.stringify because sanitized values are guaranteed plain frozen primitives). A
 *          per-observation parameter-key cap (PARAMS_KEYS_CAP = 32) is enforced at the per-node
 *          step BEFORE the byte cap, so an attacker cannot inflate the params map indefinitely.
 *   RN-10: closure on commit `51155b3` script behaviour — addressed in
 *          scripts/check-r3-phase-no-consumer.js (strict entry-shape validation + path grammar +
 *          duplicate detection; any malformed entry → fail-closed).
 *   RN-11: closure on commit `51155b3` script behaviour — addressed in the script via a secondary
 *          string-concatenation-near-require detector that flags
 *          PROD_SUSPECTED_DYNAMIC_PHASE_REQUIRE for any production file containing both a non-
 *          literal require/import callsite AND a literal `r3.0d` / `r3.0e` / `r3.0f` substring.
 *   RN-12: D2 manifest changedFiles now lists every file in the baseSha → reviewedCandidateSha
 *          diff (including the separate guard-enhancement commit and the cross-phase rename
 *          commit), populated in governance/r3.0d/checkpoints/D2.json.
 *
 * Defence-in-depth surface (mirrors R3.0D D1 RN-01..RN-11 closures, extended by the D2 closures
 * listed above): every external entry validates the original input prototype, hidden own keys,
 * nested-non-plain objects pre-clone (R3_0D_ReasonCodes helpers); the builder wraps the whole work
 * in an outer try/catch; any internal throw collapses to INTERNAL_CONTRACT_VIOLATION (never
 * bubbles to the caller); every node passes through D1 validateEvidenceNodeShape — sanitized is
 * the only object that enters the graph.
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
  var EDGE_KIND_CAUSAL = Object.freeze({ supports: true, contradicts: true });

  // Caps. Mirror D1 envelope language so the contract surface is consistent.
  var NODES_CAP = 256;
  var EDGES_CAP_TOTAL = 1024;
  var CORRELATION_GROUPS_CAP = 64;
  var CANNOT_CONCLUDE_CAP = 64;
  var LIMITATIONS_CAP = 64;
  var INPUT_RAW_EVIDENCE_CAP = 512;   // pre-validation cap on caller array length
  var PARAMS_KEYS_CAP = 32;            // per-observation params object cap (RN-09)
  var ENVELOPE_BYTE_CAP = 256 * 1024;  // 256 KiB post-sanitization JSON.stringify cap (RN-09)

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
  var OPTS_KEYS = Object.freeze(['clock']);

  // ─── Defence-in-depth helpers ────────────────────────────────────────────────
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
  function _strcmp(a, b) { if (a === b) return 0; return a < b ? -1 : 1; }

  // Stable canonical JSON serialiser — sorted keys at every depth; arrays preserved in order. Used
  // for semantic dedup keys + graphId hashing. The caller is expected to pass D1-sanitized values
  // (frozen plain primitives only); the implementation is descriptor-safe and never invokes a
  // caller getter (no accessor descriptors are reachable on a D1 sanitized output).
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

  // FNV-1a 32-bit hash → lowercase hex. Used ONLY as a diagnostic identifier (graphId / correlationGroupId);
  // the actual dedup decisions use the FULL canonical string, not the hash, so a collision in the hash
  // CANNOT cause silent data loss (RN-04 closure). Double-pass widening for nicer-looking ids.
  function _hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function _hash64(s) { return _hash32(s) + _hash32(s + '|' + s.length); }

  // Semantic canonical string — used as the DEDUP MAP KEY (not a hash). Excludes nodeId so a
  // renamed-id replay collides; excludes freshness so a re-issue at a later timestamp still
  // collides; excludes credibility / provenance / availability (downstream attributes, not the
  // fact). Includes case + session + lap + source identity + category + observation kind/channel/
  // i18nKey/params (sorted JSON). The string IS the key; collisions are impossible by definition.
  function _semanticCanonicalString(node) {
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
    return _stableStringify(payload);
  }

  // Full canonical string — INCLUDES nodeId so two duplicate-nodeId candidates can still be
  // compared as different "candidates" when sorting. Used to canonically sort the sanitized array
  // BEFORE dedup (RN-03 closure) so caller permutation cannot change the dedup winner.
  function _fullCanonicalString(node) {
    return JSON.stringify(node.nodeId) + '|' + _semanticCanonicalString(node) + '|cred:' + node.credibility + '|prov:' + node.provenance + '|avl:' + node.availability + '|fresh:' + node.identity.freshness + '|supE:' + _stableStringify(node.supportingEdges) + '|conE:' + _stableStringify(node.contradictingEdges) + '|lims:' + _stableStringify(node.limitations);
  }

  // Correlation group key — nodes sharing this key are correlated (same source observing the same
  // (case, session, lap, sourceId) origin). Uses canonical string (deterministic), then a hash of
  // it for the displayed group id (cosmetic — actual grouping uses the canonical string in a
  // Object.create(null) map).
  function _correlationGroupCanonical(node) {
    var id = node.identity;
    return JSON.stringify(id.caseId) + '|' + JSON.stringify(id.sessionId) + '|' + JSON.stringify(id.lapId == null ? null : id.lapId) + '|' + JSON.stringify(id.sourceId);
  }
  function _correlationGroupId(canonical) { return 'corr_' + _hash64('corr|' + canonical); }

  // Validate input envelope shape + take a TRUSTED SNAPSHOT of every primitive field (RN-01).
  // Returns { ok:true, snapshot:{caseAssociation, generationToken, contextVersion} } so the
  // caller has a single source of truth that cannot be re-read from the original via accessors.
  function _validateInputEnvelope(input) {
    if (!RC.isOriginalPlainObject(input)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'input envelope is not a plain object (Proxy / class instance rejected)' });
    if (RC.hasHiddenOwnKey(input)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'input envelope carries Symbol-keyed or non-enumerable own property' });
    if (!_hasOnlyAllowedKeys(input, INPUT_KEYS)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'input envelope carries forbidden own key' });
    // caseAssociation — read via descriptor (RN-01: no caller getter), then deep-validate the clone.
    var caDesc; try { caDesc = Object.getOwnPropertyDescriptor(input, 'caseAssociation'); }
    catch (e) { return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation descriptor read threw' }); }
    if (!caDesc || !('value' in caDesc)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation must be a data property' });
    var ca = caDesc.value;
    if (!RC.isOriginalPlainObject(ca)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH, CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'caseAssociation prototype is not Object.prototype or null' });
    if (RC.hasHiddenOwnKey(ca)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'caseAssociation carries Symbol-keyed or non-enumerable own property' });
    if (RC.hasNonPlainNestedObject(ca)) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'caseAssociation contains a nested non-plain object' });
    // Clone-then-validate: any read after this point uses the clone (TOCTOU-safe).
    var caClone = RC.toCleanCopy(ca);
    if (!_isPlain(caClone)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation clone is not a plain object' });
    if (!_hasOnlyAllowedKeys(caClone, CASE_ASSOCIATION_KEYS)) return RC.buildBlockedResult([CODES.UNKNOWN_OWN_KEY], { detail: 'caseAssociation carries forbidden own key' });
    for (var i = 0; i < CASE_ASSOCIATION_REQUIRED.length; i++) {
      if (!_nonEmptyStr(caClone[CASE_ASSOCIATION_REQUIRED[i]])) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation.' + CASE_ASSOCIATION_REQUIRED[i] + ' missing' });
    }
    if ('lapId' in caClone && caClone.lapId !== null && !_nonEmptyStr(caClone.lapId)) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation.lapId must be null or non-empty string' });
    // rawEvidence — array gate ONLY (per-node body validates contents independently via per-index descriptor).
    var reDesc; try { reDesc = Object.getOwnPropertyDescriptor(input, 'rawEvidence'); }
    catch (e) { return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence descriptor read threw' }); }
    if (!reDesc || !('value' in reDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence must be a data property' });
    var re = reDesc.value;
    if (!Array.isArray(re)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence must be an array' });
    try { if (Object.getPrototypeOf(re) !== Array.prototype) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence is not a plain Array (subclass / mutated prototype rejected)' }); }
    catch (e) { return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence prototype access threw' }); }
    var reLen;
    try { reLen = re.length; if (typeof reLen !== 'number' || !_isFiniteNum(reLen) || reLen < 0 || Math.floor(reLen) !== reLen) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence.length malformed' }); }
    catch (e) { return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence.length read threw' }); }
    if (reLen > INPUT_RAW_EVIDENCE_CAP) return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'rawEvidence array length ' + reLen + ' exceeds cap ' + INPUT_RAW_EVIDENCE_CAP });
    // optional generationToken — descriptor-safe read
    var gt = null;
    try {
      var gtDesc = Object.getOwnPropertyDescriptor(input, 'generationToken');
      if (gtDesc) {
        if (!('value' in gtDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken must be a data property' });
        var gtv = gtDesc.value;
        if (gtv === null) gt = null;
        else if (typeof gtv !== 'string' || gtv.length === 0) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken must be null or non-empty string' });
        else if (gtv.length > 256) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'generationToken exceeds 256 chars' });
        else gt = gtv;
      }
    } catch (e) { return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken descriptor read threw' }); }
    // optional contextVersion — descriptor-safe read
    var cv = null;
    try {
      var cvDesc = Object.getOwnPropertyDescriptor(input, 'contextVersion');
      if (cvDesc) {
        if (!('value' in cvDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion must be a data property' });
        var cvv = cvDesc.value;
        if (cvv === null) cv = null;
        else if (typeof cvv !== 'string' || cvv.length === 0) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion must be null or non-empty string' });
        else if (cvv.length > 64) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'contextVersion exceeds 64 chars' });
        else cv = cvv;
      }
    } catch (e) { return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion descriptor read threw' }); }
    return {
      ok: true,
      snapshot: {
        caseAssociation: {
          caseId: caClone.caseId,
          sessionId: caClone.sessionId,
          lapId: ('lapId' in caClone) ? caClone.lapId : null,
        },
        rawEvidenceRef: re,           // CALLER ARRAY — never deref by [index]; always Object.getOwnPropertyDescriptor
        rawEvidenceLength: reLen,
        generationToken: gt,
        contextVersion: cv,
      },
    };
  }

  // RN-06 closure: resolve opts.clock AFTER envelope validation; descriptor-safe; throwing getter
  // collapses to createdAt = null (clock is best-effort; never blocks the build).
  function _resolveClock(opts) {
    if (opts === null || opts === undefined) return null;
    if (!RC.isOriginalPlainObject(opts)) return null;
    if (RC.hasHiddenOwnKey(opts)) return null;
    if (!_hasOnlyAllowedKeys(opts, OPTS_KEYS)) return null;
    var desc;
    try { desc = Object.getOwnPropertyDescriptor(opts, 'clock'); }
    catch (e) { return null; }
    if (!desc) return null;
    if (!('value' in desc)) return null;       // accessor descriptor — fail-soft
    var clock = desc.value;
    if (typeof clock !== 'function') return null;
    try {
      var v = clock();
      if (v === null) return null;
      if (!_isIsoTimestamp(v)) return null;
      return v;
    } catch (e) { return null; }
  }

  // DFS cycle detection over the directed CAUSAL edge list. Uses a proto-null colour map (RN-08).
  function _findCycle(nodeIds, adjacencyCausal) {
    var WHITE = 0, GREY = 1, BLACK = 2;
    var color = Object.create(null);
    for (var i = 0; i < nodeIds.length; i++) color[nodeIds[i]] = WHITE;
    function visit(u) {
      color[u] = GREY;
      var nbrs = adjacencyCausal[u] || [];
      for (var k = 0; k < nbrs.length; k++) {
        var v = nbrs[k];
        if (color[v] === GREY) return v;
        if (color[v] === WHITE) {
          var c = visit(v);
          if (c !== null) return c;
        }
      }
      color[u] = BLACK;
      return null;
    }
    for (var j = 0; j < nodeIds.length; j++) {
      var n = nodeIds[j];
      if (color[n] === WHITE) {
        var hit = visit(n);
        if (hit !== null) return hit;
      }
    }
    return null;
  }

  // Kahn's algorithm — deterministic by tie-breaking on sorted nodeId. Assumes no cycle. Uses
  // proto-null in-degree map (RN-08).
  function _topologicalOrder(nodeIds, adjacencyCausal) {
    var inDegree = Object.create(null);
    var i;
    for (i = 0; i < nodeIds.length; i++) inDegree[nodeIds[i]] = 0;
    for (i = 0; i < nodeIds.length; i++) {
      var nbrs = adjacencyCausal[nodeIds[i]] || [];
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
      var nbrs2 = (adjacencyCausal[u] || []).slice().sort(_strcmp);
      for (var m = 0; m < nbrs2.length; m++) {
        var v = nbrs2[m];
        if (Object.prototype.hasOwnProperty.call(inDegree, v)) {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            var lo = 0, hi = queue.length;
            while (lo < hi) { var mid = (lo + hi) >>> 1; if (queue[mid] < v) lo = mid + 1; else hi = mid; }
            queue.splice(lo, 0, v);
          }
        }
      }
    }
    return out;
  }

  // Materialise the final closed-shape sanitized graph (deep freeze every nested array/object).
  function _materializeGraph(o) {
    // Deep freeze correlationGroups (RN-05): freeze memberNodeIds BEFORE the enclosing group.
    var cgFrozen = o.correlationGroups.map(function (g) {
      return Object.freeze({
        correlationGroupId: g.correlationGroupId,
        memberNodeIds: Object.freeze(g.memberNodeIds.slice()),
        independenceWeight: g.independenceWeight,
      });
    });
    var dedupSummaryFrozen = Object.freeze({
      rejectedDuplicateIds: Object.freeze(o.dedup.rejectedDuplicateIds.slice()),
      rejectedSemanticDuplicates: Object.freeze(o.dedup.rejectedSemanticDuplicates.map(function (r) {
        return Object.freeze({
          fingerprint: r.fingerprint,
          keptNodeId: r.keptNodeId,
          droppedNodeId: r.droppedNodeId,
        });
      })),
      rejectedSourceReplays: Object.freeze(o.dedup.rejectedSourceReplays.map(function (r) { return Object.freeze(Object.assign({}, r)); })),
    });
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
      deduplicationSummary: dedupSummaryFrozen,
      correlationGroups: Object.freeze(cgFrozen),
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
   * buildEvidenceGraph(input, opts) — primary entry. See module header for the contract.
   */
  function buildEvidenceGraph(inputIn, optsIn) {
    try {
      // Step 1 — input envelope structural gate + TRUSTED SNAPSHOT (RN-01 closure).
      var env = _validateInputEnvelope(inputIn);
      if (!env.ok) return env;
      var caseAssociation = env.snapshot.caseAssociation;
      var generationToken = env.snapshot.generationToken;
      var contextVersion = env.snapshot.contextVersion;
      var rawEvidenceRef = env.snapshot.rawEvidenceRef;
      var inputCount = env.snapshot.rawEvidenceLength;

      // Step 2 — resolve clock AFTER envelope validation (RN-06 closure).
      var createdAt = _resolveClock(optsIn);

      // Step 3 — per-node validation. Each rawEvidence[i] is read via descriptor (RN-02 closure):
      // accessor / sparse / inherited slots become ONE rejected node, never a whole-build throw.
      var sanitized = [];
      var rejectedCount = 0;
      var rejectedReasons = Object.create(null);
      function tally(code) { rejectedReasons[code] = (rejectedReasons[code] || 0) + 1; }

      for (var i = 0; i < inputCount; i++) {
        var desc;
        try { desc = Object.getOwnPropertyDescriptor(rawEvidenceRef, i); }
        catch (e) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        if (!desc) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        if (!('value' in desc)) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        var raw = desc.value;
        // outer defence — refuse non-plain prototype BEFORE invoking D1 validator.
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
        // RN-09 — per-observation params key count cap (defence layer above D1).
        if (san.observation && san.observation.params && typeof san.observation.params === 'object') {
          try {
            var pkc = Object.keys(san.observation.params).length;
            if (pkc > PARAMS_KEYS_CAP) { rejectedCount++; tally(CODES.ARRAY_CAP_EXCEEDED); continue; }
          } catch (e) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
        }
        // Association binding — caseId / sessionId MUST equal envelope.caseAssociation.
        if (san.identity.caseId !== caseAssociation.caseId) { rejectedCount++; tally(CODES.SOURCE_IDENTITY_CASE_MISMATCH); continue; }
        if (san.identity.sessionId !== caseAssociation.sessionId) { rejectedCount++; tally(CODES.SOURCE_IDENTITY_SESSION_MISMATCH); continue; }
        if (caseAssociation.lapId !== null && san.identity.lapId !== null && san.identity.lapId !== caseAssociation.lapId) {
          rejectedCount++; tally(CODES.SOURCE_IDENTITY_LAP_MISMATCH); continue;
        }
        // Imported-summary elevation guard.
        if (san.identity.sourceId === IMPORTED_SUMMARY_SOURCE_ID && san.credibility === 'measured') {
          rejectedCount++; tally(CODES.EVIDENCE_IMPORTED_SUMMARY_ELEVATION_FORBIDDEN); continue;
        }
        sanitized.push(san);
      }

      // Step 4 — cap on accepted nodes.
      if (sanitized.length > NODES_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'sanitized node count ' + sanitized.length + ' exceeds NODES_CAP=' + NODES_CAP });
      }

      // Step 5 — RN-03 closure: sort sanitized by full canonical content BEFORE any dedup so caller
      // permutation cannot influence which duplicate wins. Tie-breaker on a deterministic field.
      sanitized.sort(function (a, b) { return _strcmp(_fullCanonicalString(a), _fullCanonicalString(b)); });

      // Step 6 — duplicate-ID dedup (Object.create(null) map — RN-08 closure). First by sort order
      // (deterministic) is kept; subsequent rejected.
      var byId = Object.create(null);
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
      rejectedDuplicateIds.sort(_strcmp);

      // Step 7 — semantic CANONICAL STRING dedup (RN-04 closure). The map KEY is the full canonical
      // string itself, not a hash. Collisions are impossible by definition.
      var semSeen = Object.create(null);
      var keptAfterSemantic = [];
      var rejectedSemanticDuplicates = [];
      for (var s = 0; s < keptById.length; s++) {
        var nn = keptById[s];
        var canon = _semanticCanonicalString(nn);
        if (Object.prototype.hasOwnProperty.call(semSeen, canon)) {
          rejectedSemanticDuplicates.push({ fingerprint: _hash64('sem|' + canon), keptNodeId: semSeen[canon], droppedNodeId: nn.nodeId });
          tally(CODES.EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT);
          rejectedCount++;
          delete byId[nn.nodeId];
          continue;
        }
        semSeen[canon] = nn.nodeId;
        keptAfterSemantic.push(nn);
      }
      rejectedSemanticDuplicates.sort(function (a, b) { return _strcmp(a.droppedNodeId, b.droppedNodeId); });

      // Step 8 — orphan edge detection. Any supportingEdges / contradictingEdges target nodeId that
      // is not in the surviving graph triggers EVIDENCE_GRAPH_ORPHAN.
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

      // Step 9 — build edges + causal adjacency (RN-08: proto-null map).
      var edges = [];
      var adjacencyCausal = Object.create(null);
      function addEdge(from, to, kind) {
        if (EDGE_KIND_ALLOWED.indexOf(kind) === -1) return false;
        edges.push({ from: from, to: to, kind: kind });
        if (EDGE_KIND_CAUSAL[kind]) {
          if (!adjacencyCausal[from]) adjacencyCausal[from] = [];
          adjacencyCausal[from].push(to);
        }
        return true;
      }
      for (var f = 0; f < keptAfterSemantic.length; f++) {
        var nf = keptAfterSemantic[f];
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

      // Step 10 — correlation groups. Same canonical (caseId|sessionId|lapId|sourceId) → one group.
      var groupBucket = Object.create(null);
      for (var g = 0; g < keptAfterSemantic.length; g++) {
        var ng = keptAfterSemantic[g];
        var gk = _correlationGroupCanonical(ng);
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
          correlationGroupId: _correlationGroupId(gk2),
          memberNodeIds: members,
          independenceWeight: iw,
        });
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

      // Step 11 — edge cap.
      if (edges.length > EDGES_CAP_TOTAL) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'edges ' + edges.length + ' exceeds EDGES_CAP_TOTAL=' + EDGES_CAP_TOTAL });
      }

      // Step 12 — cycle detection over CAUSAL edges only.
      var sortedNodeIds = keptAfterSemantic.map(function (x) { return x.nodeId; }).slice().sort(_strcmp);
      var cycleHit = _findCycle(sortedNodeIds, adjacencyCausal);
      if (cycleHit !== null) {
        return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_CYCLE], { detail: 'cycle involves nodeId ' + cycleHit });
      }

      // Step 13 — topological order over the acyclic causal subgraph.
      var topo = _topologicalOrder(sortedNodeIds, adjacencyCausal);

      // Step 14 — sort nodes deterministically; sort edges by (from, to, kind).
      var nodesOut = keptAfterSemantic.slice().sort(function (a, b) { return _strcmp(a.nodeId, b.nodeId); });
      var edgesOut = edges.slice().sort(function (a, b) {
        var c = _strcmp(a.from, b.from); if (c !== 0) return c;
        c = _strcmp(a.to, b.to); if (c !== 0) return c;
        return _strcmp(a.kind, b.kind);
      });
      for (var ni = 0; ni < nodesOut.length; ni++) Object.freeze(nodesOut[ni]);
      for (var ei = 0; ei < edgesOut.length; ei++) Object.freeze(edgesOut[ei]);

      // Step 15 — limitations / cannotConclude derivation.
      var limitations = [];
      var cannotConclude = [];
      var limSeen = Object.create(null);
      for (var li = 0; li < nodesOut.length; li++) {
        var lims = nodesOut[li].limitations;
        for (var lj = 0; lj < lims.length; lj++) {
          if (!limSeen[lims[lj]]) { limSeen[lims[lj]] = true; limitations.push(lims[lj]); }
        }
      }
      if (nodesOut.length === 0) {
        if (cannotConclude.indexOf(CODES.INSUFFICIENT_EVIDENCE) === -1) cannotConclude.push(CODES.INSUFFICIENT_EVIDENCE);
      }
      if (rejectedCount > 0) {
        if (cannotConclude.indexOf(CODES.CANNOT_CONCLUDE) === -1) cannotConclude.push(CODES.CANNOT_CONCLUDE);
      }
      limitations.sort(_strcmp);
      cannotConclude.sort(_strcmp);
      if (limitations.length > LIMITATIONS_CAP) limitations = limitations.slice(0, LIMITATIONS_CAP);
      if (cannotConclude.length > CANNOT_CONCLUDE_CAP) cannotConclude = cannotConclude.slice(0, CANNOT_CONCLUDE_CAP);

      // Step 16 — derive graphId (content-only; clock-independent).
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

      // Step 17 — RN-09 closure: post-sanitization JSON byte cap. Safe to JSON.stringify because every
      // sanitized value is a plain frozen primitive (no accessors, no Proxies, no class instances).
      var envBytes;
      try {
        var s = JSON.stringify(idPayload);
        envBytes = (typeof TextEncoder !== 'undefined') ? new TextEncoder().encode(s).length : Buffer.byteLength(s, 'utf8');
      } catch (e) { envBytes = Infinity; }
      if (envBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'post-sanitization JSON size ' + envBytes + ' exceeds ENVELOPE_BYTE_CAP=' + ENVELOPE_BYTE_CAP });
      }

      // Step 18 — final materialisation
      var graph = _materializeGraph({
        graphId: graphId,
        caseAssociation: caseAssociation,
        nodes: nodesOut,
        edges: edgesOut,
        topologicalOrder: topo,
        dedup: {
          rejectedDuplicateIds: rejectedDuplicateIds,
          rejectedSemanticDuplicates: rejectedSemanticDuplicates,
          rejectedSourceReplays: [],
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

  // Public API surface — RN-07 closure: internal helpers (_stableStringify, _semanticCanonicalString,
  // _correlationGroupCanonical) are NOT exported. The only public entry is buildEvidenceGraph plus
  // documented constants. Tests must drive the contract via buildEvidenceGraph only.
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    GRAPH_SCHEMA_VERSION: GRAPH_SCHEMA_VERSION,
    EDGE_KIND_ALLOWED: EDGE_KIND_ALLOWED,
    NODES_CAP: NODES_CAP,
    EDGES_CAP_TOTAL: EDGES_CAP_TOTAL,
    CORRELATION_GROUPS_CAP: CORRELATION_GROUPS_CAP,
    INPUT_RAW_EVIDENCE_CAP: INPUT_RAW_EVIDENCE_CAP,
    PARAMS_KEYS_CAP: PARAMS_KEYS_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    IMPORTED_SUMMARY_SOURCE_ID: IMPORTED_SUMMARY_SOURCE_ID,
    IMPORTED_SUMMARY_MAX_CREDIBILITY: IMPORTED_SUMMARY_MAX_CREDIBILITY,
    buildEvidenceGraph: buildEvidenceGraph,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EvidenceGraph = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
