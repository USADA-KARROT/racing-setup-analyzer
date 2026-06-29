/**
 * tests/feature-registry.test.js — R3-UX0: the registry is the single source of truth; navigation is derived; no
 * second whitelist; no orphan. Verifies completeness, the orphan fix (predict reachable in Setup Library), and
 * derivation determinism.
 *
 * R3.0C C8_ACTIVATION (state-aware from C8): the three R3.0C feature IDs (case_comparison /
 * reference_lap / corner_delta) and the NAV_NODES.comparisons section switch between two expected
 * shapes depending on governance/r3.0c/state.json.featureRegistryActivationAllowed:
 *   false  → deferred shape (availability='deferred', deferredReason='R3.0C', no rendererAdapter; nav deferred)
 *   true   → active shape  (availability='available', rendererAdapter.paneId='comparisons'; nav not deferred)
 * The state.json file is the SINGLE source of truth — neither expectation is hard-coded; both branches
 * are exercised by per-checkpoint manifest evidence. A missing state.json fails CLOSED to the deferred
 * expectation so a malicious state.json deletion cannot relax the deferred contract.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('../renderer/js/feature-registry.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

function readGovernanceActivationAllowed() {
  // Default false → expect the deferred shape (C0–C7 contract). Reading is fail-closed: any parse / IO
  // failure leaves activation=false so the deferred invariant continues to hold.
  try {
    const st = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'governance', 'r3.0c', 'state.json'), 'utf8'));
    return st && st.featureRegistryActivationAllowed === true;
  } catch (_) { return false; }
}
const ACTIVATION_ALLOWED = readGovernanceActivationAllowed();

// registry self-validation
(() => { const v = R.validateRegistry(); chk('registry validates (no errors)', v.ok === true, v.errors); })();
chk('24 features (R3.0D D5 added engineer_brief as 24th)', Object.keys(R.FEATURES).length === 24);
chk('all feature ids unique + self-keyed', Object.keys(R.FEATURES).every(k => R.FEATURES[k].id === k));

// every non-deferred feature is reachable (no orphan / no unreachable)
(() => { const orphans = Object.keys(R.FEATURES).filter(id => R.FEATURES[id].availability !== 'deferred' && !R.isFeatureReachable(id)); chk('no orphan/unreachable production feature', orphans.length === 0, orphans); })();
// every feature has a renderer adapter OR a deferred reason
(() => { const bad = Object.keys(R.FEATURES).filter(id => { const f = R.FEATURES[id]; return !f.rendererAdapter && !f.deferredReason; }); chk('every feature has adapter or deferredReason', bad.length === 0, bad); })();

// derivations
chk('mainNav = 6 shell sections', R.deriveMainNav().length === 6);
if (ACTIVATION_ALLOWED) {
  chk('mainNav comparisons is active (C8_ACTIVATION)', R.deriveMainNav().find(n => n.id === 'comparisons').deferred === undefined);
} else {
  chk('mainNav comparisons is deferred R3.0C', R.deriveMainNav().find(n => n.id === 'comparisons').deferred === 'R3.0C');
}
chk('caseNav = 9 subviews (R3.0D D5 added engineer_brief)', R.deriveCaseNav().length === 9);
chk('caseSubviewIds === caseNav ids (no separate whitelist)', JSON.stringify(R.deriveCaseSubviewIds()) === JSON.stringify(R.deriveCaseNav().map(n => n.id)));

// THE ORPHAN FIX: setup_library pane ids now INCLUDE 'predict'
(() => { const ids = R.deriveSetupLibraryPaneIds(); chk('setup_library pane ids include predict (orphan fixed)', ids.indexOf('predict') !== -1, ids); chk('still include spring/tire/advisor/lihpao/telemetry', ['spring', 'tire', 'advisor', 'lihpao', 'telemetry'].every(p => ids.indexOf(p) !== -1)); })();

// setup library areas
(() => { const areas = R.deriveSetupLibraryAreas(); chk('3 setup-library areas', areas.length === 3); const vs = areas.find(a => a.areaId === 'setuplib:vehicle_setup'); chk('vehicle_setup area lists presets/custom/handling', vs && ['vehicle_presets', 'custom_setup', 'handling_prediction'].every(id => vs.features.some(f => f.id === id))); chk('vehicle_preset_detail NOT a top-level area card (entryPoints.desktop=false)', vs && !vs.features.some(f => f.id === 'vehicle_preset_detail')); const et = areas.find(a => a.areaId === 'setuplib:engineering_tools'); chk('engineering_tools lists arb/kinematics/corner_weight/wheel_upgrade (no longer buried-only)', et && ['arb_calculator', 'suspension_kinematics', 'corner_weight', 'wheel_upgrade'].every(id => et.features.some(f => f.id === id))); })();

// R3.0C feature shape — state-aware
(() => {
  ['case_comparison', 'reference_lap', 'corner_delta'].forEach(id => {
    const f = R.FEATURES[id];
    if (ACTIVATION_ALLOWED) {
      chk('active: ' + id + ' availability=available', f.availability === 'available');
      chk('active: ' + id + ' has rendererAdapter→comparisons', !!f.rendererAdapter && f.rendererAdapter.paneId === 'comparisons');
      chk('active: ' + id + ' deferredReason absent', f.deferredReason === undefined);
    } else {
      chk('deferred: ' + id, f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter);
    }
  });
})();

// every renderer pane referenced is a known production pane; the standalone setup-library panes each map to >=1 feature.
// 'comparisons' joins the known set at C8_ACTIVATION (when the R3.0C IDs attach their rendererAdapter).
(() => {
  const known = ['predict', 'spring', 'tire', 'advisor', 'lihpao', 'telemetry', 'analysis'];
  if (ACTIVATION_ALLOWED) known.push('comparisons');
  const used = {}; Object.keys(R.FEATURES).forEach(id => { const a = R.FEATURES[id].rendererAdapter; if (a) used[a.paneId] = true; });
  chk('all adapter panes are known', Object.keys(used).every(p => known.indexOf(p) !== -1), Object.keys(used));
})();

// derivation determinism (projecting twice is identical)
chk('derivation deterministic', JSON.stringify(R.deriveSetupLibraryAreas()) === JSON.stringify(R.deriveSetupLibraryAreas()) && JSON.stringify(R.deriveMainNav()) === JSON.stringify(R.deriveMainNav()));

// feature ids are locale-invariant strings (no display text / no locale in the id)
chk('feature ids are snake_case ascii (locale-invariant)', Object.keys(R.FEATURES).every(id => /^[a-z0-9_]+$/.test(id)));

console.log(`feature-registry: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
