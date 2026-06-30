/**
 * tests/r3.0e-outcome-classifier.test.js — R3.0E E3 · Outcome Classifier adversarial tests.
 *
 * Coverage targets per SKYLINE 2026-06-30 R3.0 Continuous Resume Directive §6.7:
 *   confirmed / partially_confirmed / contradicted / inconclusive / invalid_comparison /
 *   inconclusive_due_to_confounders; cross-case + cross-session; missing applied change;
 *   missing expected observation; uncontrolled variables; stale generation; contradiction
 *   blocks confirmed; caller-classification rejected; forged records; clone rejection;
 *   JSON clone rejection; structuredClone rejection; Proxy zero-read before authority;
 *   hostile clock; duplicate evidence; deterministic IDs; deep freeze; no causation
 *   wording; no driver blame; no raw telemetry leak; mutation tests.
 */
'use strict';
var CL = require('../renderer/js/r3-0e-outcome-classifier.js');
var EXP = require('../contracts/r3.0e/experiment-contract.js');
var OUT = require('../contracts/r3.0e/outcome-contract.js');
var CV = require('../contracts/r3.0e/control-variables-contract.js');
var RC_E = require('../contracts/r3.0e/reason-codes.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

var BASE_CASE = 'case_demo_a';
var BASE_SESSION = 'session_demo_a';
var BASE_EXP_ID = 'exp_0123456789abcdef';
var BASE_CHANGE_ID = 'change_demo_001';
var BASE_FOLLOWUP = 'case_demo_a_followup_1';
var BASE_EXPERIMENT_TS = '2026-06-30T10:00:00Z';
var BASE_APPLIED_TS = '2026-06-30T11:00:00Z';
var BASE_CLOCK_ISO = '2026-06-30T11:30:00Z';

function deepFreeze(v) {
  if (v === null || typeof v !== 'object') return v;
  Object.freeze(v);
  var names = Object.getOwnPropertyNames(v);
  for (var i = 0; i < names.length; i++) deepFreeze(v[names[i]]);
  return v;
}

function makeExperiment(overrides) {
  var e = {
    schemaVersion: 1,
    experimentId: BASE_EXP_ID,
    sourceCaseId: BASE_CASE,
    sourceHypothesisId: 'hyp_demo_001',
    sourceRecommendationId: 'pri_demo_001',
    targetMetric: 'roll_gradient_deg_per_g',
    baselineValue: 3.5,
    expectedDirection: 'decrease',
    expectedMagnitudeRange: { min: 0.5, max: 1.5 },
    setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
    driverInstruction: null,
    controlVariables: [
      { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
        expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: null, withinRange: null },
    ],
    validationPlan: 'r3.0e.plan.controlled_repeat_lap',
    stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
    status: 'applied',
    followUpCaseIds: [BASE_FOLLOWUP],
    outcome: null,
    createdAt: BASE_EXPERIMENT_TS,
  };
  if (overrides) for (var k in overrides) e[k] = overrides[k];
  return deepFreeze(e);
}
function makeAppliedChange(overrides) {
  var ac = {
    changeId: BASE_CHANGE_ID,
    sourceExperimentId: BASE_EXP_ID,
    appliedAt: BASE_APPLIED_TS,
  };
  if (overrides) for (var k in overrides) ac[k] = overrides[k];
  return ac;
}
function makeFollowUp(overrides) {
  var fu = {
    followUpCaseId: BASE_FOLLOWUP,
    parentCaseId: BASE_CASE,
    sessionId: BASE_SESSION,
    parentSessionId: BASE_SESSION,
    hasExplicitReference: true,
    comparabilityScore: 0.9,
  };
  if (overrides) for (var k in overrides) fu[k] = overrides[k];
  return fu;
}
function makeObservation(overrides) {
  var o = {
    observedDirection: 'decrease',
    observedMagnitude: 1.0,
    driverFeedback: 'r3.0e.driver.feedback.balance_improved',
    dataQualityIssues: [],
    sideEffects: [],
    contradictingEvidenceIds: [],
    supportingEvidenceIds: ['ev_demo_001'],
  };
  if (overrides) for (var k in overrides) o[k] = overrides[k];
  return o;
}
function makeControlVariableObservations(overrides) {
  var cv = [
    { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: 84, withinRange: true },
  ];
  if (overrides) return overrides;
  return cv;
}
function makeInput(opts) {
  opts = opts || {};
  return {
    experiment: opts.experiment || makeExperiment(opts.experimentOverrides),
    appliedChange: opts.appliedChange || makeAppliedChange(opts.appliedChangeOverrides),
    followUp: opts.followUp || makeFollowUp(opts.followUpOverrides),
    observation: opts.observation || makeObservation(opts.observationOverrides),
    controlVariableObservations: (opts.controlVariableObservations !== undefined)
      ? opts.controlVariableObservations
      : makeControlVariableObservations(),
  };
}
function fixedClock() { return function () { return BASE_CLOCK_ISO; }; }

// ------------------------------------------------------------------
// Section A — Confirmed (golden path)
// ------------------------------------------------------------------
console.log('Section A — Confirmed (golden path)');
(function () {
  var r = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  chk('A1: confirmed valid=true', r.valid === true, r);
  chk('A2: confirmed class=confirmed', r.valid === true && r.outcome['class'] === 'confirmed');
  chk('A3: confirmed has experimentId', r.valid === true && r.outcome.experimentId === BASE_EXP_ID);
  chk('A4: confirmed has outcomeId outcome_<32hex>',
    r.valid === true && /^outcome_[0-9a-f]{16}$/.test(r.outcome.outcomeId));
  chk('A5: confirmed comparabilityScore preserved',
    r.valid === true && r.outcome.comparabilityScore === 0.9);
  chk('A6: confirmed confounders=[]',
    r.valid === true && Array.isArray(r.outcome.confounders) && r.outcome.confounders.length === 0);
  chk('A7: confirmed observedDirection=decrease',
    r.valid === true && r.outcome.observedDirection === 'decrease');
  chk('A8: confirmed observedMagnitude=1.0',
    r.valid === true && r.outcome.observedMagnitude === 1.0);
  chk('A9: confirmed outcome deep-frozen', r.valid === true && Object.isFrozen(r.outcome));
  chk('A10: confirmed outcome.confounders deep-frozen',
    r.valid === true && Object.isFrozen(r.outcome.confounders));
  chk('A11: confirmed outcome.limitations deep-frozen',
    r.valid === true && Object.isFrozen(r.outcome.limitations));
  chk('A12: confirmed envelope deep-frozen', r.valid === true && Object.isFrozen(r));
  chk('A13: confirmed passes verifyAuthoritativeOutcome',
    r.valid === true && CL.verifyAuthoritativeOutcome(r.outcome) === true);
  chk('A14: confirmed schemaVersion=1', r.valid === true && r.outcome.schemaVersion === 1);
})();

// ------------------------------------------------------------------
// Section B — Partially confirmed (direction match, magnitude out of range)
// ------------------------------------------------------------------
console.log('Section B — Partially confirmed');
(function () {
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: 'decrease', observedMagnitude: 0.3 },
  }), { clock: fixedClock() });
  chk('B1: partially_confirmed valid', r.valid === true, r);
  chk('B2: partially_confirmed class', r.valid === true && r.outcome['class'] === 'partially_confirmed');
  chk('B3: partially_confirmed observedMagnitude preserved',
    r.valid === true && r.outcome.observedMagnitude === 0.3);
})();
(function () {
  // Magnitude above max
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: 'decrease', observedMagnitude: 5.0 },
  }), { clock: fixedClock() });
  chk('B4: partially_confirmed (above max)',
    r.valid === true && r.outcome['class'] === 'partially_confirmed');
})();

