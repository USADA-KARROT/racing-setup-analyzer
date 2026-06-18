/**
 * bms-measured-extraction-harness.js — SYNTHETIC measured-extraction harness (Phase 3G-0B)
 *
 * This is a SYNTHETIC HARNESS, not real extraction. It proves the SHAPE and gate logic of a future
 * measured handling-response extraction (corner segmentation → entry/mid/exit windows → steady-state
 * filter → measured-tendency proxy) by running it ONLY on a synthetic canonical measured series
 * supplied explicitly in opts. It NEVER extracts real/imported data, NEVER produces a real measured
 * handling response, and NEVER enables overlay / Kus / model-vs-actual / setup / handling analysis.
 *
 * Why this layer exists: Phase 3G-0A defines the extraction INPUT CONTRACT and an eligibility GATE,
 * but builds no extraction. 3G-0B validates that the extraction harness — once a real canonical
 * series exists (much later) — has the right shape and refuses to run on anything but a synthetic
 * fixture. It is the harness, not the analysis.
 *
 * Gate-first (two hard gates, both must pass before ANY harness step runs):
 *   1. eligibility gate — extractionEligibility.status must be 'eligible_for_extraction'.
 *   2. synthetic gate   — opts.syntheticOnly must be true AND a synthetic series must be supplied.
 * A real/imported path (no synthetic series, not flagged synthetic, or not eligible) is blocked and
 * produces NO corner segments, NO entry/mid/exit windows, and NO tendency proxy. realDataUsed is
 * ALWAYS false — the harness only ever touches the synthetic fixture in opts.
 *
 * Red lines (always held): no real extraction; no real measured handling response; no real corner
 * segmentation / entry-mid-exit tendency; no real channel mapping; no real physical values; no exact
 * Hz / sample index / corner timing from real files; no overlay; no Kus / understeer gradient; no
 * handling correlation; no setup recommendation; no model-vs-actual; no driving-behaviour
 * interpretation; no chart. The measured-tendency PROXY is synthetic-only and is explicitly NOT a
 * Kus, NOT a setup recommendation, NOT a model-vs-actual result. `.bmsbin` is an adapter; output
 * flows back to the source-agnostic descriptor. Clean-room — real .bmsbin / raw samples never enter.
 */

// Abstract extraction profiles — required canonical channels for the synthetic harness. These names
// only ever describe a synthetic fixture / abstract schema; they are NEVER shown as a channel found
// in real data.
const _MEX_PROFILES = {
  handlingResponseExtraction: ['speed', 'steering', 'lateral_accel', 'yaw_rate'],
};

// Synthetic harness constants (abstract — tuned for fixture shape validation, NOT real physics).
const _MEX = {
  MIN_SAMPLES: 12,            // minimum series length to attempt segmentation
  CORNER_LATG_THRESHOLD: 0.30, // |lateral_accel| above this marks a synthetic corner (abstract g)
  MIN_CORNER_SAMPLES: 6,      // a synthetic corner must be at least this long
  MIN_STEADY_SAMPLES: 3,      // a steady-state window needs at least this many samples
  STEADY_SPEED_BUCKET: 3.0,   // max speed spread within a steady-state window (abstract)
  STEADY_LATG_BUCKET: 0.15,   // max lateral_accel spread within a steady-state window (abstract)
  NEUTRAL_RATIO: 1.0,         // baseline |steering|/|lateral_accel| ratio for the neutral proxy
  PROXY_BAND: 0.15,           // ±band around NEUTRAL_RATIO that counts as neutral_like
  STEADY_SAMPLES_MEDIUM: 24,  // total steady-state samples for 'medium' proxy confidence (else 'low')
};

const _MEX_RANK = {
  not_available: 0, blocked_by_eligibility: 1, blocked_real_path: 2, insufficient_synthetic_series: 3,
  segmentation_candidate: 4, windows_candidate: 5, steady_state_candidate: 6,
  tendency_proxy_candidate: 7, extracted_synthetic: 8,
};

function _mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function _spread(a) { if (!a.length) return 0; let lo = a[0], hi = a[0]; for (const x of a) { if (!Number.isFinite(x)) return Infinity; if (x < lo) lo = x; if (x > hi) hi = x; } return hi - lo; }
function _slice(a, s, e) { return Array.isArray(a) ? a.slice(s, e) : []; }

