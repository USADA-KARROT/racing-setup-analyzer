/**
 * telemetry-metadata.js — telemetry catalog descriptor + diagnostics (Phase 3A)
 *
 * Same spirit as tyre-metadata.js: describe, honestly, what an imported .bmsbin gives us
 * RIGHT NOW (a channel catalog) and what it does NOT (time-series samples, physical
 * scaling, units) — so the UI can say "I know the channels, I haven't decoded the data".
 *
 * Diagnostics are capability statements, not quality judgements:
 *   error   — not usable at all (not a Darab file / no channels)
 *   warning — catalog readable but not yet correlatable (no samples decoded; a required
 *             channel is missing)
 *   info    — an available capability (catalog present, validation channels, dampers…)
 *
 * Pure descriptor; consumes the output of parseBms (bms-parser.js) and the canonical
 * mapping (telemetry-schema.js). Does NOT decode samples — that is Phase 3B.
 */

/** Capability-oriented diagnostics for an imported .bmsbin catalog. */
function validateTelemetryCatalog(bmsResult) {
  const diags = [];
  const D = (severity, code, messageKey, affectedOutputs) =>
    ({ severity, code, messageKey, affectedOutputs: affectedOutputs || [] });

  // ── error: unusable ──
  if (!bmsResult || !bmsResult.header || !bmsResult.header.valid) {
    diags.push(D('error', 'TELEM_NOT_DARAB', 'telem.error.notDarab'));
    return diags;
  }
  const channels = bmsResult.channels || [];
  if (!channels.length || !bmsResult.channelCount) {
    diags.push(D('error', 'TELEM_NO_CHANNELS', 'telem.error.noChannels'));
    return diags;
  }

  const map = mapTelemetryChannels(channels);

  // ── warning: catalog readable, but not yet correlatable ──
  diags.push(D('warning', 'TELEM_TIMESERIES_NOT_DECODED', 'telem.warning.timeSeriesNotDecoded',
    ['timeSeries', 'physicalScaling', 'units']));
  if (!map.lateral_accel.present) diags.push(D('warning', 'TELEM_NO_LATERAL_ACCEL', 'telem.warning.noLateralAccel', ['handlingCorrelation']));
  if (!map.yaw_rate.present) diags.push(D('warning', 'TELEM_NO_YAW_RATE', 'telem.warning.noYawRate', ['handlingCorrelation']));
  if (!map.steering.present) diags.push(D('warning', 'TELEM_NO_STEERING', 'telem.warning.noSteering', ['handlingCorrelation']));
  if (!map.speed.present) diags.push(D('warning', 'TELEM_NO_SPEED', 'telem.warning.noSpeed', ['handlingCorrelation']));

  // ── info: available capabilities ──
  diags.push(D('info', 'TELEM_CATALOG_AVAILABLE', 'telem.info.catalogAvailable'));
  const coreAll = TELEMETRY_REQUIRED_FOR_CORRELATION.every(k => map[k] && map[k].present);
  if (coreAll) diags.push(D('info', 'TELEM_VALIDATION_CHANNELS_DETECTED', 'telem.info.validationChannelsDetected'));
  if (['damper_fl', 'damper_fr', 'damper_rl', 'damper_rr'].some(k => map[k].present)) diags.push(D('info', 'TELEM_DAMPERS_DETECTED', 'telem.info.dampersDetected'));
  if (['ride_height_front', 'ride_height_rear'].some(k => map[k].present)) diags.push(D('info', 'TELEM_RIDE_HEIGHT_DETECTED', 'telem.info.rideHeightDetected'));
  if (['wheel_speed_fl', 'wheel_speed_fr', 'wheel_speed_rl', 'wheel_speed_rr'].some(k => map[k].present)) diags.push(D('info', 'TELEM_WHEEL_SPEED_DETECTED', 'telem.info.wheelSpeedDetected'));
  if (coreAll) diags.push(D('info', 'TELEM_READY_FOR_3B', 'telem.info.readyFor3B'));
  return diags;
}

