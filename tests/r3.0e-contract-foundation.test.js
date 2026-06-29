/**
 * tests/r3.0e-contract-foundation.test.js — R3.0E E1 · Contract Foundation smoke + adversarial tests.
 *
 * Mirrors the D1 contract-foundation pattern: validateExperimentShape /
 * validateOutcomeShape / validateControlVariableShape / validateCaseTimelineShape /
 * validateFollowUpLinkShape happy + adversarial paths. E1 is NON-PRODUCTION; this suite
 * validates the structural gates only.
 */
'use strict';
var fs = require('fs');
var path = require('path');

var RC = require('../contracts/r3.0e/reason-codes.js');
var EXP = require('../contracts/r3.0e/experiment-contract.js');
var OUT = require('../contracts/r3.0e/outcome-contract.js');
var CV = require('../contracts/r3.0e/control-variables-contract.js');
var TL = require('../contracts/r3.0e/case-timeline-contract.js');
var FU = require('../contracts/r3.0e/follow-up-link-contract.js');
var INDEX = require('../contracts/r3.0e/index.js');

var pass = 0, fail = 0;
function chk(msg, cond, detail) {
  if (cond) pass += 1;
  else { fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
}

// Section A — Reason codes
console.log('Section A — reason codes');
chk('A1: REASON_CODES is frozen', Object.isFrozen(RC.REASON_CODES));
chk('A2: ALL_REASON_CODES has > 20 entries', RC.ALL_REASON_CODES.length > 20);
chk('A3: isReasonCode(EXPERIMENT_INVALID) === true', RC.isReasonCode('EXPERIMENT_INVALID') === true);
chk('A4: isReasonCode(UNKNOWN) === false', RC.isReasonCode('NOT_A_REAL_CODE') === false);
chk('A5: buildBlockedResult shape', (function () {
  var r = RC.buildBlockedResult(['EXPERIMENT_INVALID'], { detail: 'test' });
  return r.eligible === false && r.status === 'blocked' && Array.isArray(r.reasonCodes) && r.reasonCodes[0] === 'EXPERIMENT_INVALID';
})());

// Section B — Experiment
console.log('Section B — Experiment');
var validExperiment = {
  schemaVersion: 1,
  experimentId: 'exp_0123456789abcdef',
  sourceCaseId: 'case_E1_demo',
  sourceHypothesisId: 'pri_0123456789abcdef',
  sourceRecommendationId: 'priority_E1_demo',
  targetMetric: 'roll_gradient_deg_per_g',
  baselineValue: 3.5,
  expectedDirection: 'decrease',
  expectedMagnitudeRange: { min: 0.5, max: 1.5 },
  setupChange: { component: 'front_arb', delta_nm_per_deg: 200 },
  driverInstruction: 'r3.0e.driver.brake_earlier',
  controlVariables: [],
  validationPlan: 'r3.0e.plan.controlled_repeat_lap',
  stopConditions: [{ i18nKey: 'r3.0e.stop.lap_time_increase', params: { threshold_s: 0.5 } }],
  status: 'planned',
  followUpCaseIds: [],
  outcome: null,
  createdAt: '2026-06-29T10:00:00Z',
};
chk('B1: valid experiment accepted', EXP.validateExperimentShape(validExperiment).valid === true);
chk('B2: missing experimentId rejected', (function () {
  var bad = Object.assign({}, validExperiment); delete bad.experimentId; bad.experimentId = 'wrong-format';
  return EXP.validateExperimentShape(bad).eligible === false;
})());
chk('B3: bad expectedDirection rejected', (function () {
  var bad = Object.assign({}, validExperiment, { expectedDirection: 'sideways' });
  return EXP.validateExperimentShape(bad).eligible === false;
})());
chk('B4: bad magnitudeRange (min>max) rejected', (function () {
  var bad = Object.assign({}, validExperiment, { expectedMagnitudeRange: { min: 5, max: 1 } });
  return EXP.validateExperimentShape(bad).eligible === false;
})());
chk('B5: bad status enum rejected', (function () {
  var bad = Object.assign({}, validExperiment, { status: 'in_flight' });
  return EXP.validateExperimentShape(bad).eligible === false;
})());
chk('B6: extra own key rejected', (function () {
  var bad = Object.assign({}, validExperiment, { hostileKey: 'x' });
  return EXP.validateExperimentShape(bad).eligible === false;
})());
chk('B7: empty stopConditions rejected', (function () {
  var bad = Object.assign({}, validExperiment, { stopConditions: [] });
  return EXP.validateExperimentShape(bad).eligible === false;
})());

// Section C — Outcome
console.log('Section C — Outcome');
var validOutcome = {
  schemaVersion: 1,
  outcomeId: 'out_e1_demo',
  experimentId: 'exp_0123456789abcdef',
  'class': 'confirmed',
  observedDirection: 'decrease',
  observedMagnitude: 1.0,
  comparabilityScore: 0.9,
  confounders: [],
  driverFeedback: null,
  dataQualityIssues: [],
  sideEffects: [],
  limitations: [],
  createdAt: '2026-06-29T11:00:00Z',
};
chk('C1: valid outcome accepted', OUT.validateOutcomeShape(validOutcome).valid === true);
chk('C2: invalid class rejected', OUT.validateOutcomeShape(Object.assign({}, validOutcome, { 'class': 'mystery' })).eligible === false);
chk('C3: comparabilityScore > 1 rejected', OUT.validateOutcomeShape(Object.assign({}, validOutcome, { comparabilityScore: 1.2 })).eligible === false);
chk('C4: confounders present without inconclusive_due_to_confounders class rejected', (function () {
  var bad = Object.assign({}, validOutcome, { confounders: ['weather_change'], 'class': 'confirmed' });
  return OUT.validateOutcomeShape(bad).eligible === false;
})());
chk('C5: confounders present with inconclusive_due_to_confounders class accepted', (function () {
  var ok = Object.assign({}, validOutcome, { confounders: ['weather_change'], 'class': 'inconclusive_due_to_confounders' });
  return OUT.validateOutcomeShape(ok).valid === true;
})());

// Section D — Control Variables
console.log('Section D — Control Variables');
var validCV = { name: 'tyre_temp_window', description: 'r3.0e.cv.tyre_temp', expectedValue: 80, allowedRange: { min: 75, max: 95 }, observedValue: null, withinRange: null };
chk('D1: valid control variable accepted', CV.validateControlVariableShape(validCV).valid === true);
chk('D2: range min>max rejected', CV.validateControlVariableShape(Object.assign({}, validCV, { allowedRange: { min: 100, max: 50 } })).eligible === false);
chk('D3: bad observed type rejected', CV.validateControlVariableShape(Object.assign({}, validCV, { observedValue: { hostile: true } })).eligible === false);

// Section E — Case Timeline
console.log('Section E — Case Timeline');
var validTL = { schemaVersion: 1, caseId: 'case_E1_demo', events: [
  { eventId: 'ev_1', kind: 'baseline_captured', createdAt: '2026-06-29T10:00:00Z', i18nKey: 'r3.0e.tl.baseline', params: null },
  { eventId: 'ev_2', kind: 'hypothesis_recorded', createdAt: '2026-06-29T10:05:00Z', i18nKey: 'r3.0e.tl.hypothesis', params: null },
] };
chk('E1: valid timeline accepted', TL.validateCaseTimelineShape(validTL).valid === true);
chk('E2: out-of-order events rejected', (function () {
  var bad = JSON.parse(JSON.stringify(validTL));
  bad.events[1].createdAt = '2026-06-29T09:00:00Z'; // earlier than ev_1
  return TL.validateCaseTimelineShape(bad).eligible === false;
})());
chk('E3: unknown event kind rejected', (function () {
  var bad = JSON.parse(JSON.stringify(validTL));
  bad.events[0].kind = 'mystery_kind';
  return TL.validateCaseTimelineShape(bad).eligible === false;
})());

// Section F — Follow-up Link
console.log('Section F — Follow-up Link');
var validFU = { schemaVersion: 1, linkId: 'link_e1', parentCaseId: 'case_A', followUpCaseId: 'case_B', experimentId: 'exp_e1', parentStatus: 'present', createdAt: '2026-06-29T10:00:00Z' };
chk('F1: valid linkage accepted', FU.validateFollowUpLinkShape(validFU).valid === true);
chk('F2: self-link (parent === followUp) rejected', (function () {
  var bad = Object.assign({}, validFU, { followUpCaseId: 'case_A' });
  return FU.validateFollowUpLinkShape(bad).eligible === false;
})());
chk('F3: invalid parentStatus rejected', (function () {
  var bad = Object.assign({}, validFU, { parentStatus: 'unknown' });
  return FU.validateFollowUpLinkShape(bad).eligible === false;
})());
chk('F4: missing parentCaseId rejected', (function () {
  var bad = Object.assign({}, validFU, { parentCaseId: '' });
  return FU.validateFollowUpLinkShape(bad).eligible === false;
})());

// Section G — Aggregate index
console.log('Section G — aggregate index');
chk('G1: index re-exports all contracts', INDEX.experiment === EXP && INDEX.outcome === OUT && INDEX.controlVariables === CV && INDEX.caseTimeline === TL && INDEX.followUpLink === FU);
chk('G2: index API is frozen', Object.isFrozen(INDEX));

// Section H — Scope (no R3.0B case-record schema EXTENSION — only refs allowed)
console.log('Section H — scope: case-record-schema.js carries refs only (no R3.0E extension)');
(function () {
  // Per SKYLINE D12/E1 ruling: R3.0E MUST NOT extend the frozen R3.0B case-record schema
  // body. The existing schema already declares `experimentId` and `followUpCaseIds` as
  // ASSOCIATION REFS (id strings only) — these are NOT extensions. The forbidden patterns
  // are: (a) embedding R3.0E experiment objects inside the case record, (b) importing
  // contracts/r3.0e/* from case-record-schema.js, (c) adding R3.0E-specific outcome
  // classifier results into the case record.
  var schemaPath = path.join(__dirname, '..', 'renderer', 'js', 'case-record-schema.js');
  var src = fs.readFileSync(schemaPath, 'utf8');
  chk('H1: case-record-schema.js does NOT require contracts/r3.0e/',
    src.indexOf('contracts/r3.0e/') === -1);
  // No nested experiment object body — only the bare experimentId ref.
  chk('H2: case-record-schema.js does NOT embed R3.0E experiment object body',
    src.indexOf('expectedDirection') === -1
      && src.indexOf('expectedMagnitudeRange') === -1
      && src.indexOf('stopConditions') === -1);
  // No outcome classifier output embedded in the case record.
  chk('H3: case-record-schema.js does NOT embed R3.0E outcome classifier output',
    src.indexOf('comparabilityScore') === -1
      && src.indexOf('confounders') === -1
      && src.indexOf('OUTCOME_CLASS_ALLOWED') === -1);
  // experimentId / followUpCaseIds ARE allowed as id-only association refs.
  chk('H4: case-record-schema.js carries experimentId + followUpCaseIds as id refs (allowed)',
    src.indexOf('experimentId') !== -1 && src.indexOf('followUpCaseIds') !== -1);
})();

// Section I — Codex E1 R1 closures
console.log('Section I — Codex E1 R1 closures');

// I1 — E1-R1-01 closure: nested Symbol-keyed / accessor / non-plain prototype rejected
// at deep nesting (recursive descriptor audit).
(function () {
  var deepHostile = {
    schemaVersion: 1, linkId: 'l_test', parentCaseId: 'cA', followUpCaseId: 'cB',
    experimentId: 'e1', parentStatus: 'present', createdAt: '2026-06-30T00:00:00Z',
  };
  // Add Symbol-keyed own key on nested object — must be rejected
  var nestedAttack = {};
  nestedAttack[Symbol('hostile')] = 'leak';
  deepHostile.createdAt = '2026-06-30T00:00:00Z'; // unchanged scalar
  // We embed the Symbol-bearing nested object via array (since LINK_KEYS forbids unknown
  // own keys at top; we need a way to test nested. Use a structure that the validator
  // SHOULD walk via toCleanCopy + hasNonPlainNestedObject before the closed-key check.)
  // Per the R1-01 closure, hasNonPlainNestedObject must reject hostile-nested at any depth.
  chk('I1a: hasNonPlainNestedObject rejects nested Symbol-keyed own key',
    RC.hasNonPlainNestedObject({ a: { b: nestedAttack } }) === true);
  // Accessor descriptor at nested object → rejected
  var nestedAccessor = {};
  Object.defineProperty(nestedAccessor, 'inner', { enumerable: true, get: function () { return 1; } });
  chk('I1b: hasNonPlainNestedObject rejects nested accessor descriptor',
    RC.hasNonPlainNestedObject({ wrap: nestedAccessor }) === true);
  // Class instance nested → rejected
  function FakeClass() { this.x = 1; }
  chk('I1c: hasNonPlainNestedObject rejects nested class-instance prototype',
    RC.hasNonPlainNestedObject({ wrap: new FakeClass() }) === true);
  // Non-enumerable own → rejected
  var nestedNonEnum = {};
  Object.defineProperty(nestedNonEnum, 'hidden', { enumerable: false, value: 'x' });
  chk('I1d: hasNonPlainNestedObject rejects nested non-enumerable own key',
    RC.hasNonPlainNestedObject({ wrap: nestedNonEnum }) === true);
  // Plain deeply-nested → accepted
  chk('I1e: hasNonPlainNestedObject accepts deeply-nested plain object',
    RC.hasNonPlainNestedObject({ a: { b: { c: { d: 'value' } } } }) === false);
})();

// I2 — E1-R1-02 closure: timeline + follow-up schemaVersion>1 yields UNSUPPORTED_FUTURE_SCHEMA.
(function () {
  var futureTl = JSON.parse(JSON.stringify(validTL));
  futureTl.schemaVersion = 2;
  var rTL = TL.validateCaseTimelineShape(futureTl);
  chk('I2a: timeline schemaVersion=2 → UNSUPPORTED_FUTURE_SCHEMA (not TIMELINE_INVALID)',
    rTL.eligible === false && rTL.reasonCodes.indexOf('UNSUPPORTED_FUTURE_SCHEMA') !== -1);

  var futureFu = Object.assign({}, validFU, { schemaVersion: 2 });
  var rFU = FU.validateFollowUpLinkShape(futureFu);
  chk('I2b: follow-up-link schemaVersion=2 → UNSUPPORTED_FUTURE_SCHEMA',
    rFU.eligible === false && rFU.reasonCodes.indexOf('UNSUPPORTED_FUTURE_SCHEMA') !== -1);
})();

// I3 — E1-R1-03 closure: planned/draft experiments may not carry outcome.
(function () {
  var withOutcome = Object.assign({}, validExperiment, {
    status: 'planned',
    outcome: { observedResult: 'looks_good' },
  });
  var r = EXP.validateExperimentShape(withOutcome);
  chk('I3a: planned experiment with outcome rejected (OUTCOME_INVALID)',
    r.eligible === false && r.reasonCodes.indexOf('OUTCOME_INVALID') !== -1);
  // status=completed CAN carry outcome (plain object).
  var completedWithOutcome = Object.assign({}, validExperiment, {
    status: 'completed',
    outcome: { observedDirection: 'decrease' },
  });
  chk('I3b: completed experiment with plain outcome accepted',
    EXP.validateExperimentShape(completedWithOutcome).valid === true);
  // status=draft with outcome rejected.
  var draftWithOutcome = Object.assign({}, validExperiment, { status: 'draft', outcome: { x: 1 } });
  chk('I3c: draft experiment with outcome rejected',
    EXP.validateExperimentShape(draftWithOutcome).eligible === false);
})();

// I4 — E1-R1-04 closure: stopConditions cap + element-shape enforcement.
(function () {
  // Element with unknown key → rejected
  var badElem = Object.assign({}, validExperiment, {
    stopConditions: [{ i18nKey: 'r3.0e.stop.x', params: null, hostile: 'inject' }],
  });
  chk('I4a: stopConditions with unknown element key rejected',
    EXP.validateExperimentShape(badElem).eligible === false);
  // Element missing i18nKey → rejected
  var noKey = Object.assign({}, validExperiment, { stopConditions: [{ params: { x: 1 } }] });
  chk('I4b: stopConditions element missing i18nKey rejected',
    EXP.validateExperimentShape(noKey).eligible === false);
  // List > ARRAY_CAP rejected (build 33 entries; cap is 32).
  var bigList = [];
  for (var i = 0; i < 33; i++) bigList.push({ i18nKey: 'k.' + i, params: null });
  var bigExp = Object.assign({}, validExperiment, { stopConditions: bigList });
  chk('I4c: stopConditions list > ARRAY_CAP rejected',
    EXP.validateExperimentShape(bigExp).eligible === false);
})();

console.log('R3.0E E1 contract-foundation suite: ' + pass + ' passed, ' + fail + ' failed');
if (fail > 0) process.exit(1);
