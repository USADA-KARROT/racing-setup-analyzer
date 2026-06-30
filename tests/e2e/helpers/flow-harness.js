/**
 * tests/e2e/helpers/flow-harness.js — R3.0F F2 · logic-level E2E harness.
 *
 * Composes the production stack (R3.0B case + session storage, R3.0E experiment + outcome +
 * timeline + follow-up stores, R3.0F migration engine, R3.0C/D contracts) over MemoryBackend.
 * Provides scripted flow primitives so each E2E test file can drive a specific user journey
 * end-to-end without a browser or DOM. The 8 F2 flows assert post-state at each step the same
 * way the renderer would, exercising the same module surfaces.
 *
 * Design constraints:
 *   • Deterministic — same input + same injected clock → same output. NO Math.random / Date.now
 *     in the harness path; tests pass a stamp.
 *   • No external network — harness loads only local modules. Tests must not import network code.
 *   • No runtime LLM — VRE / Experiment flows use only the contract-validated authoritative
 *     outputs of the R3.0D / R3.0E modules.
 *   • No console error contract — harness installs a console.error / unhandledRejection guard;
 *     any test that triggers a console.error is a fail-closed result.
 *   • No stale UI contract — at module level this maps to "no stale references to a previously-
 *     active Case after a Case transition"; the harness exposes `assertNoStaleCaseRef(viewmodel)`.
 *   • Reuses MemoryBackend's transact + clone surface so the F1 migration engine, the R3.0B
 *     case-store / session-store, and the R3.0E stores all see the SAME backend instance.
 *
 * Public API:
 *   createFlowHarness({ stamp, maxJournalEntries? }) → {
 *     backend,           // R3.0B MemoryBackend instance
 *     caseStore,         // R3.0B CaseStore over backend
 *     sessionStore,      // R3.0B SessionStore over backend
 *     experimentStore,   // R3.0E ExperimentStore
 *     outcomeStore,      // R3.0E OutcomeStore
 *     timelineStore,     // R3.0E TimelineStore
 *     followupLinkStore, // R3.0E FollowUpLinkStore
 *     migrationEngine,   // R3.0F engine
 *     stamp,             // deterministic clock injected
 *     consoleErrorCount, // counter; 0 == flow had no console.error events
 *     assertNoStaleCaseRef(viewmodelLike),   // throws on stale reference detected
 *     dispose()          // restores console hooks
 *   }
 *
 * Failure semantics:
 *   - Any unexpected throw inside a flow callback is propagated to the test runner.
 *   - Any console.error or unhandledRejection during the flow increments consoleErrorCount
 *     so the test can chk('zero console error', consoleErrorCount === 0).
 *
 * UMD: Node only (E2E tests run under Node, never in browser).
 */
'use strict';
var SB   = require('../../../renderer/js/storage-backend.js');
var CRS  = require('../../../renderer/js/case-record-schema.js');
var MIG  = require('../../../renderer/js/schema-migration.js');
var CS   = require('../../../renderer/js/case-store.js');
var SS   = require('../../../renderer/js/session-store.js');
var E_ST = require('../../../renderer/js/r3-0e-stores.js');
var ENG  = require('../../../renderer/js/r3-0f-migration-engine.js');

function createFlowHarness(opts) {
  opts = opts || {};
  var stamp = opts.stamp || '2026-07-01T00:00:00.000Z';
  var backend = SB.MemoryBackend();

  var caseStore    = CS.createCaseStore(backend, { stamp: stamp });
  var sessionStore = SS.createSessionStore(backend, { stamp: stamp });
  // R3.0E stores expose factories under their module
  var experimentStore   = E_ST.createExperimentStore(backend);
  var outcomeStore      = E_ST.createOutcomeStore(backend);
  var timelineStore     = E_ST.createTimelineStore(backend);
  var followupLinkStore = E_ST.createFollowUpLinkStore(backend);

  var migrationEngine = ENG.createMigrationEngine({ backend: backend, stamp: stamp });

  // Console-error guard (no-stale-UI contract / zero-console-error contract).
  var consoleErrorCount = 0;
  var origError = console.error;
  console.error = function () { consoleErrorCount += 1; };
  var origUnhandled = process.listeners('unhandledRejection');
  function _unhandledHandler() { consoleErrorCount += 1; }
  process.on('unhandledRejection', _unhandledHandler);

  function dispose() {
    console.error = origError;
    process.removeListener('unhandledRejection', _unhandledHandler);
  }

  // No-stale-case-ref contract: after a Case transition, viewmodels MUST clear any reference
  // to the prior caseId. This helper inspects a viewmodel-like object (or the lastSession state)
  // and asserts no stale caseId exists relative to the current activeCaseId.
  function assertNoStaleCaseRef(viewmodelLike) {
    if (!viewmodelLike || typeof viewmodelLike !== 'object') return;
    var active = viewmodelLike.activeCaseId || viewmodelLike.caseId || null;
    var lastSession = viewmodelLike.lastSession || null;
    if (active && lastSession && lastSession.sourceCaseId && lastSession.sourceCaseId !== active) {
      throw new Error('STALE_CASE_REF: lastSession.sourceCaseId=' + lastSession.sourceCaseId + ' active=' + active);
    }
    if (viewmodelLike.cachedCaseId && active && viewmodelLike.cachedCaseId !== active) {
      throw new Error('STALE_CASE_REF: cachedCaseId=' + viewmodelLike.cachedCaseId + ' active=' + active);
    }
  }

  // Forbidden-action gate: documented invariants the engine must never permit during F2 E2E.
  // The harness exposes a quick boolean assertion helper for each.
  function assertForbiddenActionsDisabled(state) {
    if (!state || typeof state !== 'object') return;
    if (state.autoReferenceLap === true) throw new Error('FORBIDDEN: auto reference lap enabled');
    if (state.autoApplySetup === true) throw new Error('FORBIDDEN: auto apply setup enabled');
    if (state.runtimeLLMDecisionAuthority === true) throw new Error('FORBIDDEN: runtime LLM decision authority enabled');
    if (state.causationClaim === true) throw new Error('FORBIDDEN: causation claim enabled');
    if (state.driverBlame === true) throw new Error('FORBIDDEN: driver blame enabled');
  }

  return {
    backend: backend,
    caseStore: caseStore,
    sessionStore: sessionStore,
    experimentStore: experimentStore,
    outcomeStore: outcomeStore,
    timelineStore: timelineStore,
    followupLinkStore: followupLinkStore,
    migrationEngine: migrationEngine,
    stamp: stamp,
    get consoleErrorCount() { return consoleErrorCount; },
    resetConsoleErrorCount: function () { consoleErrorCount = 0; },
    assertNoStaleCaseRef: assertNoStaleCaseRef,
    assertForbiddenActionsDisabled: assertForbiddenActionsDisabled,
    dispose: dispose
  };
}

// Tiny test-runner helper used by every flow file. Mirrors the existing project style.
function makeChk() {
  var state = { pass: 0, fail: 0 };
  function chk(msg, cond, detail) {
    if (cond) state.pass += 1;
    else { state.fail += 1; console.log('  FAIL ' + msg + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); }
  }
  function report(label) {
    console.log(label + ': ' + state.pass + ' passed, ' + state.fail + ' failed');
    process.exit(state.fail === 0 ? 0 : 1);
  }
  return { chk: chk, report: report, state: state };
}

module.exports = {
  createFlowHarness: createFlowHarness,
  makeChk: makeChk
};
