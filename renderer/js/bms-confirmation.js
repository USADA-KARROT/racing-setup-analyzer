/**
 * bms-confirmation.js — .bmsbin hypothesis→confirmed CRITERIA evaluator (Phase 3D-0)
 *
 * Consumes the existing hypothesis layer (catalog / probe / raw / linking) plus OPTIONAL
 * cross-file corpus evidence, and produces a CONFIRMATION DECISION report: per criterion,
 * whether the evidence is strong enough to upgrade to `confirmed`, and if not, the blockers
 * and the next evidence needed. It does NOT decode telemetry, scale values, build canonical
 * streams, overlay model-vs-actual, or infer Kus.
 *
 * Red lines: success is a defensible decision, not a decoded value. A hypothesis (any
 * confidence) is never treated as decoded. capabilities.physicalScaling /
 * handlingCorrelation / timeSeries stay false. A confirmed catalog or confirmed structure is
 * NOT confirmed telemetry. `.bmsbin` is an adapter — the decision flows back to the canonical
 * descriptor. Works only on already-parsed reports (no raw bytes) — clean-room by construction.
 *
 * Honesty of "confirmation": a single file can confirm a CATALOG but cannot prove cross-file
 * stability — so structure/region criteria require an `opts.corpus` (from the local reality
 * check). Channel identity requires EXPLICIT evidence (an offset/index table or an explicit
 * mapping) AND confirmed sample structure; catalog ORDER is never explicit evidence. Physical
 * scaling chains off identity. `canonicalTelemetryPrerequisitesMet` only reports that every
 * prerequisite is met — it is NOT a directive to build telemetry, and stays false on real data.
 */