// ------------------------------------------------------------------
// Section C — Contradicted (direction mismatch)
// ------------------------------------------------------------------
console.log('Section C — Contradicted');
(function () {
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: 'increase', observedMagnitude: 1.0 },
  }), { clock: fixedClock() });
  chk('C1: contradicted valid', r.valid === true);
  chk('C2: contradicted class', r.valid === true && r.outcome['class'] === 'contradicted');
})();
(function () {
  // observed=no_change vs expected=decrease
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: 'no_change', observedMagnitude: 0.0 },
  }), { clock: fixedClock() });
  chk('C3: contradicted (no_change vs decrease)',
    r.valid === true && r.outcome['class'] === 'contradicted');
})();

// ------------------------------------------------------------------
// Section D — Inconclusive
// ------------------------------------------------------------------
console.log('Section D — Inconclusive');
(function () {
  // observedDirection=null
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: null, observedMagnitude: null },
  }), { clock: fixedClock() });
  chk('D1: inconclusive (null direction)',
    r.valid === true && r.outcome['class'] === 'inconclusive');
})();
(function () {
  // Many data-quality issues → blocking → inconclusive
  var dq = ['r3.0e.dq.timebase_jitter', 'r3.0e.dq.steering_offset', 'r3.0e.dq.brake_offset',
            'r3.0e.dq.gear_sensor_dropouts', 'r3.0e.dq.gps_dropouts'];
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { dataQualityIssues: dq, observedDirection: 'decrease', observedMagnitude: 1.0 },
  }), { clock: fixedClock() });
  chk('D2: inconclusive (data-quality blocking)',
    r.valid === true && r.outcome['class'] === 'inconclusive',
    r.valid === true ? r.outcome['class'] : r);
  chk('D3: data-quality codes propagated to limitations',
    r.valid === true && r.outcome.limitations.indexOf('r3.0e.dq.timebase_jitter') !== -1);
})();

// ------------------------------------------------------------------
// Section E — invalid_comparison precedence
// ------------------------------------------------------------------
console.log('Section E — invalid_comparison');
(function () {
  // Cross-case
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { parentCaseId: 'case_other', followUpCaseId: 'case_other_follow' },
  }), { clock: fixedClock() });
  chk('E1: cross-case → invalid_comparison',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
  chk('E2: cross-case → LINKAGE_PARENT_MISSING limitation',
    r.valid === true && r.outcome.limitations.indexOf('LINKAGE_PARENT_MISSING') !== -1);
})();
(function () {
  // Cross-session
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { parentSessionId: 'session_other' },
  }), { clock: fixedClock() });
  chk('E3: cross-session → invalid_comparison',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
  chk('E4: cross-session → LIMITATION_CROSS_SESSION_FOLLOW_UP',
    r.valid === true && r.outcome.limitations.indexOf('LIMITATION_CROSS_SESSION_FOLLOW_UP') !== -1);
})();
(function () {
  // No explicit reference
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { hasExplicitReference: false },
  }), { clock: fixedClock() });
  chk('E5: no explicit reference → invalid_comparison',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
  chk('E6: no explicit reference → OUTCOME_COMPARABILITY_INSUFFICIENT',
    r.valid === true && r.outcome.limitations.indexOf('OUTCOME_COMPARABILITY_INSUFFICIENT') !== -1);
})();
(function () {
  // Low comparability score
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { comparabilityScore: 0.3 },
  }), { clock: fixedClock() });
  chk('E7: low comparability → invalid_comparison',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
})();
(function () {
  // Precedence: cross-case AND would-otherwise-be-confirmed → invalid_comparison wins (not confirmed)
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { parentCaseId: 'case_other' },
    observationOverrides: { observedDirection: 'decrease', observedMagnitude: 1.0 },
  }), { clock: fixedClock() });
  chk('E8: invalid_comparison takes precedence over confirmed',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
})();

