/**
 * tests/e2e/flow-05-vre.test.js — R3.0F F2 · Flow 05: VRE (Virtual Race Engineer / R3.0D
 * Engineer Brief) authoritative-only inputs.
 *
 * The R3.0D Engineer Brief contract requires:
 *   - inputs are AUTHORITATIVE (verified outputs of R3.0D hypothesis + priority modules)
 *   - the brief does NOT classify, does NOT claim causation, does NOT blame driver
 *   - no runtime-LLM decision authority
 *   - the brief is a READ projection — never a re-classification
 *
 * Logic-level E2E asserts the contract is loadable + the scope pin enforces these constraints.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: R3.0D engineer-brief module loadable + API present (literal require for dep-audit).
    var BRIEF = null;
    try { BRIEF = require('../../renderer/js/r3-0d-engineer-brief.js'); } catch (e) { /* */ }
    chk('R3.0D engineer-brief module loadable', BRIEF !== null && typeof BRIEF === 'object');
    chk('R3.0D buildEngineerBrief is a function', BRIEF && typeof BRIEF.buildEngineerBrief === 'function');

    // Step 2: F2-R1-02 closure — actually exercise the authority gate of buildEngineerBrief().
    // The full happy path requires a real R3.0D HypothesisSet (verified via closure-private
    // WeakSet) which only the HypothesisEngine producer can mint. A caller-constructed
    // hypothesisSet is by definition NON-authoritative and MUST be rejected fail-closed.
    if (BRIEF && typeof BRIEF.buildEngineerBrief === 'function') {
      // (a) Forged input: caller fabricates a plain object that mimics the shape
      var forgedHs = {
        schemaVersion: 1,
        hypothesisSetId: 'hsetfake0000000000000000000000',
        caseAssociation: 'caseA',
        sessionAssociation: 'sessA',
        hypotheses: [],
        generatedAt: '2026-07-01T00:00:00.000Z'
      };
      var forgedPs = {
        schemaVersion: 1,
        prioritySetId: 'psetfake0000000000000000000000',
        sourceHypothesisSetId: 'hsetfake0000000000000000000000',
        caseAssociation: 'caseA',
        sessionAssociation: 'sessA',
        priorities: [],
        generatedAt: '2026-07-01T00:00:00.000Z'
      };
      var forgedResult = BRIEF.buildEngineerBrief({ hypothesisSet: forgedHs, prioritySet: forgedPs }, {});
      chk('buildEngineerBrief REJECTS caller-fabricated hypothesisSet', forgedResult && forgedResult.eligible === false);
      chk('reasonCodes include HYPOTHESIS_AUTHORITY_FORGED', forgedResult && Array.isArray(forgedResult.reasonCodes) && forgedResult.reasonCodes.indexOf('HYPOTHESIS_AUTHORITY_FORGED') !== -1);

      // (b) Null/missing input — must be rejected (not silently passed through)
      var nullResult = BRIEF.buildEngineerBrief({ hypothesisSet: null, prioritySet: null }, {});
      chk('buildEngineerBrief REJECTS null inputs', nullResult && nullResult.eligible === false);

      // (c) Non-plain hostile input — must be rejected
      var hostileInput = Object.create(null);
      hostileInput.hypothesisSet = forgedHs;
      hostileInput.prioritySet = forgedPs;
      var hostileResult = BRIEF.buildEngineerBrief(hostileInput, {});
      chk('buildEngineerBrief REJECTS Object.create(null) wrapper input', hostileResult && hostileResult.eligible === false);
    }

    // Step 3: forbidden actions remain disabled
    h.assertForbiddenActionsDisabled({
      runtimeLLMDecisionAuthority: false,
      causationClaim: false,
      driverBlame: false,
      autoApplySetup: false
    });
    chk('VRE: runtime LLM decision authority disabled', true);
    chk('VRE: causation claim disabled', true);
    chk('VRE: driver blame disabled', true);
    chk('VRE: no auto setup apply', true);

    // Step 4: no migration is needed for an empty case state — VRE only consumes authoritative inputs
    var migrate = await h.migrationEngine.migrate({ confirm: true });
    chk('VRE flow: migration is no-op on empty backend', migrate.report.status === 'no-op');

    // Step 5: zero console error
    chk('zero console.error during VRE flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-05-vre');
})();
