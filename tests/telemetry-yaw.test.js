/**
 * tests/telemetry-yaw.test.js — synthetic tests for the V2 Observed Yaw-Response core.
 * Pure: no UI, no real CSV, no model. Run: node tests/telemetry-yaw.test.js
 *
 * Two jobs: (1) the descriptive math is correct, (2) the RED LINES hold (no K_us, no road-wheel
 * conversion, no model overlay, raw steering preserved, thresholds data-adaptive, CV fail-closed).
 */
'use strict';
const Y = require('../renderer/js/telemetry-yaw.js');
const P = require('../renderer/js/telemetry-plot.js');
let pass = 0, fail = 0;
const chk = (n, cond, d) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + n + (d !== undefined ? '  ' + JSON.stringify(d) : '')); } };
const near = (a, b, e = 1e-6) => a != null && Math.abs(a - b) <= e;

console.log('=== telemetry-yaw synthetic tests ===');

// ── robust stat helpers ──
(() => {
  chk('pct: median of odd', near(Y._percentile([1, 2, 3, 4, 5], 0.5), 3));
  chk('pct: median of even (interp)', near(Y._percentile([1, 2, 3, 4], 0.5), 2.5));
  chk('pct: p75 of 1..9', near(Y._percentile([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.75), 7));
  chk('pct: clamps p', near(Y._percentile([5, 10], 2), 10) && near(Y._percentile([5, 10], -1), 5));
  chk('median: unsorted', near(Y._median([3, 1, 2]), 2));
  chk('median: even unsorted', near(Y._median([4, 1, 2, 3]), 2.5));
  chk('median: filters null/NaN', near(Y._median([3, null, 1, NaN, 2]), 2));
  chk('iqr: 1..9', near(Y._iqr([1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => a - b), 0), 4)); // p75-p25=7-3
  chk('mad: 1..5', near(Y._mad([1, 2, 3, 4, 5]), 1));
})();

// ── CV fail-closed ──
(() => {
  chk('cv: too few', Y._safeCv([1, 2, 3], 8).reason === 'too_few' && Y._safeCv([1, 2, 3], 8).value === null);
  chk('cv: sign straddles 0', Y._safeCv([1, -1, 1, -1, 1, -1, 1, -1], 8).reason === 'sign_inconsistent');
  chk('cv: mean near zero (signed-consistent but huge spread)',
    Y._safeCv([0.01, 0.01, 0.01, 0.01, 10, 10, 10, 10], 8).reason === 'mean_near_zero');
  const ok = Y._safeCv([10, 10.1, 9.9, 10.05, 9.95, 10.02, 9.98, 10.0], 8);
  chk('cv: well-behaved → value present, no reason', ok.reason === null && ok.value != null && ok.value < 0.05, ok);
})();

// ── derivative ──
(() => {
  const d = Y._derivative([0, 1, 2, 3, 4], [0, 1, 2, 3, 4]);
  chk('deriv: constant slope 1', d.every(v => near(v, 1)));
  const g = Y._derivative([0, 1, 2, 3], [0, 1, null, 3]);
  chk('deriv: null time → that point undecidable or one-sided, no crash', g.length === 4);
})();

// ── a clean steady corner: every point should pass; metrics exact ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); steer.push(20); speed.push(50 + i * 0.1); ay.push(14); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' },
    { speedFloorPercentile: 0 });
  chk('clean: available', r.available === true, r.reason);
  chk('clean: all steady (no exclusions)', r.sampleCounts.steadyState === N, r.sampleCounts);
  chk('clean: scatter keeps RAW steer (=20, NOT divided by any ratio)', r.scatter.every(p => p.steer === 20));
  chk('clean: scatter yaw canonical (=0.4)', r.scatter.every(p => near(p.yawRate, 0.4)));
  chk('clean: combined dispersion median = yaw/steer = 0.02', near(r.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-9), r.dispersion.combined.yawPerSteerStats.median);
  chk('clean: units ratio names raw steer unit', r.units.ratio === 'rad/s per deg', r.units.ratio);
  chk('clean: thresholds are data-adaptive', r.thresholds.source === 'data_adaptive');
  chk('clean: dispersion metric is raw, not road-wheel/understeer', r.dispersion.metric === 'yaw_rate_per_raw_steering');
  chk('clean: speed bins present + cover speed range', r.speedBins.length >= 1 && r.speedBins.every(b => b.n > 0));
})();

