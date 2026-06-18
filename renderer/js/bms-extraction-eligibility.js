/**
 * bms-extraction-eligibility.js — measured handling-response extraction INPUT CONTRACT &
 * ELIGIBILITY GATE (Phase 3G-0A)
 *
 * This is a CONTRACT + GATE, not an extraction. It answers ONE question: does this (already
 * readiness-gated) telemetry satisfy the INPUT CONTRACT required to later extract a measured
 * handling response (Phase 3G-0B)? If not, what is missing? It performs NO extraction, segments
 * NO corner, computes NO steering-vs-lateral-G / yaw response, produces NO measured tendency /
 * understeer-oversteer proxy, and never makes real/imported data eligible.
 *
 * Why this layer exists: the 3D–3F chain is metadata-level confirmation / readiness — it never
 * produces an actual time-series. Jumping straight to "extract entry/mid/exit tendency" would
 * skip the canonical measured-series / analysis-input contract and quietly become the first place
 * that invents numbers. 3G-0A defines that contract and gates eligibility; 3G-0B is the synthetic
 * extraction harness; real canonical-series extraction and measured handling response come later.
 *
 * Core principle: **eligibility is not extraction.** eligible_for_extraction only means the input
 * contract is satisfied enough to ENTER a later extraction phase — it does NOT tell the user how
 * the car drives. A dataset cannot be eligible unless: telemetry readiness is confirmed
 * (ready_for_analysis), a canonical measured series is available (time-aligned, gap-free, known
 * sample rate over confirmed canonical channels), the required extraction channels are present,
 * corner-segmentation prerequisites hold, entry/mid/exit windows are separable, and the evidence
 * is corpus-backed.
 *
 * Red lines (always held): no extraction, corner segmentation, steady-state result, measured
 * tendency, understeer/oversteer proxy, Kus, overlay, model-vs-actual, setup recommendation,
 * driving-behaviour interpretation. A real/imported single file can NEVER reach
 * eligible_for_extraction (its telemetry readiness is never ready). Required-channel keys are an
 * ABSTRACT profile schema — never displayed as a named channel found in real data. capabilities
 * measuredHandlingResponse / handlingAnalysis / overlayEnabled / kus / handlingCorrelation /
 * setupRecommendation / modelVsActual / canonicalTelemetry stay false on EVERY path (even
 * synthetic eligible). `.bmsbin` is an adapter; output flows back to the source-agnostic
 * descriptor. Clean-room — consumes only the already-evaluated readiness report (no raw bytes).
 */

// Abstract extraction profiles — REQUIRED EVIDENCE only, never executed, never naming real channels.
const _EXTRACTION_PROFILES = {
  handlingResponseExtraction: ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'],
};

// Minimum corner events needed before a measured tendency could be meaningful (abstract count).
const _MIN_CORNER_EVENTS = 3;

const _EX_RANK = {
  not_eligible: 0, prerequisites_unmet: 1, canonical_series_unavailable: 2,
  required_channels_unavailable: 3, partial_eligibility: 4, segmentation_prerequisites_unmet: 5,
  window_prerequisites_unmet: 6, corpus_unavailable: 7, eligible_for_extraction: 8,
};

// INPUT CONTRACT — what a measured handling-response extraction (3G-0B) requires as input.
// Abstract profile schema; never a named channel found in real data.
const EXTRACTION_INPUT_CONTRACT = {
  description: 'Required input for measured handling-response extraction (Phase 3G-0B). Abstract profile — never a named channel found in real data.',
  canonicalSeries: {
    requiredChannels: ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'],
    optionalChannels: ['throttle', 'longitudinal_accel'],
    properties: ['confirmed_canonical (identity + scaling + units + timebase)', 'time_aligned', 'gap_free', 'known_sample_rate'],
  },
  segmentation: {
    prerequisites: ['corner_events_detectable', 'minimum_corner_event_count', 'entry_mid_exit_separable', 'steady_state_identifiable'],
    minimumCornerEvents: _MIN_CORNER_EVENTS,
  },
  corpusBacked: true,
};

