/**
 * bms-structure-discovery.js — .bmsbin sample-STRUCTURE discovery (Phase 3D-1)
 *
 * The reality check (Phase 3C-1) showed the weakest link on real data is sample STRUCTURE:
 * catalog is confirmable, but 85 catalog channels currently surface only 1–2 raw series
 * candidates. This module looks deeper at the bytes for STRUCTURE evidence — per-channel
 * blocks, an offset / index / sample-count table, an interleaved layout, or a compressed /
 * sparse region — and reports them as HYPOTHESES with confidence. It tries to explain WHY so
 * few raw series are seen versus the catalog count.
 *
 * It is a discovery layer, NOT a decoder. Red lines (always held):
 *   - structure hypotheses only — never decoded telemetry, never physical values/units
 *   - never names a raw offset/lane after a catalog channel (no `accy` series)
 *   - `convergence.sampleStructureConverged` stays false (3D-1 never confirms structure)
 *   - capabilities.timeSeries / physicalScaling / handlingCorrelation stay false
 *   - a found 85-block / 85-entry-table pattern is a HYPOTHESIS, handed to the 3D-0
 *     confirmation criteria — it is NOT confirmed here, and never on real data without a
 *     cross-file corpus.
 *
 * `.bmsbin` is an adapter — the output flows back to the source-agnostic descriptor.
 * Clean-room: synthetic fixtures only; no real .bmsbin and no proprietary code/schema.
 */

// ── shape helpers (no physical meaning — structure only) ────────────────────
/**
 * Stats for one strided lane (a candidate interleaved channel column):
 *   smoothness  — 1 − median|Δ|/range. High = sensor-like (smoothly varying).
 *   activeRatio — fraction of consecutive samples that actually change. Guards against a
 *                 zero-/constant-padded lane reading as "smooth" (median Δ = 0 ⇒ smoothness 1).
 */
function _laneStats(dv, byteLen, start, end, stride, width) {
  const vals = [];
  const read = width === 4 ? (o) => dv.getInt32(o, true) : (o) => dv.getInt16(o, true);
  for (let off = start; off + width <= end && off + width <= byteLen; off += stride) vals.push(read(off));
  const n = vals.length;
  if (n < 8) return { smoothness: 0, activeRatio: 0 };
  let mn = Infinity, mx = -Infinity;
  for (const v of vals) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const range = mx - mn;
  if (range <= 0) return { smoothness: 0, activeRatio: 0 };
  const d = [];
  let active = 0;
  for (let k = 1; k < n; k++) { const delta = Math.abs(vals[k] - vals[k - 1]); d.push(delta); if (delta > 0) active++; }
  d.sort((a, b) => a - b);
  const med = d[Math.floor(d.length / 2)] || 0;
  return {
    smoothness: +Math.max(0, Math.min(1, 1 - med / range)).toFixed(3),
    activeRatio: +(active / d.length).toFixed(3),
  };
}

/** Shannon entropy (bits/byte) over a sampled window — high ⇒ random / compressed-like. */
function _entropy(bytes, start, end, cap) {
  const hist = new Array(256).fill(0);
  let n = 0;
  const stop = Math.min(end, start + (cap || (end - start)));
  for (let i = start; i < stop; i++) { hist[bytes[i]]++; n++; }
  if (!n) return 0;
  let h = 0;
  for (let v = 0; v < 256; v++) { if (hist[v]) { const p = hist[v] / n; h -= p * Math.log2(p); } }
  return +h.toFixed(2);
}

/** Relate a discovered entry/block count to the catalog channel count. */
function _relationToCatalog(count, catalogCount) {
  if (!catalogCount || catalogCount <= 0 || !count) return 'unknown';
  if (count === catalogCount) return 'matches';
  if (Math.abs(count - catalogCount) <= Math.max(2, 0.1 * catalogCount)) return 'near';
  return 'mismatch';
}

// ── fixed-width integer table scan (offset / sample-count / channel-index) ──
/**
 * Scan [winStart, winStart+cap) for the longest run of fixed-width LE integers under three
 * relations: monotonic-increasing (offset/pointer), near-constant (sample-count), and
 * sequential (channel-index). Returns candidate table descriptors — NEVER asserts that the
 * offsets are verified sample-block starts (that is a later phase).
 */
// A run must be at least this long to be a table candidate. 16 (not 8) sharply cuts chance
// strictly-increasing runs in random data (P(run≥16) ≈ 0) while a real per-channel table
// (one entry per channel ⇒ tens of entries) still passes.
const _MIN_TABLE_RUN = 16;

