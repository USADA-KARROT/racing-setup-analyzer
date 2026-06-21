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
  if (!AX || !OBS || !CMP || !RE || !DC) throw new Error('analysis-workspace.js requires execution + observation + comparison + engineer + coach modules');

  // pure aggregation: read the five results, derive the workspace capability matrix (no mutation, no recompute).
  function deriveWorkspaceCapability(execution, observation, comparison, raceEngineer, driverCoach) {
    var exCap = (execution && execution.capabilityState) || {};
    var telemetryInspectable = !!(observation && observation.channels && observation.channels.speed && observation.channels.speed.available && observation.channels.steering && observation.channels.steering.available);
    return {
      caseAssembled: exCap.caseValid === true,
      modelRunnable: exCap.modelInputResolved === true,
      modelRan: exCap.modelRan === true,
      telemetryInspectable: telemetryInspectable,
      telemetryObservable: !!(observation && observation.valid === true),
      modelTelemetryComparisonEligible: !!(comparison && comparison.modelTelemetryComparisonEligible === true),
      raceEngineerInspectionEligible: !!(raceEngineer && raceEngineer.eligible && raceEngineer.eligible.inspection === true),
      raceEngineerDirectionalEligible: !!(raceEngineer && raceEngineer.eligible && raceEngineer.eligible.directional === true),
      quantitativeSetupRecommendationEligible: false, // first version — no validated click→rate mapping
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
    var capability = deriveWorkspaceCapability(execution, observation, comparison, raceEngineer, driverCoach);
    return {
      caseContext: caseContext,
      execution: execution,
      observation: observation,
      comparison: comparison,
      raceEngineer: raceEngineer,
      driverCoach: driverCoach,
      capability: capability,
    };
  }

  var api = { runAnalysisWorkspace: runAnalysisWorkspace, deriveWorkspaceCapability: deriveWorkspaceCapability };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisWorkspace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
