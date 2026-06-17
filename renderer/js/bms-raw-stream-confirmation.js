/**
 * bms-raw-stream-confirmation.js — .bmsbin RAW STREAM confirmation criteria (Phase 3D-2)
 *
 * Takes the Phase 3D-1 structure hypotheses and applies a STRICT confirmation bar to answer
 * one question: "under what conditions can we say a raw stream's STRUCTURE is confirmed?"
 *
 *   structure hypotheses → raw stream confirmation criteria → confirmed / not-confirmed decision
 *
 * This is NOT a decoder. It does NOT determine channel identity, does NOT name a stream
 * `speed`/`accy`/`yaw`, does NOT scale values or assign units, does NOT chart, overlay, or do
 * model-vs-actual. Timebase is only a PRE-CHECK here (never confirmed — that is Phase 3E-1).
 *
 * Red lines (always held):
 *   - confirming a raw stream's STRUCTURE is not confirming telemetry, channel identity, or values.
 *   - a single file can NEVER confirm a stream: confirmation requires cross-file corpus evidence.
 *   - a raw candidate / an 85-block count / smoothness / a table alone are NOT enough on their own.
 *   - capabilities.timeSeries / physicalScaling / handlingCorrelation stay false on every path.
 *   - `.bmsbin` is an adapter; output flows back to the source-agnostic descriptor.
 *   - works only on already-parsed reports (no raw bytes) — clean-room by construction.
 *
 * Status ladder (per candidate): candidate_only < confirmable < confirmed_structure.
 *   - candidate_only     : stream-bearing hypothesis present, but in-file criteria incomplete.
 *   - confirmable        : in-file structural criteria all met, but no cross-file corpus yet.
 *   - confirmed_structure: in-file criteria met AND cross-file corpus stable. Top state — still
 *                          only "raw stream STRUCTURE confirmed", never telemetry.
 *   - rejected           : the hypothesis is not itself a raw stream (a table is boundary
 *                          evidence; a container/pointer region is not per-channel samples).
 */

/**
 * Evaluate raw stream confirmation criteria for a parsed .bmsbin.
 * @param {object} bmsResult         parseBms output (channelCount, channels…)
 * @param {object} probeReport       probeBmsBinary output (Phase 3B-0)
 * @param {object} rawExtraction     extractBmsRawCandidates output (Phase 3B-1)
 * @param {object} structureDiscovery discoverBmsSampleStructure output (Phase 3D-1)
 * @param {object} opts              { corpus: { fileCount, candidateRegionStable, channelCountStable } }
 */
