/**
 * tests/feature-router.test.js — R3-UX0: the router is the only featureId→legacy-UI-state translator; pure applyRoute.
 *
 * R3.0C C8_ACTIVATION (state-aware from C8): the case_comparison / reference_lap / corner_delta routes
 * are deferred while governance/r3.0c/state.json.featureRegistryActivationAllowed=false (C0–C7) and
 * become live shellSection='comparisons' / currentTab='comparisons' routes once activation is allowed
 * (C8+). Fail-closed reading of state.json defaults to the deferred expectation.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Rt = require('../renderer/js/feature-router.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
function readGovernanceActivationAllowed() {
  try { const st = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'governance', 'r3.0c', 'state.json'), 'utf8')); return st && st.featureRegistryActivationAllowed === true; } catch (_) { return false; }
}
const ACTIVATION_ALLOWED = readGovernanceActivationAllowed();

// THE ORPHAN FIX: vehicle presets now route into Setup Library (not only via cases→setup_model)
(() => { const r = Rt.navigateToFeature('vehicle_presets'); chk('vehicle_presets → setup_library/predict (orphan fixed)', r && r.shellSection === 'setup_library' && r.currentTab === 'predict'); chk('carries focusTarget', r.focusTarget === 'vp-browser'); })();
(() => { const r = Rt.navigateToFeature('handling_prediction'); chk('handling_prediction → setup_library/predict', r.shellSection === 'setup_library' && r.currentTab === 'predict'); })();
(() => { const r = Rt.navigateToFeature('custom_setup'); chk('custom_setup → setup_library/predict', r.shellSection === 'setup_library' && r.currentTab === 'predict'); })();

// engineering tools
(() => { const r = Rt.navigateToFeature('spring_calculator'); chk('spring → setup_library/spring', r.shellSection === 'setup_library' && r.currentTab === 'spring'); })();
(() => { const r = Rt.navigateToFeature('arb_calculator'); chk('arb → setup_library/spring + focus', r.shellSection === 'setup_library' && r.currentTab === 'spring' && r.focusTarget === 'arb-section'); })();
(() => { const r = Rt.navigateToFeature('corner_weight'); chk('corner_weight → setup_library/predict + focus', r.shellSection === 'setup_library' && r.currentTab === 'predict' && r.focusTarget === 'corner-weight-section'); })();

// case-scoped
(() => { const r = Rt.navigateToFeature('case_setup_model'); chk('case_setup_model → cases/setup_model/predict', r.shellSection === 'cases' && r.caseSubview === 'setup_model' && r.currentTab === 'predict'); })();
(() => { const r = Rt.navigateToFeature('measured_metrics'); chk('measured_metrics → cases/measured_metrics/analysis', r.shellSection === 'cases' && r.caseSubview === 'measured_metrics' && r.currentTab === 'analysis'); })();

// R3.0C state-aware: deferred at C0–C7, active comparisons-pane route at C8+
(() => {
  const r = Rt.navigateToFeature('case_comparison');
  if (ACTIVATION_ALLOWED) {
    chk('case_comparison route is active comparisons', r && r.deferred === false && r.shellSection === 'comparisons' && r.currentTab === 'comparisons');
  } else {
    chk('case_comparison route is deferred', r && r.deferred === 'R3.0C' && r.shellSection === 'comparisons');
  }
})();

// nav nodes
(() => { const r = Rt.navigateToNode('settings'); chk('node settings → settings/guide', r.shellSection === 'settings' && r.currentTab === 'guide'); })();
(() => { const r = Rt.navigateToNode('import'); chk('node import → import/overview/analysis', r.shellSection === 'import' && r.caseSubview === 'overview' && r.currentTab === 'analysis'); })();

// applyRoute is PURE (returns new state, does not mutate input)
(() => { const ns = { shellSection: 'dashboard', currentTab: 'dashboard', caseSubview: 'overview' }; const r = Rt.navigateToFeature('tire_analysis'); const out = Rt.applyRoute(r, ns); chk('applyRoute returns new shellSection/currentTab', out.shellSection === 'setup_library' && out.currentTab === 'tire'); chk('applyRoute does not mutate input', ns.shellSection === 'dashboard' && ns.currentTab === 'dashboard'); chk('applyRoute keeps untouched keys', out.caseSubview === 'overview'); })();

// breadcrumb + reachability
(() => { const b = Rt.getFeatureBreadcrumb('vehicle_preset_detail'); chk('detail breadcrumb: setup_library › area › detail', b.length >= 3 && b[0].id === 'setup_library' && b[b.length - 1].id === 'vehicle_preset_detail'); })();
chk('reachable: vehicle_presets', Rt.isFeatureReachable('vehicle_presets') === true);
chk('reachable: case_comparison (deferred-as-panel C0–C7 / active C8+)', Rt.isFeatureReachable('case_comparison') === true);
chk('unknown feature → null route', Rt.navigateToFeature('nope') === null);
chk('entry points exposed', Rt.getFeatureEntryPoints('spring_calculator').desktop === true && Rt.getFeatureEntryPoints('vehicle_preset_detail').desktop === false);

console.log(`feature-router: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