function _scanTables(dv, byteLen, winStart, winEnd, catalogCount) {
  const out = [];
  const cap = Math.min(winEnd, winStart + 64 * 1024);
  for (const width of [4, 2]) {
    const read = width === 4 ? (o) => dv.getUint32(o, true) : (o) => dv.getUint16(o, true);
    for (let a = 0; a < width; a++) {
      const base = winStart + a;
      const m = Math.floor((cap - base) / width);
      if (m < _MIN_TABLE_RUN) continue;
      const e = new Array(m);
      for (let k = 0; k < m; k++) e[k] = read(base + k * width);

      // longest strictly-increasing run with a plausible byte-sized gap (offset/pointer table)
      let bestMono = { len: 0, startIdx: 0 };
      let curStart = 0;
      for (let k = 1; k <= m; k++) {
        const ok = k < m && e[k] > e[k - 1] && (e[k] - e[k - 1]) <= byteLen;
        if (ok) { if (k - curStart + 1 > bestMono.len) bestMono = { len: k - curStart + 1, startIdx: curStart }; }
        else curStart = k;
      }
      // longest near-constant run (sample-count / block-length table)
      let bestConst = { len: 0, startIdx: 0 };
      curStart = 0;
      for (let k = 1; k <= m; k++) {
        const anchor = e[curStart];
        const ok = k < m && anchor > 0 && Math.abs(e[k] - anchor) <= Math.max(1, 0.05 * anchor) && e[k] < byteLen;
        if (ok) { if (k - curStart + 1 > bestConst.len) bestConst = { len: k - curStart + 1, startIdx: curStart }; }
        else curStart = k;
      }
      // longest sequential run e[k] = e[k-1] + 1 (channel-index table)
      let bestSeq = { len: 0, startIdx: 0 };
      curStart = 0;
      for (let k = 1; k <= m; k++) {
        const ok = k < m && e[k] === e[k - 1] + 1;
        if (ok) { if (k - curStart + 1 > bestSeq.len) bestSeq = { len: k - curStart + 1, startIdx: curStart }; }
        else curStart = k;
      }

      if (bestMono.len >= _MIN_TABLE_RUN) {
        const s = bestMono.startIdx, len = bestMono.len;
        let allInRange = true, allUnitStep = true;
        for (let k = s; k < s + len; k++) {
          if (e[k] < 0 || e[k] >= byteLen) allInRange = false;
          if (k > s && e[k] - e[k - 1] !== 1) allUnitStep = false;
        }
        // A pure +1 run is a (0-based) channel-INDEX table, not a byte-offset/pointer table —
        // a real pointer table has block-sized gaps. Only the channel_index_table branch reports it.
        if (!allUnitStep) {
          out.push({
            kind: 'offset_table', encoding: width === 4 ? 'uint32le' : 'uint16le',
            entryCount: len, relationToCatalogCount: _relationToCatalog(len, catalogCount),
            targetsPlausible: allInRange, confidence: 'low',
            warnings: ['offset targets not yet verified as sample block starts'].concat(allInRange ? [] : ['some offsets fall outside the file — table is not a verified offset table']),
          });
        }
      }

      // near-constant table — distinct run from the monotonic one (dedup on position, not length:
      // a real count table and an offset table both have one entry per channel ⇒ equal lengths).
      if (bestConst.len >= _MIN_TABLE_RUN && bestConst.startIdx !== bestMono.startIdx) {
        out.push({
          kind: 'sample_count_table', encoding: width === 4 ? 'uint32le' : 'uint16le',
          entryCount: bestConst.len, relationToCatalogCount: _relationToCatalog(bestConst.len, catalogCount),
          targetsPlausible: false, confidence: 'low',
          warnings: ['near-constant run only; not verified as per-channel sample counts'],
        });
      }

      if (bestSeq.len >= _MIN_TABLE_RUN) {
        out.push({
          kind: 'channel_index_table', encoding: width === 4 ? 'uint32le' : 'uint16le',
          entryCount: bestSeq.len, relationToCatalogCount: _relationToCatalog(bestSeq.len, catalogCount),
          targetsPlausible: false, confidence: 'low',
          warnings: ['sequential index run only; not verified as a channel-index table'],
        });
      }
    }
  }
  return out;
}

