/**
 * tests/feature-registry.test.js — R3-UX0: the registry is the single source of truth; navigation is derived; no
 * second whitelist; no orphan. Verifies completeness, the orphan fix (predict reachable in Setup Library), and
 * derivation determinism.
 */
'use strict';
const R = require('../renderer/js/feature-registry.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// registry self-validation
(() => { const v = R.validateRegistry(); chk('registry validates (no errors)', v.ok === true, v.errors); })();
chk('23 features', Object.keys(R.FEATURES).length === 23);
chk('all feature ids unique + self-keyed', Object.keys(R.FEATURES).every(k => R.FEATURES[k].id === k));

// every non-deferred feature is reachable (no orphan / no unreachable)
(() => { const orphans = Object.keys(R.FEATURES).filter(id => R.FEATURES[id].availability !== 'deferred' && !R.isFeatureReachable(id)); chk('no orphan/unreachable production feature', orphans.length === 0, orphans); })();
// every feature has a renderer adapter OR a deferred reason
(() => { const bad = Object.keys(R.FEATURES).filter(id => { const f = R.FEATURES[id]; return !f.rendererAdapter && !f.deferredReason; }); chk('every feature has adapter or deferredReason', bad.length === 0, bad); })();

// derivations
chk('mainNav = 6 shell sections', R.deriveMainNav().length === 6);
chk('mainNav comparisons is deferred R3.0C', R.deriveMainNav().find(n => n.id === 'comparisons').deferred === 'R3.0C');
chk('caseNav = 8 subviews', R.deriveCaseNav().length === 8);
chk('caseSubviewIds === caseNav ids (no separate whitelist)', JSON.stringify(R.deriveCaseSubviewIds()) === JSON.stringify(R.deriveCaseNav().map(n => n.id)));

// THE ORPHAN FIX: setup_library pane ids now INCLUDE 'predict'
(() => { const ids = R.deriveSetupLibraryPaneIds(); chk('setup_library pane ids include predict (orphan fixed)', ids.indexOf('predict') !== -1, ids); chk('still include spring/tire/advisor/lihpao/telemetry', ['spring', 'tire', 'advisor', 'lihpao', 'telemetry'].every(p => ids.indexOf(p) !== -1)); })();

// setup library areas
(() => { const areas = R.deriveSetupLibraryAreas(); chk('3 setup-library areas', areas.length === 3); const vs = areas.find(a => a.areaId === 'setuplib:vehicle_setup'); chk('vehicle_setup area lists presets/custom/handling', vs && ['vehicle_presets', 'custom_setup', 'handling_prediction'].every(id => vs.features.some(f => f.id === id))); chk('vehicle_preset_detail NOT a top-level area card (entryPoints.desktop=false)', vs && !vs.features.some(f => f.id === 'vehicle_preset_detail')); const et = areas.find(a => a.areaId === 'setuplib:engineering_tools'); chk('engineering_tools lists arb/kinematics/corner_weight/wheel_upgrade (no longer buried-only)', et && ['arb_calculator', 'suspension_kinematics', 'corner_weight', 'wheel_upgrade'].every(id => et.features.some(f => f.id === id))); })();

// deferred features
(() => { ['case_comparison', 'reference_lap', 'corner_delta'].forEach(id => { const f = R.FEATURES[id]; chk('deferred: ' + id, f.availability === 'deferred' && f.deferredReason === 'R3.0C' && !f.rendererAdapter); }); })();

// every renderer pane referenced is a known production pane; the standalone setup-library panes each map to >=1 feature
(() => { const known = ['predict', 'spring', 'tire', 'advisor', 'lihpao', 'telemetry', 'analysis']; const used = {}; Object.keys(R.FEATURES).forEach(id => { const a = R.FEATURES[id].rendererAdapter; if (a) used[a.paneId] = true; }); chk('all adapter panes are known', Object.keys(used).every(p => known.indexOf(p) !== -1), Object.keys(used)); })();

// derivation determinism (projecting twice is identical)
chk('derivation deterministic', JSON.stringify(R.deriveSetupLibraryAreas()) === JSON.stringify(R.deriveSetupLibraryAreas()) && JSON.stringify(R.deriveMainNav()) === JSON.stringify(R.deriveMainNav()));

// feature ids are locale-invariant strings (no display text / no locale in the id)
chk('feature ids are snake_case ascii (locale-invariant)', Object.keys(R.FEATURES).every(id => /^[a-z0-9_]+$/.test(id)));

console.log(`feature-registry: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
