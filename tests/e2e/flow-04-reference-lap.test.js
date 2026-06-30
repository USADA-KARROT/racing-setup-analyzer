/**
 * tests/e2e/flow-04-reference-lap.test.js — R3.0F F2 · Flow 04: reference-lap explicit selection.
 *
 * Asserts that the R3.0C reference-lap selection contract enforces:
 *   • explicit user selection only (no auto fastestValid / medianValid / bestSectorComposite)
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
  chk('R3.0C selectReference is a function', REF && typeof REF.selectReference === 'function');

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

    // F2-R1-01 closure: actually drive R3.0C selectReference() with the negative paths the
    // scope-pin forbids (auto modes / missing supporting evidence / wrong selectedBy mode).
    if (REF && typeof REF.selectReference === 'function') {
      // (a) Forbidden auto mode: selectedBy='fastestValid' must be REJECTED with
      //     REFERENCE_AUTO_SELECTION_FORBIDDEN — the canonical scope-pin enforcement.
      var autoFastest = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: { selectedBy: 'fastestValid', lapId: 'lap1', sourceId: 'src1', selectedAt: '2026-07-01T00:00:00.000Z' },
        candidateLap: null
      });
      chk('selectReference rejects selectedBy=fastestValid', autoFastest && autoFastest.eligible === false);
      chk('reasonCodes include REFERENCE_AUTO_SELECTION_FORBIDDEN', autoFastest && Array.isArray(autoFastest.reasonCodes) && autoFastest.reasonCodes.indexOf('REFERENCE_AUTO_SELECTION_FORBIDDEN') !== -1);

      // (b) Forbidden auto mode: selectedBy='medianValid'
      var autoMedian = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: { selectedBy: 'medianValid', lapId: 'lap1', sourceId: 'src1', selectedAt: '2026-07-01T00:00:00.000Z' },
        candidateLap: null
      });
      chk('selectReference rejects selectedBy=medianValid', autoMedian && autoMedian.eligible === false);
      chk('reasonCodes include REFERENCE_AUTO_SELECTION_FORBIDDEN', autoMedian && autoMedian.reasonCodes.indexOf('REFERENCE_AUTO_SELECTION_FORBIDDEN') !== -1);

      // (c) Forbidden auto mode: selectedBy='bestSectorComposite'
      var autoComposite = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: { selectedBy: 'bestSectorComposite', lapId: 'lap1', sourceId: 'src1', selectedAt: '2026-07-01T00:00:00.000Z' },
        candidateLap: null
      });
      chk('selectReference rejects selectedBy=bestSectorComposite', autoComposite && autoComposite.eligible === false);
      chk('reasonCodes include REFERENCE_AUTO_SELECTION_FORBIDDEN', autoComposite && autoComposite.reasonCodes.indexOf('REFERENCE_AUTO_SELECTION_FORBIDDEN') !== -1);

      // (d) Missing selection (null) — must be REFERENCE_NOT_SELECTED (no auto fallback)
      var noSel = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: null,
        candidateLap: null
      });
      chk('selectReference rejects missing selection (no auto fallback)', noSel && noSel.eligible === false);
      chk('reasonCodes include REFERENCE_NOT_SELECTED', noSel && noSel.reasonCodes.indexOf('REFERENCE_NOT_SELECTED') !== -1);

      // (e) Forged user selection (selectedBy='user' but lapId missing) — REFERENCE_AUTHORITY_FORGED
      var forged = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: { selectedBy: 'user', lapId: '', sourceId: 'src1', selectedAt: '2026-07-01T00:00:00.000Z' },
        candidateLap: null
      });
      chk('selectReference rejects user-selection with empty lapId', forged && forged.eligible === false);
      chk('reasonCodes include REFERENCE_AUTHORITY_FORGED', forged && forged.reasonCodes.indexOf('REFERENCE_AUTHORITY_FORGED') !== -1);

      // (f) Stale/deleted candidate lap — user-selected lap but candidateLap=null
      var stale = REF.selectReference({
        identity: { caseId: 'caseA', sessionId: 'sessA' },
        trackIdentity: { trackId: 'silverstone', layoutId: 'gp', source: 'explicit' },
        selection: { selectedBy: 'user', lapId: 'lap_deleted', sourceId: 'src1', selectedAt: '2026-07-01T00:00:00.000Z' },
        candidateLap: null
      });
      chk('selectReference rejects user-selection with deleted candidate lap', stale && stale.eligible === false);
      chk('reasonCodes include REFERENCE_STALE_OR_DELETED', stale && stale.reasonCodes.indexOf('REFERENCE_STALE_OR_DELETED') !== -1);
    }

    // harness forbids the policies above
    h.assertForbiddenActionsDisabled({ autoReferenceLap: false });
    chk('harness forbidden-action gate passes', true);

    // zero console error
    chk('zero console.error during reference-lap flow', h.consoleErrorCount === 0);
  } finally {
    h.dispose();
  }

  t.report('e2e-flow-04-reference-lap');
})();