// ── low lateral activity is excluded (data-adaptive |ay| threshold) ──
(() => {
  const N = 40, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); steer.push(20); speed.push(50 + i * 0.05); ay.push(i < 30 ? 14 : 1); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' },
    { speedFloorPercentile: 0, strictness: 'normal' });
  chk('lowActivity: the 10 low-|ay| points are excluded', r.sampleCounts.excluded.lowActivity === 10, r.sampleCounts.excluded);
  chk('lowActivity: 30 steady remain', r.sampleCounts.steadyState === 30, r.sampleCounts.steadyState);
})();

// ── unsteady steering is excluded (data-adaptive |dsteer/dt| threshold) ──
(() => {
  const N = 40, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); speed.push(50); ay.push(14); steer.push(i < 30 ? 20 : 20 + (i - 29) * 10); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' },
    { speedFloorPercentile: 0, strictness: 'normal' });
  chk('unsteady: transient steering points excluded', r.sampleCounts.excluded.unsteadySteering >= 8, r.sampleCounts.excluded);
  chk('unsteady: steady portion retained', r.sampleCounts.steadyState >= 25, r.sampleCounts.steadyState);
})();

// ── stationary / very low speed is excluded ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); steer.push(20); ay.push(14); speed.push(i < 25 ? 50 : 0); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, {});
  chk('lowSpeed: speed=0 points excluded (not in steady)', r.sampleCounts.excluded.lowSpeed >= 5, r.sampleCounts.excluded);
})();

// ── invalid (null/NaN) handled, no crash ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(i === 5 ? null : 0.4); steer.push(i === 8 ? NaN : 20); speed.push(50 + i * 0.1); ay.push(14); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' },
    { speedFloorPercentile: 0 });
  chk('invalid: counted, not crashed', r.sampleCounts.excluded.invalid >= 2, r.sampleCounts.excluded);
  chk('invalid: still available with enough remaining', r.available === true);
})();

// ── short segments dropped (consecutive-run requirement) ──
(() => {
  // A fixed lateralActivityFloor isolates exactly the high-|ay| points: two isolated singletons
  // (idx 5, 25) and one run of 3 (idx 15,16,17). minSegment=3 ⇒ only the run survives → 3 steady,
  // below MIN_STEADY_POINTS, so it fails closed AND records the 2 dropped singletons.
  const N = 40, time = [], yaw = [], steer = [], speed = [], ay = [];
  const hi = new Set([5, 15, 16, 17, 25]);
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); steer.push(20); speed.push(50); ay.push(hi.has(i) ? 14 : 0); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' },
    { speedFloorPercentile: 0, minSegmentSamples: 3, lateralActivityFloor: 5 });
  chk('shortSegment: isolated passes dropped → not enough steady', r.available === false && r.reason === 'insufficient_steady_state', r.sampleCounts);
  chk('shortSegment: the 2 isolated singletons recorded under shortSegment', r.sampleCounts.excluded.shortSegment === 2, r.sampleCounts.excluded);
})();

// ── too few samples fails closed ──
(() => {
  const r = Y.computeObservedYawResponse({ time: [0, 0.05], yawRate: [0.4, 0.4], steer: [20, 20], speed: [50, 50], lateralAccel: [14, 14] }, {});
  chk('tooFew: not available', r.available === false && r.reason === 'insufficient_samples');
  chk('tooFew: still returns transparent counts', r.sampleCounts && r.sampleCounts.total === 2);
})();

