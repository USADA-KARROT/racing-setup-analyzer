/**
 * setup-ab.js — R2.5 §A/B: model-grounded comparison of TWO setups (PURE).
 *
 * compareSetups(caseA, caseB, opts) runs the SAME model (via AX.runAnalysisCase with the injected runner) on
 * two AnalysisCases and reports the PREDICTED deltas (understeer gradient, roll-stiffness distribution, total
 * roll stiffness, wheel rates, tendency). This is a model PREDICTION (credibility 'Model'), NOT a measured
 * result and NOT a lap-time claim — it is a what-if, never proof that a setup is faster.
 *
 * RED LINES: pure; never mutates inputs; both runs must be valid model runs, else blocked; no measured/laptime
 * claim; deltas are b − a.
 *
 * UMD: Node require / Electron renderer global (SetupAB).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var AX = _req('./analysis-execution.js', typeof AnalysisExecution !== 'undefined' ? AnalysisExecution : undefined);
  var QR = _req('./quantitative-setup-recommendation.js', typeof QuantitativeSetupRecommendation !== 'undefined' ? QuantitativeSetupRecommendation : undefined);

  var METRICS = ['understeer_gradient', 'roll_stiffness_dist_front', 'total_roll_stiffness', 'front_wheel_rate', 'rear_wheel_rate'];
  var ASSUMPTIONS = Object.freeze([
    'model_grounded_prediction_not_measured',
    'same_runner_used_for_both_setups',                                   // accurate: the SAME runner runs both; model versions are checked, not assumed
    'what_if_may_be_hypothetical_model_override_not_provenance_validated', // a UI what-if mutates a value, keeping the baseline's provenance/conversion metadata
    'no_laptime_claim',
    'steady_state_single_point_model',
  ]);

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _blocker(code, detail) { return { code: code, scope: 'setup_ab', severity: 'info', detail: detail || null }; }

  // a known setup parameter outside its plausible motorsport range is flagged (non-blocking — A/B is a what-if,
  // but the user must know the what-if is implausible rather than read it as a clean model result).
  function _plausibilityWarnings(caseA, caseB) {
    // resolve LAZILY at call time (browser load order may put this module before quantitative-setup-recommendation.js)
    var qr = QR || (typeof QuantitativeSetupRecommendation !== 'undefined' ? QuantitativeSetupRecommendation : ((root && root.QuantitativeSetupRecommendation) || null));
    if (!qr || !qr.PARAMETERS) return [];
    var out = [];
    [['a', caseA], ['b', caseB]].forEach(function (pair) {
      var snap = pair[1] && pair[1].modelSnapshot && pair[1].modelSnapshot.canonicalInputSnapshot;
      if (!snap) return;
      Object.keys(qr.PARAMETERS).forEach(function (k) {
        var pp = snap[k]; var rng = qr.PARAMETERS[k].range;
        if (pp && _isFiniteNum(pp.value) && rng && (pp.value < rng[0] || pp.value > rng[1])) out.push({ setup: pair[0], parameter: k, value: pp.value, range: rng });
      });
    });
    return out;
  }
  function _modelVersion(c) { return (c && c.modelSnapshot && c.modelSnapshot.modelVersion) || null; }
  function _side(exec) {
    var s = (exec && exec.modelResultSnapshot) || {};
    var out = { tendency: s.tendency != null ? s.tendency : null };
    METRICS.forEach(function (m) { out[m] = _isFiniteNum(s[m]) ? s[m] : null; });
    return out;
  }

  function compareSetups(caseA, caseB, opts) {
    opts = opts || {};
    try {
      if (!AX) return { valid: false, blockedReasons: [_blocker('ANALYSIS_EXECUTION_UNAVAILABLE')], credibility: 'Unavailable' };
      var ea = AX.runAnalysisCase(caseA, opts);
      var eb = AX.runAnalysisCase(caseB, opts);
      var blocked = [];
      if (!ea || ea.valid !== true) blocked.push(_blocker('SETUP_A_MODEL_RUN_FAILED', ea ? ea.blockedReasons : 'absent'));
      if (!eb || eb.valid !== true) blocked.push(_blocker('SETUP_B_MODEL_RUN_FAILED', eb ? eb.blockedReasons : 'absent'));
      if (blocked.length) {
        return { valid: false, a: ea && ea.valid ? _side(ea) : null, b: eb && eb.valid ? _side(eb) : null, deltas: null, directionalSummary: null, plausibilityWarnings: _plausibilityWarnings(caseA, caseB), assumptions: ASSUMPTIONS, blockedReasons: blocked, credibility: 'Unavailable' };
      }
      var a = _side(ea), b = _side(eb);
      var deltas = {};
      METRICS.forEach(function (m) { deltas[m] = (_isFiniteNum(a[m]) && _isFiniteNum(b[m])) ? (b[m] - a[m]) : null; });
      deltas.tendencyChange = (a.tendency !== b.tendency) ? { from: a.tendency, to: b.tendency } : null;
      // directional summary from the understeer-gradient delta (deg/g): more positive = more understeer
      var dK = deltas.understeer_gradient;
      var directionalSummary = (dK == null) ? 'unavailable' : (Math.abs(dK) < 0.05 ? 'no_meaningful_balance_change' : (dK > 0 ? 'b_more_understeer' : 'b_more_oversteer'));
      // verify (do not assume) the two setups declare the same model version
      var verA = _modelVersion(caseA), verB = _modelVersion(caseB);
      var warnings = _plausibilityWarnings(caseA, caseB);
      if (verA !== verB) warnings.push({ type: 'model_version_mismatch', a: verA, b: verB });
      return {
        valid: true, a: a, b: b, deltas: deltas, directionalSummary: directionalSummary,
        modelVersions: { a: verA, b: verB, match: verA === verB },
        plausibilityWarnings: warnings,
        assumptions: ASSUMPTIONS, blockedReasons: [], credibility: 'Model',
      };
    } catch (e) {
      return { valid: false, a: null, b: null, deltas: null, directionalSummary: null, plausibilityWarnings: [], assumptions: ASSUMPTIONS, blockedReasons: [_blocker('SETUP_AB_EXCEPTION', String(e && e.message || e))], credibility: 'Unavailable' };
    }
  }

  var api = { compareSetups: compareSetups, METRICS: METRICS, ASSUMPTIONS: ASSUMPTIONS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SetupAB = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