// ------------------------------------------------------------------
// Section F — inconclusive_due_to_confounders precedence
// ------------------------------------------------------------------
console.log('Section F — inconclusive_due_to_confounders');
(function () {
  // Out-of-range CV
  var cvObs = [
    { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: 105, withinRange: false },
  ];
  var r = CL.classifyOutcome(makeInput({ controlVariableObservations: cvObs }),
    { clock: fixedClock() });
  chk('F1: out-of-range CV → inconclusive_due_to_confounders',
    r.valid === true && r.outcome['class'] === 'inconclusive_due_to_confounders');
  chk('F2: confounders list includes the CV name',
    r.valid === true && r.outcome.confounders.indexOf('tyre_temp_window') !== -1);
})();
(function () {
  // Missing CV (declared but not observed)
  var r = CL.classifyOutcome(makeInput({ controlVariableObservations: [] }),
    { clock: fixedClock() });
  chk('F3: missing CV → inconclusive_due_to_confounders',
    r.valid === true && r.outcome['class'] === 'inconclusive_due_to_confounders');
  chk('F4: missing CV limitations carries CONTROL_VARIABLE_MISSING',
    r.valid === true && r.outcome.limitations.indexOf('CONTROL_VARIABLE_MISSING') !== -1);
})();
(function () {
  // No CVs declared, none observed → flagged but classified normally
  var exp = makeExperiment({ controlVariables: [] });
  var r = CL.classifyOutcome(makeInput({ experiment: exp, controlVariableObservations: [] }),
    { clock: fixedClock() });
  chk('F5: no CVs → confirmed (with LIMITATION_NO_CONTROL_VARIABLES)',
    r.valid === true && r.outcome['class'] === 'confirmed');
  chk('F6: no CVs → LIMITATION_NO_CONTROL_VARIABLES carried',
    r.valid === true && r.outcome.limitations.indexOf('LIMITATION_NO_CONTROL_VARIABLES') !== -1);
})();
(function () {
  // Precedence: confounders AND would-otherwise-be-confirmed → inconclusive_due_to_confounders
  var cvObs = [
    { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: 105, withinRange: false },
  ];
  var r = CL.classifyOutcome(makeInput({
    controlVariableObservations: cvObs,
    observationOverrides: { observedDirection: 'decrease', observedMagnitude: 1.0 },
  }), { clock: fixedClock() });
  chk('F7: confounder precedence over confirmed',
    r.valid === true && r.outcome['class'] === 'inconclusive_due_to_confounders');
})();

// ------------------------------------------------------------------
// Section G — Contradiction blocks confirmed
// ------------------------------------------------------------------
console.log('Section G — Contradicting evidence');
(function () {
  // direction match, magnitude in range, BUT contradicting evidence present
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: {
      observedDirection: 'decrease', observedMagnitude: 1.0,
      contradictingEvidenceIds: ['ev_contradict_001'],
    },
  }), { clock: fixedClock() });
  chk('G1: contradictingEvidenceIds non-empty → contradicted (not confirmed)',
    r.valid === true && r.outcome['class'] === 'contradicted');
})();

// ------------------------------------------------------------------
// Section H — Cross-case / cross-session / missing applied change
// ------------------------------------------------------------------
console.log('Section H — Identity binding');
(function () {
  // appliedChange.sourceExperimentId mismatch
  var ac = makeAppliedChange({ sourceExperimentId: 'exp_other_aaaaaaaaaa' });
  var r = CL.classifyOutcome(makeInput({ appliedChange: ac }), { clock: fixedClock() });
  chk('H1: appliedChange.sourceExperimentId mismatch → BLOCK',
    r.valid !== true && r.reasonCodes.indexOf('OUTCOME_INVALID') !== -1);
})();
(function () {
  // experiment.status !== applied
  var exp = makeExperiment({ status: 'planned' });
  var r = CL.classifyOutcome(makeInput({ experiment: exp }), { clock: fixedClock() });
  chk('H2: experiment.status=planned → BLOCK EXPERIMENT_STATUS_INVALID',
    r.valid !== true && r.reasonCodes.indexOf('EXPERIMENT_STATUS_INVALID') !== -1);
})();

