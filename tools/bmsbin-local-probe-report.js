/**
 * bmsbin-local-probe-report.js — LOCAL reality check for real .bmsbin files (Phase 3C-1)
 *
 * Runs the clean-room pipeline (parseBms → probeBmsBinary → extractBmsRawCandidates →
 * linkBmsRawCandidates → buildTelemetryMetadata) over real .bmsbin files the USER points at,
 * and prints a SANITIZED, aggregate-only summary so we can check whether the hypothesis
 * layer actually holds on real data before building anything on top of it.
 *
 * This is NOT a decoder and NOT a feature. Hard rules:
 *  - Reads only the path(s) you pass on the command line. Bundles no data.
 *  - Emits ONLY statistics (counts / ranges / histograms / present-absent flags).
 *  - NEVER prints raw bytes, sample values, or exact byte offsets.
 *  - Real .bmsbin files are NEVER written into the repo. Keep the printed numbers; the
 *    committed summary (docs/bmsbin-local-validation-summary.md) is statistics only.
 *
 * Usage:  node tools/bmsbin-local-probe-report.js <file-or-dir> [more...]
 */
'use strict';

// Sanitized per-file fields — nothing here can carry raw telemetry content.
const REPORT_FIELDS = [
  'catalogDetected', 'channelCount', 'candidateRegionCount', 'bestEncodingHypothesis',
  'timebaseCandidate', 'rawSeriesCount', 'linkStatus', 'channelIdentityConfirmed', 'canonicalAvailable',
  // Phase 3D-0 confirmation decision (per-file, no cross-file corpus → structure cannot confirm):
  'confirmationStatus', 'confirmedCatalog', 'confirmedStructure', 'confirmedChannelIdentity',
  'confirmedTimebase', 'confirmedPhysicalScaling', 'canonicalTelemetry', 'confirmationScore',
];

/** Run the pipeline on one file's bytes and return a sanitized summary (no raw values).
 *  opts.scanWindowBytes caps how much post-catalog data is analysed (representative stats;
 *  keeps the reality check fast on large multi-MB logs). */
function summarizeFile(bytes, fns, opts = {}) {
  const r = fns.parseBms(bytes);
  const probe = fns.probeBmsBinary(bytes, opts.scanWindowBytes ? { scanWindowBytes: opts.scanWindowBytes } : {});
  const raw = fns.extractBmsRawCandidates(bytes, probe, { catalogChannelCount: r.channelCount });
  const link = fns.linkBmsRawCandidates(r, probe, raw, {});
  const meta = fns.buildTelemetryMetadata(Object.assign({}, r, { probe, raw, link }));
  // Per-file confirmation: NO cross-file corpus is passed, so a single file can confirm a
  // catalog but never cross-file stability — exactly the honest reality-check stance.
  const conf = (typeof fns.evaluateBmsConfirmationEvidence === 'function')
    ? fns.evaluateBmsConfirmationEvidence(r, probe, raw, link, {}) : null;
  const dec = (conf && conf.decisions) || {};
  return {
    catalogDetected: !!(r.header && r.header.valid) && (r.channelCount || 0) > 0,
    channelCount: r.channelCount || 0,
    candidateRegionCount: (probe.candidateRegions || []).length,
    bestEncodingHypothesis: (raw.rawSeriesCandidates && raw.rawSeriesCandidates[0]) ? raw.rawSeriesCandidates[0].encoding : null,
    timebaseCandidate: !!(raw.timebaseCandidate && raw.timebaseCandidate.present),
    rawSeriesCount: (raw.rawSeriesCandidates || []).length,
    linkStatus: meta.status,
    channelIdentityConfirmed: !!(meta.linking && meta.linking.channelIdentityConfirmed),
    canonicalAvailable: !!(meta.linking && meta.linking.canonicalPreviewAvailable),
    confirmationStatus: conf ? conf.status : null,
    confirmedCatalog: !!dec.canConfirmCatalog,
    confirmedStructure: !!dec.canConfirmSampleStructure,
    confirmedChannelIdentity: !!dec.canConfirmChannelIdentity,
    confirmedTimebase: !!dec.canConfirmTimebase,
    confirmedPhysicalScaling: !!dec.canConfirmPhysicalScaling,
    canonicalTelemetry: !!dec.canBuildCanonicalTelemetry,
    confirmationScore: conf ? conf.scores.overallScore : 0,
  };
  // Deliberately omitted: sample values, raw bytes, byte offsets — sanitized by construction.
}

