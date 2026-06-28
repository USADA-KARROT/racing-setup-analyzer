/**
 * tests/r3-0c-comparison-workspace.test.js — R3.0C C7 Comparison Workspace tests.
 *
 * Covers:
 *   - framing-i18n-key-registry contract (closed allowlist + validateFramingEntry adversarial)
 *   - viewmodel-state-transition contract (closed-allowlist triggers + token discipline)
 *   - orchestrator service (capability gate + token monotonicity + framing enforcement + phase
 *     gate + case binding + export gate)
 *   - viewmodel service (7 transition triggers clear+placeholder, stale-token drop,
 *     latest-token commit, phase metricAvailability forced false)
 *   - adversarial: free-form prose injection, unregistered i18nKey, oversized strings, nested
 *     array params, Date in params, Proxy in params, oversized cannotDistinguish array,
 *     phase metric request without capability, cross-case + cross-session refusal,
 *     stale token after fresh dropped
 */
'use strict';
const Contracts = require('../contracts/r3.0c/index.js');
const FIR = Contracts.framingI18nKeyRegistry;
const VST = Contracts.viewmodelStateTransition;
const CODES = Contracts.reasonCodes.REASON_CODES;
const CE = Contracts.comparisonEligibility;
const DMC = Contracts.deltaMetrics;
const OrchService = require('../renderer/js/r3-0c-comparison-orchestrator.js');
const VMService = require('../renderer/js/r3-0c-comparison-viewmodel.js');
const DeltaMetricsService = require('../renderer/js/r3-0c-delta-metrics.js');
const ExportService = require('../renderer/js/r3-0c-comparison-export.js');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const hasCode = (r, c) => !!(r && Array.isArray(r.reasonCodes) && r.reasonCodes.indexOf(c) !== -1);

