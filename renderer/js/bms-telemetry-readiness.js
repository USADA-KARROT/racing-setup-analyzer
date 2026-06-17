/**
 * bms-telemetry-readiness.js — .bmsbin TELEMETRY READINESS / data-quality GATE (Phase 3F-1)
 *
 * This is a GATE, not an analysis. It answers ONE question: is this telemetry sufficiently confirmed
 * and complete to support a LATER handling-analysis phase? If not, what is missing? It performs NO
 * analysis, builds NO telemetry series / chart, enables NO overlay / Kus / setup recommendation /
 * model-vs-actual, and never makes real/imported single-file data usable.
 *
 * Core principle: **readiness is not analysis.** ready_for_analysis only means the prerequisites and
 * quality are confirmed enough to ENTER a later phase — it does not tell the user how the car drives
 * or how to set it up. A dataset cannot be ready unless: canonical-telemetry eligibility is confirmed,
 * required channels are confirmed (not guessed) with confirmed scaling + units, timebase is confirmed,
 * sample-rate / sync / dropout / noise quality pass, and the evidence is corpus-backed.
 *
 * Red lines (always held): no overlay, lap comparison, Kus, setup recommendation, handling
 * correlation, model-vs-actual, driving-behaviour interpretation, physical telemetry chart, automatic
 * channel naming, automatic scaling/units, inferred physical values. A real/imported single file can
 * NEVER reach ready_for_analysis (its raw stream / identity / timebase / scaling are not confirmed).
 * Required-channel keys are an ABSTRACT profile schema — never displayed as a named channel found in
 * real data. capabilities handlingAnalysis / overlayEnabled / kus / handlingCorrelation /
 * setupRecommendation / canonicalTelemetry stay false on EVERY path (even synthetic ready).
 * `.bmsbin` is an adapter; output flows back to the source-agnostic descriptor. Clean-room.
 */

// Abstract analysis profiles — REQUIRED EVIDENCE only, never executed, never naming real channels.
const _READINESS_PROFILES = {
  basicTelemetryReadiness: ['primary_signal'],
  handlingReadiness: ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'],
  advancedVehicleDynamicsReadiness: ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel', 'throttle'],
};

const _RD_RANK = {
  not_ready: 0, insufficient_prerequisites: 1, missing_required_channels: 2, quality_blocked: 3,
  partial_readiness: 4, candidate_readiness: 5, confirmable_readiness: 6, ready_for_analysis: 7,
};

/**
 * Evaluate telemetry readiness for a later analysis phase.
 * @param {object} rawStreamConfirmation Phase 3D-2 output
 * @param {object} channelIdentity       Phase 3E-0 output
 * @param {object} timebase              Phase 3E-1 output
 * @param {object} physicalScaling       Phase 3F-0 output
 * @param {object} opts  { corpus, analysisProfile, confirmedChannels: [profileKey…],
 *                         qualityEvidence: {sampleRateAdequate, syncQualityAdequate, dropoutOk, noiseOk} }
 */