// ── SOURCE-AGNOSTIC: scaling every value by a constant must NOT change which points are steady ──
(() => {
  const N = 40, t = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { t.push(i * 0.05); yaw.push(0.4 + 0.001 * i); steer.push(20); speed.push(45 + i * 0.2); ay.push(i < 32 ? 14 : 2); }
  const base = Y.computeObservedYawResponse({ time: t, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  const K = 1000;
  const scaled = Y.computeObservedYawResponse({
    time: t, yawRate: yaw.map(v => v * K), steer: steer.map(v => v * K), speed: speed.map(v => v * K), lateralAccel: ay.map(v => v * K), steerUnit: 'deg',
  }, { speedFloorPercentile: 0 });
  chk('agnostic: same steady-state count regardless of magnitude', base.sampleCounts.steadyState === scaled.sampleCounts.steadyState, { b: base.sampleCounts.steadyState, s: scaled.sampleCounts.steadyState });
  chk('agnostic: thresholds scale with data (no hardcoded constant)', near(scaled.thresholds.lateralActivity, base.thresholds.lateralActivity * K, Math.abs(base.thresholds.lateralActivity * K) * 1e-6));
})();

// ── RED-LINE invariants: forbidden names must never appear anywhere in the output ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.4); steer.push(20); speed.push(50 + i * 0.1); ay.push(14); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  const blob = JSON.stringify(r).toLowerCase();
  Y.FORBIDDEN_METRIC_NAMES.forEach(name => {
    chk('invariant: output free of "' + name + '"', blob.indexOf(name) === -1);
  });
  chk('invariant: no "roadwheel"/"road_wheel"/"road-wheel" anywhere', !/road[ _-]?wheel/.test(blob));
  chk('invariant: no "overlay" / "model" verdict field', blob.indexOf('overlay') === -1 && blob.indexOf('"model"') === -1);
  chk('invariant: notes flag descriptive-only + raw-steering', r.notes.indexOf('descriptive_only') !== -1 && r.notes.indexOf('raw_steering_only') !== -1);
  chk('invariant: result carries no kus/setup/measured field', !('kus' in r) && !('measuredKus' in r) && !('setupRecommendation' in r));
})();

// ── scatterLayout: pure geometry for the V2 scatter (X=raw steer, Y=yaw rate, coloured by speed bin) ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); yaw.push(0.3 + 0.004 * i); steer.push(15 + 0.5 * i); speed.push(40 + i * 0.5); ay.push(14); }
  const yd = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  const lay = P.scatterLayout({ cssW: 600, cssH: 320, dpr: 1 }, yd);
  chk('scatter: not empty', lay.empty === false, lay.reason);
  chk('scatter: one screen point per steady sample', lay.points.length === yd.scatter.length, { p: lay.points.length, s: yd.scatter.length });
  chk('scatter: points lie within the plot area', lay.points.every(p => p.px >= lay.plotArea.x - 0.5 && p.px <= lay.plotArea.x + lay.plotArea.w + 0.5 && p.py >= lay.plotArea.y - 0.5 && p.py <= lay.plotArea.y + lay.plotArea.h + 0.5));
  chk('scatter: x axis is raw steering unit', lay.x.unit === 'deg' && lay.x.name === 'steering');
  chk('scatter: y axis is yaw rad/s', lay.y.unit === 'rad/s');
  chk('scatter: legend has one entry per non-empty speed bin', lay.bins.length === yd.speedBins.length && lay.bins.every(b => typeof b.color === 'string'));
  const empty = P.scatterLayout({ cssW: 600, cssH: 320, dpr: 1 }, { available: false, reason: 'channels_missing', scatter: [] });
  chk('scatter: empty data → empty layout w/ reason', empty.empty === true && empty.reason === 'channels_missing' && empty.points.length === 0);
})();

// ── V2 direction split: classify by RAW steering sign (positive/negative/neutral), never |abs| ──
(() => {
  // symmetric opposite-lock: 20 positive (+steer,+yaw) then 20 negative (-steer,-yaw)
  const N = 40, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); const pos = i < 20; steer.push(pos ? 15 : -15); yaw.push(pos ? 0.3 : -0.3); speed.push(50); ay.push(14); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  chk('dir: available', r.available === true, r.reason);
  // (1) combined yaw/steer median correct — both sides same sign (0.3/15 = -0.3/-15 = 0.02), NO cancellation
  chk('dir: combined yaw/steer median = 0.02 (no cancellation)', near(r.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-9), r.dispersion.combined.yawPerSteerStats);
  // (2) SIGNED side medians must NOT cancel toward 0
  chk('dir: positive medianYawRate ≈ +0.3, medianSteer = +15', near(r.dispersion.positive.medianYawRate, 0.3) && r.dispersion.positive.medianSteer === 15, r.dispersion.positive);
  chk('dir: negative medianYawRate ≈ -0.3, medianSteer = -15', near(r.dispersion.negative.medianYawRate, -0.3) && r.dispersion.negative.medianSteer === -15, r.dispersion.negative);
  chk('dir: both sides available', r.dispersion.positive.available === true && r.dispersion.negative.available === true);
  // (5) conservation: n === positive + negative + neutral, in dispersion AND every bin
  chk('dir: dispersion conservation n=pos+neg+neutral', r.dispersion.n === r.dispersion.positive.count + r.dispersion.negative.count + r.dispersion.neutralCount, { n: r.dispersion.n });
  chk('dir: per-bin conservation', r.speedBins.every(b => b.n === b.positive.count + b.negative.count + b.neutralCount));
})();

