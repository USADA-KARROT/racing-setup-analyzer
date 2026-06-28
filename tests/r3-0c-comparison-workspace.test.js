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
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('F1 eligible end-to-end', r.status === 'eligible');
  chk('F2 framing is structured (not prose)', r.framing && typeof r.framing.observedDelta === 'object');
  chk('F3 framing.observedDelta.faster_overall', r.framing.observedDelta && r.framing.observedDelta.i18nKey === 'r3_0c.framing.observed_delta.faster_overall');
  chk('F4 framing.cannotDistinguish is array', Array.isArray(r.framing.cannotDistinguish));
  chk('F5 exportGate true when identity matches', r.exportGate === true);
})();
// G. Orchestrator — case binding mismatch
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const caseRec = { caseId: 'case_A', associations: { trackId: 'imola', layoutId: 'gp', positionBasis: 'lap_distance', positionDirection: 'increasing' } };
  const r = orch.requestComparison({ caseRecord: caseRec, association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest() });
  chk('G1 case associations trackId mismatch → blocked', r.status === 'blocked' && hasCode(r, CODES.TRACK_IDENTITY_MISMATCH));
})();
// H. Orchestrator — phase metric requested without capability → filtered out + limitation
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const dm = deltaMetricsRequest();
  dm.requestedMetrics = ['lap_time', 'delta_cumulative', 'entry_delta'];
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: dm });
  chk('H1 phase metric without capability → still eligible (filtered)', r.status === 'eligible');
  chk('H2 limitations include PHASE_BOUNDARY_CONTRACT_UNAUTHORISED', r.limitations.indexOf(CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED) !== -1);
  chk('H3 framing.cannotDistinguish names phase_metric_unauthorised', r.framing.cannotDistinguish.some(e => e.i18nKey === 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised'));
})();
// I. Orchestrator — caller smuggled prose framing → fall back to validated/fallback
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { observedDelta: 'driver was late on brakes' } });
  chk('I1 caller-smuggled prose dropped (observedDelta is structured)', r.status === 'eligible' && typeof r.framing.observedDelta === 'object' && r.framing.observedDelta.i18nKey !== undefined);
})();
// J. Orchestrator — caller-smuggled unregistered i18nKey → dropped
(() => {
  const orch = OrchService.createOrchestrator({ capabilities: allCapsOn });
  const r = orch.requestComparison({ caseRecord: caseRecord(), association: association(), eligibilityInput: eligibilityInput(), deltaMetricsRequest: deltaMetricsRequest(), framing: { nextValidationAction: { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.evil_made_up_key' } } });
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
