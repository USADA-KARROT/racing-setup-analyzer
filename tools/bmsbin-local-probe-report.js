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
  // Phase 3D-1 structure discovery (sanitized scalars only — counts/relations/flags, NEVER
  // raw byte positions, sample values, or proprietary layout). Field names deliberately avoid
  // the words "offset"/"samples" so the sanitization whitelist stays unambiguous.
  'structureStatus', 'pointerTableCandidate', 'pointerTableMatchesCatalog',
  'perChannelBlockHypothesis', 'interleavedHypothesis', 'candidateChannelBlocks',
  'blockCountRelation', 'structureConverged',
  // Phase 3D-2 raw stream confirmation (sanitized scalars only — statuses/counts/flags, never
  // raw bytes, sample values, or byte positions). Single-file runs carry no corpus, so confirmed
  // raw stream count is always 0 here — exactly the honest single-file reality.
  'rawStreamConfirmationStatus', 'confirmedRawStreamCount', 'partialRawStreamCount',
  'rejectedRawStreamCount', 'rawStreamSampleCountConsistent', 'rawStreamBlockLengthConsistent',
  'rawStreamTimebasePrecheck', 'rawStreamCrossFileStable',
  // Phase 3E-0 channel identity (sanitized scalars only — statuses/counts/levels, never labels or
  // raw content). Real files carry NO identity evidence here → status not_confirmed, 0 confirmed.
  'channelIdentityStatus', 'identityCandidateCount', 'identityConfirmedCount',
  'identityHypothesisCount', 'identityLabeledUnverifiedCount', 'identityEvidenceLevel',
  // Phase 3E-1 timebase (sanitized scalars only — status/counts/structural flags, never an exact
  // inferred Hz, timestamp, or rate from a real file). Real files carry NO timebase evidence here
  // → never confirmed; no rate value is ever emitted.
  'timebaseStatus', 'timebaseConfirmedCount', 'timebaseCandidateCount', 'timebaseSampleCountStable',
  'timebaseMonotonicStable', 'timebaseDeltaStable', 'timebaseChannelSyncStable', 'timebaseDropoutCount',
  // Phase 3F-0 physical scaling (sanitized scalars only — status/counts/level, NEVER a scale factor,
  // unit table, transform constant, or inferred km/h/g/deg/% from a real file). Real files carry NO
  // scaling/unit evidence here → never confirmed; no scale/unit value is ever emitted.
  'physicalScalingStatus', 'scalingConfirmedCount', 'scalingCandidateCount',
  'scalingUnitsConfirmedCount', 'scalingManualHintCount', 'scalingEvidenceLevel',
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
  // Phase 3D-1: sample-structure discovery (hypotheses only — never confirmed on real single files).
  const structure = (typeof fns.discoverBmsSampleStructure === 'function')
    ? fns.discoverBmsSampleStructure(bytes, r, probe, raw, link, conf, { catalogChannelCount: r.channelCount, scanWindowBytes: opts.scanWindowBytes || undefined }) : null;
  const sh = (structure && structure.structureHypotheses) || [];
  const tc = (structure && structure.channelTableCandidates) || [];
  const pointerTable = tc.find(t => t.kind === 'offset_table' && t.targetsPlausible) || null;
  const pce = (structure && structure.perChannelEvidence) || {};
  // Phase 3D-2: raw stream confirmation (single-file → no corpus → never confirmed, by design).
  const rawStreamConf = (typeof fns.evaluateBmsRawStreamConfirmation === 'function')
    ? fns.evaluateBmsRawStreamConfirmation(r, probe, raw, structure, {}) : null;
  const rsAgg = (rawStreamConf && rawStreamConf.aggregateDecision) || {};
  const rsCrit = (rawStreamConf && rawStreamConf.criteria) || {};
  // Phase 3E-0: channel identity confirmation. NO identity evidence is supplied here, so real files
  // are always not_confirmed with 0 candidates — the honest single-file reality (no channel naming).
  const idConf = (typeof fns.evaluateBmsChannelIdentityConfirmation === 'function')
    ? fns.evaluateBmsChannelIdentityConfirmation(r, rawStreamConf, structure, {}) : null;
  const idAgg = (idConf && idConf.aggregateDecision) || {};
  // Phase 3E-1: timebase confirmation. NO timebase evidence and no manual rate supplied here, so real
  // files are never confirmed and no inferred Hz / rate is ever produced — the honest single-file reality.
  const tbConf = (typeof fns.evaluateBmsTimebaseConfirmation === 'function')
    ? fns.evaluateBmsTimebaseConfirmation(rawStreamConf, structure, {}) : null;
  const tbAgg = (tbConf && tbConf.aggregateDecision) || {};
  const tbCrit = (tbConf && tbConf.criteria) || {};
  // Phase 3F-0: physical scaling confirmation. NO scaling/unit/manual evidence supplied here, so real
  // files are never confirmed and no scale factor / unit / inferred physical value is ever produced.
  const psConf = (typeof fns.evaluateBmsPhysicalScalingConfirmation === 'function')
    ? fns.evaluateBmsPhysicalScalingConfirmation(rawStreamConf, idConf, tbConf, {}) : null;
  const psAgg = (psConf && psConf.aggregateDecision) || {};
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
    canonicalTelemetry: !!dec.canonicalTelemetryPrerequisitesMet,
    confirmationScore: conf ? conf.scores.overallScore : 0,
    structureStatus: structure ? structure.status : null,
    pointerTableCandidate: !!pointerTable,
    pointerTableMatchesCatalog: !!(pointerTable && pointerTable.relationToCatalogCount === 'matches'),
    perChannelBlockHypothesis: sh.some(h => h.type === 'per_channel_blocks'),
    interleavedHypothesis: sh.some(h => h.type === 'interleaved_channels'),
    candidateChannelBlocks: pce.candidateChannelBlocks || 0,
    blockCountRelation: pce.countRelation || 'unknown',
    structureConverged: !!(structure && structure.convergence && structure.convergence.sampleStructureConverged),
    rawStreamConfirmationStatus: rawStreamConf ? rawStreamConf.status : null,
    confirmedRawStreamCount: rsAgg.confirmedRawStreamCount || 0,
    partialRawStreamCount: rsAgg.partialRawStreamCount || 0,
    rejectedRawStreamCount: rsAgg.rejectedCandidateCount || 0,
    rawStreamSampleCountConsistent: !!rsCrit.sampleCountConsistent,
    rawStreamBlockLengthConsistent: !!rsCrit.blockLengthConsistent,
    rawStreamTimebasePrecheck: !!rsCrit.timebasePrecheckPassed,
    rawStreamCrossFileStable: !!rsCrit.crossFileStable,
    channelIdentityStatus: idConf ? idConf.status : null,
    identityCandidateCount: idAgg.candidateCount || 0,
    identityConfirmedCount: idAgg.confirmedIdentityCount || 0,
    identityHypothesisCount: idAgg.hypothesisCount || 0,
    identityLabeledUnverifiedCount: idAgg.labeledUnverifiedCount || 0,
    identityEvidenceLevel: idConf ? idConf.evidenceLevel : null,
    timebaseStatus: tbConf ? tbConf.status : null,
    timebaseConfirmedCount: tbAgg.confirmedCount || 0,
    timebaseCandidateCount: tbAgg.candidateCount || 0,
    timebaseSampleCountStable: !!tbCrit.sampleCountStable,
    timebaseMonotonicStable: !!tbCrit.monotonicCounterStable,
    timebaseDeltaStable: !!tbCrit.deltaStable,
    timebaseChannelSyncStable: !!tbCrit.channelSyncStable,
    timebaseDropoutCount: (tbConf && tbConf.dropoutCount) || 0,
    physicalScalingStatus: psConf ? psConf.status : null,
    scalingConfirmedCount: psAgg.confirmedCount || 0,
    scalingCandidateCount: psAgg.candidateCount || 0,
    scalingUnitsConfirmedCount: psAgg.unitsConfirmedCount || 0,
    scalingManualHintCount: psAgg.manualHintCount || 0,
    scalingEvidenceLevel: psConf ? psConf.evidenceLevel : null,
  };
  // Deliberately omitted: sample values, raw bytes, byte offsets, channel labels, inferred Hz/rate,
  // scale factors, unit tables, transform constants, inferred physical values — sanitized by construction.
}

