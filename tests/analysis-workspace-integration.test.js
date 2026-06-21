/**
 * tests/analysis-workspace-integration.test.js — R2.2 §16 full end-to-end integration.
 * Demo fixture → AnalysisCase → canonical normalization → model execution → telemetry observation →
 * comparison → Race Engineer → Driver Coach → UI view model. Asserts the §13 golden-path narrative is
 * PRODUCED by production code (not hardcoded), and that the view model exposes all 9 sections honestly.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const DEMO = require('../renderer/js/demo-analysis-case.js');
const WS = require('../renderer/js/analysis-workspace.js');
const VM = require('../renderer/js/analysis-workspace-viewmodel.js');

let pass = 0, fail = 0;
const chk = (name, cond, detail) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + name + (detail !== undefined ? '  ' + JSON.stringify(detail) : '')); } };

// real physics core via vm
const jsDir = path.join(__dirname, '..', 'renderer', 'js');
const src = fs.readFileSync(path.join(jsDir, 'calibration.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'tire-data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(jsDir, 'dynamics-model.js'), 'utf8') + '\n' + 'this.__h={Tier1BasicBalance};';
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'integ' });
const runner = (p) => new ctx.__h.Tier1BasicBalance(p).calculate();

const demo = DEMO.buildDemoAnalysisCase();

// ── demo case assembled honestly ──
chk('demo: case valid', demo.analysisCase.valid === true, demo.analysisCase.errors);
chk('demo: modelInputEligible true', demo.analysisCase.capabilityState.modelInputEligible === true);
chk('demo: privateSourceCount 0', demo.analysisCase.provenanceSummary.privateSourceCount === 0);
chk('demo: mixed-basis suspension (front ground, rear spring_element)', demo.suspensionNormalizationView.semantics.frontBasis === 'ground' && demo.suspensionNormalizationView.semantics.rearBasis === 'spring_element');
chk('demo: normalization canonicalTrustUpgraded false', demo.suspensionNormalizationView.provenance.canonicalTrustUpgraded === false);

const ws = WS.runAnalysisWorkspace(demo.analysisCase, demo.telemetrySession, demo.window, { modelRunner: runner });

// ── §13 golden-path narrative (produced, not hardcoded) ──
chk('chain: model predicts understeer', ws.execution.valid === true && ws.execution.predictedTendency === 'understeer', ws.execution.predictedTendency);
chk('chain: understeer gradient mild positive', ws.execution.modelResultSnapshot.understeer_gradient > 0.5, ws.execution.modelResultSnapshot.understeer_gradient);
chk('chain: observed understeer_tendency', ws.observation.observedTendency === 'understeer_tendency', ws.observation.observedTendency);
chk('chain: observation is heuristic directional (not measured)', ws.observation.credibility === 'Heuristic');
chk('chain: comparison observed_more_understeer', ws.comparison.differenceClass === 'observed_more_understeer', ws.comparison.differenceClass);
chk('chain: comparison eligible', ws.comparison.modelTelemetryComparisonEligible === true);
chk('chain: RE directional, front subsystems', ws.raceEngineer.eligible.directional === true && ws.raceEngineer.likelySubsystems.indexOf('front_tyre_state') !== -1);
chk('chain: RE quantitative blocked', ws.raceEngineer.eligible.quantitative === false);
chk('chain: DC observes corrections', ws.driverCoach.eligible === true && ws.driverCoach.evidence.steeringReversalCount > 0);
chk('chain: DC cannot attribute to a corner (no track position)', ws.driverCoach.cannotConclude.indexOf('attribution_to_a_specific_corner_or_apex_no_track_position') !== -1);

// ── workspace capability aggregation ──
const cap = ws.capability;
chk('cap: model ran', cap.modelRan === true);
chk('cap: telemetry observable', cap.telemetryObservable === true);
chk('cap: comparison eligible', cap.modelTelemetryComparisonEligible === true);
chk('cap: RE directional eligible', cap.raceEngineerDirectionalEligible === true);
chk('cap: quantitative recommendation eligible (model-grounded, R2.5)', cap.quantitativeSetupRecommendationEligible === true);
chk('cap: setup A/B eligible', cap.setupAbEligible === true);
chk('cap: driver coaching eligible', cap.driverCoachingEligible === true);

// ── case never written back to (R2.1D stays valid) ──
const AC = require('../renderer/js/analysis-case.js');
chk('case intact: still validates clean after workspace run', AC.validateAnalysisCase(demo.analysisCase).ok === true);
chk('case intact: comparison eligibility NOT on the case', demo.analysisCase.capabilityState.modelTelemetryComparisonEligible === false);

// ── view model: all 9 sections, credibility labels, blocked-with-reason, no crash ──
const view = VM.buildAnalysisWorkspaceViewModel(ws, demo.analysisCase, { suspensionNormalizationView: demo.suspensionNormalizationView });
chk('view: ok', view.ok === true);
chk('view A: case header status complete', view.caseHeader.overallStatus === 'analysis_complete_directional', view.caseHeader.overallStatus);
chk('view B: capability summary lists 12 flags', view.capabilitySummary.length === 16);
chk('view C: setup inputs front wheel rate present + Derived', view.setupInputs.frontWheelRate.value > 0 && view.setupInputs.frontWheelRate.credibility === 'Derived');
chk('view C: front basis ground identity', /ground/.test(view.setupInputs.frontWheelRate.basis || ''));
chk('view C: rear basis spring element', /spring element/.test(view.setupInputs.rearWheelRate.basis || ''));
chk('view C: trust badge compatibility-only', /canonicalTrustUpgraded_false/.test(view.setupInputs.trustBadge));
chk('view D: model prediction available, tendency Model-credibility', view.modelPrediction.available === true && view.modelPrediction.predictedTendency.credibility === 'Model');
chk('view D: understeer gradient Model', view.modelPrediction.understeerGradient.credibility === 'Model');
chk('view D: roll stiffness Physics', view.modelPrediction.totalRollStiffness.credibility === 'Physics');
chk('view E: telemetry observation available, metric raw yaw/steer', view.telemetryObservation.available === true && view.telemetryObservation.metric === 'yaw_rate_per_raw_steering');
chk('view E: limitations present', view.telemetryObservation.limitations.indexOf('steering_is_raw_uncalibrated') !== -1);
chk('view F: model vs actual difference Heuristic', view.modelVsActual.difference.credibility === 'Heuristic' && view.modelVsActual.difference.value === 'observed_more_understeer');
chk('view F: assumptions present', view.modelVsActual.assumptions.indexOf('qualitative_directional_comparison_not_numeric_residual') !== -1);
chk('view G: race engineer available, inspection priorities', view.raceEngineer.available === true && view.raceEngineer.inspectionPriorities.length > 0);
chk('view H: driver coach available, cannotConclude present', view.driverCoach.available === true && view.driverCoach.cannotConclude.length > 0);
chk('view I: evidence drawer credibility legend', view.evidenceDrawer.credibilityLegend.indexOf('Heuristic') !== -1 && view.evidenceDrawer.credibilityLegend.indexOf('Unavailable') !== -1);
chk('view I: model version surfaced', view.evidenceDrawer.modelVersion === 'v1.6.0');

// ── unavailable path does not crash the view model (telemetry blocked) ──
(() => {
  const badSession = { sessionId: 'x', parsed: require('../renderer/js/telemetry-core.js').parseCsv('time,speed\n0,10\n'), definitions: { channels: {} } };
  const ws2 = WS.runAnalysisWorkspace(demo.analysisCase, badSession, null, { modelRunner: runner });
  const v2 = VM.buildAnalysisWorkspaceViewModel(ws2, demo.analysisCase, {});
  chk('unavailable: view ok (no crash)', v2.ok === true);
  chk('unavailable: telemetry observation not available', v2.telemetryObservation.available === false);
  chk('unavailable: model still ran', v2.modelPrediction.available === true);
  chk('unavailable: comparison not available', v2.modelVsActual.available === false);
  chk('unavailable: RE inspection still available (model prediction)', v2.raceEngineer.available === true && v2.raceEngineer.eligible.directional === false);
})();

console.log(`analysis-workspace-integration: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