// OUTPUT CONTRACT — the SHAPE Phase 3G-0B will produce IF eligible. 3G-0A produces NONE of this.
// Measured-only proxy: NOT a full Kus, NOT model-vs-actual, NOT setup advice.
const EXTRACTION_OUTPUT_CONTRACT = {
  description: 'Shape Phase 3G-0B will produce if eligible. Phase 3G-0A produces none of it. Measured-only proxy — not a full Kus, not model-vs-actual, not setup advice.',
  perCorner: ['cornerId', 'entryWindow', 'midWindow', 'exitWindow'],
  windows: ['entry', 'mid', 'exit'],
  measuredTendency: {
    metric: 'understeer_oversteer_proxy',
    basis: ['steering_vs_lateral_g', 'yaw_response', 'brake_release', 'throttle_pickup'],
    perWindow: true,
    confidence: 'per_output',
  },
  redLines: ['measured_response_only', 'not_full_kus', 'not_model_vs_actual', 'not_setup_recommendation'],
};

/**
 * Evaluate whether telemetry is eligible for a later measured handling-response extraction phase.
 * @param {object} readiness Phase 3F-1 output (evaluateBmsTelemetryReadiness)
 * @param {object} opts  { corpus,
 *                         extractionProfile: profileKey | { requiredChannels: [...] },
 *                         canonicalSeriesEvidence: { canonicalChannels: [profileKey…], timeAligned,
 *                                                    gapFree, knownSampleRate },  // synthetic
 *                         segmentationEvidence: { cornerEventsDetectable, cornerEventCount,
 *                                                 entryMidExitSeparable, steadyStateIdentifiable } } // synthetic
 */
