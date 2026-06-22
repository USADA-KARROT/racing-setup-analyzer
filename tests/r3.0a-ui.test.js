/**
 * tests/r3.0a-ui.test.js — R3.0A Product Shell UI wiring (static, DOM-free).
 * Verifies index.html is restructured into an Analysis-Case-centred shell: left main nav, per-case nav, top Case
 * Context bar, right Context/Trust panel, UI state model, and honest deferral of not-yet-built nav. Confirms the
 * shell is backed by the pure case-shell service (no recomputation / no fake controls).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

// case-shell service is the authoritative backing (loaded; app uses it; no UI re-derivation)
chk('case-shell.js included', html.indexOf('js/case-shell.js"') !== -1);
chk('case-shell loads after the view model', html.indexOf('js/analysis-workspace-viewmodel.js"') < html.indexOf('js/case-shell.js"'));
chk('app calls CaseShell.deriveCaseShellState', /CaseShell[\s\S]{0,40}deriveCaseShellState/.test(html) || /caseShellState\(\)\{[\s\S]{0,400}deriveCaseShellState/.test(html));
chk('shell evidence is a compact slice (no raw arrays stored)', /_mkShellEvidence\(ws, ?source\)/.test(html) && /blockedReasons:\(\(ws\.observation\.blockedReasons\)\|\|\[\]\)/.test(html));
// CP3 fix #1: telemetry provenance derived from tagged evidence, NOT the legacy telem.imported flag
chk('provenance source tagged at build time', /_mkShellEvidence\(ws,'demo_case'\)/.test(html) && /_mkShellEvidence\(ws,'imported_csv'\)/.test(html));
chk('telemetrySource read from evidence, not telem.imported', /telemetrySource:\(this\._shellEvidence&&this\._shellEvidence\.source\)/.test(html) && html.indexOf("telemetrySource:(this.telem&&this.telem.imported)") === -1);

// left main navigation (6 sections)
['Dashboard', 'Analysis Cases', 'Import Telemetry', 'Setup Library', 'Comparisons', 'Settings'].forEach(function (l) {
  chk('main nav: ' + l, html.indexOf("label:'" + l + "'") !== -1);
});
chk('main nav drives setShellSection', /@click="setShellSection\(item\.id\)"/.test(html));
chk('sidebar highlights active section', /shellSection===item\.id/.test(html));

// per-case navigation (8 views)
['Overview', 'Setup & Model', 'Telemetry', 'Measured Metrics', 'Model vs Actual', 'Recommendations', 'Corner Coaching', 'Evidence & Trust'].forEach(function (l) {
  chk('case nav: ' + l, html.indexOf("label:'" + l.replace('&', '&') + "'") !== -1);
});
chk('case nav drives setCaseSubview', /@click="setCaseSubview\(cn\.id\)"/.test(html));
chk('case nav shows unavailable indicator', /caseNavAvailable\(cn\.id\)/.test(html));

// top Case Context bar (read from contextBar)
chk('context bar caseName', /caseShellState\(\)\.contextBar\.caseName/.test(html));
chk('context bar vehicle', /caseShellState\(\)\.contextBar\.vehicle/.test(html));
chk('context bar telemetrySource', /caseShellState\(\)\.contextBar\.telemetrySource/.test(html));

// right Context/Trust panel (read from trustPanel)
chk('trust panel credibility', /caseShellState\(\)\.trustPanel\.credibility/.test(html));
chk('trust panel mapping status', /caseShellState\(\)\.trustPanel\.mappingStatus/.test(html));
chk('trust panel calibration status', /caseShellState\(\)\.trustPanel\.calibrationStatus/.test(html));
chk('trust panel blocked reasons', /caseShellState\(\)\.trustPanel\.blockedReasons/.test(html));
chk('trust panel limitations', /caseShellState\(\)\.trustPanel\.limitations/.test(html));
chk('trust panel next action', /caseShellState\(\)\.nextAction\.key/.test(html));
chk('next action is actionable (go button to subview)', /setCaseSubview\(caseShellState\(\)\.nextAction\.target\)/.test(html));

// UI state model surfaced
chk('status shown in sidebar', /caseShellState\(\)&&caseShellState\(\)\.status/.test(html));

// per-case nav switches views over existing sections (svShow filter)
chk('svShow method present', /svShow\(name\)\{/.test(html));
['setup_model', 'measured_metrics', 'model_vs_actual', 'recommendations', 'corner_coaching', 'evidence_trust', 'telemetry'].forEach(function (sv) {
  chk('section filtered by svShow: ' + sv, html.indexOf("svShow('" + sv + "')") !== -1);
});
chk('Setup Analyzer (predict) is reachable as Setup & Model', /caseSubview==='setup_model'\) return id==='predict'/.test(html.replace(/\s+/g, ' ')) || /setup_model[\s\S]{0,40}predict/.test(html));

// honest deferral (§5.4): Comparisons is an explicit deferred info panel, NOT a fake control.
// Copy is now i18n'd → assert the pane references the deferral keys AND every locale keeps the honest meaning.
const SHELL = require('../renderer/js/i18n-shell.js').SHELL_I18N;
chk('comparisons pane is deferred', /t\('ui\.comparisons\.deferred'\)/.test(html) && /Deferred to R3\.0C/.test(SHELL.en['ui.comparisons.deferred']));
chk('comparisons states nothing fabricated', /t\('ui\.comparisons\.deferredBody'\)/.test(html) && /fabricated/i.test(SHELL.en['ui.comparisons.deferredBody']) && /捏造/.test(SHELL.zh['ui.comparisons.deferredBody']) && /捏造/.test(SHELL.ja['ui.comparisons.deferredBody']));
chk('deferred marker on nav item', /deferred:'R3\.0C'/.test(html));

// existing panes still gated by showPane (single visibility mechanism)
chk('showPane drives panes', (html.match(/x-show="showPane\('/g) || []).length >= 10);
chk('no leftover flat tab strip', html.indexOf('@click="switchTab(tab.id)"') === -1);

// CP2 fix #1: Import Telemetry routes to the canonical R2.3 import (analysis pane), NOT the legacy V1 viewer
chk('import nav -> canonical analysis pane', /s==='import'\) return id==='analysis'/.test(html));
chk('import setShellSection targets analysis', /id==='import'\)\{ this\.caseSubview='overview'; this\.currentTab='analysis'; \}/.test(html));
chk('legacy raw CSV viewer is a labeled Setup Library tool', /Telemetry Viewer \(raw CSV\)/.test(html));
chk('no cases->legacy-telemetry route', html.indexOf("caseSubview==='telemetry') return id==='telemetry'") === -1);
// CP2 fix #3: full Cases Library deferral (R3.0B) is rendered as a visible, non-actionable panel
// R3.0B SUPERSEDED the R3.0A "deferred to R3.0B" banner with the working Case Library (panel now present; banner gone).
chk('cases library implemented (R3.0B superseded the deferral)', /Case Library/.test(html) && html.indexOf('Deferred to R3.0B') === -1);

// CP2 fix #2: case-shell does NOT trust a caller-controlled capability field
const shellSrc = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'js', 'case-shell.js'), 'utf8');
chk('case-shell rejects caller _capability fallback', shellSrc.indexOf('av._capability') === -1 && shellSrc.indexOf('av && av._capability') === -1);
chk('capability sourced only from workspace evidence', /var cap = \(ws && ws\.capability\) \|\| null;/.test(shellSrc));

console.log(`r3.0a-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
