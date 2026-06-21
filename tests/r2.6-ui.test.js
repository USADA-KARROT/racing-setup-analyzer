/**
 * tests/r2.6-ui.test.js — R2.6 UI wiring (static, DOM-free).
 * Verifies index.html loads track-intelligence before the workspace, offers a corner sample, and renders the
 * J · Corner Coaching section (per-corner cards + blocked reasons + driver-behaviour-not-setup disclosure).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

// script order: track-intelligence BEFORE analysis-workspace (it requires it)
chk('track-intelligence.js included', html.indexOf('js/track-intelligence.js"') !== -1);
chk('loads before analysis-workspace', html.indexOf('js/track-intelligence.js"') < html.indexOf('js/analysis-workspace.js"'));

// corner sample loader
chk('load corner sample button', /@click="loadCornerSampleCsv\(\)"/.test(html));
chk('loadCornerSampleCsv method', /loadCornerSampleCsv\(\)\{/.test(html));
chk('corner sample uses the demo corner CSV', /DemoAnalysisCase\.buildDemoCornerTelemetryCsv/.test(html));

// J · Corner Coaching section
chk('corner coaching section present', /J · Corner Coaching/.test(html));
chk('reads trackIntelligence.available', /analysisView\.trackIntelligence\.available/.test(html));
chk('renders lapCount', /analysisView\.trackIntelligence\.lapCount/.test(html));
chk('iterates corners', /c in analysisView\.trackIntelligence\.corners/.test(html));
chk('renders entry/mid/exit phases', /c\.entry\.sufficient/.test(html) && /c\.mid\.sufficient/.test(html) && /c\.exit\.sufficient/.test(html));
chk('blocked path shows reasons', /analysisView\.trackIntelligence\.blockedReasons/.test(html));
chk('driver-behaviour-not-setup disclosure', /not a corner characteristic or a setup finding/.test(html));
chk('Heuristic credibility badge', /credBadge\('Heuristic'\)/.test(html));

// honesty: the corner section reads the view model, no inline physics/segmentation in the panel
(() => {
  const idx = html.indexOf('J · Corner Coaching');
  const region = html.slice(idx, idx + 1400);
  chk('no inline segmentation math in the panel', !/Math\.(sqrt|pow|abs)\(|lateral_accel\s*>=|cornerThresh/.test(region));
})();

console.log(`r2.6-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