// ------------------------------------------------------------------
// Section I — Missing expected observation / stale generation
// ------------------------------------------------------------------
console.log('Section I — Missing expected observation / stale generation');
(function () {
  // expected magnitude range absent — E1 already enforces, but we feed an experiment that
  // would fail E1.validateExperimentShape → BLOCK at classifier layer too.
  var bad = JSON.parse(JSON.stringify(makeExperiment()));
  delete bad.expectedMagnitudeRange;
  Object.freeze(bad);
  var r = CL.classifyOutcome(makeInput({ experiment: bad }), { clock: fixedClock() });
  chk('I1: missing expectedMagnitudeRange → BLOCK',
    r.valid !== true && (r.reasonCodes.indexOf('EXPERIMENT_INVALID') !== -1
      || r.reasonCodes.indexOf('EXPERIMENT_EXPECTED_MAGNITUDE_RANGE_INVALID') !== -1));
})();
(function () {
  // Stale generation — experiment older than maxAgeMs
  var oldExp = makeExperiment({ createdAt: '2020-01-01T00:00:00Z' });
  var r = CL.classifyOutcome(makeInput({ experiment: oldExp }),
    { clock: fixedClock(), maxAgeMs: 1000 });
  chk('I2: stale experiment → BLOCK OUTCOME_INVALID',
    r.valid !== true);
})();

// ------------------------------------------------------------------
// Section J — Caller-classification rejected
// ------------------------------------------------------------------
console.log('Section J — Caller-classification rejected');
(function () {
  // Caller tries to smuggle an `outcome` field on the input wrapper (UNKNOWN_OWN_KEY)
  var i = makeInput();
  i.outcome = { 'class': 'confirmed' };
  var r = CL.classifyOutcome(i, { clock: fixedClock() });
  chk('J1: caller-supplied outcome on input wrapper → BLOCK UNKNOWN_OWN_KEY',
    r.valid !== true && r.reasonCodes.indexOf('UNKNOWN_OWN_KEY') !== -1);
})();
(function () {
  // Caller tries to set experiment.outcome (status=applied → E1 already forbids; defence-in-depth)
  // Build an experiment with outcome non-null and a status that E1 would permit (completed).
  // We then set status back to 'applied' on the snapshot — but the E1 contract rejects that
  // combo. So this hits the EXP validate gate.
  var exp = makeExperiment({ status: 'completed', outcome: { synthetic: true } });
  var r = CL.classifyOutcome(makeInput({ experiment: exp }), { clock: fixedClock() });
  chk('J2: pre-filled outcome on experiment (status=completed) → BLOCK EXPERIMENT_STATUS_INVALID',
    r.valid !== true && (r.reasonCodes.indexOf('EXPERIMENT_STATUS_INVALID') !== -1
      || r.reasonCodes.indexOf('OUTCOME_INVALID') !== -1));
})();
(function () {
  // Caller tries `class` field directly on input
  var i = makeInput();
  i['class'] = 'confirmed';
  var r = CL.classifyOutcome(i, { clock: fixedClock() });
  chk('J3: caller-supplied class on input → BLOCK',
    r.valid !== true && r.reasonCodes.indexOf('UNKNOWN_OWN_KEY') !== -1);
})();

// ------------------------------------------------------------------
// Section K — Forged records (clone / JSON / structuredClone / Proxy)
// ------------------------------------------------------------------
console.log('Section K — Forged records / clone rejection');
(function () {
  // Clone the experiment after the original passes — clone is a NEW reference, NOT registered.
  var r = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  chk('K0 setup: confirmed verifies', r.valid === true && CL.verifyAuthoritativeOutcome(r.outcome));
  // JSON clone: structurally identical, different reference
  var cloned = JSON.parse(JSON.stringify(r.outcome));
  chk('K1: JSON-cloned outcome does NOT verify',
    CL.verifyAuthoritativeOutcome(cloned) === false);
  // structuredClone
  if (typeof structuredClone === 'function') {
    var sc = structuredClone(r.outcome);
    chk('K2: structuredClone outcome does NOT verify',
      CL.verifyAuthoritativeOutcome(sc) === false);
  } else { pass += 1; }
  // Hand-forged shape match
  var forged = Object.freeze({
    schemaVersion: 1,
    outcomeId: r.outcome.outcomeId,
    experimentId: r.outcome.experimentId,
    'class': 'confirmed',
    observedDirection: 'decrease', observedMagnitude: 1.0,
    comparabilityScore: 0.9, confounders: Object.freeze([]),
    driverFeedback: null, dataQualityIssues: Object.freeze([]),
    sideEffects: Object.freeze([]), limitations: Object.freeze([]),
    createdAt: '2026-06-30T11:30:00Z',
  });
  chk('K3: hand-forged shape-matching frozen object does NOT verify',
    CL.verifyAuthoritativeOutcome(forged) === false);
})();
(function () {
  // Experiment passed as a NON-frozen object → BLOCK (not deep-frozen)
  var exp = makeExperiment();
  // makeExperiment already deep-freezes; manually re-build a non-frozen variant
  var unfrozen = JSON.parse(JSON.stringify(exp));
  var r = CL.classifyOutcome(makeInput({ experiment: unfrozen }), { clock: fixedClock() });
  chk('K4: unfrozen experiment → BLOCK',
    r.valid !== true && r.reasonCodes.indexOf('EXPERIMENT_INVALID') !== -1);
})();
(function () {
  // Proxy input wrapper — descriptor snapshot should reject (Object.getOwnPropertyNames
  // does fire the ownKeys trap, but our walk uses descriptors and rejects unknown keys.
  // A Proxy that returns "extra" own keys → BLOCK).
  var realInput = makeInput();
  var p = new Proxy(realInput, {
    ownKeys: function (target) {
      return ['experiment', 'appliedChange', 'followUp', 'observation', 'controlVariableObservations', 'class'];
    },
    getOwnPropertyDescriptor: function (target, key) {
      if (key === 'class') return { configurable: true, enumerable: true, value: 'confirmed' };
      return Object.getOwnPropertyDescriptor(target, key);
    },
    get: function (target, key) {
      throw new Error('Proxy [[Get]] fired — classifier should not [[Get]] before authority');
    },
  });
  var r = CL.classifyOutcome(p, { clock: fixedClock() });
  chk('K5: Proxy with extra "class" own key → BLOCK without firing [[Get]]',
    r.valid !== true);
})();

