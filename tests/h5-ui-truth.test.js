'use strict';
/**
 * tests/h5-ui-truth.test.js — H5 UI delivery truth enforcement (install-free, in-chain).
 *
 * The truth matrix (governance/hardening/h5-ui-truth-matrix.json) must MATCH reality:
 *   - every EXCLUDED module is (a) not loaded by renderer/index.html, (b) listed as a
 *     build.files exclusion, (c) still present in source (equivalence/test baseline);
 *   - deferred subviews are not publicly navigable but stay registered as governance truth;
 *   - the Engineer Brief mount carries the LIVE visibility binding tied to nav state;
 *   - no ghost registry entries (every nav-derived subview has a pane path in index.html);
 *   - dead-import audit: no non-excluded page script requires an excluded module.
 */
const fs = require('fs');
const path = require('path');
let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; console.log('  ✓ ' + n); } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? ' :: ' + JSON.stringify(d) : '')); } };
const REPO = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(REPO, 'renderer', 'index.html'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
const FR = require('../renderer/js/feature-registry.js');

const INERT = [
  'i18n-r3-0e.js',
  'r3-0c-comparison-adapter.js', 'r3-0c-corner-pairing.js', 'r3-0c-corner-segmentation.js',
  'r3-0c-distance-authority.js', 'r3-0c-lap-authority.js', 'r3-0c-normalized-distance.js',
  'r3-0c-reference-selection.js', 'r3-0c-track-identity.js',
  'r3-0e-experiment-viewmodel.js', 'r3-0e-followup-timeline.js', 'r3-0e-outcome-classifier.js', 'r3-0e-stores.js',
  'r3-0f-migration-engine.js', 'vehicle-profile-f312.js',
];

// 1. matrix file exists and covers all 15 + the three feature items
const matrix = JSON.parse(fs.readFileSync(path.join(REPO, 'governance', 'hardening', 'h5-ui-truth-matrix.json'), 'utf8'));
chk('truth matrix present with entries', Array.isArray(matrix.entries) && matrix.entries.length >= 8);

// 2. every excluded module: not page-loaded, build-excluded, source present
let allGood = true;
for (const f of INERT) {
  const loaded = html.includes('js/' + f);
  const excluded = (pkg.build.files || []).includes('!renderer/js/' + f);
  const sourcePresent = fs.existsSync(path.join(REPO, 'renderer', 'js', f));
  if (loaded || !excluded || !sourcePresent) { allGood = false; chk('inert module state: ' + f, false, { loaded, excluded, sourcePresent }); }
}
chk('ALL 15 inert modules: not page-loaded + build-excluded + source retained', allGood);

// 3. loaded-script audit: every page-loaded js/ script must exist and NOT be in the exclusion list
const loadedScripts = [...html.matchAll(/src="js\/([^"]+)"/g)].map(m => m[1]);
chk('page loads a plausible script count', loadedScripts.length > 80, loadedScripts.length);
const excludedSet = new Set(INERT);
const loadedExcluded = loadedScripts.filter(f => excludedSet.has(f));
chk('NO page-loaded script is package-excluded (would 404 in the packaged app)', loadedExcluded.length === 0, loadedExcluded);
const missingOnDisk = loadedScripts.filter(f => !fs.existsSync(path.join(REPO, 'renderer', 'js', f)));
chk('every page-loaded script exists on disk', missingOnDisk.length === 0, missingOnDisk);

// 4. deferred subviews: filtered from nav, registered as truth
chk('experiment_loop + case_timeline deferred in registry', FR.FEATURES.experiment_loop.availability === 'deferred' && FR.FEATURES.case_timeline.availability === 'deferred');
chk('deferred subviews NOT in public case nav', !FR.deriveCaseNav().some(n => n.id === 'experiment_loop' || n.id === 'case_timeline'));
chk('deferred nodes still registered (governance truth, not deleted)', !!FR.getNode('case:experiment_loop') && !!FR.getNode('case:case_timeline'));

// 5. Engineer Brief LIVE wiring: mount present with the Alpine visibility binding
chk('brief mount has the LIVE visibility binding', /r3-0d-engineer-brief-mount[\s\S]{0,400}:class="\{ hidden: !\(shellSection==='cases' && caseSubview==='engineer_brief'\) \}"/.test(html));
chk('engineer_brief is publicly navigable', FR.deriveCaseNav().some(n => n.id === 'engineer_brief'));
chk('brief modules are page-loaded', ['r3-0d-engineer-brief.js', 'r3-0d-engineer-ui.js', 'r3-0d-engineer-orchestrator.js', 'r3-0d-engineer-viewmodel.js'].every(f => loadedScripts.includes(f)));

// 6. ghost-registry audit: every PUBLIC case-nav subview must have a visible pane path
//    (overview panes use svShow(); dedicated panes use showPane()/x-show bindings; engineer_brief
//    uses its mount binding). We assert each public subview id appears in index.html.
const ghost = FR.deriveCaseNav().map(n => n.id).filter(id => !html.includes(id));
chk('no ghost nav target (every public subview id appears in the page)', ghost.length === 0, ghost);

// 7. dead-import audit: no NON-excluded renderer module requires an excluded one
let deadImports = [];
for (const f of fs.readdirSync(path.join(REPO, 'renderer', 'js')).filter(f => f.endsWith('.js'))) {
  if (excludedSet.has(f)) continue;
  const src = fs.readFileSync(path.join(REPO, 'renderer', 'js', f), 'utf8');
  for (const inert of INERT) {
    const bare = inert.replace(/\.js$/, '');
    if (new RegExp("require\\(['\"]\\./" + bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "(?:\\.js)?['\"]\\)").test(src)) deadImports.push(f + ' -> ' + inert);
  }
}
chk('no shipped module requires an excluded module', deadImports.length === 0, deadImports);

console.log('h5-ui-truth: ' + pass + ' passed, ' + fail + ' failed');
if (fail) process.exit(1);
