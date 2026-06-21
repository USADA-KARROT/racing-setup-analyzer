/**
 * tests/r2.5-ui.test.js — R2.5 UI wiring (static, DOM-free).
 * Verifies index.html wires the Quantitative Recommendation panel, loads the R2.5 services before the
 * workspace, re-runs the stored case with a quantitative target, and keeps hardware clicks gated.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
let pass = 0, fail = 0; const chk = (n, c) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n); } };

// script load order: setup-ab + quantitative-recommendation AFTER analysis-execution, BEFORE analysis-workspace
chk('setup-ab.js included', html.indexOf('js/setup-ab.js"') !== -1);
chk('quantitative-setup-recommendation.js included', html.indexOf('js/quantitative-setup-recommendation.js"') !== -1);
chk('R2.5 services load after analysis-execution', html.indexOf('js/analysis-execution.js"') < html.indexOf('js/quantitative-setup-recommendation.js"'));
chk('R2.5 services load before analysis-workspace (it requires QR)', html.indexOf('js/quantitative-setup-recommendation.js"') < html.indexOf('js/analysis-workspace.js"'));

// panel controls
chk('metric select bound', /x-model="quantMetric"/.test(html));
chk('target delta bound', /x-model="quantDelta"/.test(html));
chk('parameter select bound', /x-model="quantParameter"/.test(html));
chk('recommend button', /@click="runQuantitativeRecommendation\(\)"/.test(html));

// display section
chk('quantitative section present', /F3 · Quantitative Recommendation/.test(html));
chk('reads recommendedDeltaPhysical', /analysisView\.quantitativeRecommendation\.recommendedDeltaPhysical/.test(html));
chk('reads predicted-after', /analysisView\.quantitativeRecommendation\.predictedMetricAfter/.test(html));
chk('reads residual', /analysisView\.quantitativeRecommendation\.residual/.test(html));
chk('reads side effects', /analysisView\.quantitativeRecommendation\.sideEffects/.test(html));
chk('reads validation step', /analysisView\.quantitativeRecommendation\.validationStep/.test(html));
chk('blocked path shows reason', /analysisView\.quantitativeRecommendation\.blockedReasons/.test(html));
chk('Model credibility badge', /credBadge\('Model'\)/.test(html));

// honesty: clicks gated + no lap-time promise
chk('hardware clicks gated note', /hardware clicks need a validated/.test(html));
chk('no click count / lap-time promise note', /never a click count or a lap-time promise/.test(html));

// app() method + state
chk('runQuantitativeRecommendation method', /runQuantitativeRecommendation\(\)\{/.test(html));
chk('quantMetric state', /quantMetric:/.test(html));
chk('stores last case', /_lastCase:/.test(html));
(() => {
  const start = html.indexOf('runQuantitativeRecommendation(){');
  const region = html.slice(start, start + 800);
  chk('re-runs workspace with quantitative target', /quantitative:\s*\{\s*target/.test(region) && /AnalysisWorkspace\.runAnalysisWorkspace/.test(region));
  chk('no inline physics in handler', !/Math\.(sqrt|pow)\(|understeer_gradient\s*=/.test(region));
})();

// CP1 fix: Setup A/B UI present + service-driven
chk('setup A/B section present', /F4 · Setup A\/B/.test(html));
chk('A/B parameter select bound', /x-model="abParameter"/.test(html));
chk('A/B change % bound', /x-model="abChangePct"/.test(html));
chk('A/B compare button', /@click="runSetupAbCompare\(\)"/.test(html));
chk('A/B reads directionalSummary', /abResult\.directionalSummary/.test(html));
chk('A/B reads deltas', /abResult\.deltas\.understeer_gradient/.test(html));
chk('A/B no lap-time note', /not a lap-time claim/.test(html));
chk('A/B method calls compareSetups', /SetupAB\.compareSetups/.test(html));
chk('A/B method present', /runSetupAbCompare\(\)\{/.test(html));
chk('A/B state', /abResult:/.test(html));
// CP1 fix: leverType surfaced (ballast vs suspension)
chk('quantitative shows leverType', /quantitativeRecommendation\.leverType/.test(html));
chk('ballast lever flagged materially different', /ballast\/weight move/.test(html));

console.log(`r2.5-ui: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
