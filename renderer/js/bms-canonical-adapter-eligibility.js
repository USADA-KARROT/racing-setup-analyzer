/**
 * bms-canonical-adapter-eligibility.js — REAL canonical-series adapter BOUNDARY / eligibility GATE
 * (Phase 3G-1)
 *
 * This is the DOORWAY to a future real canonical measured-series adapter — a boundary check, NOT
 * extraction. It answers ONE question: is real/imported data even eligible to be considered for a
 * canonical measured-series adapter yet? If not, what evidence is missing and why is it still
 * blocked? It builds NO canonical series, decodes NO samples, produces NO time-series / measured
 * extraction / handling response, and enables NO overlay / Kus / model-vs-actual / setup.
 *
 * Where it sits: it runs AFTER the 3D-0 confirmation hub and consumes only already-evaluated
 * trust-chain outputs (confirmation, readiness, extraction-eligibility, measured-extraction). It
 * does NOT feed back into raw-stream / identity / timebase / scaling / readiness / eligibility — the
 * confirmation feed is one-way and downstream-only, so adding this gate cannot change any upstream
 * result. It never reads raw bytes, never decodes, never names a channel, never infers units /
 * scaling / Hz.
 *
 * Core principle: a real/imported single file is NOT eligible to enter the adapter, because it
 * lacks a cross-file corpus and confirmed raw-stream structure / channel identity / timebase /
 * physical scaling / units / readiness. Only an explicit, synthetic, fully-confirmed corpus-backed
 * fixture can reach `synthetic_adapter_ready` — and even then NO real canonical series is produced
 * and NO analysis capability opens.
 *
 * Red lines (always held): real/imported path is blocked at the boundary (not_available / *_missing
 * / blocked_by_prerequisites / adapter_contract_candidate — never adapter ready). `realDataUsed`
 * is ALWAYS false. capabilities canonicalTelemetry / timeSeries / measuredExtraction /
 * measuredHandlingResponse / handlingAnalysis / overlayEnabled / kus / handlingCorrelation /
 * setupRecommendation / modelVsActual stay false on EVERY path (even synthetic_adapter_ready). Only
 * canonicalAdapterEligibilityCriteria and canonicalAdapterEligible (synthetic-only) may be true.
 * NaN / invalid / partial evidence is fail-closed. `.bmsbin` is an adapter; output flows back to the
 * source-agnostic descriptor. Clean-room — consumes only evaluated reports, never raw bytes.
 */

// Abstract canonical-channel contract — never a channel found in real data.
const _ADAPTER_REQUIRED_CHANNELS = ['speed', 'steering', 'lateral_accel', 'yaw_rate', 'brake_or_longitudinal_accel'];

const _CA_RANK = {
  not_available: 0, blocked_by_prerequisites: 1, raw_stream_missing: 2, identity_missing: 3,
  timebase_missing: 4, scaling_missing: 5, units_missing: 6, corpus_missing: 7,
  adapter_contract_candidate: 8, synthetic_adapter_ready: 9,
};

// The input contract a real canonical-series adapter would require (descriptor only; 3G-1 builds none of it).
const CANONICAL_ADAPTER_CONTRACT = {
  description: 'Prerequisites a real source must satisfy BEFORE it may enter a canonical measured-series adapter (Phase 3G-1 is the boundary check, not the adapter). Abstract — never a channel found in real data.',
  requiredCanonicalChannels: _ADAPTER_REQUIRED_CHANNELS,
  requiredUnits: 'confirmed per-channel units (not inferred from channel names)',
  requiredTimebase: 'confirmed monotonic timebase (structural, corpus-backed)',
  requiredQuality: 'telemetry readiness = ready_for_analysis',
  corpusRequirement: 'cross-file corpus (fileCount >= 2)',
};

/**
 * Evaluate whether data is eligible to ENTER a future real canonical-series adapter.
 * @param {object} confirmation        Phase 3D-0 hub output (evaluateBmsConfirmationEvidence)
 * @param {object} readiness           Phase 3F-1 output (carries inputs.* prerequisite booleans)
 * @param {object} extractionEligibility Phase 3G-0A output
 * @param {object} measuredExtraction  Phase 3G-0B output
 * @param {object} opts  { corpus, syntheticOnly }  (synthetic positive fixtures only)
 */
