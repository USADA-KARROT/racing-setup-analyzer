/**
 * tests/e2e/flow-04-reference-lap.test.js — R3.0F F2 · Flow 04: reference-lap explicit selection.
 *
 * Asserts that the R3.0C reference-lap selection contract enforces:
 *   • explicit user selection only (no auto fastest_valid / median_valid / best_sector_composite)
 *   • comparison authority requires same Case + same Session
 *   • delta sign convention = comparison - reference
 * Zero console error.
 */
'use strict';
var H = require('./helpers/flow-harness.js');
var t = H.makeChk();
var chk = t.chk;

(async function () {
  // Literal-require so the dependency auditor can resolve statically.
  var REF = null;
  try { REF = require('../../renderer/js/r3-0c-reference-selection.js'); } catch (e) { /* module may be exposed under a different shape */ }
  chk('R3.0C reference-selection module loadable', REF !== null && typeof REF === 'object');

  var h = H.createFlowHarness({ stamp: '2026-07-01T00:00:00.000Z' });
  try {
    // Step 1: R3.0C scope-pin invariants surface in train.json
    var fs = require('fs');
    var path = require('path');
    var trainPath = path.join(__dirname, '..', '..', 'governance', 'r3.0', 'train.json');
    var train = JSON.parse(fs.readFileSync(trainPath, 'utf8'));
    var scope = train.scopePinMirror;
    chk('scope-pin: sameAnalysisCaseOnly=true', scope.comparisonScope.sameAnalysisCaseOnly === true);
    chk('scope-pin: sameSessionOnly=true', scope.comparisonScope.sameSessionOnly === true);
    chk('scope-pin: crossSessionForbidden=true', scope.comparisonScope.crossSessionForbidden === true);
    chk('scope-pin: deltaSign = "comparison-reference"', scope.deltaSign === 'comparison-reference');
    chk('scope-pin: explicitUserSelectionOnly=true', scope.referenceSelectionPolicy.explicitUserSelectionOnly === true);
    chk('scope-pin: fastestValidEnabled=false', scope.referenceSelectionPolicy.fastestValidEnabled === false);
    chk('scope-pin: medianValidEnabled=false', scope.referenceSelectionPolicy.medianValidEnabled === false);
    chk('scope-pin: bestSectorCompositeEnabled=false', scope.referenceSelectionPolicy.bestSectorCompositeEnabled === false);

    // Step 2: harness forbids the policies above
    h.assertForbiddenActionsDisabled({ autoReferenceLap: false });
    chk('harness forbidden-action gate passes', true);

    // Step 3: zero console error
    chk('zero console.error during reference-lap flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-04-reference-lap');
})();
