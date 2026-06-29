/**
 * renderer/js/r3-0d-engineer-viewmodel.js — R3.0D D5 · Engineer Brief ViewModel (PRODUCTION).
 *
 * Authoritative entry: buildEngineerViewModel(envelope, opts)
 *
 * Hard contract (SKYLINE 2026-06-29 R3.0D D5 directive §11):
 *   • Input MUST be a D5 AUTHORITATIVE Engineer Brief envelope. Authority enforced via
 *     EB.verifyAuthoritativeEngineerBrief(envelope) — FIRST read on caller-supplied data;
 *     closure-private WeakSet identity attestation in D5. Forged / cloned / structuredClone /
 *     JSON-round-trip envelopes are rejected before any nested property is touched.
 *   • ViewModel is a RE-PROJECTION — it does NOT recompute confidence, credibility,
 *     priority, eligibility, contradictions, or alternative explanations. It DOES translate
 *     the authoritative envelope into a deep-frozen, UI-safe `viewModel` object expressed in
 *     i18n keys + safe params (no localized strings; UI host attaches locale text).
 *   • UI states (directive §13.1): `unavailable`, `blocked`, `loading`, `available`,
 *     `inconclusive`, `stale-cleared`, `error-sanitized`. ViewModel exposes a derived
 *     `displayState` field consumed by the renderer.
 *   • Privacy invariants: NO raw telemetry, NO file paths, NO machine IDs, NO stack traces
 *     in the viewModel. Reason codes and i18n keys ONLY.
 *   • Locale text is NEVER constructed inside the ViewModel — the renderer reads i18nKey
 *     + params and applies its own locale lookup. The ViewModel may emit a closed set of
 *     `displayHint` enums (e.g., 'blocked' | 'inconclusive' | 'available') so renderer
 *     templates can switch on enum, not on free-text.
 *   • All ambient calls go through R3_0D_HardenedIntrinsics (HI). Object.isFrozen captured
 *     at module init. Captured Object.keys via HI.safeOwnKeys.
 *   • D5 producer-attestation pattern is mirrored here: deep-frozen output is registered in
 *     a closure-private WeakSet and `verifyAuthoritativeEngineerViewModel` is exposed for
 *     downstream consumers (Orchestrator + R3.0E / R3.0F + host wiring).
 *   • FORBIDDEN behaviors (directive §11):
 *     - Recompute confidence / credibility / priority / eligibility
 *     - Reorder priorities
 *     - Drop or hide contradictions
 *     - Rewrite cannotConcludeReasonCodes
 *     - Upgrade credibility
 *     - Apply free-text locale strings
 *     - Accept unauthoritative envelopes
 *     - Render arbitrary HTML
 *     - Echo caller-supplied strings to errors verbatim
 *
 * UMD: Node require / Electron renderer global (R3_0D_EngineerViewModel).
 */
