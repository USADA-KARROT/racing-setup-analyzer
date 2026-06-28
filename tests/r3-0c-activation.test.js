/**
 * tests/r3-0c-activation.test.js — R3.0C C8_ACTIVATION activation contract suite.
 *
 * Verifies the activation surface end-to-end at the Node test layer:
 *   • Feature registry shape: the three R3.0C IDs (case_comparison / reference_lap / corner_delta)
 *     are availability='available' with rendererAdapter.paneId='comparisons' and no deferredReason.
 *   • NAV_NODES.comparisons is no longer deferred.
 *   • Feature router resolves the three IDs to shellSection='comparisons' / currentTab='comparisons'
 *     with deferred=false; isFeatureReachable returns true.
 *   • Governance contract: state.json carries currentCheckpoint=C8_ACTIVATION,
 *     featureRegistryActivationAllowed=true, feature_registry_active in enabledCapabilities,
 *     and an authorizedProductionPaths entry binding renderer/js/feature-registry.js to that capability.
 *   • Capabilities ledger: feature_registry_active.enabled=true / enabledAt=C8_ACTIVATION.
 *   • Train state mirror: phaseStates.R3.0C.currentCheckpoint=C8_ACTIVATION and finalActivationReached=true.
 *   • Orchestrator authenticity gate: a literal-built ("forged") caseRecord that the authenticityPredicate
 *     has not vouched for is rejected with INTERNAL_CONTRACT_VIOLATION. A WeakSet-registered record
 *     passes the authenticity gate (subsequent failure modes belong to lower contracts).
 *   • Phase-metric gate: phaseBoundaryContractEnabled=false → entry_delta / mid_delta / exit_delta are
 *     stripped from the orchestrator request AND limitations carries PHASE_BOUNDARY_CONTRACT_UNAUTHORISED.
 *   • Same-Analysis-Case / same-session scope: a request whose result.identity does NOT match the
 *     association still has its caller-side eligibility gate refuse cross-case / cross-session shapes.
 *   • Export gating: blocked / unavailable responses surface exportGate=false; export with a hostile
 *     accessor on the eligibleResponse boundary returns a structured blocked outcome rather than throwing.
 *
 * No production-code mocks: the test exercises the real orchestrator with a fake delta-metrics service
 * + a fake authenticity predicate backed by a local WeakSet (mirrors the renderer wiring).
 *
 * The test is a Node CLI: `node tests/r3-0c-activation.test.js`, exit 1 on failure.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const FR = require('../renderer/js/feature-registry.js');
const RR = require('../renderer/js/feature-router.js');
const Contracts = require('../contracts/r3.0c/index.js');
const Orch = require('../renderer/js/r3-0c-comparison-orchestrator.js');

const CODES = Contracts.reasonCodes.REASON_CODES;
const DMC = Contracts.deltaMetrics;

let pass = 0, fail = 0;
function chk(name, cond, detail) { if (cond) pass++; else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } }

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Feature registry shape
// ─────────────────────────────────────────────────────────────────────────────
const R30C_IDS = ['case_comparison', 'reference_lap', 'corner_delta'];
R30C_IDS.forEach(function (id) {
  const f = FR.FEATURES[id];
  chk('active: ' + id + ' present', !!f);
  if (!f) return;
  chk('active: ' + id + ' availability=available', f.availability === 'available');
  chk('active: ' + id + ' has rendererAdapter', !!f.rendererAdapter);
  chk('active: ' + id + ' rendererAdapter.paneId=comparisons', f.rendererAdapter && f.rendererAdapter.paneId === 'comparisons');
  chk('active: ' + id + ' rendererAdapter.focusTarget=null', f.rendererAdapter && f.rendererAdapter.focusTarget === null);
  chk('active: ' + id + ' deferredReason absent', f.deferredReason === undefined);
  chk('active: ' + id + ' navNodeId=comparisons', f.navNodeId === 'comparisons');
  chk('active: ' + id + ' entryPoints.desktop=true mobile=false', f.entryPoints && f.entryPoints.desktop === true && f.entryPoints.mobile === false);
});
chk('NAV_NODES.comparisons availability=available', FR.NAV_NODES.comparisons.availability === 'available');
chk('NAV_NODES.comparisons no deferredReason', FR.NAV_NODES.comparisons.deferredReason === undefined);
chk('deriveMainNav: comparisons no deferred flag', FR.deriveMainNav().find(function (n) { return n.id === 'comparisons'; }).deferred === undefined);
chk('validateRegistry ok', FR.validateRegistry().ok === true, FR.validateRegistry().errors);
chk('R3.0C ids are NOT in setup-library areas', !FR.deriveSetupLibraryAreas().some(function (a) { return a.features.some(function (f) { return R30C_IDS.indexOf(f.id) !== -1; }); }));
chk('R3.0C pane ids are NOT in setup-library pane list', FR.deriveSetupLibraryPaneIds().indexOf('comparisons') === -1);

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Feature router
// ─────────────────────────────────────────────────────────────────────────────
R30C_IDS.forEach(function (id) {
  const r = RR.navigateToFeature(id);
  chk('router: ' + id + ' resolves', !!r);
  if (!r) return;
  chk('router: ' + id + ' shellSection=comparisons', r.shellSection === 'comparisons');
  chk('router: ' + id + ' currentTab=comparisons', r.currentTab === 'comparisons');
  chk('router: ' + id + ' deferred=false', r.deferred === false);
  chk('router: ' + id + ' featureId echoed', r.featureId === id);
  chk('router: ' + id + ' isFeatureReachable=true', RR.isFeatureReachable(id) === true);
});
(function () {
  const ns = { shellSection: 'dashboard', currentTab: 'dashboard', caseSubview: 'overview' };
  const out = RR.applyRoute(RR.navigateToFeature('case_comparison'), ns);
  chk('router: applyRoute does not mutate input shellSection', ns.shellSection === 'dashboard');
  chk('router: applyRoute writes comparisons shellSection', out.shellSection === 'comparisons');
  chk('router: applyRoute writes comparisons currentTab', out.currentTab === 'comparisons');
  chk('router: applyRoute preserves caseSubview', out.caseSubview === 'overview');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Governance state contract
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const st = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0c', 'state.json'), 'utf8'));
  chk('state.currentCheckpoint=C8_ACTIVATION', st.currentCheckpoint === 'C8_ACTIVATION');
  chk('state.featureRegistryActivationAllowed=true', st.featureRegistryActivationAllowed === true);
  chk('state.uiAllowed=true', st.uiAllowed === true);
  chk('state.runtimeConsumersAllowed=true', st.runtimeConsumersAllowed === true);
  chk('state.enabledCapabilities contains feature_registry_active', (st.enabledCapabilities || []).indexOf('feature_registry_active') !== -1);
  const fr = (st.authorizedProductionPaths || []).find(function (e) { return e && e.path === 'renderer/js/feature-registry.js'; });
  chk('state.authorizedProductionPaths includes feature-registry.js', !!fr);
  chk('state.authorizedProductionPaths feature-registry.js → feature_registry_active', fr && fr.capability === 'feature_registry_active');
  // C7-shipped capabilities + paths MUST still be present (no regression).
  ['production_adapter_present', 'lap_authority_present', 'normalized_distance_present', 'reference_selection_present', 'corner_segmentation_present', 'corner_pairing_present', 'delta_metrics_present', 'comparison_export_present', 'ui_present', 'viewmodel_state_transition_contract', 'framing_source_structured_contract'].forEach(function (c) {
    chk('state.enabledCapabilities preserves ' + c, (st.enabledCapabilities || []).indexOf(c) !== -1);
  });
})();

(function () {
  const caps = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0c', 'capabilities.json'), 'utf8'));
  const fra = caps.capabilities && caps.capabilities.feature_registry_active;
  chk('capabilities.feature_registry_active present', !!fra);
  chk('capabilities.feature_registry_active.kind=activation', fra && fra.kind === 'activation');
  chk('capabilities.feature_registry_active.enabled=true', fra && fra.enabled === true);
  chk('capabilities.feature_registry_active.enabledAt=C8_ACTIVATION', fra && fra.enabledAt === 'C8_ACTIVATION');
  chk('capabilities.feature_registry_active.unlockFloor=C8_ACTIVATION', fra && fra.unlockFloor === 'C8_ACTIVATION');
  chk('capabilities.feature_registry_active.authorisedPath=renderer/js/feature-registry.js', fra && fra.authorisedPath === 'renderer/js/feature-registry.js');
})();

(function () {
  const train = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0', 'train.json'), 'utf8'));
  chk('train.currentPhaseCheckpoint=C8_ACTIVATION', train.currentPhaseCheckpoint === 'C8_ACTIVATION');
  const r3c = train.phaseStates && train.phaseStates['R3.0C'];
  chk('train.phaseStates.R3.0C.currentCheckpoint=C8_ACTIVATION', r3c && r3c.currentCheckpoint === 'C8_ACTIVATION');
  chk('train.phaseStates.R3.0C.finalActivationReached=true', r3c && r3c.finalActivationReached === true);
  chk('train.phaseStates.R3.0C.finalActivationCheckpoint=C8_ACTIVATION', r3c && r3c.finalActivationCheckpoint === 'C8_ACTIVATION');
  // R3.0D / R3.0E / R3.0F MUST still be NOT started.
  ['R3.0D', 'R3.0E', 'R3.0F'].forEach(function (p) {
    const s = train.phaseStates && train.phaseStates[p];
    chk('train.phaseStates.' + p + '.started=false', s && s.started === false);
    chk('train.phaseStates.' + p + '.finalActivationReached=false', s && s.finalActivationReached === false);
  });
})();

(function () {
  const mf = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'r3.0c', 'checkpoints', 'C8.json'), 'utf8'));
  chk('C8 manifest checkpoint=C8_ACTIVATION', mf.checkpoint === 'C8_ACTIVATION');
  chk('C8 manifest previousCheckpoint=C7_UI', mf.previousCheckpoint === 'C7_UI');
  chk('C8 manifest governanceChanged=true', mf.governanceChanged === true);
  chk('C8 manifest newlyAuthorizedPath=feature-registry.js', mf.newlyAuthorizedPath === 'renderer/js/feature-registry.js');
  chk('C8 manifest newlyEnabledCapability=feature_registry_active', mf.newlyEnabledCapability === 'feature_registry_active');
  chk('C8 manifest activationContract.featureRegistryActivationAllowed=true', mf.activationContract && mf.activationContract.featureRegistryActivationAllowed === true);
  chk('C8 manifest activationContract.finalActivationReached=true', mf.activationContract && mf.activationContract.finalActivationReached === true);
  chk('C8 manifest activationContract.phaseBoundaryContractEnabled=false', mf.activationContract && mf.activationContract.phaseBoundaryContractEnabled === false);
  chk('C8 manifest scopeBoundary.frozenFilesUntouched=true', mf.scopeBoundary && mf.scopeBoundary.frozenFilesUntouched === true);
  chk('C8 manifest scopeBoundary.r30bPersistenceUntouched=true', mf.scopeBoundary && mf.scopeBoundary.r30bPersistenceUntouched === true);
  chk('C8 manifest scopeBoundary.r3_0d_scope_introduced=false', mf.scopeBoundary && mf.scopeBoundary.r3_0d_scope_introduced === false);
  chk('C8 manifest forbiddenCapabilities is empty (C8 has no forbidden capability)', Array.isArray(mf.forbiddenCapabilities) && mf.forbiddenCapabilities.length === 0);
  chk('C8 manifest changedFiles includes feature-registry.js', (mf.changedFiles || []).indexOf('renderer/js/feature-registry.js') !== -1);
  chk('C8 manifest changedFiles includes train.json', (mf.changedFiles || []).indexOf('governance/r3.0/train.json') !== -1);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Orchestrator authenticity gate (the heart of activation security)
// ─────────────────────────────────────────────────────────────────────────────
function _fakeDeltaMetricsService(returnIdentity) {
  return {
    computeDeltaMetrics: function (req) {
      // Returns the minimum shape orchestrator + viewmodel consume. identity mirrors caller; the
      // orchestrator's exportGate predicate compares it against the association.
      const identity = returnIdentity ? returnIdentity : (req && req.identity) || { caseId: null, sessionId: null };
      return {
        eligible: true,
        status: 'eligible',
        identity: identity,
        metrics: { lap_time: { value: 123 }, delta_cumulative: { value: 50, perCorner: [] } },
      };
    },
  };
}
function _capsAllOn() {
  return { phaseBoundaryContractEnabled: false, viewmodelStateTransitionContractEnabled: true, framingSourceStructuredContractEnabled: true };
}
function _wellFormedInput(caseRecord) {
  return {
    caseRecord: caseRecord,
    association: {
      caseId: 'case_demo',
      analysisCaseId: 'case_demo',
      sessionId: 'sess_demo',
      trackId: 'tk1',
      layoutId: 'l1',
      positionBasis: 'lap_distance',
      positionDirection: 'increasing',
    },
    referenceLap: { lapId: 'lap_R' },
    comparisonLap: { lapId: 'lap_C' },
    eligibilityInput: {
      analysisCaseId: 'case_demo',
      caseRecord: caseRecord,
      reference: {
        identity: { analysisCaseId: 'case_demo', sessionId: 'sess_demo', lapId: 'lap_R', trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' },
        lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } },
        normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' },
      },
      comparison: {
        identity: { analysisCaseId: 'case_demo', sessionId: 'sess_demo', lapId: 'lap_C', trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' },
        lapAuthority: { lapIdentity: { satisfied: true }, completeness: { satisfied: true }, timingValidity: { satisfied: true }, trackIdentity: { satisfied: true }, sampleContinuity: { satisfied: true } },
        normalizationAuthority: { basis: 'lap_distance', distanceAuthority: { satisfied: true }, positionUnit: 'm' },
      },
      credibilityMetadata: { credibility: 'Measured', provenance: 'real', confidence: 'high', limitations: [], blockedReasons: [] },
    },
    deltaMetricsRequest: {
      identity: { caseId: 'case_demo', sessionId: 'sess_demo' },
      referenceLap: { lapTimeMs: 90000 },
      comparisonLap: { lapTimeMs: 90123 },
      pairing: { pairs: [] },
      requestedMetrics: ['lap_time', 'delta_cumulative'],
      policy: { deltaSign: 'comparison_minus_reference' },
    },
  };
}

(function () {
  // Forged caseRecord — never vouched for. Predicate is the same fail-closed closure the renderer ships.
  const authWeak = new WeakSet();
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService({ caseId: 'case_demo', sessionId: 'sess_demo' }),
    authenticityPredicate: function (cr) { return cr !== null && typeof cr === 'object' && authWeak.has(cr); },
  });
  const forged = { caseId: 'case_demo', associations: { trackId: 'tk1', layoutId: 'l1' } };
  const res = orch.requestComparison(_wellFormedInput(forged));
  chk('forged caseRecord → blocked', res && res.status === 'blocked');
  chk('forged caseRecord → INTERNAL_CONTRACT_VIOLATION', res && res.reasonCodes && res.reasonCodes.indexOf(CODES.INTERNAL_CONTRACT_VIOLATION) !== -1);
})();

(function () {
  // Authoritative caseRecord — WeakSet-registered. Authenticity gate passes; eligibility passes; result eligible.
  const authWeak = new WeakSet();
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService({ caseId: 'case_demo', sessionId: 'sess_demo' }),
    authenticityPredicate: function (cr) { return cr !== null && typeof cr === 'object' && authWeak.has(cr); },
  });
  const authoritative = Object.freeze({ caseId: 'case_demo', associations: Object.freeze({ trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' }) });
  authWeak.add(authoritative);
  const res = orch.requestComparison(_wellFormedInput(authoritative));
  chk('authoritative caseRecord → eligible', res && res.status === 'eligible', res && res.reasonCodes);
  chk('eligible result has framing.observedDelta', res && res.framing && res.framing.observedDelta && typeof res.framing.observedDelta.i18nKey === 'string');
  chk('eligible result exportGate=true (identity matches association)', res && res.exportGate === true);
  chk('eligible result generationToken issued', res && typeof res.generationToken === 'number' && res.generationToken > 0);
})();

(function () {
  // Default authenticityPredicate (none provided) — orchestrator must FAIL-CLOSED on every caseRecord.
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
  });
  const res = orch.requestComparison(_wellFormedInput({ caseId: 'case_demo', associations: { trackId: 'tk1' } }));
  chk('default predicate fail-closed → blocked', res && res.status === 'blocked');
  chk('default predicate fail-closed → INTERNAL_CONTRACT_VIOLATION', res && res.reasonCodes && res.reasonCodes.indexOf(CODES.INTERNAL_CONTRACT_VIOLATION) !== -1);
})();

(function () {
  // Hostile authenticityPredicate that throws — treated as false.
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
    authenticityPredicate: function () { throw new Error('hostile predicate throw'); },
  });
  const res = orch.requestComparison(_wellFormedInput({ caseId: 'case_demo', associations: { trackId: 'tk1' } }));
  chk('hostile-throw predicate → blocked', res && res.status === 'blocked');
  chk('hostile-throw predicate → INTERNAL_CONTRACT_VIOLATION', res && res.reasonCodes && res.reasonCodes.indexOf(CODES.INTERNAL_CONTRACT_VIOLATION) !== -1);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Phase-metric gate (phase_boundary_contract still disabled at C8)
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const authWeak = new WeakSet();
  let observedReq = null;
  const dm = {
    computeDeltaMetrics: function (req) {
      observedReq = req;
      return { eligible: true, status: 'eligible', identity: { caseId: 'case_demo', sessionId: 'sess_demo' }, metrics: { lap_time: { value: 0 } } };
    },
  };
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: dm,
    authenticityPredicate: function (cr) { return cr !== null && typeof cr === 'object' && authWeak.has(cr); },
  });
  const auth = Object.freeze({ caseId: 'case_demo', associations: Object.freeze({ trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' }) });
  authWeak.add(auth);
  const input = _wellFormedInput(auth);
  // Caller TRIES to request phase metrics — orchestrator MUST strip them when capability disabled.
  input.deltaMetricsRequest.requestedMetrics = ['lap_time', 'delta_cumulative', 'entry_delta', 'mid_delta', 'exit_delta'];
  input.deltaMetricsRequest.policy = { deltaSign: 'comparison_minus_reference', phaseBoundaryAuthorisation: { contractRef: 'forged', serviceOwned: true, deterministic: true } };
  const res = orch.requestComparison(input);
  chk('phase-disabled: orchestrator strips phase metrics', observedReq && observedReq.requestedMetrics && observedReq.requestedMetrics.indexOf('entry_delta') === -1 && observedReq.requestedMetrics.indexOf('mid_delta') === -1 && observedReq.requestedMetrics.indexOf('exit_delta') === -1);
  chk('phase-disabled: phaseBoundaryAuthorisation stripped from policy', observedReq && observedReq.policy && observedReq.policy.phaseBoundaryAuthorisation === undefined);
  chk('phase-disabled: limitations carries PHASE_BOUNDARY_CONTRACT_UNAUTHORISED', res && res.limitations && res.limitations.indexOf(CODES.PHASE_BOUNDARY_CONTRACT_UNAUTHORISED) !== -1);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Scope: same-Analysis-Case / same-session enforcement
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const authWeak = new WeakSet();
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
    authenticityPredicate: function (cr) { return cr !== null && typeof cr === 'object' && authWeak.has(cr); },
  });
  const auth = Object.freeze({ caseId: 'case_demo', associations: Object.freeze({ trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' }) });
  authWeak.add(auth);
  const input = _wellFormedInput(auth);
  // Reference & comparison from DIFFERENT analysis cases — eligibility contract rejects with CROSS_CASE_COMPARISON_UNSUPPORTED.
  input.eligibilityInput.comparison.identity.analysisCaseId = 'case_OTHER';
  const res = orch.requestComparison(input);
  chk('cross-case → blocked', res && res.status === 'blocked');
})();
(function () {
  const authWeak = new WeakSet();
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
    authenticityPredicate: function (cr) { return cr !== null && typeof cr === 'object' && authWeak.has(cr); },
  });
  const auth = Object.freeze({ caseId: 'case_demo', associations: Object.freeze({ trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' }) });
  authWeak.add(auth);
  const input = _wellFormedInput(auth);
  input.eligibilityInput.comparison.identity.sessionId = 'sess_OTHER';
  const res = orch.requestComparison(input);
  chk('cross-session → blocked', res && res.status === 'blocked');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Export gating (sister-site of authenticity gate)
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  // Without exportService injected, exportComparison MUST return structured blocked, never throw.
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
    authenticityPredicate: function () { return false; },
  });
  const r = orch.exportComparison({ status: 'eligible', exportGate: true, result: {}, generationToken: 1, framing: {} }, {});
  chk('export no service → blocked', r && r.eligible === false);
})();

(function () {
  // Hostile eligibleResponse with throwing accessor on `status` — export must not throw.
  const orch = Orch.createOrchestrator({
    capabilities: _capsAllOn(),
    deltaMetricsService: _fakeDeltaMetricsService(),
    exportService: { buildComparisonExport: function () { return { eligible: true, status: 'exported' }; } },
    authenticityPredicate: function () { return false; },
  });
  let threw = false;
  let r;
  try {
    const hostile = Object.defineProperty({}, 'status', { get: function () { throw new Error('hostile getter'); }, enumerable: true, configurable: true });
    r = orch.exportComparison(hostile, {});
  } catch (e) { threw = true; }
  chk('export hostile getter on status → does not throw past boundary', !threw);
  chk('export hostile getter → structured blocked', r && r.eligible === false);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — Renderer wiring presence + Codex C-B Round 1 hardening
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
  // Codex C-B Finding C8-CB-RN-01 closure — r3cC8Authority is an IIFE-scope closure (module-level,
  // not on the Alpine app() instance). Alpine templates and any caller of app() cannot reach it.
  chk('renderer declares r3cC8Authority closure at module scope', /const r3cC8Authority = \(function/.test(html));
  chk('renderer authority closure exposes forCaseStore', /forCaseStore: function/.test(html));
  chk('renderer authority closure exposes forDemo', /forDemo: function/.test(html));
  chk('renderer authority closure exposes predicate', /predicate: function/.test(html));
  // The C7-era register helper MUST no longer be exposed on the Alpine component (closure migration).
  chk('app() no longer exposes _r3cC7RegisterAuthenticCaseRecord method', !/_r3cC7RegisterAuthenticCaseRecord\(caseRecord\)\s*\{/.test(html));
  chk('app() no longer holds _r3cC7AuthenticCaseRecords WeakSet field', !/_r3cC7AuthenticCaseRecords:\s*\(typeof WeakSet/.test(html));
  // Codex C-B Finding C8-CB-RN-05 closure — STRICT degraded rejection (=== false, not !== true).
  chk('authority closure requires o.degraded === false strict', /deg !== false/.test(html));
  // Codex C-B Round 1 Findings C8-CB-RN-03 / 04 + Round 2 Finding C8-CB-RN-10 closure — every case-context
  // transition (openCase, loadDemoAnalysisCase, runImportedAnalysis) routes through ONE shared helper
  // _r3cBeginCaseTransition() that synchronously bumps the open token, nulls the authority pointer,
  // clears caseDataHolder.lastSession (Round 2 Finding C8-CB-RN-11), and notifies the viewmodel.
  chk('app() declares _r3cBeginCaseTransition helper', /_r3cBeginCaseTransition\(\)\{/.test(html));
  chk('_r3cBeginCaseTransition bumps _r3cC8OpenToken', /_r3cBeginCaseTransition\(\)\{[\s\S]{0,200}var tok = \+\+this\._r3cC8OpenToken;/.test(html));
  chk('_r3cBeginCaseTransition nulls _r3cC8LatestAuthorityRecord', /_r3cBeginCaseTransition\(\)\{[\s\S]{0,400}this\._r3cC8LatestAuthorityRecord = null;/.test(html));
  chk('_r3cBeginCaseTransition clears caseDataHolder.lastSession', /_r3cBeginCaseTransition\(\)\{[\s\S]{0,400}caseDataHolder\.lastSession = null/.test(html));
  chk('_r3cBeginCaseTransition invokes notifyCaseReopen', /_r3cBeginCaseTransition\(\)\{[\s\S]{0,500}notifyCaseReopen/.test(html));
  chk('openCase calls _r3cBeginCaseTransition', /openCase\(id\)\{[\s\S]{0,1500}this\._r3cBeginCaseTransition\(\)/.test(html));
  chk('loadDemoAnalysisCase calls _r3cBeginCaseTransition', /loadDemoAnalysisCase\(\)\{[\s\S]{0,1500}this\._r3cBeginCaseTransition\(\)/.test(html));
  chk('runImportedAnalysis calls _r3cBeginCaseTransition', /runImportedAnalysis\(\)\{[\s\S]{0,1500}this\._r3cBeginCaseTransition\(\)/.test(html));
  // Codex C-B Round 1 Finding C8-CB-RN-04 — token guard at promise commit.
  chk('openCase declares _r3cC8OpenToken state field', /_r3cC8OpenToken:\s*0/.test(html));
  chk('openCase promise commit checks token freshness', /if \(tok !== self\._r3cC8OpenToken\) return;/.test(html));
  // Codex C-B Finding C8-CB-RN-06 closure — selectors + export button have @-handlers wired through vm.
  chk('reference selector has @change handler', /reference-selector"[\s\S]{0,200}@change="r3cC8OnReferenceSelected/.test(html));
  chk('comparison selector has @change handler', /comparison-selector"[\s\S]{0,200}@change="r3cC8OnComparisonSelected/.test(html));
  chk('export button has @click handler', /data-r3c-c7="export-action"[\s\S]{0,200}@click="r3cC8OnExportClick/.test(html));
  // Helpers are present
  chk('app() declares r3cC8LapCandidates', /r3cC8LapCandidates\(\)\{/.test(html));
  chk('app() declares r3cC8OnReferenceSelected', /r3cC8OnReferenceSelected\(lapId\)\{/.test(html));
  chk('app() declares r3cC8OnComparisonSelected', /r3cC8OnComparisonSelected\(lapId\)\{/.test(html));
  chk('app() declares r3cC8OnExportClick', /r3cC8OnExportClick\(\)\{/.test(html));
  chk('app() declares _r3cC8SyncAssociationFromCase', /_r3cC8SyncAssociationFromCase\(rec, caseSource\)\{/.test(html));
  // Comparison Workspace pane wiring from C7 remains
  chk('index.html keeps Comparison Workspace pane', html.indexOf('data-r3c-c7-pane="comparison-workspace"') !== -1);
  // Codex C-B Round 2 Finding C8-CB-RN-09 closure — both r3cC8Authority and function app() live inside an
  // outer IIFE; only `root.app = app;` is exposed to globalThis. The IIFE wrapper opens just before the
  // r3cC8Authority declaration and closes after the function app() block, with an explicit `root.app = app;`
  // exposure line that Alpine's x-data="app()" resolves through globalThis.
  chk('renderer wraps r3cC8Authority + app() in outer IIFE', /;\(function \(root\) \{[\s\S]{0,200}'use strict';[\s\S]{0,1500}const r3cC8Authority = \(function/.test(html));
  chk('renderer outer IIFE closes after app() with root.app exposure', /\}\}\s*[\s\S]{0,800}root\.app = app;[\s\S]{0,200}\}\)\(typeof globalThis/.test(html));
  // Codex C-B Round 2 Finding C8-CB-RN-11 closure — lap candidates are gated by session-id match.
  chk('renderer declares _r3cC8AuthoritativeSessionId helper', /_r3cC8AuthoritativeSessionId\(\)\{/.test(html));
  chk('renderer declares _r3cC8AuthoritativeSession helper', /_r3cC8AuthoritativeSession\(\)\{/.test(html));
  chk('r3cC8LapCandidates reads gated session, not raw lastSession', /r3cC8LapCandidates\(\)\{[\s\S]{0,300}this\._r3cC8AuthoritativeSession\(\)/.test(html));
  chk('_r3cC8LapFor reads gated session, not raw lastSession', /_r3cC8LapFor\(lapId\)\{[\s\S]{0,200}this\._r3cC8AuthoritativeSession\(\)/.test(html));
  chk('_r3cC8AuthoritativeSession requires sessionId match with authority record', /_r3cC8AuthoritativeSession\(\)\{[\s\S]{0,800}if \(loadedId !== sid\) return null;/.test(html));
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 9 — Viewmodel preserves caseRecord identity (Codex C-B Finding C8-CB-RN-02)
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const VM = require('../renderer/js/r3-0c-comparison-viewmodel.js');
  // Stub orchestrator — the viewmodel calls requestComparison synchronously after every mutator,
  // but we ONLY want to assert that _state.caseRecord preserved identity. requestComparison
  // returning blocked is fine; what matters is what reference the viewmodel passed back IF we
  // could observe it. We instead read getState().reference / comparison and verify the test
  // input identity is held — but caseRecord itself is private. We check identity preservation
  // by reading the orchestrator-side input: capture the input synchronously.
  let captured = null;
  const orch = {
    requestComparison: function (input) { captured = input; return { status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], framing: null, generationToken: input && input.generationToken || 0 }; },
  };
  const vm = VM.createComparisonViewModel({ orchestrator: orch, capabilities: _capsAllOn() });
  const authoritative = Object.freeze({ caseId: 'case_demo', associations: Object.freeze({ trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing' }) });
  vm.setAssociation({
    caseId: 'case_demo', analysisCaseId: 'case_demo', sessionId: 'sess_demo', trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing',
    caseRecord: authoritative,
  });
  vm.setChannelMapping({ pairing: { pairs: [] } });
  vm.setReference({ lapId: 'lap_R', lapTimeMs: 90000 });
  vm.setComparison({ lapId: 'lap_C', lapTimeMs: 90100 });
  chk('vm preserves caseRecord identity through setAssociation→requestComparison', captured && captured.caseRecord === authoritative);
  // A non-frozen plain object — viewmodel MUST reject it (identity check requires frozen).
  let captured2 = null;
  const orch2 = { requestComparison: function (input) { captured2 = input; return { status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], framing: null, generationToken: 0 }; } };
  const vm2 = VM.createComparisonViewModel({ orchestrator: orch2, capabilities: _capsAllOn() });
  const nonFrozen = { caseId: 'case_demo', associations: { trackId: 'tk1', layoutId: 'l1' } };
  vm2.setAssociation({ caseId: 'case_demo', analysisCaseId: 'case_demo', sessionId: 'sess_demo', trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing', caseRecord: nonFrozen });
  vm2.setChannelMapping({ pairing: { pairs: [] } });
  vm2.setReference({ lapId: 'lap_R', lapTimeMs: 90000 });
  vm2.setComparison({ lapId: 'lap_C', lapTimeMs: 90100 });
  chk('vm rejects non-frozen caseRecord (caseRecord becomes null)', captured2 && captured2.caseRecord === null);
  // Hostile Proxy whose ownKeys throws — viewmodel reads via try/catch so caseRecord becomes null.
  let captured3 = null;
  const orch3 = { requestComparison: function (input) { captured3 = input; return { status: 'blocked', reasonCodes: [CODES.INTERNAL_CONTRACT_VIOLATION], framing: null, generationToken: 0 }; } };
  const vm3 = VM.createComparisonViewModel({ orchestrator: orch3, capabilities: _capsAllOn() });
  const hostile = new Proxy({}, { ownKeys: function () { throw new Error('hostile'); }, getPrototypeOf: function () { return Object.prototype; } });
  vm3.setAssociation({ caseId: 'case_demo', analysisCaseId: 'case_demo', sessionId: 'sess_demo', trackId: 'tk1', layoutId: 'l1', positionBasis: 'lap_distance', positionDirection: 'increasing', caseRecord: hostile });
  vm3.setChannelMapping({ pairing: { pairs: [] } });
  vm3.setReference({ lapId: 'lap_R', lapTimeMs: 90000 });
  vm3.setComparison({ lapId: 'lap_C', lapTimeMs: 90100 });
  chk('vm rejects hostile-Proxy caseRecord (caseRecord becomes null)', captured3 && captured3.caseRecord === null);
})();

// ─────────────────────────────────────────────────────────────────────────────
// Section 10 — Runtime IIFE-closure proof (Codex C-B Round 2 Finding C8-CB-RN-09)
// ─────────────────────────────────────────────────────────────────────────────
// Execute the renderer's `<script>` block in an isolated Node vm context and prove:
//   1. `app` is exposed on the realm's globalThis (Alpine binding works)
//   2. `r3cC8Authority` is NOT exposed on globalThis AND is not lexically resolvable from
//      any eval inside the same realm AFTER the script block returns — confirming the IIFE
//      truly traps the closure (the very claim Codex C-B Round 2 demanded a runtime proof of).
// We extract the script block from index.html via regex (the single <script>…</script> that
// contains `function app(`) and inject minimal stubs for the UMD globals the block depends on.
(function () {
  const vm = require('vm');
  const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
  const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
  const appBlock = scriptMatches.find(s => /function app\(/.test(s));
  if (!appBlock) { chk('found app() script block', false); return; }
  const code = appBlock.replace(/^<script>/, '').replace(/<\/script>$/, '');
  // Stub the modules the block touches at top-level (UMD globals from other <script src> tags).
  const stubFn = function () { return null; };
  const realm = {
    console, Date, Math, JSON, Array, Object, Number, String, Boolean, Symbol, Promise, WeakSet, WeakMap, Map, Set, RegExp, Error,
    setTimeout: (typeof setTimeout !== 'undefined') ? setTimeout : function () { return 0; }, clearTimeout: (typeof clearTimeout !== 'undefined') ? clearTimeout : function () {},
    document: { addEventListener: stubFn, getElementById: stubFn, body: { __x: null }, documentElement: { lang: '' } },
    window: {}, location: { hostname: '' },
    Chart: function () { return { destroy: stubFn }; },
    api: { getTires: function () { return []; }, getPresets: function () { return []; }, estimateTireSpring: stubFn, suggestRimSizes: function () { return []; }, compare: function () { return {}; } },
    FeatureRegistry: { FEATURES: {}, NAV_NODES: {}, deriveMainNav: function () { return []; }, getFeature: stubFn, isFeatureReachable: stubFn, deriveCaseSubviewIds: function () { return []; }, deriveSetupLibraryPaneIds: function () { return []; } },
    FeatureRouter: { navigateToFeature: stubFn, applyRoute: function (r, ns) { return Object.assign({}, ns); } },
    StorageBackend: { IndexedDBBackend: function () { return {}; } },
    CaseStore: { createCaseStore: function () { return { list: function () { return Promise.resolve([]); }, open: function () { return Promise.resolve({ ok: false }); } }; } },
    SessionStore: { createSessionStore: function () { return { put: function () { return Promise.resolve({ ok: false }); } }; } },
    CaseLibraryViewModel: { buildCaseLibraryView: function () { return {}; } },
    AnalysisWorkspace: { runAnalysisWorkspace: function () { return {}; } },
    AnalysisWorkspaceViewModel: { buildAnalysisWorkspaceViewModel: function () { return {}; } },
    DemoAnalysisCase: { buildDemoAnalysisCase: function () { return { analysisCase: { caseId: 'demo' }, telemetrySession: {} }; }, buildDemoTelemetryCsv: function () { return ''; }, buildDemoCornerTelemetryCsv: function () { return ''; } },
    R3_0C_ComparisonOrchestrator: { createOrchestrator: function () { return { requestComparison: stubFn, exportComparison: stubFn, currentToken: function () { return 0; } }; } },
    R3_0C_ComparisonViewModel: { createComparisonViewModel: function () { return { setReference: stubFn, setComparison: stubFn, setAssociation: stubFn, setChannelMapping: stubFn, notifyCaseReopen: stubFn, notifyAuthorityRevoked: stubFn, notifyEligibilityRevoked: stubFn, getState: function () { return {}; } }; } },
    CanonicalTelemetrySession: { buildCanonicalSession: function () { return {}; } },
    ChannelMapping: { buildChannelMapping: function () { return { suggestions: [], mappingEntries: [] }; }, projectionSignature: stubFn },
    CalibrationRegistry: { CALIBRATION_TYPE: { STEERING_SIGN: 'ss', STEERING_ZERO: 'sz', STEERING_RATIO: 'sr' } },
    Tier1BasicBalance: {},
    requestAnimationFrame: function () { return 0; }, cancelAnimationFrame: stubFn,
    ResizeObserver: function () { return { observe: stubFn, disconnect: stubFn }; },
  };
  // Self-globalThis aliases so the IIFE's `root.app = app` lands somewhere we can read.
  realm.globalThis = realm;
  const ctx = vm.createContext(realm);
  // Provide reduced typeof helpers — the script body references `globalThis`, `WeakSet`, etc. (`typeof` checks).
  let runOk = false;
  try { vm.runInContext(code, ctx, { filename: 'renderer/index.html (extracted script block)', timeout: 5000 }); runOk = true; } catch (e) { chk('renderer script executes in vm context', false, String(e).slice(0, 200)); }
  if (!runOk) return;
  chk('renderer exposes app on globalThis after IIFE', typeof realm.app === 'function');
  chk('renderer does NOT expose r3cC8Authority on globalThis', typeof realm.r3cC8Authority === 'undefined');
  // Final defence: an eval inside the SAME realm AFTER the script has returned cannot resolve
  // r3cC8Authority by name (lexical reference fails — ReferenceError).
  // Errors thrown inside vm.runInContext live in the vm realm; instanceof Error from the parent realm
  // does not cross. Use the message text + constructor name instead — both reliably identify ReferenceError.
  function _isReferenceError(e, ident) {
    if (!e) return false;
    const msg = typeof e.message === 'string' ? e.message : String(e);
    return /is not defined/.test(msg) && (ident == null || new RegExp('^' + ident + ' ').test(msg));
  }
  let refErr = null;
  try { vm.runInContext('void r3cC8Authority;', ctx); } catch (e) { refErr = e; }
  chk('eval cannot lexically resolve r3cC8Authority after IIFE', _isReferenceError(refErr, 'r3cC8Authority'), refErr && refErr.message);
  // Same proof for the registration functions — neither forCaseStore nor forDemo is reachable by name.
  let refErrForCS = null; try { vm.runInContext('void forCaseStore;', ctx); } catch (e) { refErrForCS = e; }
  chk('eval cannot resolve forCaseStore by name', _isReferenceError(refErrForCS, 'forCaseStore'), refErrForCS && refErrForCS.message);
  let refErrForDemo = null; try { vm.runInContext('void forDemo;', ctx); } catch (e) { refErrForDemo = e; }
  chk('eval cannot resolve forDemo by name', _isReferenceError(refErrForDemo, 'forDemo'), refErrForDemo && refErrForDemo.message);
})();

console.log('r3-0c-activation: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