// ── length-prefixed block walk (per-channel block hypothesis) ───────────────
/**
 * Walk [start, end) as repeated `[len][payload(len bytes)]` records, trying a uint16 and a
 * uint32 length header, searching every start offset in [start, start+256) for the LONGEST
 * run (the blocks may begin after a padding / header / count field, so the catalog-end
 * estimate is not necessarily byte-aligned to the first block). A run ≈ catalog count is a
 * per-channel block HYPOTHESIS, never a confirmation.
 */
function _blockWalk(dv, byteLen, start, end) {
  const maxBlock = 1 << 20; // 1 MiB sanity ceiling on a single block payload
  let best = { hdr: 0, count: 0, boundaries: [], firstStart: start };
  const s0Cap = Math.min(start + 256, end);
  for (const hdr of [2, 4]) {
    const readLen = hdr === 4 ? (o) => dv.getUint32(o, true) : (o) => dv.getUint16(o, true);
    // Keep the longest run over all candidate starts — do NOT stop at the first nonzero walk,
    // or a short coincidental walk from `start` would mask the real (misaligned) block run.
    for (let s0 = start; s0 < s0Cap; s0++) {
      let cur = s0, count = 0, minGap = Infinity, maxGap = -Infinity;
      const boundaries = [];
      while (cur + hdr <= end && cur + hdr <= byteLen) {
        const len = readLen(cur);
        if (len < 2 || len > maxBlock || cur + hdr + len > end) break;
        if (boundaries.length < 8) boundaries.push(cur);
        const gap = hdr + len;                          // block stride, tracked over the WHOLE run
        if (gap < minGap) minGap = gap; if (gap > maxGap) maxGap = gap;
        cur += gap; count++;
        if (count > 200000) break; // runaway guard
      }
      // full-run length consistency — covers every block, not just the first 8 boundaries
      const lengthConsistent = count >= 3 && maxGap > 0 && (maxGap - minGap) <= Math.max(1, 0.02 * maxGap);
      if (count > best.count) best = { hdr, count, boundaries, firstStart: s0, minGap, maxGap, lengthConsistent };
    }
  }
  return best;
}

/**
 * Discover sample-structure hypotheses for a parsed .bmsbin. Consumes the existing pipeline
 * reports (catalog / probe / raw / linking / confirmation). Output is hypotheses only.
 *
 * @param {Uint8Array} bytes
 * @param {object} bmsResult         parseBms output (header, channelCount, channels…)
 * @param {object} probeReport       probeBmsBinary output (Phase 3B-0)
 * @param {object} rawExtraction     extractBmsRawCandidates output (Phase 3B-1)
 * @param {object} linkingReport     linkBmsRawCandidates output (Phase 3C-0)
 * @param {object} confirmationReport evaluateBmsConfirmationEvidence output (Phase 3D-0)
 * @param {object} opts              { catalogChannelCount, scanWindowBytes }
 */
