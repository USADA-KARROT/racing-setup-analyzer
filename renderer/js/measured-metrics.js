/**
 * measured-metrics.js — R2.4 §measured: derive a MEASURED understeer gradient K_us from calibrated
 * road-wheel yaw-gain bins, via a deterministic yaw-gain-vs-speed bicycle-model fit (PURE).
 *
 * Model: 1/G = L/V + K·V, where G = road-wheel yaw gain (rad/s per road-wheel rad), L = wheelbase (m, FIXED —
 * we never fit the wheelbase), V = bin midpoint speed (m/s), K = understeer gradient in rad/(m/s²). Per bin,
 * per direction: K_i = (1/G_i − L/V_i)/V_i → K_deg_per_g = K_i · g · 180/π.
 *
 * Statistical fit is NECESSARY BUT NOT SUFFICIENT: positive-gain, ≥MIN_BINS over ≥MIN_SPEED_RANGE per
 * direction, across-bin consistency (robust CV), a weak R² gate, per-direction AGREEMENT (left vs right,
 * never folded by |abs|), and a plausible physical band must ALL hold — else available:false + a reason.
 * Even when produced, the credibility rung is the bare enum value `Measured`; the kinematic/confounded
 * qualifier lives in limitations[] (standing `kinematic_confounded` + the per-confounder codes) and in the
 * display labels only — never embedded in the rung string. Pure; deterministic; never throws (non-finite → block).
 *
 * UMD: Node require / Electron renderer global (MeasuredMetrics).
 */
