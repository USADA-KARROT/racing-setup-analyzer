/**
 * renderer/js/r3-0c-comparison-viewmodel.js — R3.0C C7 · Comparison Workspace ViewModel.
 *
 * Per SKYLINE Continuous Delivery Master Directive §七 C7 + docs/r3.0c-state-transition-contract.md:
 * pure state machine consuming orchestrator output. Implements the 7 transition triggers, the
 * generation-token discipline, the placeholder shapes, and the stale-token drop rule from
 * contracts/r3.0c/viewmodel-state-transition-contract.js.
 *
 * PURE: no DOM access, no Alpine binding, no global mutation. The Alpine layer calls
 * createComparisonViewModel({orchestrator}) once, stores the reference in a non-reactive holder,
 * and reads getState() during render. setReference / setComparison / setAssociation /
 * setChannelMapping / notifyCaseReopen / notifyAuthorityRevoked are the only mutators.
 *
 * UMD: Node require / Electron renderer global (R3_0C_ComparisonViewModel).
 */
(function (root) {
  'use strict';

  var Contracts = null;
  if (typeof module !== 'undefined' && module.exports) {
    try { Contracts = require('../../contracts/r3.0c/index.js'); } catch (e) { Contracts = null; }
  }
  if (!Contracts && typeof R3_0C_Contracts !== 'undefined') Contracts = R3_0C_Contracts;
  if (!Contracts) throw new Error('renderer/js/r3-0c-comparison-viewmodel.js requires contracts/r3.0c/index.js');

  var RC = Contracts.reasonCodes;
  var CODES = RC.REASON_CODES;
  var VST = Contracts.viewmodelStateTransition;
  var DMC = Contracts.deltaMetrics;

  var SERVICE_VERSION = 1;
  var CHECKPOINT_FLOOR = 'C7_UI';

  function _isPlain(v) { if (v == null || typeof v !== 'object' || Array.isArray(v)) return false; try { var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; } catch (e) { return false; } }

  /**
   * createComparisonViewModel(deps) — factory. deps = { orchestrator, capabilities }.
   * The viewmodel refuses to operate when capabilities.viewmodelStateTransitionContractEnabled
   * is false (the contract is gated by capability — until C7 ships it is disabled).
   */
  function createComparisonViewModel(deps) {
    if (!_isPlain(deps)) throw new Error('createComparisonViewModel requires deps');
    if (!_isPlain(deps.orchestrator) || typeof deps.orchestrator.requestComparison !== 'function') throw new Error('createComparisonViewModel requires orchestrator');
    if (!_isPlain(deps.capabilities)) throw new Error('createComparisonViewModel requires capabilities');
    var orch = deps.orchestrator;
    var caps = deps.capabilities;
    if (!caps.viewmodelStateTransitionContractEnabled) throw new Error('viewmodel_state_transition_contract capability disabled — viewmodel must not be instantiated');

    // Internal state (PRIVATE — never exposed; getState() returns a defensive copy).
    var _state = {
      placeholder: VST.PLACEHOLDER_STATES.IDLE,
      reference: null,         // user-selected reference lap descriptor
      comparison: null,        // user-selected comparison lap descriptor
      association: null,       // case + session + track + layout + basis + direction
      channelMapping: null,    // confirmed channel mapping snapshot
      caseRecord: null,        // R3.0B case record (for context binding)
      latestToken: 0,          // last token issued (commit gate)
      result: null,            // committed orchestrator response
      framing: null,           // committed framing (orchestrator-validated)
      blockedReasons: [],
      limitations: [],
      exportGate: false,
      metricAvailability: _defaultMetricAvailability(),
    };

    function _defaultMetricAvailability() {
      var out = {};
      DMC.SUPPORTED_DELTA_METRICS.forEach(function (m) { out[m] = false; });
      return out;
    }

    function _clearAndPlaceholder(triggerName) {
      // Codex C7 finding C7-A1 closure: advance latestToken on EVERY trigger so that any
      // in-flight orchestrator response that hasn't committed yet is invalidated. Without this,
      // a trigger like notifyAuthorityRevoked that does not itself issue a new request would
      // leave latestToken unchanged, allowing a delayed eligible response to overwrite the
      // revoked-placeholder state.
      _state.latestToken = _state.latestToken + 1;
      var placeholder = VST.placeholderForTrigger(triggerName);
      _state.placeholder = placeholder;
      _state.result = null;
      _state.framing = null;
      _state.blockedReasons = [];
      _state.limitations = [];
      _state.exportGate = false;
      _state.metricAvailability = _defaultMetricAvailability();
    }

    function _commit(response) {
      if (!_isPlain(response)) {
        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
        _state.blockedReasons = [CODES.INTERNAL_CONTRACT_VIOLATION];
        _state.result = null;
        _state.framing = null;
        _state.exportGate = false;
        return;
      }
      // Stale-token drop rule (defense in depth — orchestrator already echoes back the token).
      if (VST.isResultStale(response.generationToken, _state.latestToken)) return;
      _state.framing = response.framing || null;
      _state.limitations = response.limitations ? response.limitations.slice() : [];
      if (response.status === 'eligible') {
        _state.placeholder = VST.PLACEHOLDER_STATES.READY;
        _state.result = response.result || null;
        _state.blockedReasons = [];
        _state.exportGate = response.exportGate === true;
        _state.metricAvailability = _buildMetricAvailability(response.result);
      } else if (response.status === 'unavailable') {
        _state.placeholder = VST.PLACEHOLDER_STATES.UNAVAILABLE;
        _state.result = null;
        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [];
        _state.exportGate = false;
      } else {
        _state.placeholder = VST.PLACEHOLDER_STATES.BLOCKED;
        _state.result = null;
        _state.blockedReasons = response.reasonCodes ? response.reasonCodes.slice() : [CODES.INTERNAL_CONTRACT_VIOLATION];
        _state.exportGate = false;
      }
    }

    function _buildMetricAvailability(result) {
      var out = _defaultMetricAvailability();
      if (!_isPlain(result) || !_isPlain(result.metrics)) return out;
      DMC.SUPPORTED_DELTA_METRICS.forEach(function (cn) {
        // Phase metrics are governance-locked (mirrors C6 export behaviour). When
        // phase_boundary_contract.enabled is false, the viewmodel forces availability:false
        // regardless of what the orchestrator returned.
        if (DMC.PHASE_SCOPE_METRICS.indexOf(cn) !== -1 && !caps.phaseBoundaryContractEnabled) {
          out[cn] = false;
          return;
        }
        var m = result.metrics[cn];
        if (!_isPlain(m)) { out[cn] = false; return; }
        if (m.blocked === true) { out[cn] = false; return; }
        if (m.partial === true) { out[cn] = false; return; }
        if (m.value === undefined && !Array.isArray(m.perCorner)) { out[cn] = false; return; }
        out[cn] = true;
      });
      return out;
    }

    function _runRequest() {
      // Requires the four input slots — reference / comparison / association / channelMapping —
      // to be filled. If any is missing, stay in SELECTING.
      if (!_state.reference || !_state.comparison || !_state.association || !_state.channelMapping) {
        _state.placeholder = VST.PLACEHOLDER_STATES.SELECTING;
        return;
      }
      // Issue a new token BEFORE the orchestrator call so any in-flight prior request becomes
      // stale at commit time. (The orchestrator's own token monotonicity is independent of the
      // viewmodel counter — what matters is that this viewmodel commit checks `latestToken`.)
      _state.latestToken += 1;
      var thisToken = _state.latestToken;
      _state.placeholder = VST.PLACEHOLDER_STATES.COMPUTING;
      var response = orch.requestComparison({
        caseRecord: _state.caseRecord,
        association: _state.association,
        referenceLap: _state.reference,
        comparisonLap: _state.comparison,
        eligibilityInput: _buildEligibilityInput(),
        deltaMetricsRequest: _buildDeltaMetricsRequest(),
        framing: null,
        credibilityMetadata: _state.association.credibilityMetadata || null,
      });
      // The orchestrator returned synchronously. If the viewmodel's latestToken has already
      // advanced (e.g. via a re-entrant setReference triggered during this call), drop.
      if (response && response.generationToken !== undefined) {
        // Override the orchestrator's token with the viewmodel's local token so the stale-drop
        // rule is consistent.
        var responseWithLocalToken = Object.assign({}, response, { generationToken: thisToken });
        if (responseWithLocalToken.generationToken !== _state.latestToken) return; // stale
        _commit(responseWithLocalToken);
      }
    }

    function _buildEligibilityInput() {
      // Convert the viewmodel's confirmed selections into the comparison-eligibility input shape.
      var assoc = _state.association;
      function idShape(lap, basis, direction, caseId, sessionId) {
        return { analysisCaseId: caseId, sessionId: sessionId, lapId: lap.lapId, trackId: assoc.trackId, layoutId: assoc.layoutId, positionBasis: basis, positionDirection: direction };
      }
      return {
        analysisCaseId: assoc.caseId,
        caseRecord: _state.caseRecord,
        reference: {
          identity: idShape(_state.reference, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
          lapAuthority: _state.reference.lapAuthority || {},
          normalizationAuthority: _state.reference.normalizationAuthority || {},
        },
        comparison: {
          identity: idShape(_state.comparison, assoc.positionBasis, assoc.positionDirection, assoc.caseId, assoc.sessionId),
          lapAuthority: _state.comparison.lapAuthority || {},
          normalizationAuthority: _state.comparison.normalizationAuthority || {},
        },
        credibilityMetadata: assoc.credibilityMetadata || {},
      };
    }
    function _buildDeltaMetricsRequest() {
      var assoc = _state.association;
      var pairing = _state.channelMapping.pairing || { pairs: [] };
      return {
        identity: { caseId: assoc.caseId, sessionId: assoc.sessionId },
        referenceLap: { lapTimeMs: _state.reference.lapTimeMs },
        comparisonLap: { lapTimeMs: _state.comparison.lapTimeMs },
        pairing: pairing,
        requestedMetrics: ['lap_time', 'delta_cumulative', 'sector_delta'].concat(caps.phaseBoundaryContractEnabled ? ['entry_delta', 'mid_delta', 'exit_delta'] : []),
        policy: caps.phaseBoundaryContractEnabled ? { deltaSign: 'comparison_minus_reference', phaseBoundaryAuthorisation: { contractRef: 'r3.0c/phase-boundary-test-fixture', serviceOwned: true, deterministic: true } } : { deltaSign: 'comparison_minus_reference' },
      };
    }

    // ── Public mutators (the 7 transition triggers) ──
    function setReference(sel) { _clearAndPlaceholder('reference_selection_changed'); _state.reference = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
    function setComparison(sel) { _clearAndPlaceholder('comparison_selection_changed'); _state.comparison = _isPlain(sel) ? Object.freeze(Object.assign({}, sel)) : null; _runRequest(); }
    function setAssociation(assoc) {
      _clearAndPlaceholder('case_association_changed');
      _state.association = _isPlain(assoc) ? Object.freeze(Object.assign({}, assoc)) : null;
      if (_isPlain(assoc) && _isPlain(assoc.caseRecord)) {
        // Codex C7-R2-A-01 closure: the viewmodel NO LONGER registers the caseRecord with the
        // orchestrator. The viewmodel is renderer-accessible (any caller can invoke
        // setAssociation with a forged caseRecord); treating that path as an authoritative
        // boundary was the D1 vulnerability. We still hold a private reference to the record so
        // requestComparison can pass it to the orchestrator, but the orchestrator's
        // authenticityPredicate (injected at construction) is what grants authority — NOT this
        // viewmodel. A forged caller-built caseRecord routed through setAssociation will reach
        // the orchestrator and be refused by the predicate.
        var cr = Object.assign({}, assoc.caseRecord);
        if (_isPlain(assoc.caseRecord.associations)) cr.associations = Object.assign({}, assoc.caseRecord.associations);
        _state.caseRecord = cr;
      } else {
        _state.caseRecord = null;
      }
      _runRequest();
    }
    function setChannelMapping(mapping) { _clearAndPlaceholder('channel_mapping_changed'); _state.channelMapping = _isPlain(mapping) ? Object.freeze(Object.assign({}, mapping)) : null; _runRequest(); }
    function notifyCaseReopen() { _clearAndPlaceholder('case_reopen'); _state.reference = null; _state.comparison = null; _state.association = null; _state.channelMapping = null; _state.caseRecord = null; }
    function notifyAuthorityRevoked() { _clearAndPlaceholder('user_confirmed_authority_revoked'); }
    function notifyEligibilityRevoked() { _clearAndPlaceholder('orchestrator_eligibility_revoked'); }

    // ── Read-only state accessor ──
    function getState() {
      return Object.freeze({
        placeholder: _state.placeholder,
        reference: _state.reference,
        comparison: _state.comparison,
        association: _state.association,
        result: _state.result,
        framing: _state.framing,
        blockedReasons: _state.blockedReasons.slice(),
        limitations: _state.limitations.slice(),
        exportGate: _state.exportGate,
        metricAvailability: Object.assign({}, _state.metricAvailability),
        latestToken: _state.latestToken,
      });
    }

    return Object.freeze({
      SERVICE_VERSION: SERVICE_VERSION,
      CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
      setReference: setReference,
      setComparison: setComparison,
      setAssociation: setAssociation,
      setChannelMapping: setChannelMapping,
      notifyCaseReopen: notifyCaseReopen,
      notifyAuthorityRevoked: notifyAuthorityRevoked,
      notifyEligibilityRevoked: notifyEligibilityRevoked,
      getState: getState,
    });
  }

  var api = {
    SERVICE_VERSION: SERVICE_VERSION,
    CHECKPOINT_FLOOR: CHECKPOINT_FLOOR,
    createComparisonViewModel: createComparisonViewModel,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0C_ComparisonViewModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