function discoverBmsSampleStructure(bytes, bmsResult, probeReport, rawExtraction, linkingReport, confirmationReport, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  const scanCap = opts.scanWindowBytes || 2 * 1024 * 1024;

  const channelCount = (bmsResult && bmsResult.channelCount)
    || ((bmsResult && bmsResult.channels) ? bmsResult.channels.length : 0)
    || (opts.catalogChannelCount || 0);
  const rawSeries = (rawExtraction && rawExtraction.rawSeriesCandidates) || [];
  const rawCount = rawSeries.length;
  const idHyps = (linkingReport && linkingReport.channelIdentityHypotheses) || [];
  const explicitChannelMappingFound = idHyps.some(h => h.confidence === 'high');
  const timebaseRelationCandidate = !!(rawExtraction && rawExtraction.timebaseCandidate && rawExtraction.timebaseCandidate.present)
    || !!(probeReport && (probeReport.timebaseClues || []).length > 0);

  const report = {
    sourceType: 'bmsbin', stage: 'sample_structure_discovery', status: 'structure_hypotheses_only',
    inputs: {
      channelCount, rawSeriesCandidateCount: rawCount,
      probeRegionCount: (probeReport && probeReport.candidateRegions) ? probeReport.candidateRegions.length : 0,
      scanWindowBytes: 0,
    },
    structureHypotheses: [],
    blockBoundaryCandidates: [],
    channelTableCandidates: [],
    perChannelEvidence: { expectedChannelCount: channelCount, candidateChannelBlocks: 0, countRelation: 'unknown' },
    convergence: { sampleStructureConverged: false, nextEvidenceNeeded: [] },
    confirmationFeed: {
      candidateRegionStable: false,            // a single file cannot prove cross-file stability
      rawSeriesCountMatchesCatalog: channelCount > 0 && rawCount > 0 && Math.abs(rawCount - channelCount) <= Math.max(1, 0.1 * channelCount),
      perChannelBlockCountCandidate: false,
      explicitChannelMappingFound,
      timebaseRelationCandidate,
    },
    capabilities: {
      channelCatalog: channelCount > 0,
      sampleProbe: !!(probeReport && probeReport.candidateRegions),
      rawTimeSeriesCandidates: rawCount > 0,
      sampleStructureDiscovery: true,
      timeSeries: false, physicalScaling: false, handlingCorrelation: false,
    },
    diagnostics: [], unknowns: [],
  };
  report.diagnostics.push(D('info', 'BMS_STRUCT_DISCOVERY_RUN', 'telemetry.struct.info.discoveryRun', 'high'));

  // ── no bytes to analyse → hypotheses-only, not converged ──
  if (!bytes || !bytes.length) {
    report.diagnostics.push(D('warning', 'BMS_STRUCT_HYPOTHESES_ONLY', 'telemetry.struct.warning.hypothesesOnly'));
    report.diagnostics.push(D('warning', 'BMS_STRUCT_NOT_CONVERGED', 'telemetry.struct.warning.notConverged'));
    report.convergence.nextEvidenceNeeded = ['post-catalog binary region to analyse'];
    report.structureHypotheses.push({ type: 'unknown', confidence: 'low', evidence: [], warnings: ['no bytes available'] });
    report.unknowns = ['no bytes to analyse'];
    return report;
  }

  const dv = new DataView(bytes.buffer, bytes.byteOffset || 0, bytes.byteLength != null ? bytes.byteLength : bytes.length);
  const byteLen = bytes.length;

  // catalog-end offsets → where the post-catalog data begins
  const catEnds = [];
  const cands = (probeReport && probeReport.catalog && probeReport.catalog.catalogEndOffsetCandidates) || [];
  for (const c of cands) if (c && Number.isFinite(c.offset)) catEnds.push(c.offset);
  if (!catEnds.length && rawSeries.length && rawSeries[0].sourceRegion && Number.isFinite(rawSeries[0].sourceRegion.start)) catEnds.push(rawSeries[0].sourceRegion.start);
  const mainStart = catEnds.length ? Math.max.apply(null, catEnds) : 0;
  const mainEnd = Math.min(byteLen, mainStart + scanCap);
  const regionLen = Math.max(0, mainEnd - mainStart);
  report.inputs.scanWindowBytes = regionLen;

  // ── 1. integer table scan (near catalog end + before each candidate region) ──
  const tableWindows = [];
  for (const o of catEnds) tableWindows.push(o);
  const probeRegions = (probeReport && probeReport.candidateRegions) || [];
  for (const r of probeRegions) { tableWindows.push(Math.max(0, r.start - 4 * 1024)); tableWindows.push(r.start); }
  const seenWin = new Set();
  for (const w of tableWindows) {
    if (w < 0 || w >= byteLen || seenWin.has(w)) continue;
    seenWin.add(w);
    const tables = _scanTables(dv, byteLen, w, byteLen, channelCount);
    for (const t of tables) report.channelTableCandidates.push(t);
  }
  // keep the strongest unique table candidates (a relation-to-catalog 'matches' ranks first)
  report.channelTableCandidates.sort((a, b) => (b.entryCount || 0) - (a.entryCount || 0));
  const offsetTable = report.channelTableCandidates.find(t => t.kind === 'offset_table');
  const offsetTablePlausible = report.channelTableCandidates.find(t => t.kind === 'offset_table' && t.targetsPlausible);
  if (offsetTable) report.diagnostics.push(D('info', 'BMS_STRUCT_OFFSET_TABLE_CANDIDATE', 'telemetry.struct.info.offsetTableCandidate', 'low'));
  if (report.channelTableCandidates.some(t => t.kind === 'channel_index_table')) report.diagnostics.push(D('info', 'BMS_STRUCT_INDEX_TABLE_CANDIDATE', 'telemetry.struct.info.indexTableCandidate', 'low'));

  // ── 2. length-prefixed per-channel block walk ──
  let blockCount = 0, blockLengthConsistent = false;
  if (regionLen >= 16) {
    const walk = _blockWalk(dv, byteLen, mainStart, mainEnd);
    blockCount = walk.count;
    blockLengthConsistent = !!walk.lengthConsistent;   // full-run, every block (not just the first 8)
    for (const off of walk.boundaries) report.blockBoundaryCandidates.push({ offset: off, method: 'length_prefixed_walk', headerBytes: walk.hdr, confidence: 'low' });
    if (blockCount > 0) report.diagnostics.push(D('info', 'BMS_STRUCT_BLOCK_BOUNDARY_CANDIDATE', 'telemetry.struct.info.blockBoundaryCandidate', 'low'));
  }
  const blockRelation = _relationToCatalog(blockCount, channelCount);
  report.perChannelEvidence.candidateChannelBlocks = blockCount;
  report.perChannelEvidence.countRelation = blockRelation;
  report.perChannelEvidence.blockLengthConsistent = blockLengthConsistent; // whole-run equal-length signal for 3D-2

  // ── 3. interleaved layout check (stride = channelCount × sample width) ──
  let interleavedHit = null;
  if (channelCount > 1 && regionLen > 0) {
    for (const width of [2, 4]) {
      const stride = channelCount * width;
      if (stride < width * 2) continue;
      const rows = Math.floor(regionLen / stride);
      if (rows < 8) continue;
      const coverage = +((rows * stride) / regionLen).toFixed(3);
      if (coverage < 0.8) continue;
      // Sample several lanes (columns), not just lane 0 — require each to be a genuinely-varying,
      // smooth column. A high-rate sensor lane has median|Δ| ≪ range ⇒ smoothness ≳ 0.9; random
      // int16 has smoothness ≈ 0.67, so 0.85 rejects noise; activeRatio rejects a constant/zero column.
      const laneIdxs = [0, Math.floor(channelCount / 2), channelCount - 1];
      const lanes = laneIdxs.map(li => _laneStats(dv, byteLen, mainStart + li * width, mainEnd, stride, width));
      const allLanesSmooth = lanes.every(l => l.smoothness >= 0.85 && l.activeRatio >= 0.5);
      // Discriminate genuine interleaving from ONE contiguous smooth series: reading the region
      // contiguously (stride = width, every sample) is jumpy for interleaved data (adjacent samples
      // are different channels) but smooth for a single series. Require contiguous reading to be jumpy.
      const contiguous = _laneStats(dv, byteLen, mainStart, mainEnd, width, width);
      const minLaneSmooth = Math.min.apply(null, lanes.map(l => l.smoothness));
      if (allLanesSmooth && contiguous.smoothness < 0.7) {
        interleavedHit = { width, stride, rows, coverage, laneSmooth: +minLaneSmooth.toFixed(3), contiguousSmooth: contiguous.smoothness };
        break;
      }
    }
  }

  // ── 4. compressed / sparse fallback signals ──
  const entropy = regionLen > 0 ? _entropy(bytes, mainStart, mainEnd, 64 * 1024) : 0;
  const minSamplesPerChannel = 8;
  const numericVolumeSufficient = channelCount > 0 && regionLen >= channelCount * 2 * minSamplesPerChannel;

  // ── synthesise structure hypotheses (each is a hypothesis, never confirmed) ──
  if (offsetTablePlausible) {
    report.structureHypotheses.push({
      type: 'offset_table', confidence: offsetTablePlausible.relationToCatalogCount === 'matches' ? 'medium' : 'low',
      evidence: ['monotonic in-file offset run', 'entryCount ' + offsetTablePlausible.entryCount + ' vs catalog ' + channelCount + ' (' + offsetTablePlausible.relationToCatalogCount + ')'],
      warnings: ['offset targets not yet verified as sample block starts'],
    });
  } else if (offsetTable) {
    report.structureHypotheses.push({
      type: 'offset_table', confidence: 'low',
      evidence: ['monotonic integer run found'],
      warnings: ['offset targets fall outside the file — not a verified offset table'],
    });
    report.diagnostics.push(D('warning', 'BMS_STRUCT_OFFSET_TABLE_NOT_CONFIRMED', 'telemetry.struct.warning.offsetTableNotConfirmed'));
  }

  if (blockCount >= 8 && (blockRelation === 'matches' || blockRelation === 'near')) {
    report.structureHypotheses.push({
      type: 'per_channel_blocks', confidence: blockRelation === 'matches' ? 'medium' : 'low',
      evidence: ['length-prefixed block walk yielded ' + blockCount + ' blocks vs catalog ' + channelCount + ' (' + blockRelation + ')'],
      warnings: ['block boundaries are a hypothesis; payloads not decoded; channels not named'],
    });
    report.confirmationFeed.perChannelBlockCountCandidate = blockRelation === 'matches';
    report.diagnostics.push(D('warning', 'BMS_STRUCT_PER_CHANNEL_NOT_CONFIRMED', 'telemetry.struct.warning.perChannelNotConfirmed'));
  }

  if (interleavedHit) {
    report.structureHypotheses.push({
      type: 'interleaved_channels', confidence: 'low',
      evidence: ['stride ' + interleavedHit.stride + 'B = ' + channelCount + ' lanes × ' + interleavedHit.width + 'B', 'coverage ' + interleavedHit.coverage, 'lane smoothness ' + interleavedHit.laneSmooth],
      warnings: ['consistent with channelCount lanes, but lane-to-channel identity is NOT established; offsets not named to channels'],
    });
    report.diagnostics.push(D('warning', 'BMS_STRUCT_INTERLEAVED_NOT_CONFIRMED', 'telemetry.struct.warning.interleavedNotConfirmed'));
  }

  // container/pointer region: raw candidates exist but far fewer than channels and no block/table match
  if (rawCount > 0 && channelCount > 0 && rawCount < 0.5 * channelCount
    && !offsetTablePlausible && blockRelation !== 'matches' && blockRelation !== 'near' && !interleavedHit) {
    report.structureHypotheses.push({
      type: 'container_or_pointer_region', confidence: 'low',
      evidence: ['raw series count ' + rawCount + ' ≪ catalog ' + channelCount, 'no per-channel block / offset-table / interleaved match'],
      warnings: ['raw candidate may be a container / pointer / metadata region rather than per-channel samples'],
    });
  }

  // compressed / sparse: no plausible structure AND (high entropy OR not enough numeric volume)
  const noStructure = !offsetTablePlausible && blockRelation !== 'matches' && blockRelation !== 'near' && !interleavedHit;
  if (regionLen > 0 && noStructure && (entropy >= 7.5 || !numericVolumeSufficient)) {
    report.structureHypotheses.push({
      type: 'compressed_or_sparse', confidence: 'low',
      evidence: [entropy >= 7.5 ? ('high entropy ' + entropy + ' bits/byte') : 'numeric volume below channelCount × min samples', 'no stable per-channel block / table / interleaved structure'],
      warnings: ['region may be compressed, sparse, or event-based — not a dense per-channel array'],
    });
  }

  if (!report.structureHypotheses.length) {
    report.structureHypotheses.push({ type: 'unknown', confidence: 'low', evidence: ['no recognised structure pattern'], warnings: ['structure inconclusive'] });
  }

  // ── explain the 1–2 raw series vs catalog-count gap (the core 3D-1 question) ──
  if (rawCount > 0 && channelCount > 0 && rawCount < channelCount) {
    if (interleavedHit) report.diagnostics.push(D('info', 'BMS_STRUCT_GAP_INTERLEAVED', 'telemetry.struct.info.gapInterleaved', 'low'));
    else if (blockRelation === 'matches' || blockRelation === 'near') report.diagnostics.push(D('info', 'BMS_STRUCT_GAP_PER_CHANNEL', 'telemetry.struct.info.gapPerChannel', 'low'));
    else report.diagnostics.push(D('info', 'BMS_STRUCT_GAP_UNRESOLVED', 'telemetry.struct.info.gapUnresolved', 'low'));
  }

  // ── convergence + next evidence (3D-1 never converges to confirmed) ──
  report.convergence.sampleStructureConverged = false;
  const next = [];
  if (!offsetTablePlausible) next.push('a verified offset / index / sample-count table');
  if (report.confirmationFeed.perChannelBlockCountCandidate !== true) next.push('a per-channel block count that matches the catalog across files');
  next.push('cross-file region stability (multi-file corpus)');
  if (!explicitChannelMappingFound) next.push('an explicit channel-to-block mapping');
  report.convergence.nextEvidenceNeeded = next;

  // ── standing honesty diagnostics ──
  report.diagnostics.push(D('warning', 'BMS_STRUCT_HYPOTHESES_ONLY', 'telemetry.struct.warning.hypothesesOnly'));
  report.diagnostics.push(D('warning', 'BMS_STRUCT_NOT_CONVERGED', 'telemetry.struct.warning.notConverged'));
  report.diagnostics.push(D('info', 'BMS_STRUCT_NEXT_EVIDENCE_NEEDED', 'telemetry.struct.info.nextEvidenceNeeded', 'low'));

  report.unknowns = [
    'sample structure not confirmed',
    'per-channel block layout is a hypothesis',
    'channel-to-region mapping unknown',
    'physical scaling not decoded',
  ];
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { discoverBmsSampleStructure };
}
