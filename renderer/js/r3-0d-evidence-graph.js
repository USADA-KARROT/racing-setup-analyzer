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
 *   RN-08: every node-indexed map uses _ObjectCreate(null) (or a Map) so a valid nodeId like
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
 * Codex D2 Round 6 closures embedded (RN-13 round-4 final / RN-16 NEW / RN-17 NEW):
 *   RN-13 round-4 (Round 6 / Round 7 final closure): `_safeSlice` / `_safeMap` plus the two
 *          `_materializeGraph` programmatic keyed assignments (`copy[k] = r[k]` for
 *          rejectedSourceReplays + `rrsCopy[k] = ...` for rejectedReasonsSummary) now use
 *          captured `_ObjectDefineProperty` to install own data descriptors via
 *          [[DefineOwnProperty]]. A hostile clock installing
 *          `Object.defineProperty(Array.prototype, "0", { set: ... })` (or any prototype-chain
 *          accessor on Array.prototype / Object.prototype) cannot intercept the assignment
 *          because [[DefineOwnProperty]] bypasses the [[Set]] protocol entirely.
 *   RN-15 round-4 (Round 5 closure): `_jsonStringWidth` accounts for lone surrogates (high or
 *          low) as 6 bytes each (`\uXXXX` JSON escape).
 *   RN-16 NEW (Round 7 / Round 8 final closure): `_estimateNodeUtf8Bytes` rewritten to use exact
 *          `_utf8len(_JSONStringify(perNodeIdPayloadShape))` (Round 7) — sufficient for per-node
 *          attacks. Codex Round 7 surfaced a follow-on attack: 35 same-source nodes generate
 *          O(N²) correlated_with edges (~71 KB) which Step 4.5 didn't account for, slipping past
 *          to Step 17. Round 8 closure: new Step 11.5 builds the SAME idPayload preview that
 *          Step 16 materialises (using captured intrinsics) and runs `_utf8len(_JSONStringify(...))`
 *          as an EXACT pre-canonicalisation envelope check, after edges + correlationGroups are
 *          built but before any per-element freezing or graphId derivation. Step 4.5 remains as a
 *          cheap per-node early-reject; Step 17 remains as belt-and-suspenders on the final
 *          idPayload.
 *   RN-17 NEW (Round 7 closure): `_jsonStringWidth` no longer treats DEL (U+007F) as a 6-byte
 *          JSON escape. Per ES §25.5.2.2 Quote(value), only U+0000..U+001F (plus " and \) MUST
 *          be escaped; DEL passes through as 1 byte. A DEL-heavy payload that fits the envelope
 *          (~101 KB actual) is no longer over-rejected at Step 4.5.
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

  // Codex D2 Round 16 architectural convergence: route every primitive operation through the
  // R3.0D hardened-intrinsics toolkit so the validator NEVER calls an ambient prototype method.
  // The HI module captures pristine intrinsic references at its own module-init time and exposes
  // only safe wrappers; any ambient rebinding installed after HI loads cannot reach the wrapper
  // bodies, so self-restoring attacker tampering is structurally inert here. The integrity guard
  // below remains as defence-in-depth, primarily as an observability mechanism that surfaces
  // INTERNAL_CONTRACT_VIOLATION when the runtime's own globals diverge from our captured view.
  var HI = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
  }
  if (!HI && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (!HI) throw new Error('renderer/js/r3-0d-evidence-graph.js requires contracts/r3.0d/hardened-intrinsics.js');

  var RC = Contracts.reasonCodes;
  var SI = Contracts.sourceIdentity;
  var EN = Contracts.evidenceNode;
  var CODES = RC.REASON_CODES;

  // Codex D2 Round 3 RN-13 closure: capture safe intrinsic references at module-init time so a
  // caller-supplied opts.clock injector cannot tamper with Object.freeze / Object.assign /
  // Object.keys / Object.create / JSON.stringify / Array.isArray / TextEncoder during the build.
  // Every subsequent operation that depends on these intrinsics uses the captured ref.
  var _ObjectFreeze = Object.freeze;
  var _ObjectAssign = Object.assign;
  var _ObjectKeys = Object.keys;
  var _ObjectCreate = Object.create;
  var _ObjectDefineProperty = Object.defineProperty;
  var _ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var _ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
  var _ObjectGetPrototypeOf = Object.getPrototypeOf;
  var _ObjectPrototypeHasOwnProperty = Object.prototype.hasOwnProperty;
  var _ArrayIsArray = Array.isArray;
  var _ArrayPrototypeSlice = Array.prototype.slice;
  var _ArrayPrototypeMap = Array.prototype.map;
  var _ArrayPrototypePush = Array.prototype.push;
  // Codex D2 Round 9 RN-19 closure additional captures: every Array.prototype method touched in
  // the build path must be reachable WITHOUT going through ambient global rebinding. Reflect.apply
  // is used because it invokes [[Call]] directly, bypassing Function.prototype.call / .apply
  // (which a hostile clock or pre-call attacker could replace per RN-13 round-4).
  var _ArrayPrototypeSort = Array.prototype.sort;
  var _ArrayPrototypeConcat = Array.prototype.concat;
  var _ArrayPrototypeJoin = Array.prototype.join;
  var _ArrayPrototypeIndexOf = Array.prototype.indexOf;
  var _StringPrototypeSlice = String.prototype.slice;
  var _StringPrototypeCharAt = String.prototype.charAt;
  var _StringPrototypeCharCodeAt = String.prototype.charCodeAt;
  var _NumberPrototypeToString = Number.prototype.toString;
  var _String = String;
  var _FunctionPrototypeCall = Function.prototype.call;
  var _FunctionPrototypeApply = Function.prototype.apply;
  var _FunctionPrototypeBind = Function.prototype.bind;
  var _ReflectApply = (typeof Reflect !== 'undefined' && Reflect.apply) ? Reflect.apply : null;

  // Codex D-GATE-01 closure: D2 producer-attestation WeakSet (matches D3/D4/D5 pattern).
  // The graph object reference is registered ONLY at the very last line of buildEvidenceGraph,
  // AFTER full validation + deep-freeze. The narrow verifier `verifyAuthoritativeGraph`
  // is exposed as the trust anchor for D3 (replacing the public graphId-recompute
  // authentication that Codex flagged as forgeable when the hash is also public).
  var _WeakSetCtorEG = WeakSet;
  var _WS_ADD_EG = WeakSet.prototype.add;
  var _WS_HAS_EG = WeakSet.prototype.has;
  function _wsAddEG(set, value) {
    try {
      if (_ReflectApply) _ReflectApply(_WS_ADD_EG, set, [value]);
      else set.add(value);
      return true;
    } catch (e) { return false; }
  }
  function _wsHasEG(set, value) {
    try {
      if (_ReflectApply) return _ReflectApply(_WS_HAS_EG, set, [value]) === true;
      return set.has(value) === true;
    } catch (e) { return false; }
  }
  var _authoritativeGraphs = new _WeakSetCtorEG();
  function _registerAuthoritativeGraph(graph) { _wsAddEG(_authoritativeGraphs, graph); }
  function verifyAuthoritativeGraph(candidate) {
    // Fail-closed identity-only verifier. Captured WeakSet.prototype.has + captured
    // Reflect.apply defeat post-load `WeakSet.prototype.has = () => true` AND
    // `Reflect.apply = ...` rebinds. Identity-only membership → no [[Get]] traps on
    // a Proxy candidate before rejection.
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHasEG(_authoritativeGraphs, candidate)) return false;
      if (_ObjectFreeze !== Object.freeze) { /* defense-in-depth: continue using captured */ }
      // Belt-and-suspenders structural integrity.
      var isFrozen;
      try { isFrozen = Object.isFrozen(candidate); } catch (e) { isFrozen = false; }
      if (isFrozen !== true) return false;
      if (candidate.schemaVersion !== GRAPH_SCHEMA_VERSION) return false;
      if (typeof candidate.graphId !== 'string') return false;
      if (!(_ReflectApply
            ? _ReflectApply(_ArrayIsArray, null, [candidate.nodes]) === true
            : _ArrayIsArray(candidate.nodes) === true)) return false;
      return true;
    } catch (e) { return false; }
  }
  var _ReflectOwnKeys = (typeof Reflect !== 'undefined' && Reflect.ownKeys) ? Reflect.ownKeys : null;
  var _JSONStringify = JSON.stringify;
  var _GlobalThis = (typeof globalThis !== 'undefined') ? globalThis : (typeof root !== 'undefined' ? root : (typeof window !== 'undefined' ? window : null));
  // Codex D2 Round 12 RN-21 (container) closure: capture the CONTAINER GLOBALS themselves so
  // ambient globalThis-level accessor descriptors (e.g. `Object.defineProperty(globalThis,
  // 'Reflect', { get: function () { Array.prototype.push = noop; return origReflect; } })`)
  // cannot fire during integrity-guard reads. Capturing the references at module-init time
  // freezes our view of the constructor objects; subsequent global rebinding is invisible to us.
  var _Object = Object;
  var _Array = Array;
  var _String_ctor = String;
  var _Number = Number;
  var _Function = Function;
  var _JSON = JSON;
  var _Reflect = (typeof Reflect !== 'undefined') ? Reflect : null;
  var _Math = Math;
  var _RegExp = RegExp;
  // Codex D2 Round 12 RN-27 closure: additional method captures (Math.floor for integer-check
  // arithmetic, Number.isInteger for shape validation, RegExp.prototype.test for ISO timestamp
  // regex matching). All three are reachable from the build path and were previously unguarded.
  var _MathFloor = Math.floor;
  var _NumberIsInteger = Number.isInteger;
  var _NumberIsFinite = Number.isFinite;
  var _NumberIsNaN = Number.isNaN;
  var _RegExpPrototypeTest = RegExp.prototype.test;
  // Codex D2 Round 13 RN-29 closure: structuredClone is reachable from the contract module
  // (_toCleanCopy / RC.toCleanCopy Proxy cleansing) AND now from the renderer Step 0.3 input
  // pre-clone. Capture at module init + include in integrity guard.
  var _StructuredClone = (typeof structuredClone === 'function') ? structuredClone : null;
  // Codex D2 Round 13 RN-28 closure: TextEncoder is already captured below as _TextEncoder
  // (used by _utf8len). The guard verifies the captured reference still matches the live
  // global so a between-guard rebind is detected.

  // Codex D2 Round 10 RN-21..RN-25 closure: intrinsic integrity guard. At the entry of
  // buildEvidenceGraph (and again immediately after _resolveClock fires) verify that every
  // global primitive method we depend on still === its captured module-init reference. JS is
  // single-threaded; a passing guard means no global rebinding can happen between the check and
  // our use of that global within the same synchronous build. If ANY mismatch is detected,
  // fail-closed with INTERNAL_CONTRACT_VIOLATION + intrinsic-tampering detail. This closes
  // RN-21 (ambient .push/.indexOf in contract validators), RN-22 (ambient JSON.stringify in
  // correlation key), RN-23 (ambient Object.getOwnPropertyDescriptor in Step 3), RN-24 (ambient
  // global String() function), RN-25 (Number.prototype.toString / String.prototype.charAt in
  // hash digests) — and any future intrinsic-rebinding attack on the same surface.
  // Codex D2 Round 11 RN-21 closure: descriptor-based intrinsic integrity check. The previous
  // implementation used direct property access (`Object.freeze === _ObjectFreeze`), which is
  // accessor-TOCTOU vulnerable: an attacker installing `Object.defineProperty(Reflect, "ownKeys",
  // { get: function() { Array.prototype.push = noop; return origOwnKeys; } })` would let the
  // guard pass push (intact), then the Reflect.ownKeys getter fires LATER in the chain, rebinds
  // push (after it was already checked), returns the original ref (passing the Reflect.ownKeys
  // check), and the rest of the build runs with hostile push. Round 12 fix: read every intrinsic
  // via captured `_ObjectGetOwnPropertyDescriptor`, which returns a structural snapshot of the
  // descriptor WITHOUT invoking any installed accessor. If the descriptor is an accessor (no
  // `value` field), fail-closed — the very presence of an accessor on a global primitive method
  // is an attack signal. RN-26 closure: add Function.prototype.call / .apply / .bind to the
  // captured set so a clock-installed FPC/FPA/FPB rebind also trips the post-clock guard.
  var _INTRINSIC_SENTINEL = {};
  function _readDescVal(obj, key) {
    try {
      var d = _ObjectGetOwnPropertyDescriptor(obj, key);
      if (!d) return _INTRINSIC_SENTINEL;
      if (!('value' in d)) return _INTRINSIC_SENTINEL; // accessor descriptor → tamper signal
      return d.value;
    } catch (e) { return _INTRINSIC_SENTINEL; }
  }
  function _intrinsicsIntact() {
    try {
      // Phase 1 — snapshot every intrinsic via structural descriptor read. No accessor on any of
      // these targets can fire because _ObjectGetOwnPropertyDescriptor returns the descriptor
      // record itself, not the value via [[Get]]. The sentinel marker is returned for missing
      // own properties OR accessor descriptors OR exception cases (e.g. proxy-trapped objects).
      // Codex D2 Round 12 RN-21 (container) closure: use captured container references (_Object,
      // _Array, _JSON, _Reflect, etc.) so a hostile globalThis-level accessor on the container
      // global (e.g. globalThis.Reflect getter) cannot fire — we never re-resolve the container
      // through ambient global lookup. _ObjectGetPrototypeOf(<instance>) is also safe because the
      // captured intrinsic reads the [[Prototype]] internal slot directly.
      var s = {
        objFreeze: _readDescVal(_Object, 'freeze'),
        objAssign: _readDescVal(_Object, 'assign'),
        objKeys: _readDescVal(_Object, 'keys'),
        objCreate: _readDescVal(_Object, 'create'),
        objDefineProperty: _readDescVal(_Object, 'defineProperty'),
        objGetOwnPropertyDescriptor: _readDescVal(_Object, 'getOwnPropertyDescriptor'),
        objGetOwnPropertyNames: _readDescVal(_Object, 'getOwnPropertyNames'),
        objGetPrototypeOf: _readDescVal(_Object, 'getPrototypeOf'),
        objProtoHasOwn: _readDescVal(_ObjectGetPrototypeOf({}), 'hasOwnProperty'),
        arrIsArray: _readDescVal(_Array, 'isArray'),
        arrProtoSlice: _readDescVal(_ObjectGetPrototypeOf([]), 'slice'),
        arrProtoMap: _readDescVal(_ObjectGetPrototypeOf([]), 'map'),
        arrProtoPush: _readDescVal(_ObjectGetPrototypeOf([]), 'push'),
        arrProtoSort: _readDescVal(_ObjectGetPrototypeOf([]), 'sort'),
        arrProtoConcat: _readDescVal(_ObjectGetPrototypeOf([]), 'concat'),
        arrProtoJoin: _readDescVal(_ObjectGetPrototypeOf([]), 'join'),
        arrProtoIndexOf: _readDescVal(_ObjectGetPrototypeOf([]), 'indexOf'),
        globalString: _GlobalThis ? _readDescVal(_GlobalThis, 'String') : _INTRINSIC_SENTINEL,
        strProtoSlice: _readDescVal(_ObjectGetPrototypeOf(''), 'slice'),
        strProtoCharAt: _readDescVal(_ObjectGetPrototypeOf(''), 'charAt'),
        strProtoCharCodeAt: _readDescVal(_ObjectGetPrototypeOf(''), 'charCodeAt'),
        numProtoToString: _readDescVal(_ObjectGetPrototypeOf(0), 'toString'),
        jsonStringify: _readDescVal(_JSON, 'stringify'),
        // Codex D2 Round 11 RN-26 closure: Function.prototype.call / .apply / .bind are critical
        // because contract validators (_normCodes uses .forEach.call, validateEvidenceNodeShape
        // uses .apply) and _stableStringify fallbacks route through them. Capture + verify.
        funcProtoCall: _readDescVal(_ObjectGetPrototypeOf(function () {}), 'call'),
        funcProtoApply: _readDescVal(_ObjectGetPrototypeOf(function () {}), 'apply'),
        funcProtoBind: _readDescVal(_ObjectGetPrototypeOf(function () {}), 'bind'),
        reflectApply: _ReflectApply === null ? null : (_Reflect === null ? _INTRINSIC_SENTINEL : _readDescVal(_Reflect, 'apply')),
        reflectOwnKeys: _ReflectOwnKeys === null ? null : (_Reflect === null ? _INTRINSIC_SENTINEL : _readDescVal(_Reflect, 'ownKeys')),
        // Codex D2 Round 12 RN-27 closure: Math.floor (envelope length-integer check), Number
        // is-integer / is-finite (contract validator), RegExp.prototype.test (_isIsoTimestamp).
        // The container globals (_Math, _Number, _RegExp) are also captured at module init.
        mathFloor: _readDescVal(_Math, 'floor'),
        numIsInteger: _readDescVal(_Number, 'isInteger'),
        numIsFinite: _readDescVal(_Number, 'isFinite'),
        numIsNaN: _readDescVal(_Number, 'isNaN'),
        regexpProtoTest: _readDescVal(_ObjectGetPrototypeOf(/x/), 'test'),
        // Codex D2 Round 13 RN-28 + RN-29 closure: TextEncoder + structuredClone integrity.
        // Both are reachable from contract validation paths and (for structuredClone) from the
        // Step 0.3 input pre-clone, so a rebind anywhere along the chain must trip the guard.
        textEncoder: _GlobalThis ? _readDescVal(_GlobalThis, 'TextEncoder') : _INTRINSIC_SENTINEL,
        structuredCloneGlobal: _GlobalThis ? _readDescVal(_GlobalThis, 'structuredClone') : _INTRINSIC_SENTINEL,
        // Also verify the container globals themselves were not re-bound at globalThis level
        // since we hold captured references — if globalThis.Object is now an accessor, our
        // _Object reference is still the original constructor (captured at module init), but a
        // mismatch here signals an attacker is trying to redirect ambient global lookups.
        globalObject: _GlobalThis ? _readDescVal(_GlobalThis, 'Object') : _INTRINSIC_SENTINEL,
        globalArray: _GlobalThis ? _readDescVal(_GlobalThis, 'Array') : _INTRINSIC_SENTINEL,
        globalReflect: _GlobalThis ? _readDescVal(_GlobalThis, 'Reflect') : _INTRINSIC_SENTINEL,
        globalJSON: _GlobalThis ? _readDescVal(_GlobalThis, 'JSON') : _INTRINSIC_SENTINEL,
        globalMath: _GlobalThis ? _readDescVal(_GlobalThis, 'Math') : _INTRINSIC_SENTINEL,
        globalNumber: _GlobalThis ? _readDescVal(_GlobalThis, 'Number') : _INTRINSIC_SENTINEL,
        globalRegExp: _GlobalThis ? _readDescVal(_GlobalThis, 'RegExp') : _INTRINSIC_SENTINEL,
        globalFunction: _GlobalThis ? _readDescVal(_GlobalThis, 'Function') : _INTRINSIC_SENTINEL,
      };
      // Phase 2 — strict equality compare every snapshot value against its module-init capture.
      // This phase performs no property access on any global; it only compares values already
      // snapshotted in Phase 1.
      return s.objFreeze === _ObjectFreeze
        && s.objAssign === _ObjectAssign
        && s.objKeys === _ObjectKeys
        && s.objCreate === _ObjectCreate
        && s.objDefineProperty === _ObjectDefineProperty
        && s.objGetOwnPropertyDescriptor === _ObjectGetOwnPropertyDescriptor
        && s.objGetOwnPropertyNames === _ObjectGetOwnPropertyNames
        && s.objGetPrototypeOf === _ObjectGetPrototypeOf
        && s.objProtoHasOwn === _ObjectPrototypeHasOwnProperty
        && s.arrIsArray === _ArrayIsArray
        && s.arrProtoSlice === _ArrayPrototypeSlice
        && s.arrProtoMap === _ArrayPrototypeMap
        && s.arrProtoPush === _ArrayPrototypePush
        && s.arrProtoSort === _ArrayPrototypeSort
        && s.arrProtoConcat === _ArrayPrototypeConcat
        && s.arrProtoJoin === _ArrayPrototypeJoin
        && s.arrProtoIndexOf === _ArrayPrototypeIndexOf
        && s.globalString === _String
        && s.strProtoSlice === _StringPrototypeSlice
        && s.strProtoCharAt === _StringPrototypeCharAt
        && s.strProtoCharCodeAt === _StringPrototypeCharCodeAt
        && s.numProtoToString === _NumberPrototypeToString
        && s.jsonStringify === _JSONStringify
        && s.funcProtoCall === _FunctionPrototypeCall
        && s.funcProtoApply === _FunctionPrototypeApply
        && s.funcProtoBind === _FunctionPrototypeBind
        && s.reflectApply === _ReflectApply
        && s.reflectOwnKeys === _ReflectOwnKeys
        && s.mathFloor === _MathFloor
        && s.numIsInteger === _NumberIsInteger
        && s.numIsFinite === _NumberIsFinite
        && s.numIsNaN === _NumberIsNaN
        && s.regexpProtoTest === _RegExpPrototypeTest
        // Container global checks (Codex Round 12 RN-21 container variant): verify globalThis
        // bindings still point to the same containers we captured. A mismatch indicates an
        // accessor descriptor was installed on globalThis.<Container> (the attack vector that
        // bypassed the property-level guard by rebinding push during ambient global resolution).
        && s.globalObject === _Object
        && s.globalArray === _Array
        && s.globalReflect === _Reflect
        && s.globalJSON === _JSON
        && s.globalMath === _Math
        && s.globalNumber === _Number
        && s.globalRegExp === _RegExp
        && s.globalFunction === _Function
        && s.textEncoder === _TextEncoder
        && s.structuredCloneGlobal === _StructuredClone;
    } catch (e) { return false; }
  }
  var _TextEncoder = (typeof TextEncoder !== 'undefined') ? TextEncoder : null;
  var _BufferByteLength = (typeof Buffer !== 'undefined' && Buffer.byteLength) ? Buffer.byteLength : null;

  var SERVICE_VERSION = 1;
  var GRAPH_SCHEMA_VERSION = 1;

  // Closed enum — directive §8 Edge closed enum. derived_from + invalidates are reserved (D2 emits
  // none; later D-phase or test-fixture inputs may introduce them via dedicated APIs).
  var EDGE_KIND_ALLOWED = HI.deepFreeze(['supports', 'contradicts', 'derived_from', 'correlated_with', 'invalidates']);
  var EDGE_KIND_CAUSAL = HI.deepFreeze({ supports: true, contradicts: true });

  // Caps. Mirror D1 envelope language so the contract surface is consistent.
  var NODES_CAP = 256;
  var EDGES_CAP_TOTAL = 1024;
  var CORRELATION_GROUPS_CAP = 64;
  var CANNOT_CONCLUDE_CAP = 64;
  var LIMITATIONS_CAP = 64;
  var INPUT_RAW_EVIDENCE_CAP = 512;   // pre-validation cap on caller array length
  var PARAMS_KEYS_CAP = 32;            // per-observation params object cap (RN-09)
  var PARAM_KEY_BYTE_CAP = 64;         // per-observation params KEY byte cap (RN-09 round-2 follow-up)
  var ENVELOPE_BYTE_CAP = 256 * 1024;  // 256 KiB post-sanitization JSON.stringify cap (RN-09 / RN-14)

  // Allowed evidence sourceId values for which credibility may climb to 'measured'. 'imported_summary'
  // is the canonical example of a source that MUST stay capped at 'derived' (R3.0E future imports).
  // The builder enforces a SINGLE deny rule today (imported_summary). Future allowlist expansion is a
  // separate D-checkpoint review.
  var IMPORTED_SUMMARY_SOURCE_ID = 'imported_summary';
  var IMPORTED_SUMMARY_MAX_CREDIBILITY = 'derived'; // 'measured' is denied

  // Input envelope closed key set.
  var INPUT_KEYS = HI.deepFreeze(['caseAssociation', 'rawEvidence', 'generationToken', 'contextVersion']);
  var CASE_ASSOCIATION_KEYS = HI.deepFreeze(['caseId', 'sessionId', 'lapId']);
  var CASE_ASSOCIATION_REQUIRED = HI.deepFreeze(['caseId', 'sessionId']);
  var OPTS_KEYS = HI.deepFreeze(['clock']);

  // ─── Defence-in-depth helpers ────────────────────────────────────────────────
  // _isPlain: HI.safeIsPlainShape returns 'plain-object' for non-array plain objects, which is
  // what this helper needs. (Arrays are excluded — the original implementation rejected them.)
  function _isPlain(v) { return HI.safeIsPlainShape(v) === 'plain-object'; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }
  function _isFiniteNum(v) { return typeof v === 'number' && HI.safeNumberIsFinite(v); }
  var _ISO_TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  function _isIsoTimestamp(s) { return typeof s === 'string' && HI.safeRegExpTest(_ISO_TIMESTAMP_RE, s); }
  function _hasOnlyAllowedKeys(o, allowed) {
    var keys = HI.safeOwnKeys(o);
    if (keys === null) {
      // Fall back to enumerable-string-key view when ownKeys is unavailable.
      keys = HI.safeKeys(o);
      if (keys === null) return false;
    }
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (typeof k === 'symbol') return false;
      if (HI.safeArrayIndexOf(allowed, k) === -1) return false;
    }
    return true;
  }
  // Own-property check delegated to HI.safeHasOwn (descriptor-based; bypasses both
  // Object.prototype.hasOwnProperty rebinding AND Function.prototype.call rebinding).
  function _hasOwn(obj, key) { return HI.safeHasOwn(obj, key); }
  function _strcmp(a, b) { if (a === b) return 0; return a < b ? -1 : 1; }

  // UTF-8 byte-length helper delegated to HI.safeUtf8ByteLength (TextEncoder via captured ref,
  // with manual char-code summation fallback that already accounts for lone surrogates as the
  // 6-byte \uXXXX JSON escape width).
  function _utf8len(s) { return HI.safeUtf8ByteLength(s); }

  // Codex D2 Round 4 RN-15 + Round 5 RN-15 round-4 + Round 6 RN-17 closure: JSON canonical width
  // estimator. Counts the actual byte width a string occupies when serialised to canonical JSON
  // per ES spec §25.5.2.2 Quote(value):
  //   - " and \ → 2 bytes each (escaped as `\"` / `\\`)
  //   - control chars U+0000..U+001F → 6 bytes (`\uXXXX` form) — only this range MUST be escaped
  //   - ASCII printable (U+0020..U+007E) + DEL (U+007F) → 1 byte (DEL is NOT escaped per spec)
  //   - UTF-8 multi-byte sequences (2 / 3 / 4-byte) → exact width
  //   - VALID surrogate pair (high 0xD800-0xDBFF immediately followed by low 0xDC00-0xDFFF) →
  //     4-byte UTF-8 (the supplementary-plane codepoint)
  //   - LONE high surrogate (0xD800-0xDBFF without a following low) → 6 bytes (`\uXXXX`)
  //   - LONE low surrogate (0xDC00-0xDFFF anywhere) → 6 bytes (`\uXXXX`)
  //
  // Round 6 RN-17 closure: a previous version treated DEL (U+007F) as a 6-byte JSON escape.
  // `JSON.stringify` does NOT escape DEL — Quote(value) only escapes U+0000-U+001F (plus " and \).
  // A DEL-heavy payload that actually fits within the post-canonical envelope cap was being
  // over-rejected at Step 4.5 (101,214 actual bytes incorrectly estimated as ~471 KB).
  //
  // Round 5 closure: the previous implementation skipped the surrogate-pair check by always
  // assuming a high surrogate had a paired low, AND let lone LOW surrogates fall through to the
  // default `n += 3` (BMP 3-byte UTF-8). Per the ES spec since 2019, `JSON.stringify` MUST escape
  // lone surrogates as `\uXXXX` — so a 70-char `\udc00` value JSON-encodes to ~420 chars, not 210.
  //
  // Always overestimates rather than underestimates for the legitimately-escaped range: the pre-
  // canonical estimator never lets through a payload that exceeds the cap. Includes the
  // surrounding "..." quotes (+2).
  function _jsonStringWidth(s) {
    if (typeof s !== 'string') return 4; // typical "null" / unknown wrapper
    var n = 2; // surrounding quotes
    var len = s.length;
    for (var i = 0; i < len; i++) {
      var c = HI.safeStringCharCodeAt(s, i);
      if (c === 0x22 || c === 0x5C) { n += 2; continue; }                  // " or \  → escaped
      if (c < 0x20) { n += 6; continue; }                                  // control U+0000..U+001F → \uXXXX
      if (c < 0x80) { n += 1; continue; }                                  // ASCII printable + DEL (no escape)
      if (c < 0x800) { n += 2; continue; }                                 // UTF-8 2-byte
      if (c >= 0xDC00 && c <= 0xDFFF) { n += 6; continue; }                // LONE low surrogate → \uXXXX
      if (c >= 0xD800 && c <= 0xDBFF) {                                    // high surrogate — check pairing
        if (i + 1 < len) {
          var c2 = HI.safeStringCharCodeAt(s, i + 1);
          if (c2 >= 0xDC00 && c2 <= 0xDFFF) { n += 4; i++; continue; }     // valid pair → 4-byte UTF-8
        }
        n += 6; continue;                                                  // LONE high surrogate → \uXXXX
      }
      n += 3;                                                              // UTF-8 3-byte BMP
    }
    return n;
  }

  // Codex D2 Round 16 architectural convergence: every array helper now delegates to the
  // hardened-intrinsics toolkit. Each HI.* wrapper uses HI's own closure-private intrinsic
  // captures + Reflect.apply via [[Call]] directly, so neither Function.prototype.* nor
  // Array.prototype.* rebinding (whether persistent or self-restoring) reaches the wrapper
  // bodies. The historical Rounds 5-9 BLOCK rationales documented in the previous in-file
  // captures are preserved in spirit by HI's own implementation (defineProperty-based writes,
  // Reflect.apply-based sort, indexed reads only via own descriptors).
  function _safeSlice(arr) { return HI.safeArraySlice(arr); }
  function _safeMap(arr, fn) { return HI.safeArrayMap(arr, fn); }
  function _arrSort(arr, cmp) { return HI.safeArraySort(arr, cmp); }
  function _arrPush(arr, val) { HI.safeArrayPush(arr, val); }
  function _arrIndexOf(arr, target) { return HI.safeArrayIndexOf(arr, target); }
  function _arrSliceN(arr, n) {
    // HI exposes a full slice; emulate take-N via map+early-exit semantics. A direct loop using
    // HI.safeDefineDataProperty preserves the per-index defineProperty write contract.
    var out = [];
    var len;
    try { len = arr.length; } catch (e) { return out; }
    if (typeof len !== 'number') return out;
    len = len | 0;
    var limit = n < len ? n : len;
    for (var i = 0; i < limit; i++) HI.safeDefineDataProperty(out, i, arr[i]);
    return out;
  }
  // Manual "last N chars" extraction via HI.safeStringSlice so a hostile String.prototype.slice
  // rebinding cannot tamper with hash digest formatting.
  function _strLastN(s, n) {
    if (typeof s !== 'string') return '';
    var len = s.length;
    var start = len > n ? len - n : 0;
    return HI.safeStringSlice(s, start, len);
  }
  // Direct-loop concat (two arrays only) — bypasses Array.prototype.concat rebinding by going
  // through HI.safeDefineDataProperty writes.
  function _arrConcat2(a, b) {
    var out = [];
    var la; try { la = a.length; } catch (e) { la = 0; }
    var lb; try { lb = b.length; } catch (e) { lb = 0; }
    if (typeof la !== 'number') la = 0;
    if (typeof lb !== 'number') lb = 0;
    la = la | 0; lb = lb | 0;
    var idx = 0;
    for (var i = 0; i < la; i++) { HI.safeDefineDataProperty(out, idx, a[i]); idx++; }
    for (var j = 0; j < lb; j++) { HI.safeDefineDataProperty(out, idx, b[j]); idx++; }
    return out;
  }
  // Direct-loop shift / sortedInsert for Kahn's algorithm queue. Bypasses Array.prototype.shift +
  // Array.prototype.splice rebinding. _arrShift removes and returns first element via
  // HI.safeDefineDataProperty rewrites; _arrSortedInsert inserts a value into a pre-sorted-by-
  // strcmp array at the correct position.
  function _arrShift(arr) {
    var len; try { len = arr.length; } catch (e) { return undefined; }
    if (typeof len !== 'number' || len === 0) return undefined;
    len = len | 0;
    var first = arr[0];
    for (var i = 1; i < len; i++) HI.safeDefineDataProperty(arr, i - 1, arr[i]);
    arr.length = len - 1;
    return first;
  }
  function _arrSortedInsert(arr, value) {
    var lo = 0;
    var hi; try { hi = arr.length; } catch (e) { hi = 0; }
    if (typeof hi !== 'number') hi = 0;
    hi = hi | 0;
    while (lo < hi) { var mid = (lo + hi) >>> 1; if (arr[mid] < value) lo = mid + 1; else hi = mid; }
    // Insert at `lo`: shift later elements right by one, then place value.
    var len; try { len = arr.length; } catch (e) { len = 0; }
    if (typeof len !== 'number') len = 0;
    len = len | 0;
    for (var i = len; i > lo; i--) HI.safeDefineDataProperty(arr, i, arr[i - 1]);
    HI.safeDefineDataProperty(arr, lo, value);
  }

  // Codex D2 Round 6 RN-16 closure: exact per-node byte measurement via captured _JSONStringify +
  // _utf8len. The previous approximation summed _jsonStringWidth across SELECTED fields and
  // missed top-level structural keys ("nodeId":, "category":, etc.), nested object braces, and
  // inter-field commas — combined undercount of ~300+ bytes per node. Codex Round 6 exploit (35
  // x 30 x 225 ASCII chars = ~265 KB actual) bypassed Step 4.5 (~256 KB estimated) and was only
  // caught by post-canonical Step 17.
  //
  // Round 7 fix: build the SAME per-node idPayload shape that Step 16 constructs (mirroring the
  // mapping at the graphId derivation site exactly), run captured _JSONStringify on it, and use
  // _utf8len for UTF-8-byte-accurate width. The result is EXACT for each sanitized node (no
  // approximation). The outer envelope adds a small fixed wrapper constant accounted for at
  // Step 4.5's running-total starting value (WRAPPER_FIXED_BYTES).
  //
  // Sanitized inputs are plain frozen primitives (D1 contract guarantee), so JSON.stringify never
  // encounters accessor descriptors, Proxies, or throwing getters. Captured _JSONStringify means
  // a hostile clock that replaces JSON.stringify after import cannot tamper with this measurement.
  function _perNodeIdPayloadShape(n) {
    return {
      nodeId: n.nodeId,
      category: n.category,
      credibility: n.credibility,
      provenance: n.provenance,
      availability: n.availability,
      confidence: { state: (n.confidence && n.confidence.state) ? n.confidence.state : null },
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
  }
  function _estimateNodeUtf8Bytes(node) {
    // Codex D2 Round 8 RN-18 closure: use _stableStringify (no toJSON callback) instead of
    // _JSONStringify (which invokes inherited Object.prototype.toJSON per ES §25.5.2.2).
    try { return _utf8len(_stableStringify(_perNodeIdPayloadShape(node))); }
    catch (e) { return ENVELOPE_BYTE_CAP + 1; } // pessimistic fail-closed on stringify failure
  }
  // Wrapper byte allowance covering the post-canonical idPayload outer structure:
  //   {"caseAssociation":{caseId,sessionId,lapId},"nodes":[<NODES>],"edges":[<EDGES>],"correlationGroups":[<GROUPS>]}
  // Sized to cover the caseAssociation object + outer braces + 5 JSON keys + 4 commas + array
  // bracket pairs, plus inter-node commas (n-1 added per Step 4.5 running total). Edges and
  // correlationGroups arrays are bounded separately by EDGES_CAP_TOTAL / CORRELATION_GROUPS_CAP
  // checks, and any envelope overflow they cause is the authoritative Step 17 check's job.
  var WRAPPER_FIXED_BYTES = 256;

  // Stable canonical JSON serialiser — delegates to HI.stableStringify. HI's implementation uses
  // closure-private intrinsic captures + manual insertion sort + direct primitive encoding, NEVER
  // invoking .push / .join / .sort or Object.prototype.toJSON. The historical Rounds 8/9 BLOCK
  // rationales (RN-18 toJSON hook, RN-19 Array.prototype rebinding) are structurally closed by
  // routing through HI rather than reimplementing the same logic locally.
  function _stableStringify(value) { return HI.stableStringify(value); }

  // FNV-1a 32-bit hash → lowercase hex. Used ONLY as a diagnostic identifier (graphId / correlationGroupId);
  // the actual dedup decisions use the FULL canonical string, not the hash, so a collision in the hash
  // CANNOT cause silent data loss (RN-04 closure). Double-pass widening for nicer-looking ids.
  // Char-code reads go through HI.safeStringCharCodeAt; numeric-to-hex coercion uses
  // HI.safeStringCoerce together with a manual base-16 fold (no Number.prototype.toString ambient
  // call). _strLastN already routes through HI.safeStringSlice.
  function _toHex8(h) {
    var hexChars = '0123456789abcdef';
    var out = '';
    var x = h >>> 0;
    for (var i = 7; i >= 0; i--) {
      var nibble = (x >>> (i * 4)) & 0xF;
      out += hexChars[nibble];
    }
    return out;
  }
  function _hash32(s) {
    var h = 0x811c9dc5;
    var len = (typeof s === 'string') ? s.length : 0;
    for (var i = 0; i < len; i++) {
      h ^= HI.safeStringCharCodeAt(s, i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return _toHex8(h);
  }
  function _hash64(s) {
    var slen = (typeof s === 'string') ? s.length : 0;
    return _hash32(s) + _hash32(s + '|' + slen);
  }

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
  // BEFORE dedup (RN-03 closure) so caller permutation cannot change the dedup winner. Round 2
  // closure: also includes confidence.state so two same-nodeId candidates differing only by
  // unresolved/not_computed sort deterministically (round 2 RN-03 evidence).
  // All JSON encoding goes through HI.stableStringify (no toJSON invocation, captured intrinsics).
  function _fullCanonicalString(node) {
    return HI.stableStringify(node.nodeId) + '|' + _semanticCanonicalString(node) + '|cred:' + node.credibility + '|prov:' + node.provenance + '|avl:' + node.availability + '|conf:' + (node.confidence && node.confidence.state ? node.confidence.state : 'null') + '|fresh:' + node.identity.freshness + '|supE:' + _stableStringify(node.supportingEdges) + '|conE:' + _stableStringify(node.contradictingEdges) + '|lims:' + _stableStringify(node.limitations);
  }

  // Correlation group key — nodes sharing this key are correlated (same source observing the same
  // (case, session, lap, sourceId) origin). Uses canonical string (deterministic), then a hash of
  // it for the displayed group id (cosmetic — actual grouping uses the canonical string in a
  // proto-null map). All JSON encoding routes through HI.stableStringify.
  function _correlationGroupCanonical(node) {
    var id = node.identity;
    return HI.stableStringify(id.caseId) + '|' + HI.stableStringify(id.sessionId) + '|' + HI.stableStringify(id.lapId == null ? null : id.lapId) + '|' + HI.stableStringify(id.sourceId);
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
    var caDesc = HI.safeGetOwnDescriptor(input, 'caseAssociation');
    if (caDesc === null) return RC.buildBlockedResult([CODES.EVIDENCE_ASSOCIATION_MISMATCH], { detail: 'caseAssociation descriptor read threw' });
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
    var reDesc = HI.safeGetOwnDescriptor(input, 'rawEvidence');
    if (reDesc === null) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence descriptor read threw' });
    if (!reDesc || !('value' in reDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence must be a data property' });
    var re = reDesc.value;
    if (!HI.safeIsArray(re)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence must be an array' });
    var reProto = HI.safeGetPrototypeOf(re);
    if (reProto !== _Array.prototype) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence is not a plain Array (subclass / mutated prototype rejected)' });
    // Codex D2 Round 13 RN-21/27 closure: read length via the captured descriptor reader (avoids
    // [[Get]] which would invoke a Proxy `get` trap that could rebind globals; structurally just
    // returns the own descriptor). Length-read trap is the specific RN-21/27 exploit surface.
    var lenDesc = HI.safeGetOwnDescriptor(re, 'length');
    if (lenDesc === null) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence.length descriptor read threw' });
    if (!lenDesc || !('value' in lenDesc)) return RC.buildBlockedResult([CODES.PROTOTYPE_POLLUTION_REJECTED], { detail: 'rawEvidence.length is not a data property' });
    var reLen = lenDesc.value;
    if (typeof reLen !== 'number' || !_isFiniteNum(reLen) || reLen < 0 || HI.safeMathFloor(reLen) !== reLen) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'rawEvidence.length malformed' });
    if (reLen > INPUT_RAW_EVIDENCE_CAP) return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'rawEvidence array length ' + reLen + ' exceeds cap ' + INPUT_RAW_EVIDENCE_CAP });
    // optional generationToken — descriptor-safe read
    var gt = null;
    var gtDesc = HI.safeGetOwnDescriptor(input, 'generationToken');
    if (gtDesc === null) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken descriptor read threw' });
    if (gtDesc) {
      if (!('value' in gtDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken must be a data property' });
      var gtv = gtDesc.value;
      if (gtv === null) gt = null;
      else if (typeof gtv !== 'string' || gtv.length === 0) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'generationToken must be null or non-empty string' });
      else if (gtv.length > 256) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'generationToken exceeds 256 chars' });
      else gt = gtv;
    }
    // optional contextVersion — descriptor-safe read
    var cv = null;
    var cvDesc = HI.safeGetOwnDescriptor(input, 'contextVersion');
    if (cvDesc === null) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion descriptor read threw' });
    if (cvDesc) {
      if (!('value' in cvDesc)) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion must be a data property' });
      var cvv = cvDesc.value;
      if (cvv === null) cv = null;
      else if (typeof cvv !== 'string' || cvv.length === 0) return RC.buildBlockedResult([CODES.INTERNAL_CONTRACT_VIOLATION], { detail: 'contextVersion must be null or non-empty string' });
      else if (cvv.length > 64) return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'contextVersion exceeds 64 chars' });
      else cv = cvv;
    }
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

  // Build a BLOCK envelope directly via HI without going through RC.buildBlockedResult — the
  // contract module's _normCodes would itself depend on ambient prototype methods that the
  // integrity guard has flagged as compromised, so we use HI primitives only. Used at every
  // integrity-guard checkpoint (Step 0 / 1.5 / 3.5 / 17.6).
  function _buildIntrinsicTamperBlock(detail) {
    var reasonCodes = [];
    HI.safeDefineDataProperty(reasonCodes, 0, CODES.INTERNAL_CONTRACT_VIOLATION);
    HI.deepFreeze(reasonCodes);
    var explanationKeys = [];
    HI.safeDefineDataProperty(explanationKeys, 0, 'r3_0d.reason.internal_contract_violation');
    HI.deepFreeze(explanationKeys);
    return HI.deepFreeze({
      eligible: false,
      status: 'blocked',
      reasonCodes: reasonCodes,
      explanationKeys: explanationKeys,
      detail: detail,
      result: null,
    });
  }

  // RN-06 closure: resolve opts.clock AFTER envelope validation; descriptor-safe; throwing getter
  // collapses to createdAt = null (clock is best-effort; never blocks the build).
  function _resolveClock(opts) {
    if (opts === null || opts === undefined) return null;
    if (!RC.isOriginalPlainObject(opts)) return null;
    if (RC.hasHiddenOwnKey(opts)) return null;
    if (!_hasOnlyAllowedKeys(opts, OPTS_KEYS)) return null;
    var desc = HI.safeGetOwnDescriptor(opts, 'clock');
    if (!desc) return null;                    // null (throw) or undefined (missing key) — fail-soft
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

  // DFS cycle detection over the directed CAUSAL edge list. Uses a proto-null colour map (RN-08)
  // via HI.safeObjectCreateNull so a hostile clock that rebinds Object.create cannot poison the
  // map's prototype chain.
  function _findCycle(nodeIds, adjacencyCausal) {
    var WHITE = 0, GREY = 1, BLACK = 2;
    var color = HI.safeObjectCreateNull();
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
  // proto-null in-degree map (RN-08) via HI.safeObjectCreateNull.
  function _topologicalOrder(nodeIds, adjacencyCausal) {
    var inDegree = HI.safeObjectCreateNull();
    var i;
    for (i = 0; i < nodeIds.length; i++) inDegree[nodeIds[i]] = 0;
    for (i = 0; i < nodeIds.length; i++) {
      var nbrs = adjacencyCausal[nodeIds[i]] || [];
      for (var k = 0; k < nbrs.length; k++) {
        if (_hasOwn(inDegree, nbrs[k])) inDegree[nbrs[k]]++;
      }
    }
    var queue = [];
    for (i = 0; i < nodeIds.length; i++) if (inDegree[nodeIds[i]] === 0) _arrPush(queue, nodeIds[i]);
    _arrSort(queue, _strcmp);
    var out = [];
    while (queue.length > 0) {
      var u = _arrShift(queue);
      _arrPush(out, u);
      var nbrs2 = _arrSort(_safeSlice(adjacencyCausal[u] || []), _strcmp);
      for (var m = 0; m < nbrs2.length; m++) {
        var v = nbrs2[m];
        if (_hasOwn(inDegree, v)) {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            _arrSortedInsert(queue, v);
          }
        }
      }
    }
    return out;
  }

  // Materialise the final closed-shape sanitized graph (deep freeze every nested array/object).
  // Materialise the final closed-shape sanitized graph. Codex D2 Round 3 RN-13 + Round 4 RN-13
  // round-3 closure: every intrinsic call goes through module-init captured refs. This includes
  // Array.prototype.map / slice (via _safeMap / _safeSlice), Object.freeze (via _ObjectFreeze),
  // and Object.keys (via _ObjectKeys). _ObjectAssign is intentionally NOT used (replaced with a
  // manual _ObjectKeys + indexed copy loop) so a clock that tampers with Object.assign cannot
  // inject keys, and so a clock that tampers with Array.prototype.* cannot poison the slice/map
  // shape of any graph-owned container.
  // Codex D2 Round 16 architectural convergence: every primitive op (map / slice / freeze /
  // proto-null-create / object-keys / defineProperty) routes through HI. The historical Round 6
  // RN-13 closure (defineProperty bypass of Object.prototype setters) is now structurally enforced
  // by HI.safeObjectAssign + HI.safeDefineDataProperty (both [[DefineOwnProperty]] writes), so
  // the rationale carries forward without an in-file defineProperty loop.
  function _materializeGraph(o) {
    var cgFrozen = _safeMap(o.correlationGroups, function (g) {
      return HI.deepFreeze({
        correlationGroupId: g.correlationGroupId,
        memberNodeIds: HI.deepFreeze(_safeSlice(g.memberNodeIds)),
        independenceWeight: g.independenceWeight,
      });
    });
    var rejSemFrozen = _safeMap(o.dedup.rejectedSemanticDuplicates, function (r) {
      return HI.deepFreeze({
        fingerprint: r.fingerprint,
        keptNodeId: r.keptNodeId,
        droppedNodeId: r.droppedNodeId,
      });
    });
    var rejReplaysFrozen = _safeMap(o.dedup.rejectedSourceReplays, function (r) {
      // HI.safeObjectAssign + HI.safeDefineDataProperty install own data descriptors via
      // [[DefineOwnProperty]] so a hostile clock-installed setter on Object.prototype[<key>]
      // cannot intercept the keyed assignment and inject a `{tampered:true}` value.
      var copy = HI.safeObjectAssign(HI.safeObjectCreateNull(), r);
      return HI.deepFreeze(copy);
    });
    var dedupSummaryFrozen = HI.deepFreeze({
      rejectedDuplicateIds: HI.deepFreeze(_safeSlice(o.dedup.rejectedDuplicateIds)),
      rejectedSemanticDuplicates: HI.deepFreeze(rejSemFrozen),
      rejectedSourceReplays: HI.deepFreeze(rejReplaysFrozen),
    });
    // HI.safeObjectAssign onto a HI.safeObjectCreateNull() base so a hostile clock-installed
    // setter on Object.prototype[<reasonCode>] cannot intercept the keyed assignment and inject
    // a `{tampered:true}` count into rejectedReasonsSummary.
    var rrsCopy = HI.safeObjectAssign(HI.safeObjectCreateNull(), o.provenance.rejectedReasonsSummary);
    var graph = {
      schemaVersion: GRAPH_SCHEMA_VERSION,
      graphId: o.graphId,
      caseAssociation: HI.deepFreeze({
        caseId: o.caseAssociation.caseId,
        sessionId: o.caseAssociation.sessionId,
        lapId: o.caseAssociation.lapId == null ? null : o.caseAssociation.lapId,
      }),
      sessionAssociation: HI.deepFreeze({ sessionId: o.caseAssociation.sessionId }),
      nodes: HI.deepFreeze(_safeSlice(o.nodes)),
      edges: HI.deepFreeze(_safeSlice(o.edges)),
      topologicalOrder: HI.deepFreeze(_safeSlice(o.topologicalOrder)),
      deduplicationSummary: dedupSummaryFrozen,
      correlationGroups: HI.deepFreeze(cgFrozen),
      limitations: HI.deepFreeze(_safeSlice(o.limitations)),
      cannotConclude: HI.deepFreeze(_safeSlice(o.cannotConclude)),
      provenance: HI.deepFreeze({
        builderVersion: SERVICE_VERSION,
        inputCount: o.provenance.inputCount,
        sanitizedCount: o.provenance.sanitizedCount,
        rejectedCount: o.provenance.rejectedCount,
        rejectedReasonsSummary: HI.deepFreeze(rrsCopy),
      }),
      createdAt: o.createdAt,
      generationToken: o.generationToken,
      contextVersion: o.contextVersion,
    };
    return HI.deepFreeze(graph);
  }

  /**
   * buildEvidenceGraph(input, opts) — primary entry. See module header for the contract.
   */
  function buildEvidenceGraph(inputIn, optsIn) {
    try {
      // Step 0 — Codex D2 Round 10 RN-21..RN-25 closure: intrinsic integrity gate. Any global
      // primitive method we rely on that has been rebound between module init and this call
      // (Array.prototype.push, Object.freeze, Object.getOwnPropertyDescriptor, JSON.stringify,
      // String, Number.prototype.toString, String.prototype.charAt, etc.) → fail-closed BLOCK
      // before any caller-controlled code can run. JS is single-threaded so a passing guard
      // means no further global rebinding can occur until our build returns.
      // Construct the BLOCK envelope directly without calling RC.buildBlockedResult — the
      // contract module's _normCodes uses ambient Array.prototype.push / .forEach which would be
      // corrupted by the same rebinding.
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected at entry: a captured global primitive method has been rebound since module init');
      }

      // Step 1 — input envelope structural gate + TRUSTED SNAPSHOT (RN-01 closure). Envelope-
      // level shape rejection (non-plain envelope / Symbol keys / non-enumerable / nested class /
      // accessor descriptors / Array subclass) is preserved on the ORIGINAL input — these checks
      // use captured intrinsics and reject hostile shapes BEFORE they enter any iteration loop.
      var env = _validateInputEnvelope(inputIn);
      if (!env.ok) return env;

      // Step 1.5 — Codex D2 Round 13 RN-21/27 closure: re-check intrinsic integrity AFTER
      // envelope validation. Envelope reads on a Proxy input (e.g. caseAssociation accessor,
      // rawEvidence Proxy descriptors) can fire user-controlled traps that rebind globals between
      // Step 0 entry guard and Step 17.6 post-clock guard, with the clock callback later
      // restoring the binding so the post-clock guard alone passes. This re-check catches any
      // such rebinding immediately after the envelope's input-touching reads.
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-envelope: input Proxy trap rebound a captured global primitive method during envelope validation');
      }
      var caseAssociation = env.snapshot.caseAssociation;
      var generationToken = env.snapshot.generationToken;
      var contextVersion = env.snapshot.contextVersion;
      var rawEvidenceRef = env.snapshot.rawEvidenceRef;
      var inputCount = env.snapshot.rawEvidenceLength;

      // Step 2 — Round 2 RN-01 + RN-06 closure: defer clock invocation until ALL input-touching
      // work is complete. The clock function CANNOT mutate rawEvidence under us because it never
      // runs while we are reading the array. createdAt is assigned at the very end of the build.

      // Step 3 — per-node validation. Each rawEvidence[i] is read via descriptor (RN-02 closure):
      // accessor / sparse / inherited slots become ONE rejected node, never a whole-build throw.
      var sanitized = [];
      var rejectedCount = 0;
      var rejectedReasons = HI.safeObjectCreateNull();
      function tally(code) { rejectedReasons[code] = (rejectedReasons[code] || 0) + 1; }

      for (var i = 0; i < inputCount; i++) {
        // Codex D2 Round 16 architectural convergence: the per-rawEvidence descriptor read can
        // fire a Proxy [[GetOwnProperty]] trap that installs a hostile global rebind and SELF-
        // RESTORES on the next trap fire. The mid-iteration integrity guard must run BEFORE any
        // short-circuiting `continue` in this iteration body (rejecting a node early would
        // otherwise skip the historical end-of-iteration check and let the rebind survive until
        // the next trap fires the restoration — leaving only the post-iteration Step 3.5 guard,
        // which sees clean state). Running here closes the self-restoring window at the narrowest
        // possible point — immediately after the trap fire.
        var desc = HI.safeGetOwnDescriptor(rawEvidenceRef, i);
        if (!_intrinsicsIntact()) {
          return _buildIntrinsicTamperBlock('intrinsic-tampering detected mid-iteration: a Proxy/getter trap rebound a captured global primitive method during per-node validation at index ' + i);
        }
        // HI returns null on throw, undefined on missing index — both signal a hostile shape;
        // accessor descriptors are caught by the `'value' in desc` check below.
        if (desc === null) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
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
          var codes = HI.safeIsArray(check.reasonCodes) ? check.reasonCodes : [CODES.EVIDENCE_NODE_INVALID];
          for (var rci = 0; rci < codes.length; rci++) tally(codes[rci]);
          continue;
        }
        var san = check.sanitized;
        // RN-09 — per-observation params key count cap + per-key UTF-8 BYTE cap (round-3 fix
        // uses _utf8len helper for actual UTF-8 byte width, not UTF-16 code units).
        if (san.observation && san.observation.params && typeof san.observation.params === 'object') {
          var paramKeys = HI.safeKeys(san.observation.params);
          if (paramKeys === null) { rejectedCount++; tally(CODES.PROTOTYPE_POLLUTION_REJECTED); continue; }
          if (paramKeys.length > PARAMS_KEYS_CAP) { rejectedCount++; tally(CODES.ARRAY_CAP_EXCEEDED); continue; }
          var anyOversizeKey = false;
          for (var pki = 0; pki < paramKeys.length; pki++) {
            if (_utf8len(paramKeys[pki]) > PARAM_KEY_BYTE_CAP) { anyOversizeKey = true; break; }
          }
          if (anyOversizeKey) { rejectedCount++; tally(CODES.BYTE_CAP_EXCEEDED); continue; }
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
        _arrPush(sanitized, san);
        // Codex D2 Round 14 RN-21/27/28/29 (self-restoring trap) closure: re-check intrinsic
        // integrity AFTER each per-rawEvidence iteration. A Proxy trap (e.g.
        // [[GetOwnProperty]] on rawEvidence[i]) can install a hostile binding, let contract
        // validation use it during this iteration, and SELF-RESTORE on the NEXT iteration's
        // trap fire — making both the loop-exit (Step 3.5) and post-clock (Step 17.6) guards
        // see a clean state. The per-iteration check runs WHILE the rebind is still in effect
        // (before the next trap fires the restoration), so any self-restoring tampering is
        // caught immediately and fails-closed BLOCK. This is necessarily more expensive than
        // a single loop-exit check but is the only correct defence for the self-restoring
        // attack class identified in Codex Round 14.
        if (!_intrinsicsIntact()) {
          return _buildIntrinsicTamperBlock('intrinsic-tampering detected mid-iteration: a Proxy/getter trap rebound a captured global primitive method during per-node validation at index ' + i);
        }
      }

      // Step 3.5 — Codex D2 Round 13 RN-21/27 closure: re-check intrinsic integrity AFTER all
      // per-rawEvidence-index descriptor reads + contract validators have completed. A Proxy
      // [[GetOwnProperty]] trap on any rawEvidence index, OR a hostile getter at any node
      // sub-field, could have fired during the iteration above and rebound a captured global.
      // The clock callback at Step 17.5 might restore the binding so the Step 17.6 post-clock
      // guard alone passes. This re-check catches any such mid-iteration rebinding immediately
      // before Step 4's NODES_CAP check (which uses sanitized.length, intrinsic-safe).
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-iteration: input Proxy/getter trap rebound a captured global primitive method during per-node validation');
      }

      // Step 4 — cap on accepted nodes.
      if (sanitized.length > NODES_CAP) {
        return RC.buildBlockedResult([CODES.GRAPH_CAP_EXCEEDED], { detail: 'sanitized node count ' + sanitized.length + ' exceeds NODES_CAP=' + NODES_CAP });
      }

      // Step 4.5 — RN-09 round-3 + RN-14 + Round 6 RN-16 closure: exact UTF-8 byte estimate
      // BEFORE canonical serialisation. Uses _estimateNodeUtf8Bytes() which runs captured
      // _JSONStringify on the SAME per-node idPayload shape that Step 16 constructs, then captured
      // _utf8len for actual UTF-8 width. Adds WRAPPER_FIXED_BYTES for the outer envelope
      // (caseAssociation + nodes/edges/correlationGroups array brackets + 4 JSON keys), and +1
      // per node for inter-node commas inside the "nodes":[...] array. Bails on the first node
      // whose accumulated running total would exceed ENVELOPE_BYTE_CAP — Step 17 remains the
      // authoritative post-canonical check.
      var roughTotal = WRAPPER_FIXED_BYTES;
      for (var rb = 0; rb < sanitized.length; rb++) {
        try { roughTotal += _estimateNodeUtf8Bytes(sanitized[rb]); }
        catch (e) { /* defensive: ignore individual estimate errors */ }
        if (rb > 0) roughTotal += 1; // inter-node comma
        if (roughTotal > ENVELOPE_BYTE_CAP) {
          return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'pre-canonicalization byte estimate exceeded ENVELOPE_BYTE_CAP=' + ENVELOPE_BYTE_CAP });
        }
      }

      // Step 5 — RN-03 closure: sort sanitized by full canonical content BEFORE any dedup so caller
      // permutation cannot influence which duplicate wins. Tie-breaker on a deterministic field.
      _arrSort(sanitized, function (a, b) { return _strcmp(_fullCanonicalString(a), _fullCanonicalString(b)); });

      // Step 6 — duplicate-ID dedup (HI.safeObjectCreateNull() map — RN-08 closure). First by sort
      // order (deterministic) is kept; subsequent rejected.
      var byId = HI.safeObjectCreateNull();
      var keptById = [];
      var rejectedDuplicateIds = [];
      for (var d = 0; d < sanitized.length; d++) {
        var n = sanitized[d];
        if (_hasOwn(byId, n.nodeId)) {
          _arrPush(rejectedDuplicateIds, n.nodeId);
          tally(CODES.EVIDENCE_DUPLICATE_ID);
          rejectedCount++;
          continue;
        }
        byId[n.nodeId] = n;
        _arrPush(keptById, n);
      }
      _arrSort(rejectedDuplicateIds, _strcmp);

      // Step 7 — semantic CANONICAL STRING dedup (RN-04 closure). The map KEY is the full canonical
      // string itself, not a hash. Collisions are impossible by definition.
      var semSeen = HI.safeObjectCreateNull();
      var keptAfterSemantic = [];
      var rejectedSemanticDuplicates = [];
      for (var s = 0; s < keptById.length; s++) {
        var nn = keptById[s];
        var canon = _semanticCanonicalString(nn);
        if (_hasOwn(semSeen, canon)) {
          _arrPush(rejectedSemanticDuplicates, { fingerprint: _hash64('sem|' + canon), keptNodeId: semSeen[canon], droppedNodeId: nn.nodeId });
          tally(CODES.EVIDENCE_GRAPH_DUPLICATED_SOURCE_DOUBLECOUNT);
          rejectedCount++;
          delete byId[nn.nodeId];
          continue;
        }
        semSeen[canon] = nn.nodeId;
        _arrPush(keptAfterSemantic, nn);
      }
      _arrSort(rejectedSemanticDuplicates, function (a, b) { return _strcmp(a.droppedNodeId, b.droppedNodeId); });

      // Step 8 — orphan edge detection. Any supportingEdges / contradictingEdges target nodeId that
      // is not in the surviving graph triggers EVIDENCE_GRAPH_ORPHAN.
      var orphanDetected = false;
      var orphanDetail = null;
      for (var e = 0; e < keptAfterSemantic.length; e++) {
        var nx = keptAfterSemantic[e];
        var allEdges = _arrConcat2(nx.supportingEdges, nx.contradictingEdges);
        for (var ek = 0; ek < allEdges.length; ek++) {
          var tgt = allEdges[ek];
          if (!_hasOwn(byId, tgt)) {
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
      var adjacencyCausal = HI.safeObjectCreateNull();
      function addEdge(from, to, kind) {
        if (_arrIndexOf(EDGE_KIND_ALLOWED, kind) === -1) return false;
        _arrPush(edges, { from: from, to: to, kind: kind });
        if (EDGE_KIND_CAUSAL[kind]) {
          if (!adjacencyCausal[from]) adjacencyCausal[from] = [];
          _arrPush(adjacencyCausal[from], to);
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
      var groupBucket = HI.safeObjectCreateNull();
      for (var g = 0; g < keptAfterSemantic.length; g++) {
        var ng = keptAfterSemantic[g];
        var gk = _correlationGroupCanonical(ng);
        if (!groupBucket[gk]) groupBucket[gk] = [];
        _arrPush(groupBucket[gk], ng.nodeId);
      }
      var groupKeysSorted = _arrSort(HI.safeKeys(groupBucket) || [], _strcmp);
      var correlationGroups = [];
      for (var gi = 0; gi < groupKeysSorted.length; gi++) {
        var gk2 = groupKeysSorted[gi];
        var members = _arrSort(_safeSlice(groupBucket[gk2]), _strcmp);
        var iw = members.length > 0 ? 1 / members.length : 0;
        _arrPush(correlationGroups, {
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

      // Step 11.5 — Codex D2 Round 7 RN-16 final closure: exact envelope byte cap check on the
      // SAME idPayload structure Step 16 will canonicalise, built once edges + correlationGroups
      // exist. Codex Round 7 exposed a same-source correlation-explosion attack (35 nodes sharing
      // one sourceId emit 35*34/2=595 correlated_with edges, ~71 KB), which slipped past the
      // per-node-only Step 4.5 estimate (~211 KB pre-canonical sum, under cap) and was only
      // caught by post-canonical Step 17 at 264,011 bytes. Step 11.5 now builds the preview
      // idPayload using captured intrinsics and runs the EXACT envelope check before Step 12's
      // cycle DFS / Step 13's topological sort / Step 14's per-element freezes — failing closed
      // with the same BYTE_CAP_EXCEEDED code but a "pre-materialization" detail (Step 17 stays
      // as belt-and-suspenders on the actual idPayload).
      var previewIdPayload = {
        caseAssociation: caseAssociation,
        nodes: _safeMap(keptAfterSemantic, function (n) { return _perNodeIdPayloadShape(n); }),
        edges: edges,
        correlationGroups: _safeMap(correlationGroups, function (g) { return { correlationGroupId: g.correlationGroupId, memberNodeIds: g.memberNodeIds, independenceWeight: g.independenceWeight }; }),
      };
      // Codex D2 Round 8 RN-18 closure: use _stableStringify (descriptor-safe, no toJSON callback)
      // instead of _JSONStringify. A hostile Object.prototype.toJSON installed before this call
      // was previously invoked by JSON.stringify on every nested object, allowing (a) mutation of
      // the shared `edges` array AFTER the Step 11 cap/enum checks → injection of an invalid_kind
      // edge into the materialised graph, and (b) stateful size returns so Step 11.5 measured a
      // different envelope than Step 17 (breaking the exact-equivalence claim). _stableStringify
      // walks via _ObjectKeys + manual indexed array recursion + direct primitive encoding, never
      // performing a [[Get]] for the `toJSON` property anywhere in the value tree.
      var previewBytes;
      try { previewBytes = _utf8len(_stableStringify(previewIdPayload)); }
      catch (e) { previewBytes = Infinity; }
      if (previewBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'pre-materialization envelope byte estimate ' + previewBytes + ' exceeds ENVELOPE_BYTE_CAP=' + ENVELOPE_BYTE_CAP });
      }

      // Step 12 — cycle detection over CAUSAL edges only.
      var sortedNodeIds = _arrSort(_safeMap(keptAfterSemantic, function (x) { return x.nodeId; }), _strcmp);
      var cycleHit = _findCycle(sortedNodeIds, adjacencyCausal);
      if (cycleHit !== null) {
        return RC.buildBlockedResult([CODES.EVIDENCE_GRAPH_CYCLE], { detail: 'cycle involves nodeId ' + cycleHit });
      }

      // Step 13 — topological order over the acyclic causal subgraph.
      var topo = _topologicalOrder(sortedNodeIds, adjacencyCausal);

      // Step 14 — sort nodes deterministically; sort edges by (from, to, kind).
      var nodesOut = _arrSort(_safeSlice(keptAfterSemantic), function (a, b) { return _strcmp(a.nodeId, b.nodeId); });
      var edgesOut = _arrSort(_safeSlice(edges), function (a, b) {
        var c = _strcmp(a.from, b.from); if (c !== 0) return c;
        c = _strcmp(a.to, b.to); if (c !== 0) return c;
        return _strcmp(a.kind, b.kind);
      });
      // Codex D2 Round 9 RN-20 closure: HI.deepFreeze uses HI's closure-private _ObjectFreeze
      // capture and Reflect.apply, so a pre-call replacement of Object.freeze cannot reach the
      // freeze body. The historical rationale (preventing a hostile freeze stub from mutating
      // edge kinds at freeze time) is structurally enforced by HI's wrapper.
      for (var ni = 0; ni < nodesOut.length; ni++) HI.deepFreeze(nodesOut[ni]);
      for (var ei = 0; ei < edgesOut.length; ei++) HI.deepFreeze(edgesOut[ei]);

      // Step 15 — limitations / cannotConclude derivation.
      var limitations = [];
      var cannotConclude = [];
      var limSeen = HI.safeObjectCreateNull();
      for (var li = 0; li < nodesOut.length; li++) {
        var lims = nodesOut[li].limitations;
        for (var lj = 0; lj < lims.length; lj++) {
          if (!limSeen[lims[lj]]) { limSeen[lims[lj]] = true; _arrPush(limitations, lims[lj]); }
        }
      }
      // Codex D-GATE-02 closure: if ANY sanitized node references the imported_summary
      // source, propagate LIMITATION_IMPORTED_SUMMARY into graph.limitations. D3 carries
      // it into hypothesisSet.limitations; D5 rejects the brief at composition time so
      // the imported-summary path never yields an authoritative engineer brief.
      for (var liIs = 0; liIs < nodesOut.length; liIs++) {
        var nIs = nodesOut[liIs];
        if (nIs && nIs.identity && nIs.identity.sourceId === IMPORTED_SUMMARY_SOURCE_ID) {
          if (!limSeen[CODES.LIMITATION_IMPORTED_SUMMARY]) {
            limSeen[CODES.LIMITATION_IMPORTED_SUMMARY] = true;
            _arrPush(limitations, CODES.LIMITATION_IMPORTED_SUMMARY);
          }
          break;
        }
      }
      if (nodesOut.length === 0) {
        if (_arrIndexOf(cannotConclude, CODES.INSUFFICIENT_EVIDENCE) === -1) _arrPush(cannotConclude, CODES.INSUFFICIENT_EVIDENCE);
      }
      if (rejectedCount > 0) {
        if (_arrIndexOf(cannotConclude, CODES.CANNOT_CONCLUDE) === -1) _arrPush(cannotConclude, CODES.CANNOT_CONCLUDE);
      }
      _arrSort(limitations, _strcmp);
      _arrSort(cannotConclude, _strcmp);
      if (limitations.length > LIMITATIONS_CAP) limitations = _arrSliceN(limitations, LIMITATIONS_CAP);
      if (cannotConclude.length > CANNOT_CONCLUDE_CAP) cannotConclude = _arrSliceN(cannotConclude, CANNOT_CONCLUDE_CAP);

      // Step 16 — derive graphId (content-only; clock-independent). Round 2 RN-03 closure: include
      // confidence.state so two same-nodeId candidates differing only by unresolved/not_computed
      // are distinguishable by graphId (and dedup outcome).
      var idPayload = {
        caseAssociation: caseAssociation,
        nodes: _safeMap(nodesOut, function (n) {
          return {
            nodeId: n.nodeId,
            category: n.category,
            credibility: n.credibility,
            provenance: n.provenance,
            availability: n.availability,
            confidence: { state: (n.confidence && n.confidence.state) ? n.confidence.state : null },
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
        correlationGroups: _safeMap(correlationGroups, function (g) { return { correlationGroupId: g.correlationGroupId, memberNodeIds: g.memberNodeIds, independenceWeight: g.independenceWeight }; }),
      };
      var graphId = 'graph_' + _hash64('graphid|v' + GRAPH_SCHEMA_VERSION + '|' + _stableStringify(idPayload));

      // Step 17 — RN-09 + Round 8 RN-18 closure: belt-and-suspenders post-canonical byte cap.
      // Uses _stableStringify (no toJSON callback; descriptor-safe) — same canonical-bytes
      // measurement as Step 11.5, so an attacker cannot use a stateful Object.prototype.toJSON to
      // make Step 11.5 pass while Step 17 rejects (or vice versa). Now structurally redundant with
      // Step 11.5 because both measure the same content via the same serialiser, but retained as
      // a defensive check in case any future refactor changes Step 14's sort/freeze to alter byte
      // count (which would be a serious determinism regression).
      var envBytes;
      try { envBytes = _utf8len(_stableStringify(idPayload)); }
      catch (e) { envBytes = Infinity; }
      if (envBytes > ENVELOPE_BYTE_CAP) {
        return RC.buildBlockedResult([CODES.BYTE_CAP_EXCEEDED], { detail: 'post-sanitization JSON size ' + envBytes + ' exceeds ENVELOPE_BYTE_CAP=' + ENVELOPE_BYTE_CAP });
      }

      // Step 17.5 — Round 2 RN-01 + RN-06 closure: invoke clock LAST, after every input-touching
      // operation has completed. The clock injector cannot mutate rawEvidence under us because
      // the per-node loop has already finished.
      var createdAt = _resolveClock(optsIn);

      // Step 17.6 — Codex D2 Round 10 RN-21..RN-25 closure: re-check intrinsic integrity AFTER
      // the clock fires. A hostile clock callback can rebind globals (Object.freeze,
      // Function.prototype.call, etc.) during its execution. If the post-clock state has been
      // tampered, fail-closed BEFORE _materializeGraph runs WITHOUT going through
      // RC.buildBlockedResult — the contract module's internal _normCodes / Array.prototype.push /
      // Array.prototype.forEach calls are themselves vulnerable to the same rebinding (a no-op
      // .push would silently empty the reasonCodes array). Construct the BLOCK envelope directly
      // using captured intrinsics so the result envelope is byte-identical to what the contract
      // would have produced under intact intrinsics.
      if (!_intrinsicsIntact()) {
        return _buildIntrinsicTamperBlock('intrinsic-tampering detected post-clock: a captured global primitive method has been rebound during clock invocation');
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

      // Codex D-GATE-01 closure: register the fully-validated + deep-frozen graph as
      // D2-authoritative. Blocked / partial results never reach this line.
      _registerAuthoritativeGraph(graph);

      return HI.deepFreeze({ valid: true, graph: graph });
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
    PARAM_KEY_BYTE_CAP: PARAM_KEY_BYTE_CAP,
    ENVELOPE_BYTE_CAP: ENVELOPE_BYTE_CAP,
    IMPORTED_SUMMARY_SOURCE_ID: IMPORTED_SUMMARY_SOURCE_ID,
    IMPORTED_SUMMARY_MAX_CREDIBILITY: IMPORTED_SUMMARY_MAX_CREDIBILITY,
    buildEvidenceGraph: buildEvidenceGraph,
    // Codex D-GATE-01 closure: narrow producer-attestation verifier for D3 (and any future
    // consumer) to verify a D2 graph snapshot identity. WeakSet-based; identity-only;
    // never throws; never reveals the registry.
    verifyAuthoritativeGraph: verifyAuthoritativeGraph,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0D_EvidenceGraph = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
