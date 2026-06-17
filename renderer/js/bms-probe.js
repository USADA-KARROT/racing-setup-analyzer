/**
 * bms-probe.js — clean-room .bmsbin binary sample-block PROBE (Phase 3B-0)
 *
 * This is a PROBE, not a decoder. It inspects the bytes of a Bosch/Darab .bmsbin and
 * reports *evidence* of where sample/time-series data might live and how it might be
 * encoded — as candidates with confidence levels — WITHOUT decoding any physical value.
 *
 * It never asserts decoded telemetry. No scale/offset, no units, no physics, no overlay.
 * Output flows back into the source-agnostic telemetry descriptor (telemetry-metadata.js);
 * `.bmsbin` is an adapter, not the system core.
 *
 * Clean-room: works on bytes the user supplies at runtime; no proprietary code/schema and
 * no real .bmsbin is bundled. Tests use synthetic fixtures only.
 */

// ── low-level byte stats ───────────────────────────────────────────────────
function _entropy(bytes, start, end) {
  const hist = new Array(256).fill(0);
  let n = 0;
  for (let i = start; i < end; i++) { hist[bytes[i]]++; n++; }
  if (!n) return 0;
  let h = 0;
  for (let v = 0; v < 256; v++) { if (hist[v]) { const p = hist[v] / n; h -= p * Math.log2(p); } }
  return h;
}

/** int16le "smoothness": 1 − median|Δ|/range. High = sensor-like (smooth), low = noise. */
function _int16Smoothness(bytes, start, end) {
  const m = Math.floor((end - start) / 2);
  if (m < 8) return 0;
  const vals = new Array(m);
  for (let k = 0; k < m; k++) { let v = bytes[start + 2 * k] | (bytes[start + 2 * k + 1] << 8); if (v & 0x8000) v -= 0x10000; vals[k] = v; }
  let mn = Infinity, mx = -Infinity;
  for (const v of vals) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const range = mx - mn;
  if (range <= 0) return 0;
  const d = [];
  for (let k = 1; k < m; k++) d.push(Math.abs(vals[k] - vals[k - 1]));
  d.sort((a, b) => a - b);
  const med = d[Math.floor(d.length / 2)] || 0;
  return +Math.max(0, Math.min(1, 1 - med / range)).toFixed(3);
}

/** float32le sanity: fraction finite and in a non-absurd magnitude band (binary check only). */
function _float32SaneRatio(dv, start, end, byteLen) {
  const m = Math.floor((end - start) / 4);
  if (m < 4) return 0;
  let sane = 0, n = 0;
  for (let k = 0; k < m; k++) {
    const off = start + 4 * k;
    if (off + 4 > byteLen) break;
    const v = dv.getFloat32(off, true); n++;
    if (Number.isFinite(v) && Math.abs(v) < 1e6 && (v === 0 || Math.abs(v) > 1e-6)) sane++;
  }
  return n ? +(sane / n).toFixed(3) : 0;
}

function _windowStats(bytes, dv, start, end, byteLen) {
  let printable = 0, zero = 0, n = 0;
  for (let i = start; i < end; i++) { const b = bytes[i]; n++; if (b === 0) zero++; if (b >= 0x20 && b < 0x7e) printable++; }
  return {
    start, end, length: end - start,
    printableRatio: n ? +(printable / n).toFixed(3) : 0,
    zeroRatio: n ? +(zero / n).toFixed(3) : 0,
    entropy: +_entropy(bytes, start, end).toFixed(2),
    int16Smoothness: _int16Smoothness(bytes, start, end),
    float32SaneRatio: _float32SaneRatio(dv, start, end, byteLen),
  };
}