// ── single-sided data: only the missing side is unavailable ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); steer.push(18); yaw.push(0.35); speed.push(50 + i * 0.1); ay.push(14); } // all positive
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  chk('1side: overall still available', r.available === true, r.reason);
  chk('1side: positive available, negative unavailable (count 0)', r.dispersion.positive.available === true && r.dispersion.negative.available === false && r.dispersion.negative.count === 0, { p: r.dispersion.positive.count, n: r.dispersion.negative.count });
  chk('1side: positive medians present, negative medians null', r.dispersion.positive.medianSteer === 18 && r.dispersion.negative.medianSteer === null);
})();

// ── near-zero steering must NOT blow up the ratio: those points are neutral (no ratio), excluded ──
(() => {
  const segs = [[15, 0.3, 15], [0.05, 0.05, 12], [-15, -0.3, 15]]; // middle band sits near centre
  const time = [], yaw = [], steer = [], speed = [], ay = []; let k = 0;
  for (const s of segs) { for (let i = 0; i < s[2]; i++) { time.push(k * 0.05); steer.push(s[0]); yaw.push(s[1]); speed.push(50); ay.push(14); k++; } }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  const neutral = r.scatter.filter(p => p.dir === 'neutral');
  chk('zero-steer: near-centre pts are neutral with null ratio', neutral.length > 0 && neutral.every(p => p.ratio === null), { neu: neutral.length });
  // had the 0.05/0.05=1 ratios entered, combined median would be pulled far off 0.02
  chk('zero-steer: combined median stays 0.02 (neutral kept out of ratio)', near(r.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-9), r.dispersion.combined.yawPerSteerStats.median);
  chk('zero-steer: every kept ratio is finite + bounded (no blow-up)', r.scatter.map(p => p.ratio).filter(x => x != null).every(x => isFinite(x) && Math.abs(x) < 0.5));
})();

// ── degenerate rate 1: perfectly constant steering & speed must NOT be mass-excluded by float noise ──
(() => {
  const N = 30, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(i * 0.05); steer.push(20); yaw.push(0.4); speed.push(50); ay.push(14); }
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  chk('degen-const: all points steady (no float-noise exclusion)', r.available === true && r.sampleCounts.steadyState === N, r.sampleCounts);
  chk('degen-const: zero unsteady exclusions', r.sampleCounts.excluded.unsteadySteering === 0 && r.sampleCounts.excluded.unsteadySpeed === 0, r.sampleCounts.excluded);
})();

// ── degenerate rate 2: identical non-zero change-rate everywhere → stable + reproducible threshold ──
(() => {
  const N = 30, mk = () => { const time = [], yaw = [], steer = [], speed = [], ay = [];
    for (let i = 0; i < N; i++) { time.push(i * 0.05); steer.push(20); yaw.push(0.4); speed.push(40 + i * 0.5); ay.push(14); } // speed ramps at a CONSTANT rate
    return { time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }; };
  const r1 = Y.computeObservedYawResponse(mk(), { speedFloorPercentile: 0 });
  const r2 = Y.computeObservedYawResponse(mk(), { speedFloorPercentile: 0 });
  chk('degen-rate: constant speed-rate not mass-excluded', r1.available === true && r1.sampleCounts.steadyState >= N - 1, r1.sampleCounts);
  chk('degen-rate: reproducible (same steady count + same threshold)', r1.sampleCounts.steadyState === r2.sampleCounts.steadyState && r1.thresholds.speedRateMax === r2.thresholds.speedRateMax);
})();

// ── degenerate rate 3: derivatives undecidable everywhere (Δt=0) → FAIL-CLOSED, not silent all-pass ──
(() => {
  const N = 20, time = [], yaw = [], steer = [], speed = [], ay = [];
  for (let i = 0; i < N; i++) { time.push(5); steer.push(20 + i); yaw.push(0.4); speed.push(50); ay.push(14); } // every timestamp === 5
  const r = Y.computeObservedYawResponse({ time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }, { speedFloorPercentile: 0 });
  chk('degen-undecidable: fails closed (insufficient, not all-pass)', r.available === false && /insufficient/.test(r.reason), r.reason);
  chk('degen-undecidable: did NOT silently mark everything steady', r.sampleCounts.steadyState < N, r.sampleCounts.steadyState);
})();