function evaluateBmsTelemetryReadiness(rawStreamConfirmation, channelIdentity, timebase, physicalScaling, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const corpus = opts.corpus || null;
  const corpusOk = !!(corpus && corpus.fileCount >= 2 && corpus.candidateRegionStable && corpus.channelCountStable === true);

  // upstream confirmations (authoritative aggregate decisions only — never a status string)
  const rawStreamConfirmed = !!(rawStreamConfirmation && rawStreamConfirmation.aggregateDecision && rawStreamConfirmation.aggregateDecision.canConfirmAnyRawStream === true);
  const identityConfirmed = !!(channelIdentity && channelIdentity.aggregateDecision && channelIdentity.aggregateDecision.canConfirmAnyChannelIdentity === true);
  const timebaseConfirmed = !!(timebase && timebase.aggregateDecision && timebase.aggregateDecision.canConfirmTimebase === true);
  const scalingConfirmed = !!(physicalScaling && physicalScaling.aggregateDecision && physicalScaling.aggregateDecision.canConfirmPhysicalScaling === true);
  const unitsConfirmed = !!(physicalScaling && physicalScaling.unitsConfirmed === true);
  const canonicalEligible = !!(physicalScaling && physicalScaling.canonicalValueEligibility === true);
  const anyPrereq = rawStreamConfirmed || identityConfirmed || timebaseConfirmed || scalingConfirmed || unitsConfirmed || canonicalEligible;
  const prereqsMet = rawStreamConfirmed && identityConfirmed && timebaseConfirmed && scalingConfirmed && unitsConfirmed && canonicalEligible && corpusOk;

  // required-channel checklist for the (abstract) analysis profile
  const profileKey = (typeof opts.analysisProfile === 'string' && _READINESS_PROFILES[opts.analysisProfile]) ? opts.analysisProfile : 'handlingReadiness';
  const requiredChannels = (opts.analysisProfile && Array.isArray(opts.analysisProfile.requiredChannels))
    ? opts.analysisProfile.requiredChannels : _READINESS_PROFILES[profileKey];
  const confirmedChannels = Array.isArray(opts.confirmedChannels) ? opts.confirmedChannels : [];
  const perChannelReadiness = requiredChannels.map(k => ({ channelKey: k, confirmed: confirmedChannels.includes(k), status: confirmedChannels.includes(k) ? 'confirmed' : 'missing' }));
  const readyChannelCount = perChannelReadiness.filter(c => c.confirmed).length;
  const missingRequiredChannelCount = requiredChannels.length - readyChannelCount;
  const channelsComplete = requiredChannels.length > 0 && missingRequiredChannelCount === 0;

  // quality buckets (fail-closed: unknown blocks readiness)
  const q = opts.qualityEvidence || {};
  const sampleRateAdequacy = q.sampleRateAdequate === true ? 'adequate' : (q.sampleRateAdequate === false ? 'insufficient' : 'unconfirmed');
  const syncQuality = q.syncQualityAdequate === true ? 'adequate' : (q.syncQualityAdequate === false ? 'insufficient' : 'unconfirmed');
  const dropoutQuality = q.dropoutOk === true ? 'pass' : (q.dropoutOk === false ? 'blocked' : 'unknown');
  const noiseQuality = q.noiseOk === true ? 'pass' : (q.noiseOk === false ? 'blocked' : 'unknown');
  const qualityBlocked = sampleRateAdequacy === 'insufficient' || syncQuality === 'insufficient' || dropoutQuality === 'blocked' || noiseQuality === 'blocked';
  const qualityAllAdequate = sampleRateAdequacy === 'adequate' && syncQuality === 'adequate' && dropoutQuality === 'pass' && noiseQuality === 'pass';
  const qualityHasEvidence = [q.sampleRateAdequate, q.syncQualityAdequate, q.dropoutOk, q.noiseOk].some(v => v !== undefined);

  const ready = prereqsMet && channelsComplete && qualityAllAdequate;

  // ── status ladder ──
  let status;
  if (ready) status = 'ready_for_analysis';
  else if (prereqsMet && channelsComplete && qualityBlocked) status = 'quality_blocked';
  else if (prereqsMet && channelsComplete) status = qualityHasEvidence ? 'confirmable_readiness' : 'candidate_readiness';
  else if (prereqsMet && !channelsComplete) status = readyChannelCount > 0 ? 'partial_readiness' : 'missing_required_channels';
  else if (anyPrereq) status = 'insufficient_prerequisites';
  else status = 'not_ready';

  const blockers = [];
  if (!rawStreamConfirmed) blockers.push('raw stream structure is not confirmed');
  if (!identityConfirmed) blockers.push('channel identity is not confirmed');
  if (!timebaseConfirmed) blockers.push('timebase is not confirmed');
  if (!scalingConfirmed) blockers.push('physical scaling is not confirmed');
  if (!unitsConfirmed) blockers.push('units are not confirmed');
  if (!canonicalEligible) blockers.push('canonical telemetry is not eligible');
  if (!corpusOk) blockers.push('cross-file corpus required');
  if (!channelsComplete) blockers.push('required confirmed channels are missing (' + missingRequiredChannelCount + ' of ' + requiredChannels.length + ')');
  if (sampleRateAdequacy !== 'adequate') blockers.push('sample-rate adequacy not confirmed');
  if (syncQuality !== 'adequate') blockers.push('sync quality not confirmed');
  if (dropoutQuality !== 'pass') blockers.push('dropout / gap quality not confirmed');
  if (noiseQuality !== 'pass') blockers.push('noise quality not confirmed');

  const warnings = [];
  if (dropoutQuality === 'unknown') warnings.push('dropout quality unknown — treated as not passing (fail-closed)');
  if (noiseQuality === 'unknown') warnings.push('noise quality unknown — treated as supporting evidence only');

  const aggregateDecision = {
    canBeReadyForAnalysis: ready,
    readyCount: ready ? 1 : 0,
    candidateCount: (_RD_RANK[status] >= _RD_RANK.partial_readiness && !ready) ? 1 : 0,
    reason: ready
      ? 'all confirmation prerequisites, required channels and data-quality checks pass over a corpus (synthetic only in 3F-1)'
      : 'telemetry is not ready for analysis — readiness is a gate, not an analysis result; missing prerequisites / channels / quality must be resolved first',
  };

  const confirmationFeed = { telemetryReady: ready, readinessLevel: status };

  // ── capabilities (analysis / overlay / Kus / handling / setup pinned false on EVERY path) ──
  const capabilities = {
    rawStreamConfirmation: !!rawStreamConfirmation,
    channelIdentityConfirmation: !!channelIdentity,
    timebaseConfirmation: !!timebase,
    physicalScalingConfirmation: !!physicalScaling,
    telemetryReadiness: ready,        // synthetic-only true; real data always false
    handlingAnalysis: false, canonicalTelemetry: false, overlayEnabled: false, kus: false,
    handlingCorrelation: false, setupRecommendation: false, timeSeries: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_READINESS_RUN', 'telemetry.readiness.info.run', 'high'));
  if (perChannelReadiness.length) diagnostics.push(D('info', 'BMS_READINESS_CHECKLIST_EVALUATED', 'telemetry.readiness.info.checklistEvaluated', 'low'));
  if (!ready) diagnostics.push(D('warning', 'BMS_READINESS_NOT_READY', 'telemetry.readiness.warning.notReady'));
  if (!prereqsMet) diagnostics.push(D('warning', 'BMS_READINESS_MISSING_PREREQUISITES', 'telemetry.readiness.warning.missingPrerequisites'));
  if (prereqsMet && !channelsComplete) diagnostics.push(D('warning', 'BMS_READINESS_MISSING_REQUIRED_CHANNELS', 'telemetry.readiness.warning.missingRequiredChannels'));
  if (sampleRateAdequacy !== 'adequate') diagnostics.push(D('warning', 'BMS_READINESS_SAMPLE_RATE_NOT_CONFIRMED', 'telemetry.readiness.warning.sampleRateNotConfirmed'));
  if (syncQuality !== 'adequate') diagnostics.push(D('warning', 'BMS_READINESS_SYNC_NOT_CONFIRMED', 'telemetry.readiness.warning.syncNotConfirmed'));
  if (dropoutQuality !== 'pass') diagnostics.push(D('warning', 'BMS_READINESS_DROPOUT_NOT_CONFIRMED', 'telemetry.readiness.warning.dropoutNotConfirmed'));
  diagnostics.push(D('warning', 'BMS_READINESS_GATE_NOT_ANALYSIS', 'telemetry.readiness.warning.gateNotAnalysis'));
  diagnostics.push(D('warning', 'BMS_READINESS_NO_HANDLING_ANALYSIS', 'telemetry.readiness.warning.noHandlingAnalysis'));
  diagnostics.push(D('info', 'BMS_READINESS_NEXT_EVIDENCE_NEEDED', 'telemetry.readiness.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'telemetry_readiness', status,
    reason: aggregateDecision.reason,
    readinessLevel: status,
    evidenceLevel: status,
    inputs: {
      rawStreamConfirmed, identityConfirmed, timebaseConfirmed, scalingConfirmed, unitsConfirmed, canonicalEligible,
      hasCorpusEvidence: corpusOk,
    },
    analysisProfile: profileKey,
    requiredChannelCount: requiredChannels.length,
    readyChannelCount, missingRequiredChannelCount,
    perChannelReadiness,
    sampleRateAdequacy, syncQuality, dropoutQuality, noiseQuality,
    blockers, warnings,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      ready
        ? 'telemetry readiness gate passed (synthetic) — this is NOT a handling analysis result; no overlay/Kus/setup is enabled'
        : 'telemetry not ready for analysis (readiness is a gate, not an analysis result)',
      'no handling analysis performed',
      'no overlay / Kus / setup recommendation',
      'no model-vs-actual result',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsTelemetryReadiness };
}
