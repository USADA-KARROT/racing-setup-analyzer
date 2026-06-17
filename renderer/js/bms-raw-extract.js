/**
 * bms-raw-extract.js — .bmsbin RAW time-series candidate extraction (Phase 3B-1)
 *
 * Consumes a Phase 3B-0 probe report and, from its candidate regions, attempts to pull out
 * RAW sample-array candidates with statistics. It does NOT decode physical values, units,
 * or channel identity, and does NOT do model-vs-actual. Everything is a *candidate*.
 *
 * Red lines: raw values only; never name a series after a catalog channel (no `accy_values`)
 * — series are `rawSeriesCandidates` (candidate_00N); channelMapping stays `not_mapped`;
 * capabilities.timeSeries / physicalScaling / handlingCorrelation stay false.
 *
 * `.bmsbin` is an adapter — the result flows back into the source-agnostic descriptor.
 * Clean-room: synthetic fixtures only; no real .bmsbin and no proprietary code/schema.
 */

const _RAW_BPS = { int16le: 2, uint16le: 2, int32le: 4, uint32le: 4, float32le: 4 };
const _RAW_ENCODINGS = ['int16le', 'uint16le', 'int32le', 'uint32le', 'float32le'];

function _reader(dv, enc) {
  switch (enc) {
    case 'int16le': return (o) => dv.getInt16(o, true);
    case 'uint16le': return (o) => dv.getUint16(o, true);
    case 'int32le': return (o) => dv.getInt32(o, true);
    case 'uint32le': return (o) => dv.getUint32(o, true);
    case 'float32le': return (o) => dv.getFloat32(o, true);
    default: return () => 0;
  }
}

/** Read a series of `enc` samples from [start,end), stepping `stride` bytes from start+lane. */
function _readSeries(dv, byteLen, start, end, enc, stride, lane) {
  const bps = _RAW_BPS[enc];
  const get = _reader(dv, enc);
  const out = [];
  for (let off = start + (lane || 0); off + bps <= end && off + bps <= byteLen; off += stride) out.push(get(off));
  return out;
}

function _round(v) { return Number.isFinite(v) ? +v.toFixed(4) : v; }

/** Raw statistics over a numeric series — no physical units, just shape. */
function _seriesStats(vals, isFloat) {
  const n = vals.length;
  if (!n) return null;
  let mn = Infinity, mx = -Infinity, sum = 0, zero = 0, sane = 0;
  for (const v of vals) {
    if (v < mn) mn = v; if (v > mx) mx = v; sum += v;
    if (v === 0) zero++;
    if (Number.isFinite(v) && Math.abs(v) < 1e6 && (v === 0 || Math.abs(v) > 1e-6)) sane++;
  }
  const mean = sum / n;
  let sq = 0; for (const v of vals) sq += (v - mean) * (v - mean);
  const std = Math.sqrt(sq / n);
  const range = mx - mn;
  const d = [];
  for (let k = 1; k < n; k++) d.push(Math.abs(vals[k] - vals[k - 1]));
  d.sort((a, b) => a - b);
  const medD = d.length ? d[Math.floor(d.length / 2)] : 0;
  const continuity = range > 0 ? +(d.filter(x => x < 0.1 * range).length / Math.max(1, d.length)).toFixed(3) : 0;
  const smoothness = range > 0 ? +Math.max(0, Math.min(1, 1 - medD / range)).toFixed(3) : 0;
  return {
    count: n, min: _round(mn), max: _round(mx), mean: _round(mean), std: _round(std),
    zeroRatio: +(zero / n).toFixed(3), saneRatio: +(sane / n).toFixed(3),
    continuityScore: continuity, smoothnessScore: smoothness,
  };
}

/** Byte autocorrelation → best repeating stride (possible record size). */
function _strideAnalysis(bytes, start, end) {
  const len = end - start;
  if (len < 128) return null;
  const sample = Math.min(len, 8192);
  let best = null;
  for (const k of [2, 4, 8, 16, 32]) {
    let match = 0, tot = 0;
    for (let i = start; i + k < start + sample; i++) { if (bytes[i] === bytes[i + k]) match++; tot++; }
    const ac = tot ? match / tot : 0;
    if (ac > 0.15 && (!best || ac > best.autocorr)) best = { stride: k, autocorr: +ac.toFixed(3) };
  }
  return best;
}