// ── near-centre guard must NOT degenerate when a median |steer| would collapse to ~0 ──
// (GPT review blocker: a median-based scale collapses for near-centre-heavy / bimodal / noisy data;
//  the guard uses an upper-end percentile of NON-ZERO |steer| instead, + two fail-closed gates.)
(() => {
  const mk = rows => { const time = [], yaw = [], steer = [], speed = [], ay = []; let k = 0;
    for (const [st, yw, cnt] of rows) for (let i = 0; i < cnt; i++) { time.push(k * 0.05); steer.push(st); yaw.push(yw); speed.push(50); ay.push(14); k++; }
    return { time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }; };
  const maxAbsRatio = r => r.scatter.map(p => p.ratio).filter(x => x != null).reduce((m, x) => Math.max(m, Math.abs(x)), 0);

  // bimodal: 25 straight-line (steer 0) + 8/8 real ±15° corners. A plain median |steer| = 0 here would
  // collapse the old guard to 0; the p95-of-non-zero scale keeps minAbsSteer tied to the real corners.
  const bi = Y.computeObservedYawResponse(mk([[0, 0.001, 25], [15, 0.3, 8], [-15, -0.3, 8]]), { speedFloorPercentile: 0 });
  chk('guard-bimodal: available, near-centre rows neutral, ratio NOT blown up', bi.available === true && bi.dispersion.neutralCount >= 24 && maxAbsRatio(bi) < 0.1, { neu: bi.dispersion.neutralCount, max: maxAbsRatio(bi) });
  chk('guard-bimodal: combined median ≈ 0.02 (uncontaminated by tiny denominators)', near(bi.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-9), bi.dispersion.combined.yawPerSteerStats.median);

  // near-zero NOISE denominators: 25 points at steer 0.0001 with disproportionate yaw 0.4 (=ratio 4000
  // if admitted) mixed with real ±15° corners → the 0.0001 points MUST be neutral, not a 4000 ratio.
  const noisy = Y.computeObservedYawResponse(mk([[0.0001, 0.4, 25], [15, 0.3, 8], [-15, -0.3, 8]]), { speedFloorPercentile: 0 });
  chk('guard-noise: tiny denominators excluded, no ratio blow-up', noisy.available === true && maxAbsRatio(noisy) < 0.1, { max: maxAbsRatio(noisy), minAbs: noisy.thresholds.minAbsSteer });

  // no steering at all among steady samples → fail closed
  const flat = Y.computeObservedYawResponse(mk([[0, 0.0, 30]]), { speedFloorPercentile: 0 });
  chk('guard-flat: all-centre → insufficient_steering (fail closed)', flat.available === false && flat.reason === 'insufficient_steering', flat.reason);

  // too few samples clear the guard (30 centre + only ~5 real corner points < MIN_STEADY) → fail closed
  const sparse = Y.computeObservedYawResponse(mk([[0, 0.0, 30], [15, 0.3, 6]]), { speedFloorPercentile: 0 });
  chk('guard-sparse: <MIN_STEADY ratio points → insufficient_steering', sparse.available === false && sparse.reason === 'insufficient_steering', { reason: sparse.reason });
})();

// ── MIN_DIRECTION_POINTS boundary: a side is 'available' iff it has >= 5 ratio points ──
(() => {
  const mk = rows => { const time = [], yaw = [], steer = [], speed = [], ay = []; let k = 0;
    for (const [st, yw, cnt] of rows) for (let i = 0; i < cnt; i++) { time.push(k * 0.05); steer.push(st); yaw.push(yw); speed.push(50); ay.push(14); k++; }
    return { time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }; };
  // big positive side (always available) + a negative side sized to straddle the boundary.
  const r5 = Y.computeObservedYawResponse(mk([[15, 0.3, 20], [-15, -0.3, 7]]), { speedFloorPercentile: 0, minSegmentSamples: 1 });
  const r4 = Y.computeObservedYawResponse(mk([[15, 0.3, 20], [-15, -0.3, 4]]), { speedFloorPercentile: 0, minSegmentSamples: 1 });
  chk('dir-boundary: availability is exactly count>=MIN_DIRECTION_POINTS', r5.dispersion.negative.available === (r5.dispersion.negative.count >= 5) && r4.dispersion.negative.available === (r4.dispersion.negative.count >= 5), { c5: r5.dispersion.negative.count, a5: r5.dispersion.negative.available, c4: r4.dispersion.negative.count, a4: r4.dispersion.negative.available });
  chk('dir-boundary: large side available, undersized side unavailable', r5.dispersion.negative.available === true && r4.dispersion.negative.available === false, { c5: r5.dispersion.negative.count, c4: r4.dispersion.negative.count });
})();