function evaluateBmsCanonicalAdapterEligibility(confirmation, readiness, extractionEligibility, measuredExtraction, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const hasAnyInput = !!(confirmation || readiness || extractionEligibility || measuredExtraction);
  const readinessObj = (readiness && typeof readiness === 'object') ? readiness : null;
  const ri = (readinessObj && readinessObj.inputs && typeof readinessObj.inputs === 'object') ? readinessObj.inputs : {};

  // prerequisites — consumed strictly from already-evaluated reports; === true (NaN/undefined → false, fail-closed)
  const rawStreamConfirmed = ri.rawStreamConfirmed === true;
  const identityConfirmed = ri.identityConfirmed === true;
  const timebaseConfirmed = ri.timebaseConfirmed === true;
  const scalingConfirmed = ri.scalingConfirmed === true;
  const unitsConfirmed = ri.unitsConfirmed === true;
  const corpusOk = !!(opts.corpus && opts.corpus.fileCount >= 2);
  const corpusConfirmed = corpusOk && ri.hasCorpusEvidence === true;
  const readinessReady = !!(readinessObj && readinessObj.aggregateDecision && readinessObj.aggregateDecision.canBeReadyForAnalysis === true);
  const extractionEligibilityReady = !!(extractionEligibility && extractionEligibility.status === 'eligible_for_extraction'
    && extractionEligibility.capabilities && extractionEligibility.capabilities.extractionEligible === true);
  const measuredExtractionSyntheticOnly = !!(measuredExtraction && measuredExtraction.capabilities && measuredExtraction.capabilities.measuredExtractionSynthetic === true);
  const syntheticOnly = opts.syntheticOnly === true;

  const structuralPrereq = rawStreamConfirmed && identityConfirmed && timebaseConfirmed && scalingConfirmed && unitsConfirmed && corpusConfirmed;
  const fullyReady = structuralPrereq && readinessReady && extractionEligibilityReady;

  // ── status ladder (fail-closed; first missing prerequisite wins) ──
  let status;
  if (!hasAnyInput) status = 'not_available';
  else if (!readinessObj) status = 'blocked_by_prerequisites';        // cannot assess prerequisites without a readiness report
  else if (!rawStreamConfirmed) status = 'raw_stream_missing';        // real/imported single file lands here
  else if (!identityConfirmed) status = 'identity_missing';
  else if (!timebaseConfirmed) status = 'timebase_missing';
  else if (!scalingConfirmed) status = 'scaling_missing';
  else if (!unitsConfirmed) status = 'units_missing';
  else if (!corpusConfirmed) status = 'corpus_missing';
  else if (!fullyReady) status = 'adapter_contract_candidate';        // structural prereqs met but readiness/eligibility not ready
  else if (!syntheticOnly) status = 'adapter_contract_candidate';     // fully-confirmed evidence but real path (no synthetic flag)
  else status = 'synthetic_adapter_ready';                            // synthetic-only

  const synthReady = status === 'synthetic_adapter_ready';

  const prerequisites = {
    rawStreamConfirmed, identityConfirmed, timebaseConfirmed, scalingConfirmed, unitsConfirmed,
    corpusConfirmed, readinessReady, extractionEligibilityReady, measuredExtractionSyntheticOnly,
  };

  const blockers = [];
  if (!hasAnyInput) blockers.push('no trust-chain inputs supplied');
  if (hasAnyInput && !readinessObj) blockers.push('no telemetry readiness report (cannot assess prerequisites)');
  if (readinessObj && !rawStreamConfirmed) blockers.push('raw stream structure not confirmed');
  if (readinessObj && !identityConfirmed) blockers.push('channel identity not confirmed');
  if (readinessObj && !timebaseConfirmed) blockers.push('timebase not confirmed');
  if (readinessObj && !scalingConfirmed) blockers.push('physical scaling not confirmed');
  if (readinessObj && !unitsConfirmed) blockers.push('units not confirmed');
  if (readinessObj && !corpusConfirmed) blockers.push('cross-file corpus not confirmed');
  if (structuralPrereq && !readinessReady) blockers.push('telemetry readiness is not ready_for_analysis');
  if (structuralPrereq && readinessReady && !extractionEligibilityReady) blockers.push('extraction eligibility not established');
  if (fullyReady && !syntheticOnly) blockers.push('real/imported path — only a synthetic fixture may validate adapter shape');

  const warnings = [];
  if (synthReady) warnings.push('synthetic_adapter_ready validates adapter BOUNDARY shape only — no real canonical series is produced, and no canonical telemetry / time-series / analysis capability opens');

  const nextEvidenceNeeded = [];
  if (readinessObj && !rawStreamConfirmed) nextEvidenceNeeded.push('confirmed raw stream structure (corpus-backed)');
  if (readinessObj && rawStreamConfirmed && !identityConfirmed) nextEvidenceNeeded.push('confirmed channel identity (explicit mapping)');
  if (readinessObj && identityConfirmed && !timebaseConfirmed) nextEvidenceNeeded.push('confirmed timebase');
  if (readinessObj && timebaseConfirmed && !scalingConfirmed) nextEvidenceNeeded.push('confirmed physical scaling');
  if (readinessObj && scalingConfirmed && !unitsConfirmed) nextEvidenceNeeded.push('confirmed units');
  if (readinessObj && unitsConfirmed && !corpusConfirmed) nextEvidenceNeeded.push('cross-file corpus evidence');
  if (structuralPrereq && !readinessReady) nextEvidenceNeeded.push('telemetry readiness ready_for_analysis');

  const blockerCount = blockers.length;
  const aggregateDecision = {
    canEnterCanonicalAdapter: synthReady,
    candidateCount: (_CA_RANK[status] >= _CA_RANK.adapter_contract_candidate && !synthReady) ? 1 : 0,
    blockerCount,
    reason: synthReady
      ? 'all canonical-adapter prerequisites are satisfied over a corpus AND the source is an explicit synthetic fixture (synthetic-only in 3G-1) — this validates the adapter BOUNDARY, it does NOT build a real canonical series'
      : 'not eligible to enter the canonical adapter — this is a boundary/eligibility check, not extraction; real/imported data is never adapter-ready (confirmed raw stream / identity / timebase / scaling / units / corpus / readiness are missing)',
  };

  const confirmationFeed = { canonicalAdapterEligible: synthReady, canonicalAdapterLevel: status };

  // ── capabilities (canonical/decode/analysis pinned false on EVERY path, incl. synthetic) ──
  const capabilities = {
    canonicalAdapterEligibilityCriteria: true,
    canonicalAdapterEligible: synthReady,   // synthetic-only true; real path always false
    canonicalTelemetry: false, timeSeries: false, measuredExtraction: false,
    measuredHandlingResponse: false, handlingAnalysis: false, overlayEnabled: false,
    kus: false, handlingCorrelation: false, setupRecommendation: false, modelVsActual: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_CADAPTER_RUN', 'telemetry.cadapter.info.run', 'high'));
  if (status === 'not_available') diagnostics.push(D('warning', 'BMS_CADAPTER_NOT_AVAILABLE', 'telemetry.cadapter.warning.notAvailable'));
  if (status !== 'synthetic_adapter_ready') diagnostics.push(D('warning', 'BMS_CADAPTER_NOT_ELIGIBLE', 'telemetry.cadapter.warning.notEligible'));
  if (readinessObj && !structuralPrereq) diagnostics.push(D('warning', 'BMS_CADAPTER_PREREQS_MISSING', 'telemetry.cadapter.warning.prereqsMissing'));
  if (fullyReady && !syntheticOnly) diagnostics.push(D('warning', 'BMS_CADAPTER_REAL_PATH_BLOCKED', 'telemetry.cadapter.warning.realPathBlocked'));
  diagnostics.push(D('warning', 'BMS_CADAPTER_BOUNDARY_NOT_EXTRACTION', 'telemetry.cadapter.warning.boundaryNotExtraction'));
  diagnostics.push(D('warning', 'BMS_CADAPTER_NO_REAL_SERIES', 'telemetry.cadapter.warning.noRealSeries'));
  if (nextEvidenceNeeded.length) diagnostics.push(D('info', 'BMS_CADAPTER_NEXT_EVIDENCE_NEEDED', 'telemetry.cadapter.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'canonical_adapter_eligibility', status,
    reason: aggregateDecision.reason,
    adapterEligibilityLevel: status,
    evidenceLevel: status,
    realDataUsed: false,
    prerequisites,
    adapterContract: CANONICAL_ADAPTER_CONTRACT,
    blockers, warnings, nextEvidenceNeeded,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      synthReady
        ? 'synthetic adapter boundary validated (synthetic only) — NO real canonical series is produced; no canonical telemetry / time-series / measured extraction / analysis is enabled'
        : 'not eligible to enter the canonical adapter (this is a boundary check, not extraction; real/imported data is never adapter-ready)',
      'no real canonical measured series',
      'no real time-series / measured extraction / measured handling response',
      'no overlay / Kus / model-vs-actual / setup recommendation',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsCanonicalAdapterEligibility, CANONICAL_ADAPTER_CONTRACT };
}
