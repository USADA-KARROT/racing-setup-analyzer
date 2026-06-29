/**
 * renderer/js/r3-0d-engineer-orchestrator.js — R3.0D D5 · Engineer Brief Orchestrator (PRODUCTION).
 *
 * Authoritative entry points:
 *   • prepareEngineerInsight({ hypothesisSet, prioritySet, generationToken }, opts)
 *   • currentState()
 *   • invalidate(reasonCode, contextSnapshot?)
 *   • subscribe(listener)
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0D D5 directive §12):
 *   • Pipeline: authoritative D3 + D4 snapshots
 *       → EB.buildEngineerBrief() (D5 service)
 *       → VM.buildEngineerViewModel() (D5 viewmodel)
 *       → publish current state
 *   • Generation token: a caller-supplied opaque string that identifies the active D3/D4
 *     computation cohort. Stale callbacks / promises returning with an OLDER token are
 *     DROPPED (never back-fill the current viewmodel).
 *   • State invalidation events (directive §12.1) — all clear current viewmodel + bump token:
 *       case changed, session changed, evidence graph changed, hypothesis set changed,
 *       priority set changed, mapping changed, calibration changed, telemetry replaced,
 *       case archived, case deleted, imported summary opened, generation token changed.
 *   • Error handling (directive §12.2): blocked / forged / stale inputs surface as
 *     sanitized error states with displayState ∈ {'unavailable','blocked','stale-cleared',
 *     'error-sanitized'}. NEVER echo caller paths / private IDs / stack traces.
 *   • Subscribers receive a structured-clone-safe snapshot of the new viewmodel. The
 *     authoritative WeakSet identity stays inside the orchestrator; listeners get a
 *     non-authoritative shallow snapshot. (A renderer reading the snapshot CANNOT spoof
 *     the authoritative viewmodel back into another consumer.)
 *   • All ambient calls go through HI. Module-init captures.
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerOrchestrator).
 */
