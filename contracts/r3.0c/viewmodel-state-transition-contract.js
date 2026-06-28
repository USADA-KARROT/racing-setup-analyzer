/**
 * contracts/r3.0c/viewmodel-state-transition-contract.js — R3.0C C7 · Viewmodel state-transition.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-state-transition-contract.md:
 * codifies the seven transition triggers, the generation-token discipline, the placeholder shapes,
 * and the stale-token drop rule. The viewmodel implementation (renderer/js/r3-0c-comparison-
 * viewmodel.js) consumes this contract; adversarial tests verify each rule.
 *
 * Capability gate: governance/r3.0c/capabilities.json viewmodel_state_transition_contract.enabled
 * must be true for the viewmodel to take effect. The contract module loads regardless so tests
 * can pin the rules.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ViewmodelStateTransitionContract).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var RC = _req('./reason-codes.js', typeof R3_0C_ReasonCodes !== 'undefined' ? R3_0C_ReasonCodes : undefined);
  if (!RC) throw new Error('viewmodel-state-transition-contract.js requires reason-codes.js');
  var CODES = RC.REASON_CODES;

  // The seven transition triggers that MUST clear any prior comparison result and render a
  // placeholder state. Mirrors docs/r3.0c-state-transition-contract.md §"Transitions that force a
  // clear". Names are stable string constants; the viewmodel pattern-matches on them.
  var TRANSITION_TRIGGERS = Object.freeze([
    'reference_selection_changed',
    'comparison_selection_changed',
    'case_association_changed',
    'channel_mapping_changed',
    'case_reopen',
    'orchestrator_eligibility_revoked',
    'user_confirmed_authority_revoked',
  ]);

  // The canonical placeholder states the viewmodel emits during the transition window. The UI
  // x-show binds to these so the prior result is never rendered alongside a new selection.
  var PLACEHOLDER_STATES = Object.freeze({
    IDLE: 'idle',
    SELECTING: 'selecting',
    COMPUTING: 'computing',
    BLOCKED: 'blocked',
    UNAVAILABLE: 'unavailable',
    READY: 'ready',
  });

  // Token discipline: every comparison request the viewmodel issues to the orchestrator carries
  // a monotonically-increasing integer token. The viewmodel commits a result ONLY when the
  // returned token equals the latest issued token; stale-token results are dropped silently.
  // The token is opaque to the orchestrator (which echoes it back) — the viewmodel owns the
  // counter.
  var TOKEN_INVARIANTS = Object.freeze({
    monotonicIncreasing: true,
    issuedBeforeRequest: true,
    echoedInResult: true,
    staleResultsAreDropped: true,
    skippedTokensNeverReused: true,
  });

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }

  /**
   * isTransitionTrigger(name) — closed-allowlist gate. Anything outside fails closed at the
   * viewmodel layer.
   */
  function isTransitionTrigger(name) {
    return typeof name === 'string' && TRANSITION_TRIGGERS.indexOf(name) !== -1;
  }

  /**
   * isPlaceholderState(name) — closed-allowlist gate.
   */
  function isPlaceholderState(name) {
    if (typeof name !== 'string') return false;
    var keys = Object.keys(PLACEHOLDER_STATES);
    for (var i = 0; i < keys.length; i++) if (PLACEHOLDER_STATES[keys[i]] === name) return true;
    return false;
  }

  /**
   * validateGenerationToken(token, previous) — token must be a positive integer strictly greater
   * than the previous value (monotonic increasing, no reuse).
   */
  function validateGenerationToken(token, previous) {
    // integer check without Math.floor (contract files are scanned for "Math." as an algorithm
    // token — the validator must use built-in language predicates only).
    var isInt = (typeof Number.isInteger === 'function') ? Number.isInteger(token) : (typeof token === 'number' && isFinite(token) && (token | 0) === token);
    if (!isInt || token < 1) {
      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not a positive integer' };
    }
    if (typeof previous === 'number' && previous >= token) {
      return { valid: false, reasonCode: CODES.INTERNAL_CONTRACT_VIOLATION, detail: 'generationToken not monotonically increasing' };
    }
    return { valid: true };
  }

  /**
   * isResultStale(resultToken, latestToken) — returns true when the result MUST be dropped.
   * Used at viewmodel commit time.
   */
  function isResultStale(resultToken, latestToken) {
    if (typeof resultToken !== 'number' || typeof latestToken !== 'number') return true;
    return resultToken !== latestToken;
  }

  /**
   * placeholderForTrigger(trigger) — returns the canonical placeholder the viewmodel renders
   * after the listed trigger fires (before a new orchestrator response commits).
   *
   * - selection / association / channel changes → SELECTING (user is mid-change; computing has
   *   not started)
   * - case_reopen → IDLE (treat as cold state)
   * - orchestrator_eligibility_revoked / user_confirmed_authority_revoked → BLOCKED
   *
   * Any unknown trigger falls back to BLOCKED (defense in depth).
   */
  function placeholderForTrigger(trigger) {
    if (!isTransitionTrigger(trigger)) return PLACEHOLDER_STATES.BLOCKED;
    if (trigger === 'case_reopen') return PLACEHOLDER_STATES.IDLE;
    if (trigger === 'orchestrator_eligibility_revoked' || trigger === 'user_confirmed_authority_revoked') return PLACEHOLDER_STATES.BLOCKED;
    return PLACEHOLDER_STATES.SELECTING;
  }

  var api = {
    TRANSITION_TRIGGERS: TRANSITION_TRIGGERS,
    PLACEHOLDER_STATES: PLACEHOLDER_STATES,
    TOKEN_INVARIANTS: TOKEN_INVARIANTS,
    isTransitionTrigger: isTransitionTrigger,
    isPlaceholderState: isPlaceholderState,
    validateGenerationToken: validateGenerationToken,
    isResultStale: isResultStale,
    placeholderForTrigger: placeholderForTrigger,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ViewmodelStateTransitionContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
