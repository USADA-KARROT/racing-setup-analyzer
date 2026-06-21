/**
 * analysis-workspace-viewmodel.js — R2.2 §12: PURE view-model builder for the Case-centric UI.
 *
 * buildAnalysisWorkspaceViewModel(workspaceResult, analysisCase, opts): assembles the 9 UI sections
 * (A Case Header … I Evidence drawer) by CONSUMING the production service outputs. It NEVER recomputes a
 * physics value — every number is read from a service result and tagged with a credibility label
 * (Physics / Model / Measured / Derived / Heuristic / Unavailable). Unavailable/blocked states are
 * surfaced WITH a reason, never hidden. Pure; imports nothing; never mutates inputs. (This is what makes
 * the "UI" unit-testable in Node and keeps the real DOM layer a thin binding.)
 *
 * UMD: Node require / Electron renderer global (AnalysisWorkspaceViewModel).
 */
(function (root) {
  'use strict';

  function m(value, credibility, unit) { return { value: (value === undefined ? null : value), credibility: credibility || 'Unavailable', unit: unit || null }; }
  function _na(credibility) { return { value: null, credibility: credibility || 'Unavailable', unit: null }; }

  // conversionRef → human source basis (for the setup-inputs trust view)
  var REF_BASIS = {
    ground_rate_to_wheel_rate: 'ground (wheel-referred, identity)',
    spring_element_to_wheel_rate: 'spring element × MR²',
    arb_component_to_axle_roll_stiffness: 'ARB blade component → axle Nm/deg',
    f320_ground_arb_to_axle_roll_stiffness: 'ARB ground anti-symmetric',
  };

  function _overallStatus(cap) {
    if (!cap) return 'unknown';
    if (!cap.caseAssembled) return 'case_incomplete';
    if (!cap.modelRan) return 'model_blocked';
    if (cap.modelTelemetryComparisonEligible && cap.raceEngineerDirectionalEligible) return 'analysis_complete_directional';
    if (cap.telemetryObservable) return 'model_ok_comparison_partial';
    return 'model_ok_telemetry_blocked';
  }

  function _setupInputs(analysisCase, suspensionNormalizationView) {
    var snap = (analysisCase && analysisCase.modelSnapshot && analysisCase.modelSnapshot.canonicalInputSnapshot) || {};
    function param(key) {
      var p = snap[key];
      if (!p || p.kind !== 'canonical_parameter') return { value: null, unit: null, basis: null, provenance: null, modelUsable: false, credibility: 'Unavailable' };
      return {
        value: p.value, unit: p.unit,
        basis: REF_BASIS[p.conversionRef] || (p.conversionStatus === 'not_required' ? 'documented (identity)' : null),
        provenance: p.provenance, conversionStatus: p.conversionStatus, conversionRef: p.conversionRef || null,
        modelUsable: p.modelUsable === true,
        credibility: p.provenance === 'measured' ? 'Measured' : (p.provenance === 'derived' ? 'Derived' : (p.provenance === 'documented' ? 'Model' : 'Unavailable')),
      };
    }
    return {
      frontWheelRate: param('frontWheelRateNmm'), rearWheelRate: param('rearWheelRateNmm'),
      frontArb: param('frontArbRollStiffnessNmDeg'), rearArb: param('rearArbRollStiffnessNmDeg'),
      frontTrack: param('frontTrackMm'), rearTrack: param('rearTrackMm'), wheelbase: param('wheelbaseMm'),
      mass: param('massKg'), frontWeightPct: param('frontWeightPct'), cgHeight: param('cgHeightMm'),
      frontRollCentre: param('frontRollCentreHeightMm'), rearRollCentre: param('rearRollCentreHeightMm'),
      trustBadge: 'normalization_compatibility_only_canonicalTrustUpgraded_false',
      suspensionNormalization: suspensionNormalizationView ? {
        frontBasis: suspensionNormalizationView.semantics && suspensionNormalizationView.semantics.frontBasis,
        rearBasis: suspensionNormalizationView.semantics && suspensionNormalizationView.semantics.rearBasis,
        canonicalTrustUpgraded: suspensionNormalizationView.provenance && suspensionNormalizationView.provenance.canonicalTrustUpgraded,
        normalized: suspensionNormalizationView.normalized || null,
      } : null,
    };
  }

  function _modelPrediction(execution) {
    var ran = execution && execution.capabilityState && execution.capabilityState.modelRan === true;
    var s = ran ? execution.modelResultSnapshot : null;
    if (!s) return { available: false, blockedReasons: (execution && execution.blockedReasons) || [] };
    return {
      available: true,
      frontWheelRate: m(s.front_wheel_rate, 'Physics', 'N/mm'), rearWheelRate: m(s.rear_wheel_rate, 'Physics', 'N/mm'),
      frontWheelRateEffective: m(s.front_wheel_rate_effective, 'Physics', 'N/mm'), rearWheelRateEffective: m(s.rear_wheel_rate_effective, 'Physics', 'N/mm'),
      frontRollStiffness: m(s.front_roll_stiffness_total, 'Physics', 'Nm/deg'), rearRollStiffness: m(s.rear_roll_stiffness_total, 'Physics', 'Nm/deg'),
      totalRollStiffness: m(s.total_roll_stiffness, 'Physics', 'Nm/deg'), rollStiffnessDistFront: m(s.roll_stiffness_dist_front, 'Physics', '%'),
      rollGradient: m(s.roll_gradient_deg_per_g, 'Physics', 'deg/g'),
      rideFrequencyFront: m(s.ride_frequency && s.ride_frequency.front_hz, 'Physics', 'Hz'), rideFrequencyRear: m(s.ride_frequency && s.ride_frequency.rear_hz, 'Physics', 'Hz'),
      lltdFront: m(s.lltd_front, 'Physics', '%'), weightFrontPct: m(s.weight_front_pct, 'Physics', '%'),
      understeerGradient: m(s.understeer_gradient, 'Model', 'deg/g'),
      predictedTendency: m(s.tendency, 'Model'),
      modelVersion: execution.modelVersion || null,
    };
  }

  function _telemetryObservation(observation) {
    if (!observation) return { available: false };
    return {
      available: observation.valid === true,
      observedTendency: m(observation.observedTendency, observation.valid ? 'Heuristic' : 'Unavailable'),
      confidence: observation.confidence,
      method: observation.method, limitations: observation.limitations, confounders: observation.confounders,
      channels: observation.channels, selectedWindow: observation.selectedWindow, quality: observation.quality,
      metric: observation.observedMetrics ? observation.observedMetrics.metric : null,
      evidence: observation.evidence, blockedReasons: observation.blockedReasons, warnings: observation.warnings,
      credibility: observation.credibility,
    };
  }

  function _modelVsActual(comparison) {
    if (!comparison) return { available: false };
    return {
      available: comparison.valid === true,
      predicted: m(comparison.predictedTendency, 'Model'),
      observed: m(comparison.observedTendency, 'Heuristic'),
      difference: m(comparison.differenceClass, 'Heuristic'),
      confidence: comparison.confidence, evidence: comparison.evidence, assumptions: comparison.assumptions,
      eligible: comparison.modelTelemetryComparisonEligible === true, blockedReasons: comparison.blockedReasons,
      credibility: comparison.credibility,
    };
  }

  // R2.4 Measured Metrics section — surfaces the calibrated magnitude + measured K_us (or the block reason).
  function _measuredMetrics(comparison, observation) {
    var calMag = observation && observation.calibratedMagnitude;
    var mag = comparison && comparison.magnitudeComparison;
    if (!mag) return { available: false, calibratedMagnitudeAvailable: !!calMag, eligible: false, blockedReasons: [], credibility: 'Unavailable' };
    return {
      available: mag.available === true,
      eligible: mag.eligible === true,
      calibratedMagnitudeAvailable: !!calMag,
      measuredKUs: mag.available === true ? m(mag.measuredKUsDegG, mag.credibility || 'Measured (kinematic, confounded)', 'deg/g') : _na('Unavailable'),
      predictedKUs: m(mag.predictedKUsDegG, 'Model', 'deg/g'),
      residualDegG: (mag.residualDegG != null) ? mag.residualDegG : null,
      agreementClass: mag.agreementClass || null,
      fitQuality: mag.fitQuality || null,
      dataProvenance: mag.dataProvenance || (calMag && calMag.dataProvenance) || 'unverified',
      limitations: mag.limitations || [],
      reason: mag.reason || null,
      blockedReasons: mag.blockedReasons || [],
      credibility: mag.available === true ? (mag.credibility || 'Measured (kinematic, confounded)') : 'Unavailable',
    };
  }

  // R2.5 Quantitative Recommendation section — model-grounded physical-unit setup change (clicks gated).
  function _quantitativeRecommendation(qr) {
    if (!qr) return { available: false, requested: false, credibility: 'Unavailable' };
    return {
      available: qr.available === true, requested: true,
      parameterKey: qr.parameterKey, unit: qr.unit,
      recommendedDeltaPhysical: qr.recommendedDeltaPhysical, recommendedValue: qr.recommendedValue,
      targetMetric: qr.targetMetric, targetDelta: qr.targetDelta, metricUnit: qr.metricUnit,
      baselineMetric: qr.baselineMetric, predictedMetricAfter: qr.predictedMetricAfter, residual: qr.residual,
      sensitivity: qr.sensitivity, sideEffects: qr.sideEffects || [], validationStep: qr.validationStep,
      limitations: qr.limitations || [], clicksEligible: qr.clicksEligible === true,
      credibility: qr.available === true ? 'Model' : 'Unavailable', blockedReasons: qr.blockedReasons || [],
    };
  }

  function _raceEngineer(re) {
    if (!re) return { available: false };
    return {
      available: re.eligible && re.eligible.inspection === true,
      eligible: re.eligible, summary: re.summary,
      likelySubsystems: re.likelySubsystems, inspectionPriorities: re.inspectionPriorities,
      setupDirections: re.setupDirections, trialOrder: re.trialOrder, missingEvidence: re.missingEvidence,
      confidence: re.confidence, evidence: re.evidence, blockedReasons: re.blockedReasons, credibility: re.credibility,
    };
  }

  function _driverCoach(dc) {
    if (!dc) return { available: false };
    return {
      available: dc.eligible === true,
      observations: dc.observations, practicePriorities: dc.practicePriorities, cannotConclude: dc.cannotConclude,
      confidence: dc.confidence, evidence: dc.evidence, blockedReasons: dc.blockedReasons, credibility: dc.credibility,
    };
  }

  function _evidenceDrawer(workspaceResult, analysisCase) {
    var blockers = [];
    ['execution', 'observation', 'comparison', 'raceEngineer', 'driverCoach'].forEach(function (k) {
      var r = workspaceResult[k];
      if (r && Array.isArray(r.blockedReasons)) r.blockedReasons.forEach(function (b) { blockers.push(Object.assign({ layer: k }, b)); });
    });
    var warnings = [];
    if (workspaceResult.observation && Array.isArray(workspaceResult.observation.warnings)) workspaceResult.observation.warnings.forEach(function (w) { warnings.push(w); });
    if (analysisCase && Array.isArray(analysisCase.warnings)) analysisCase.warnings.forEach(function (w) { warnings.push(w); });
    return {
      modelVersion: workspaceResult.execution && workspaceResult.execution.modelVersion,
      provenanceSummary: (workspaceResult.execution && workspaceResult.execution.provenanceSummary) || null,
      caseProvenance: (analysisCase && analysisCase.provenanceSummary) || null,
      channelIdentity: (analysisCase && analysisCase.telemetryBinding && analysisCase.telemetryBinding.channelCapabilitySummary) || null,
      confirmationState: (analysisCase && analysisCase.telemetryBinding && analysisCase.telemetryBinding.confirmationState) || null,
      allBlockedReasons: blockers, allWarnings: warnings,
      credibilityLegend: ['Physics', 'Model', 'Measured', 'Derived', 'Heuristic', 'Unavailable'],
    };
  }

  function buildAnalysisWorkspaceViewModel(workspaceResult, analysisCase, opts) {
    opts = opts || {};
    if (!workspaceResult || typeof workspaceResult !== 'object') {
      return { ok: false, error: 'no_workspace_result' };
    }
    var cap = workspaceResult.capability || {};
    return {
      ok: true,
      caseHeader: {
        caseId: analysisCase && analysisCase.caseId, title: analysisCase && analysisCase.caseMetadata && analysisCase.caseMetadata.title,
        vehicle: workspaceResult.caseContext && workspaceResult.caseContext.vehicleName,
        modelVersion: workspaceResult.execution && workspaceResult.execution.modelVersion,
        telemetrySession: analysisCase && analysisCase.telemetryBinding && analysisCase.telemetryBinding.sessionId,
        createdAt: analysisCase && analysisCase.caseMetadata && analysisCase.caseMetadata.createdAt,
        overallStatus: _overallStatus(cap),
      },
      capabilitySummary: [
        { key: 'caseAssembled', available: !!cap.caseAssembled },
        { key: 'modelRunnable', available: !!cap.modelRunnable },
        { key: 'modelRan', available: !!cap.modelRan },
        { key: 'telemetryInspectable', available: !!cap.telemetryInspectable },
        { key: 'telemetryObservable', available: !!cap.telemetryObservable },
        { key: 'modelTelemetryComparisonEligible', available: !!cap.modelTelemetryComparisonEligible },
        { key: 'calibratedMagnitudeEligible', available: !!cap.calibratedMagnitudeEligible },
        { key: 'measuredKUsEligible', available: !!cap.measuredKUsEligible },
        { key: 'raceEngineerInspectionEligible', available: !!cap.raceEngineerInspectionEligible },
        { key: 'raceEngineerDirectionalEligible', available: !!cap.raceEngineerDirectionalEligible },
        { key: 'driverCoachingEligible', available: !!cap.driverCoachingEligible },
        { key: 'quantitativeSetupRecommendationEligible', available: !!cap.quantitativeSetupRecommendationEligible },
        { key: 'setupAbEligible', available: !!cap.setupAbEligible },
      ],
      setupInputs: _setupInputs(analysisCase, opts.suspensionNormalizationView),
      modelPrediction: _modelPrediction(workspaceResult.execution),
      telemetryObservation: _telemetryObservation(workspaceResult.observation),
      modelVsActual: _modelVsActual(workspaceResult.comparison),
      measuredMetrics: _measuredMetrics(workspaceResult.comparison, workspaceResult.observation),
      quantitativeRecommendation: _quantitativeRecommendation(workspaceResult.quantitativeRecommendation),
      raceEngineer: _raceEngineer(workspaceResult.raceEngineer),
      driverCoach: _driverCoach(workspaceResult.driverCoach),
      evidenceDrawer: _evidenceDrawer(workspaceResult, analysisCase),
    };
  }

  var api = { buildAnalysisWorkspaceViewModel: buildAnalysisWorkspaceViewModel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AnalysisWorkspaceViewModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