(function (root) {
  'use strict';

  // ---------- Module-init capture: dependencies ------------------------------------------------
  var HI = null, RC = null, EB = null, VM = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { EB = require('./r3-0d-engineer-brief.js'); } catch (e) { EB = null; }
    try { VM = require('./r3-0d-engineer-viewmodel.js'); } catch (e) { VM = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (EB === null && typeof R3_0D_EngineerBrief !== 'undefined') EB = R3_0D_EngineerBrief;
  if (VM === null && typeof R3_0D_EngineerViewModel !== 'undefined') VM = R3_0D_EngineerViewModel;

  if (!HI || !RC || !EB || !VM) {
    throw new Error('r3-0d-engineer-orchestrator.js: missing one or more required R3.0D dependencies');
  }

  var CODES = RC.REASON_CODES;

  // Module-init captures.
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;

  // ---------- Closed enum: invalidation reasons ------------------------------------------------
  var INVALIDATION_REASONS = HI.deepFreeze([
    'case_changed',
    'session_changed',
    'evidence_graph_changed',
    'hypothesis_set_changed',
    'priority_set_changed',
    'mapping_changed',
    'calibration_changed',
    'telemetry_replaced',
    'case_archived',
    'case_deleted',
    'imported_summary_opened',
    'generation_token_changed',
    'application_restart',
  ]);

  // ---------- Internal state ------------------------------------------------------------------
  // State is intentionally module-scoped — single Orchestrator per renderer process. Callers
  // requiring multiple independent orchestrators can build adapters; the production wiring
  // uses one global.
  var _currentEnvelope = null;   // D5 authoritative envelope (or null)
  var _currentViewModel = null;  // D5 viewModel wrapper { valid, viewModel } (or blocked vm)
  var _currentToken = null;      // Active generation token (string or null)
  var _currentCase = null;       // { caseId, sessionId, lapId } snapshot
  var _internalSeq = 0;          // Monotonic counter — prevents stale async callbacks
  var _subscribers = [];         // List of listener functions
  // Codex D5 R2-01 closure: retired-tokens set. Once a generation token is superseded by a
  // newer successful publish OR by invalidate(), it is added here and any subsequent
  // prepareEngineerInsight that re-uses the same token is REJECTED with stale-cleared. This
  // prevents an older token from replaying after a newer one has already published —
  // closing the "publish(B) then replay(A) overwrites B" race that the bare _internalSeq
  // bump does not catch (the replay's seqAtEntry equals _internalSeq at the time of replay,
  // so the seq gate alone would let it through).
  var _retiredTokens = HI.safeObjectCreateNull();

  // ---------- Helpers --------------------------------------------------------------------------
  function _isPlainObject(v) {
    try {
      if (v === null || typeof v !== 'object') return false;
      return HI.safeIsPlainShape(v) === 'plain-object';
    } catch (e) { return false; }
  }
  function _isFrozenSafe(v) { try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; } catch (e) { return false; } }

  function _snapshotAssociation(ca) {
    if (!_isPlainObject(ca)) return null;
    return HI.deepFreeze({
      caseId: typeof ca.caseId === 'string' ? ca.caseId : null,
      sessionId: typeof ca.sessionId === 'string' ? ca.sessionId : null,
      lapId: typeof ca.lapId === 'string' ? ca.lapId : null,
    });
  }

  // Build a sanitized snapshot for subscribers. The snapshot is a NEW deep-frozen object —
  // it does NOT carry the authoritative WeakSet identity. Listeners cannot use it to
  // bypass producer attestation.
  function _buildSubscriberSnapshot(viewModelResult, association, generationToken) {
    var snapshot = HI.deepFreeze({
      valid: viewModelResult.valid === true,
      displayState: viewModelResult.valid === true ? viewModelResult.viewModel.displayState : viewModelResult.displayState,
      reasonCodes: viewModelResult.valid === true ? HI.deepFreeze([]) : (viewModelResult.reasonCodes || HI.deepFreeze([])),
      sourceBriefId: viewModelResult.valid === true ? viewModelResult.viewModel.sourceBriefId : null,
      sourceHypothesisSetId: viewModelResult.valid === true ? viewModelResult.viewModel.sourceHypothesisSetId : null,
      sourcePrioritySetId: viewModelResult.valid === true ? viewModelResult.viewModel.sourcePrioritySetId : null,
      caseAssociation: association,
      generationToken: typeof generationToken === 'string' ? generationToken : null,
      activation: viewModelResult.valid === true ? viewModelResult.viewModel.activation : null,
    });
    return snapshot;
  }

  function _notifySubscribers(snapshot) {
    // Use a snapshot copy of the subscribers array so a listener that subscribes/unsubscribes
    // during notification does NOT corrupt iteration.
    var listeners = HI.safeArraySlice(_subscribers);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](snapshot); } catch (e) { /* fail-closed; never let a listener throw out */ }
    }
  }

  // ---------- Public API: prepareEngineerInsight ------------------------------------------------
  /**
   * prepareEngineerInsight({ hypothesisSet, prioritySet, generationToken }, opts) —
   *   1. Bump internal sequence + capture local snapshot ID.
   *   2. Build D5 brief envelope.
   *   3. Build D5 viewmodel.
   *   4. If still latest (no invalidation occurred mid-build), publish + notify.
   *   5. Return the result either way (blocked or success).
   */
  function prepareEngineerInsight(inputIn, optsIn) {
    // Codex D5 R1-01 closure: bump _internalSeq at the START of every prepare call so any
    // concurrent / replayed / out-of-order prepare result whose seqAtEntry no longer matches
    // _internalSeq is dropped at the publish gate (Step 4 below). Without this, a later
    // prepare(token=B) could be observed BEFORE an earlier prepare(token=A) and the earlier
    // result would still publish, overwriting the newer state. With the per-call bump, the
    // earlier call's seqAtEntry < _internalSeq at publish time → dropped.
    _internalSeq += 1;
    var seqAtEntry = _internalSeq;

    // ---- Step 1 — basic input shape ----------------------------------------------------------
    if (!_isPlainObject(inputIn)) {
      var blocked = VM.buildBlockedViewModel('error-sanitized', [CODES.HYPOTHESIS_INVALID]);
      _maybePublishBlocked(blocked, null, null, seqAtEntry);
      return HI.deepFreeze({ valid: false, viewModel: blocked, displayState: 'error-sanitized' });
    }
    var allowedKeys = ['hypothesisSet', 'prioritySet', 'generationToken'];
    var keys = HI.safeOwnKeys(inputIn);
    for (var ki = 0; ki < keys.length; ki++) {
      if (HI.safeArrayIndexOf(allowedKeys, keys[ki]) === -1) {
        var blockedKey = VM.buildBlockedViewModel('error-sanitized', [CODES.UNKNOWN_OWN_KEY]);
        _maybePublishBlocked(blockedKey, null, null, seqAtEntry);
        return HI.deepFreeze({ valid: false, viewModel: blockedKey, displayState: 'error-sanitized' });
      }
    }

    var hypothesisSet = inputIn.hypothesisSet;
    var prioritySet = inputIn.prioritySet;
    var generationToken = inputIn.generationToken;

    if (typeof generationToken !== 'string' || generationToken.length === 0) {
      var blockedTok = VM.buildBlockedViewModel('error-sanitized', [CODES.HYPOTHESIS_INVALID]);
      _maybePublishBlocked(blockedTok, null, null, seqAtEntry);
      return HI.deepFreeze({ valid: false, viewModel: blockedTok, displayState: 'error-sanitized' });
    }

    // ---- Codex D5 R2-01 closure: retired-token replay rejection -----------------------------
    // A retired token is one that was previously the active token and has since been
    // superseded by a newer successful publish OR by invalidate(). Re-using it would
    // overwrite the current state with stale content. Drop with stale-cleared.
    if (HI.safeHasOwn(_retiredTokens, generationToken)) {
      var blockedReplay = VM.buildBlockedViewModel('stale-cleared', [CODES.STALE_EVIDENCE]);
      // Do NOT mutate _currentEnvelope / _currentViewModel — the legitimate current state
      // (which carries a NEWER token) must remain visible. The blocked result is returned
      // to the caller so they can log it, but the orchestrator does NOT publish over the
      // active state.
      return HI.deepFreeze({ valid: false, viewModel: blockedReplay, displayState: 'stale-cleared' });
    }

    // ---- Step 2 — build D5 envelope (handles its own authority gates) -----------------------
    var ebInput = HI.deepFreeze({ hypothesisSet: hypothesisSet, prioritySet: prioritySet });
    var ebOpts = optsIn === undefined ? undefined : optsIn;
    var ebResult = EB.buildEngineerBrief(ebInput, ebOpts);

    if (!(ebResult && ebResult.valid === true)) {
      // Brief build blocked → blocked viewmodel, no publication of an authoritative state.
      var blockedEb = VM.buildBlockedViewModel('blocked',
        (ebResult && HI.safeIsArray(ebResult.reasonCodes)) ? ebResult.reasonCodes : [CODES.HYPOTHESIS_AUTHORITY_FORGED]);
      _maybePublishBlocked(blockedEb, _associationFromInputs(hypothesisSet, prioritySet), generationToken, seqAtEntry);
      return HI.deepFreeze({ valid: false, viewModel: blockedEb, displayState: 'blocked' });
    }

    // ---- Step 3 — build viewmodel ------------------------------------------------------------
    var vmResult = VM.buildEngineerViewModel(ebResult.engineerBrief, undefined);
    if (!(vmResult && vmResult.valid === true)) {
      var blockedVm = VM.buildBlockedViewModel('error-sanitized', [CODES.INTERNAL_CONTRACT_VIOLATION]);
      _maybePublishBlocked(blockedVm, _associationFromInputs(hypothesisSet, prioritySet), generationToken, seqAtEntry);
      return HI.deepFreeze({ valid: false, viewModel: blockedVm, displayState: 'error-sanitized' });
    }

    // ---- Step 4 — staleness check ------------------------------------------------------------
    // If _internalSeq has advanced since we entered (e.g., invalidate() was called in between),
    // the build result is STALE — drop it on the floor. The caller still receives the result
    // (so they can log it locally), but the orchestrator state stays cleared.
    if (_internalSeq !== seqAtEntry) {
      // Stale — explicitly do NOT publish, do NOT notify subscribers.
      return HI.deepFreeze({
        valid: false,
        viewModel: VM.buildBlockedViewModel('stale-cleared', [CODES.STALE_EVIDENCE]),
        displayState: 'stale-cleared',
      });
    }

    // ---- Step 5 — publish + notify -----------------------------------------------------------
    // Codex D5 R2-01 closure: when a NEW token supersedes the previous _currentToken, retire
    // the old token so a future replay cannot overwrite this newer publish.
    if (_currentToken !== null && _currentToken !== generationToken) {
      HI.safeDefineDataProperty(_retiredTokens, _currentToken, true);
    }
    _currentEnvelope = ebResult.engineerBrief;
    _currentViewModel = vmResult;
    _currentToken = generationToken;
    _currentCase = HI.deepFreeze({
      caseId: ebResult.engineerBrief.brief.identity.caseId,
      sessionId: ebResult.engineerBrief.brief.identity.sessionId,
      lapId: ebResult.engineerBrief.brief.identity.lapId,
    });

    var snapshot = _buildSubscriberSnapshot(vmResult, _currentCase, generationToken);
    _notifySubscribers(snapshot);

    return HI.deepFreeze({ valid: true, viewModel: vmResult.viewModel, displayState: vmResult.viewModel.displayState });
  }

  // ---------- Public API: currentState ----------------------------------------------------------
  /**
   * currentState() — returns a snapshot of the published viewmodel state, or null if nothing
   * is published. The snapshot is a deep-frozen plain object — NOT the authoritative
   * viewmodel (callers cannot use it to spoof producer attestation).
   */
  function currentState() {
    if (_currentViewModel === null) return null;
    return _buildSubscriberSnapshot(_currentViewModel, _currentCase, _currentToken);
  }

  // ---------- Public API: getCurrentAuthoritativeEnvelope ---------------------------------------
  /**
   * getCurrentAuthoritativeEnvelope() — returns the authoritative D5 envelope (or null).
   * Used by the host wiring code that needs to pass the authoritative reference to
   * downstream R3.0E / R3.0F consumers. The returned reference IS in the D5 authoritative
   * WeakSet — caller MUST treat it as a sealed authority and NOT mutate / clone / forward
   * to untrusted consumers.
   */
  function getCurrentAuthoritativeEnvelope() {
    return _currentEnvelope;
  }
  function getCurrentAuthoritativeViewModel() {
    return (_currentViewModel && _currentViewModel.valid === true) ? _currentViewModel.viewModel : null;
  }

  // ---------- Public API: invalidate ------------------------------------------------------------
  /**
   * invalidate(reasonCode, contextSnapshot?) — clears the published viewmodel + bumps the
   * internal sequence so any in-flight stale callback is dropped. Notifies subscribers with
   * a stale-cleared snapshot.
   */
  function invalidate(reasonCode, contextSnapshot) {
    if (typeof reasonCode !== 'string'
        || HI.safeArrayIndexOf(INVALIDATION_REASONS, reasonCode) === -1) {
      // Unknown invalidation reason — still treat as a sanitized error to fail closed.
      reasonCode = 'application_restart';
    }
    _internalSeq += 1;
    // Codex D5 R2-01 closure: retire the current token on invalidate so a stale prepare
    // (e.g., the host re-uses the previous token after a case/session switch) cannot
    // overwrite the cleared state.
    if (_currentToken !== null) {
      HI.safeDefineDataProperty(_retiredTokens, _currentToken, true);
    }
    // Drop the authoritative envelope (no producer-attestation reference survives across
    // invalidation), but keep a non-authoritative stale-cleared viewmodel so the UI shell
    // can render an explicit "cleared" state instead of going blank.
    _currentEnvelope = null;
    var staleVm = VM.buildBlockedViewModel('stale-cleared',
      _mapInvalidationReasonToCode(reasonCode));
    _currentViewModel = staleVm;
    _currentToken = null;
    _currentCase = _isPlainObject(contextSnapshot) ? _snapshotAssociation(contextSnapshot) : null;

    var snap = _buildSubscriberSnapshot(staleVm, _currentCase, null);
    _notifySubscribers(snap);
  }

  function _mapInvalidationReasonToCode(reason) {
    if (reason === 'imported_summary_opened') return [CODES.STALE_EVIDENCE, CODES.LIMITATION_IMPORTED_SUMMARY];
    if (reason === 'case_deleted' || reason === 'case_archived') return [CODES.STALE_EVIDENCE];
    return [CODES.STALE_EVIDENCE];
  }

  // ---------- Public API: subscribe -------------------------------------------------------------
  /**
   * subscribe(listener) — registers a snapshot listener. Returns an unsubscribe function.
   * The listener is called synchronously after publish / invalidate. It receives a
   * deep-frozen plain-object snapshot — never the authoritative viewmodel.
   *
   * Listener errors are SWALLOWED (never propagate up). This prevents a misbehaving renderer
   * from preventing other listeners from receiving updates.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      return function () { /* noop unsubscribe */ };
    }
    HI.safeArrayPush(_subscribers, listener);
    return function unsubscribe() {
      var i = HI.safeArrayIndexOf(_subscribers, listener);
      if (i !== -1) _subscribers.splice(i, 1);
    };
  }

  // ---------- Internal helpers ------------------------------------------------------------------
  function _associationFromInputs(hs, ps) {
    // Best-effort: pull caseAssociation from the authoritative envelope if possible. Both hs
    // and ps carry caseAssociation; we prefer ps (D4 is the most recent authoritative layer).
    try {
      if (ps && _isPlainObject(ps.caseAssociation)) {
        return _snapshotAssociation(ps.caseAssociation);
      }
      if (hs && _isPlainObject(hs.caseAssociation)) {
        return _snapshotAssociation(hs.caseAssociation);
      }
    } catch (e) { /* swallow */ }
    return null;
  }

  function _maybePublishBlocked(blockedVm, association, generationToken, seqAtEntry) {
    if (_internalSeq !== seqAtEntry) {
      // Stale — do not publish.
      return;
    }
    // Blocked publication: clear authoritative envelope/viewmodel but expose the blocked
    // displayState to subscribers. The UI can render a sanitized "unavailable" / "blocked"
    // panel.
    _currentEnvelope = null;
    _currentViewModel = blockedVm;
    _currentToken = (typeof generationToken === 'string') ? generationToken : null;
    _currentCase = association;
    var snap = _buildSubscriberSnapshot(blockedVm, association, _currentToken);
    _notifySubscribers(snap);
  }

  // ---------- Test-only reset (gated; safe for production) -------------------------------------
  // Production builds NEVER call this. The renderer wiring uses invalidate() for state
  // changes. _resetForTests is exposed under the `__test` namespace so its mere existence
  // does NOT pollute the production API surface — Codex audit pattern.
  function _resetForTests() {
    _internalSeq += 1;
    _currentEnvelope = null;
    _currentViewModel = null;
    _currentToken = null;
    _currentCase = null;
    _subscribers = [];
    // Codex D5 R2-01 closure: tests need a clean retired-tokens map between runs so an
    // earlier test's token reuse doesn't leak into a later test. _resetForTests is the
    // gated test-only entry point per the existing convention.
    _retiredTokens = HI.safeObjectCreateNull();
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    INVALIDATION_REASONS: INVALIDATION_REASONS,
    prepareEngineerInsight: prepareEngineerInsight,
    currentState: currentState,
    getCurrentAuthoritativeEnvelope: getCurrentAuthoritativeEnvelope,
    getCurrentAuthoritativeViewModel: getCurrentAuthoritativeViewModel,
    invalidate: invalidate,
    subscribe: subscribe,
    __test: HI.deepFreeze({ resetForTests: _resetForTests }),
  };
  try { HI.deepFreeze(api); } catch (e) { /* swallow */ }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_EngineerOrchestrator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
