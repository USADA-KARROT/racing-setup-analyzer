/**
 * bms-channel-identity-confirmation.js — .bmsbin CHANNEL IDENTITY confirmation CRITERIA (Phase 3E-0)
 *
 * This builds the conservative CRITERIA for "when may channel identity be called confirmed?" — it
 * is NOT a channel namer and NOT a decoder. It evaluates ONLY evidence handed to it
 * (opts.identityEvidence); it never derives identity from waveform shape, statistics, or the
 * catalog on its own. With no evidence (the real imported-file path) every channel identity is
 * `not_confirmed` — by design.
 *
 * Core principle: **channel identity cannot be confirmed by waveform shape alone; it requires
 * independent evidence.** Evidence is GRADED into a conservative ladder, never auto-confirmed:
 *   not_confirmed < hypothesis_only < labeled_unverified < candidate < confirmable_identity < confirmed_identity
 *   - shape / statistical signature      → hypothesis_only  (never higher)
 *   - a label / metadata string only     → labeled_unverified
 *   - a repeatable label↔stream cross-ref → candidate
 *   - an independent, corpus-stable mapping → confirmable_identity, and only with a corpus-backed
 *     CONFIRMED raw-stream structure → confirmed_identity (synthetic fixtures only in 3E-0).
 *
 * Red lines (always held): no scaling, no units, no physical telemetry chart, no overlay, no Kus,
 * no setup recommendation, no canonical telemetry, no handling correlation, no confirmed timebase,
 * no confirmed physical values, no automatic naming from shape, no AI/heuristic label guessing.
 * capabilities physicalScaling / canonicalTelemetry / timeSeries / handlingCorrelation /
 * unitsConfirmed / setupRecommendation stay false on every path. A single real file can NEVER
 * reach confirmed_identity (it requires a corpus-backed confirmed raw stream). `.bmsbin` is an
 * adapter; output flows back to the source-agnostic descriptor. Works only on parsed reports +
 * explicit evidence (no raw bytes) — clean-room by construction.
 */

const _ID_RANK = {
  not_confirmed: 0, hypothesis_only: 1, labeled_unverified: 2,
  candidate: 3, confirmable_identity: 4, confirmed_identity: 5,
};

/** Classify ONE evidence item into its ceiling status. Never promotes shape/label on its own. */
function _classifyIdentityEvidence(e, ctx) {
  const k = e && e.kind;
  if (k === 'shape' || k === 'statistical') return 'hypothesis_only';   // shape alone is insufficient
  if (k === 'label_string') return 'labeled_unverified';                // a label is not a proven mapping
  if (k === 'cross_reference') return 'candidate';                      // repeatable, but not yet sufficient
  if (k === 'independent_mapping') {
    // An independent mapping must NOT rely on scaling / overlay / driving-behaviour / setup.
    const independent = !!(e.independentOfScaling && e.independentOfOverlay && e.independentOfSetup);
    if (!independent || !e.mappingStable) return 'candidate';
    // independent + corpus-stable mapping: only a corpus-backed CONFIRMED raw stream lifts it to
    // confirmed_identity; otherwise it is at most confirmable (pending the raw-stream/corpus gate).
    if (ctx.corpusOk && ctx.rawStreamConfirmed) return 'confirmed_identity';
    return 'confirmable_identity';
  }
  return 'not_confirmed';
}

/**
 * Evaluate channel identity confirmation criteria.
 * @param {object} bmsResult            parseBms output (channelCount, channels…)
 * @param {object} rawStreamConfirmation evaluateBmsRawStreamConfirmation output (Phase 3D-2)
 * @param {object} structureDiscovery   discoverBmsSampleStructure output (Phase 3D-1)
 * @param {object} opts                 { corpus: {fileCount,…}, identityEvidence: [ {ref, kind, label?, mappingStable?, independentOfScaling?, independentOfOverlay?, independentOfSetup?} ] }
 */
