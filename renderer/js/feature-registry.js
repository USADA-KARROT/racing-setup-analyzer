/**
 * feature-registry.js — R3-UX0: the SINGLE source of truth for feature identity + navigation structure (PURE/UMD).
 *
 * FEATURES  — the 23 stable, locale/renderer-invariant Feature IDs (see docs/r3-ux0-feature-id-contract.md).
 * NAV_NODES — the navigation STRUCTURE (shell sections / setup-library areas / case subviews) that is NOT itself a
 *             feature but is needed to render navigation (Dashboard/Import/Settings/Comparisons + overview/telemetry).
 *
 * Every navigation surface (mainNav, caseNav, the former caseSubviewIds, setupLibraryTabs, the showPane /
 * setShellSection / setCaseSubview routing) is a PROJECTION of this one structure via the derivation functions
 * below — no second whitelist. The only place legacy UI-state names (shellSection/currentTab/caseSubview/paneId)
 * live is `NAV_NODES[].legacyRouting` + `FEATURES[].rendererAdapter`.
 *
 * UMD: Node require / Electron renderer global (FeatureRegistry).
 */
(function (root) {
  'use strict';

  // ── NAV_NODES — navigation structure (not features) ──
  var NAV_NODES = {
    dashboard: { id: 'dashboard', kind: 'shell_section', labelKey: 'nav.dashboard', order: 0, availability: 'available', legacyRouting: { shellSection: 'dashboard', currentTab: 'dashboard' } },
    cases: { id: 'cases', kind: 'shell_section', labelKey: 'nav.cases', order: 1, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'overview', currentTab: 'analysis' } },
    import: { id: 'import', kind: 'shell_section', labelKey: 'nav.import', order: 2, availability: 'available', legacyRouting: { shellSection: 'import', caseSubview: 'overview', currentTab: 'analysis' } },
    setup_library: { id: 'setup_library', kind: 'shell_section', labelKey: 'nav.setup_library', order: 3, availability: 'available', legacyRouting: { shellSection: 'setup_library' } },
    comparisons: { id: 'comparisons', kind: 'shell_section', labelKey: 'nav.comparisons', order: 4, availability: 'available', legacyRouting: { shellSection: 'comparisons', currentTab: 'comparisons' } },
    settings: { id: 'settings', kind: 'shell_section', labelKey: 'nav.settings', order: 5, availability: 'available', legacyRouting: { shellSection: 'settings', currentTab: 'guide' } },
    // setup-library areas
    'setuplib:vehicle_setup': { id: 'setuplib:vehicle_setup', kind: 'setuplib_area', parentNodeId: 'setup_library', labelKey: 'setuplib.area.vehicle_setup', order: 0, availability: 'available' },
    'setuplib:engineering_tools': { id: 'setuplib:engineering_tools', kind: 'setuplib_area', parentNodeId: 'setup_library', labelKey: 'setuplib.area.engineering_tools', order: 1, availability: 'available' },
    'setuplib:analysis_support': { id: 'setuplib:analysis_support', kind: 'setuplib_area', parentNodeId: 'setup_library', labelKey: 'setuplib.area.analysis_support', order: 2, availability: 'available' },
    // case subviews (parent 'cases'); overview + telemetry are nav nodes, not features
    'case:overview': { id: 'case:overview', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'overview', labelKey: 'casenav.overview', order: 0, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'overview', currentTab: 'analysis' } },
    'case:setup_model': { id: 'case:setup_model', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'setup_model', labelKey: 'casenav.setup_model', order: 1, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'setup_model', currentTab: 'predict' } },
    'case:telemetry': { id: 'case:telemetry', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'telemetry', labelKey: 'casenav.telemetry', order: 2, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'telemetry', currentTab: 'analysis' } },
    'case:measured_metrics': { id: 'case:measured_metrics', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'measured_metrics', labelKey: 'casenav.measured_metrics', order: 3, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'measured_metrics', currentTab: 'analysis' } },
    'case:model_vs_actual': { id: 'case:model_vs_actual', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'model_vs_actual', labelKey: 'casenav.model_vs_actual', order: 4, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'model_vs_actual', currentTab: 'analysis' } },
    'case:recommendations': { id: 'case:recommendations', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'recommendations', labelKey: 'casenav.recommendations', order: 5, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'recommendations', currentTab: 'analysis' } },
    'case:corner_coaching': { id: 'case:corner_coaching', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'corner_coaching', labelKey: 'casenav.corner_coaching', order: 6, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'corner_coaching', currentTab: 'analysis' } },
    'case:evidence_trust': { id: 'case:evidence_trust', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'evidence_trust', labelKey: 'casenav.evidence_trust', order: 7, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'evidence_trust', currentTab: 'analysis' } },
    // R3.0D D5 — Engineer Brief subview. NAV NODE ONLY at this milestone: the D5 mount in
    // renderer/index.html ships hidden/inert and no UI event calls the orchestrator's
    // prepareEngineerInsight — pane content is a downstream wire-in step (disclosed in
    // docs/release-notes-2.0.0.md "Known limitations"). Activation governed by
    // governance/r3.0d/state.json (featureRegistryActivationAllowed=true at
    // D5_ENGINEER_BRIEF_ACTIVATION).
    'case:engineer_brief': { id: 'case:engineer_brief', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'engineer_brief', labelKey: 'casenav.engineer_brief', order: 8, availability: 'available', legacyRouting: { shellSection: 'cases', caseSubview: 'engineer_brief', currentTab: 'analysis' } },
    // R3.0E E5 — Experiment Loop + Case Timeline subviews. NAV NODES ONLY at this milestone:
    // renderer/index.html loads no R3.0E viewmodel script and renders no pane content for
    // either subview — pane wiring is a downstream step (disclosed in
    // docs/release-notes-2.0.0.md "Known limitations"). Activation governed by
    // governance/r3.0e/state.json (featureRegistryActivationAllowed=true at E5_UI_ACTIVATION).
    'case:experiment_loop': { id: 'case:experiment_loop', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'experiment_loop', labelKey: 'casenav.experiment_loop', order: 9, availability: 'deferred', deferredReason: 'h5_ui_delivery_deferred', legacyRouting: { shellSection: 'cases', caseSubview: 'experiment_loop', currentTab: 'analysis' } },
    'case:case_timeline': { id: 'case:case_timeline', kind: 'case_subview', parentNodeId: 'cases', subviewId: 'case_timeline', labelKey: 'casenav.case_timeline', order: 10, availability: 'deferred', deferredReason: 'h5_ui_delivery_deferred', legacyRouting: { shellSection: 'cases', caseSubview: 'case_timeline', currentTab: 'analysis' } },
  };

  // ── FEATURES — the 23 stable Feature IDs ──
  function F(id, area, navNodeId, paneId, opts) {
    opts = opts || {};
    var e = { id: id, area: area, labelKey: 'feat.' + id, descriptionKey: 'feat.' + id + '.desc', availability: opts.availability || 'available', navNodeId: navNodeId, capabilities: opts.capabilities || [], allowedActions: opts.allowedActions || [], entryPoints: opts.entryPoints || { desktop: true, mobile: true } };
    if (opts.deferredReason) e.deferredReason = opts.deferredReason;
    if (paneId) e.rendererAdapter = { paneId: paneId, focusTarget: opts.focusTarget || null };
    return e;
  }
  var FEATURES = {
    // A — Vehicle & Setup (predict pane → fixes the Setup-Library orphan)
    vehicle_presets: F('vehicle_presets', 'vehicle_setup', 'setuplib:vehicle_setup', 'predict', { focusTarget: 'vp-browser', allowedActions: ['browse', 'build_draft'] }),
    vehicle_preset_detail: F('vehicle_preset_detail', 'vehicle_setup', 'setuplib:vehicle_setup', 'predict', { focusTarget: 'vp-detail', allowedActions: ['browse'], entryPoints: { desktop: false, mobile: false } }),
    custom_setup: F('custom_setup', 'vehicle_setup', 'setuplib:vehicle_setup', 'predict', { focusTarget: 'custom-setup', allowedActions: ['edit'] }),
    handling_prediction: F('handling_prediction', 'vehicle_setup', 'setuplib:vehicle_setup', 'predict', { focusTarget: 'handling-gauge', capabilities: ['Physics', 'Model'] }),
    // B — Engineering Tools
    spring_calculator: F('spring_calculator', 'engineering_tools', 'setuplib:engineering_tools', 'spring'),
    arb_calculator: F('arb_calculator', 'engineering_tools', 'setuplib:engineering_tools', 'spring', { focusTarget: 'arb-section' }),
    suspension_kinematics: F('suspension_kinematics', 'engineering_tools', 'setuplib:engineering_tools', 'spring', { focusTarget: 'kinematics-section' }),
    corner_weight: F('corner_weight', 'engineering_tools', 'setuplib:engineering_tools', 'predict', { focusTarget: 'corner-weight-section' }),
    tire_analysis: F('tire_analysis', 'engineering_tools', 'setuplib:engineering_tools', 'tire'),
    wheel_upgrade: F('wheel_upgrade', 'engineering_tools', 'setuplib:engineering_tools', 'predict', { focusTarget: 'wheel-upgrade-section' }),
    // C — Analysis & Support
    setup_advisor: F('setup_advisor', 'analysis_support', 'setuplib:analysis_support', 'advisor'),
    lihpao_simulator: F('lihpao_simulator', 'analysis_support', 'setuplib:analysis_support', 'lihpao'),
    telemetry_viewer: F('telemetry_viewer', 'analysis_support', 'setuplib:analysis_support', 'telemetry'),
    // Case-scoped
    analysis_cases: F('analysis_cases', 'case_scoped', 'cases', 'analysis'),
    case_setup_model: F('case_setup_model', 'case_scoped', 'case:setup_model', 'predict'),
    measured_metrics: F('measured_metrics', 'case_scoped', 'case:measured_metrics', 'analysis', { availability: 'available_conditional' }),
    model_vs_actual: F('model_vs_actual', 'case_scoped', 'case:model_vs_actual', 'analysis', { availability: 'available_conditional' }),
    recommendations: F('recommendations', 'case_scoped', 'case:recommendations', 'analysis', { availability: 'available_conditional' }),
    corner_coaching: F('corner_coaching', 'case_scoped', 'case:corner_coaching', 'analysis', { availability: 'available_conditional' }),
    evidence_trust: F('evidence_trust', 'case_scoped', 'case:evidence_trust', 'analysis'),
    // R3.0D D5 — Engineer Brief feature. case_scoped; available_conditional describes the
    // per-case DATA gate the D5 viewmodel enforces (no authoritative D3/D4/D5 chain →
    // 'unavailable' / 'inconclusive' display state). NOTE: at this milestone no shipped
    // pane renders it — the index.html mount is hidden/inert (nav node only; see
    // docs/release-notes-2.0.0.md "Known limitations").
    engineer_brief: F('engineer_brief', 'case_scoped', 'case:engineer_brief', 'analysis', { availability: 'available_conditional' }),
    // R3.0E E5 — Experiment Loop + Case Timeline features. case_scoped;
    // available_conditional describes the per-case DATA gate the R3.0E experiment
    // viewmodel enforces (no authoritative E3 outcome / E4 projection → 'unavailable'
    // display state — exercised by the Node suites). NOTE: at this milestone
    // renderer/index.html loads no R3.0E viewmodel script and renders no pane for either
    // subview (nav nodes only; see docs/release-notes-2.0.0.md "Known limitations").
    // H5 UI-delivery ruling: pane content is NOT wired in this release; the ids stay DEFERRED
    // (registry truth) and their nav nodes are filtered from public navigation below.
    experiment_loop: F('experiment_loop', 'case_scoped', 'case:experiment_loop', 'analysis', { availability: 'deferred', deferredReason: 'h5_ui_delivery_deferred' }),
    case_timeline: F('case_timeline', 'case_scoped', 'case:case_timeline', 'analysis', { availability: 'deferred', deferredReason: 'h5_ui_delivery_deferred' }),
    // R3.0C — activated at C8_ACTIVATION (governance/r3.0c/state.json featureRegistryActivationAllowed=true).
    // Pane id 'comparisons' is served by the Comparison Workspace UI (renderer/index.html data-r3c-c7-pane).
    // Same-Analysis-Case / same-session scope is enforced by the orchestrator + viewmodel; feature-router only
    // resolves the route (shellSection=comparisons / currentTab=comparisons via NAV_NODES.comparisons.legacyRouting).
    // Mobile entry point stays false: the workspace is a multi-pane desktop surface.
    case_comparison: F('case_comparison', 'case_comparison', 'comparisons', 'comparisons', { allowedActions: ['compare'], entryPoints: { desktop: true, mobile: false } }),
    reference_lap: F('reference_lap', 'case_comparison', 'comparisons', 'comparisons', { allowedActions: ['select_reference'], entryPoints: { desktop: true, mobile: false } }),
    corner_delta: F('corner_delta', 'case_comparison', 'comparisons', 'comparisons', { allowedActions: ['inspect_corner'], entryPoints: { desktop: true, mobile: false } }),
  };

  // ── derivation (the single projection algorithm) ──
  function _byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function _nodes(kind) { return Object.keys(NAV_NODES).map(function (k) { return NAV_NODES[k]; }).filter(function (n) { return n.kind === kind; }).sort(_byOrder); }
  function _features() { return Object.keys(FEATURES).map(function (k) { return FEATURES[k]; }); }

  function deriveMainNav() { return _nodes('shell_section').map(function (n) { var o = { id: n.id, labelKey: n.labelKey }; if (n.availability === 'deferred') o.deferred = n.deferredReason; return o; }); }
  // H5: deferred case subviews are NOT publicly navigable (no empty-pane nav targets).
  function deriveCaseNav() { return _nodes('case_subview').filter(function (n) { return n.availability !== 'deferred'; }).map(function (n) { return { id: n.subviewId, labelKey: n.labelKey }; }); }
  function deriveCaseSubviewIds() { return _nodes('case_subview').filter(function (n) { return n.availability !== 'deferred'; }).map(function (n) { return n.subviewId; }); }
  function deriveSetupLibraryAreas() {
    return _nodes('setuplib_area').map(function (area) {
      var feats = _features().filter(function (f) { return f.navNodeId === area.id && f.entryPoints && f.entryPoints.desktop === true; })
        .map(function (f) { return { id: f.id, labelKey: f.labelKey, descriptionKey: f.descriptionKey, availability: f.availability, allowedActions: f.allowedActions }; });
      return { areaId: area.id, labelKey: area.labelKey, features: feats };
    });
  }
  // the pane-id whitelist for the setup_library section — DERIVED (replaces the inline array; INCLUDES 'predict')
  function deriveSetupLibraryPaneIds() {
    var set = {}; _features().forEach(function (f) { if ((f.area === 'vehicle_setup' || f.area === 'engineering_tools' || f.area === 'analysis_support') && f.rendererAdapter) set[f.rendererAdapter.paneId] = true; });
    return Object.keys(set);
  }

  function getFeature(id) { return FEATURES[id] || null; }
  function getNode(id) { return NAV_NODES[id] || null; }

  // NOTE: featureId → legacy UI-state (shellSection/currentTab/caseSubview) is constructed ONLY in feature-router.js
  // (the single translator). The registry stays declarative data (FEATURES/NAV_NODES) + navigation derivations.

  function getFeatureBreadcrumb(featureId) {
    var f = FEATURES[featureId]; if (!f) return [];
    var crumbs = [], node = NAV_NODES[f.navNodeId];
    if (node && node.kind === 'setuplib_area') { crumbs.push({ id: 'setup_library', labelKey: NAV_NODES.setup_library.labelKey }); crumbs.push({ id: node.id, labelKey: node.labelKey }); }
    else if (node && node.parentNodeId) { var p = NAV_NODES[node.parentNodeId]; if (p) crumbs.push({ id: p.id, labelKey: p.labelKey }); crumbs.push({ id: node.id, labelKey: node.labelKey }); }
    else if (node) { crumbs.push({ id: node.id, labelKey: node.labelKey }); }
    crumbs.push({ id: f.id, labelKey: f.labelKey });
    return crumbs;
  }
  function isFeatureReachable(featureId) {
    var f = FEATURES[featureId]; if (!f) return false;
    if (f.availability === 'deferred') return true; // reachable as an explicit deferred panel
    return !!(f.navNodeId && NAV_NODES[f.navNodeId] && (f.rendererAdapter || f.area === 'deferred'));
  }
  function getFeatureEntryPoints(featureId) { var f = FEATURES[featureId]; return f ? f.entryPoints : null; }

  // registry self-validation (used by contract tests)
  function validateRegistry() {
    var errors = [];
    var ids = Object.keys(FEATURES);
    var seen = {};
    ids.forEach(function (id) {
      var f = FEATURES[id];
      if (f.id !== id) errors.push('id_mismatch:' + id);
      if (seen[id]) errors.push('duplicate_id:' + id); seen[id] = true;
      ['id', 'area', 'labelKey', 'availability', 'navNodeId', 'entryPoints'].forEach(function (k) { if (f[k] === undefined || f[k] === null) errors.push('missing_field:' + id + '.' + k); });
      if (!NAV_NODES[f.navNodeId]) errors.push('dangling_navNode:' + id + '->' + f.navNodeId);
      if (f.availability === 'deferred') { if (!f.deferredReason) errors.push('deferred_no_reason:' + id); }
      else if (!f.rendererAdapter) errors.push('no_renderer_adapter:' + id);
      if (f.availability !== 'deferred' && !isFeatureReachable(id)) errors.push('unreachable:' + id);
    });
    return { ok: errors.length === 0, errors: errors };
  }

  var api = {
    FEATURES: FEATURES, NAV_NODES: NAV_NODES,
    getFeature: getFeature, getNode: getNode,
    deriveMainNav: deriveMainNav, deriveCaseNav: deriveCaseNav, deriveCaseSubviewIds: deriveCaseSubviewIds,
    deriveSetupLibraryAreas: deriveSetupLibraryAreas, deriveSetupLibraryPaneIds: deriveSetupLibraryPaneIds,
    getFeatureBreadcrumb: getFeatureBreadcrumb,
    isFeatureReachable: isFeatureReachable, getFeatureEntryPoints: getFeatureEntryPoints,
    validateRegistry: validateRegistry,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FeatureRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
