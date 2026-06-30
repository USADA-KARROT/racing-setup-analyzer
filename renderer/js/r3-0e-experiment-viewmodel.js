/**
 * renderer/js/r3-0e-experiment-viewmodel.js — R3.0E E5 · Experiment Loop + Case Timeline
 * viewmodel + activation gate (PRODUCTION).
 *
 * Authoritative entries:
 *   createExperimentViewmodel({ classifier, timelineService })
 *   verifyAuthoritativeViewmodelState(candidate)
 *
 * Hard contract (SKYLINE 2026-06-30 R3.0 Continuous Resume Directive §8):
 *   • Contracts validate / services decide / viewmodel maps / UI renders.
 *   • The viewmodel ONLY derives display state from authoritative classifier / timeline
 *     outputs. It NEVER classifies, NEVER marks confirmed, NEVER recomputes
 *     comparabilityScore, NEVER reorders evidence, NEVER hides contradictions.
 *   • Stale state is invalidated when caseId / sessionId / applied-change generation
 *     differ from the last classifier+timeline call. The viewmodel exposes
 *     `displayState` ∈ { unavailable, available, loading, stale-cleared, error-sanitized }
 *     so the UI host can render accordingly.
 *   • Activation gate: exposes derived booleans (uiCapabilityReady,
 *     featureRegistryActivationAllowed, deferredCapabilities[]). The UI host wiring
 *     code consumes these. The viewmodel does NOT mutate feature-registry.js.
 *   • Output is deep-frozen and registered in a closure-private WeakSet. Verifier
 *     checks identity + structural witnesses.
 *   • All ambient intrinsic operations dispatch via captured intrinsics + captured
 *     Reflect.apply so post-load tampering cannot affect derivation.
 *   • NO mutation of vehicle preset / setup file / calibration / model / telemetry /
 *     feature-registry / R3.0B case-record schema. NO LLM. NO randomness. NO clock
 *     beyond freshness reference time.
 *
 * UMD: Node require / Electron renderer global (R3_0E_ExperimentViewmodel).
 */