function _attemptConfidence(enc, st) {
  if (!st) return 'low';
  if (enc === 'float32le') return st.saneRatio >= 0.9 ? 'high' : (st.saneRatio >= 0.7 ? 'medium' : 'low');
  const s = st.smoothnessScore;
  return s >= 0.8 ? 'high' : (s >= 0.6 ? 'medium' : 'low');
}

const _RANK = { low: 0, medium: 1, high: 2 };

/**
 * Extract raw series candidates from a probe report's candidate regions.
 * @param {Uint8Array} bytes
 * @param {object} probeReport  output of probeBmsBinary (Phase 3B-0)
 * @param {object} opts  { catalogChannelCount }
 */
function extractBmsRawCandidates(bytes, probeReport, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  const report = {
    sourceType: 'bmsbin', stage: 'raw_candidate_extraction', status: 'raw_candidates_only',
    basedOnProbe: { probeVersion: (probeReport && probeReport.probeVersion) || null, candidateRegionCount: 0, selectedRegionIndex: null },
    selectedRegions: [], extractionAttempts: [], rawSeriesCandidates: [],
    timebaseCandidate: { present: false, encoding: null, sampleCount: null, medianDelta: null, confidence: 'low', notes: [] },
    channelMapping: { status: 'not_mapped', reason: 'raw extraction does not establish channel identity' },
    capabilities: { channelCatalog: true, sampleProbe: false, rawTimeSeriesCandidates: false, timeSeries: false, physicalScaling: false, handlingCorrelation: false },
    diagnostics: [], unknowns: [],
  };

  if (!probeReport) { report.diagnostics.push(D('error', 'BMS_RAW_NO_PROBE_REPORT', 'telemetry.raw.error.noProbe')); return report; }
  report.capabilities.sampleProbe = Array.isArray(probeReport.candidateRegions);
  const regions = probeReport.candidateRegions || [];
  report.basedOnProbe.candidateRegionCount = regions.length;
  if (!regions.length) { report.diagnostics.push(D('error', 'BMS_RAW_NO_CANDIDATE_REGION', 'telemetry.raw.error.noRegion')); report.unknowns = ['no candidate sample region to extract from']; return report; }
  if (!bytes || !bytes.length) { report.diagnostics.push(D('error', 'BMS_RAW_EXTRACTION_FAILED', 'telemetry.raw.error.failed')); return report; }

  // select the strongest region (confidence, then size)
  let bestIdx = 0;
  regions.forEach((r, i) => {
    const a = regions[bestIdx];
    if (_RANK[r.confidence] > _RANK[a.confidence] || (_RANK[r.confidence] === _RANK[a.confidence] && (r.length || 0) > (a.length || 0))) bestIdx = i;
  });
  const region = regions[bestIdx];
  report.basedOnProbe.selectedRegionIndex = bestIdx;
  report.selectedRegions.push({ start: region.start, end: region.end, confidence: region.confidence, reason: 'best_numeric_density_candidate' });
  report.diagnostics.push(D('info', 'BMS_RAW_REGION_SELECTED', 'telemetry.raw.info.regionSelected', region.confidence));

  const dv = new DataView(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength != null ? bytes.byteLength : bytes.length);
  const byteLen = bytes.length;
  const strideInfo = _strideAnalysis(bytes, region.start, region.end);

  // try each encoding (raw stats only — no scaling, no units)
  for (const enc of _RAW_ENCODINGS) {
    const bps = _RAW_BPS[enc];
    const vals = _readSeries(dv, byteLen, region.start, region.end, enc, bps, 0);
    if (vals.length < 8) continue;
    const st = _seriesStats(vals, enc === 'float32le');
    const interleaved = !!(strideInfo && strideInfo.stride > bps && strideInfo.stride % bps === 0);
    const channels = interleaved ? strideInfo.stride / bps : 1;
    report.diagnostics.push(D('info', 'BMS_RAW_ENCODING_ATTEMPTED', 'telemetry.raw.info.encodingAttempted', 'low'));
    report.extractionAttempts.push({
      regionStart: region.start, regionEnd: region.end, encoding: enc,
      layoutHypothesis: interleaved ? 'interleaved' : 'single_series',
      stride: strideInfo ? strideInfo.stride : bps, sampleCount: vals.length,
      confidence: _attemptConfidence(enc, st),
      evidence: {
        continuityScore: st.continuityScore, smoothnessScore: st.smoothnessScore,
        repeatedPatternScore: strideInfo ? strideInfo.autocorr : 0,
        monotonicTimebaseMatch: false, plausibleSeriesCount: channels,
      },
    });
  }

  // best attempt → raw series candidates (single, or deinterleaved lanes)
  let best = null;
  for (const a of report.extractionAttempts) { if (!best || _RANK[a.confidence] > _RANK[best.confidence]) best = a; }
  if (best) {
    const bps = _RAW_BPS[best.encoding];
    const lanes = best.layoutHypothesis === 'interleaved' ? Math.min(best.evidence.plausibleSeriesCount, 8) : 1;
    const stride = best.layoutHypothesis === 'interleaved' ? best.stride : bps;
    for (let lane = 0; lane < lanes; lane++) {
      const vals = _readSeries(dv, byteLen, region.start, region.end, best.encoding, stride, lane * bps);
      if (vals.length < 8) continue;
      const st = _seriesStats(vals, best.encoding === 'float32le');
      report.rawSeriesCandidates.push({
        id: 'candidate_' + String(report.rawSeriesCandidates.length + 1).padStart(3, '0'),
        sourceRegion: { start: region.start, end: region.end },
        encoding: best.encoding, layoutHypothesis: best.layoutHypothesis,
        sampleCount: vals.length, samplePreview: vals.slice(0, 5),
        minRaw: st.min, maxRaw: st.max, meanRaw: st.mean,
        confidence: _attemptConfidence(best.encoding, st),
        notes: ['raw values only', 'not physically scaled', 'not mapped to canonical channel'],
      });
    }
    if (best.layoutHypothesis !== 'interleaved' || _RANK[best.confidence] < 1) {
      report.diagnostics.push(D('warning', 'BMS_RAW_LAYOUT_LOW_CONFIDENCE', 'telemetry.raw.warning.layoutLowConfidence'));
    }
  }

  // timebase relation (candidate only) from a 3B-0 monotonic-counter clue
  const clue = (probeReport.timebaseClues || [])[0];
  if (clue) {
    report.timebaseCandidate = {
      present: true, encoding: 'uint32le', sampleCount: clue.runLength != null ? clue.runLength : null,
      medianDelta: clue.medianDelta != null ? clue.medianDelta : null, confidence: clue.confidence || 'low',
      notes: ['candidate only', 'not a confirmed timestamp'],
    };
    report.diagnostics.push(D('info', 'BMS_RAW_TIMEBASE_CANDIDATE_LINKED', 'telemetry.raw.info.timebaseLinked', 'low'));
  } else {
    report.diagnostics.push(D('warning', 'BMS_RAW_TIMEBASE_NOT_CONFIRMED', 'telemetry.raw.warning.timebaseNotConfirmed'));
  }

  // channel identity stays unconfirmed (red line). At most: counts coincide.
  if (best && opts.catalogChannelCount && best.evidence.plausibleSeriesCount === opts.catalogChannelCount) {
    report.channelMapping.status = 'candidate_channel_count_matches_catalog';
    report.channelMapping.reason = 'candidate channel count equals catalog channel count (a coincidence note, not a mapping)';
  }

  report.capabilities.rawTimeSeriesCandidates = report.rawSeriesCandidates.length > 0;
  if (report.rawSeriesCandidates.length) report.diagnostics.push(D('info', 'BMS_RAW_SERIES_CANDIDATES_FOUND', 'telemetry.raw.info.seriesFound'));
  // standing honesty warnings
  report.diagnostics.push(D('warning', 'BMS_RAW_CANDIDATES_ONLY', 'telemetry.raw.warning.candidatesOnly'));
  report.diagnostics.push(D('warning', 'BMS_RAW_CHANNELS_NOT_MAPPED', 'telemetry.raw.warning.channelsNotMapped'));
  report.diagnostics.push(D('warning', 'BMS_RAW_SCALING_NOT_DECODED', 'telemetry.raw.warning.scalingNotDecoded'));
  report.unknowns = ['channel identity unknown', 'timebase unconfirmed', 'physical scaling not decoded', 'sample layout is a hypothesis'];
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { extractBmsRawCandidates };
}
