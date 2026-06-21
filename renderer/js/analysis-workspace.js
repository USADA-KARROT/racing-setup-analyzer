/**
 * analysis-workspace.js — R2.2 §7/§12: end-to-end orchestrator + capability aggregation (PURE).
 *
 * runAnalysisWorkspace(analysisCase, telemetrySession, window, opts): runs the whole production chain
 *   runAnalysisCase → observeTelemetry → compareModelToTelemetry → deriveRaceEngineerInsight →
 *   deriveDriverCoachingInsight
 * and aggregates a single WORKSPACE capability state from those results WITHOUT mutating any of them
 * (Codex CP1 finding #5: downstream eligibility cannot be set by runAnalysisCase before observation
 * exists; it is derived here by a pure composition step). This is the single entry point the UI and the
 * integration test call.
 *
 * RED LINES: pure composition; imports the five service modules only; never mutates inputs; the case is
 * never written back to. deriveWorkspaceCapability reads results, never recomputes physics.
 *
 * UMD: Node require / Electron renderer global (AnalysisWorkspace).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var AX = _req('./analysis-execution.js', typeof AnalysisExecution !== 'undefined' ? AnalysisExecution : undefined);
  var OBS = _req('./telemetry-observation.js', typeof TelemetryObservation !== 'undefined' ? TelemetryObservation : undefined);
  var CMP = _req('./model-telemetry-comparison.js', typeof ModelTelemetryComparison !== 'undefined' ? ModelTelemetryComparison : undefined);
  var RE = _req('./race-engineer-insight.js', typeof RaceEngineerInsight !== 'undefined' ? RaceEngineerInsight : undefined);
  var DC = _req('./driver-coach-insight.js', typeof DriverCoachInsight !== 'undefined' ? DriverCoachInsight : undefined);
  var QR = _req('./quantitative-setup-recommendation.js', typeof QuantitativeSetupRecommendation !== 'undefined' ? QuantitativeSetupRecommendation : undefined);
  if (!AX || !OBS || !CMP || !RE || !DC) throw new Error('analysis-workspace.js requires execution + observation + comparison + engineer + coach modules');

  // pure aggregation: read the five results, derive the workspace capability matrix (no mutation, no recompute).
  function deriveWorkspaceCapability(execution, observation, comparison, raceEngineer, driverCoach, quantitativeLeverAvailable) {
    var exCap = (execution && execution.capabilityState) || {};
    var telemetryInspectable = !!(observation && observation.channels && observation.channels.speed && observation.channels.speed.available && observation.channels.steering && observation.channels.steering.available);
    return {
      caseAssembled: exCap.caseValid === true,
      modelRunnable: exCap.modelInputResolved === true,
      modelRan: exCap.modelRan === true,
      telemetryInspectable: telemetryInspectable,
      telemetryObservable: !!(observation && observation.valid === true),
      modelTelemetryComparisonEligible: !!(comparison && comparison.modelTelemetryComparisonEligible === true),
      calibratedMagnitudeEligible: !!(observation && observation.calibrationCapability && observation.calibrationCapability.calibratedMagnitudeEligible === true), // R2.4: road-wheel magnitude derivable
      measuredKUsEligible: !!(comparison && comparison.magnitudeComparisonEligible === true), // R2.4: a measured K_us was actually produced (passed every fail-closed gate)
      raceEngineerInspectionEligible: !!(raceEngineer && raceEngineer.eligible && raceEngineer.eligible.inspection === true),
      raceEngineerDirectionalEligible: !!(raceEngineer && raceEngineer.eligible && raceEngineer.eligible.directional === true),
      setupAbEligible: exCap.modelRan === true, // R2.5: a what-if A/B comparison can run on the model
      quantitativeSetupRecommendationEligible: quantitativeLeverAvailable === true, // R2.5: TRUE only when >=1 non-degenerate balance lever exists (probed via QR.hasQuantitativeLever in runAnalysisWorkspace); per-request still fail-closes; hardware clicks always gated
      driverCoachingEligible: !!(driverCoach && driverCoach.eligible === true),
    };
  }

  function _caseContext(analysisCase) {
    // vehicle/setup context only — NEVER driver-specific evidence (kept out of the Race Engineer input).
    if (!analysisCase || typeof analysisCase !== 'object') return {};
    return {
      vehicleName: (analysisCase.vehicleBinding && analysisCase.vehicleBinding.profileId) || null,
      caseId: analysisCase.caseId || null,
      modelVersion: (analysisCase.modelSnapshot && analysisCase.modelSnapshot.modelVersion) || null,
    };
  }

  function runAnalysisWorkspace(analysisCase, telemetrySession, window, opts) {
    opts = opts || {};
    var caseContext = _caseContext(analysisCase);
    var execution = AX.runAnalysisCase(analysisCase, opts);
    var observation = OBS.observeTelemetry(telemetrySession, window || null, opts.observation || {});
    var comparison = CMP.compareModelToTelemetry(execution, observation, opts.comparison || {});
    var raceEngineer = RE.deriveRaceEngineerInsight(comparison, caseContext, opts.raceEngineer || {});
    var driverCoach = DC.deriveDriverCoachingInsight(observation, caseContext, opts.driverCoach || {});
    // R2.5: optional model-grounded quantitative setup recommendation (when a target + parameter are supplied)
    var quantitativeRecommendation = (opts.quantitative && opts.quantitative.target && opts.quantitative.parameterKey && QR)
      ? QR.recommendSetupChange({ analysisCase: analysisCase, target: opts.quantitative.target, parameterKey: opts.quantitative.parameterKey, runner: opts.modelRunner, execOpts: opts })
      : null;
    // R2.5: a quantitative recommendation is only eligible when at least one permitted balance lever is
    // non-degenerate for some target metric — probe the actual model (cheap; per-request still fail-closes).
    var quantitativeLeverAvailable = (QR && execution && execution.valid === true)
      ? (QR.hasQuantitativeLever(analysisCase, 'roll_stiffness_dist_front', opts.modelRunner, opts) || QR.hasQuantitativeLever(analysisCase, 'understeer_gradient', opts.modelRunner, opts) || QR.hasQuantitativeLever(analysisCase, 'total_roll_stiffness', opts.modelRunner, opts))
      : false;
    var capability = deriveWorkspaceCapability(execution, observation, comparison, raceEngineer, driverCoach, quantitativeLeverAvailable);
    return {
      caseContext: caseContext,
      execution: execution,
      observation: observation,
      comparison: comparison,
      raceEngineer: raceEngineer,
      driverCoach: driverCoach,
      quantitativeRecommendation: quantitativeRecommendation,
      capability: capability,
    };
  }

  var api = { runAnalysisWorkspace: runAnalysisWorkspace, deriveWorkspaceCapability: deriveWorkspaceCapability };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisWorkspace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