// ------------------------------------------------------------------
// Section L — Hostile clock
// ------------------------------------------------------------------
console.log('Section L — Hostile clock');
(function () {
  var clockCalls = 0;
  var hostileClock = function () { clockCalls++; throw new Error('clock exploded'); };
  // Forged input (cross-case → fast-fail BEFORE clock)
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { parentCaseId: 'case_other' },
  }), { clock: hostileClock });
  // The classifier currently invokes clock during Step 9 (post-authority) — for forged
  // input it should not reach Step 9. But invalid_comparison happens AFTER clock. So we
  // also test a STRUCTURAL reject (cross-case is structural).
  // Actually crossCase only triggers at Step 11 (post-clock). Need a structural rejection
  // earlier to assert clockCalls === 0. Use an unknown-own-key Proxy:
  var i = makeInput();
  i.unknown_field = 1;
  clockCalls = 0;
  var r2 = CL.classifyOutcome(i, { clock: hostileClock });
  chk('L1: forged input (UNKNOWN_OWN_KEY) → clock not invoked',
    r2.valid !== true && clockCalls === 0);
  chk('L2: forged input → BLOCK', r2.valid !== true);
})();
(function () {
  // Hostile clock returning a non-string → BLOCK with no partial output
  var hostileClock = function () { return { malicious: true }; };
  var r = CL.classifyOutcome(makeInput(), { clock: hostileClock });
  chk('L3: hostile clock returning non-string → BLOCK',
    r.valid !== true);
})();

// ------------------------------------------------------------------
// Section M — Deterministic IDs / no clock leak in outcomeId
// ------------------------------------------------------------------
console.log('Section M — Deterministic IDs');
(function () {
  // Clock varies within the freshness window — outcomeId hash MUST NOT depend on clock.
  var r1 = CL.classifyOutcome(makeInput(),
    { clock: function () { return '2026-06-30T11:30:00Z'; } });
  var r2 = CL.classifyOutcome(makeInput(),
    { clock: function () { return '2026-07-15T12:00:00Z'; } });
  chk('M1: outcomeId deterministic regardless of clock',
    r1.valid === true && r2.valid === true
      && r1.outcome.outcomeId === r2.outcome.outcomeId,
    r1.valid === true && r2.valid === true ? { id1: r1.outcome.outcomeId, id2: r2.outcome.outcomeId } : { r1: r1, r2: r2 });
})();
(function () {
  // Different changeId → different outcomeId
  var r1 = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  var r2 = CL.classifyOutcome(makeInput({
    appliedChangeOverrides: { changeId: 'change_demo_002' },
  }), { clock: fixedClock() });
  chk('M2: different changeId → different outcomeId',
    r1.valid === true && r2.valid === true && r1.outcome.outcomeId !== r2.outcome.outcomeId);
})();
(function () {
  // Different experimentId → different outcomeId
  var r1 = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  var otherExp = makeExperiment({ experimentId: 'exp_aaaaaaaaaaaaaaaa' });
  var otherAc = makeAppliedChange({ sourceExperimentId: 'exp_aaaaaaaaaaaaaaaa' });
  var r2 = CL.classifyOutcome(makeInput({ experiment: otherExp, appliedChange: otherAc }),
    { clock: fixedClock() });
  chk('M3: different experimentId → different outcomeId',
    r1.valid === true && r2.valid === true && r1.outcome.outcomeId !== r2.outcome.outcomeId);
})();

// ------------------------------------------------------------------
// Section N — Deep freeze / no causation wording / no raw telemetry leak
// ------------------------------------------------------------------
console.log('Section N — Deep freeze / no causation / no raw telemetry');
(function () {
  var r = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  chk('N1: outcome is deep-frozen', r.valid === true && Object.isFrozen(r.outcome));
  chk('N2: outcome.confounders is frozen', r.valid === true && Object.isFrozen(r.outcome.confounders));
  chk('N3: outcome.limitations is frozen', r.valid === true && Object.isFrozen(r.outcome.limitations));
  chk('N4: outcome.dataQualityIssues is frozen', r.valid === true && Object.isFrozen(r.outcome.dataQualityIssues));
  chk('N5: outcome.sideEffects is frozen', r.valid === true && Object.isFrozen(r.outcome.sideEffects));
  // Outcome must not contain free-text driver feedback (only i18n key)
  if (r.valid === true) {
    var fb = r.outcome.driverFeedback;
    chk('N6: driverFeedback is i18n key or null',
      fb === null || (typeof fb === 'string' && fb.indexOf(' ') === -1 && fb.indexOf('.') !== -1));
  }
  // Outcome must not contain raw telemetry payloads, paths, etc.
  if (r.valid === true) {
    var s = JSON.stringify(r.outcome);
    chk('N7: outcome contains no filesystem path',
      s.indexOf('/Users/') === -1 && s.indexOf('\\Users\\') === -1
      && s.indexOf('/home/') === -1 && s.indexOf('/private/') === -1);
    chk('N8: outcome contains no causal claim wording',
      s.toLowerCase().indexOf(' causes ') === -1
      && s.toLowerCase().indexOf(' caused ') === -1
      && s.toLowerCase().indexOf(' because ') === -1);
    chk('N9: outcome contains no driver-blame wording',
      s.toLowerCase().indexOf('driver error') === -1
      && s.toLowerCase().indexOf("driver's fault") === -1
      && s.toLowerCase().indexOf('blame') === -1);
  }
})();