// ── catalog end (where printable [len][str]/TrackInfo tokens stop) ──────────
function _catalogScan(bytes, maxScan) {
  const n = Math.min(bytes.length, maxScan);
  let lastTokenEnd = 0, lastTrackInfoEnd = 0, tokenCount = 0, trackInfoCount = 0;
  for (let i = 0; i + 2 < n;) {
    const len = bytes[i] | (bytes[i + 1] << 8);
    if (len >= 2 && len <= 128 && i + 2 + len <= n && bytes[i + 2 + len - 1] === 0) {
      let ok = true, str = '';
      for (let j = 0; j < len - 1; j++) { const c = bytes[i + 2 + j]; if (c < 0x20 || c > 0x7e) { ok = false; break; } str += String.fromCharCode(c); }
      if (ok && str.length >= 2) {
        lastTokenEnd = i + 2 + len; tokenCount++;
        if (str === 'TrackInfo') { lastTrackInfoEnd = i + 2 + len; trackInfoCount++; }
        i += 2 + len; continue;
      }
    }
    i++;
  }
  return { lastTokenEnd, lastTrackInfoEnd, tokenCount, trackInfoCount };
}

// ── repeating-stride autocorrelation (possible record size) ────────────────
function _strideCandidates(bytes, start, end) {
  const out = [];
  const len = end - start;
  if (len < 128) return out;
  const sample = Math.min(len, 8192);
  for (const k of [2, 4, 8, 16, 32]) {
    let match = 0, tot = 0;
    for (let i = start; i + k < start + sample; i++) { if (bytes[i] === bytes[i + k]) match++; tot++; }
    if (tot && match / tot > 0.15) out.push(k);
  }
  return out;
}

// ── monotonic uint32 counter (candidate timebase) ──────────────────────────
function _timebaseClues(dv, start, end, byteLen) {
  const clues = [];
  const m = Math.floor((end - start) / 4);
  if (m < 8 || start + 4 > byteLen) return clues;
  let bestRun = 0, bestStartIdx = 0, bestDeltas = null, curRun = 1, curStartIdx = 0, curDeltas = [];
  let prev = dv.getUint32(start, true);
  for (let k = 1; k < m; k++) {
    if (start + 4 * k + 4 > byteLen) break;
    const v = dv.getUint32(start + 4 * k, true);
    const d = v - prev;
    if (d > 0 && d < 1e7) { curRun++; curDeltas.push(d); }
    else { if (curRun > bestRun) { bestRun = curRun; bestStartIdx = curStartIdx; bestDeltas = curDeltas; } curStartIdx = k; curRun = 1; curDeltas = []; }
    prev = v;
  }
  if (curRun > bestRun) { bestRun = curRun; bestStartIdx = curStartIdx; bestDeltas = curDeltas; }
  if (bestRun >= 8 && bestDeltas && bestDeltas.length) {
    bestDeltas.sort((a, b) => a - b);
    clues.push({
      type: 'monotonic_counter_candidate',
      offset: start + 4 * bestStartIdx, stride: 4,
      runLength: bestRun, medianDelta: bestDeltas[Math.floor(bestDeltas.length / 2)],
      confidence: bestRun > 64 ? 'medium' : 'low', notes: [],
    });
  }
  return clues;
}

const _PROBE_UNKNOWNS = [
  'sample block layout not confirmed',
  'physical scaling not decoded',
  'timebase not confirmed',
  'channel-to-region mapping unknown',
];

/**
 * Probe a .bmsbin byte array. Returns a probe REPORT (candidates + confidence), never
 * decoded telemetry.
 * @param {Uint8Array} bytes
 * @param {object} opts  { scanWindowBytes }
 */