// ── near-centre guard via log-gap split (GPT round-2 counter-example + round-3 agreed rule) ──
// p95 alone still let a near-zero denominator into the MAIN stats when real corners were a tiny
// minority (< 1-pctl of non-zero). The gap-split + sustained-upper-run rule closes it without a
// hardcoded threshold; a lone outlier falls back (not mistaken for the real-steering cluster).
(() => {
  const mk = rows => { const time = [], yaw = [], steer = [], speed = [], ay = []; let k = 0;
    for (const [st, yw, cnt] of rows) for (let i = 0; i < cnt; i++) { time.push(k * 0.05); steer.push(st); yaw.push(yw); speed.push(50); ay.push(14); k++; }
    return { time, yawRate: yaw, steer, speed, lateralAccel: ay, steerUnit: 'deg' }; };

  // 1) 200 tiny (0.0001) + only 8 real corners: split found, but <MIN_STEADY ratio points → fail closed.
  //    The OLD p95 version reported available with combined median = 4000; this must NOT happen.
  const r1 = Y.computeObservedYawResponse(mk([[0.0001, 0.4, 200], [15, 0.3, 8]]), { speedFloorPercentile: 0 });
  chk('gap-split: tiny-majority + <MIN real corners → fail closed via gap_split (no 4000 contamination)', r1.available === false && r1.reason === 'insufficient_steering' && r1.thresholds.minAbsSteerSource === 'gap_split' && near(r1.thresholds.minAbsSteer, Math.sqrt(0.0001 * 15), 1e-3), { reason: r1.reason, src: r1.thresholds && r1.thresholds.minAbsSteerSource, minAbs: r1.thresholds && r1.thresholds.minAbsSteer });

  // 2) 200 tiny + 16 real corners: split succeeds, the real corners drive the metric, tiny rows neutral.
  const r2 = Y.computeObservedYawResponse(mk([[0.0001, 0.4, 200], [15, 0.3, 16]]), { speedFloorPercentile: 0 });
  chk('gap-split: tiny-majority + enough real corners → split, combined median uncontaminated (≈0.02)', r2.available === true && r2.thresholds.minAbsSteerSource === 'gap_split' && near(r2.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-9) && r2.dispersion.neutralCount >= 195, { src: r2.thresholds.minAbsSteerSource, med: r2.dispersion && r2.dispersion.combined.yawPerSteerStats.median, neu: r2.dispersion && r2.dispersion.neutralCount });

  // 3) lone huge outlier (1000) must NOT be mistaken for the real-steering cluster → fallback, 15s kept.
  const r3 = Y.computeObservedYawResponse(mk([[15, 0.3, 30], [1000, 0.3, 1]]), { speedFloorPercentile: 0 });
  chk('gap-split: lone outlier → fallback, normal corners NOT dropped', r3.available === true && r3.thresholds.minAbsSteerSource === 'upper_percentile_frac' && near(r3.dispersion.combined.yawPerSteerStats.median, 0.02, 1e-6) && r3.scatter.filter(p => p.dir !== 'neutral').length >= 28, { src: r3.thresholds.minAbsSteerSource, med: r3.dispersion && r3.dispersion.combined.yawPerSteerStats.median, nonNeu: r3.scatter.filter(p => p.dir !== 'neutral').length });

  // 4) single-peak all-tiny steering is self-consistent (NOT fail-closed; GPT-agreed source-agnostic boundary).
  const r4 = Y.computeObservedYawResponse(mk([[0.0001, 0.4, 30]]), { speedFloorPercentile: 0 });
  chk('gap-split: single-peak all-tiny → available, self-consistent (no vehicle assumption imposed)', r4.available === true && r4.thresholds.minAbsSteerSource === 'upper_percentile_frac' && r4.dispersion.combined.yawPerSteerStats.median > 100, { src: r4.thresholds.minAbsSteerSource, med: r4.dispersion && r4.dispersion.combined.yawPerSteerStats.median });
})();

console.log(`telemetry-yaw: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
