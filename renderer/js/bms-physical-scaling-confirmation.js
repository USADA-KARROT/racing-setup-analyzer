/**
 * bms-physical-scaling-confirmation.js — .bmsbin PHYSICAL SCALING / UNITS / CANONICAL-VALUE
 * confirmation CRITERIA (Phase 3F-0)
 *
 * This is the most safety-critical layer: it decides WHEN a raw value may be called a physical
 * value with a unit. It is NOT a decoder and does NOT make real data usable. It evaluates ONLY
 * evidence handed to it; it never infers scaling from waveform shape / range plausibility, and
 * never infers units from a channel name.
 *
 * Core principle: **a value that looks plausible is not a credible physical value.** Physical
 * scaling confirmation requires INDEPENDENT evidence. A physical value is only credible when ALL of:
 * raw stream confirmed · channel identity confirmed · timebase confirmed (if time-indexed) ·
 * scale source independently confirmed · unit source independently confirmed · transform explicitly
 * known and verified · mapping stable across a corpus · no dependence on overlay / Kus / setup.
 *
 * Red lines (always held): no overlay, lap comparison, Kus, setup recommendation, handling
 * correlation, driving-behaviour interpretation; no auto scaling from waveform shape; no auto units
 * from channel name; manual scale is only a fallback hint (never confirmed); plausible range is only
 * supporting evidence (never primary). A real/imported single file can NEVER set physicalScaling /
 * unitsConfirmed true. capabilities canonicalTelemetry / timeSeries / handlingCorrelation /
 * setupRecommendation / overlayEnabled stay false on EVERY path (even a synthetic confirmed case —
 * eligibility is not "usable telemetry"). `.bmsbin` is an adapter; output flows back to the
 * source-agnostic descriptor. Works on parsed reports + explicit evidence — clean-room.
 */

const _PS_RANK = {
  not_confirmed: 0, insufficient_evidence: 1, identity_missing: 2, timebase_missing: 3,
  scale_hint_only: 4, unit_hint_only: 5, scale_candidate: 6, unit_candidate: 7,
  transform_candidate: 8, confirmable_scaling: 9, confirmed_scaling: 10,
};

/**
 * Evaluate physical scaling / units / canonical-value confirmation criteria.
 * @param {object} rawStreamConfirmation evaluateBmsRawStreamConfirmation output (Phase 3D-2)
 * @param {object} channelIdentity       evaluateBmsChannelIdentityConfirmation output (Phase 3E-0)
 * @param {object} timebase              evaluateBmsTimebaseConfirmation output (Phase 3E-1)
 * @param {object} opts  { corpus, timeIndexed, manualScale,
 *                         scalingEvidence: {source, independent, stable, transformType, transformConfirmed},
 *                         unitEvidence: {source, independent, stable, unit}, plausibleRange }
 */