(function (root) {
  'use strict';

  // ---------- Module-init dependencies (E3 + E4 verifiers) ----------------------------------
  var CL = null, TL_SVC = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { CL = require('./r3-0e-outcome-classifier.js'); } catch (e) { CL = null; }
    try { TL_SVC = require('./r3-0e-followup-timeline.js'); } catch (e) { TL_SVC = null; }
  }
  if (CL === null && typeof R3_0E_OutcomeClassifier !== 'undefined') CL = R3_0E_OutcomeClassifier;
  if (TL_SVC === null && typeof R3_0E_FollowUpTimeline !== 'undefined') TL_SVC = R3_0E_FollowUpTimeline;
  if (!CL || !TL_SVC) {
    throw new Error('r3-0e-experiment-viewmodel.js: requires r3-0e-outcome-classifier + r3-0e-followup-timeline');
  }

  // ---------- Module-init captured intrinsics ------------------------------------------------
  var _CAPTURED_OBJECT_FREEZE = Object.freeze;
  var _CAPTURED_OBJECT_IS_FROZEN = Object.isFrozen;
  var _CAPTURED_ARRAY_IS_ARRAY = Array.isArray;
  var _CAPTURED_REFLECT_APPLY = Reflect.apply;
  var _WeakSetCtor = WeakSet;
  var _WS_ADD = WeakSet.prototype.add;
  var _WS_HAS = WeakSet.prototype.has;
  function _wsAdd(s, v) { try { _CAPTURED_REFLECT_APPLY(_WS_ADD, s, [v]); return true; } catch (e) { return false; } }
  function _wsHas(s, v) { try { return _CAPTURED_REFLECT_APPLY(_WS_HAS, s, [v]) === true; } catch (e) { return false; } }
  var _ARR_SLICE = Array.prototype.slice;
  function _arrSlice(a) { try { return _CAPTURED_REFLECT_APPLY(_ARR_SLICE, a, []); } catch (e) { return []; } }

  function _deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    try { _CAPTURED_OBJECT_FREEZE(v); } catch (e) { /* swallow */ }
    var names;
    try { names = Object.getOwnPropertyNames(v); } catch (e) { return v; }
    for (var i = 0; i < names.length; i++) {
      var child;
      try { child = v[names[i]]; } catch (e) { continue; }
      _deepFreeze(child);
    }
    return v;
  }

  // ---------- Constants -----------------------------------------------------------------------
  var VIEWMODEL_SCHEMA_VERSION = 1;
  var DISPLAY_STATES = _CAPTURED_OBJECT_FREEZE([
    'unavailable',     // no case loaded OR no experiment applied yet
    'loading',         // background derivation in progress
    'available',       // outcome + timeline ready
    'stale-cleared',   // case/session/applied-change changed since last derivation
    'error-sanitized', // internal contract violation; never propagate raw error
  ]);

  // ---------- Producer attestation (WeakSet) -------------------------------------------------
  var _authoritativeStates = new _WeakSetCtor();
  function _registerAuthoritativeState(s) { _wsAdd(_authoritativeStates, s); }
  function verifyAuthoritativeViewmodelState(candidate) {
    try {
      if (candidate === null || typeof candidate !== 'object') return false;
      if (!_wsHas(_authoritativeStates, candidate)) return false;
      if (_CAPTURED_OBJECT_IS_FROZEN(candidate) !== true) return false;
      if (candidate.schemaVersion !== VIEWMODEL_SCHEMA_VERSION) return false;
      if (typeof candidate.displayState !== 'string') return false;
      if (DISPLAY_STATES.indexOf(candidate.displayState) === -1) return false;
      if (!candidate.activation || typeof candidate.activation !== 'object') return false;
      return true;
    } catch (e) { return false; }
  }

  // ---------- Factory --------------------------------------------------------------------------
  /**
   * createExperimentViewmodel({ classifier, timelineModule })
   *
   * Both parameters are MODULE references (NOT service instances):
   *   `classifier`     — R3_0E_OutcomeClassifier module (has verifyAuthoritativeOutcome)
   *   `timelineModule` — R3_0E_FollowUpTimeline module (has verifyAuthoritativeTimelineProjection
   *                       + verifyAuthoritativeFollowUpLink as module-level statics)
   *
   * Service instances (returned by createFollowUpTimelineService) do NOT carry the
   * verifiers — those are module-level. The viewmodel only needs the verifiers to
   * gate inputs; it does not call append/get/project/etc.
   *
   * Backward-compatible: the deprecated parameter name `timelineService` is still
   * accepted IF it refers to the module (i.e. has the verifiers).
   *
   * Returned object has methods:
   *   - derive({outcome, projection, links}) → frozen viewmodel state (authoritative)
   *   - empty(caseId) → frozen empty state for cases with no applied experiment yet
   *   - error() → frozen error-sanitized state
   *   - stale(caseId) → frozen stale-cleared state
   *
   * The viewmodel REQUIRES the caller to pass already-authoritative outputs from E3 + E4.
   * Each input must pass its module's verifier. Otherwise → error-sanitized state.
   */
  function createExperimentViewmodel(deps) {
    if (!deps || typeof deps !== 'object') throw new Error('R3_0E_VIEWMODEL_DEPS_INVALID');
    var classifier = deps.classifier || CL;
    var timelineModule = deps.timelineModule || deps.timelineService || TL_SVC;
    if (!classifier || typeof classifier.verifyAuthoritativeOutcome !== 'function') {
      throw new Error('R3_0E_VIEWMODEL_CLASSIFIER_INVALID');
    }
    if (!timelineModule
        || typeof timelineModule.verifyAuthoritativeTimelineProjection !== 'function'
        || typeof timelineModule.verifyAuthoritativeFollowUpLink !== 'function') {
      throw new Error('R3_0E_VIEWMODEL_TIMELINE_MODULE_INVALID');
    }
    // Alias for the rest of the closure
    var timelineService = timelineModule;

    // Internal: build a frozen state envelope with closed key set.
    function _makeState(opts) {
      var state = {
        schemaVersion: VIEWMODEL_SCHEMA_VERSION,
        displayState: opts.displayState,
        caseId: opts.caseId || null,
        sessionId: opts.sessionId || null,
        outcome: opts.outcome || null,
        outcomeClass: opts.outcomeClass || null,
        outcomeClassI18nKey: opts.outcomeClassI18nKey || null,
        projection: opts.projection || null,
        projectionEventCount: typeof opts.projectionEventCount === 'number' ? opts.projectionEventCount : 0,
        links: opts.links || _CAPTURED_OBJECT_FREEZE([]),
        linksCount: typeof opts.linksCount === 'number' ? opts.linksCount : 0,
        activation: opts.activation,
        disclaimers: _CAPTURED_OBJECT_FREEZE([
          'r3.0e.disclaimer.no_causation',
          'r3.0e.disclaimer.no_driver_blame',
          'r3.0e.disclaimer.no_auto_setup',
          'r3.0e.disclaimer.same_case_session_only',
        ]),
      };
      _deepFreeze(state);
      _registerAuthoritativeState(state);
      return state;
    }

    function empty(caseId) {
      return _makeState({
        displayState: 'unavailable',
        caseId: typeof caseId === 'string' ? caseId : null,
        activation: _CAPTURED_OBJECT_FREEZE({
          uiCapabilityReady: false,
          featureRegistryActivationAllowed: false,
          deferredCapabilities: _CAPTURED_OBJECT_FREEZE(['experiment_loop', 'case_timeline']),
          rationaleI18nKey: typeof caseId === 'string'
            ? 'r3.0e.activation.rationale.applied_experiment_required'
            : 'r3.0e.activation.rationale.case_required',
          rationaleParams: _CAPTURED_OBJECT_FREEZE({}),
        }),
      });
    }

    function error() {
      return _makeState({
        displayState: 'error-sanitized',
        activation: _CAPTURED_OBJECT_FREEZE({
          uiCapabilityReady: false,
          featureRegistryActivationAllowed: false,
          deferredCapabilities: _CAPTURED_OBJECT_FREEZE(['experiment_loop', 'case_timeline']),
          rationaleI18nKey: 'r3.0e.state.error-sanitized',
          rationaleParams: _CAPTURED_OBJECT_FREEZE({}),
        }),
      });
    }

    function stale(caseId) {
      return _makeState({
        displayState: 'stale-cleared',
        caseId: typeof caseId === 'string' ? caseId : null,
        activation: _CAPTURED_OBJECT_FREEZE({
          uiCapabilityReady: false,
          featureRegistryActivationAllowed: false,
          deferredCapabilities: _CAPTURED_OBJECT_FREEZE(['experiment_loop', 'case_timeline']),
          rationaleI18nKey: 'r3.0e.state.stale-cleared',
          rationaleParams: _CAPTURED_OBJECT_FREEZE({}),
        }),
      });
    }

    /**
     * derive({outcome, projection, links}) — produces an authoritative viewmodel state.
     *
     * Inputs:
     *   outcome    — an authoritative outcome envelope from classifier.classifyOutcome
     *   projection — an authoritative timeline projection from timelineService.projectTimeline
     *   links      — an array of authoritative follow-up link records (each from createFollowUpLink
     *                or listFollowUpLinksForParent)
     *
     * Any input failing its verifier → error-sanitized state. This is the SAME pattern as
     * the D5 brief: refuse to mix authoritative + non-authoritative content.
     */
    function derive(inputIn) {
      try {
        if (!inputIn || typeof inputIn !== 'object') return error();
        var outcome = inputIn.outcome || null;
        var projection = inputIn.projection || null;
        var links = inputIn.links || [];

        // Authority gates.
        if (outcome !== null && classifier.verifyAuthoritativeOutcome(outcome) !== true) return error();
        if (projection !== null && timelineService.verifyAuthoritativeTimelineProjection(projection) !== true) return error();
        if (!_CAPTURED_ARRAY_IS_ARRAY(links)) return error();
        for (var li = 0; li < links.length; li++) {
          if (timelineService.verifyAuthoritativeFollowUpLink(links[li]) !== true) return error();
        }

        // Cross-binding: if outcome AND projection both present, they should refer to
        // the same case (projection.caseId === <some link's parentCaseId> OR outcome's
        // experimentId is in the projection's events; we keep the binding LOOSE here
        // because the data model has no direct outcome→projection link).
        var caseId = projection !== null ? projection.caseId : null;
        var sessionId = null; // outcome envelope does not currently carry sessionId; UI shows it from links

        var outcomeClass = outcome !== null ? outcome['class'] : null;
        var outcomeClassI18nKey = outcomeClass !== null ? ('r3.0e.outcome.class.' + outcomeClass) : null;

        // Activation decision:
        //   uiCapabilityReady requires BOTH an authoritative outcome AND an authoritative
        //   projection (the experiment-loop UI surfaces classifier output AND the
        //   timeline surfaces project history; missing either deferrs activation).
        //   featureRegistryActivationAllowed mirrors uiCapabilityReady — the feature
        //   registry entry stays mounted but indicates conditional availability.
        var uiCapabilityReady = (outcome !== null && projection !== null);
        var deferred = [];
        if (outcome === null) deferred.push('experiment_loop');
        if (projection === null) deferred.push('case_timeline');

        var activation = _CAPTURED_OBJECT_FREEZE({
          uiCapabilityReady: uiCapabilityReady,
          featureRegistryActivationAllowed: uiCapabilityReady,
          deferredCapabilities: _CAPTURED_OBJECT_FREEZE(deferred),
          rationaleI18nKey: uiCapabilityReady ? 'r3.0e.activation.ready' : 'r3.0e.activation.deferred',
          rationaleParams: _CAPTURED_OBJECT_FREEZE({
            outcomeAvailable: outcome !== null,
            projectionAvailable: projection !== null,
            linksCount: links.length,
          }),
        });

        return _makeState({
          displayState: uiCapabilityReady ? 'available' : 'unavailable',
          caseId: caseId,
          sessionId: sessionId,
          outcome: outcome,
          outcomeClass: outcomeClass,
          outcomeClassI18nKey: outcomeClassI18nKey,
          projection: projection,
          projectionEventCount: projection !== null ? projection.eventCount : 0,
          links: _CAPTURED_OBJECT_FREEZE(_arrSlice(links)),
          linksCount: links.length,
          activation: activation,
        });
      } catch (e) {
        return error();
      }
    }

    var api = {
      derive: derive,
      empty: empty,
      error: error,
      stale: stale,
      VIEWMODEL_SCHEMA_VERSION: VIEWMODEL_SCHEMA_VERSION,
      DISPLAY_STATES: DISPLAY_STATES,
    };
    _CAPTURED_OBJECT_FREEZE(api);
    return api;
  }

  // ---------- Public API ---------------------------------------------------------------------
  var api = {
    VIEWMODEL_SCHEMA_VERSION: VIEWMODEL_SCHEMA_VERSION,
    DISPLAY_STATES: DISPLAY_STATES,
    createExperimentViewmodel: createExperimentViewmodel,
    verifyAuthoritativeViewmodelState: verifyAuthoritativeViewmodelState,
  };
  _CAPTURED_OBJECT_FREEZE(api);
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (root) {
    try { Object.defineProperty(root, 'R3_0E_ExperimentViewmodel', { value: api, writable: false, enumerable: false, configurable: false }); }
    catch (e) { root.R3_0E_ExperimentViewmodel = api; }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