/** Aggregate per-file summaries into statistics only. */
function aggregate(summaries) {
  const cnt = (pred) => summaries.filter(pred).length;
  const encs = {};
  summaries.forEach(s => { if (s.bestEncodingHypothesis) encs[s.bestEncodingHypothesis] = (encs[s.bestEncodingHypothesis] || 0) + 1; });
  const range = (sel) => summaries.length ? [Math.min(...summaries.map(sel)), Math.max(...summaries.map(sel))] : [0, 0];
  const channelCountRange = range(s => s.channelCount);
  const regionRange = range(s => s.candidateRegionCount);
  // Cross-file (corpus) evidence — the reality-check signal a single file cannot give, so it
  // requires at least 2 files; a single file never asserts cross-file stability.
  const multiFile = summaries.length >= 2;
  const corpusChannelCountStable = multiFile && channelCountRange[0] === channelCountRange[1] && channelCountRange[0] > 0;
  const corpusCandidateRegionStable = multiFile && regionRange[1] > 0 && (regionRange[1] - regionRange[0]) <= Math.max(2, 0.2 * regionRange[1]);
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
    // Phase 3D-1 structure discovery (sanitized counts / ranges / histograms only)
    pointerTableCandidateFound: cnt(s => s.pointerTableCandidate),
    pointerTableMatchesCatalog: cnt(s => s.pointerTableMatchesCatalog),
    perChannelBlockHypothesisFound: cnt(s => s.perChannelBlockHypothesis),
    interleavedHypothesisFound: cnt(s => s.interleavedHypothesis),
    structureConfirmed: cnt(s => s.structureConverged),
    candidateChannelBlocksRange: range(s => s.candidateChannelBlocks),
    structureStatusHistogram: summaries.reduce((h, s) => { const k = s.structureStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    blockCountRelationHistogram: summaries.reduce((h, s) => { const k = s.blockCountRelation || 'unknown'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    // Phase 3D-2 raw stream confirmation (sanitized counts / ranges / histograms only)
    rawStreamConfirmationStatusHistogram: summaries.reduce((h, s) => { const k = s.rawStreamConfirmationStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    confirmedRawStreamCountRange: range(s => s.confirmedRawStreamCount),
    rawStreamSampleCountConsistentFiles: cnt(s => s.rawStreamSampleCountConsistent),
    rawStreamBlockLengthConsistentFiles: cnt(s => s.rawStreamBlockLengthConsistent),
    rawStreamTimebasePrecheckFiles: cnt(s => s.rawStreamTimebasePrecheck),
    rawStreamCrossFileStable: corpusCandidateRegionStable,
    // Phase 3E-0 channel identity (sanitized counts / ranges / histograms only)
    channelIdentityStatusHistogram: summaries.reduce((h, s) => { const k = s.channelIdentityStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    identityConfirmedFiles: cnt(s => s.identityConfirmedCount > 0),
    identityCandidateCountRange: range(s => s.identityCandidateCount),
    identityEvidenceLevelHistogram: summaries.reduce((h, s) => { const k = s.identityEvidenceLevel || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    // Phase 3E-1 timebase (sanitized counts / histograms only; never an inferred rate)
    timebaseStatusHistogram: summaries.reduce((h, s) => { const k = s.timebaseStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    timebaseConfirmedFiles: cnt(s => s.timebaseConfirmedCount > 0),
    timebaseSampleCountStableFiles: cnt(s => s.timebaseSampleCountStable),
    timebaseMonotonicStableFiles: cnt(s => s.timebaseMonotonicStable),
    timebaseDeltaStableFiles: cnt(s => s.timebaseDeltaStable),
    timebaseChannelSyncStableFiles: cnt(s => s.timebaseChannelSyncStable),
    timebaseDropoutCountRange: range(s => s.timebaseDropoutCount),
    // Phase 3F-0 physical scaling (sanitized counts / histograms only; never a scale factor / unit)
    physicalScalingStatusHistogram: summaries.reduce((h, s) => { const k = s.physicalScalingStatus || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
    scalingConfirmedFiles: cnt(s => s.scalingConfirmedCount > 0),
    scalingUnitsConfirmedFiles: cnt(s => s.scalingUnitsConfirmedCount > 0),
    scalingManualHintFiles: cnt(s => s.scalingManualHintCount > 0),
    scalingEvidenceLevelHistogram: summaries.reduce((h, s) => { const k = s.scalingEvidenceLevel || 'none'; h[k] = (h[k] || 0) + 1; return h; }, {}),
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
  const files = ['bms-parser.js', 'telemetry-schema.js', 'telemetry-metadata.js', 'bms-probe.js', 'bms-raw-extract.js', 'bms-channel-link.js', 'bms-confirmation.js', 'bms-structure-discovery.js', 'bms-raw-stream-confirmation.js', 'bms-channel-identity-confirmation.js', 'bms-timebase-confirmation.js', 'bms-physical-scaling-confirmation.js'];
  const src = files.map(f => fs.readFileSync(path.join(jsDir, f), 'utf8')).join('\n')
    + '\nthis.__f = { parseBms, probeBmsBinary, extractBmsRawCandidates, linkBmsRawCandidates, evaluateBmsConfirmationEvidence, discoverBmsSampleStructure, evaluateBmsRawStreamConfirmation, evaluateBmsChannelIdentityConfirmation, evaluateBmsTimebaseConfirmation, evaluateBmsPhysicalScalingConfirmation, buildTelemetryMetadata };';
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
    catch (e) { return { catalogDetected: false, channelCount: 0, candidateRegionCount: 0, bestEncodingHypothesis: null, timebaseCandidate: false, rawSeriesCount: 0, linkStatus: 'error', channelIdentityConfirmed: false, canonicalAvailable: false, confirmationStatus: 'error', confirmedCatalog: false, confirmedStructure: false, confirmedChannelIdentity: false, confirmedTimebase: false, confirmedPhysicalScaling: false, canonicalTelemetry: false, confirmationScore: 0, structureStatus: 'error', pointerTableCandidate: false, pointerTableMatchesCatalog: false, perChannelBlockHypothesis: false, interleavedHypothesis: false, candidateChannelBlocks: 0, blockCountRelation: 'unknown', structureConverged: false, rawStreamConfirmationStatus: 'error', confirmedRawStreamCount: 0, partialRawStreamCount: 0, rejectedRawStreamCount: 0, rawStreamSampleCountConsistent: false, rawStreamBlockLengthConsistent: false, rawStreamTimebasePrecheck: false, rawStreamCrossFileStable: false, channelIdentityStatus: 'error', identityCandidateCount: 0, identityConfirmedCount: 0, identityHypothesisCount: 0, identityLabeledUnverifiedCount: 0, identityEvidenceLevel: 'error', timebaseStatus: 'error', timebaseConfirmedCount: 0, timebaseCandidateCount: 0, timebaseSampleCountStable: false, timebaseMonotonicStable: false, timebaseDeltaStable: false, timebaseChannelSyncStable: false, timebaseDropoutCount: 0, physicalScalingStatus: 'error', scalingConfirmedCount: 0, scalingCandidateCount: 0, scalingUnitsConfirmedCount: 0, scalingManualHintCount: 0, scalingEvidenceLevel: 'error' }; }
  });
  console.log('# .bmsbin local reality check (Phase 3C-1 + 3D-0 + 3D-1 + 3D-2 + 3E-0 + 3E-1 + 3F-0 scaling) — SANITIZED, statistics only');
  console.log(JSON.stringify(aggregate(summaries), null, 2));
  console.log('\nReminder: statistics only. Real .bmsbin files and raw sample values are NEVER committed.');
}

module.exports = { summarizeFile, aggregate, loadFns, readHead, REPORT_FIELDS };
