'use strict';
const MM = require('../renderer/js/measured-metrics.js');
let pass = 0, fail = 0; const chk = (n, c, d) => { if (c) pass++; else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const G = 9.80665, RAD2DEG = 180 / Math.PI, L = 2.8;
// invert the model: road-wheel yaw gain G(V) for a target understeer gradient K (deg/g)
const gainFor = (kDegg, V) => { const kRad = kDegg / (G * RAD2DEG); return 1 / (L / V + kRad * V); };
const makeBins = (kPos, kNeg, speeds, o) => { o = o || {}; return speeds.map((v) => ({ speedMps: v, positiveGain: gainFor(kPos, v) * (o.posScale || 1), negativeGain: gainFor(kNeg, v) * (o.negScale || 1), nPos: o.n != null ? o.n : 12, nNeg: o.n != null ? o.n : 12 })); };
const SPEEDS = [14, 18, 22, 26, 30]; // range 16 m/s > MIN_SPEED_RANGE

// clean synthetic K=2 → recovered ≈ 2
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 2, SPEEDS), wheelbaseM: L });
  chk('clean K=2 available', r.available === true, r.blockedReasons);
  chk('clean K=2 recovered ≈ 2', Math.abs(r.kUsDegG - 2) < 0.15, r.kUsDegG);
  chk('credibility is the bare Measured rung', r.credibility === 'Measured');
  chk('kinematic/confounded qualifier lives in limitations', r.limitations.indexOf('kinematic_confounded') !== -1);
  chk('carries confounder limitations', r.limitations.length >= 5 && r.limitations.indexOf('fixed_steering_ratio_assumption') !== -1);
  chk('fitQuality both directions', r.fitQuality.nBinsPos >= 3 && r.fitQuality.nBinsNeg >= 3);
})();

// different value K=5 → recovered ≈ 5
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(5, 5, SPEEDS), wheelbaseM: L });
  chk('K=5 recovered ≈ 5', r.available === true && Math.abs(r.kUsDegG - 5) < 0.2, r.kUsDegG);
})();

// missing wheelbase → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 2, SPEEDS) });
  chk('missing wheelbase blocked', r.available === false && r.blockedReasons.indexOf('missing_wheelbase') !== -1);
})();

// too few bins → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 2, [18, 24]), wheelbaseM: L });
  chk('too few bins blocked', r.available === false);
})();

// insufficient speed range → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 2, [20, 21, 22, 23]), wheelbaseM: L });
  chk('insufficient speed range blocked', r.available === false && JSON.stringify(r.fitQuality).indexOf('insufficient_speed_range') !== -1, r.fitQuality);
})();

// low per-bin samples → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 2, SPEEDS, { n: 4 }), wheelbaseM: L });
  chk('low samples blocked', r.available === false);
})();

// non-positive gain → block (insert a zero/negative gain bin set)
(() => {
  const bins = makeBins(2, 2, SPEEDS).map((b) => ({ ...b, positiveGain: -1 }));
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: bins, wheelbaseM: L });
  chk('non-positive gain blocked', r.available === false);
})();

// per-direction disagreement (pos K=2, neg K=8) → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(2, 8, SPEEDS), wheelbaseM: L });
  chk('per-direction disagreement blocked', r.available === false && r.blockedReasons.indexOf('per_direction_disagreement') !== -1, r.blockedReasons);
})();

// implausible band (K=30, agreeing) → block
(() => {
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: makeBins(30, 30, SPEEDS), wheelbaseM: L });
  chk('implausible band blocked', r.available === false && r.blockedReasons.indexOf('implausible_band') !== -1, r.blockedReasons);
})();

// inconsistent across bins (noisy gains) → high CV → block
(() => {
  const bins = makeBins(2, 2, SPEEDS);
  const noisy = bins.map((b, i) => ({ ...b, positiveGain: b.positiveGain * (i % 2 ? 2.2 : 0.4), negativeGain: b.negativeGain * (i % 2 ? 2.2 : 0.4) }));
  const r = MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: noisy, wheelbaseM: L });
  chk('inconsistent bins blocked', r.available === false, r.kUsDegG);
})();

// determinism: same input twice → identical output
(() => {
  const inp = { calibratedYawGainBins: makeBins(3, 3, SPEEDS), wheelbaseM: L };
  chk('deterministic', JSON.stringify(MM.deriveMeasuredUndersteerGradient(inp)) === JSON.stringify(MM.deriveMeasuredUndersteerGradient(inp)));
})();

// never throws on garbage
(() => {
  let threw = false; try { MM.deriveMeasuredUndersteerGradient({ calibratedYawGainBins: [null, { speedMps: NaN }], wheelbaseM: 'x' }); } catch (e) { threw = true; }
  chk('garbage → no throw, blocked', threw === false);
})();

console.log(`measured-metrics: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
