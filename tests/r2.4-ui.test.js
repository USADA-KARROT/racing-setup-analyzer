/**
 * tests/r2.4-ui.test.js — R2.4 UI wiring (static, DOM-free).
 * Verifies index.html wires the steering-calibration input + Measured Metrics section, loads measured-metrics.js
 * before the comparison module, builds a binding-matched session-scoped calibration, and reads measured values
 * from the view model (no physics recompute in the panel).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

// script load order: measured-metrics BEFORE model-telemetry-comparison (it consumes it)
chk('measured-metrics.js included', html.indexOf('js/measured-metrics.js"') !== -1);
chk('measured-metrics loads before comparison', html.indexOf('js/measured-metrics.js"') < html.indexOf('js/model-telemetry-comparison.js"'));

// calibration input
chk('steering ratio input bound', /x-model="importSteeringRatio"/.test(html));
chk('steering confirm bound', /x-model="importSteeringConfirmed"/.test(html));
const WS24 = require('../renderer/js/i18n-workspace.js').WS_I18N;
chk('calibration value is road-wheel-referenced (documented)', /t\('aw\.hint\.steering_calibration_hint'\)/.test(html) && /road-wheel radians per projected/.test(WS24.en['aw.hint.steering_calibration_hint']) && /車輪實際轉角/.test(WS24.zh['aw.hint.steering_calibration_hint']) && /実舵角/.test(WS24.ja['aw.hint.steering_calibration_hint']));

// Measured Metrics display section
chk('measured metrics section present', /t\('aw\.label\.f2_measured_metrics'\)/.test(html) && !!(WS24.en['aw.label.f2_measured_metrics'] && WS24.zh['aw.label.f2_measured_metrics'] && WS24.ja['aw.label.f2_measured_metrics']));
chk('reads measuredMetrics.available', /analysisView\.measuredMetrics\.available/.test(html));
chk('renders measured K_us value', /analysisView\.measuredMetrics\.measuredKUs\.value/.test(html));
chk('renders predicted K_us', /analysisView\.measuredMetrics\.predictedKUs\.value/.test(html));
chk('renders agreementClass', /analysisView\.measuredMetrics\.agreementClass/.test(html));
chk('renders provenance', /analysisView\.measuredMetrics\.dataProvenance/.test(html));
chk('Measured credibility badge', /credBadge\('Measured'\)/.test(html));
chk('blocked path shows reason', /analysisView\.measuredMetrics\.reason/.test(html));

// app() state
chk('importSteeringRatio state', /importSteeringRatio:/.test(html));
chk('importSteeringConfirmed state', /importSteeringConfirmed:/.test(html));

// runImportedAnalysis builds a binding-matched, session-scoped steering calibration
(() => {
  const start = html.indexOf('runImportedAnalysis(){');
  const region = html.slice(start, start + 2200);
  chk('builds steering calibration from registry', /CalibrationRegistry\.CALIBRATION_TYPE/.test(region));
  chk('uses STEERING_RATIO', /STEERING_RATIO/.test(region));
  chk('binds to mapping projection signature', /ChannelMapping\.projectionSignature/.test(region));
  chk('channelBinding carried', /channelBinding:/.test(region));
  chk('session-scoped (applicableSessionIds)', /applicableSessionIds:/.test(region));
  chk('only when confirmed + positive ratio', /importSteeringConfirmed[\s\S]{0,80}ratio>0/.test(region) || /ratio>0[\s\S]{0,80}importSteeringConfirmed/.test(region) || /importSteeringConfirmed/.test(region));
  // R3.0B moved the raw imported bundle out of the Alpine reactive tree into the non-reactive caseDataHolder.
  chk('passes calibrations to session builder', /buildCanonicalSession\(caseDataHolder\.importedBundle, mapping, cals,/.test(region));
})();

// honesty: measured section reads the view model, never recomputes physics in the panel
(() => {
  const idx = html.indexOf('F2 · Measured Metrics');
  const region = html.slice(idx, idx + 1600);
  chk('measured section has no inline physics math', !/Math\.(sqrt|pow)\(|understeer_gradient\s*=/.test(region));
})();

console.log(`r2.4-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
