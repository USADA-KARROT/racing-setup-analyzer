/**
 * bms-timebase-confirmation.js — .bmsbin TIMEBASE confirmation CRITERIA (Phase 3E-1)
 *
 * This builds the conservative CRITERIA for "when may a timebase be called confirmed?" — where a
 * timebase is purely STRUCTURAL: sample ordering / sample count / interval (delta) stability /
 * per-channel synchronisation. It is NOT physical time.
 *
 * Core principle: **timebase confirmation is not physical scaling.** A confirmed timebase means only
 * that sample ordering / intervals / synchronisation are structurally supported. It does NOT mean
 * channel identity is confirmed, units are confirmed, values are physical, telemetry is canonical,
 * overlay is valid, or setup advice can be made.
 *
 * Red lines (always held): no physical scaling, no units conversion, no physical telemetry / seconds
 * chart, no overlay, no Kus, no setup recommendation, no canonical telemetry, no handling correlation,
 * no confirmed physical values, no channel-identity naming, no auto sample-rate guessing that becomes
 * confirmed. capabilities physicalScaling / unitsConfirmed / canonicalTelemetry / timeSeries /
 * handlingCorrelation / setupRecommendation stay false on every path. A single real file can NEVER
 * reach confirmed_timebase (it requires a corpus-backed confirmed raw stream). A manual sample rate is
 * only a fallback HINT (never confirms, never opens units). `.bmsbin` is an adapter; output flows back
 * to the source-agnostic descriptor. Works on parsed reports + explicit evidence — clean-room.
 */

const _TB_RANK = {
  not_confirmed: 0, insufficient_evidence: 1, sample_count_candidate: 2,
  monotonic_candidate: 3, delta_candidate: 4, sync_candidate: 5,
  confirmable_timebase: 6, confirmed_timebase: 7,
};

/**
 * Evaluate timebase confirmation criteria.
 * @param {object} rawStreamConfirmation evaluateBmsRawStreamConfirmation output (Phase 3D-2)
 * @param {object} structureDiscovery    discoverBmsSampleStructure output (Phase 3D-1)
 * @param {object} opts  { corpus, timebaseEvidence: {sampleCountStable, monotonicCounterStable,
 *                         deltaStable, channelSyncStable, gapCount, dropoutCount}, manualSampleRate }
 */