function evaluateBmsExtractionEligibility(readiness, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const corpus = opts.corpus || null;
  const corpusOk = !!(corpus && corpus.fileCount >= 2);

  // upstream readiness gate (authoritative aggregate decision + synthetic-only capability — never a status string)
  const readinessReady = !!(readiness && readiness.aggregateDecision
    && readiness.aggregateDecision.canBeReadyForAnalysis === true
    && readiness.capabilities && readiness.capabilities.telemetryReadiness === true);
  const readinessProgressed = !!(readiness && readiness.status && readiness.status !== 'not_ready');

  // required-channel checklist for the (abstract) extraction profile
  const profileKey = (typeof opts.extractionProfile === 'string' && _EXTRACTION_PROFILES[opts.extractionProfile]) ? opts.extractionProfile : 'handlingResponseExtraction';
  const requiredChannels = (opts.extractionProfile && Array.isArray(opts.extractionProfile.requiredChannels))
    ? opts.extractionProfile.requiredChannels : _EXTRACTION_PROFILES[profileKey];

  // canonical measured series evidence (synthetic only — real data carries none)
  const cse = opts.canonicalSeriesEvidence || {};
  const canonicalChannels = Array.isArray(cse.canonicalChannels) ? cse.canonicalChannels : [];
  const timeAligned = cse.timeAligned === true;
  const gapFree = cse.gapFree === true;
  const knownSampleRate = cse.knownSampleRate === true;
  const canonicalSeriesAvailable = readinessReady && canonicalChannels.length > 0 && timeAligned && gapFree && knownSampleRate;

  const perChannelEligibility = requiredChannels.map(k => ({
    channelKey: k, canonical: canonicalChannels.includes(k),
    status: canonicalChannels.includes(k) ? 'canonical' : 'missing',
  }));
  const eligibleChannelCount = perChannelEligibility.filter(c => c.canonical).length;
  const missingRequiredChannelCount = requiredChannels.length - eligibleChannelCount;
  const requiredChannelsAvailable = requiredChannels.length > 0 && missingRequiredChannelCount === 0;

  // corner-segmentation prerequisites (synthetic only)
  const seg = opts.segmentationEvidence || {};
  const cornerEventsDetectable = seg.cornerEventsDetectable === true;
  const cornerEventCount = Number.isFinite(seg.cornerEventCount) ? seg.cornerEventCount : 0;
  const segmentationPrerequisitesMet = cornerEventsDetectable && cornerEventCount >= _MIN_CORNER_EVENTS;

  // entry/mid/exit window prerequisites (synthetic only)
  const entryMidExitSeparable = seg.entryMidExitSeparable === true;
  const steadyStateIdentifiable = seg.steadyStateIdentifiable === true;
  const windowPrerequisitesMet = entryMidExitSeparable && steadyStateIdentifiable;

  const anyExtractionEvidence = canonicalChannels.length > 0 || timeAligned || gapFree || knownSampleRate
    || cornerEventsDetectable || cornerEventCount > 0 || entryMidExitSeparable || steadyStateIdentifiable;

  const eligible = readinessReady && corpusOk && canonicalSeriesAvailable && requiredChannelsAvailable
    && segmentationPrerequisitesMet && windowPrerequisitesMet;

  // ── status ladder (fail-closed; nearest-to-eligible first) ──
  let status;
  if (eligible) status = 'eligible_for_extraction';
  // every contract sub-check passes; only the cross-file corpus is missing — the nearest-to-eligible
  // non-eligible rung (kept distinct from prerequisites_unmet so the ladder stays monotonic and the
  // candidate count / next-evidence reflect "one corpus away", not "prerequisites missing").
  else if (readinessReady && canonicalSeriesAvailable && requiredChannelsAvailable && segmentationPrerequisitesMet && windowPrerequisitesMet && !corpusOk) status = 'corpus_unavailable';
  else if (readinessReady && canonicalSeriesAvailable && requiredChannelsAvailable && segmentationPrerequisitesMet && !windowPrerequisitesMet) status = 'window_prerequisites_unmet';
  else if (readinessReady && canonicalSeriesAvailable && requiredChannelsAvailable && !segmentationPrerequisitesMet) status = 'segmentation_prerequisites_unmet';
  else if (readinessReady && canonicalSeriesAvailable && !requiredChannelsAvailable) status = eligibleChannelCount > 0 ? 'partial_eligibility' : 'required_channels_unavailable';
  else if (readinessReady && !canonicalSeriesAvailable) status = 'canonical_series_unavailable';
  else if (anyExtractionEvidence || readinessProgressed) status = 'prerequisites_unmet';
  else status = 'not_eligible';

  const blockers = [];
  if (!readinessReady) blockers.push('telemetry readiness is not established (ready_for_analysis required)');
  if (!corpusOk) blockers.push('cross-file corpus required');
  if (readinessReady && !canonicalSeriesAvailable) blockers.push('canonical measured series unavailable (needs time-aligned, gap-free, known-rate confirmed canonical channels)');
  if (readinessReady && !requiredChannelsAvailable) blockers.push('required canonical channels are missing (' + missingRequiredChannelCount + ' of ' + requiredChannels.length + ')');
  if (readinessReady && !segmentationPrerequisitesMet) blockers.push('corner-segmentation prerequisites not met (detectable corner events ≥ ' + _MIN_CORNER_EVENTS + ')');
  if (readinessReady && !windowPrerequisitesMet) blockers.push('entry/mid/exit window prerequisites not met (separable windows + steady-state identifiable)');

  const warnings = [];
  if (eligible) warnings.push('eligibility is an input-contract gate, not a measured handling response — no extraction / tendency / Kus is produced');

  const nextEvidenceNeeded = [];
  if (!readinessReady) nextEvidenceNeeded.push('confirmed telemetry readiness (ready_for_analysis)');
  if (readinessReady && !canonicalSeriesAvailable) nextEvidenceNeeded.push('canonical measured series (time-aligned, gap-free, known rate)');
  if (readinessReady && canonicalSeriesAvailable && !requiredChannelsAvailable) nextEvidenceNeeded.push('remaining required canonical channels');
  if (readinessReady && !segmentationPrerequisitesMet) nextEvidenceNeeded.push('detectable corner events for segmentation');
  if (readinessReady && !windowPrerequisitesMet) nextEvidenceNeeded.push('separable entry/mid/exit windows + steady-state');
  if (status === 'corpus_unavailable') nextEvidenceNeeded.push('cross-file corpus evidence');

  const aggregateDecision = {
    canBeEligibleForExtraction: eligible,
    eligibleCount: eligible ? 1 : 0,
    candidateCount: (_EX_RANK[status] >= _EX_RANK.partial_eligibility && !eligible) ? 1 : 0,
    reason: eligible
      ? 'telemetry readiness, canonical measured series, required channels and segmentation/window prerequisites are satisfied over a corpus (synthetic only in 3G-0A) — this is extraction ELIGIBILITY, not a measured handling response'
      : 'not eligible for measured handling-response extraction — this is an input-contract eligibility gate, not extraction; real/imported data is never eligible (readiness / canonical series / required channels / segmentation prerequisites are not satisfied)',
  };

  const confirmationFeed = { extractionEligible: eligible, eligibilityLevel: status };

  // ── capabilities (extraction / analysis / overlay / Kus / model-vs-actual pinned false on EVERY path) ──
  const capabilities = {
    extractionEligibilityCriteria: true,
    extractionEligible: eligible,    // synthetic-only true; real data always false
    measuredHandlingResponse: false, handlingAnalysis: false, canonicalTelemetry: false,
    overlayEnabled: false, kus: false, handlingCorrelation: false, setupRecommendation: false,
    modelVsActual: false, timeSeries: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_EXTRACT_ELIGIBILITY_RUN', 'telemetry.extract.info.run', 'high'));
  if (perChannelEligibility.length) diagnostics.push(D('info', 'BMS_EXTRACT_CHECKLIST_EVALUATED', 'telemetry.extract.info.checklistEvaluated', 'low'));
  if (!eligible) diagnostics.push(D('warning', 'BMS_EXTRACT_NOT_ELIGIBLE', 'telemetry.extract.warning.notEligible'));
  if (!readinessReady) diagnostics.push(D('warning', 'BMS_EXTRACT_READINESS_NOT_MET', 'telemetry.extract.warning.readinessNotMet'));
  if (readinessReady && !canonicalSeriesAvailable) diagnostics.push(D('warning', 'BMS_EXTRACT_CANONICAL_SERIES_UNAVAILABLE', 'telemetry.extract.warning.canonicalSeriesUnavailable'));
  if (readinessReady && canonicalSeriesAvailable && !requiredChannelsAvailable) diagnostics.push(D('warning', 'BMS_EXTRACT_REQUIRED_CHANNELS_UNAVAILABLE', 'telemetry.extract.warning.requiredChannelsUnavailable'));
  if (readinessReady && !segmentationPrerequisitesMet) diagnostics.push(D('warning', 'BMS_EXTRACT_SEGMENTATION_PREREQS_UNMET', 'telemetry.extract.warning.segmentationPrereqsUnmet'));
  if (readinessReady && !windowPrerequisitesMet) diagnostics.push(D('warning', 'BMS_EXTRACT_WINDOW_PREREQS_UNMET', 'telemetry.extract.warning.windowPrereqsUnmet'));
  if (status === 'corpus_unavailable') diagnostics.push(D('warning', 'BMS_EXTRACT_CORPUS_REQUIRED', 'telemetry.extract.warning.corpusRequired'));
  diagnostics.push(D('warning', 'BMS_EXTRACT_CONTRACT_NOT_EXTRACTION', 'telemetry.extract.warning.contractNotExtraction'));
  diagnostics.push(D('warning', 'BMS_EXTRACT_NO_MEASURED_RESPONSE', 'telemetry.extract.warning.noMeasuredResponse'));
  if (nextEvidenceNeeded.length) diagnostics.push(D('info', 'BMS_EXTRACT_NEXT_EVIDENCE_NEEDED', 'telemetry.extract.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'extraction_eligibility', status,
    reason: aggregateDecision.reason,
    eligibilityLevel: status,
    evidenceLevel: status,
    inputs: {
      readinessReady, canonicalSeriesAvailable, requiredChannelsAvailable,
      segmentationPrerequisitesMet, windowPrerequisitesMet, hasCorpusEvidence: corpusOk,
    },
    extractionProfile: profileKey,
    requiredChannelCount: requiredChannels.length,
    eligibleChannelCount, missingRequiredChannelCount,
    perChannelEligibility,
    cornerEventCount,
    inputContract: EXTRACTION_INPUT_CONTRACT,
    outputContract: EXTRACTION_OUTPUT_CONTRACT,
    blockers, warnings, nextEvidenceNeeded,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      eligible
        ? 'extraction eligibility gate passed (synthetic) — this is NOT a measured handling response; no extraction / tendency / Kus / overlay / model-vs-actual is produced'
        : 'not eligible for measured handling-response extraction (this is an input-contract gate, not extraction)',
      'no measured handling response extracted',
      'no measured tendency / understeer-oversteer proxy',
      'no Kus / model-vs-actual / setup recommendation',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsExtractionEligibility, EXTRACTION_INPUT_CONTRACT, EXTRACTION_OUTPUT_CONTRACT };
}