/** Aggregate per-file summaries into statistics only. */
function aggregate(summaries) {
  const cnt = (pred) => summaries.filter(pred).length;
  const encs = {};
  summaries.forEach(s => { if (s.bestEncodingHypothesis) encs[s.bestEncodingHypothesis] = (encs[s.bestEncodingHypothesis] || 0) + 1; });
  const range = (sel) => summaries.length ? [Math.min(...summaries.map(sel)), Math.max(...summaries.map(sel))] : [0, 0];
  const channelCountRange = range(s => s.channelCount);
  const regionRange = range(s => s.candidateRegionCount);
  // Cross-file (corpus) evidence — the reality-check signal a single file cannot give:
  const corpusChannelCountStable = channelCountRange[0] === channelCountRange[1] && channelCountRange[0] > 0;
  const corpusCandidateRegionStable = regionRange[1] > 0 && (regionRange[1] - regionRange[0]) <= Math.max(2, 0.2 * regionRange[1]);
  return {
    filesTested: summaries.length,
    catalogDetected: cnt(s => s.catalogDetected),
    candidateRegionFound: cnt(s => s.candidateRegionCount > 0),
    rawSeriesFound: cnt(s => s.rawSeriesCount > 0),
    timebaseCandidate: cnt(s => s.timebaseCandidate),
    encodingHistogram: encs,
    channelCountRange,
    candidateRegionCountRange: regionRange,
    rawSeriesCountRange: range(s => s.rawSeriesCount),
    channelIdentityConfirmed: cnt(s => s.channelIdentityConfirmed),
    canonicalAvailable: cnt(s => s.canonicalAvailable),
    linkStatusHistogram: summaries.reduce((h, s) => { h[s.linkStatus] = (h[s.linkStatus] || 0) + 1; return h; }, {}),
    // Phase 3D-0 confirmation evidence (sanitized counts + cross-file booleans)
    confirmedCatalog: cnt(s => s.confirmedCatalog),
    confirmedStructure: cnt(s => s.confirmedStructure),
    confirmedChannelIdentity: cnt(s => s.confirmedChannelIdentity),
    confirmedTimebase: cnt(s => s.confirmedTimebase),
    confirmedPhysicalScaling: cnt(s => s.confirmedPhysicalScaling),
    canonicalTelemetry: cnt(s => s.canonicalTelemetry),
    confirmationStatusHistogram: summaries.reduce((h, s) => { const k = s.confirmationStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    confirmationScoreRange: range(s => s.confirmationScore),
    corpusChannelCountStable,
    corpusCandidateRegionStable,
  };
}

/** Read only the first `n` bytes of a file (catalog + a sample window is enough for a
 *  reality check; avoids loading multi-MB logs in full). */
function readHead(fs, file, n) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(n, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    return new Uint8Array(buf);
  } finally { fs.closeSync(fd); }
}

/** Load the renderer pipeline functions in Node via a vm bundle (same idea as the tests). */
function loadFns() {
  const fs = require('fs'), path = require('path'), vm = require('vm');
  const jsDir = path.join(__dirname, '..', 'renderer', 'js');
  const files = ['bms-parser.js', 'telemetry-schema.js', 'telemetry-metadata.js', 'bms-probe.js', 'bms-raw-extract.js', 'bms-channel-link.js', 'bms-confirmation.js'];
  const src = files.map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n')
    + '\nthis.__f = { parseBms, probeBmsBinary, extractBmsRawCandidates, linkBmsRawCandidates, evaluateBmsConfirmationEvidence, buildTelemetryMetadata };';
  const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx, { filename: 'bms-bundle.js' });
  return ctx.__f;
}

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('Usage: node tools/bmsbin-local-probe-report.js <file-or-dir> [more...]');
    console.error('Reads only the .bmsbin you point at. Prints sanitized statistics; writes nothing to the repo.');
    process.exit(1);
  }
  const files = [];
  for (const a of args) {
    const st = fs.statSync(a);
    if (st.isDirectory()) { const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.bmsbin$/i.test(e.name)) files.push(p); }); walk(a); }
    else files.push(a);
  }
  const fns = loadFns();
  const summaries = files.map(f => {
    try { return summarizeFile(readHead(fs, f, 2 * 1024 * 1024), fns, { scanWindowBytes: 1024 * 1024 }); }
    catch (e) { return { catalogDetected: false, channelCount: 0, candidateRegionCount: 0, bestEncodingHypothesis: null, timebaseCandidate: false, rawSeriesCount: 0, linkStatus: 'error', channelIdentityConfirmed: false, canonicalAvailable: false, confirmationStatus: 'error', confirmedCatalog: false, confirmedStructure: false, confirmedChannelIdentity: false, confirmedTimebase: false, confirmedPhysicalScaling: false, canonicalTelemetry: false, confirmationScore: 0 }; }
  });
  console.log('# .bmsbin local reality check (Phase 3C-1 + 3D-0 criteria) — SANITIZED, statistics only');
  console.log(JSON.stringify(aggregate(summaries), null, 2));
  console.log('\nReminder: statistics only. Real .bmsbin files and raw sample values are NEVER committed.');
}

module.exports = { summarizeFile, aggregate, loadFns, readHead, REPORT_FIELDS };