function evaluateBmsTimebaseConfirmation(rawStreamConfirmation, structureDiscovery, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const corpus = opts.corpus || null;
  const corpusOk = !!(corpus && corpus.fileCount >= 2 && corpus.candidateRegionStable && corpus.channelCountStable === true);
  // a raw stream's STRUCTURE must be corpus-confirmed (3D-2) before its timebase can be confirmed
  const rawStreamConfirmed = !!(rawStreamConfirmation && rawStreamConfirmation.aggregateDecision
    && rawStreamConfirmation.aggregateDecision.canConfirmAnyRawStream === true);

  // a monotonic-counter PRE-CHECK candidate may exist already (probe/raw/structure) — weak signal only
  const nativeCounter = !!((structureDiscovery && structureDiscovery.confirmationFeed && structureDiscovery.confirmationFeed.timebaseRelationCandidate)
    || (rawStreamConfirmation && rawStreamConfirmation.confirmationFeed && rawStreamConfirmation.confirmationFeed.timebaseRelationCandidate));

  // structural evidence is provided externally (synthetic in tests); never derived from waveform shape
  const ev = opts.timebaseEvidence || {};
  const sampleCountStable = !!ev.sampleCountStable;
  const monotonicCounterStable = !!ev.monotonicCounterStable;
  const deltaStable = !!ev.deltaStable;
  const channelSyncStable = !!ev.channelSyncStable;
  // gap/dropout counts exist SOLELY to block confirmation, so a non-finite / garbage count must
  // mean "gaps unknown → not clear", never silently collapse to 0 (NaN || 0 would erase the block).
  const _toCount = (v) => (Number.isFinite(v) && v >= 0) ? v : 0;
  const gapRaw = ev.gapCount === undefined ? 0 : ev.gapCount;
  const dropRaw = ev.dropoutCount === undefined ? 0 : ev.dropoutCount;
  const countsValid = Number.isFinite(gapRaw) && Number.isFinite(dropRaw);
  const gapCount = _toCount(gapRaw);
  const dropoutCount = _toCount(dropRaw);
  const gapsClear = countsValid && gapCount === 0 && dropoutCount === 0;

  const manualSampleRate = (opts.manualSampleRate != null && Number.isFinite(opts.manualSampleRate)) ? opts.manualSampleRate : null;
  // a manual rate is ONLY a fallback hint — it never confirms a timebase and never opens units
  const manualSampleRateHint = manualSampleRate != null
    ? { value: manualSampleRate, confirmed: false, note: 'fallback hint only — does not confirm timebase, units, or physical values' }
    : null;

  const allStructural = sampleCountStable && monotonicCounterStable && deltaStable && channelSyncStable && gapsClear;

  // ── conservative status ladder ──
  let status;
  if (allStructural && corpusOk && rawStreamConfirmed) status = 'confirmed_timebase';
  else if (allStructural) status = 'confirmable_timebase';          // all structural, but no corpus / raw stream not confirmed
  else if (channelSyncStable) status = 'sync_candidate';
  else if (deltaStable) status = 'delta_candidate';
  else if (monotonicCounterStable || nativeCounter) status = 'monotonic_candidate';
  else if (sampleCountStable) status = 'sample_count_candidate';
  else if (manualSampleRate != null) status = 'insufficient_evidence';   // a manual hint is not evidence
  else status = 'not_confirmed';

  const canConfirmTimebase = status === 'confirmed_timebase';
  const isCandidate = _TB_RANK[status] >= _TB_RANK.sample_count_candidate && !canConfirmTimebase;

  const blockers = [];
  if (!allStructural) {
    if (!sampleCountStable) blockers.push('sample count not shown stable across the corpus');
    if (!monotonicCounterStable && !nativeCounter) blockers.push('no monotonic sample-ordering evidence');
    if (!deltaStable) blockers.push('sample interval (delta) not shown stable');
    if (!channelSyncStable) blockers.push('per-channel synchronisation not shown stable');
    if (!gapsClear) blockers.push('gaps / dropouts detected — timebase cannot be confirmed');
  }
  if (!rawStreamConfirmed) blockers.push('underlying raw stream structure is not corpus-confirmed');
  if (!corpusOk) blockers.push('cross-file corpus required');
  if (manualSampleRate != null) blockers.push('manual sample rate is only a fallback hint (not confirming)');

  const aggregateDecision = {
    canConfirmTimebase,
    confirmedCount: canConfirmTimebase ? 1 : 0,
    candidateCount: isCandidate ? 1 : 0,
    reason: canConfirmTimebase
      ? 'sample count / ordering / delta / sync are structurally stable across a corpus over a confirmed raw stream (synthetic only in 3E-1)'
      : (status === 'confirmable_timebase' ? 'timebase structure is internally stable but a corpus-confirmed raw stream is required to confirm'
        : 'timebase is not confirmed — only structural ordering / interval evidence is evaluated (not physical time)'),
  };

  const confirmationFeed = {
    timebaseConfirmed: canConfirmTimebase,
    sampleCountStable, monotonicCounterStable, deltaStable, channelSyncStable,
  };

  // ── capabilities (decode-grade + units + scaling + overlay-grade pinned false on every path) ──
  const capabilities = {
    rawStreamConfirmation: !!rawStreamConfirmation,
    sampleStructureDiscovery: !!structureDiscovery,
    timebaseConfirmation: true,
    timebaseConfirmed: canConfirmTimebase,        // structural only; true only on synthetic/corpus-backed
    physicalScaling: false, unitsConfirmed: false, canonicalTelemetry: false,
    timeSeries: false, handlingCorrelation: false, setupRecommendation: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_TIMEBASE_CONFIRMATION_RUN', 'telemetry.timebase.info.confirmationRun', 'high'));
  if (isCandidate || canConfirmTimebase) diagnostics.push(D('info', 'BMS_TIMEBASE_CANDIDATE_EVALUATED', 'telemetry.timebase.info.candidateEvaluated', 'low'));
  if (!canConfirmTimebase) diagnostics.push(D('warning', 'BMS_TIMEBASE_NOT_CONFIRMED', 'telemetry.timebase.warning.notConfirmed'));
  if (!rawStreamConfirmed) diagnostics.push(D('warning', 'BMS_TIMEBASE_REQUIRES_RAW_STREAM_CONFIRMED', 'telemetry.timebase.warning.requiresRawStreamConfirmed'));
  if (!corpusOk) diagnostics.push(D('warning', 'BMS_TIMEBASE_REQUIRES_CORPUS', 'telemetry.timebase.warning.requiresCorpus'));
  if (!gapsClear) diagnostics.push(D('warning', 'BMS_TIMEBASE_GAPS_DETECTED', 'telemetry.timebase.warning.gapsDetected'));
  if (manualSampleRate != null) diagnostics.push(D('warning', 'BMS_TIMEBASE_MANUAL_FALLBACK_ONLY', 'telemetry.timebase.warning.manualFallbackOnly'));
  diagnostics.push(D('warning', 'BMS_TIMEBASE_PHYSICAL_VALUES_NOT_AVAILABLE', 'telemetry.timebase.warning.physicalValuesNotAvailable'));
  diagnostics.push(D('warning', 'BMS_TIMEBASE_UNITS_NOT_CONFIRMED', 'telemetry.timebase.warning.unitsNotConfirmed'));
  diagnostics.push(D('warning', 'BMS_TIMEBASE_NO_CANONICAL_TELEMETRY', 'telemetry.timebase.warning.noCanonicalTelemetry'));
  diagnostics.push(D('info', 'BMS_TIMEBASE_NEXT_EVIDENCE_NEEDED', 'telemetry.timebase.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'timebase_confirmation', status,
    reason: aggregateDecision.reason,
    evidenceLevel: status,
    inputs: {
      rawStreamConfirmedStructure: rawStreamConfirmed,
      hasCorpusEvidence: corpusOk,
      timebaseEvidenceProvided: !!opts.timebaseEvidence,
      manualSampleRateProvided: manualSampleRate != null,
    },
    criteria: { sampleCountStable, monotonicCounterStable, deltaStable, channelSyncStable, gapsClear, corpusBacked: corpusOk, rawStreamConfirmed },
    gapCount, dropoutCount,
    manualSampleRateHint,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      canConfirmTimebase
        ? 'timebase structurally confirmed (synthetic) but values are NOT physical and units are NOT confirmed'
        : 'timebase not confirmed (structural ordering / interval evidence only)',
      'physical values not available',
      'units not confirmed',
      'no canonical telemetry produced',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsTimebaseConfirmation };
}