const allCapsOn = { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
const capsWithPhase = Object.assign({}, allCapsOn, { phaseBoundaryContractEnabled: true });

// ─────────────────────────────────────────────────────────────────────────────
// A. Framing i18n key registry
chk('A1 FRAMING_I18N_KEY_REGISTRY frozen + non-empty', Object.isFrozen(FIR.FRAMING_I18N_KEY_REGISTRY) && FIR.FRAMING_I18N_KEY_REGISTRY.length > 0);
chk('A2 includes cannot_distinguish base key', FIR.FRAMING_I18N_KEY_REGISTRY.indexOf('r3_0c.framing.cannot_distinguish') !== -1);
chk('A3 includes observed_delta.faster_overall', FIR.FRAMING_I18N_KEY_REGISTRY.indexOf('r3_0c.framing.observed_delta.faster_overall') !== -1);
chk('A4 isRegisteredFramingI18nKey accepts registered', FIR.isRegisteredFramingI18nKey('r3_0c.framing.cannot_distinguish') === true);
chk('A5 isRegisteredFramingI18nKey rejects unregistered', FIR.isRegisteredFramingI18nKey('r3_0c.framing.totally_made_up') === false);
chk('A6 isRegisteredFramingI18nKey rejects non-string', FIR.isRegisteredFramingI18nKey(42) === false);
chk('A7 cannotDistinguishFallback returns valid entry', FIR.validateFramingEntry(FIR.cannotDistinguishFallback()).valid === true);

// B. validateFramingEntry adversarial
(() => {
  // valid: minimal
  const ok1 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' });
  chk('B1 minimal valid', ok1.valid === true);
  // valid: with params
  const ok2 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123, channel: 'speed', flag: true, none: null } });
  chk('B2 with valid params', ok2.valid === true);
  // invalid: unknown reasonCode
  chk('B3 unknown reasonCode → invalid', FIR.validateFramingEntry({ reasonCode: 'NOT_REAL', i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === false);
  // invalid: unregistered i18nKey
  chk('B4 unregistered i18nKey → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil' }).valid === false);
  // invalid: extra own-key
  chk('B5 extra own-key → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', secret: 'x' }).valid === false);
  // invalid: free-form prose (string instead of object)
  chk('B6 free-form string → invalid', FIR.validateFramingEntry('driver was late on brakes').valid === false);
  // invalid: params with array value
  chk('B7 params with array → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { arr: [1, 2] } }).valid === false);
  // invalid: params with Date
  chk('B8 params with Date → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { when: new Date() } }).valid === false);
  // invalid: params with NaN
  chk('B9 params with NaN → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { x: NaN } }).valid === false);
  // invalid: params with oversized string
  chk('B10 params with oversized string → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: { s: 'x'.repeat(300) } }).valid === false);
  // invalid: params as null sentinel (round-3 F12 rule — must be plain object when supplied)
  chk('B11 params:null → invalid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: null }).valid === false);

  // Codex C7-R2-C-01 closure: tri-state ABSENT / VALUE / THREW + accessor descriptor rejection.
  // The previous _safeGet swallowed throws into `undefined`, which the params branch treated as
  // "optional field absent" — letting a Proxy / accessor getter slip through. Each test below
  // probes one channel the directive enumerates.
  (() => {
    const validBase = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };

    // B12 ABSENT: genuinely absent optional params → accept (regression guard).
    chk('B12 absent params → valid', FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' }).valid === true);

    // B13 THREW: getter on `params` throws → reject (the primary regression Codex flagged).
    const e13 = Object.assign({}, validBase);
    Object.defineProperty(e13, 'params', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B13 params getter throws → invalid', FIR.validateFramingEntry(e13).valid === false);

    // B14 THREW: getter on `reasonCode` throws → reject.
    const e14 = { i18nKey: 'r3_0c.framing.cannot_distinguish' };
    Object.defineProperty(e14, 'reasonCode', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B14 reasonCode getter throws → invalid', FIR.validateFramingEntry(e14).valid === false);

    // B15 THREW: getter on `i18nKey` throws → reject.
    const e15 = { reasonCode: CODES.CANNOT_DISTINGUISH };
    Object.defineProperty(e15, 'i18nKey', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B15 i18nKey getter throws → invalid', FIR.validateFramingEntry(e15).valid === false);

    // B16 accessor returning a benign value is still rejected. Plain data is the contract.
    const e16 = Object.assign({}, validBase);
    Object.defineProperty(e16, 'params', { enumerable: true, configurable: true, get() { return { ms: 1 }; } });
    chk('B16 params accessor (no throw, benign value) → invalid', FIR.validateFramingEntry(e16).valid === false);

    // B17 inherited getter: define on prototype, not own → entry's own getOwnPropertyDescriptor
    // returns undefined → treated as ABSENT for optional `params` → accept (the entry is
    // structurally plain at the own-property level; inheritance via Object.prototype is the only
    // chain accepted by _isPlain).
    const inheritedProto = Object.create(Object.prototype);
    Object.defineProperty(inheritedProto, 'params', { enumerable: true, configurable: true, get() { return { ms: 1 }; } });
    // Note: setting __proto__ to inheritedProto means _isPlain would reject (proto !== Object.prototype).
    // The realistic threat is a plain entry that someone tried to mutate to gain a getter — already
    // covered by B13/B16. Document the chain via comment only.

    // B18 Proxy on the entry itself with throwing get trap on ownKeys-listed key.
    const target = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };
    const proxy18 = new Proxy(target, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'params') return { enumerable: true, configurable: true, get() { throw new Error('proxy-boom'); } };
        return Object.getOwnPropertyDescriptor(t, k);
      },
      ownKeys() { return ['reasonCode', 'i18nKey', 'params']; },
    });
    chk('B18 Proxy advertises params via accessor descriptor → invalid', FIR.validateFramingEntry(proxy18).valid === false);

    // B19 Proxy with throwing ownKeys trap → invalid (already covered by Round 1 B1; regression
    // guard at this layer).
    const proxy19 = new Proxy({}, { ownKeys() { throw new Error('boom'); } });
    chk('B19 Proxy ownKeys throws → invalid', FIR.validateFramingEntry(proxy19).valid === false);

    // B20 inner-param getter: params is a plain object whose key has an accessor descriptor →
    // inner _readOwn must also reject. The previous validator used plain o[k] in the inner loop;
    // for a getter that throws, the outer try/catch would still catch — but a getter that returns
    // a benign value would have slipped silently into the accepted path.
    const e20 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: {} };
    Object.defineProperty(e20.params, 'ms', { enumerable: true, configurable: true, get() { return 42; } });
    chk('B20 inner params value via accessor → invalid', FIR.validateFramingEntry(e20).valid === false);

    // B21 inner-param getter that throws.
    const e21 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: {} };
    Object.defineProperty(e21.params, 'ms', { enumerable: true, configurable: true, get() { throw new Error('boom'); } });
    chk('B21 inner params value getter throws → invalid', FIR.validateFramingEntry(e21).valid === false);

    // B22 non-enumerable own key on entry (Reflect.ownKeys still surfaces it; ALLOWED check rejects).
    const e22 = Object.assign({}, validBase);
    Object.defineProperty(e22, 'secret', { enumerable: false, configurable: true, value: 'x' });
    chk('B22 non-enumerable extra own-key → invalid', FIR.validateFramingEntry(e22).valid === false);

    // B23 Symbol-keyed entry (Reflect.ownKeys surfaces Symbols; non-string check rejects).
    const e23 = Object.assign({}, validBase);
    e23[Symbol.for('r3.0c.attack')] = 'x';
    chk('B23 Symbol-keyed extra → invalid', FIR.validateFramingEntry(e23).valid === false);

    // B24 ABSENT vs explicit-undefined sanity: an entry with params explicitly set to undefined
    // (data descriptor with value undefined) should still be accepted as "absent semantics" so
    // existing orchestrator output (`params: v.params ? ... : undefined`) keeps working.
    const e24 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: undefined };
    chk('B24 params explicit-undefined → valid (back-compat)', FIR.validateFramingEntry(e24).valid === true);

    // Codex C7-R3-C-01 closure: Proxy descriptor TOCTOU. A Proxy can lie via
    // getOwnPropertyDescriptor (returning a benign data descriptor while the real get-trap
    // throws or returns side-effecting values). The validator must (a) detect this via a
    // sanitized snapshot return contract that callers consume INSTEAD of the raw entry, OR
    // (b) reject the entry outright. Both stances are tested.
    const target25 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish' };
    Object.defineProperty(target25, 'params', {
      configurable: true,
      enumerable: true,
      get() { throw new Error('ACCESSOR EXECUTED ON GET'); },
    });
    const attack25 = new Proxy(target25, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'params') return { configurable: true, enumerable: true, writable: true, value: undefined };
        return Reflect.getOwnPropertyDescriptor(t, k);
      },
    });
    const res25 = FIR.validateFramingEntry(attack25);
    // Either the validator rejects (sufficient) OR the sanitized snapshot is the safe
    // surface and re-reading the raw entry would still throw — in which case downstream
    // consumers must use sanitized. We require sanitized to be present AND to be free of
    // the accessor side-effect.
    chk('B25 Proxy lying getOwnPropertyDescriptor + accessor get → sanitized snapshot is the only safe surface', (() => {
      if (res25.valid !== true) return true; // reject is acceptable
      if (!res25.sanitized) return false; // valid without sanitized is unsafe
      // sanitized must NOT have params (the get-trap throws on the real entry)
      try { var p = res25.sanitized.params; return p === undefined; } catch (_) { return false; }
    })());

    // B26 Sanitized snapshot is frozen — caller cannot mutate it back to an unsafe shape.
    const ok26 = FIR.validateFramingEntry({ reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: -123 } });
    chk('B26 valid result carries a sanitized snapshot', ok26.valid === true && ok26.sanitized && typeof ok26.sanitized === 'object');
    chk('B26b sanitized snapshot is frozen', ok26.sanitized && Object.isFrozen(ok26.sanitized));
    chk('B26c sanitized.params is frozen', ok26.sanitized && ok26.sanitized.params && Object.isFrozen(ok26.sanitized.params));
    chk('B26d sanitized values equal validated descriptor values', ok26.sanitized.reasonCode === CODES.CANNOT_DISTINGUISH && ok26.sanitized.i18nKey === 'r3_0c.framing.observed_delta.faster_overall' && ok26.sanitized.params.ms === -123);

    // B27 Inner params Proxy descriptor TOCTOU.
    const innerTarget27 = {};
    Object.defineProperty(innerTarget27, 'ms', { configurable: true, enumerable: true, get() { throw new Error('INNER ACCESSOR'); } });
    const innerAttack27 = new Proxy(innerTarget27, {
      getOwnPropertyDescriptor(t, k) {
        if (k === 'ms') return { configurable: true, enumerable: true, writable: true, value: 999 };
        return Reflect.getOwnPropertyDescriptor(t, k);
      },
    });
    const e27 = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.cannot_distinguish', params: innerAttack27 };
    const res27 = FIR.validateFramingEntry(e27);
    chk('B27 inner params Proxy lying descriptor → sanitized snapshot captures only validated value (or reject)', (() => {
      if (res27.valid !== true) return true; // reject is acceptable
      if (!res27.sanitized) return false;
      try { var ms = res27.sanitized.params && res27.sanitized.params.ms; return ms === 999 || ms === undefined; } catch (_) { return false; }
    })());
  })();
})();