function evaluateBmsChannelIdentityConfirmation(bmsResult, rawStreamConfirmation, structureDiscovery, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });

  const channelCount = (bmsResult && bmsResult.channelCount) || ((bmsResult && bmsResult.channels) ? bmsResult.channels.length : 0);
  const evidence = (opts.identityEvidence && Array.isArray(opts.identityEvidence)) ? opts.identityEvidence : [];

  const corpus = opts.corpus || null;
  const corpusOk = !!(corpus && corpus.fileCount >= 2 && corpus.candidateRegionStable && corpus.channelCountStable === true);
  // a raw stream's STRUCTURE must be corpus-confirmed (3D-2) before its identity can be confirmed
  const rawStreamConfirmed = !!(rawStreamConfirmation && rawStreamConfirmation.aggregateDecision
    && rawStreamConfirmation.aggregateDecision.canConfirmAnyRawStream === true);
  const ctx = { corpusOk, rawStreamConfirmed };

  // ── grade each provided evidence item (never auto-derive from shape/catalog) ──
  const identityCandidates = evidence.map((e, i) => {
    const status = _classifyIdentityEvidence(e, ctx);
    const blockers = [];
    if (e && e.kind === 'independent_mapping') {
      if (!(e.independentOfScaling && e.independentOfOverlay && e.independentOfSetup)) blockers.push('mapping is not independent (relies on scaling / overlay / setup)');
      else if (!e.mappingStable) blockers.push('mapping not shown stable across the corpus');
      else { if (!rawStreamConfirmed) blockers.push('underlying raw stream structure is not corpus-confirmed'); if (!corpusOk) blockers.push('cross-file corpus required'); }
    } else if (status === 'hypothesis_only') { blockers.push('waveform shape alone is insufficient — independent evidence required'); }
    else if (status === 'labeled_unverified') { blockers.push('label is not proven to map to a raw stream'); }
    else if (status === 'candidate') { blockers.push('cross-reference is repeatable but not yet sufficient (needs independent, corpus-stable mapping)'); }
    return {
      ref: (e && e.ref) || ('identity_candidate_' + String(i + 1).padStart(3, '0')),
      evidenceKind: (e && e.kind) || 'none',
      evidenceLevel: status,
      status,
      label: (e && e.label) || null,   // only present when evidence supplies it (synthetic); never derived
      reason: status === 'confirmed_identity' ? 'independent corpus-stable mapping over a confirmed raw stream'
        : (status === 'confirmable_identity' ? 'independent corpus-stable mapping, pending corpus-confirmed raw stream'
          : (status === 'candidate' ? 'repeatable cross-reference only'
            : (status === 'labeled_unverified' ? 'label present, mapping unproven'
              : (status === 'hypothesis_only' ? 'shape / statistical signature only' : 'no evidence')))),
      blockers,
    };
  });

  // ── aggregate (highest level reached) ──
  let topLevel = 'not_confirmed';
  for (const c of identityCandidates) if (_ID_RANK[c.status] > _ID_RANK[topLevel]) topLevel = c.status;
  const confirmedIdentityCount = identityCandidates.filter(c => c.status === 'confirmed_identity').length;
  const candidateCount = identityCandidates.filter(c => _ID_RANK[c.status] >= _ID_RANK.candidate && c.status !== 'confirmed_identity').length;
  const hypothesisCount = identityCandidates.filter(c => c.status === 'hypothesis_only').length;
  const labeledUnverifiedCount = identityCandidates.filter(c => c.status === 'labeled_unverified').length;
  const canConfirmAnyChannelIdentity = confirmedIdentityCount > 0;

  const aggregateDecision = {
    canConfirmAnyChannelIdentity,
    confirmedIdentityCount,
    candidateCount,
    hypothesisCount,
    labeledUnverifiedCount,
    reason: canConfirmAnyChannelIdentity
      ? 'at least one channel identity is confirmed by an independent corpus-stable mapping over a confirmed raw stream (synthetic only in 3E-0)'
      : (topLevel === 'confirmable_identity' ? 'identity evidence is strong but the raw-stream structure / corpus is not yet confirmed'
        : 'channel identity is not confirmed — independent evidence is required (waveform shape alone is insufficient)'),
  };

  // ── confirmation feed (conservative; consumed by bms-confirmation.js, corpus-gated there) ──
  const confirmationFeed = {
    channelIdentityConfirmed: canConfirmAnyChannelIdentity,
    confirmedIdentityCount,
    independentEvidencePresent: identityCandidates.some(c => c.evidenceKind === 'independent_mapping'),
  };

  // ── capabilities (all decode-grade + units + setup pinned false; identity confirmed only synthetic) ──
  const capabilities = {
    channelCatalog: channelCount > 0,
    sampleStructureDiscovery: !!structureDiscovery,
    rawStreamConfirmation: !!rawStreamConfirmation,
    channelIdentityConfirmation: true,
    channelIdentityConfirmed: canConfirmAnyChannelIdentity,
    physicalScaling: false, canonicalTelemetry: false, timeSeries: false,
    handlingCorrelation: false, unitsConfirmed: false, setupRecommendation: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_IDENTITY_CONFIRMATION_RUN', 'telemetry.identity.info.confirmationRun', 'high'));
  if (identityCandidates.length) diagnostics.push(D('info', 'BMS_IDENTITY_CANDIDATE_EVALUATED', 'telemetry.identity.info.candidateEvaluated', 'low'));
  if (!canConfirmAnyChannelIdentity) diagnostics.push(D('warning', 'BMS_IDENTITY_NOT_CONFIRMED', 'telemetry.identity.warning.notConfirmed'));
  if (hypothesisCount > 0) diagnostics.push(D('warning', 'BMS_IDENTITY_SHAPE_INSUFFICIENT', 'telemetry.identity.warning.shapeInsufficient'));
  if (labeledUnverifiedCount > 0) diagnostics.push(D('warning', 'BMS_IDENTITY_LABEL_UNVERIFIED', 'telemetry.identity.warning.labelUnverified'));
  if (!canConfirmAnyChannelIdentity) diagnostics.push(D('warning', 'BMS_IDENTITY_REQUIRES_INDEPENDENT_EVIDENCE', 'telemetry.identity.warning.requiresIndependentEvidence'));
  if (!rawStreamConfirmed) diagnostics.push(D('warning', 'BMS_IDENTITY_REQUIRES_RAW_STREAM_CONFIRMED', 'telemetry.identity.warning.requiresRawStreamConfirmed'));
  if (!corpusOk) diagnostics.push(D('warning', 'BMS_IDENTITY_REQUIRES_CORPUS', 'telemetry.identity.warning.requiresCorpus'));
  diagnostics.push(D('warning', 'BMS_IDENTITY_PHYSICAL_VALUES_NOT_AVAILABLE', 'telemetry.identity.warning.physicalValuesNotAvailable'));
  diagnostics.push(D('warning', 'BMS_IDENTITY_NO_CANONICAL_TELEMETRY', 'telemetry.identity.warning.noCanonicalTelemetry'));
  diagnostics.push(D('info', 'BMS_IDENTITY_NEXT_EVIDENCE_NEEDED', 'telemetry.identity.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: 'bmsbin', stage: 'channel_identity_confirmation', status: topLevel,
    reason: aggregateDecision.reason,
    evidenceLevel: topLevel,
    inputs: {
      channelCatalogCount: channelCount,
      rawStreamConfirmedStructure: rawStreamConfirmed,
      hasCorpusEvidence: corpusOk,
      identityEvidenceCount: evidence.length,
    },
    identityCandidates,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      // the first entry tracks the actual decision; the rest hold on every path (even when
      // identity is confirmed, this phase never produces physical values / timebase / canonical telemetry)
      canConfirmAnyChannelIdentity
        ? 'channel identity confirmed (synthetic) but no physical values / canonical telemetry'
        : 'channel identity not confirmed (no independent evidence)',
      'physical values not available',
      'timebase not confirmed',
      'no canonical telemetry produced',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsChannelIdentityConfirmation };
}
