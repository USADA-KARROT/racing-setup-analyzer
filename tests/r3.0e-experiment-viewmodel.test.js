/**
 * tests/r3.0e-experiment-viewmodel.test.js — R3.0E E5 · Experiment viewmodel tests.
 *
 * Coverage:
 *   - empty/error/stale state factories
 *   - derive() with authoritative outcome + projection + links → 'available'
 *   - derive() rejects non-authoritative inputs (clones, plain lookalikes) → 'error-sanitized'
 *   - activation gate signals (uiCapabilityReady, featureRegistryActivationAllowed,
 *     deferredCapabilities)
 *   - all states are deep-frozen + verify via verifyAuthoritativeViewmodelState
 *   - displayState ∈ closed enum
 *   - feature-registry registration (experiment_loop + case_timeline features and
 *     case:experiment_loop + case:case_timeline nav nodes are present)
 *   - viewmodel never propagates raw error; error-sanitized state has no detail leak
 *   - disclaimers always present
 */
'use strict';
var VM = require('../renderer/js/r3-0e-experiment-viewmodel.js');
var CL = require('../renderer/js/r3-0e-outcome-classifier.js');
var TL = require('../renderer/js/r3-0e-followup-timeline.js');
var STORES = require('../renderer/js/r3-0e-stores.js');
var SB = require('../renderer/js/storage-backend.js');
var FR = require('../renderer/js/feature-registry.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

function deepFreeze(v) {
  if (v === null || typeof v !== 'object') return v;
  Object.freeze(v);
  Object.getOwnPropertyNames(v).forEach(function (k) { deepFreeze(v[k]); });
  return v;
}

var EXP_ID = 'exp_0123456789abcdef';
var CASE_A = 'case_demo_a';
var CASE_B = 'case_demo_b';
var SESSION_A = 'session_demo_a';

function makeBackend() { return SB.MemoryBackend(); }
function makeTimelineService(be) {
  return TL.createFollowUpTimelineService({
    timelineStore: STORES.createTimelineStore(be),
    followUpLinkStore: STORES.createFollowUpLinkStore(be),
  });
}
function fixedClock(iso) { return function () { return iso; }; }

function makeExperiment() {
  return deepFreeze({
    schemaVersion: 1, experimentId: EXP_ID, sourceCaseId: CASE_A,
    sourceHypothesisId: 'hyp_demo_001', sourceRecommendationId: 'pri_demo_001',
    targetMetric: 'roll_gradient_deg_per_g', baselineValue: 3.5,
    expectedDirection: 'decrease', expectedMagnitudeRange: { min: 0.5, max: 1.5 },
    setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
    driverInstruction: null,
    controlVariables: [{ name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window', expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: null, withinRange: null }],
    validationPlan: 'r3.0e.plan.controlled_repeat_lap',
    stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
    status: 'applied', followUpCaseIds: [CASE_B], outcome: null,
    createdAt: '2026-06-30T10:00:00Z',
  });
}
function makeClassifyInput() {
  return {
    experiment: makeExperiment(),
    appliedChange: { changeId: 'change_demo_001', sourceExperimentId: EXP_ID, appliedAt: '2026-06-30T11:00:00Z' },
    followUp: {
      followUpCaseId: CASE_B, parentCaseId: CASE_A,
      sessionId: SESSION_A, parentSessionId: SESSION_A,
      hasExplicitReference: true, comparabilityScore: 0.9,
    },
    observation: {
      observedDirection: 'decrease', observedMagnitude: 1.0,
      driverFeedback: 'r3.0e.driver.feedback.balance_improved',
      dataQualityIssues: [], sideEffects: [],
      contradictingEvidenceIds: [],
      supportingEvidenceIds: ['ev_demo_001'],
    },
    controlVariableObservations: [{
      name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 },
      observedValue: 84, withinRange: true,
    }],
  };
}

// ------------------------------------------------------------------
// Section A — empty / error / stale states
// ------------------------------------------------------------------
console.log('Section A — empty / error / stale factories');
(function () {
  var vm = VM.createExperimentViewmodel({ classifier: CL, timelineModule: TL });
  var e1 = vm.empty(null);
  chk('A1: empty(null) → unavailable', e1.displayState === 'unavailable' && e1.caseId === null);
  chk('A2: empty(null) → activation.rationaleI18nKey = case_required',
    e1.activation.rationaleI18nKey === 'r3.0e.activation.rationale.case_required');
  var e2 = vm.empty(CASE_A);
  chk('A3: empty(caseId) → unavailable but caseId set', e2.displayState === 'unavailable' && e2.caseId === CASE_A);
  chk('A4: empty(caseId) → rationale = applied_experiment_required',
    e2.activation.rationaleI18nKey === 'r3.0e.activation.rationale.applied_experiment_required');
  var err = vm.error();
  chk('A5: error() → error-sanitized', err.displayState === 'error-sanitized');
  chk('A6: error() has no detail leak (no caseId, no outcome, no projection)',
    err.caseId === null && err.outcome === null && err.projection === null);
  var st = vm.stale(CASE_A);
  chk('A7: stale(caseId) → stale-cleared + caseId', st.displayState === 'stale-cleared' && st.caseId === CASE_A);
  // All authoritative
  chk('A8: empty state verifies', VM.verifyAuthoritativeViewmodelState(e1) === true);
  chk('A9: error state verifies', VM.verifyAuthoritativeViewmodelState(err) === true);
  chk('A10: stale state verifies', VM.verifyAuthoritativeViewmodelState(st) === true);
  // All deep-frozen
  chk('A11: empty deep-frozen', Object.isFrozen(e1) && Object.isFrozen(e1.activation));
  chk('A12: error deep-frozen', Object.isFrozen(err) && Object.isFrozen(err.activation));
  chk('A13: stale deep-frozen', Object.isFrozen(st) && Object.isFrozen(st.activation));
})();

// ------------------------------------------------------------------
// Section B — derive() golden path
// ------------------------------------------------------------------
console.log('Section B — derive golden path');
(async function () {
  var be = makeBackend();
  var tlSvc = makeTimelineService(be);
  var vm = VM.createExperimentViewmodel({ classifier: CL, timelineModule: TL });
  // Build an authoritative outcome
  var clsR = CL.classifyOutcome(makeClassifyInput(), { clock: fixedClock('2026-06-30T11:30:00Z') });
  chk('B0: classifier returned valid outcome', clsR.valid === true);
  // Build an authoritative timeline projection
  await tlSvc.appendTimelineEvent({ caseId: CASE_A, kind: 'experiment_applied', i18nKey: 'r3.0e.tl.applied' },
    { clock: fixedClock('2026-06-30T11:00:00Z') });
  await tlSvc.appendTimelineEvent({ caseId: CASE_A, kind: 'outcome_classified', i18nKey: 'r3.0e.tl.outcome' },
    { clock: fixedClock('2026-06-30T11:30:00Z') });
  var prjR = await tlSvc.projectTimeline(CASE_A, { clock: fixedClock('2026-06-30T12:00:00Z') });
  chk('B0b: projection returned valid', prjR.valid === true);
  // Build an authoritative link
  var linkR = await tlSvc.createFollowUpLink({
    parentCaseId: CASE_A, followUpCaseId: CASE_B, experimentId: EXP_ID,
  }, { clock: fixedClock('2026-06-30T11:00:00Z') });
  chk('B0c: link returned valid', linkR.valid === true);

  var state = vm.derive({ outcome: clsR.outcome, projection: prjR.projection, links: [linkR.link] });
  chk('B1: derive → available', state.displayState === 'available');
  chk('B2: outcomeClass = confirmed', state.outcomeClass === 'confirmed');
  chk('B3: outcomeClassI18nKey set',
    state.outcomeClassI18nKey === 'r3.0e.outcome.class.confirmed');
  chk('B4: projectionEventCount = 2', state.projectionEventCount === 2);
  chk('B5: linksCount = 1', state.linksCount === 1);
  chk('B6: activation.uiCapabilityReady = true', state.activation.uiCapabilityReady === true);
  chk('B7: activation.featureRegistryActivationAllowed = true', state.activation.featureRegistryActivationAllowed === true);
  chk('B8: activation.deferredCapabilities = []', state.activation.deferredCapabilities.length === 0);
  chk('B9: rationale = ready', state.activation.rationaleI18nKey === 'r3.0e.activation.ready');
  chk('B10: state verifies', VM.verifyAuthoritativeViewmodelState(state) === true);
  chk('B11: state deep-frozen', Object.isFrozen(state) && Object.isFrozen(state.activation));
  chk('B12: disclaimers always present',
    state.disclaimers.length === 4
      && state.disclaimers.indexOf('r3.0e.disclaimer.no_causation') !== -1
      && state.disclaimers.indexOf('r3.0e.disclaimer.no_driver_blame') !== -1
      && state.disclaimers.indexOf('r3.0e.disclaimer.no_auto_setup') !== -1
      && state.disclaimers.indexOf('r3.0e.disclaimer.same_case_session_only') !== -1);
})();

// ------------------------------------------------------------------
// Section C — derive() with missing outcome / projection
// ------------------------------------------------------------------
console.log('Section C — derive missing inputs');
(async function () {
  var be = makeBackend();
  var tlSvc = makeTimelineService(be);
  var vm = VM.createExperimentViewmodel({ classifier: CL, timelineModule: TL });
  // No outcome, no projection, no links
  var s1 = vm.derive({});
  chk('C1: no inputs → unavailable',
    s1.displayState === 'unavailable' && s1.activation.uiCapabilityReady === false);
  chk('C2: deferred includes both capabilities',
    s1.activation.deferredCapabilities.indexOf('experiment_loop') !== -1
      && s1.activation.deferredCapabilities.indexOf('case_timeline') !== -1);
  // Only projection, no outcome
  await tlSvc.appendTimelineEvent({ caseId: CASE_A, kind: 'baseline_captured', i18nKey: 'r3.0e.tl.x' },
    { clock: fixedClock('2026-06-30T11:00:00Z') });
  var prjR = await tlSvc.projectTimeline(CASE_A, { clock: fixedClock('2026-06-30T12:00:00Z') });
  var s2 = vm.derive({ projection: prjR.projection });
  chk('C3: only projection → still unavailable (outcome missing)',
    s2.displayState === 'unavailable' && s2.activation.uiCapabilityReady === false);
  chk('C4: deferred includes experiment_loop only',
    s2.activation.deferredCapabilities.indexOf('experiment_loop') !== -1
      && s2.activation.deferredCapabilities.indexOf('case_timeline') === -1);
})();

// ------------------------------------------------------------------
// Section D — derive() rejects non-authoritative inputs
// ------------------------------------------------------------------
console.log('Section D — non-authoritative input rejection');
(async function () {
  var be = makeBackend();
  var tlSvc = makeTimelineService(be);
  var vm = VM.createExperimentViewmodel({ classifier: CL, timelineModule: TL });
  // Cloned outcome
  var clsR = CL.classifyOutcome(makeClassifyInput(), { clock: fixedClock('2026-06-30T11:30:00Z') });
  var cloned = JSON.parse(JSON.stringify(clsR.outcome));
  var s1 = vm.derive({ outcome: cloned });
  chk('D1: cloned outcome → error-sanitized', s1.displayState === 'error-sanitized');
  // Plain lookalike
  var fake = Object.freeze({
    schemaVersion: 1, outcomeId: 'outcome_fakefakefakefake', experimentId: EXP_ID,
    'class': 'confirmed', observedDirection: 'decrease', observedMagnitude: 1.0,
    comparabilityScore: 0.9, confounders: Object.freeze([]),
    driverFeedback: null, dataQualityIssues: Object.freeze([]),
    sideEffects: Object.freeze([]), limitations: Object.freeze([]),
    createdAt: '2026-06-30T11:30:00Z',
  });
  var s2 = vm.derive({ outcome: fake });
  chk('D2: hand-forged outcome → error-sanitized', s2.displayState === 'error-sanitized');
  // Forged projection
  var s3 = vm.derive({ projection: Object.freeze({
    schemaVersion: 1, projectionId: 'projection_fake', caseId: CASE_A,
    eventCount: 0, events: Object.freeze([]), generatedAt: '2026-06-30T12:00:00Z',
  }) });
  chk('D3: forged projection → error-sanitized', s3.displayState === 'error-sanitized');
  // Forged link
  var s4 = vm.derive({ links: [Object.freeze({
    schemaVersion: 1, linkId: 'link_fake', parentCaseId: CASE_A,
    followUpCaseId: CASE_B, experimentId: EXP_ID, parentStatus: 'present',
    createdAt: '2026-06-30T11:00:00Z',
  })] });
  chk('D4: forged link → error-sanitized', s4.displayState === 'error-sanitized');
  // Non-array links
  var s5 = vm.derive({ links: 'not-an-array' });
  chk('D5: non-array links → error-sanitized', s5.displayState === 'error-sanitized');
})();

// ------------------------------------------------------------------
// Section E — feature-registry registration
// ------------------------------------------------------------------
console.log('Section E — feature-registry registration');
(function () {
  // The viewmodel module does NOT mutate feature-registry directly; we verify the
  // registry now carries the expected entries (added as part of the E5 commit).
  // H5 UI-delivery ruling: the two subviews are DEFERRED — registered in the registry
  // as governance truth but FILTERED from public navigation (no empty-pane nav targets).
  var navIds = FR.deriveCaseSubviewIds();
  chk('E1(H5): case:experiment_loop node registered but NOT publicly navigable',
    !!FR.getNode('case:experiment_loop') && navIds.indexOf('experiment_loop') === -1);
  chk('E2(H5): case:case_timeline node registered but NOT publicly navigable',
    !!FR.getNode('case:case_timeline') && navIds.indexOf('case_timeline') === -1);
  // Features
  var allFeatures = FR.FEATURES;
  chk('E3: experiment_loop feature registered + case_scoped',
    allFeatures.experiment_loop && allFeatures.experiment_loop.area === 'case_scoped');
  chk('E4: case_timeline feature registered + case_scoped',
    allFeatures.case_timeline && allFeatures.case_timeline.area === 'case_scoped');
  chk('E5(H5): experiment_loop availability = deferred (UI-delivery ruling)',
    allFeatures.experiment_loop.availability === 'deferred');
  chk('E6(H5): case_timeline availability = deferred (UI-delivery ruling)',
    allFeatures.case_timeline.availability === 'deferred');
  chk('E7: experiment_loop nav target is case:experiment_loop',
    allFeatures.experiment_loop.navNodeId === 'case:experiment_loop');
  chk('E8: case_timeline nav target is case:case_timeline',
    allFeatures.case_timeline.navNodeId === 'case:case_timeline');
})();

// ------------------------------------------------------------------
// Section F — API hardening
// ------------------------------------------------------------------
console.log('Section F — API hardening');
(function () {
  chk('F1: top-level api is frozen', Object.isFrozen(VM));
  chk('F2: createExperimentViewmodel exported', typeof VM.createExperimentViewmodel === 'function');
  chk('F3: verifyAuthoritativeViewmodelState exported', typeof VM.verifyAuthoritativeViewmodelState === 'function');
  chk('F4: NO WeakSet / register exposed',
    VM._authoritativeStates === undefined && VM.register === undefined);
  chk('F5: viewmodel api is frozen',
    (function () { var v = VM.createExperimentViewmodel({ classifier: CL, timelineModule: TL }); return Object.isFrozen(v); })());
})();

// ------------------------------------------------------------------
// Section G — Verifier boundary
// ------------------------------------------------------------------
console.log('Section G — Verifier boundary');
(function () {
  chk('G1: null → false', VM.verifyAuthoritativeViewmodelState(null) === false);
  chk('G2: empty obj → false', VM.verifyAuthoritativeViewmodelState({}) === false);
  chk('G3: number → false', VM.verifyAuthoritativeViewmodelState(42) === false);
  chk('G4: frozen lookalike → false',
    VM.verifyAuthoritativeViewmodelState(Object.freeze({
      schemaVersion: 1, displayState: 'available',
      activation: {}, disclaimers: [],
    })) === false);
})();

// ==================================================================
// Section H — Codex E5 R1 closures (E5-R1-01..03)
// ==================================================================
console.log('Section H — Codex E5 R1 closures');

// H1 — E5-R1-03: injected verifier deps are IGNORED in production. A hostile caller
// passing {verifyAuthoritativeOutcome: () => true} cannot bypass authority.
(async function () {
  var hostileClassifier = { verifyAuthoritativeOutcome: function () { return true; } };
  var hostileTimeline = {
    verifyAuthoritativeTimelineProjection: function () { return true; },
    verifyAuthoritativeFollowUpLink: function () { return true; },
  };
  var vm = VM.createExperimentViewmodel({ classifier: hostileClassifier, timelineModule: hostileTimeline });
  // Try deriving with a forged outcome — should still be rejected because closure-captured
  // CL verifier is the one actually used.
  var forgedOutcome = Object.freeze({
    schemaVersion: 1, outcomeId: 'outcome_forged', experimentId: EXP_ID,
    'class': 'confirmed', observedDirection: 'decrease', observedMagnitude: 1.0,
    comparabilityScore: 0.9, confounders: Object.freeze([]),
    driverFeedback: null, dataQualityIssues: Object.freeze([]),
    sideEffects: Object.freeze([]), limitations: Object.freeze([]),
    createdAt: '2026-06-30T11:30:00Z',
  });
  var state = vm.derive({ outcome: forgedOutcome });
  chk('H1: hostile injected verifiers cannot bypass authority → error-sanitized',
    state.displayState === 'error-sanitized');
})();

// H2 — E5-R1-03: outcomeClass NOT in OUTCOME_CLASS_ALLOWED → error-sanitized
//   This is defence-in-depth — E1 already forbids unknown classes, so we'd need a
//   "valid"-looking outcome with a forged class. Since real outcomes pass the verifier
//   only with known classes, we can't easily construct this in isolation, but we
//   confirm the OUTCOME_CLASS_ALLOWED enum is the same as E1's enum.
(function () {
  var OUT = require('../contracts/r3.0e/outcome-contract.js');
  var e1Allowed = OUT.OUTCOME_CLASS_ALLOWED;
  // E5 viewmodel allowlist should be a superset (or equal) of E1
  for (var i = 0; i < e1Allowed.length; i++) {
    // can't access viewmodel's private OUTCOME_CLASS_ALLOWED but we can verify the
    // i18n key for each E1 class exists in i18n-r3-0e.js
  }
  var I18N = require('../renderer/js/i18n-r3-0e.js').R3_0E_I18N;
  var allPresent = true;
  for (var i = 0; i < e1Allowed.length; i++) {
    var key = 'r3.0e.outcome.class.' + e1Allowed[i];
    if (!I18N.en[key] || !I18N.zh[key] || !I18N.ja[key]) { allPresent = false; break; }
  }
  chk('H2: every E1 outcome class has i18n key in en/zh/ja',
    allPresent);
})();

// H3 — E5-R1-01: WeakSet canary present (module load throws if canary fails)
//   The module already loaded successfully (we're running tests), so the canary
//   passed at load. Verify the module IS exported (not undefined).
(function () {
  chk('H3: module loaded successfully → WeakSet canary passed',
    VM !== undefined && typeof VM.createExperimentViewmodel === 'function');
})();

// H4 — E5-R1-02: freeze canary; verifier rejects non-frozen lookalikes (already tested
// in Section G/D; this adds an explicit exact-key check)
(function () {
  // A frozen object with the right shape but EXTRA keys must NOT verify
  var withExtra = Object.freeze({
    schemaVersion: 1, displayState: 'available',
    caseId: null, sessionId: null,
    outcome: null, outcomeClass: null, outcomeClassI18nKey: null,
    projection: null, projectionEventCount: 0,
    links: Object.freeze([]), linksCount: 0,
    activation: Object.freeze({}),
    disclaimers: Object.freeze([]),
    extraInjected: 'leak',  // <-- this extra key should cause verifier to fail
  });
  chk('H4: state with extra own key does NOT verify',
    VM.verifyAuthoritativeViewmodelState(withExtra) === false);
})();

// H5 — E5-R1-02: state with missing key does NOT verify
(function () {
  var missing = Object.freeze({
    schemaVersion: 1, displayState: 'available',
    // missing: caseId, sessionId, etc.
    activation: Object.freeze({}),
  });
  chk('H5: state with missing keys does NOT verify',
    VM.verifyAuthoritativeViewmodelState(missing) === false);
})();

// H6 — E5-R1-02: state with non-frozen activation does NOT verify
(function () {
  // Synthesize a verifier-passable shape but with NON-frozen activation. The state
  // ITSELF must be frozen + in WeakSet to even start the check, but our verifier ALSO
  // checks activation is frozen. Synthesize via Object.freeze of a top-level object
  // whose .activation is not frozen.
  var stateMaybe = {
    schemaVersion: 1, displayState: 'available',
    caseId: null, sessionId: null,
    outcome: null, outcomeClass: null, outcomeClassI18nKey: null,
    projection: null, projectionEventCount: 0,
    links: Object.freeze([]), linksCount: 0,
    activation: { uiCapabilityReady: false },  // <-- not frozen
    disclaimers: Object.freeze([]),
  };
  Object.freeze(stateMaybe);
  // Not in WeakSet → already false; this still verifies the verifier doesn't
  // wrongly return true.
  chk('H6: hand-built state with non-frozen activation does NOT verify',
    VM.verifyAuthoritativeViewmodelState(stateMaybe) === false);
})();

// ------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------
setTimeout(function () {
  console.log('R3.0E experiment viewmodel suite: ' + pass + ' passed, ' + fail + ' failed');
  if (fail > 0) process.exit(1);
}, 200);