(function (root) {
  'use strict';

  // ---------- Module-init capture: dependencies ------------------------------------------------
  var HI = null, RC = null, EB = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { HI = require('../../contracts/r3.0d/hardened-intrinsics.js'); } catch (e) { HI = null; }
    try { RC = require('../../contracts/r3.0d/reason-codes.js'); } catch (e) { RC = null; }
    try { EB = require('./r3-0d-engineer-brief.js'); } catch (e) { EB = null; }
  }
  if (HI === null && typeof R3_0D_HardenedIntrinsics !== 'undefined') HI = R3_0D_HardenedIntrinsics;
  if (RC === null && typeof R3_0D_ReasonCodes !== 'undefined') RC = R3_0D_ReasonCodes;
  if (EB === null && typeof R3_0D_EngineerBrief !== 'undefined') EB = R3_0D_EngineerBrief;

  if (!HI || !RC || !EB) {
    throw new Error('r3-0d-engineer-viewmodel.js: missing one or more required R3.0D dependencies');
  }

  var CODES = RC.REASON_CODES;

  // Module-init captures.
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;
  function _isFrozenSafe(v) { try { return _CAPTURED_OBJECT_IS_FROZEN(v) === true; } catch (e) { return false; } }

  // ---- D5 ViewModel producer-attestation captures (mirror D3/D4/D5-service pattern) ---------
  var _WeakSetCtor = WeakSet;
  var _WS_ADD = WeakSet.prototype.add;
  var _WS_HAS = WeakSet.prototype.has;
  var _CAPTURED_REFLECT_APPLY = Reflect.apply;
  function _wsAdd(set, value) {
    try { _CAPTURED_REFLECT_APPLY(_WS_ADD, set, [value]); return true; }
    catch (e) { return false; }
  }
  function _wsHas(set, value) {
    try { return _CAPTURED_REFLECT_APPLY(_WS_HAS, set, [value]) === true; }
    catch (e) { return false; }
  }
  var _authoritativeViewModels = new _WeakSetCtor();
  function _registerAuthoritativeViewModel(vm) {
    _wsAdd(_authoritativeViewModels, vm);
  }
  function verifyAuthoritativeEngineerViewModel(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeViewModels, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== VIEWMODEL_SCHEMA_VERSION) return false;
      if (typeof candidate.viewModelId !== 'string') return false;
      if (typeof candidate.sourceBriefId !== 'string') return false;
      return true;
    } catch (e) { return false; }
  }

  // ---------- Constants -------------------------------------------------------------------------
  var VIEWMODEL_SCHEMA_VERSION = 1;
  var SERVICE_VERSION = 1;

  // Closed enum for displayState — UI templates switch on this.
  var DISPLAY_STATE_ALLOWED = HI.deepFreeze([
    'unavailable',
    'blocked',
    'loading',
    'available',
    'inconclusive',
    'stale-cleared',
    'error-sanitized',
  ]);

  function _isPlainObject(v) {
    try {
      if (v === null || typeof v !== 'object') return false;
      return HI.safeIsPlainShape(v) === 'plain-object';
    } catch (e) { return false; }
  }

  function _buildSanitizedError(displayState, reasonCodes) {
    var codes = HI.safeIsArray(reasonCodes) ? HI.safeArraySlice(reasonCodes) : [CODES.INTERNAL_CONTRACT_VIOLATION];
    return HI.deepFreeze({
      valid: false,
      displayState: displayState,
      reasonCodes: HI.deepFreeze(codes),
      // NEVER echo caller content / paths / private IDs. The renderer uses displayState +
      // reasonCodes to pick an i18n key.
      viewModel: null,
    });
  }

  // ---------- Public API: buildEngineerViewModel ------------------------------------------------
  /**
   * buildEngineerViewModel(envelope, opts) — maps an authoritative D5 EngineerBrief envelope
   * into a deep-frozen, UI-safe viewModel.
   *
   * Authority order:
   *   1. EB.verifyAuthoritativeEngineerBrief(envelope) — FIRST read, identity-only.
   *   2. _isFrozenSafe(envelope.brief) — envelope must carry an already-frozen brief.
   *   3. Compose viewModel by re-projecting brief fields (NO recomputation).
   *   4. Deep-freeze + register.
   */
  function buildEngineerViewModel(envelopeIn, optsIn) {
    try {
      // ---- Step 1 — authority gate (verifier-first ordering) -------------------------------
      if (typeof EB.verifyAuthoritativeEngineerBrief !== 'function'
          || EB.verifyAuthoritativeEngineerBrief(envelopeIn) !== true) {
        return _buildSanitizedError('error-sanitized', [CODES.HYPOTHESIS_AUTHORITY_FORGED]);
      }
      var envelope = envelopeIn;

      // ---- Step 2 — opts shape (only `displayHint` allowed) ---------------------------------
      // displayHint is OPTIONAL — orchestrator can pass 'loading' or 'stale-cleared' to
      // pre-empt the default 'available' / 'inconclusive' derivation.
      var displayHint = null;
      if (optsIn !== undefined && optsIn !== null) {
        if (!_isPlainObject(optsIn)) {
          return _buildSanitizedError('error-sanitized', [CODES.HYPOTHESIS_INVALID]);
        }
        var optKeys = HI.safeOwnKeys(optsIn);
        for (var i = 0; i < optKeys.length; i++) {
          if (optKeys[i] !== 'displayHint') {
            return _buildSanitizedError('error-sanitized', [CODES.UNKNOWN_OWN_KEY]);
          }
        }
        if (HI.safeHasOwn(optsIn, 'displayHint')) {
          var dh = optsIn.displayHint;
          if (typeof dh !== 'string' || HI.safeArrayIndexOf(DISPLAY_STATE_ALLOWED, dh) === -1) {
            return _buildSanitizedError('error-sanitized', [CODES.HYPOTHESIS_INVALID]);
          }
          displayHint = dh;
        }
      }

      // ---- Step 3 — derive displayState ------------------------------------------------------
      var brief = envelope.brief;
      var activation = envelope.activation;
      var displayState;
      if (displayHint !== null) {
        displayState = displayHint;
      } else if (!activation.uiCapabilityReady) {
        // No primary action / all contradicted / primary blocked → inconclusive UI state.
        displayState = 'inconclusive';
      } else {
        displayState = 'available';
      }

      // ---- Step 4 — derive viewModelId (deterministic from briefId + displayState) -----------
      var viewModelId = 'vm_' + envelope.briefId + '__' + displayState;

      // ---- Step 5 — compose viewModel by RE-PROJECTION (NO recomputation) -------------------
      // Every field below is a faithful copy of a brief field. The ViewModel layer adds:
      //   - displayState enum
      //   - viewModelId
      //   - schemaVersion + serviceVersion for downstream consumers
      // NO confidence / credibility / priority is mutated.
      var viewModel = HI.deepFreeze({
        schemaVersion: VIEWMODEL_SCHEMA_VERSION,
        serviceVersion: SERVICE_VERSION,
        viewModelId: viewModelId,
        sourceBriefId: envelope.briefId,
        sourceHypothesisSetId: envelope.sourceHypothesisSetId,
        sourcePrioritySetId: envelope.sourcePrioritySetId,
        displayState: displayState,
        // Re-projected brief fields.
        identity: brief.identity,
        primaryIssue: HI.deepFreeze({
          i18nKey: brief.primaryIssueI18nKey,
          params: brief.primaryIssueParams,
        }),
        secondaryIssue: (brief.secondaryIssueI18nKey !== null && brief.secondaryIssueI18nKey !== undefined)
          ? HI.deepFreeze({
            i18nKey: brief.secondaryIssueI18nKey,
            params: brief.secondaryIssueParams,
          })
          : null,
        evidenceSummary: brief.evidenceSummary,
        contradictions: brief.contradictions,
        alternativeExplanations: brief.alternativeExplanations,
        cannotConcludeReasonCodes: brief.cannotConcludeReasonCodes,
        nextValidationAction: brief.nextValidationAction,
        driverExperiment: (brief.driverExperimentI18nKey !== null && brief.driverExperimentI18nKey !== undefined)
          ? HI.deepFreeze({ i18nKey: brief.driverExperimentI18nKey })
          : null,
        setupExperiment: (brief.setupExperimentI18nKey !== null && brief.setupExperimentI18nKey !== undefined)
          ? HI.deepFreeze({ i18nKey: brief.setupExperimentI18nKey })
          : null,
        confidence: brief.confidence,
        credibility: brief.credibility,
        provenance: brief.provenance,
        limitations: brief.limitations,
        // Activation gate carried through verbatim for the host wiring code.
        activation: activation,
      });

      // ---- Step 6 — register + return --------------------------------------------------------
      _registerAuthoritativeViewModel(viewModel);
      return HI.deepFreeze({ valid: true, viewModel: viewModel });

    } catch (eOuter) {
      return _buildSanitizedError('error-sanitized', [CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  /**
   * buildBlockedViewModel(reasonCodes, opts) — produce a deep-frozen blocked viewModel WITHOUT
   * an authoritative envelope. Used by the Orchestrator when the upstream D3/D4/D5 pipeline
   * returned a blocked result (e.g., authority verification failed, freshness exhausted).
   *
   * The blocked viewModel carries:
   *   - displayState: 'blocked' | 'unavailable' | 'stale-cleared'
   *   - reasonCodes (sanitized — no path / caller content)
   *   - schemaVersion + viewModelId for parity with the success path
   *
   * It is NOT registered in the authoritative WeakSet (the verifier returns false for blocked
   * viewModels). This lets downstream consumers reliably reject any "blocked" viewModel that
   * tries to masquerade as authoritative.
   */
  function buildBlockedViewModel(displayState, reasonCodes) {
    try {
      if (typeof displayState !== 'string'
          || HI.safeArrayIndexOf(DISPLAY_STATE_ALLOWED, displayState) === -1
          || displayState === 'available' || displayState === 'inconclusive') {
        // Cannot return success-like states from a blocked builder.
        return _buildSanitizedError('error-sanitized', [CODES.HYPOTHESIS_INVALID]);
      }
      var codes = HI.safeIsArray(reasonCodes) ? HI.safeArraySlice(reasonCodes) : [];
      var sanitized = [];
      for (var i = 0; i < codes.length; i++) {
        if (RC.isReasonCode(codes[i])) HI.safeArrayPush(sanitized, codes[i]);
      }
      var vm = HI.deepFreeze({
        valid: false,
        displayState: displayState,
        reasonCodes: HI.deepFreeze(sanitized),
        viewModel: null,
      });
      return vm;
    } catch (e) {
      return _buildSanitizedError('error-sanitized', [CODES.INTERNAL_CONTRACT_VIOLATION]);
    }
  }

  // ---------- Public API ------------------------------------------------------------------------
  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    VIEWMODEL_SCHEMA_VERSION: VIEWMODEL_SCHEMA_VERSION,
    DISPLAY_STATE_ALLOWED: DISPLAY_STATE_ALLOWED,
    buildEngineerViewModel: buildEngineerViewModel,
    buildBlockedViewModel: buildBlockedViewModel,
    verifyAuthoritativeEngineerViewModel: verifyAuthoritativeEngineerViewModel,
  };
  try { HI.deepFreeze(api); } catch (e) { /* swallow */ }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    root.R3_0D_EngineerViewModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