/**
 * Build the telemetry descriptor for an imported .bmsbin (catalog-only in Phase 3A).
 * @param {object} bmsResult output of parseBms (header, channelCount, channels, …)
 */
function buildTelemetryMetadata(bmsResult) {
  const diagnostics = validateTelemetryCatalog(bmsResult);
  const hasError = diagnostics.some(d => d.severity === 'error');
  const map = hasError ? {} : mapTelemetryChannels(bmsResult.channels || []);

  // canonical descriptors for every detected channel (numeric fields null until 3B)
  const channels = [];
  for (const canon of Object.keys(map)) {
    if (map[canon].present) channels.push(telemetryChannelDescriptor(canon, map[canon].rawName));
  }
  // the correlation-required channels, with matched raw names, for the status panel
  const requiredChannels = {};
  for (const k of TELEMETRY_REQUIRED_FOR_CORRELATION) {
    requiredChannels[k] = (map[k] && map[k].present) ? map[k] : { present: false, rawName: null };
  }

  // Optional Phase 3B-0 probe report (attached by the app at import time). Catalog-only
  // unless the probe found candidate sample regions → then a conservative 'probe_available'.
  const probe = (bmsResult && bmsResult.probe) || null;
  const probeRegions = (probe && probe.candidateRegions) ? probe.candidateRegions.length : 0;
  const sampleProbe = !hasError && probeRegions > 0;
  const RANK = { low: 0, medium: 1, high: 2 };
  const probeSummary = probe ? {
    regionCount: probeRegions,
    bestConfidence: (probe.candidateRegions || []).reduce((b, r) => (RANK[r.confidence] > RANK[b] ? r.confidence : b), 'low'),
    hasTimebaseClue: (probe.timebaseClues || []).length > 0,
    encodingCandidates: Object.keys(probe.candidateEncodings || {}).filter(k => probe.candidateEncodings[k] && probe.candidateEncodings[k].plausible),
    diagnostics: probe.diagnostics || [],
  } : null;

  // Optional Phase 3B-1 raw extraction report (attached by the app at import time).
  const raw = (bmsResult && bmsResult.raw) || null;
  const rawCount = (raw && raw.rawSeriesCandidates) ? raw.rawSeriesCandidates.length : 0;
  const rawCandidates = !hasError && rawCount > 0;
  const rawSummary = raw ? {
    seriesCount: rawCount,
    bestEncoding: (raw.rawSeriesCandidates && raw.rawSeriesCandidates[0]) ? raw.rawSeriesCandidates[0].encoding : null,
    channelMapping: raw.channelMapping ? raw.channelMapping.status : 'not_mapped',
    timebasePresent: !!(raw.timebaseCandidate && raw.timebaseCandidate.present),
    diagnostics: raw.diagnostics || [],
  } : null;

  // Optional Phase 3C-0 channel-linking hypotheses (attached by the app at import time).
  const link = (bmsResult && bmsResult.link) || null;
  const hasLink = !hasError && !!(link && (link.channelIdentityHypotheses || []).length > 0);
  const linkSummary = link ? {
    identityCount: (link.channelIdentityHypotheses || []).length,
    channelIdentityConfirmed: false, // 3C-0 never confirms identity
    canonicalPreviewAvailable: !!(link.canonicalPreview && link.canonicalPreview.available),
    diagnostics: link.diagnostics || [],
  } : null;

  // Optional Phase 3D-0 confirmation decision (attached by the app at import time). Surfaces
  // the hypothesis→confirmed decision WITHOUT changing the primary status or any decode-grade
  // capability — a confirmed catalog / structure is still not confirmed telemetry.
  const confirmation = (bmsResult && bmsResult.confirmation) || null;
  const hasConfirmation = !hasError && !!confirmation;
  const confirmationSummary = confirmation ? {
    status: confirmation.status,
    overallScore: confirmation.scores ? confirmation.scores.overallScore : 0,
    decisions: confirmation.decisions || {},
    blockers: confirmation.blockers || [],
    nextEvidenceNeeded: confirmation.nextEvidenceNeeded || [],
    diagnostics: confirmation.diagnostics || [],
  } : null;

  // Optional Phase 3D-1 sample-structure discovery (attached by the app at import time).
  // Surfaces structure HYPOTHESES (per-channel blocks / offset table / interleaved / compressed)
  // WITHOUT changing the primary status or any decode-grade capability — never telemetry-ready.
  const structure = (bmsResult && bmsResult.structure) || null;
  const hasStructure = !hasError && !!structure;
  const pce = (structure && structure.perChannelEvidence) || {};
  const structureSummary = structure ? {
    status: structure.status,
    hypothesisTypes: (structure.structureHypotheses || []).map(h => h.type),
    candidateChannelBlocks: pce.candidateChannelBlocks || 0,
    countRelation: pce.countRelation || 'unknown',
    expectedChannelCount: pce.expectedChannelCount || 0,
    offsetTableCandidate: (structure.channelTableCandidates || []).some(t => t.kind === 'offset_table' && t.targetsPlausible),
    perChannelBlockCandidate: !!(structure.confirmationFeed && structure.confirmationFeed.perChannelBlockCountCandidate),
    interleavedCandidate: (structure.structureHypotheses || []).some(h => h.type === 'interleaved_channels'),
    converged: !!(structure.convergence && structure.convergence.sampleStructureConverged),
    diagnostics: structure.diagnostics || [],
  } : null;

  // Optional Phase 3D-2 raw-stream confirmation (attached by the app at import time). Surfaces the
  // raw-stream confirmation decision WITHOUT changing the primary status or any decode-grade
  // capability — a confirmed raw stream STRUCTURE is still not channel identity / physical values.
  const rawStream = (bmsResult && bmsResult.rawStreamConfirmation) || null;
  const hasRawStream = !hasError && !!rawStream;
  const rawStreamSummary = rawStream ? {
    status: rawStream.status,
    confirmedRawStreamCount: rawStream.aggregateDecision ? rawStream.aggregateDecision.confirmedRawStreamCount : 0,
    partialRawStreamCount: rawStream.aggregateDecision ? rawStream.aggregateDecision.partialRawStreamCount : 0,
    rejectedCandidateCount: rawStream.aggregateDecision ? rawStream.aggregateDecision.rejectedCandidateCount : 0,
    canConfirmAnyRawStream: !!(rawStream.aggregateDecision && rawStream.aggregateDecision.canConfirmAnyRawStream),
    crossFileStable: !!(rawStream.criteria && rawStream.criteria.crossFileStable),
    diagnostics: rawStream.diagnostics || [],
  } : null;

  // Optional Phase 3E-0 channel-identity confirmation (attached by the app at import time). Surfaces
  // the identity DECISION without changing the primary status or any decode-grade capability — on
  // real imported data (no independent evidence) it is always not_confirmed, and physical values /
  // timebase / canonical telemetry remain unavailable regardless.
  const identity = (bmsResult && bmsResult.channelIdentity) || null;
  const hasIdentity = !hasError && !!identity;
  const idAgg = (identity && identity.aggregateDecision) || {};
  const identitySummary = identity ? {
    status: identity.status,
    channelIdentityConfirmed: !!idAgg.canConfirmAnyChannelIdentity,   // false on all real data
    confirmedIdentityCount: idAgg.confirmedIdentityCount || 0,
    candidateCount: idAgg.candidateCount || 0,
    physicalValuesAvailable: false,
    timebaseConfirmed: false,
    canonicalTelemetry: false,
    diagnostics: identity.diagnostics || [],
  } : null;

  // Optional Phase 3E-1 timebase confirmation (attached by the app at import time). Surfaces the
  // STRUCTURAL timebase decision without changing the primary status or any decode-grade capability —
  // on real imported data it is never confirmed, and physical values / units / canonical telemetry
  // remain unavailable regardless. A confirmed timebase is structural only (not physical time).
  const timebase = (bmsResult && bmsResult.timebase) || null;
  const hasTimebase = !hasError && !!timebase;
  const tbAgg = (timebase && timebase.aggregateDecision) || {};
  const timebaseSummary = timebase ? {
    status: timebase.status,
    timebaseConfirmed: !!tbAgg.canConfirmTimebase,   // structural only; false on all real data
    candidateCount: tbAgg.candidateCount || 0,
    confirmedCount: tbAgg.confirmedCount || 0,
    manualSampleRateHint: !!timebase.manualSampleRateHint,
    physicalValuesAvailable: false,
    unitsConfirmed: false,
    canonicalTelemetry: false,
    diagnostics: timebase.diagnostics || [],
  } : null;

  // Optional Phase 3F-0 physical scaling confirmation (attached by the app at import time). Surfaces
  // the scaling / units / canonical-value-eligibility decision. On real imported data it is never
  // confirmed (no corpus → no confirmed raw stream/identity/timebase), so physical values / units /
  // canonical telemetry remain unavailable; manual scale is only a fallback hint.
  const scaling = (bmsResult && bmsResult.physicalScaling) || null;
  const hasScaling = !hasError && !!scaling;
  const scAgg = (scaling && scaling.aggregateDecision) || {};
  const scalingConfirmed = !!scAgg.canConfirmPhysicalScaling;       // synthetic-only; false on real data
  const scalingUnitsConfirmed = !!(scaling && scaling.unitsConfirmed);
  const scalingSummary = scaling ? {
    status: scaling.status,
    physicalScalingConfirmed: scalingConfirmed,
    unitsConfirmed: scalingUnitsConfirmed,
    physicalValuesAvailable: !!scaling.physicalValuesAvailable,
    canonicalValueEligibility: !!scaling.canonicalValueEligibility,
    canonicalValuesAvailable: false,
    manualScaleHint: !!scaling.manualScaleHint,
    candidateCount: scAgg.candidateCount || 0,
    confirmedCount: scAgg.confirmedCount || 0,
    diagnostics: scaling.diagnostics || [],
  } : null;

  // Optional Phase 3F-1 telemetry readiness (attached by the app at import time). A GATE, not analysis.
  // On real imported data it is never ready (raw stream / identity / timebase / scaling not confirmed);
  // handling analysis / overlay / Kus / setup remain disabled regardless. Readiness ≠ analysis result.
  const readiness = (bmsResult && bmsResult.readiness) || null;
  const hasReadiness = !hasError && !!readiness;
  const rdAgg = (readiness && readiness.aggregateDecision) || {};
  const telemetryReady = !!rdAgg.canBeReadyForAnalysis;            // synthetic-only; false on real data
  const readinessSummary = readiness ? {
    status: readiness.status,
    readinessLevel: readiness.readinessLevel,
    telemetryReady,
    analysisProfile: readiness.analysisProfile,
    requiredChannelCount: readiness.requiredChannelCount || 0,
    readyChannelCount: readiness.readyChannelCount || 0,
    missingRequiredChannelCount: readiness.missingRequiredChannelCount || 0,
    sampleRateAdequacy: readiness.sampleRateAdequacy,
    syncQuality: readiness.syncQuality,
    dropoutQuality: readiness.dropoutQuality,
    handlingAnalysisEnabled: false,
    blockers: readiness.blockers || [],
    diagnostics: readiness.diagnostics || [],
  } : null;

  // Optional Phase 3G-0A measured extraction eligibility (attached by the app at import time). An
  // input-contract GATE, not extraction. On real imported data it is never eligible (telemetry
  // readiness is never ready); measured handling response / tendency / Kus / overlay / model-vs-actual
  // remain disabled regardless. Eligibility ≠ a measured handling response.
  const extraction = (bmsResult && bmsResult.extractionEligibility) || null;
  const hasExtraction = !hasError && !!extraction;
  const exAgg = (extraction && extraction.aggregateDecision) || {};
  const extractionEligible = !!exAgg.canBeEligibleForExtraction;   // synthetic-only; false on real data
  const extractionSummary = hasExtraction ? {
    status: extraction.status,
    eligibilityLevel: extraction.eligibilityLevel,
    extractionEligible,
    extractionProfile: extraction.extractionProfile,
    requiredChannelCount: extraction.requiredChannelCount || 0,
    eligibleChannelCount: extraction.eligibleChannelCount || 0,
    missingRequiredChannelCount: extraction.missingRequiredChannelCount || 0,
    measuredResponseAvailable: false,
    handlingAnalysisEnabled: false,
    blockers: extraction.blockers || [],
    diagnostics: extraction.diagnostics || [],
  } : null;

  // Optional Phase 3G-0B measured-extraction harness (attached by the app at import time). A SYNTHETIC
  // harness, not real extraction. On real imported data it is never available (eligibility gate not
  // passed + no synthetic series); no real measured handling response / tendency / Kus / overlay /
  // model-vs-actual is produced; realDataUsed is always false.
  const measExt = (bmsResult && bmsResult.measuredExtraction) || null;
  const hasMeasExt = !hasError && !!measExt;
  const mxAgg = (measExt && measExt.aggregateDecision) || {};
  const measuredExtractionSynthetic = !!mxAgg.canExtractSynthetic;   // synthetic-only; false on real data
  const measuredExtractionSummary = hasMeasExt ? {
    status: measExt.status,
    extractionLevel: measExt.extractionLevel,
    measuredExtractionSynthetic,
    syntheticOnly: !!measExt.syntheticOnly,
    realDataUsed: false,
    cornerCount: measExt.cornerCount || 0,
    extractedCornerCount: measExt.extractedCornerCount || 0,
    steadyStateWindowCount: measExt.steadyStateWindowCount || 0,
    tendencyProxyCount: measExt.tendencyProxyCount || 0,
    measuredResponseAvailable: false,
    handlingAnalysisEnabled: false,
    blockers: measExt.blockers || [],
    diagnostics: measExt.diagnostics || [],
  } : null;

  // Optional Phase 3G-1 canonical-adapter eligibility (attached by the app at import time). A BOUNDARY
  // check, not extraction. On real imported data it is never adapter-ready (confirmed raw stream /
  // identity / timebase / scaling / units / corpus are missing); no real canonical series / time-series
  // / measured extraction is produced; realDataUsed is always false.
  const cadapter = (bmsResult && bmsResult.canonicalAdapter) || null;
  const hasCadapter = !hasError && !!cadapter;
  const caAgg = (cadapter && cadapter.aggregateDecision) || {};
  const canonicalAdapterEligible = !!caAgg.canEnterCanonicalAdapter;   // synthetic-only; false on real data
  const canonicalAdapterSummary = hasCadapter ? {
    status: cadapter.status,
    adapterEligibilityLevel: cadapter.adapterEligibilityLevel,
    canonicalAdapterEligible,
    realDataUsed: false,
    prerequisites: cadapter.prerequisites || {},
    blockerCount: caAgg.blockerCount || 0,
    canonicalSeriesAvailable: false,
    blockers: cadapter.blockers || [],
    diagnostics: cadapter.diagnostics || [],
  } : null;

  // Optional Phase 3G-2 private-corpus boundary (attached by the app at import time). A local-only
  // evidence-ingestion POLICY check, not extraction. On the single-file import path it is not_available
  // (no corpus manifest); it never confirms telemetry, never makes canonical telemetry available, and
  // realDataUsed is always false.
  const pcorpus = (bmsResult && bmsResult.privateCorpus) || null;
  const hasPcorpus = !hasError && !!pcorpus;
  const pcAgg = (pcorpus && pcorpus.aggregateDecision) || {};
  const privateCorpusEvidenceAvailable = !!pcAgg.canUsePrivateCorpusEvidence;   // safe-boundary only
  const privateCorpusSummary = hasPcorpus ? {
    status: pcorpus.status,
    boundaryLevel: pcorpus.boundaryLevel,
    privateCorpusEvidenceAvailable,
    realDataUsed: false,
    manifestSummary: pcorpus.manifestSummary || null,
    evidenceSummary: pcorpus.evidenceSummary || {},
    blockerCount: pcAgg.blockerCount || 0,
    rawStreamConfirmed: false, identityConfirmed: false, timebaseConfirmed: false,
    scalingConfirmed: false, unitsConfirmed: false, canonicalTelemetry: false,
    blockers: pcorpus.blockers || [],
    diagnostics: pcorpus.diagnostics || [],
  } : null;

  // Optional Phase 3G-3 sanitized-evidence adapter DRY-RUN shape (attached by the app at import time).
  // A dry-run evidence-shaping layer, not extraction / confirmation. On the single-file import path the
  // 3G-2 boundary is not ready, so it is boundary_not_ready; even at dry_run_ready it never confirms raw
  // stream / identity / timebase / scaling / units, never makes the canonical adapter eligible or
  // canonical telemetry available, and realDataUsed is always false.
  const sadapter = (bmsResult && bmsResult.sanitizedEvidenceAdapter) || null;
  const hasSadapter = !hasError && !!sadapter;
  const saAgg = (sadapter && sadapter.aggregateDecision) || {};
  const adapterEvidenceShapeAvailable = !!saAgg.canProvideAdapterEvidenceShape;   // dry-run shape only; false on the single-file import path
  const sanitizedEvidenceAdapterSummary = hasSadapter ? {
    status: sadapter.status,
    adapterEvidenceLevel: sadapter.adapterEvidenceLevel,
    adapterEvidenceShapeAvailable,
    realDataUsed: false,
    presentScopeCount: (sadapter.evidenceShape && sadapter.evidenceShape.presentScopeCount) || 0,
    missingScopeCount: (sadapter.evidenceShape && sadapter.evidenceShape.missingScopeCount) || 0,
    blockerCount: saAgg.blockerCount || 0,
    rawStreamConfirmed: false, identityConfirmed: false, timebaseConfirmed: false,
    scalingConfirmed: false, unitsConfirmed: false,
    canonicalAdapterEligible: false, canonicalTelemetry: false, timeSeries: false,
    blockers: sadapter.blockers || [],
    diagnostics: sadapter.diagnostics || [],
  } : null;

  return {
    sourceType: 'bmsbin',
    sourceFileName: (bmsResult && bmsResult.fileName) || null,
    parser: 'parseBms',
    status: hasError ? 'decode_error'
      : (hasLink ? 'linking_hypotheses_only'
        : (rawCandidates ? 'raw_candidates_only'
          : (sampleProbe ? 'probe_available' : 'catalog_only'))),
    importer: (bmsResult && bmsResult.header && bmsResult.header.importer) || null,
    channelCount: (bmsResult && bmsResult.channelCount) || 0,
    channels,
    requiredChannels,
    capabilities: {
      channelCatalog: !hasError,
      sampleProbe,                  // Phase 3B-0: candidate sample regions found
      rawTimeSeriesCandidates: rawCandidates, // Phase 3B-1: raw series extracted (not decoded)
      channelLinkingHypotheses: hasLink,      // Phase 3C-0: identity/timebase hypotheses
      scalingHypotheses: !!(link && (link.scalingHypotheses || []).length > 0), // Phase 3C-0
      confirmationCriteria: hasConfirmation,  // Phase 3D-0: hypothesis→confirmed decision present
      sampleStructureDiscovery: hasStructure, // Phase 3D-1: structure hypotheses present (not confirmed)
      rawStreamConfirmation: hasRawStream,    // Phase 3D-2: raw-stream confirmation criteria present
      channelIdentityConfirmation: hasIdentity, // Phase 3E-0: identity confirmation criteria present
      channelIdentityConfirmed: !!idAgg.canConfirmAnyChannelIdentity, // false on all real data
      timebaseConfirmation: hasTimebase,        // Phase 3E-1: timebase confirmation criteria present
      timebaseConfirmed: !!tbAgg.canConfirmTimebase, // structural only; false on all real data
      physicalScalingConfirmation: hasScaling,  // Phase 3F-0: scaling confirmation criteria present
      physicalScaling: scalingConfirmed,        // Phase 3F-0: synthetic-only true; false on all real data
      unitsConfirmed: scalingUnitsConfirmed,    // Phase 3F-0: synthetic-only true; false on all real data
      telemetryReadinessConfirmation: hasReadiness, // Phase 3F-1: readiness gate criteria present
      telemetryReady,                           // Phase 3F-1: synthetic-only true; false on all real data
      extractionEligibilityCriteria: hasExtraction, // Phase 3G-0A: extraction input-contract gate present
      extractionEligible,                       // Phase 3G-0A: synthetic-only true; false on all real data
      measuredExtractionHarness: hasMeasExt,    // Phase 3G-0B: synthetic harness criteria present
      measuredExtractionSynthetic,              // Phase 3G-0B: synthetic-only true; false on all real data
      measuredExtraction: false,                // real measured extraction never produced (synthetic harness only)
      canonicalAdapterEligibilityCriteria: hasCadapter, // Phase 3G-1: canonical-adapter boundary gate present
      canonicalAdapterEligible,                 // Phase 3G-1: synthetic-only true; false on all real data
      privateCorpusBoundaryCriteria: hasPcorpus, // Phase 3G-2: private-corpus boundary policy present
      privateCorpusEvidenceAvailable,           // Phase 3G-2: safe-boundary only; false on the single-file import path
      sanitizedEvidenceAdapterCriteria: hasSadapter, // Phase 3G-3: sanitized-evidence adapter dry-run criteria present
      adapterEvidenceShapeAvailable,            // Phase 3G-3: dry-run shape only; false on the single-file import path
      measuredHandlingResponse: false,          // 3G-0A/0B/3G-1/3G-2/3G-3 are gates/policy/dry-run, not a real response
      timeSeries: false,            // not confirmed usable telemetry
      canonicalTelemetry: false,    // never produced / usable yet (eligibility ≠ available)
      handlingAnalysis: false,      // readiness is a gate, not analysis
      overlayEnabled: false,        // no overlay
      kus: false,                   // no Kus / understeer gradient
      setupRecommendation: false,   // no setup advice from telemetry
      lapSegmentation: false,       // later
      handlingCorrelation: false,   // later
      modelVsActual: false,         // later — pinned false so the UI-authoritative block is complete
    },
    probe: probeSummary,
    rawExtraction: rawSummary,
    linking: linkSummary,
    confirmation: confirmationSummary,
    structure: structureSummary,
    rawStreamConfirmation: rawStreamSummary,
    channelIdentity: identitySummary,
    timebase: timebaseSummary,
    physicalScaling: scalingSummary,
    readiness: readinessSummary,
    extractionEligibility: extractionSummary,
    measuredExtraction: measuredExtractionSummary,
    canonicalAdapter: canonicalAdapterSummary,
    privateCorpus: privateCorpusSummary,
    sanitizedEvidenceAdapter: sanitizedEvidenceAdapterSummary,
    diagnostics,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildTelemetryMetadata, validateTelemetryCatalog };
}