/**
 * Run the synthetic measured-extraction harness.
 * @param {object} extractionEligibility Phase 3G-0A output (evaluateBmsExtractionEligibility)
 * @param {object} opts  { syntheticOnly: true,
 *                         syntheticCanonicalSeries | measuredSeriesFixture: { timeIndex, speed,
 *                            steering, lateral_accel, yaw_rate, brake?, throttle?,
 *                            longitudinal_accel?, segmentHints?: [{cornerId,startIdx,endIdx}] },
 *                         extractionProfile?: profileKey | { requiredChannels:[...] } }
 */
function evaluateBmsMeasuredExtraction(extractionEligibility, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  // ── two hard gates ──
  const eligible = !!(extractionEligibility && extractionEligibility.status === 'eligible_for_extraction'
    && extractionEligibility.capabilities && extractionEligibility.capabilities.extractionEligible === true);
  const syntheticOnly = opts.syntheticOnly === true;
  const series = opts.syntheticCanonicalSeries || opts.measuredSeriesFixture || null;

  const profileKey = (typeof opts.extractionProfile === 'string' && _MEX_PROFILES[opts.extractionProfile]) ? opts.extractionProfile : 'handlingResponseExtraction';
  const requiredChannels = (opts.extractionProfile && Array.isArray(opts.extractionProfile.requiredChannels))
    ? opts.extractionProfile.requiredChannels : _MEX_PROFILES[profileKey];

  // A valid series must carry the core handling channels as long-enough arrays, REGARDLESS of the
  // supplied profile — so a degenerate profile (e.g. requiredChannels:[]) can never vacuously pass the
  // gate and let the harness read an undefined channel (would otherwise throw on series.lateral_accel).
  const coreChannels = ['speed', 'steering', 'lateral_accel', 'yaw_rate'];
  const seriesChannelOk = k => Array.isArray(series && series[k]) && series[k].length >= _MEX.MIN_SAMPLES;
  const validSeries = !!(series && requiredChannels.length > 0
    && coreChannels.every(seriesChannelOk) && requiredChannels.every(seriesChannelOk));

  // harness outputs (all empty unless the synthetic harness actually runs)
  let cornerSegments = [];
  let entryWindowCount = 0, midWindowCount = 0, exitWindowCount = 0, steadyStateWindowCount = 0;
  let measuredTendencyProxy = null;
  let tendencyProxyCount = 0;
  let confidence = 'none';
  let harnessRan = false;

  let status;
  if (!extractionEligibility) status = 'not_available';
  else if (!eligible) status = 'blocked_by_eligibility';
  else if (!syntheticOnly) status = 'blocked_real_path';   // eligible but not flagged synthetic → real path is blocked
  else if (!validSeries) status = 'insufficient_synthetic_series';
  else {
    // ── synthetic harness (eligible + syntheticOnly + a valid synthetic series) ──
    harnessRan = true;
    const latg = series.lateral_accel, steer = series.steering, speed = series.speed;
    const n = latg.length;

    // 1) corner segmentation — explicit synthetic hints, else |lateral_accel| over threshold
    if (Array.isArray(series.segmentHints) && series.segmentHints.length) {
      cornerSegments = series.segmentHints
        .filter(h => Number.isFinite(h.startIdx) && Number.isFinite(h.endIdx) && h.startIdx >= 0 && h.endIdx <= n && h.endIdx > h.startIdx)
        .map((h, i) => ({ cornerId: h.cornerId != null ? h.cornerId : (i + 1), startIdx: h.startIdx, endIdx: h.endIdx, sampleCount: h.endIdx - h.startIdx }));
    } else {
      let cid = 0, runStart = -1;
      for (let i = 0; i < n; i++) {
        const inCorner = Math.abs(latg[i]) >= _MEX.CORNER_LATG_THRESHOLD;
        if (inCorner && runStart < 0) runStart = i;
        if ((!inCorner || i === n - 1) && runStart >= 0) {
          const end = inCorner ? i + 1 : i;
          if (end - runStart >= _MEX.MIN_CORNER_SAMPLES) cornerSegments.push({ cornerId: ++cid, startIdx: runStart, endIdx: end, sampleCount: end - runStart });
          runStart = -1;
        }
      }
    }
    const cornerCount = cornerSegments.length;

    // 2) entry / mid / exit windows — thirds of each synthetic corner
    for (const c of cornerSegments) {
      const len = c.endIdx - c.startIdx;
      const third = Math.max(1, Math.floor(len / 3));
      c.entry = { startIdx: c.startIdx, endIdx: c.startIdx + third };
      c.mid = { startIdx: c.startIdx + third, endIdx: c.endIdx - third };
      c.exit = { startIdx: Math.max(c.startIdx + third, c.endIdx - third), endIdx: c.endIdx };
      if (c.entry.endIdx > c.entry.startIdx) entryWindowCount++;
      if (c.mid.endIdx > c.mid.startIdx) midWindowCount++;
      if (c.exit.endIdx > c.exit.startIdx) exitWindowCount++;
    }

    // 3) steady-state filter — stable speed + lateral_accel buckets over the mid window
    const steadyWindows = [];
    for (const c of cornerSegments) {
      const m = c.mid; if (!(m.endIdx > m.startIdx)) continue;
      const sp = _slice(speed, m.startIdx, m.endIdx), lg = _slice(latg, m.startIdx, m.endIdx);
      const ok = sp.length >= _MEX.MIN_STEADY_SAMPLES && _spread(sp) <= _MEX.STEADY_SPEED_BUCKET && _spread(lg) <= _MEX.STEADY_LATG_BUCKET;
      c.steadyState = ok;
      if (ok) { steadyStateWindowCount++; steadyWindows.push(c); }
    }

    // 4) measured-tendency PROXY (synthetic, steady-state windows only) — explicitly NOT a Kus
    if (steadyWindows.length) {
      const perWindow = steadyWindows.map(c => {
        const st = _slice(steer, c.mid.startIdx, c.mid.endIdx).map(Math.abs);
        const lg = _slice(latg, c.mid.startIdx, c.mid.endIdx).map(Math.abs);
        const mlg = _mean(lg);
        const ratio = mlg > 1e-6 ? _mean(st) / mlg : Infinity;
        let label;
        if (!Number.isFinite(ratio)) label = 'insufficient_quality';
        else if (ratio > _MEX.NEUTRAL_RATIO * (1 + _MEX.PROXY_BAND)) label = 'understeer_like_proxy';
        else if (ratio < _MEX.NEUTRAL_RATIO * (1 - _MEX.PROXY_BAND)) label = 'oversteer_like_proxy';
        else label = 'neutral_like_proxy';
        return { cornerId: c.cornerId, label, samples: st.length };
      });
      const usable = perWindow.filter(w => w.label !== 'insufficient_quality');
      tendencyProxyCount = usable.length;
      const totalSteadySamples = steadyWindows.reduce((s, c) => s + (c.mid.endIdx - c.mid.startIdx), 0);
      confidence = totalSteadySamples >= _MEX.STEADY_SAMPLES_MEDIUM ? 'medium' : 'low';
      // aggregate label — majority of usable per-window proxies, else insufficient_quality
      let aggLabel = 'insufficient_quality';
      if (usable.length) {
        const tally = {}; usable.forEach(w => { tally[w.label] = (tally[w.label] || 0) + 1; });
        aggLabel = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
      }
      measuredTendencyProxy = {
        status: usable.length ? 'available' : 'insufficient_quality',
        label: aggLabel,
        confidence,
        basis: ['steering_vs_lateral_g', 'yaw_response'],
        perWindow,
        blockers: usable.length ? [] : ['no steady-state window produced a usable proxy'],
        syntheticOnly: true, notKus: true, notSetupAdvice: true, notModelVsActual: true,
      };
    }

    // status ladder (synthetic; nearest-to-complete first)
    const extractedAll = cornerCount > 0 && entryWindowCount > 0 && midWindowCount > 0 && exitWindowCount > 0
      && steadyStateWindowCount > 0 && tendencyProxyCount > 0;
    if (extractedAll) status = 'extracted_synthetic';
    else if (tendencyProxyCount > 0) status = 'tendency_proxy_candidate';
    else if (steadyStateWindowCount > 0) status = 'steady_state_candidate';
    else if (entryWindowCount > 0) status = 'windows_candidate';
    else if (cornerCount > 0) status = 'segmentation_candidate';
    else status = 'insufficient_synthetic_series';
  }

  const cornerCount = cornerSegments.length;
  const extractedCornerCount = cornerSegments.filter(c => c.steadyState).length;
  const extractedSynthetic = status === 'extracted_synthetic';

  const blockers = [];
  if (!extractionEligibility) blockers.push('no extraction-eligibility result supplied');
  else if (!eligible) blockers.push('extraction eligibility gate not passed (eligible_for_extraction required)');
  else if (!syntheticOnly) blockers.push('real/imported path is blocked — this harness runs on synthetic canonical series only');
  else if (!validSeries) blockers.push('synthetic canonical series is missing or too short');
  else if (cornerCount === 0) blockers.push('no synthetic corner segmented from the series');
  else if (steadyStateWindowCount === 0) blockers.push('no steady-state window in the synthetic corners');
  else if (tendencyProxyCount === 0) blockers.push('no usable synthetic tendency proxy');

  const warnings = [];
  if (extractedSynthetic) warnings.push('synthetic harness only — this is a measured-extraction harness, not a real analysis result; the tendency is a synthetic proxy, not a Kus / model-vs-actual / setup recommendation');

  const aggregateDecision = {
    canExtractSynthetic: extractedSynthetic,
    extractedCount: extractedSynthetic ? 1 : 0,
    candidateCount: (_MEX_RANK[status] >= _MEX_RANK.segmentation_candidate && !extractedSynthetic) ? 1 : 0,
    reason: extractedSynthetic
      ? 'synthetic canonical series ran the full extraction harness (segmentation → entry/mid/exit → steady-state → tendency proxy) — SYNTHETIC ONLY; not a real measured handling response, not a Kus / model-vs-actual / setup'
      : 'no synthetic measured extraction produced — this is a harness gated on eligibility + a synthetic series; real/imported data is never extracted',
  };

  const confirmationFeed = { measuredExtractionSynthetic: extractedSynthetic, extractionLevel: status };

  // ── capabilities (real extraction / analysis / overlay / Kus / model-vs-actual pinned false everywhere) ──
  const capabilities = {
    measuredExtractionHarness: true,
    measuredExtractionSynthetic: extractedSynthetic,  // synthetic-only true; real path always false
    measuredExtraction: false,    // real measured extraction is never produced by this harness
    measuredHandlingResponse: false, handlingAnalysis: false, canonicalTelemetry: false,
    overlayEnabled: false, kus: false, handlingCorrelation: false, setupRecommendation: false,
    modelVsActual: false, timeSeries: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_MEXT_RUN', 'telemetry.measext.info.run', 'high'));
  if (status === 'not_available') diagnostics.push(D('warning', 'BMS_MEXT_NOT_AVAILABLE', 'telemetry.measext.warning.notAvailable'));
  if (status === 'blocked_by_eligibility') diagnostics.push(D('warning', 'BMS_MEXT_BLOCKED_ELIGIBILITY', 'telemetry.measext.warning.blockedByEligibility'));
  if (status === 'blocked_real_path') diagnostics.push(D('warning', 'BMS_MEXT_BLOCKED_REAL_PATH', 'telemetry.measext.warning.blockedRealPath'));
  if (status === 'insufficient_synthetic_series') diagnostics.push(D('warning', 'BMS_MEXT_INSUFFICIENT_SERIES', 'telemetry.measext.warning.insufficientSyntheticSeries'));
  diagnostics.push(D('warning', 'BMS_MEXT_SYNTHETIC_ONLY', 'telemetry.measext.warning.syntheticHarnessOnly'));
  diagnostics.push(D('warning', 'BMS_MEXT_NO_REAL_RESPONSE', 'telemetry.measext.warning.noMeasuredResponse'));
  diagnostics.push(D('warning', 'BMS_MEXT_PROXY_NOT_KUS', 'telemetry.measext.warning.proxyNotKus'));
  if (extractedSynthetic) diagnostics.push(D('info', 'BMS_MEXT_EXTRACTED_SYNTHETIC', 'telemetry.measext.info.extractedSynthetic', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'measured_extraction_harness', status,
    reason: aggregateDecision.reason,
    extractionLevel: status,
    evidenceLevel: status,
    syntheticOnly: harnessRan,     // true only when the synthetic harness actually ran
    realDataUsed: false,           // the harness only ever touches the synthetic fixture
    extractionProfile: profileKey,
    cornerCount,
    extractedCornerCount,
    entryWindowCount, midWindowCount, exitWindowCount,
    steadyStateWindowCount,
    tendencyProxyCount,
    confidence,
    cornerSegments,                // synthetic indices only; empty on every non-synthetic path
    measuredTendencyProxy,         // null on every non-synthetic path
    blockers, warnings,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      extractedSynthetic
        ? 'synthetic measured-extraction harness ran (synthetic only) — this is NOT a real measured handling response; no overlay / Kus / model-vs-actual / setup is produced'
        : 'no measured extraction produced (harness gated on eligibility + a synthetic series; real data is never extracted)',
      'no real measured handling response',
      'tendency is a synthetic proxy — not a Kus, not model-vs-actual, not setup advice',
      'no overlay / handling analysis / setup recommendation',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsMeasuredExtraction };
}