function probeBmsBinary(bytes, opts = {}) {
  const scanCap = opts.scanWindowBytes || 4 * 1024 * 1024;
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  const report = {
    sourceType: 'bmsbin', probeVersion: '3B-0', status: 'probe_only',
    fileSize: bytes ? bytes.length : 0, scanWindowBytes: 0,
    header: { importer: null, valid: false },
    catalog: { channelCount: 0, trackInfoCount: 0, catalogEndOffsetCandidates: [] },
    candidateRegions: [], candidateEncodings: {}, candidateStructures: [],
    timebaseClues: [], diagnostics: [], unknowns: _PROBE_UNKNOWNS.slice(),
  };

  // ── error gates ──
  if (!bytes || !bytes.length) { report.diagnostics.push(D('error', 'BMS_PROBE_EMPTY_FILE', 'telemetry.probe.error.empty')); return report; }
  if (bytes.length < 64) { report.diagnostics.push(D('error', 'BMS_PROBE_TOO_SMALL', 'telemetry.probe.error.tooSmall')); return report; }
  const header = (typeof parseBmsHeader === 'function') ? parseBmsHeader(bytes) : { importer: null, valid: /Darab/i.test(String.fromCharCode.apply(null, Array.from(bytes.slice(0, 20)))) };
  report.header = header;
  if (!header.valid) { report.diagnostics.push(D('error', 'BMS_PROBE_INVALID_HEADER', 'telemetry.probe.error.invalidHeader')); return report; }

  const maxScan = Math.min(bytes.length, scanCap);
  const cat = _catalogScan(bytes, maxScan);
  const channels = (typeof parseBmsCatalog === 'function') ? parseBmsCatalog(bytes, maxScan) : [];
  report.catalog.channelCount = channels.length;
  report.catalog.trackInfoCount = cat.trackInfoCount;
  if (cat.lastTrackInfoEnd) report.catalog.catalogEndOffsetCandidates.push({ offset: cat.lastTrackInfoEnd, reason: 'last TrackInfo group end', confidence: 'medium' });
  if (cat.lastTokenEnd && cat.lastTokenEnd !== cat.lastTrackInfoEnd) report.catalog.catalogEndOffsetCandidates.push({ offset: cat.lastTokenEnd, reason: 'last catalog token end', confidence: 'medium' });

  if (!channels.length) { report.diagnostics.push(D('error', 'BMS_PROBE_NO_CATALOG', 'telemetry.probe.error.noCatalog')); return report; }
  report.diagnostics.push(D('info', 'BMS_PROBE_CATALOG_REGION_FOUND', 'telemetry.probe.info.catalogFound', 'high'));

  // ── scan the binary-heavy region after the catalog ──
  const dv = new DataView(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength != null ? bytes.byteLength : bytes.length);
  const byteLen = bytes.length;
  const scanStart = cat.lastTokenEnd || 0;
  const scanEnd = Math.min(byteLen, scanStart + scanCap);
  report.scanWindowBytes = Math.max(0, scanEnd - scanStart);

  const regionLen = scanEnd - scanStart;
  const winSize = Math.max(64, Math.min(1024, Math.floor(regionLen / 2) || 64));
  const flagged = [];
  for (let s = scanStart; s < scanEnd; s += winSize) {
    const e = Math.min(scanEnd, s + winSize);
    if (e - s < 32) break;
    const w = _windowStats(bytes, dv, s, e, byteLen);
    // "sample-like": not text, not all-zero, and plausibly numeric
    const numeric = w.printableRatio < 0.5 && w.zeroRatio < 0.9 && w.entropy >= 2.0 &&
      (w.int16Smoothness >= 0.5 || w.float32SaneRatio >= 0.5);
    flagged.push({ w, numeric });
  }
  // merge contiguous numeric windows into regions
  let cur = null;
  for (const f of flagged) {
    if (f.numeric) {
      if (!cur) cur = { start: f.w.start, end: f.w.end, ws: [f.w] };
      else { cur.end = f.w.end; cur.ws.push(f.w); }
    } else if (cur) { report.candidateRegions.push(_finishRegion(cur)); cur = null; }
  }
  if (cur) report.candidateRegions.push(_finishRegion(cur));

  if (report.candidateRegions.length) {
    report.diagnostics.push(D('info', 'BMS_PROBE_BINARY_REGION_FOUND', 'telemetry.probe.info.binaryRegionFound',
      report.candidateRegions.some(r => r.confidence === 'high') ? 'high' : 'medium'));
  } else {
    report.diagnostics.push(D('warning', 'BMS_PROBE_NO_SAMPLE_REGION_FOUND', 'telemetry.probe.warning.noSampleRegion'));
  }

  // ── encoding plausibility + structure + timebase over the largest candidate region ──
  const best = report.candidateRegions.slice().sort((a, b) => b.length - a.length)[0];
  if (best) {
    const sm = best.evidence.int16Smoothness, f32 = best.evidence.float32SaneRatio;
    const conf = (x, hi, mid) => x >= hi ? 'high' : (x >= mid ? 'medium' : 'low');
    report.candidateEncodings = {
      int16le: { plausible: sm >= 0.6, confidence: conf(sm, 0.8, 0.6), notes: [] },
      uint16le: { plausible: sm >= 0.6, confidence: conf(sm, 0.8, 0.6), notes: ['shares smoothness signal with int16le'] },
      int32le: { plausible: false, confidence: 'low', notes: ['not assessed in 3B-0'] },
      float32le: { plausible: f32 >= 0.7, confidence: conf(f32, 0.9, 0.7), notes: [] },
    };
    if (report.candidateEncodings.int16le.plausible || report.candidateEncodings.float32le.plausible) {
      report.diagnostics.push(D('info', 'BMS_PROBE_ENCODING_CANDIDATE', 'telemetry.probe.info.encodingCandidate'));
    }
    const strides = _strideCandidates(bytes, best.start, best.end);
    if (strides.length) report.candidateStructures.push({ type: 'unknown', confidence: 'low', evidence: ['repeating byte stride candidate(s): ' + strides.join(', ')] });
  }
  // Timebase scan runs over the WHOLE post-catalog region (a monotonic counter is not
  // "smooth" and so won't be flagged as a sample region, but is still a valid clue).
  report.timebaseClues = _timebaseClues(dv, scanStart, scanEnd, byteLen);
  if (!report.timebaseClues.length) report.diagnostics.push(D('warning', 'BMS_PROBE_TIMEBASE_NOT_CONFIRMED', 'telemetry.probe.warning.timebaseNotConfirmed'));

  // ── standing honesty warnings + low-confidence flag ──
  report.diagnostics.push(D('warning', 'BMS_PROBE_TIMESERIES_NOT_CONFIRMED', 'telemetry.probe.warning.timeSeriesNotConfirmed'));
  report.diagnostics.push(D('warning', 'BMS_PROBE_SCALING_NOT_DECODED', 'telemetry.probe.warning.scalingNotDecoded'));
  const anyStrong = report.candidateRegions.some(r => r.confidence !== 'low');
  if (!anyStrong) report.diagnostics.push(D('warning', 'BMS_PROBE_LOW_CONFIDENCE', 'telemetry.probe.warning.lowConfidence'));
  report.diagnostics.push(D('info', 'BMS_PROBE_ONLY', 'telemetry.probe.info.probeOnly', 'high'));
  return report;
}

/** Aggregate a merged region's windows into a candidate region + confidence. */
function _finishRegion(cur) {
  const ws = cur.ws;
  const avg = (sel) => +(ws.reduce((a, w) => a + sel(w), 0) / ws.length).toFixed(3);
  const numericDensity = +(1 - avg(w => w.printableRatio)).toFixed(3);
  const int16Smoothness = avg(w => w.int16Smoothness);
  const float32SaneRatio = avg(w => w.float32SaneRatio);
  const entropy = avg(w => w.entropy);
  const strength = Math.max(int16Smoothness, float32SaneRatio);
  const confidence = (strength >= 0.8 && cur.end - cur.start >= 512) ? 'high' : (strength >= 0.6 ? 'medium' : 'low');
  return {
    start: cur.start, end: cur.end, length: cur.end - cur.start,
    reason: 'high_numeric_density_after_catalog', confidence,
    evidence: { numericDensity, zeroRatio: avg(w => w.zeroRatio), entropy, int16Smoothness, float32SaneRatio },
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { probeBmsBinary };
}
