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
    comparisons: { id: 'comparisons', kind: 'shell_section', labelKey: 'nav.comparisons', order: 4, availability: 'deferred', deferredReason: 'R3.0C', legacyRouting: { shellSection: 'comparisons', currentTab: 'comparisons' } },
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
    // Deferred (R3.0C) — no rendererAdapter; non-actionable
    case_comparison: F('case_comparison', 'deferred', 'comparisons', null, { availability: 'deferred', deferredReason: 'R3.0C', allowedActions: [], entryPoints: { desktop: true, mobile: false } }),
    reference_lap: F('reference_lap', 'deferred', 'comparisons', null, { availability: 'deferred', deferredReason: 'R3.0C', allowedActions: [], entryPoints: { desktop: true, mobile: false } }),
    corner_delta: F('corner_delta', 'deferred', 'comparisons', null, { availability: 'deferred', deferredReason: 'R3.0C', allowedActions: [], entryPoints: { desktop: true, mobile: false } }),
  };

  // ── derivation (the single projection algorithm) ──
  function _byOrder(a, b) { return (a.order || 0) - (b.order || 0); }
  function _nodes(kind) { return Object.keys(NAV_NODES).map(function (k) { return NAV_NODES[k]; }).filter(function (n) { return n.kind === kind; }).sort(_byOrder); }
  function _features() { return Object.keys(FEATURES).map(function (k) { return FEATURES[k]; }); }

  function deriveMainNav() { return _nodes('shell_section').map(function (n) { var o = { id: n.id, labelKey: n.labelKey }; if (n.availability === 'deferred') o.deferred = n.deferredReason; return o; }); }
  function deriveCaseNav() { return _nodes('case_subview').map(function (n) { return { id: n.subviewId, labelKey: n.labelKey }; }); }
  function deriveCaseSubviewIds() { return _nodes('case_subview').map(function (n) { return n.subviewId; }); }
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

  // resolve the legacy routing instructions for a feature (the ONLY place feature→pane state is computed)
  function resolveFeatureRoute(featureId) {
    var f = FEATURES[featureId]; if (!f) return null;
    var node = NAV_NODES[f.navNodeId] || null;
    var route;
    if (node && node.kind === 'setuplib_area') {
      // setup_library section + the feature's own pane (this is what fixes 'predict' being orphaned)
      route = { shellSection: 'setup_library', currentTab: f.rendererAdapter ? f.rendererAdapter.paneId : null };
    } else if (node && node.legacyRouting) {
      route = Object.assign({}, node.legacyRouting);
    } else {
      route = {};
    }
    if (f.rendererAdapter && f.rendererAdapter.focusTarget) route.focusTarget = f.rendererAdapter.focusTarget;
    route.featureId = featureId; route.deferred = f.availability === 'deferred' ? (f.deferredReason || true) : false;
    return route;
  }

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
    resolveFeatureRoute: resolveFeatureRoute, getFeatureBreadcrumb: getFeatureBreadcrumb,
    isFeatureReachable: isFeatureReachable, getFeatureEntryPoints: getFeatureEntryPoints,
    validateRegistry: validateRegistry,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FeatureRegistry = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