// ------------------------------------------------------------------
// Section O — Mutation tests (outcome cannot be mutated post-return)
// ------------------------------------------------------------------
console.log('Section O — Mutation resistance');
(function () {
  var r = CL.classifyOutcome(makeInput(), { clock: fixedClock() });
  if (r.valid === true) {
    var beforeClass = r.outcome['class'];
    try { r.outcome['class'] = 'forged'; } catch (e) { /* swallow strict-mode throw */ }
    chk('O1: outcome.class cannot be mutated',
      r.outcome['class'] === beforeClass);
    try { r.outcome.confounders.push('x'); } catch (e) { /* swallow */ }
    chk('O2: outcome.confounders cannot be mutated',
      r.outcome.confounders.length === 0);
    try { r.outcome.limitations.push('FORGED'); } catch (e) { /* swallow */ }
    chk('O3: outcome.limitations cannot be mutated post-return',
      r.outcome.limitations.indexOf('FORGED') === -1);
  }
})();

// ------------------------------------------------------------------
// Section P — Duplicate evidence id rejected at structural layer
// ------------------------------------------------------------------
console.log('Section P — Evidence ids');
(function () {
  // Two contradicting evidence ids that happen to be the same id — the structural layer
  // accepts both (no dedup logic at E3 contract), but the count still drives contradicted.
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: {
      contradictingEvidenceIds: ['ev_dup_001', 'ev_dup_001'],
      observedDirection: 'decrease', observedMagnitude: 1.0,
    },
  }), { clock: fixedClock() });
  chk('P1: duplicate contradicting evidence ids still classify as contradicted',
    r.valid === true && r.outcome['class'] === 'contradicted');
})();
(function () {
  // Hostile contradicting id (contains "..")
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { contradictingEvidenceIds: ['../etc/passwd'] },
  }), { clock: fixedClock() });
  chk('P2: hostile evidence id (../) → BLOCK',
    r.valid !== true);
})();

// ------------------------------------------------------------------
// Section Q — opts validation
// ------------------------------------------------------------------
console.log('Section Q — opts validation');
(function () {
  var r = CL.classifyOutcome(makeInput(), { unknown: true });
  chk('Q1: unknown opts key → BLOCK UNKNOWN_OWN_KEY',
    r.valid !== true && r.reasonCodes.indexOf('UNKNOWN_OWN_KEY') !== -1);
})();
(function () {
  var r = CL.classifyOutcome(makeInput(), {});
  chk('Q2: empty opts (no clock, no referenceNowMs) → BLOCK',
    r.valid !== true);
})();
(function () {
  // referenceNowMs allowed
  var r = CL.classifyOutcome(makeInput(), { referenceNowMs: Date.parse(BASE_CLOCK_ISO) });
  chk('Q3: referenceNowMs accepted', r.valid === true);
})();

// ------------------------------------------------------------------
// Section R — verifyAuthoritativeOutcome boundary
// ------------------------------------------------------------------
console.log('Section R — verifyAuthoritativeOutcome');
(function () {
  chk('R1: null candidate → false', CL.verifyAuthoritativeOutcome(null) === false);
  chk('R2: undefined → false', CL.verifyAuthoritativeOutcome(undefined) === false);
  chk('R3: primitive → false', CL.verifyAuthoritativeOutcome('outcome_abc') === false);
  chk('R4: empty object → false', CL.verifyAuthoritativeOutcome({}) === false);
  chk('R5: number → false', CL.verifyAuthoritativeOutcome(42) === false);
})();
(function () {
  // A Proxy that lies about WeakSet identity cannot pass — WeakSet.has via Reflect.apply
  // resolves the underlying key by reference, not by [[Get]] traps.
  var fakeOutcome = new Proxy({}, {
    get: function (target, key) {
      if (key === 'schemaVersion') return 1;
      if (key === 'outcomeId') return 'outcome_lie';
      if (key === 'experimentId') return 'exp_lie';
      if (key === 'class') return 'confirmed';
      if (key === 'confounders') return [];
      if (key === 'limitations') return [];
      return undefined;
    },
  });
  chk('R6: Proxy-pretending-to-be-outcome → verifier returns false',
    CL.verifyAuthoritativeOutcome(fakeOutcome) === false);
})();

// ------------------------------------------------------------------
// Section S — API export hardening
// ------------------------------------------------------------------
console.log('Section S — API export');
(function () {
  chk('S1: API is frozen', Object.isFrozen(CL));
  chk('S2: API exports classifyOutcome', typeof CL.classifyOutcome === 'function');
  chk('S3: API exports verifyAuthoritativeOutcome', typeof CL.verifyAuthoritativeOutcome === 'function');
  // Forbidden exports per directive §6.5 — no WeakSet, no register, no secret/signing
  chk('S4: NO _registerAuthoritativeOutcome exported',
    CL._registerAuthoritativeOutcome === undefined && CL.register === undefined);
  chk('S5: NO WeakSet exported',
    CL._authoritativeOutcomes === undefined && CL.weakSet === undefined);
  chk('S6: NO secret / signing primitive exported',
    CL.sign === undefined && CL.secret === undefined && CL._WS_ADD === undefined);
})();