function evaluateBmsRawStreamConfirmation(bmsResult, probeReport, rawExtraction, structureDiscovery, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const channelCount = (bmsResult && bmsResult.channelCount) || ((bmsResult && bmsResult.channels) ? bmsResult.channels.length : 0);
  const rawSeries = (rawExtraction && rawExtraction.rawSeriesCandidates) || [];
  const rawCount = rawSeries.length;
  const hyps = (structureDiscovery && structureDiscovery.structureHypotheses) || [];
  const sdFeed = (structureDiscovery && structureDiscovery.confirmationFeed) || {};
  const pce = (structureDiscovery && structureDiscovery.perChannelEvidence) || {};
  const tableCands = (structureDiscovery && structureDiscovery.channelTableCandidates) || [];

  // cross-file corpus — a single file can NEVER confirm a stream (this is the hard gate). Require
  // channelCountStable to be explicitly true, matching bms-confirmation.js (an unmeasured flag is
  // NOT treated as stable).
  const corpus = opts.corpus || null;
  const crossFileStable = !!(corpus && corpus.fileCount >= 2 && corpus.candidateRegionStable && corpus.channelCountStable === true);

  // in-file shape signals (no physical meaning). Block-length consistency is the WHOLE-RUN signal
  // computed by Phase 3D-1's block walk (every block, not just the first few boundaries) — so a
  // stream that is equal-length only at its start cannot pass as consistent.
  const encodingConsistent = rawCount > 0 && rawSeries.every(s => s.encoding === rawSeries[0].encoding);
  const blockLengthConsistent = !!pce.blockLengthConsistent;
  const sampleCountConsistent = blockLengthConsistent; // equal-length blocks ⇒ equal sample counts
  const timebasePrecheckPassed = !!(sdFeed.timebaseRelationCandidate
    || (rawExtraction && rawExtraction.timebaseCandidate && rawExtraction.timebaseCandidate.present)
    || (probeReport && (probeReport.timebaseClues || []).length > 0));

  // ── evaluate each structure hypothesis as a raw-stream candidate ──
  const rawStreamCandidates = [];
  let idx = 0;
  for (const h of hyps) {
    idx++;
    const sid = 'stream_candidate_' + String(idx).padStart(3, '0');

    if (h.type === 'per_channel_blocks') {
      const rel = pce.countRelation;
      const channelRelation = rel === 'matches' ? 'matches_catalog_count' : (rel === 'near' ? 'partial' : (rel === 'mismatch' ? 'mismatch' : 'unknown'));
      const countReasonable = rel === 'matches' || rel === 'near';
      const boundariesStable = blockLengthConsistent; // full-run equal-length implies ≥3 reproducible blocks
      const inFileStrong = countReasonable && boundariesStable && blockLengthConsistent && sampleCountConsistent && encodingConsistent;
      const status = !inFileStrong ? 'candidate_only' : (crossFileStable ? 'confirmed_structure' : 'confirmable');
      const evidence = [];
      if (countReasonable) evidence.push('block count ' + (pce.candidateChannelBlocks || 0) + ' vs catalog ' + channelCount + ' (' + rel + ')');
      if (boundariesStable) evidence.push('block boundaries reproducible and equal-length');
      if (encodingConsistent) evidence.push('raw encoding consistent across candidates');
      const blockers = [];
      if (!countReasonable) blockers.push('raw stream count does not relate to catalog count');
      if (!boundariesStable) blockers.push('block boundaries not stable / not equal-length');
      if (!encodingConsistent) blockers.push('encoding not consistent');
      if (inFileStrong && !crossFileStable) blockers.push('cross-file corpus required to confirm');
      rawStreamCandidates.push({
        streamId: sid, sourceHypothesisType: 'per_channel_blocks', status,
        confidence: status === 'confirmed_structure' ? 'medium' : 'low',
        evidence, blockers,
        sampleCountRelation: sampleCountConsistent ? 'consistent' : 'inconsistent',
        blockLengthRelation: blockLengthConsistent ? 'consistent' : 'inconsistent',
        encodingRelation: encodingConsistent ? 'consistent' : 'inconsistent',
        channelRelation,
      });

    } else if (h.type === 'interleaved_channels') {
      // Phase 3D-1 only emits this after strict in-file checks (region coverage ≥ 0.8, every
      // sampled lane smoothness ≥ 0.85 & active, contiguous reading jumpy < 0.7, rows ≥ 8, lane
      // count == channelCount), and it rejects a single contiguous smooth series. So the
      // hypothesis PRESENCE is the strong in-file evidence — a fixed stride implies a consistent
      // per-lane encoding (note: jumpy interleaved data is not flagged by the smooth-region probe,
      // so we do not require a raw-series encoding here). The corpus is still required to confirm.
      const inFileStrong = true;
      const status = crossFileStable ? 'confirmed_structure' : 'confirmable';
      const evidence = ['interleaved layout passed structure-discovery stride / multi-lane smoothness / contiguity / row-count checks'];
      const blockers = [];
      if (!crossFileStable) blockers.push('cross-file corpus required to confirm');
      rawStreamCandidates.push({
        streamId: sid, sourceHypothesisType: 'interleaved_channels', status,
        confidence: status === 'confirmed_structure' ? 'medium' : 'low',
        evidence, blockers,
        sampleCountRelation: 'consistent',             // a single interleaved region has one row count
        blockLengthRelation: 'consistent',             // fixed stride
        encodingRelation: 'consistent',                // fixed-width lanes ⇒ consistent encoding
        channelRelation: 'matches_catalog_count',
      });

    } else if (h.type === 'offset_table' || h.type === 'index_table') {
      // A table describes raw-stream BOUNDARIES — it is not itself a raw stream.
      rawStreamCandidates.push({
        streamId: sid, sourceHypothesisType: h.type, status: 'rejected', confidence: 'low',
        evidence: ['a table is raw-stream boundary evidence, not a raw stream itself'],
        blockers: ['a table alone does not constitute a confirmed raw stream'],
        sampleCountRelation: 'unknown', blockLengthRelation: 'unknown', encodingRelation: 'unknown', channelRelation: 'unknown',
      });

    } else if (h.type === 'container_or_pointer_region') {
      rawStreamCandidates.push({
        streamId: sid, sourceHypothesisType: h.type, status: 'rejected', confidence: 'low',
        evidence: ['region looks like a container / pointer / metadata region, not per-channel samples'],
        blockers: ['not a per-channel raw stream'],
        sampleCountRelation: 'unknown', blockLengthRelation: 'unknown', encodingRelation: 'unknown', channelRelation: 'unknown',
      });
    }
    // compressed_or_sparse / unknown are not raw-stream candidates (handled by diagnostics).
  }

  const confirmed = rawStreamCandidates.filter(c => c.status === 'confirmed_structure');
  const confirmable = rawStreamCandidates.filter(c => c.status === 'confirmable');
  const candidateOnly = rawStreamCandidates.filter(c => c.status === 'candidate_only');
  const rejected = rawStreamCandidates.filter(c => c.status === 'rejected');

  // ── criteria (capability statements, conservative) ──
  const criteria = {
    sampleStructureEvidenceStrong: confirmed.length > 0 || confirmable.length > 0,
    rawStreamBoundariesStable: rawStreamCandidates.some(c => c.status !== 'candidate_only' && c.status !== 'rejected' && ((c.sourceHypothesisType === 'per_channel_blocks' && c.blockLengthRelation === 'consistent') || c.sourceHypothesisType === 'interleaved_channels')),
    rawStreamCountReasonable: rawStreamCandidates.some(c => c.channelRelation === 'matches_catalog_count' || c.channelRelation === 'partial'),
    sampleCountConsistent: rawStreamCandidates.some(c => c.status !== 'rejected' && c.sampleCountRelation === 'consistent'),
    blockLengthConsistent,
    encodingConsistent,
    crossFileStable,
    timebasePrecheckPassed,
  };

  // ── aggregate decision (corpus-gated; "confirmed" means STRUCTURE only) ──
  const aggregateDecision = {
    canConfirmAnyRawStream: confirmed.length > 0,
    confirmedRawStreamCount: confirmed.length,
    partialRawStreamCount: confirmable.length + candidateOnly.length,
    rejectedCandidateCount: rejected.length,
    reason: confirmed.length > 0
      ? 'raw stream structure confirmed (in-file evidence strong and cross-file corpus stable)'
      : (confirmable.length > 0
        ? 'in-file evidence is strong but a cross-file corpus is required to confirm'
        : 'structure evidence is not strong enough to confirm raw streams'),
  };

  const status = confirmed.length > 0 ? 'raw_stream_structure_confirmed'
    : ((confirmable.length + candidateOnly.length) > 0 ? 'partial_raw_streams' : 'not_confirmed');

  const confirmationFeed = {
    rawStreamsConfirmed: confirmed.length > 0,
    rawStreamCountMatchesCatalog: rawStreamCandidates.some(c => c.status !== 'rejected' && c.channelRelation === 'matches_catalog_count'),
    sampleCountConsistent: criteria.sampleCountConsistent,
    blockLengthConsistent: criteria.blockLengthConsistent,
    timebaseRelationCandidate: criteria.timebasePrecheckPassed,
  };

  const capabilities = {
    channelCatalog: channelCount > 0,
    sampleProbe: !!(probeReport && probeReport.candidateRegions),
    rawTimeSeriesCandidates: rawCount > 0,
    channelLinkingHypotheses: true,
    scalingHypotheses: true,
    confirmationCriteria: true,
    sampleStructureDiscovery: !!structureDiscovery,
    rawStreamConfirmation: true,
    timeSeries: false, physicalScaling: false, handlingCorrelation: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_RAW_STREAM_CONFIRMATION_RUN', 'telemetry.rawstream.info.confirmationRun', 'high'));
  if (rawStreamCandidates.length) diagnostics.push(D('info', 'BMS_RAW_STREAM_CANDIDATE_EVALUATED', 'telemetry.rawstream.info.candidateEvaluated', 'low'));
  if (confirmed.length === 0) diagnostics.push(D('warning', 'BMS_RAW_STREAMS_NOT_CONFIRMED', 'telemetry.rawstream.warning.notConfirmed'));
  if (!criteria.rawStreamBoundariesStable) diagnostics.push(D('warning', 'BMS_RAW_STREAM_BOUNDARIES_NOT_STABLE', 'telemetry.rawstream.warning.boundariesNotStable'));
  if (!criteria.sampleCountConsistent) diagnostics.push(D('warning', 'BMS_RAW_STREAM_SAMPLE_COUNT_NOT_CONFIRMED', 'telemetry.rawstream.warning.sampleCountNotConfirmed'));
  if (!criteria.blockLengthConsistent) diagnostics.push(D('warning', 'BMS_RAW_STREAM_BLOCK_LENGTH_NOT_CONFIRMED', 'telemetry.rawstream.warning.blockLengthNotConfirmed'));
  if (!crossFileStable) diagnostics.push(D('warning', 'BMS_RAW_STREAM_CROSS_FILE_REQUIRED', 'telemetry.rawstream.warning.crossFileRequired'));
  diagnostics.push(D('warning', 'BMS_RAW_STREAM_CHANNEL_IDENTITY_NOT_CONFIRMED', 'telemetry.rawstream.warning.channelIdentityNotConfirmed'));
  diagnostics.push(D('warning', 'BMS_RAW_STREAM_PHYSICAL_VALUES_NOT_AVAILABLE', 'telemetry.rawstream.warning.physicalValuesNotAvailable'));
  if (confirmable.length > 0 && confirmed.length === 0) diagnostics.push(D('info', 'BMS_RAW_STREAM_PARTIAL_EVIDENCE', 'telemetry.rawstream.info.partialEvidence', 'low'));
  diagnostics.push(D('info', 'BMS_RAW_STREAM_NEXT_EVIDENCE_NEEDED', 'telemetry.rawstream.info.nextEvidenceNeeded', 'low'));

  const unknowns = [
    'channel identity not confirmed',
    'physical scaling not decoded',
    'timebase not confirmed (pre-check only)',
    'no physical telemetry values available',
  ];

  return {
    sourceType: 'bmsbin', stage: 'raw_stream_confirmation', status,
    inputs: {
      channelCatalogCount: channelCount,
      rawSeriesCandidateCount: rawCount,
      structureHypothesisCount: hyps.length,
      hasCorpusEvidence: !!corpus,
    },
    criteria,
    rawStreamCandidates,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsRawStreamConfirmation };
}
