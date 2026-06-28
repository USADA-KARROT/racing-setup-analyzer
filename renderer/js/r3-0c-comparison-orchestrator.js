/**
 * renderer/js/r3-0c-comparison-orchestrator.js — R3.0C C7 · Comparison Orchestrator service.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7: the orchestrator owns request-token
 * issuance + framing emission. It composes the C5 delta-metrics service, the C6 export service,
 * and the comparison-eligibility contract into a single synchronous run() call that the viewmodel
 * invokes per user-confirmed comparison request.
 *
 * The orchestrator is PURE — no DOM access, no Alpine binding, no global mutation beyond its own
 * monotonic token counter. It returns one of:
 *   - { status:'eligible', result:<C5 result>, framing:{...}, exportGate:bool, generationToken }
 *   - { status:'blocked', reasonCodes:[...], limitations:[...], framing:{...}, generationToken }
 *   - { status:'unavailable', reasonCodes:[...], framing:{...}, generationToken }
 *
 * Framing entries are validated against contracts/r3.0c/framing-i18n-key-registry.js BEFORE
 * emission; any orchestrator attempt to emit an unregistered i18nKey or free-form prose
 * fails-closed with INTERNAL_CONTRACT_VIOLATION.
 *
 * Phase metrics gate: phase_boundary_contract.enabled is consulted via the supplied capabilities
 * snapshot; when disabled, the orchestrator does NOT request entry/mid/exit_delta from the C5
 * service AND records PHASE_BOUNDARY_CONTRACT_UNAUTHORISED in limitations so the viewmodel /
 * UI can render the phase cards as unavailable.
 *
 * Authority discipline:
 *   - validateComparisonContextAgainstCase MUST pass (caseRecord ↔ context binding).
 *   - evaluateComparisonEligibility MUST pass (track/session/lap identity + position basis +
 *     credibility).
 *   - C5 service authenticity: the orchestrator passes the C5 result through verbatim;
 *     comparison-export-service runs its own authenticity check at export time.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonOrchestrator).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  var DeltaMetricsService = null;
  var ComparisonExportService = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
    try { DeltaMetricsService = require('./r3-0c-delta-metrics.js'); } catch (e) { DeltaMetricsService = null; }
    try { ComparisonExportService = require('./r3-0c-comparison-export.js'); } catch (e) { ComparisonExportService = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!DeltaMetricsService && typeof R3_0C_DeltaMetrics !== 'undefined') DeltaMetricsService = R3_0C_DeltaMetrics;
  if (!ComparisonExportService && typeof R3_0C_ComparisonExport !== 'undefined') ComparisonExportService = R3_0C_ComparisonExport;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-orchestrator.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var CE = Contracts.comparisonEligibility;
  var DMC = Contracts.deltaMetrics;
  var FIR = Contracts.framingI18nKeyRegistry;
  var VST = Contracts.viewmodelStateTransition;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C7_UI';
  var SIGN_FORMULA = 'comparison_minus_reference';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }
  function _isFiniteNum(v) { return typeof v === 'number' && v === v && v !== Infinity && v !== -Infinity; }
  function _nonEmptyStr(v) { return typeof v === 'string' && v.length > 0; }

  /**
   * createOrchestrator(deps) — factory. deps may supply alternative service implementations
   * (used by tests). Default to the production module-loaded services.
   *
   * deps = { deltaMetricsService?, exportService?, capabilities, authenticityPredicate }
   *   capabilities — a frozen snapshot of governance/r3.0c/capabilities.json relevant flags:
   *     { phaseBoundaryContractEnabled:bool, viewmodelStateTransitionContractEnabled:bool,
   *       framingSourceStructuredContractEnabled:bool }
   *   authenticityPredicate — REQUIRED. A function (caseRecord) → boolean that returns true ONLY
   *     for case records minted by an authoritative source (R3.0B case-store open boundary). The
   *     orchestrator NEVER exposes a way to add to this authority; the predicate is opaque to the
   *     viewmodel and to any caller of requestComparison. A throw inside the predicate is treated
   *     as false (fail-closed). The previous candidate exposed registerAuthenticCaseRecord on the
   *     orchestrator's public API + had the viewmodel auto-register caller-controlled records on
   *     setAssociation — Codex C7-R2-A-01 broke that with a literal-built forged caseRecord
   *     escalating through setAssociation. Predicate injection makes the WeakSet (or whatever
   *     authority the integration uses) renderer-side and viewmodel-inaccessible.
   *
   * The capabilities snapshot is REQUIRED. The orchestrator refuses to run when
   * framingSourceStructuredContractEnabled is false (the C7 contract is gated by capability).
   *
   * Default authenticityPredicate (when not provided) is FAIL-CLOSED (returns false for every
   * caseRecord). This means a default-constructed orchestrator will reject every requestComparison
   * call with INTERNAL_CONTRACT_VIOLATION — exactly the property D1 needs to ship a test that
   * proves "forged record routed through setAssociation is refused without registration helpers".
   */
  function createOrchestrator(deps) {
    deps = _isPlain(deps) ? deps : {};
    var dm = deps.deltaMetricsService || DeltaMetricsService;
    var ex = deps.exportService || ComparisonExportService;
    var caps = _isPlain(deps.capabilities) ? deps.capabilities : null;
    if (!caps) throw new Error('createOrchestrator requires capabilities snapshot');
    if (!dm || typeof dm.computeDeltaMetrics !== 'function') throw new Error('createOrchestrator requires delta-metrics service');
    // ex is OPTIONAL — only required when the viewmodel actually calls exportComparison.

    // Codex C7-R2-A-01 closure: predicate-based authenticity check. The predicate is invoked once
    // per requestComparison; throw = false (fail-closed). NO registration API is exposed.
    var _externalAuthPredicate = typeof deps.authenticityPredicate === 'function' ? deps.authenticityPredicate : null;
    function _isAuthenticCaseRecord(caseRecord) {
      if (!_externalAuthPredicate) return false;
      if (!_isPlain(caseRecord)) return false;
      try { return _externalAuthPredicate(caseRecord) === true; } catch (e) { return false; }
    }

    var _generationCounter = 0;
    function _nextToken() { _generationCounter = _generationCounter + 1; return _generationCounter; }
    function currentToken() { return _generationCounter; }

    function _blockedResponse(reasonCodes, detail, framing, token) {
      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
      if (arr.length === 0) arr = [CODES.INTERNAL_CONTRACT_VIOLATION];
      return Object.freeze({
        status: 'blocked',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        detail: detail != null ? String(detail).slice(0, 200) : null,
        generationToken: token,
      });
    }
    function _unavailableResponse(reasonCodes, framing, token) {
      var arr = (reasonCodes || []).filter(function (c) { return RC.isReasonCode(c); });
      if (arr.length === 0) arr = [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE];
      return Object.freeze({
        status: 'unavailable',
        reasonCodes: Object.freeze(arr.slice()),
        limitations: Object.freeze([]),
        framing: _validateFramingOrFallback(framing),
        exportGate: false,
        generationToken: token,
      });
    }

    function _validateFramingOrFallback(framing) {
      var fallback = FIR.cannotDistinguishFallback();
      var out = {
        observedDelta: fallback,
        likelyDriverBehaviourDifference: fallback,
        possibleVehicleResponseDifference: fallback,
        cannotDistinguish: [],
        nextValidationAction: null,
      };
      if (!_isPlain(framing)) return Object.freeze(out);
      ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
        var v = framing[k];
        if (v === null || v === undefined) return; // keep fallback
        var vr = FIR.validateFramingEntry(v);
        if (vr.valid) out[k] = Object.freeze({ reasonCode: v.reasonCode, i18nKey: v.i18nKey, params: v.params ? Object.freeze(Object.assign({}, v.params)) : undefined });
        // else: leave fallback in place (defense in depth — orchestrator emit should have caught)
      });
      if (Array.isArray(framing.cannotDistinguish)) {
        var cd = [];
        for (var i = 0; i < framing.cannotDistinguish.length && i < 64; i++) {
          var e = framing.cannotDistinguish[i];
          var er = FIR.validateFramingEntry(e);
          if (er.valid) cd.push(Object.freeze({ reasonCode: e.reasonCode, i18nKey: e.i18nKey, params: e.params ? Object.freeze(Object.assign({}, e.params)) : undefined }));
        }
        out.cannotDistinguish = Object.freeze(cd);
      } else {
        out.cannotDistinguish = Object.freeze([]);
      }
      return Object.freeze(out);
    }

    /**
     * requestComparison(input) — synchronous orchestrator entry point.
     *
     * input = {
     *   caseRecord, association,                       // F4/F5 binding inputs
     *   referenceLap, comparisonLap,                   // lap identities
     *   credibilityMetadata,                           // credibility ladder + provenance
     *   eligibilityInput,                              // shape for evaluateComparisonEligibility
     *   deltaMetricsRequest,                           // C5 service input (sans phase trio)
     *   framing                                        // OPTIONAL — orchestrator-built framing
     * }
     *
     * Returns one of the response shapes documented at module top.
     */
    function requestComparison(input) {
      var token = _nextToken();
      if (!caps.framingSourceStructuredContractEnabled || !caps.viewmodelStateTransitionContractEnabled) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'framing or viewmodel-state-transition capability disabled', null, token);
      }
      if (!_isPlain(input)) return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'input not a plain object', null, token);

      // 1. case authenticity (Codex C7-R2-A-01 closure): the caseRecord MUST be vouched for by
      //    the injected authenticityPredicate. A literal-built caseRecord (even one whose
      //    associations consistently match the caller-supplied association + eligibility
      //    identities) fails closed here. The predicate is opaque to the viewmodel — there is no
      //    public API to add anything to it.
      if (!_isAuthenticCaseRecord(input.caseRecord)) {
        return _blockedResponse([CODES.INTERNAL_CONTRACT_VIOLATION], 'caseRecord not vouched for by authenticityPredicate — caller-controlled case authority refused', null, token);
      }

      // 2. case ↔ context binding (F4)
      var bindCheck = CE.validateComparisonContextAgainstCase(input.caseRecord, input.association);
      if (bindCheck && bindCheck.valid !== true) {
        return _blockedResponse(bindCheck.reasonCodes ? bindCheck.reasonCodes.slice() : [CODES.TRACK_IDENTITY_MISMATCH], 'case/context binding failed', null, token);
      }

      // 2. composite eligibility (F5 identity + lap + credibility)
      var elig = CE.evaluateComparisonEligibility(input.eligibilityInput);
      if (elig.eligible !== true) {
        return _blockedResponse(elig.reasonCodes ? elig.reasonCodes.slice() : [CODES.REFERENCE_LAP_UNAVAILABLE], 'eligibility failed', null, token);
      }

      // 3. C5 delta-metrics request — filter out phase metrics if phase_boundary_contract disabled
      var dmReq = _isPlain(input.deltaMetricsRequest) ? Object.assign({}, input.deltaMetricsRequest) : null;
      if (!dmReq) return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'deltaMetricsRequest missing', null, token);
      var requested = Array.isArray(dmReq.requestedMetrics) ? dmReq.requestedMetrics.slice() : [];
      var phaseMetricRequested = false;
      if (!caps.phaseBoundaryContractEnabled) {
        var phaseSet = DMC.PHASE_SCOPE_METRICS;
        var filtered = requested.filter(function (m) {
          if (phaseSet.indexOf(m) !== -1) { phaseMetricRequested = true; return false; }
          return true;
        });
        dmReq.requestedMetrics = filtered;
        if (dmReq.policy && _isPlain(dmReq.policy)) {
          var pol = Object.assign({}, dmReq.policy);
          delete pol.phaseBoundaryAuthorisation;
          dmReq.policy = pol;
        }
      } else {
        dmReq.requestedMetrics = requested;
      }
      if (!dmReq.requestedMetrics.length) {
        return _blockedResponse([CODES.DELTA_METRIC_EMPTY_INPUT], 'no requested metrics after phase gate', null, token);
      }

      var dmResult = dm.computeDeltaMetrics(dmReq);
      if (dmResult.eligible !== true) {
        return _blockedResponse(dmResult.reasonCodes ? dmResult.reasonCodes.slice() : [CODES.METRIC_REQUIRED_CHANNEL_UNAVAILABLE], 'delta-metrics blocked', null, token);
      }

      // 4. exportGate predicate: an eligible result + non-stale identity + association match
      //    is the precondition for the UI's export button. The viewmodel re-checks at click.
      var exportGate = !!(dmResult && dmResult.eligible && _isPlain(dmResult.identity) && dmResult.identity.caseId === input.association.caseId && dmResult.identity.sessionId === input.association.sessionId);

      // 5. orchestrator-emitted framing. We DERIVE these from the result (NOT free-form prose):
      var framing = _buildFraming(dmResult, phaseMetricRequested, input.framing);

      return Object.freeze({
        status: 'eligible',
        result: dmResult,
        framing: framing,
        exportGate: exportGate,
        generationToken: token,
        limitations: Object.freeze(phaseMetricRequested ? [CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED] : []),
      });
    }

    function _buildFraming(dmResult, phaseMetricRequested, callerFraming) {
      // The orchestrator deterministically maps the C5 result + flags into framing entries from
      // FRAMING_I18N_KEY_REGISTRY. Caller may NOT supply free-form prose — when callerFraming is
      // present we use _validateFramingOrFallback which rejects unregistered i18nKeys.
      var observed = null;
      var lapTimeMetric = dmResult.metrics && dmResult.metrics.lap_time;
      if (lapTimeMetric && _isFiniteNum(lapTimeMetric.value)) {
        if (lapTimeMetric.value < 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.faster_overall', params: { ms: lapTimeMetric.value } };
        else if (lapTimeMetric.value > 0) observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.slower_overall', params: { ms: lapTimeMetric.value } };
        else observed = { reasonCode: CODES.CANNOT_DISTINGUISH, i18nKey: 'r3_0c.framing.observed_delta.identical_lap' };
      }
      var cannotDistinguish = [];
      if (phaseMetricRequested) cannotDistinguish.push({ reasonCode: CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED, i18nKey: 'r3_0c.framing.cannot_distinguish.phase_metric_unauthorised' });
      var built = {
        observedDelta: observed,
        likelyDriverBehaviourDifference: null,
        possibleVehicleResponseDifference: null,
        cannotDistinguish: cannotDistinguish,
        nextValidationAction: null,
      };
      if (_isPlain(callerFraming)) {
        // caller may suggest framing — we validate every entry and replace only valid ones.
        ['observedDelta', 'likelyDriverBehaviourDifference', 'possibleVehicleResponseDifference', 'nextValidationAction'].forEach(function (k) {
          var v = callerFraming[k];
          if (v && FIR.validateFramingEntry(v).valid) built[k] = v;
        });
        if (Array.isArray(callerFraming.cannotDistinguish)) {
          callerFraming.cannotDistinguish.forEach(function (e) {
            if (e && FIR.validateFramingEntry(e).valid && built.cannotDistinguish.length < 64) built.cannotDistinguish.push(e);
          });
        }
      }
      return _validateFramingOrFallback(built);
    }

    /**
     * exportComparison(eligibleResponse, extraInputs) — delegates to the C6 export service.
     * The orchestrator does NOT bypass C6's own authenticity / closed-allowlist checks.
     */
    function exportComparison(eligibleResponse, extraInputs) {
      if (!ex || typeof ex.buildComparisonExport !== 'function') {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export service unavailable' };
      }
      if (!_isPlain(eligibleResponse) || eligibleResponse.status !== 'eligible' || eligibleResponse.exportGate !== true) {
        return { eligible: false, status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], detail: 'export gate closed' };
      }
      if (!_isPlain(extraInputs)) extraInputs = {};
      return ex.buildComparisonExport({
        result: eligibleResponse.result,
        association: extraInputs.association,
        credibilityMetadata: extraInputs.credibilityMetadata,
        generationToken: 'orch-' + eligibleResponse.generationToken,
        referenceLap: extraInputs.referenceLap,
        comparisonLap: extraInputs.comparisonLap,
        framing: {
          cannotConclude: eligibleResponse.framing && eligibleResponse.framing.cannotDistinguish || [],
          alternativeExplanations: [],
          nextValidationAction: eligibleResponse.framing && eligibleResponse.framing.nextValidationAction || null,
        },
      });
    }

    // Codex C7-R2-A-01 closure: registerAuthenticCaseRecord + isAuthenticCaseRecord are NO LONGER
    // exposed on the orchestrator's public API. Authenticity is supplied at construction via the
    // injected predicate. Tests provide their own predicate; production callers (R3.0B case-store
    // integration) inject a predicate backed by their own WeakSet / token / store-lineage check.
    return Object.freeze({
      SERVICE_VERSION: SERVICE_VERSION,
      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
      SIGN_FORMULA: SIGN_FORMULA,
      currentToken: currentToken,
      requestComparison: requestComparison,
      exportComparison: exportComparison,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    SIGN_FORMULA: SIGN_FORMULA,
    createOrchestrator: createOrchestrator,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonOrchestrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
