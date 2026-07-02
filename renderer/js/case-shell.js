/**
 * case-shell.js — R3.0A: the Analysis-Case shell's AUTHORITATIVE state / trust / nav deriver (PURE).
 *
 * deriveCaseShellState({ workspaceResult, analysisView, importState, caseMeta }) → the UI shell state model,
 * the per-case nav availability, the Context bar, and the Context/Trust panel — all DERIVED from evidence the
 * services already produced (workspace capability, observation, the analysis view model). It NEVER recomputes
 * physics, NEVER decides eligibility itself, NEVER trusts a caller "eligible/confirmed" flag: per-case nav
 * availability is read from the EXISTING view-model section fields (modelPrediction / telemetryObservation /
 * measuredMetrics / modelVsActual / raceEngineer / quantitativeRecommendation / trackIntelligence /
 * evidenceDrawer). Pure; deterministic; never throws.
 *
 * UMD: Node require / Electron renderer global (CaseShell).
 */
(function (root) {
  'use strict';

  // the UI state model (every non-terminal status yields an actionable nextAction)
  var STATUSES = ['empty', 'draft', 'importing', 'mapping_required', 'confirmation_required', 'window_required',
    'calibration_required', 'ready_for_directional_analysis', 'ready_for_measured_analysis', 'analysis_complete',
    'partially_blocked', 'error'];
  // main-nav items not yet backed by a milestone → explicit, non-actionable deferred panels
  var DEFERRED_NAV = { comparisons: 'R3.0C', cases_library: 'R3.0B' };

  function _avail(x) { return !!(x && x.available === true); }
  function _codes(reasons) { return (Array.isArray(reasons) ? reasons : []).map(function (b) { return (b && b.code) || String(b || ''); }).join(' '); }

  function _navBlockedReason(key, av) {
    if (!av || av.ok !== true) return 'no_analysis_yet';
    var m = {
      setup_model: 'model_not_run', telemetry: 'telemetry_not_observable', measured_metrics: 'measured_not_eligible',
      model_vs_actual: 'comparison_not_eligible', recommendations: 'no_actionable_insight', corner_coaching: 'corner_coaching_not_eligible',
    };
    return m[key] || 'unavailable';
  }

  // per-case nav availability — translates EXISTING view-model eligibility only (no invented contract)
  function _navSections(av) {
    var rec = _avail(av && av.raceEngineer) || _avail(av && av.quantitativeRecommendation) || _avail(av && av.measuredMetrics);
    var defs = [
      { key: 'overview', available: !!(av && av.ok) },
      { key: 'setup_model', available: _avail(av && av.modelPrediction) },
      { key: 'telemetry', available: _avail(av && av.telemetryObservation) },
      { key: 'measured_metrics', available: _avail(av && av.measuredMetrics) },
      { key: 'model_vs_actual', available: _avail(av && av.modelVsActual) },
      { key: 'recommendations', available: rec },
      { key: 'corner_coaching', available: _avail(av && av.trackIntelligence) },
      { key: 'evidence_trust', available: !!(av && av.evidenceDrawer) },
    ];
    return defs.map(function (n) { return { key: n.key, available: n.available, blockedReason: n.available ? null : _navBlockedReason(n.key, av) }; });
  }

  function _status(cap, observation, importState, hasCase) {
    if (!hasCase) return 'empty';
    // pre-run import working states (genuine UI progress, not an analysis conclusion)
    if (importState && importState.phase === 'imported') {
      var req = importState.requiredCount || 0, mapped = importState.mappedCount || 0, conf = importState.confirmedCount || 0;
      if (req > 0 && mapped < req) return 'mapping_required';
      if (req > 0 && conf < req) return 'confirmation_required';
      return 'importing';
    }
    if (importState && importState.phase === 'importing') return 'importing';
    if (!cap) return 'draft';
    if (!cap.modelRan) return cap.caseAssembled ? 'draft' : 'error';
    // model ran
    if (cap.telemetryObservable === true) {
      if (cap.calibratedMagnitudeEligible === true || cap.measuredKUsEligible === true) return 'ready_for_measured_analysis';
      if (cap.modelTelemetryComparisonEligible === true) return 'analysis_complete';
      return 'ready_for_directional_analysis';
    }
    // model ran, observation not valid
    var codes = _codes(observation && observation.blockedReasons);
    if (codes) {
      if (codes.indexOf('TIMEBASE') !== -1 || codes.indexOf('WINDOW') !== -1) return 'window_required';
      if (codes.indexOf('REQUIRED_CHANNEL') !== -1 || codes.indexOf('MAPPING') !== -1 || codes.indexOf('ELIGIBLE') !== -1) return 'mapping_required';
      return 'partially_blocked';
    }
    // model ran, no telemetry attempted → a complete model-only analysis (comparison/measured are unavailable, shown honestly)
    return 'analysis_complete';
  }

  var NEXT = {
    empty: { key: 'create_case', target: 'new_case' },
    draft: { key: 'run_model_or_import_telemetry', target: 'setup_model' },
    importing: { key: 'finish_import', target: 'telemetry' },
    mapping_required: { key: 'map_channels_to_canonical', target: 'telemetry' },
    confirmation_required: { key: 'confirm_channel_identity', target: 'telemetry' },
    window_required: { key: 'select_a_valid_analysis_window', target: 'telemetry' },
    calibration_required: { key: 'add_a_steering_calibration', target: 'measured_metrics' },
    ready_for_directional_analysis: { key: 'add_calibration_for_measured_or_import_more', target: 'measured_metrics' },
    ready_for_measured_analysis: { key: 'review_measured_metrics_and_recommendations', target: 'measured_metrics' },
    analysis_complete: { key: 'review_recommendations_or_import_more_telemetry', target: 'recommendations' },
    partially_blocked: { key: 'resolve_the_top_blocked_reason', target: 'evidence_trust' },
    error: { key: 'check_setup_inputs', target: 'setup_model' },
  };

  function _trustPanel(av, cap, status, nextAction) {
    var measured = av && av.measuredMetrics;
    var ti = av && av.trackIntelligence;
    var provenance = (measured && measured.dataProvenance) || (ti && ti.dataProvenance) || null;
    var limitations = [];
    if (measured && measured.limitations) limitations = limitations.concat(measured.limitations);
    if (ti && ti.limitations) limitations = limitations.concat(ti.limitations);
    var blocked = (av && av.evidenceDrawer && av.evidenceDrawer.allBlockedReasons) || [];
    return {
      capability: (av && av.capabilitySummary) || [],
      credibility: cap && cap.measuredKUsEligible ? 'Measured' : (cap && cap.modelRan ? 'Model' : 'Unavailable'),
      confidence: (av && av.modelVsActual && av.modelVsActual.confidence) || null,
      blockedReasons: blocked,
      limitations: limitations,
      dataProvenance: provenance,
      mappingStatus: cap ? (cap.telemetryObservable ? 'confirmed_observable' : (cap.telemetryInspectable ? 'mapped_not_observable' : 'not_mapped')) : 'not_mapped',
      calibrationStatus: cap ? (cap.calibratedMagnitudeEligible ? 'calibrated' : 'uncalibrated') : 'uncalibrated',
      recommendedNextAction: nextAction,
    };
  }

  function deriveCaseShellState(input) {
    input = input || {};
    try {
      var av = input.analysisView && input.analysisView.ok ? input.analysisView : null;
      var ws = input.workspaceResult || null;
      // capability comes ONLY from service-produced workspace evidence — never from a caller-controlled field on the view model
      var cap = (ws && ws.capability) || null;
      var observation = (ws && ws.observation) || null;
      var caseMeta = input.caseMeta || {};
      var hasCase = caseMeta.hasCase === true || !!av;
      var status = _status(cap, observation, input.importState, hasCase);
      var nextAction = NEXT[status] || NEXT.draft;
      return {
        status: status,
        statusReason: status,
        nextAction: nextAction,
        contextBar: {
          caseName: caseMeta.caseName || (av && av.caseHeader && av.caseHeader.caseId) || null,
          vehicle: caseMeta.vehicle || (av && av.caseHeader && av.caseHeader.vehicle) || null,
          track: caseMeta.track || null,
          session: caseMeta.session || (av && av.caseHeader && av.caseHeader.telemetrySession) || null,
          setupRevision: caseMeta.setupRevision || null,
          telemetrySource: caseMeta.telemetrySource || null,
          analysisStatus: (av && av.caseHeader && av.caseHeader.overallStatus) || status,
        },
        navSections: _navSections(av),
        trustPanel: _trustPanel(av, cap, status, nextAction),
        deferredNav: DEFERRED_NAV,
      };
    } catch (e) {
      return { status: 'error', statusReason: 'shell_exception', nextAction: NEXT.error, contextBar: {}, navSections: _navSections(null), trustPanel: _trustPanel(null, null, 'error', NEXT.error), deferredNav: DEFERRED_NAV };
    }
  }

  var api = { deriveCaseShellState: deriveCaseShellState, STATUSES: STATUSES, DEFERRED_NAV: DEFERRED_NAV };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CaseShell = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