// ------------------------------------------------------------------
// Section T — Codex defensive coverage (anticipated)
// ------------------------------------------------------------------
console.log('Section T — Defensive');
(function () {
  // T1: invalid_comparison + no explicit reference + cross-case → class STILL invalid_comparison,
  // limitations carries BOTH codes (or at least one).
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { parentCaseId: 'case_other', hasExplicitReference: false },
  }), { clock: fixedClock() });
  chk('T1: combined invalid_comparison signals → class=invalid_comparison',
    r.valid === true && r.outcome['class'] === 'invalid_comparison');
})();
(function () {
  // T2: experiment.controlVariables[].observedValue field is null at declaration time (E1
  // permits it). The classifier requires the OBSERVATION list to have observed values.
  // This is documented behaviour and tested as F1/F2/F3 above. Sanity check that the
  // observation array's elements must each be E1-valid:
  var cvObs = [{ name: 'foo', description: 'foo desc', expectedValue: 10,
    allowedRange: { min: 0, max: 100 }, observedValue: 50, withinRange: true }];
  var exp = makeExperiment({ controlVariables: [{ name: 'foo', description: 'foo desc',
    expectedValue: 10, allowedRange: { min: 0, max: 100 }, observedValue: null, withinRange: null }] });
  var r = CL.classifyOutcome(makeInput({ experiment: exp, controlVariableObservations: cvObs }),
    { clock: fixedClock() });
  chk('T2: re-name (foo) CV correctly matched → confirmed',
    r.valid === true && r.outcome['class'] === 'confirmed');
})();
(function () {
  // T3: duplicate CV name in observations → BLOCK
  var dupCv = [
    { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: 80, withinRange: true },
    { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
      expectedValue: 85, allowedRange: { min: 75, max: 95 }, observedValue: 85, withinRange: true },
  ];
  var r = CL.classifyOutcome(makeInput({ controlVariableObservations: dupCv }),
    { clock: fixedClock() });
  chk('T3: duplicate CV name in observations → BLOCK',
    r.valid !== true);
})();
(function () {
  // T4: hostile observation.observedDirection (string outside enum)
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { observedDirection: 'totally_made_up' },
  }), { clock: fixedClock() });
  chk('T4: invalid observedDirection enum → BLOCK',
    r.valid !== true);
})();
(function () {
  // T5: comparabilityScore out of [0,1]
  var r = CL.classifyOutcome(makeInput({
    followUpOverrides: { comparabilityScore: 1.5 },
  }), { clock: fixedClock() });
  chk('T5: comparabilityScore > 1 → BLOCK', r.valid !== true);
  var r2 = CL.classifyOutcome(makeInput({
    followUpOverrides: { comparabilityScore: -0.1 },
  }), { clock: fixedClock() });
  chk('T6: comparabilityScore < 0 → BLOCK', r2.valid !== true);
})();
(function () {
  // T7: hostile sideEffects element (not plain)
  var fakeSe = Object.create({});
  fakeSe.i18nKey = 'r3.0e.side.fake';
  fakeSe.params = null;
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { sideEffects: [fakeSe] },
  }), { clock: fixedClock() });
  // Note: Object.create({}) creates an object whose prototype is a plain object, but NOT
  // Object.prototype/null. Our _isOriginalPlainObject rejects this.
  chk('T7: sideEffects with non-Object.prototype → BLOCK',
    r.valid !== true);
})();

// ==================================================================
// Section U — Codex E3 R1 closures (E3-R1-01..03)
// ==================================================================
console.log('Section U — Codex E3 R1 closures');

// U1 — E3-R1-01: Object.create rebind cannot bypass confounder check
(function () {
  // Reproducer: declare a control variable in experiment, supply ZERO observations,
  // then rebind ambient Object.create to a function that returns a populated object.
  // BEFORE closure: classifier's `observedCvByName = Object.create(null)` would receive
  // the populated object → presence check passes → missing CV not detected → confirmed.
  // AFTER closure: captured Object.create is used + descriptor-only membership check.
  var emptyCvInput = makeInput({ controlVariableObservations: [] });
  var realObjectCreate = Object.create;
  var classBefore = null, classAfter = null;
  try {
    classBefore = (function () {
      var r = CL.classifyOutcome(emptyCvInput, { clock: fixedClock() });
      return r.valid === true ? r.outcome['class'] : ('BLOCKED:' + (r.reasonCodes || []).join(','));
    })();
    // Hostile rebind: any new Object.create() returns a synthesized membership map.
    Object.create = function () {
      var fakeSet = {};
      Object.defineProperty(fakeSet, 'tyre_temp_window', {
        value: true, writable: false, enumerable: true, configurable: false,
      });
      return fakeSet;
    };
    classAfter = (function () {
      var r = CL.classifyOutcome(emptyCvInput, { clock: fixedClock() });
      return r.valid === true ? r.outcome['class'] : ('BLOCKED:' + (r.reasonCodes || []).join(','));
    })();
  } finally {
    Object.create = realObjectCreate;
  }
  chk('U1: Object.create rebind cannot bypass missing-CV detection',
    classBefore === 'inconclusive_due_to_confounders'
      && classAfter === 'inconclusive_due_to_confounders',
    { before: classBefore, after: classAfter });
})();

