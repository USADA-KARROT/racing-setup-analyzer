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
// Section 8 — Renderer wiring presence (the four C8 helpers MUST be source-visible)
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
  chk('index.html declares _r3cC8LatestAuthorityRecord', html.indexOf('_r3cC8LatestAuthorityRecord') !== -1);
  chk('index.html declares _r3cC8BuildAuthoritativeRecord', html.indexOf('_r3cC8BuildAuthoritativeRecord') !== -1);
  chk('index.html declares _r3cC8RegisterAuthoritativeFromCaseStore', html.indexOf('_r3cC8RegisterAuthoritativeFromCaseStore') !== -1);
  chk('index.html declares _r3cC8RegisterAuthoritativeFromDemoCase', html.indexOf('_r3cC8RegisterAuthoritativeFromDemoCase') !== -1);
  chk('index.html openCase invokes C8 case-store register', /openCase[\s\S]{0,2000}_r3cC8RegisterAuthoritativeFromCaseStore/.test(html));
  chk('index.html loadDemoAnalysisCase invokes C8 demo register', /loadDemoAnalysisCase[\s\S]{0,3000}_r3cC8RegisterAuthoritativeFromDemoCase/.test(html));
  // Defense: helper short-circuits on degraded (imported_summary)
  chk('index.html helper checks o.degraded', html.indexOf('o.degraded === true') !== -1);
  // Comparison Workspace pane wiring from C7 remains
  chk('index.html keeps Comparison Workspace pane', html.indexOf('data-r3c-c7-pane="comparison-workspace"') !== -1);
})();

console.log('r3-0c-activation: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail === 0 ? 0 : 1);