// ─────────────────────────────────────────────────────────────────────────────
// C. Viewmodel state-transition contract
chk('C1 TRANSITION_TRIGGERS frozen + 7 entries', Object.isFrozen(VST.TRANSITION_TRIGGERS) && VST.TRANSITION_TRIGGERS.length === 7);
chk('C2 PLACEHOLDER_STATES frozen', Object.isFrozen(VST.PLACEHOLDER_STATES));
chk('C3 TOKEN_INVARIANTS frozen', Object.isFrozen(VST.TOKEN_INVARIANTS));
chk('C4 isTransitionTrigger accepts known', VST.isTransitionTrigger('reference_selection_changed') === true);
chk('C5 isTransitionTrigger rejects unknown', VST.isTransitionTrigger('arbitrary_trigger') === false);
chk('C6 isPlaceholderState accepts known', VST.isPlaceholderState(VST.PLACEHOLDER_STATES.SELECTING) === true);
chk('C7 isPlaceholderState rejects unknown', VST.isPlaceholderState('arbitrary_placeholder') === false);
chk('C8 validateGenerationToken accepts monotonic', VST.validateGenerationToken(5, 4).valid === true);
chk('C9 validateGenerationToken rejects equal', VST.validateGenerationToken(5, 5).valid === false);
chk('C10 validateGenerationToken rejects reverse', VST.validateGenerationToken(3, 5).valid === false);
chk('C11 validateGenerationToken rejects zero', VST.validateGenerationToken(0).valid === false);
chk('C12 validateGenerationToken rejects NaN', VST.validateGenerationToken(NaN).valid === false);
chk('C13 isResultStale true on mismatch', VST.isResultStale(3, 5) === true);
chk('C14 isResultStale false on match', VST.isResultStale(5, 5) === false);
chk('C15 placeholderForTrigger reference → SELECTING', VST.placeholderForTrigger('reference_selection_changed') === VST.PLACEHOLDER_STATES.SELECTING);
chk('C16 placeholderForTrigger case_reopen → IDLE', VST.placeholderForTrigger('case_reopen') === VST.PLACEHOLDER_STATES.IDLE);
chk('C17 placeholderForTrigger eligibility_revoked → BLOCKED', VST.placeholderForTrigger('orchestrator_eligibility_revoked') === VST.PLACEHOLDER_STATES.BLOCKED);
chk('C18 placeholderForTrigger unknown → BLOCKED (fail-closed)', VST.placeholderForTrigger('unknown_trigger') === VST.PLACEHOLDER_STATES.BLOCKED);

