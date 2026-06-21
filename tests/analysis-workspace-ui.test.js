/**
 * tests/analysis-workspace-ui.test.js — R2.2 §16 UI wiring (static, DOM-free).
 * Verifies index.html wires the Analysis Workspace: tab entry, demo button + method, all 9 section
 * markers, capability/blocked/badge bindings, the module script includes (dependency order), and that
 * the workspace panel does NOT recompute physics (binds the view model only).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const chk = (n, c, d) => { if (c) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };

// tab + entry point
chk('tab entry present', /\{id:'analysis',key:'tab\.analysis'\}/.test(html));
chk('Load Demo button', /id="loadDemoAnalysisCase"[\s\S]*?@click="loadDemoAnalysisCase\(\)"/.test(html) || /@click="loadDemoAnalysisCase\(\)"/.test(html));
chk('loadDemoAnalysisCase method', /loadDemoAnalysisCase\(\)\{/.test(html));
chk('analysisView state', /analysisView:\s*null/.test(html));
chk('credBadge method', /credBadge\(level\)\{/.test(html));
chk('fmt helper', /fmt\(v\)\{/.test(html));

// 9 section markers (A..I)
['A · Case Header', 'B · Capability Summary', 'C · Vehicle', 'D · Model Prediction', 'E · Telemetry Observation', 'F · Model vs Actual', 'G · Race Engineer', 'H · Driver Coach', 'I · Evidence'].forEach((s) => {
  chk('section present: ' + s, html.indexOf(s) !== -1);
});

// blocked-reasons + capability + badge bindings
chk('capability summary binding', /x-for="c in analysisView\.capabilitySummary"/.test(html));
chk('blocked reasons binding (model)', /analysisView\.modelPrediction\.blockedReasons/.test(html));
chk('blocked reasons binding (drawer)', /analysisView\.evidenceDrawer\.allBlockedReasons/.test(html));
chk('credibility badges used', /credBadge\('Model'\)/.test(html) && /credBadge\('Physics'\)/.test(html) && /credBadge\('Heuristic'\)/.test(html));
chk('quantitative blocked stated', /Quantitative recommendation:\s*<b>blocked<\/b>/.test(html));

// module script includes (dependency order)
const mods = ['canonical-parameters', 'parameter-conversions', 'setup-snapshot', 'analysis-case', 'suspension-input-normalizer', 'canonical-model-input', 'analysis-execution', 'telemetry-observation', 'model-telemetry-comparison', 'race-engineer-insight', 'driver-coach-insight', 'analysis-workspace', 'analysis-workspace-viewmodel', 'demo-analysis-case'];
let lastIdx = -1, ordered = true;
mods.forEach((m) => {
  const i = html.indexOf('js/' + m + '.js"');
  chk('script include: ' + m, i !== -1);
  if (i !== -1) { if (i < lastIdx) ordered = false; lastIdx = i; }
});
chk('module scripts in dependency order', ordered);
// analysis-workspace-viewmodel must load before demo? no — demo doesn't need it, but workspace before viewmodel use; order check above suffices.

// the workspace PANEL must not recompute physics (no Tier1/calculate inside the analysis view block)
(() => {
  const start = html.indexOf('TAB: Analysis Workspace');
  const end = html.indexOf('</main>', start);
  const panel = html.slice(start, end);
  chk('panel exists', start !== -1 && end !== -1);
  chk('panel does NOT call calculate()', panel.indexOf('.calculate(') === -1);
  chk('panel does NOT new Tier1', panel.indexOf('new Tier1') === -1);
  chk('panel binds analysisView only', panel.indexOf('analysisView.') !== -1);
})();

console.log(`analysis-workspace-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