(function (root) {
  'use strict';

  var G_ACCEL = 9.80665;            // m/s² per g
  var RAD2DEG = 180 / Math.PI;

  var THRESHOLDS = {
    MIN_SAMPLES_PER_BIN_DIR: 5,     // min direction-split samples per bin
    MIN_BINS: 3,                    // min usable bins per direction (after drops)
    MIN_SPEED_RANGE_MPS: 8,         // min speed span per direction (max−min bin midpoint)
    MAX_CV: 0.5,                    // robust consistency: MAD(K_i)/|median| guarded
    MIN_R2: 0.3,                    // weak fit-quality floor (CV is the primary gate)
    AGREE_ABS_DEGG: 0.6,            // per-direction agreement: absolute floor (deg/g)
    AGREE_REL: 0.35,                // ...or relative to |mean|, whichever larger
    BAND_MIN_DEGG: -5,              // plausible physical band (circuit car)
    BAND_MAX_DEGG: 12,
    CV_MEDIAN_FLOOR_DEGG: 0.2,      // floor on |median| denominator to avoid divide-by-near-zero
  };

  var CONFOUNDERS = ['tyre_load_sensitivity', 'aero_not_separated', 'transient_vs_steady_state', 'single_session', 'fixed_steering_ratio_assumption'];

  function _isFiniteNum(v) { return typeof v === 'number' && isFinite(v); }
  function _median(a) { if (!a.length) return NaN; var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
  function _mad(a, med) { return _median(a.map(function (x) { return Math.abs(x - med); })); }
  function _mean(a) { if (!a.length) return NaN; return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }

  function _block(reasons, fitQuality) {
    return { available: false, kUsDegG: null, method: 'yaw_gain_speed_fit', fitQuality: fitQuality || null, blockedReasons: reasons, credibility: 'Unavailable', limitations: [] };
  }

  // fit one direction; returns {ok, kDegG, cv, r2, nBins, speedRange} or {ok:false, reason}
  function _fitDirection(bins, gainKey, nKey, L, TH) {
    var usable = bins.filter(function (b) {
      return b && _isFiniteNum(b.speedMps) && b.speedMps > 0 && _isFiniteNum(b[gainKey]) && b[gainKey] > 0 && _isFiniteNum(b[nKey]) && b[nKey] >= TH.MIN_SAMPLES_PER_BIN_DIR;
    });
    if (usable.length < TH.MIN_BINS) return { ok: false, reason: 'insufficient_bins', nBins: usable.length };
    var speeds = usable.map(function (b) { return b.speedMps; });
    var range = Math.max.apply(null, speeds) - Math.min.apply(null, speeds);
    if (range < TH.MIN_SPEED_RANGE_MPS) return { ok: false, reason: 'insufficient_speed_range', speedRange: range };
    // per-bin understeer gradient (deg/g) from the bicycle relation, L fixed
    var kDegg = usable.map(function (b) { var invG = 1 / b[gainKey]; var kRad = (invG - L / b.speedMps) / b.speedMps; return kRad * G_ACCEL * RAD2DEG; });
    if (!kDegg.every(_isFiniteNum)) return { ok: false, reason: 'non_finite_estimate' };
    var med = _median(kDegg);
    var cv = _mad(kDegg, med) / Math.max(Math.abs(med), TH.CV_MEDIAN_FLOOR_DEGG);
    if (cv > TH.MAX_CV) return { ok: false, reason: 'inconsistent_across_bins', cv: cv, kDegG: med, nBins: usable.length };
    // R² of 1/G_i vs the fitted line L/V + kRad_med·V
    var kRadMed = med / (G_ACCEL * RAD2DEG);
    var invG = usable.map(function (b) { return 1 / b[gainKey]; });
    var invGmean = _mean(invG);
    var ssRes = 0, ssTot = 0;
    usable.forEach(function (b, i) { var fit = L / b.speedMps + kRadMed * b.speedMps; ssRes += Math.pow(invG[i] - fit, 2); ssTot += Math.pow(invG[i] - invGmean, 2); });
    var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    if (r2 < TH.MIN_R2) return { ok: false, reason: 'poor_fit', r2: r2, cv: cv, kDegG: med, nBins: usable.length };
    return { ok: true, kDegG: med, cv: cv, r2: r2, nBins: usable.length, speedRange: range };
  }

  function deriveMeasuredUndersteerGradient(input) {
    input = input || {};
    var TH = {}; for (var k in THRESHOLDS) TH[k] = THRESHOLDS[k];
    if (input.opts) for (var k2 in input.opts) if (_isFiniteNum(input.opts[k2])) TH[k2] = input.opts[k2];
    var bins = Array.isArray(input.calibratedYawGainBins) ? input.calibratedYawGainBins : [];
    var L = input.wheelbaseM;
    if (!_isFiniteNum(L) || L <= 0) return _block(['missing_wheelbase']);
    if (bins.length < TH.MIN_BINS) return _block(['insufficient_bins']);
    var pos = _fitDirection(bins, 'positiveGain', 'nPos', L, TH);
    var neg = _fitDirection(bins, 'negativeGain', 'nNeg', L, TH);
    if (!pos.ok || !neg.ok) return _block(['per_direction_fit_failed:' + (pos.ok ? 'pos_ok' : pos.reason) + '/' + (neg.ok ? 'neg_ok' : neg.reason)], { pos: pos, neg: neg });
    var delta = Math.abs(pos.kDegG - neg.kDegG);
    var meanK = (pos.kDegG + neg.kDegG) / 2;
    var agreeTol = Math.max(TH.AGREE_ABS_DEGG, TH.AGREE_REL * Math.abs(meanK));
    if (delta > agreeTol) return _block(['per_direction_disagreement'], { kPos: pos.kDegG, kNeg: neg.kDegG, agreementDeltaDegG: delta, agreeTol: agreeTol });
    if (meanK < TH.BAND_MIN_DEGG || meanK > TH.BAND_MAX_DEGG) return _block(['implausible_band'], { meanK: meanK });
    return {
      available: true,
      kUsDegG: meanK,
      method: 'yaw_gain_speed_fit',
      fitQuality: {
        nBinsPos: pos.nBins, nBinsNeg: neg.nBins, speedRangeMps: Math.min(pos.speedRange, neg.speedRange),
        cvPos: pos.cv, cvNeg: neg.cv, r2Pos: pos.r2, r2Neg: neg.r2, kPos: pos.kDegG, kNeg: neg.kDegG, agreementDeltaDegG: delta,
      },
      blockedReasons: [],
      credibility: 'Measured',
      limitations: ['kinematic_confounded'].concat(CONFOUNDERS),
    };
  }

  var api = { deriveMeasuredUndersteerGradient: deriveMeasuredUndersteerGradient, THRESHOLDS: THRESHOLDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MeasuredMetrics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