// ─────────────────────────────────────────────────────────────────────────────
// D. Orchestrator — capability gate
(() => {
  const orch1 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: false, framingSourceStructuredContractEnabled: true } });
  const r1 = orch1.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
  chk('D1 viewmodel contract disabled → blocked', r1.status === 'blocked');
  const orch2 = OrchService.createOrchestrator({ capabilities: { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: false } });
  const r2 = orch2.requestComparison({ caseRecord: {}, association: {}, eligibilityInput: {}, deltaMetricsRequest: {} });
  chk('D2 framing contract disabled → blocked', r2.status === 'blocked');
})();
// E. Orchestrator — token monotonicity
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const t0 = orch.currentToken();
  const r1 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  const r2 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  const r3 = orch.requestComparison({ caseRecord: null, association: null, eligibilityInput: null, deltaMetricsRequest: null });
  chk('E1 token increments on every request', r1.generationToken === t0 + 1 && r2.generationToken === t0 + 2 && r3.generationToken === t0 + 3);
  chk('E2 currentToken matches last issued', orch.currentToken() === t0 + 3);
})();

// F. Orchestrator — full eligible path (drives real C5)
function caseRecord() { return { caseId: 'case_A', associations: { trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } }; }
// Codex C7-R2-A-01 closure: the orchestrator no longer exposes registerAuthenticCaseRecord; the
// authoritative authenticityPredicate is injected at construction. A test-side WeakSet stands in
// for the production R3.0B case-store boundary — production wiring (in renderer/index.html
// app().init()) supplies a predicate backed by its own renderer-private WeakSet that is
// populated only via the case-store-open path. The viewmodel cannot reach either WeakSet, so a
// caller routing a forged caseRecord through setAssociation reaches the orchestrator and is
// refused by the predicate.
const TEST_AUTH_SET = new WeakSet();
function authOrch(caps) {
  return OrchService.createOrchestrator({ capabilities: caps, authenticityPredicate: function (cr) { return TEST_AUTH_SET.has(cr); } });
}
function regCase(_orch, cr) { TEST_AUTH_SET.add(cr); return cr; }
function association() { return { caseId: 'case_A', sessionId: 'sess_1', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing', analysisCaseId: 'case_A', credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] } }; }
function eligibilityInput() {
  return {
    analysisCaseId: 'case_A',
    reference: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_3', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
    comparison: { identity: { analysisCaseId: 'case_A', sessionId: 'sess_1', lapId: 'lap_5', trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' }, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } },
    credibilityMetadata: { credibility: 'Heuristic', provenance: 'real', confidence: 'low', limitations: [], blockedReasons: [] },
  };
}
function deltaMetricsRequest() {
  return {
    identity: { caseId: 'case_A', sessionId: 'sess_1' },
    referenceLap: { lapTimeMs: 90000 },
    comparisonLap: { lapTimeMs: 89500 },
    pairing: { pairs: [
      { referenceCorner: { id: 'C1', fullTimeMs: 10000, entryTimeMs: 3000, midTimeMs: 4000, exitTimeMs: 3000 }, comparisonCorner: { id: 'C1', fullTimeMs: 9900, entryTimeMs: 2950, midTimeMs: 4000, exitTimeMs: 2950 } },
    ] },
    requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'],
    policy: { deltaSign: 'comparison_minus_reference' },
  };
}
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('F1 eligible end-to-end', r.status === 'eligible');
  chk('F2 framing is structured (not prose)', r.framing && typeof r.framing.observedDelta === 'object');
  chk('F3 framing.observedDelta.faster_overall', r.framing.observedDelta && r.framing.observedDelta.i18nKey === 'r3_0c.framing.observed_delta.faster_overall');
  chk('F4 framing.cannotDistinguish is array', Array.isArray(r.framing.cannotDistinguish));
  chk('F5 exportGate true when identity matches', r.exportGate === true);
})();
// G. Orchestrator — case binding mismatch
(() => {
  const orch = authOrch(allCapsOn);
  const caseRec = { caseId: 'case_A', associations: { trackId: 'imola', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
  regCase(orch, caseRec);
  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('G1 case associations trackId mismatch → blocked', r.status === 'blocked' && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
})();
// G2. Codex C7-R2-A-01: orchestrator constructed with proper authenticityPredicate but caller
// supplies a freshly-built caseRecord NOT in the authoritative set → blocked at authenticity gate.
// This proves the predicate is the only authority check; no registration helper is reachable.
(() => {
  const orch = authOrch(allCapsOn);
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('G2 caller-forged caseRecord (not in auth set) → blocked', r.status === 'blocked' && hasCode(r, CODES.INTERNAL_CONTRACT_VIOLATION));
})();
// G3. Codex C7-R2-A-01: the previous candidate had viewmodel.setAssociation auto-register the
// caller-supplied caseRecord via a public orchestrator API — a literal-built forged record
// passed end-to-end. This test drives the FULL setAssociation → requestComparison escalation
// path against an orchestrator constructed with an authenticityPredicate that ONLY trusts the
// pre-registered record. The forged record is constructed locally and NEVER touched by any
// helper — there is no public registration API to abuse. setAssociation must NOT bestow
// authority. The eligible-path result rendered by the viewmodel must remain blocked /
// not-ready, NOT ready.
(() => {
  const orch = authOrch(allCapsOn);
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  const forgedRecord = { caseId: 'case_A', associations: { trackId: 'silverstone', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
  // ABSOLUTELY DO NOT call regCase(orch, forgedRecord) — the threat model is exactly the absence
  // of any caller-reachable registration helper.
  const assoc = Object.assign({}, association(), { caseRecord: forgedRecord });
  vm.setAssociation(assoc);
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const s = vm.getState();
  chk('G3 setAssociation cannot bestow authority — forged escalation blocked at viewmodel state', s.placeholder !== VST.PLACEHOLDER_STATES.READY && s.result === null && s.exportGate === false);
  chk('G3b orchestrator public API does NOT expose registerAuthenticCaseRecord', typeof orch.registerAuthenticCaseRecord === 'undefined');
  chk('G3c orchestrator public API does NOT expose isAuthenticCaseRecord', typeof orch.isAuthenticCaseRecord === 'undefined');
})();
// G4. Codex C7-R5-01: orchestrator.exportComparison MUST NOT let a hostile accessor on caller-
// supplied eligibleResponse escape the boundary. The previous candidate did `o.framing` plain
// reads, so a Proxy / Object.defineProperty getter that throws on 'framing' threw out of
// exportComparison instead of returning a structured blocked result.
(() => {
  const orch = authOrch(allCapsOn);
  // hostile eligibleResponse — minimal shape pretending to be an orchestrator output.
  const hostile = { status: 'eligible', exportGate: true, result: {}, generationToken: 1 };
  Object.defineProperty(hostile, 'framing', { configurable: true, enumerable: true, get() { throw new Error('framing accessor fired'); } });
  let threw = false; let out = null;
  try { out = orch.exportComparison(hostile, {}); } catch (e) { threw = true; }
  chk('G4 exportComparison does NOT throw on hostile framing accessor', threw === false);
  chk('G4b exportComparison returns structured blocked on hostile input', out && out.eligible === false && out.status === 'blocked');
  // also exercise extraInputs hostile getter
  const hostile2 = { status: 'eligible', exportGate: true, result: {}, generationToken: 1, framing: { cannotDistinguish: [], nextValidationAction: null } };
  const hostileExtras = {};
  Object.defineProperty(hostileExtras, 'association', { configurable: true, enumerable: true, get() { throw new Error('association accessor fired'); } });
  let threw2 = false; let out2 = null;
  try { out2 = orch.exportComparison(hostile2, hostileExtras); } catch (e) { threw2 = true; }
  chk('G4c exportComparison does NOT throw on hostile extraInputs accessor', threw2 === false);
  chk('G4d exportComparison handles hostile extras as null (no crash)', out2 !== null);
})();
// G5. Codex C7-R6-01 closure: every viewmodel public mutator must NOT throw on hostile
// caller-supplied selections. _isPlain alone is not enough — a Proxy with Object.prototype
// getPrototypeOf but a throwing ownKeys trap passes _isPlain and then explodes inside
// Object.assign({}, sel). Each mutator now uses _safeShallowCopy (which catches Object.assign
// throws and yields null), so a hostile slot is silently coerced to null. The outer try/catch
// is an additional defence against any residual throw past _safeShallowCopy. After the
// hostile-input transition the result is: (a) NO throw escapes, (b) the slot is null, (c)
// _runRequest sees an incomplete selection set and parks the viewmodel at SELECTING (or BLOCKED
// if the outer try/catch fired), (d) NEVER READY, (e) exportGate stays false, (f) result=null.
(() => {
  const orch = authOrch(allCapsOn);
  const hostile = new Proxy({}, {
    getPrototypeOf() { return Object.prototype; },
    ownKeys() { throw new Error('ownKeys trap'); },
  });
  const slotName = { setReference: 'reference', setComparison: 'comparison', setAssociation: 'association', setChannelMapping: 'channelMapping' };
  ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping'].forEach((trigger, i) => {
    const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
    let threw = false;
    try { vm[trigger](hostile); } catch (e) { threw = true; }
    chk('G5.' + (i + 1) + ' viewmodel.' + trigger + ' does NOT throw on hostile Proxy ownKeys trap', threw === false);
    const s = vm.getState();
    chk('G5.' + (i + 1) + 'b viewmodel.' + trigger + ' never reaches READY on hostile input', s.placeholder !== VST.PLACEHOLDER_STATES.READY);
    // channelMapping is internal to _state and intentionally NOT exposed via getState; for the
    // other three slots a `!s[slot]` check covers both `null` and `undefined` (unexposed).
    chk('G5.' + (i + 1) + 'c viewmodel.' + trigger + ' hostile slot coerced to null/undefined', !s[slotName[trigger]]);
    chk('G5.' + (i + 1) + 'd viewmodel.' + trigger + ' result=null, exportGate=false', s.result === null && s.exportGate === false);
  });
  // notifyCaseReopen / notifyAuthorityRevoked / notifyEligibilityRevoked don't accept caller
  // objects, but their body is still try/catch-wrapped against any internal throw.
  ['notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'].forEach((trigger, i) => {
    const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
    let threw = false;
    try { vm[trigger](); } catch (e) { threw = true; }
    chk('G5.no' + (i + 1) + ' viewmodel.' + trigger + '() does NOT throw', threw === false);
  });
})();
// H. Orchestrator — phase metric requested without capability → filtered out + limitation
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const dm = deltaMetricsRequest();
  dm.requestedMetrics = ['lap_time', 'delta_cumulative', 'entry_delta'];
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
  chk('H1 phase metric without capability → still eligible (filtered)', r.status === 'eligible');
  chk('H2 limitations include PHASE_BOUNDARY_CONTRACT_UNAUTHORISED', r.limitations.indexOf(CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED) !== -1);
  chk('H3 framing.cannotDistinguish names phase_metric_unauthorised', r.framing.cannotDistinguish.some(e => e.i18nKey === 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised'));
})();
// I. Orchestrator — caller smuggled prose framing → fall back to validated/fallback
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
  chk('I1 caller-smuggled prose dropped (observedDelta is structured)', r.status === 'eligible' && typeof r.framing.observedDelta === 'object' && r.framing.observedDelta.i18nKey !== undefined);
})();
// J. Orchestrator — caller-smuggled unregistered i18nKey → dropped
(() => {
  const orch = authOrch(allCapsOn);
  const cr = caseRecord(); regCase(orch, cr);
  const r = orch.requestComparison({ caseRecord: cr, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
  chk('J1 unregistered i18nKey in nextValidationAction → not committed', r.framing.nextValidationAction === null);
})();

// ─────────────────────────────────────────────────────────────────────────────
// K. Viewmodel — capability gate
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  let threw = false;
  try { VMService.createComparisonViewModel({ orchestrator: orch, capabilities: { viewmodelStateTransitionContractEnabled: false } }); }
  catch (e) { threw = true; }
  chk('K1 viewmodel refuses when capability disabled', threw);
})();
// L. Viewmodel — initial state
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  const s = vm.getState();
  chk('L1 initial placeholder=IDLE', s.placeholder === VST.PLACEHOLDER_STATES.IDLE);
  chk('L2 initial result null', s.result === null);
  chk('L3 initial exportGate false', s.exportGate === false);
  chk('L4 latestToken 0', s.latestToken === 0);
})();
// M. Viewmodel — 7 transition triggers each clear+placeholder
const allTriggers = ['setReference', 'setComparison', 'setAssociation', 'setChannelMapping', 'notifyCaseReopen', 'notifyAuthorityRevoked', 'notifyEligibilityRevoked'];
allTriggers.forEach((triggerFn, i) => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  // pre-populate so we can confirm clear
  vm.setAssociation(association());
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const beforeState = vm.getState();
  // fire the trigger:
  if (triggerFn === 'setReference') vm.setReference({ lapId: 'lap_new', lapTimeMs: 91000 });
  else if (triggerFn === 'setComparison') vm.setComparison({ lapId: 'lap_new2', lapTimeMs: 91000 });
  else if (triggerFn === 'setAssociation') vm.setAssociation(association());
  else if (triggerFn === 'setChannelMapping') vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  else if (triggerFn === 'notifyCaseReopen') vm.notifyCaseReopen();
  else if (triggerFn === 'notifyAuthorityRevoked') vm.notifyAuthorityRevoked();
  else if (triggerFn === 'notifyEligibilityRevoked') vm.notifyEligibilityRevoked();
  const afterState = vm.getState();
  const cleared = afterState.placeholder !== beforeState.placeholder || afterState.result === null;
  chk('M' + (i + 1) + ' trigger ' + triggerFn + ' resets placeholder/result', cleared);
});

// N. Viewmodel — phase metricAvailability forced false
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const vm = VMService.createComparisonViewModel({ orchestrator: orch, capabilities: allCapsOn });
  vm.setAssociation(association());
  vm.setChannelMapping({ pairing: deltaMetricsRequest().pairing });
  vm.setReference({ lapId: 'lap_3', lapTimeMs: 90000, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  vm.setComparison({ lapId: 'lap_5', lapTimeMs: 89500, lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } }, normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' } });
  const s = vm.getState();
  chk('N1 metricAvailability.entry_delta = false (phase gate)', s.metricAvailability.entry_delta === false);
  chk('N2 metricAvailability.mid_delta = false (phase gate)', s.metricAvailability.mid_delta === false);
  chk('N3 metricAvailability.exit_delta = false (phase gate)', s.metricAvailability.exit_delta === false);
})();

console.log('r3-0c-comparison-workspace: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
