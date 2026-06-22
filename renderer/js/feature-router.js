/**
 * feature-router.js — R3-UX0: the ONLY code that translates a Feature ID into legacy UI-state (PURE/UMD).
 *
 * Product code calls `navigateToFeature(featureId)` (or a NAV node via `navigateToNode`) instead of setting
 * `shellSection`/`currentTab`/`caseSubview` directly. The router resolves the route from the Feature Registry and
 * returns a pure instruction object; a thin UI adapter applies it (and focuses the optional `focusTarget`). This is
 * the single chokepoint that knows legacy pane ids, so the scattered inline `@click="currentTab=…"` /
 * `setShellSection(…)` literals can be replaced by registry-driven navigation.
 *
 * UMD: Node require / Electron renderer global (FeatureRouter).
 */
(function (root) {
  'use strict';
  function _req(p, g) { try { if (typeof module !== 'undefined' && module.exports) return require(p); } catch (e) { } return (root && root[g]) || null; }
  var REG = _req('./feature-registry.js', 'FeatureRegistry');

  function _reg() { return REG || (root && root.FeatureRegistry) || null; }

  // resolve a feature → legacy route instructions. THIS is the single place featureId → shellSection/currentTab/
  // caseSubview is constructed (the registry stays declarative data + derivations).
  function resolveFeatureRoute(featureId) {
    var r = _reg(); if (!r) return null;
    var f = r.getFeature(featureId); if (!f) return null;
    var node = r.getNode(f.navNodeId) || null;
    var route;
    if (node && node.kind === 'setuplib_area') {
      // setup_library section + the feature's own pane — this is what makes 'predict' reachable in Setup Library
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
  function getFeatureEntryPoints(featureId) { var r = _reg(); return r ? r.getFeatureEntryPoints(featureId) : null; }
  function isFeatureReachable(featureId) { var r = _reg(); return r ? r.isFeatureReachable(featureId) : false; }
  function getFeatureBreadcrumb(featureId) { var r = _reg(); return r ? r.getFeatureBreadcrumb(featureId) : []; }

  // resolve a NAV node (shell section / case subview) → route instructions
  function navigateToNode(nodeId) {
    var r = _reg(); if (!r) return null; var n = r.getNode(nodeId); if (!n) return null;
    var route = Object.assign({ nodeId: nodeId }, n.legacyRouting || {});
    if (n.availability === 'deferred') route.deferred = n.deferredReason || true;
    return route;
  }

  // navigateToFeature → instructions { shellSection?, currentTab?, caseSubview?, focusTarget?, featureId, deferred }
  function navigateToFeature(featureId) { return resolveFeatureRoute(featureId); }

  /**
   * applyRoute(route, navState) — PURE: returns a NEW navState given a route instruction + the current navState.
   * `navState` = { shellSection, currentTab, caseSubview }. The UI calls this and assigns the result (the router
   * stays pure + testable; the adapter does the actual Alpine assignment + focus on the returned focusTarget).
   */
  function applyRoute(route, navState) {
    var ns = Object.assign({}, navState || {});
    if (!route) return ns;
    if (route.shellSection !== undefined) ns.shellSection = route.shellSection;
    if (route.caseSubview !== undefined) ns.caseSubview = route.caseSubview;
    if (route.currentTab !== undefined && route.currentTab !== null) ns.currentTab = route.currentTab;
    return ns;
  }

  var api = {
    navigateToFeature: navigateToFeature, navigateToNode: navigateToNode, resolveFeatureRoute: resolveFeatureRoute,
    getFeatureEntryPoints: getFeatureEntryPoints, isFeatureReachable: isFeatureReachable,
    getFeatureBreadcrumb: getFeatureBreadcrumb, applyRoute: applyRoute,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FeatureRouter = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