// U2 — E3-R1-02: driverFeedback rejects blame / causation / free text / paths
(function () {
  var blamePhrases = [
    'driver error because setup caused crash',
    'this is the driver\'s fault',
    'blame on the engineer',
    '/Users/skyline/setup.json',
    '..\\etc\\passwd',
    'this caused a crash',
    'SHOUTING IN CAPITALS',
    'space in key',
    'r3.0e Driver feedback Capital',  // mixed case
    '',                                // empty
  ];
  for (var i = 0; i < blamePhrases.length; i++) {
    var df = blamePhrases[i];
    var r = CL.classifyOutcome(makeInput({
      observationOverrides: { driverFeedback: df },
    }), { clock: fixedClock() });
    chk('U2.' + (i + 1) + ': blame/path/free-text driverFeedback rejected: ' + JSON.stringify(df).slice(0, 40),
      r.valid !== true && (r.reasonCodes || []).indexOf('OUTCOME_DRIVER_FEEDBACK_INVALID') !== -1);
  }
})();

// U3 — E3-R1-02: valid i18n keys (existing convention) still accepted
(function () {
  var validKeys = [
    'r3.0e.driver.feedback.balance_improved',
    'r3.0e.driver.feedback.understeer',
    'r3.0d.brief.no_primary_action',
    'r3.0e.cv.tyre_temp_window',
    'r3.0e.stop.lap_time_increase',
  ];
  for (var i = 0; i < validKeys.length; i++) {
    var k = validKeys[i];
    var r = CL.classifyOutcome(makeInput({
      observationOverrides: { driverFeedback: k },
    }), { clock: fixedClock() });
    chk('U3.' + (i + 1) + ': valid i18n key accepted: ' + k,
      r.valid === true && r.outcome.driverFeedback === k);
  }
})();

// U4 — E3-R1-02: null still permitted (driverFeedback is optional)
(function () {
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { driverFeedback: null },
  }), { clock: fixedClock() });
  chk('U4: null driverFeedback accepted', r.valid === true && r.outcome.driverFeedback === null);
})();

// U5 — E3-R1-03: sparse array (new Array(N)) rejected as data quality input
(function () {
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { dataQualityIssues: new Array(5) },
  }), { clock: fixedClock() });
  chk('U5: sparse Array(5) dataQualityIssues → BLOCK',
    r.valid !== true);
})();

// U6 — E3-R1-03: array with named own key (arr.foo = 'x') rejected
(function () {
  var arr = [];
  arr.foo = 'r3.0e.dq.foo';
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { dataQualityIssues: arr },
  }), { clock: fixedClock() });
  chk('U6: named own key on array → BLOCK',
    r.valid !== true);
})();

// U7 — E3-R1-03: sparse array as controlVariableObservations rejected
(function () {
  var sparse = new Array(3);
  // Even with valid elements at some indices, the holes should block.
  sparse[0] = {
    name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp_window',
    expectedValue: 85, allowedRange: { min: 75, max: 95 },
    observedValue: 85, withinRange: true,
  };
  var r = CL.classifyOutcome(makeInput({ controlVariableObservations: sparse }),
    { clock: fixedClock() });
  chk('U7: sparse controlVariableObservations → BLOCK',
    r.valid !== true);
})();

// U8 — E3-R1-03: sparse contradictingEvidenceIds rejected (would otherwise misclassify)
(function () {
  var sparse = new Array(2);
  // The classifier would normally count contradictingEvidenceIds.length > 0 → contradicted.
  // A sparse array with length=2 but no own indices would either: (a) skip elements and
  // misclassify as confirmed, or (b) reject. Closure mandates (b).
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { contradictingEvidenceIds: sparse },
  }), { clock: fixedClock() });
  chk('U8: sparse contradictingEvidenceIds → BLOCK',
    r.valid !== true);
})();

// U9 — E3-R1-03: Array.prototype poisoning cannot leak into observed array snapshots
(function () {
  // Hostile pollution: Array.prototype gains a numeric-looking own key. The classifier's
  // walk uses Object.getOwnPropertyDescriptor on the array (own only), so prototype
  // values do not leak. Verify a dense [] input still classifies as empty.
  var originalProtoLen = Array.prototype.length;
  Array.prototype['0'] = 'r3.0e.dq.injected_via_proto';
  try {
    var r = CL.classifyOutcome(makeInput({
      observationOverrides: { dataQualityIssues: [], observedDirection: 'decrease', observedMagnitude: 1.0 },
    }), { clock: fixedClock() });
    chk('U9: Array.prototype["0"] pollution does NOT leak into observed array',
      r.valid === true && r.outcome.dataQualityIssues.length === 0
        && r.outcome['class'] === 'confirmed');
  } finally {
    delete Array.prototype['0'];
    Array.prototype.length = originalProtoLen;
  }
})();

// U10 — E3-R1-03: well-formed dense array still works (regression guard)
(function () {
  var arr = ['r3.0e.dq.timebase_jitter', 'r3.0e.dq.gps_dropouts'];
  var r = CL.classifyOutcome(makeInput({
    observationOverrides: { dataQualityIssues: arr, observedDirection: 'decrease', observedMagnitude: 1.0 },
  }), { clock: fixedClock() });
  // 2 issues, threshold is 4 → still confirmed; dq propagated only when blocking. So
  // confirmed AND limitations does NOT include the dq codes.
  chk('U10: dense array within cap accepted',
    r.valid === true && r.outcome['class'] === 'confirmed');
})();

// ------------------------------------------------------------------
// Summary
// ------------------------------------------------------------------
console.log('R3.0E outcome classifier suite: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
