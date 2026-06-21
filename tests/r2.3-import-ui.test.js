/**
 * tests/r2.3-import-ui.test.js — R2.3 UI wiring (static, DOM-free).
 * Verifies index.html wires the import workflow (textarea/import/mapping/confirm/run), binds services only,
 * and does not recompute physics in the panel.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

chk('import panel present', html.indexOf('id="importTelemetryPanel"') !== -1);
chk('import textarea bound', /x-model="importCsvText"/.test(html));
chk('import button', /@click="importTelemetryCsv\(\)"/.test(html));
chk('load sample button', /@click="loadSampleImportCsv\(\)"/.test(html));
chk('run imported button', /id="runImportedAnalysis"[\s\S]*?@click="runImportedAnalysis\(\)"/.test(html) || /@click="runImportedAnalysis\(\)"/.test(html));
chk('mapping select bound to ch.assigned', /x-model="ch\.assigned"/.test(html));
chk('confirm checkbox bound to ch.confirmed', /x-model="ch\.confirmed"/.test(html));
chk('importTelemetryCsv method', /importTelemetryCsv\(\)\{/.test(html));
chk('runImportedAnalysis method', /runImportedAnalysis\(\)\{/.test(html));
chk('calls import adapter service', /TelemetryImportAdapter\.importTelemetry/.test(html));
chk('calls channel mapping service', /ChannelMapping\.buildChannelMapping/.test(html));
chk('calls canonical session builder', /CanonicalTelemetrySession\.buildCanonicalSession/.test(html));
chk('calls workspace orchestrator', /AnalysisWorkspace\.runAnalysisWorkspace/.test(html));
chk('R2.3 module script includes', ['telemetry-import-adapter', 'channel-mapping', 'calibration-registry', 'analysis-window', 'canonical-telemetry-session', 'analysis-case-export'].every(m => html.indexOf('js/' + m + '.js"') !== -1));
// honesty: the import panel binds services and the view model, not a physics recompute
(() => {
  const start = html.indexOf('id="importTelemetryPanel"');
  const end = html.indexOf('runImportedAnalysis(){');
  const region = html.slice(start, end > start ? end : start + 2000);
  chk('import panel has no calculate()', region.indexOf('.calculate(') === -1);
  chk('import panel has no new Tier1', region.indexOf('new Tier1') === -1);
})();
console.log(`r2.3-import-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
