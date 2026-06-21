/**
 * quantitative-setup-recommendation.js — R2.5 §quantitative: a model-grounded, honestly-gated setup
 * recommendation in PHYSICAL units (PURE).
 *
 * recommendSetupChange({ analysisCase, target:{metric, delta}, parameterKey, runner, opts }) computes the
 * model's LOCAL sensitivity of `metric` to `parameterKey` (perturb one canonical input, re-run, finite
 * difference), then recommends a change in physical units (Nm/deg, N/mm, %) the model predicts will move the
 * metric by `delta`, with a re-run verification (predicted-after + residual) and the side-effects on other
 * metrics. It is a single-parameter, locally-linear MODEL prediction (credibility 'Model') — never measured,
 * never a lap-time promise, and NEVER a hardware "click" count (no validated click→rate mapping exists →
 * `clicksEligible:false`). Fail-closed on degenerate sensitivity / non-model-usable perturbation / implausible
 * result. Pure; never mutates the input case; never throws.
 *
 * UMD: Node require / Electron renderer global (QuantitativeSetupRecommendation).
 */
(function (root) {
  'use strict';

  function _req(p, g) { var m = null; if (typeof module !== 'undefined' && module.exports) { try { m = require(p); } catch (e) { m = null; } } return m || (typeof g !== 'undefined' ? g : null); }
  var AX = _req('./analysis-execution.js', typeof AnalysisExecution !== 'undefined' ? AnalysisExecution : undefined);

  // targetable balance metrics the frozen model outputs, with the change a probe must produce to be non-degenerate.
  var TARGET_METRICS = {
    understeer_gradient: { unit: 'deg/g', changeFloor: 0.005, band: [-8, 12] },
    roll_stiffness_dist_front: { unit: '%', changeFloor: 0.05, band: [0, 100] },
    total_roll_stiffness: { unit: 'Nm/deg', changeFloor: 2, band: [0, 20000] },
  };
  // perturbable canonical-input parameters (snapshot keys), with physical unit + positivity constraint.
  var PARAMETERS = {
    // finite, defensible motorsport ranges — a recommended value outside its range is blocked (no arbitrarily large rec).
    // leverType distinguishes a SUSPENSION change (spring/ARB) from a WEIGHT-DISTRIBUTION/ballast change — materially different.
    frontArbRollStiffnessNmDeg: { unit: 'Nm/deg', range: [0, 3000], leverType: 'suspension_roll_stiffness' },
    rearArbRollStiffnessNmDeg: { unit: 'Nm/deg', range: [0, 3000], leverType: 'suspension_roll_stiffness' },
    frontWheelRateNmm: { unit: 'N/mm', range: [20, 600], leverType: 'suspension_spring_rate' },
    rearWheelRateNmm: { unit: 'N/mm', range: [20, 600], leverType: 'suspension_spring_rate' },
    frontWeightPct: { unit: '%', range: [40, 70], leverType: 'weight_distribution_ballast' },
  };
  var LIMITATIONS = ['local_linearization', 'single_parameter', 'model_grounded_not_measured'];
  var OTHER_METRICS = ['understeer_gradient', 'roll_stiffness_dist_front', 'total_roll_stiffness', 'front_wheel_rate', 'rear_wheel_rate'];

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _blocker(code, detail) { return { code: code, scope: 'quantitative_recommendation', severity: 'info', detail: detail || null }; }
  function _block(reasons) { return { available: false, parameterKey: null, recommendedDeltaPhysical: null, recommendedValue: null, predictedMetricAfter: null, residual: null, sensitivity: null, sideEffects: null, validationStep: null, limitations: [], clicksEligible: false, credibility: 'Unavailable', blockedReasons: reasons }; }

  // run the model at a snapshot value for parameterKey (or baseline when value===null); returns {valid, snapshot}
  // execution options resolver: prefer a full opts object (modelRunner | modelEngine | global) so the runner is
  // resolved EXACTLY as the workspace's execution did (never a divergent global fallback).
  function _execOpts(o) { if (o && o.execOpts) return o.execOpts; if (o && typeof o.runner === 'function') return { modelRunner: o.runner }; if (o && o.runner !== undefined && o.runner !== null) return { modelRunner: o.runner }; return {}; }
  function _runAt(analysisCase, parameterKey, value, execOpts) {
    var c = JSON.parse(JSON.stringify(analysisCase));
    if (value !== null) {
      var snap = c.modelSnapshot && c.modelSnapshot.canonicalInputSnapshot;
      var p = snap && snap[parameterKey];
      if (!p || typeof p !== 'object') return { valid: false, reason: 'parameter_not_in_snapshot' };
      p.value = value;
    }
    var ex = AX.runAnalysisCase(c, execOpts || {});
    if (!ex || ex.valid !== true) return { valid: false, reason: 'model_run_failed', blockedReasons: ex ? ex.blockedReasons : null };
    return { valid: true, snapshot: ex.modelResultSnapshot || {} };
  }

  function recommendSetupChange(input) {
    input = input || {};
    try {
      if (!AX) return _block([_blocker('ANALYSIS_EXECUTION_UNAVAILABLE')]);
      var analysisCase = input.analysisCase, target = input.target || {}, parameterKey = input.parameterKey;
      var execOpts = _execOpts(input); // SAME runner resolution as the workspace execution (modelRunner|modelEngine|global)
      var mCfg = TARGET_METRICS[target.metric];
      var pCfg = PARAMETERS[parameterKey];
      if (!analysisCase || typeof analysisCase !== 'object') return _block([_blocker('NO_ANALYSIS_CASE')]);
      if (!mCfg) return _block([_blocker('UNKNOWN_TARGET_METRIC', String(target.metric))]);
      if (!_isFiniteNum(target.delta) || target.delta === 0) return _block([_blocker('BAD_TARGET_DELTA', String(target.delta))]);
      if (!pCfg) return _block([_blocker('UNKNOWN_PARAMETER', String(parameterKey))]);

      // baseline
      var base = _runAt(analysisCase, null, null, execOpts);
      if (!base.valid) return _block([_blocker('BASELINE_RUN_FAILED', base.blockedReasons || base.reason)]);
      var baselineMetric = base.snapshot[target.metric];
      if (!_isFiniteNum(baselineMetric)) return _block([_blocker('BASELINE_METRIC_NOT_FINITE', target.metric)]);
      var snap0 = analysisCase.modelSnapshot && analysisCase.modelSnapshot.canonicalInputSnapshot;
      var p0 = snap0 && snap0[parameterKey];
      var baseValue = p0 && _isFiniteNum(p0.value) ? p0.value : null;
      if (baseValue === null) return _block([_blocker('PARAMETER_VALUE_NOT_FINITE', parameterKey)]);
      // the BASELINE itself must be inside the plausible range (never derive a sensitivity from an out-of-range setup)
      if (baseValue < pCfg.range[0] || baseValue > pCfg.range[1]) return _block([_blocker('BASELINE_PARAMETER_OUT_OF_RANGE', parameterKey + '=' + baseValue)]);

      // in-range probe: a relative step that stays INSIDE the parameter's plausible range (one-sided near a bound)
      var step = Math.max(Math.abs(baseValue) * 0.1, 0.5);
      var probeValue;
      if (baseValue + step <= pCfg.range[1]) probeValue = baseValue + step;
      else if (baseValue - step >= pCfg.range[0]) probeValue = baseValue - step;
      else return _block([_blocker('PARAMETER_RANGE_TOO_NARROW_FOR_PROBE', parameterKey)]);
      var probeStep = probeValue - baseValue; // signed (preserves sensitivity sign)
      var probe = _runAt(analysisCase, parameterKey, probeValue, execOpts);
      if (!probe.valid) return _block([_blocker('PERTURBED_RUN_NOT_MODEL_USABLE', probe.blockedReasons || probe.reason)]);
      var probeMetric = probe.snapshot[target.metric];
      if (!_isFiniteNum(probeMetric)) return _block([_blocker('PROBE_METRIC_NOT_FINITE', target.metric)]);

      // degenerate sensitivity: the parameter barely moves the metric over a meaningful probe → blocked
      if (Math.abs(probeMetric - baselineMetric) < mCfg.changeFloor) return _block([_blocker('DEGENERATE_SENSITIVITY', parameterKey + '→' + target.metric)]);
      var sensitivity = (probeMetric - baselineMetric) / probeStep; // Δmetric per unit of parameter (signed in-range step)
      if (!_isFiniteNum(sensitivity) || sensitivity === 0) return _block([_blocker('DEGENERATE_SENSITIVITY', 'zero_or_non_finite')]);

      var recommendedDelta = target.delta / sensitivity;
      var recommendedValue = baseValue + recommendedDelta;
      // physical plausibility of the recommended value (finite, defensible range — no arbitrarily large recommendation)
      if (recommendedValue < pCfg.range[0] || recommendedValue > pCfg.range[1]) return _block([_blocker('IMPLAUSIBLE_RECOMMENDED_VALUE', parameterKey + '=' + recommendedValue.toFixed(2) + ' ' + pCfg.unit + ' outside [' + pCfg.range[0] + ',' + pCfg.range[1] + ']')]);

      // verify: re-run the model at the recommended value
      var after = _runAt(analysisCase, parameterKey, recommendedValue, execOpts);
      if (!after.valid) return _block([_blocker('RECOMMENDED_RUN_NOT_MODEL_USABLE', after.blockedReasons || after.reason)]);
      var predictedAfter = after.snapshot[target.metric];
      if (!_isFiniteNum(predictedAfter)) return _block([_blocker('RECOMMENDED_METRIC_NOT_FINITE', target.metric)]);
      if (predictedAfter < mCfg.band[0] || predictedAfter > mCfg.band[1]) return _block([_blocker('PREDICTED_RESULT_OUT_OF_BAND', target.metric + '=' + predictedAfter.toFixed(3))]);

      var residual = predictedAfter - (baselineMetric + target.delta); // linearization error
      var sideEffects = OTHER_METRICS.filter(function (m) { return m !== target.metric; }).map(function (m) {
        var d = (_isFiniteNum(after.snapshot[m]) && _isFiniteNum(base.snapshot[m])) ? (after.snapshot[m] - base.snapshot[m]) : null;
        return { metric: m, delta: d };
      }).filter(function (s) { return s.delta != null && Math.abs(s.delta) > 1e-9; });

      var limitations = LIMITATIONS.slice();
      if (Math.abs(recommendedDelta) > Math.abs(baseValue) * 0.5) limitations.push('large_extrapolation_beyond_local_linearity');
      if (Math.abs(residual) > Math.abs(target.delta) * 0.25) limitations.push('linearization_residual_significant_recheck');

      return {
        available: true,
        parameterKey: parameterKey,
        leverType: pCfg.leverType, // suspension_roll_stiffness | suspension_spring_rate | weight_distribution_ballast
        unit: pCfg.unit,
        baselineValue: baseValue,
        recommendedDeltaPhysical: recommendedDelta,
        recommendedValue: recommendedValue,
        targetMetric: target.metric,
        targetDelta: target.delta,
        metricUnit: mCfg.unit,
        baselineMetric: baselineMetric,
        predictedMetricAfter: predictedAfter,
        residual: residual,
        sensitivity: sensitivity,
        sideEffects: sideEffects,
        validationStep: 'Apply the physical change, re-run the model to confirm, then validate on track with a back-to-back run before trusting the direction; treat it as a conservative starting point, not a guarantee.',
        limitations: limitations,
        clicksEligible: false, // no validated per-car click→rate mapping — physical units only
        credibility: 'Model',
        blockedReasons: [],
      };
    } catch (e) {
      return _block([_blocker('QUANTITATIVE_RECOMMENDATION_EXCEPTION', String(e && e.message || e))]);
    }
  }

  // does ANY known parameter have a non-degenerate sensitivity for the metric? (drives capability eligibility)
  function hasQuantitativeLever(analysisCase, metric, runner, execOpts) {
    var mCfg = TARGET_METRICS[metric];
    if (!mCfg || !AX) return false;
    var eo = execOpts || (typeof runner === 'function' ? { modelRunner: runner } : (runner != null ? { modelRunner: runner } : {}));
    var base = _runAt(analysisCase, null, null, eo);
    if (!base.valid || !_isFiniteNum(base.snapshot[metric])) return false;
    var snap = analysisCase.modelSnapshot && analysisCase.modelSnapshot.canonicalInputSnapshot;
    var keys = Object.keys(PARAMETERS);
    for (var i = 0; i < keys.length; i++) {
      var p = snap && snap[keys[i]]; var pc = PARAMETERS[keys[i]];
      if (!p || !_isFiniteNum(p.value) || !pc || p.value < pc.range[0] || p.value > pc.range[1]) continue;
      var st = Math.max(Math.abs(p.value) * 0.1, 0.5);
      var pv = (p.value + st <= pc.range[1]) ? p.value + st : ((p.value - st >= pc.range[0]) ? p.value - st : null);
      if (pv === null) continue;
      var probe = _runAt(analysisCase, keys[i], pv, eo);
      if (probe.valid && _isFiniteNum(probe.snapshot[metric]) && Math.abs(probe.snapshot[metric] - base.snapshot[metric]) >= mCfg.changeFloor) return true;
    }
    return false;
  }

  var api = { recommendSetupChange: recommendSetupChange, hasQuantitativeLever: hasQuantitativeLever, TARGET_METRICS: TARGET_METRICS, PARAMETERS: PARAMETERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.QuantitativeSetupRecommendation = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