function evaluateBmsConfirmationEvidence(bmsResult, probeReport, rawExtraction, linkingReport, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  const round = (v) => Number.isFinite(v) ? +v.toFixed(3) : 0;
  const corpus = opts.corpus || null;

  const channelCount = (bmsResult && bmsResult.channelCount) || ((bmsResult && bmsResult.channels) ? bmsResult.channels.length : 0);
  const channels = (bmsResult && bmsResult.channels) || [];
  const rawSeries = (rawExtraction && rawExtraction.rawSeriesCandidates) || [];
  const rawCount = rawSeries.length;
  const idHyps = (linkingReport && linkingReport.channelIdentityHypotheses) || [];
  const tbHyps = (linkingReport && linkingReport.timebaseHypotheses) || [];
  const scHyps = (linkingReport && linkingReport.scalingHypotheses) || [];

  // ── evidence (observations; some are honestly true on real data) ──
  const uniqueNames = new Set(channels.map(c => (typeof c === 'string' ? c : (c && c.name)) || '').filter(Boolean));
  const catalogWellFormed = !!(bmsResult && bmsResult.header && bmsResult.header.valid)
    && channelCount > 0 && uniqueNames.size === channelCount;
  const catalogDetectedAll = corpus ? corpus.catalogDetectedAll !== false : true;
  const catalogStable = catalogWellFormed && catalogDetectedAll;

  // cross-file criteria — only assessable with a corpus (a single file cannot prove these)
  const channelCountStable = !!(corpus && corpus.channelCountStable);
  const candidateRegionStable = !!(corpus && corpus.candidateRegionStable);

  // in-file criterion — raw series count relates sensibly to channel count
  const rawSeriesCountMatchesCatalog = channelCount > 0 && rawCount > 0
    && Math.abs(rawCount - channelCount) <= Math.max(1, 0.1 * channelCount);

  // Optional Phase 3D-1 structure-discovery feed: a per-channel block count that matches the
  // catalog is a STRONGER in-file structure signal than the raw-series-count heuristic. It is
  // still only an in-file signal — it can substitute for rawSeriesCountMatchesCatalog, but is
  // ALWAYS AND-ed with the corpus cross-file region stability below, so real data (no corpus)
  // stays not-confirmed. It never flips a decode-grade capability.
  const structFeed = (opts.structure && opts.structure.confirmationFeed) || null;
  const perChannelBlockEvidence = !!(structFeed && structFeed.perChannelBlockCountCandidate === true);

  // encoding reproducible across the surfaced series (in-file shape check)
  const encodingConsistent = rawCount > 0 && rawSeries.every(s => s.encoding === rawSeries[0].encoding);

  // explicit channel identity — high-confidence linking hypothesis or an explicit mapping
  const explicitChannelMappingFound = idHyps.some(h => h.confidence === 'high')
    || !!(opts.explicitMapping && Object.keys(opts.explicitMapping).length > 0);
  const catalogOrderHypothesisPresent = idHyps.some(h => h.confidence === 'low' && h.possibleRawChannelName);

  // explicit scale/offset — a linking scaling hypothesis with metadata, or an explicit mapping
  const scaleOffsetFound = scHyps.some(h => h.scale != null && h.method === 'metadata_candidate')
    || !!(opts.explicitMapping && Object.keys(opts.explicitMapping).some(k => opts.explicitMapping[k] && opts.explicitMapping[k].scale != null));

  const timebaseCandidatePresent = !!(rawExtraction && rawExtraction.timebaseCandidate && rawExtraction.timebaseCandidate.present)
    || tbHyps.length > 0;
  const timebaseSampleCountMatch = tbHyps.length > 0 && tbHyps.every(h => h.sampleCountMatch === true);

  // structure evidence (before the catalog gate) — both the cross-file and in-file parts. The
  // in-file part is satisfied by EITHER the raw-series-count heuristic OR a matching per-channel
  // block count from 3D-1 structure discovery; the cross-file part (corpus) is mandatory either way.
  const inFileStructureSignal = rawSeriesCountMatchesCatalog || perChannelBlockEvidence;
  const structureEvidence = candidateRegionStable && inFileStructureSignal;
  // a counter is only a confirmed *sample clock* once the structure it clocks is resolved
  const timebaseConfirmed = structureEvidence && timebaseCandidatePresent && timebaseSampleCountMatch;

  const evidence = {
    catalogStable, channelCountStable, candidateRegionStable,
    rawSeriesCountMatchesCatalog, timebaseConfirmed,
    explicitChannelMappingFound, scaleOffsetFound,
  };

  // ── decisions (conservative AND-chains) ──
  const canConfirmCatalog = catalogStable;
  const canConfirmSampleStructure = catalogStable && structureEvidence;
  // Optional Phase 3D-2 raw-stream confirmation feed. It can ONLY help confirm raw streams, and
  // only when its own corpus gate is satisfied (≥2 files + stable regions) — so a single real
  // file (no corpus) can never flip this true, and it never touches identity/scaling/decode caps.
  const rsConf = opts.rawStreamConfirmation || null;
  const rawStreamConfirmationFeed = !!(rsConf
    && rsConf.aggregateDecision && rsConf.aggregateDecision.canConfirmAnyRawStream
    && rsConf.confirmationFeed && rsConf.confirmationFeed.rawStreamsConfirmed
    && opts.corpus && opts.corpus.fileCount >= 2);
  const canConfirmRawStreams = canConfirmSampleStructure && (encodingConsistent || rawStreamConfirmationFeed);
  // Optional Phase 3E-0 channel-identity feed. Like the raw-stream feed, it can ONLY help confirm
  // identity, and only when corpus-backed (its own confirmed_identity already requires a corpus +
  // a confirmed raw stream). Absent → no effect (backward-compatible). Never opens decode caps.
  const idConf = opts.channelIdentity || null;
  const channelIdentityFeed = !!(idConf && idConf.status === 'confirmed_identity'
    && idConf.capabilities && idConf.capabilities.channelIdentityConfirmed === true
    && opts.corpus && opts.corpus.fileCount >= 2);
  // Identity (and therefore scaling) is gated on confirmed sample structure: a single file —
  // even with an explicit mapping — cannot confirm a channel's identity without the
  // corpus-backed structure that mapping labels. Explicit evidence is necessary, not sufficient.
  const canConfirmChannelIdentity = canConfirmSampleStructure && (explicitChannelMappingFound || channelIdentityFeed);
  // Optional Phase 3E-1 timebase feed. Like the other feeds it can ONLY help confirm timebase, and
  // only when corpus-backed (its own confirmed_timebase already requires a corpus + a confirmed raw
  // stream). Absent → no effect (backward-compatible). Never opens decode/units caps.
  const tbConf = opts.timebase || null;
  const timebaseFeed = !!(tbConf && tbConf.status === 'confirmed_timebase'
    && tbConf.capabilities && tbConf.capabilities.timebaseConfirmed === true
    && opts.corpus && opts.corpus.fileCount >= 2);
  const canConfirmTimebase = canConfirmSampleStructure && (timebaseConfirmed || timebaseFeed);
  const canConfirmPhysicalScaling = canConfirmChannelIdentity && scaleOffsetFound;
  // NOT a green light to build telemetry — Phase 3D-0 never builds canonical streams. This only
  // reports that every confirmation prerequisite is met; it stays false on real data and never
  // flips capabilities.timeSeries / physicalScaling / handlingCorrelation (which are pinned false).
  const canonicalTelemetryPrerequisitesMet = canConfirmSampleStructure && canConfirmChannelIdentity
    && canConfirmTimebase && canConfirmPhysicalScaling;

  const decisions = {
    canConfirmCatalog, canConfirmSampleStructure, canConfirmRawStreams,
    canConfirmChannelIdentity, canConfirmTimebase, canConfirmPhysicalScaling,
    canonicalTelemetryPrerequisitesMet,
  };

  // ── scores (0..1; weighted overall) ──
  const catalogScore = catalogStable ? (channelCountStable ? 1 : 0.7) : 0;
  // structure confidence is corpus-led: the in-file count match alone (no corpus) is only a weak
  // signal, so it cannot reach 0.5 without cross-file region stability.
  const structureScore = candidateRegionStable
    ? (inFileStructureSignal ? 1 : 0.5)
    : (inFileStructureSignal ? 0.2 : 0);
  const timebaseScore = timebaseConfirmed ? 1 : (timebaseCandidatePresent ? 0.3 : 0);
  const channelMappingScore = explicitChannelMappingFound ? 1 : (catalogOrderHypothesisPresent ? 0.2 : 0);
  const scalingScore = scaleOffsetFound ? 1 : 0;
  const overallScore = round(0.2 * catalogScore + 0.3 * structureScore + 0.15 * timebaseScore
    + 0.2 * channelMappingScore + 0.15 * scalingScore);
  const scores = {
    catalogScore: round(catalogScore), structureScore: round(structureScore),
    timebaseScore: round(timebaseScore), channelMappingScore: round(channelMappingScore),
    scalingScore: round(scalingScore), overallScore,
  };

  // ── status ──
  const status = canConfirmSampleStructure
    ? (canConfirmRawStreams ? 'confirmed_structure' : 'partially_confirmed')
    : 'not_confirmed';

  // ── blockers + next evidence (only what is actually missing) ──
  const blockers = [];
  if (!catalogStable) blockers.push('catalog not well-formed (header / channel count / duplicate names)');
  if (!candidateRegionStable) blockers.push('candidate region layout not shown stable across files (needs a multi-file corpus)');
  if (!rawSeriesCountMatchesCatalog) blockers.push('raw series count does not match catalog channel count');
  if (!explicitChannelMappingFound) blockers.push('no explicit channel-to-series mapping found (catalog order is not explicit evidence)');
  if (!timebaseConfirmed) blockers.push('timebase relation not confirmed');
  if (!scaleOffsetFound) blockers.push('physical scaling (scale/offset) not decoded');

  const nextEvidenceNeeded = [];
  if (!canConfirmSampleStructure) { nextEvidenceNeeded.push('stable per-channel block structure'); nextEvidenceNeeded.push('confirmed sample count per channel'); }
  if (!canConfirmChannelIdentity) nextEvidenceNeeded.push('explicit channel index or offset table');
  if (!canConfirmTimebase) nextEvidenceNeeded.push('confirmed timebase relation');
  if (!canConfirmPhysicalScaling) nextEvidenceNeeded.push('scale/offset metadata or manual mapping');

  // ── capabilities (decode-grade stays false, always) ──
  const capabilities = {
    channelCatalog: catalogStable,
    sampleProbe: !!probeReport,
    rawTimeSeriesCandidates: rawCount > 0,
    channelLinkingHypotheses: idHyps.length > 0,
    scalingHypotheses: scHyps.length > 0,
    confirmationCriteria: true,
    timeSeries: false,
    physicalScaling: false,
    handlingCorrelation: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  if (canConfirmCatalog) diagnostics.push(D('info', 'BMS_CONFIRM_CATALOG_CONFIRMED', 'telemetry.confirm.info.catalogConfirmed', 'high'));
  if (!canConfirmSampleStructure) diagnostics.push(D('warning', 'BMS_CONFIRM_STRUCTURE_NOT_CONFIRMED', 'telemetry.confirm.warning.structureNotConfirmed'));
  if (!canConfirmRawStreams) diagnostics.push(D('warning', 'BMS_CONFIRM_RAW_STREAMS_NOT_CONFIRMED', 'telemetry.confirm.warning.rawStreamsNotConfirmed'));
  if (!canConfirmChannelIdentity) diagnostics.push(D('warning', 'BMS_CONFIRM_CHANNEL_IDENTITY_NOT_CONFIRMED', 'telemetry.confirm.warning.channelIdentityNotConfirmed'));
  if (!canConfirmTimebase) diagnostics.push(D('warning', 'BMS_CONFIRM_TIMEBASE_NOT_CONFIRMED', 'telemetry.confirm.warning.timebaseNotConfirmed'));
  if (!canConfirmPhysicalScaling) diagnostics.push(D('warning', 'BMS_CONFIRM_SCALING_NOT_CONFIRMED', 'telemetry.confirm.warning.scalingNotConfirmed'));
  if (!canonicalTelemetryPrerequisitesMet) diagnostics.push(D('warning', 'BMS_CONFIRM_CANONICAL_NOT_AVAILABLE', 'telemetry.confirm.warning.canonicalNotAvailable'));
  diagnostics.push(D('info', 'BMS_CONFIRM_CRITERIA_EVALUATED', 'telemetry.confirm.info.criteriaEvaluated', 'high'));
  if (nextEvidenceNeeded.length) diagnostics.push(D('info', 'BMS_CONFIRM_NEXT_EVIDENCE_NEEDED', 'telemetry.confirm.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'confirmation_criteria', status,
    evidence, scores, decisions, blockers, nextEvidenceNeeded, capabilities, diagnostics,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsConfirmationEvidence };
}