function evaluateBmsPhysicalScalingConfirmation(rawStreamConfirmation, channelIdentity, timebase, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const corpus = opts.corpus || null;
  const corpusOk = !!(corpus && corpus.fileCount >= 2 && corpus.candidateRegionStable && corpus.channelCountStable === true);
  const rawStreamConfirmed = !!(rawStreamConfirmation && rawStreamConfirmation.aggregateDecision && rawStreamConfirmation.aggregateDecision.canConfirmAnyRawStream === true);
  // Strict: trust only the authoritative aggregate decision (mirrors rawStreamConfirmed / timebaseConfirmed).
  // The status string must never override a `false` aggregate — in this most safety-critical module a
  // prerequisite cannot be satisfied by a label when the decision says otherwise.
  const identityConfirmed = !!(channelIdentity && channelIdentity.aggregateDecision && channelIdentity.aggregateDecision.canConfirmAnyChannelIdentity === true);
  const timeIndexed = opts.timeIndexed !== false;   // most telemetry is time-indexed
  const timebaseConfirmed = !!(timebase && timebase.aggregateDecision && timebase.aggregateDecision.canConfirmTimebase === true);

  // evidence (provided externally — synthetic in tests; NEVER derived from shape/range/name here)
  const scaleEv = opts.scalingEvidence || null;
  const unitEv = opts.unitEvidence || null;
  const manualScale = (opts.manualScale != null && Number.isFinite(opts.manualScale)) ? opts.manualScale : null;
  const plausibleRangeOnly = !!opts.plausibleRange;     // supporting evidence only — never primary

  const scaleIsManual = (scaleEv && scaleEv.source === 'manual') || (manualScale != null && !scaleEv);
  const scaleManualOnly = scaleIsManual && !(scaleEv && scaleEv.independent);
  const scaleIndependent = !!(scaleEv && scaleEv.source !== 'manual' && scaleEv.independent);
  const transformType = scaleEv ? (scaleEv.transformType || null) : null;
  const scaleFullyConfirmed = scaleIndependent && !!scaleEv.stable && !!scaleEv.transformConfirmed;
  const unitIndependent = !!(unitEv && unitEv.independent && unitEv.stable);
  const unitLabelOnly = !!(unitEv && !unitIndependent);

  // prerequisites for confirmed physical scaling (all must hold)
  const prereqsMet = rawStreamConfirmed && identityConfirmed && (!timeIndexed || timebaseConfirmed) && corpusOk;
  const confirmedScaling = prereqsMet && scaleFullyConfirmed && unitIndependent;

  const manualScaleHint = (manualScale != null || scaleIsManual)
    ? { value: manualScale, confirmed: false, note: 'fallback hint only — does not confirm scaling, units, or physical values' }
    : null;

  // ── status ladder ──
  let status;
  if (confirmedScaling) status = 'confirmed_scaling';
  else if (prereqsMet && scaleFullyConfirmed) status = 'confirmable_scaling';                 // scale done; units pending
  else if (prereqsMet && scaleIndependent && transformType) status = 'transform_candidate';   // transform proposed, not verified/stable
  else if (prereqsMet && unitIndependent) status = 'unit_candidate';
  else if (prereqsMet && scaleIndependent) status = 'scale_candidate';
  else if (scaleIndependent || unitIndependent) {
    // independent evidence exists but a prerequisite is missing — report which (deepest first)
    if (!rawStreamConfirmed || !identityConfirmed) status = 'identity_missing';
    else if (timeIndexed && !timebaseConfirmed) status = 'timebase_missing';
    else status = 'insufficient_evidence';
  }
  else if (unitLabelOnly) status = 'unit_hint_only';                                           // a unit label is not independent evidence
  else if (scaleManualOnly) status = 'scale_hint_only';                                        // a manual scale is only a hint
  else if (plausibleRangeOnly) status = 'scale_candidate';                                     // plausible range is supporting only — never confirmed
  else status = 'not_confirmed';

  const canConfirmPhysicalScaling = confirmedScaling;
  const unitsConfirmed = confirmedScaling;                 // units only confirmed inside a full confirmed scaling
  const physicalValuesAvailable = confirmedScaling;        // synthetic-only; real data never reaches it
  const canonicalValueEligibility = confirmedScaling;      // ELIGIBLE — not the same as produced/usable
  const canonicalValuesAvailable = false;                  // 3F-0 never PRODUCES canonical telemetry

  const isCandidate = _PS_RANK[status] >= _PS_RANK.scale_candidate && !confirmedScaling;
  const scalingSource = scaleEv ? (scaleEv.source || 'unknown') : (manualScale != null ? 'manual' : null);
  const unitSource = unitEv ? (unitEv.source || 'unknown') : null;

  const blockers = [];
  if (!rawStreamConfirmed) blockers.push('raw stream structure is not confirmed');
  if (!identityConfirmed) blockers.push('channel identity is not confirmed');
  if (timeIndexed && !timebaseConfirmed) blockers.push('timebase is not confirmed (value is time-indexed)');
  if (!corpusOk) blockers.push('cross-file corpus required');
  if (!scaleIndependent) blockers.push('no independent scale evidence (manual scale / plausible range are not enough)');
  else if (!scaleFullyConfirmed) blockers.push('scale transform not verified / not stable across the corpus');
  if (!unitIndependent) blockers.push('no independent unit evidence (a unit label is not enough)');

  const perChannel = (scaleEv || unitEv || manualScale != null || plausibleRangeOnly) ? [{
    ref: opts.channelRef || 'scaling_candidate_001',
    status, scalingSource, unitSource, transformType,
    transformConfirmed: scaleFullyConfirmed, unitsConfirmed,
  }] : [];

  const aggregateDecision = {
    canConfirmPhysicalScaling,
    confirmedCount: confirmedScaling ? 1 : 0,
    candidateCount: isCandidate ? 1 : 0,
    unitsConfirmedCount: unitsConfirmed ? 1 : 0,
    manualHintCount: manualScaleHint ? 1 : 0,
    reason: confirmedScaling
      ? 'raw stream + identity + timebase + independent scale + independent unit + verified transform all confirmed across a corpus (synthetic only in 3F-0)'
      : 'physical scaling is not confirmed — independent scale and unit evidence over a confirmed raw stream / identity / timebase are required (plausible ranges and manual scale are not enough)',
  };

  const confirmationFeed = {
    physicalScalingConfirmed: confirmedScaling,
    unitsConfirmed, canonicalValueEligibility,
  };

  // ── capabilities (overlay/Kus/handling/setup/timeSeries pinned false on EVERY path) ──
  const capabilities = {
    rawStreamConfirmation: !!rawStreamConfirmation,
    channelIdentityConfirmation: !!channelIdentity,
    timebaseConfirmation: !!timebase,
    physicalScalingConfirmation: true,
    physicalScaling: confirmedScaling,        // synthetic-only true; real data always false
    unitsConfirmed,                           // synthetic-only true; real data always false
    canonicalTelemetry: false,                // never produced / usable in 3F-0 (eligibility ≠ available)
    timeSeries: false, handlingCorrelation: false, setupRecommendation: false, overlayEnabled: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_SCALING_CONFIRMATION_RUN', 'telemetry.scaling.info.confirmationRun', 'high'));
  if (perChannel.length) diagnostics.push(D('info', 'BMS_SCALING_CANDIDATE_EVALUATED', 'telemetry.scaling.info.candidateEvaluated', 'low'));
  if (!confirmedScaling) diagnostics.push(D('warning', 'BMS_SCALING_NOT_CONFIRMED', 'telemetry.scaling.warning.notConfirmed'));
  if (!unitsConfirmed) diagnostics.push(D('warning', 'BMS_SCALING_UNITS_NOT_CONFIRMED', 'telemetry.scaling.warning.unitsNotConfirmed'));
  diagnostics.push(D('warning', 'BMS_SCALING_PHYSICAL_VALUES_NOT_AVAILABLE', 'telemetry.scaling.warning.physicalValuesNotAvailable'));
  if (manualScaleHint) diagnostics.push(D('warning', 'BMS_SCALING_MANUAL_FALLBACK_ONLY', 'telemetry.scaling.warning.manualFallbackOnly'));
  if (plausibleRangeOnly) diagnostics.push(D('warning', 'BMS_SCALING_PLAUSIBLE_RANGE_NOT_ENOUGH', 'telemetry.scaling.warning.plausibleRangeNotEnough'));
  diagnostics.push(D('warning', 'BMS_SCALING_NO_CANONICAL_TELEMETRY', 'telemetry.scaling.warning.noCanonicalTelemetry'));
  diagnostics.push(D('warning', 'BMS_SCALING_NO_OVERLAY_KUS_SETUP', 'telemetry.scaling.warning.noOverlayKusSetup'));
  diagnostics.push(D('info', 'BMS_SCALING_NEXT_EVIDENCE_NEEDED', 'telemetry.scaling.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'physical_scaling_confirmation', status,
    reason: aggregateDecision.reason,
    evidenceLevel: status,
    inputs: {
      rawStreamConfirmed, identityConfirmed, timebaseConfirmed, timeIndexed,
      hasCorpusEvidence: corpusOk,
      scalingEvidenceProvided: !!scaleEv, unitEvidenceProvided: !!unitEv, manualScaleProvided: manualScale != null,
    },
    scalingSource, unitSource, transformType, transformConfirmed: scaleFullyConfirmed,
    unitsConfirmed, physicalValuesAvailable, canonicalValuesAvailable, canonicalValueEligibility,
    manualScaleHint,
    perChannel,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      confirmedScaling
        ? 'physical scaling confirmed (synthetic) but canonical telemetry is NOT produced and no overlay/Kus/setup is enabled'
        : 'physical scaling not confirmed (plausible ranges / manual scale are not enough)',
      'units not confirmed for real data',
      'physical values not available for real data',
      'no canonical telemetry produced',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsPhysicalScalingConfirmation };
}
