/**
 * bms-sanitized-evidence-adapter.js — SANITIZED-evidence adapter DRY-RUN shape (Phase 3G-3)
 *
 * This is a DRY-RUN evidence-shaping layer, NOT extraction, NOT decoding, and NOT confirmation. It
 * answers ONE question: can the SANITIZED aggregate evidence that already passed the 3G-2 private-
 * corpus boundary be arranged into the SHAPE a FUTURE canonical-series adapter would consume — and
 * is that shape complete and still safe? It reads NO raw bytes, decodes NOTHING, opens NO real file,
 * names NO channel, infers NO units / scaling / Hz, builds NO canonical series / time-series /
 * measured extraction, and produces NO corner windows / tendency / handling result.
 *
 * Where it sits: it runs AFTER the 3G-2 private-corpus boundary and consumes only that already-
 * evaluated boundary result plus a SANITIZED-evidence descriptor (high-level abstract scope flags,
 * never raw / decoded / identifying values). The confirmation feed is one-way and downstream-only —
 * adding this layer cannot change any upstream result (raw stream / identity / timebase / scaling /
 * units / readiness / extraction eligibility / canonical adapter / private corpus).
 *
 * Core distinction (the whole point, and the trap): `dry_run_ready` means ONLY that sanitized
 * evidence has been arranged into an adapter-consumable DRY-RUN shape. It does NOT confirm raw
 * stream / identity / timebase / scaling / units, does NOT make the canonical adapter eligible, and
 * produces NO canonical telemetry / time-series / measured extraction. Whether this shaped evidence
 * can later UPGRADE any confirmation is a FUTURE phase's (3G-4 / Phase 4) decision; 3G-3 never feeds
 * back to make any upstream confirmation `confirmed`.
 *
 * Safety: the evidence input is a SANITIZED DESCRIPTOR — abstract scope keys + safety flags only,
 * never the real evidence. Evidence that exposes raw bytes / decoded sequences / file names / paths /
 * offsets / fingerprints / sample values / channel names / timing / hashes, OR that carries any
 * identifying field (a real path, file name, exact hash, byte offset, exact sample count, sample
 * rate, channel names, raw snippet, decoded value, timestamp, exact file size), OR that lists an
 * unknown / leaky scope, is rejected as unsafe / invalid. Everything is fail-closed.
 *
 * Red lines (always held): real telemetry files NEVER enter the repo; the reporter emits only
 * sanitized scalars. `realDataUsed` is ALWAYS false (only the boundary result + a sanitized
 * descriptor are consumed). capabilities rawStreamConfirmed / identityConfirmed / timebaseConfirmed /
 * scalingConfirmed / unitsConfirmed / canonicalAdapterEligible / canonicalTelemetry / timeSeries /
 * measuredExtraction / measuredHandlingResponse / handlingAnalysis / overlayEnabled / kus /
 * handlingCorrelation / setupRecommendation / modelVsActual stay false on EVERY path (even
 * dry_run_ready). Only sanitizedEvidenceAdapterCriteria and adapterEvidenceShapeAvailable (when the
 * safe, complete dry-run shape passes) may be true. One-way: never mutates any upstream result.
 * Clean-room.
 */

// Abstract evidence scopes a future canonical-series adapter would consume — never a channel found
// in real data. These are high-level descriptor keys only (no raw / decoded / identifying content).
const _ADAPTER_EVIDENCE_SCOPES = ['raw_stream_structure', 'channel_identity', 'timebase', 'physical_scaling', 'units', 'corpus_consistency', 'quality'];

// The minimum abstract scopes a dry-run shape must have before it can even be called a candidate.
const _CORE_ADAPTER_SCOPES = ['raw_stream_structure', 'channel_identity', 'timebase'];

// Evidence descriptor field names that would leak identifying / raw / proprietary information — their
// presence (non-empty) makes the descriptor invalid. The evidence must be a sanitized descriptor only.
const _FORBIDDEN_EVIDENCE_KEYS = [
  'absolutePath', 'path', 'filePath', 'fileName', 'fileNames', 'localPath', 'realPath',
  'hash', 'sha', 'sha1', 'sha256', 'md5', 'exactHash', 'fingerprint', 'fingerprints',
  'offset', 'offsets', 'byteOffset', 'sampleCount', 'sampleRate', 'hz', 'sampleIndex', 'timing',
  'channelNames', 'channels', 'rawBytes', 'rawSnippet', 'decodedValues', 'decoded', 'timestamps',
  'fileSize', 'fileSizes', 'values', 'physicalValues', 'cornerWindows', 'tendency',
];

// Unsafe boolean flags that must be false/absent — any truthy value means the evidence describes a
// leak. Fail CLOSED: ANY truthy value (not only the boolean true) is a self-declared exposure.
const _UNSAFE_EVIDENCE_FLAGS = [
  'rawBytesExposed', 'decodedSequencesExposed', 'fileNamesExposed', 'pathsExposed',
  'offsetsExposed', 'fingerprintsExposed', 'sampleValuesExposed', 'channelNamesExposed',
  'timingExposed', 'hashesExposed',
];

// An abstract scope key must not carry an identifying VALUE — a path, 0x-hex, a sha/md5 token, a long
// hex run, or a known vendor extension. The whitelist alone is not enough (a leak can hide as a fake
// scope string). Plain tokens like 'timebase' / 'units' do NOT match.
const _SA_VALUE_LEAK_RE = /[/\\]|0x[0-9a-f]+|\b(sha\d*|md5)\b|[0-9a-f]{16,}|\.(bmsbin|tir|pds|cvp|pvp|mch|fnl|bin|dat)\b/i;

const _SA_RANK = {
  not_available: 0, boundary_not_ready: 1, evidence_missing: 2, evidence_invalid: 3,
  unsafe_evidence: 4, insufficient_scope: 5, partial_adapter_shape: 6,
  adapter_shape_candidate: 7, dry_run_ready: 8,
};

// The dry-run shape contract a real canonical-series adapter would consume (descriptor only; 3G-3
// builds none of it). Abstract — never a channel / value found in real data.
const SANITIZED_EVIDENCE_ADAPTER_CONTRACT = {
  description: 'Shape a sanitized-evidence descriptor must satisfy BEFORE a FUTURE canonical-series adapter could consume it as a DRY RUN (Phase 3G-3 is the shaping layer, not the adapter, not extraction, not confirmation). Abstract — never raw / decoded / identifying content.',
  requiredScopes: _ADAPTER_EVIDENCE_SCOPES,
  coreScopes: _CORE_ADAPTER_SCOPES,
  requiredSafetyFlags: _UNSAFE_EVIDENCE_FLAGS,   // each must be false/absent
  requiredBoundaryStatus: 'private_corpus_boundary_ready',
  outputIsDryRunOnly: true,
  doesNotConfirmTelemetry: true,
};

/**
 * Arrange sanitized evidence into a canonical-adapter DRY-RUN shape (no confirmation, no extraction).
 * @param {object} privateCorpusBoundary Phase 3G-2 output (evaluateBmsPrivateCorpusBoundary)
 * @param {object} opts  { sanitizedEvidence:{ sanitizedOnly:true, evidenceScopes:[...abstract keys],
 *                            scopeStatus:{ <scope>: 'candidate'|'missing'|'blocked'|'unsafe' },
 *                            <unsafe flags all false> },   // descriptor only, never raw/decoded values
 *                          adapterProfile, policy, syntheticOnly | mockOnly, sourceType }
 */
function evaluateBmsSanitizedEvidenceAdapter(privateCorpusBoundary, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  if (!opts || typeof opts !== 'object') opts = {};   // garbage opts → fail-closed

  // ── consume the 3G-2 boundary (dual check: status string AND feed flag — neither alone suffices) ──
  const pcb = (privateCorpusBoundary && typeof privateCorpusBoundary === 'object' && !Array.isArray(privateCorpusBoundary)) ? privateCorpusBoundary : null;
  const pcbFeed = (pcb && pcb.confirmationFeed && typeof pcb.confirmationFeed === 'object') ? pcb.confirmationFeed : {};
  const boundaryReady = !!(pcb && pcb.status === 'private_corpus_boundary_ready' && pcbFeed.privateCorpusBoundaryReady === true);

  // ── sanitized-evidence descriptor (abstract flags only; never raw/decoded/identifying values) ──
  const ev = (opts.sanitizedEvidence && typeof opts.sanitizedEvidence === 'object' && !Array.isArray(opts.sanitizedEvidence)) ? opts.sanitizedEvidence : null;
  const hasEvidence = !!ev;

  const sanitizedOnly = !!(ev && ev.sanitizedOnly === true);
  // identifying key denylist — a non-empty value in any of these is a leak
  const hasForbiddenKey = ev ? _FORBIDDEN_EVIDENCE_KEYS.some(k => {
    const v = ev[k];
    return v !== undefined && v !== null && v !== false && !(typeof v === 'string' && v === '');
  }) : false;
  // scope list must be abstract whitelist keys with no identifying value baked in
  const rawScopes = (ev && Array.isArray(ev.evidenceScopes)) ? ev.evidenceScopes : [];
  const hasUnknownScope = rawScopes.some(s => typeof s !== 'string' || !_ADAPTER_EVIDENCE_SCOPES.includes(s));
  const hasLeakyScope = rawScopes.some(s => typeof s === 'string' && _SA_VALUE_LEAK_RE.test(s));
  const scopeStatusMap = (ev && ev.scopeStatus && typeof ev.scopeStatus === 'object' && !Array.isArray(ev.scopeStatus)) ? ev.scopeStatus : {};

  // a structurally valid evidence descriptor: explicit sanitizedOnly + no identifying key + only
  // known abstract scope keys + no identifying value in a scope string
  const evidenceStructurallyValid = !!(ev && sanitizedOnly && !hasForbiddenKey && !hasUnknownScope && !hasLeakyScope);

  // exposure flags fail CLOSED: ANY truthy value is a self-declared exposure; a scopeStatus 'unsafe' too
  const unsafeFlags = {};
  for (const k of _UNSAFE_EVIDENCE_FLAGS) unsafeFlags[k] = !!(ev && ev[k]);
  const anyUnsafeScope = _ADAPTER_EVIDENCE_SCOPES.some(s => scopeStatusMap[s] === 'unsafe');
  const anyUnsafeFlag = Object.values(unsafeFlags).some(v => v === true) || anyUnsafeScope;

  // present = listed AND status candidate (no status defaults to candidate); blocked = status 'blocked';
  // everything else (incl. 'missing') is missing. Monotonic, fail-closed.
  const presentScopes = _ADAPTER_EVIDENCE_SCOPES.filter(s => rawScopes.includes(s) && (scopeStatusMap[s] === undefined || scopeStatusMap[s] === 'candidate'));
  const blockedScopes = _ADAPTER_EVIDENCE_SCOPES.filter(s => scopeStatusMap[s] === 'blocked');
  const missingScopes = _ADAPTER_EVIDENCE_SCOPES.filter(s => !presentScopes.includes(s) && !blockedScopes.includes(s));
  const presentScopeCount = presentScopes.length;
  const missingScopeCount = missingScopes.length;
  const corePresent = _CORE_ADAPTER_SCOPES.every(s => presentScopes.includes(s));
  const allPresent = _ADAPTER_EVIDENCE_SCOPES.every(s => presentScopes.includes(s));

  // ── status ladder (fail-closed; first failing prerequisite wins) ──
  let status;
  if (!pcb && !hasEvidence) status = 'not_available';
  else if (!boundaryReady) status = 'boundary_not_ready';        // real/imported single-file path lands here
  else if (!hasEvidence) status = 'evidence_missing';
  else if (!evidenceStructurallyValid) status = 'evidence_invalid';  // missing sanitizedOnly OR identifying field OR unknown/leaky scope
  else if (anyUnsafeFlag) status = 'unsafe_evidence';
  else if (presentScopeCount === 0) status = 'insufficient_scope';
  else if (!corePresent) status = 'partial_adapter_shape';
  else if (!allPresent) status = 'adapter_shape_candidate';      // core present but not every scope
  else status = 'dry_run_ready';                                 // every abstract scope present, safe, sanitized

  const dryRunReady = status === 'dry_run_ready';

  const blockers = [];
  if (!pcb && !hasEvidence) blockers.push('no private-corpus boundary result and no sanitized evidence supplied');
  if (pcb && !boundaryReady) blockers.push('private-corpus boundary is not private_corpus_boundary_ready (a safe, complete sanitized boundary must pass 3G-2 first)');
  if (boundaryReady && !hasEvidence) blockers.push('no sanitized evidence descriptor supplied');
  if (boundaryReady && hasEvidence && !sanitizedOnly) blockers.push('evidence is not marked sanitizedOnly');
  if (boundaryReady && hasEvidence && sanitizedOnly && hasForbiddenKey) blockers.push('evidence carries an identifying field (path / file name / hash / offset / sample rate / channel name / sample index / timing) — not allowed');
  if (boundaryReady && hasEvidence && sanitizedOnly && !hasForbiddenKey && (hasUnknownScope || hasLeakyScope)) blockers.push('evidence lists an unknown or identifying scope key — only abstract whitelist scopes are allowed');
  if (boundaryReady && evidenceStructurallyValid && anyUnsafeFlag) blockers.push('evidence reports an exposure (raw bytes / decoded sequences / file names / paths / offsets / fingerprints / sample values / channel names / timing / hashes)');
  if (boundaryReady && evidenceStructurallyValid && !anyUnsafeFlag && presentScopeCount === 0) blockers.push('no abstract evidence scope is present');
  if (boundaryReady && evidenceStructurallyValid && !anyUnsafeFlag && presentScopeCount > 0 && !corePresent) blockers.push('core adapter scopes (raw stream structure / channel identity / timebase) are incomplete');
  if (boundaryReady && evidenceStructurallyValid && !anyUnsafeFlag && corePresent && !allPresent) blockers.push('the dry-run shape is missing one or more abstract scopes');

  const warnings = [];
  if (dryRunReady) warnings.push('dry_run_ready means sanitized evidence has been arranged into an adapter-consumable DRY-RUN shape — it does NOT confirm raw stream / identity / timebase / scaling / units, does NOT make the canonical adapter eligible, and produces NO canonical series / time-series / measured extraction');

  const nextEvidenceNeeded = [];
  if (pcb && !boundaryReady) nextEvidenceNeeded.push('a private-corpus boundary that reaches private_corpus_boundary_ready (3G-2)');
  if (boundaryReady && !hasEvidence) nextEvidenceNeeded.push('a sanitized evidence descriptor (abstract scope flags only, no raw / decoded / identifying values)');
  if (boundaryReady && evidenceStructurallyValid && !anyUnsafeFlag) {
    for (const s of _ADAPTER_EVIDENCE_SCOPES) if (!presentScopes.includes(s)) nextEvidenceNeeded.push('sanitized scope: ' + s);
  }

  const blockerCount = blockers.length;
  const warningCount = warnings.length;

  const evidenceShape = {
    allowedScopes: _ADAPTER_EVIDENCE_SCOPES.slice(),
    presentScopes,
    missingScopes,
    blockedScopes,
    scopeCount: _ADAPTER_EVIDENCE_SCOPES.length,
    presentScopeCount,
    missingScopeCount,
    blockerCount,
    warningCount,
    sanitizedOnly,
    realDataUsed: false,
  };

  const aggregateDecision = {
    canProvideAdapterEvidenceShape: dryRunReady,
    candidateCount: (_SA_RANK[status] >= _SA_RANK.adapter_shape_candidate && !dryRunReady) ? 1 : 0,
    blockerCount,
    reason: dryRunReady
      ? 'a safe, sanitized, complete evidence descriptor over a passed 3G-2 boundary was arranged into an adapter-consumable DRY-RUN shape — this is a dry-run shape ONLY; it does NOT confirm telemetry, make the canonical adapter eligible, or produce any canonical series'
      : 'sanitized-evidence adapter dry-run shape not produced — this is a dry-run shaping layer, not extraction / confirmation; real telemetry never enters the repo, sanitized evidence never becomes confirmed telemetry, and no canonical series / analysis is produced',
  };

  const confirmationFeed = {
    sanitizedEvidenceAdapterReady: dryRunReady,
    sanitizedEvidenceAdapterLevel: status,
    adapterEvidenceShapeAvailable: dryRunReady,
  };

  // ── capabilities (confirmation / canonical / decode / analysis pinned false on EVERY path) ──
  const capabilities = {
    sanitizedEvidenceAdapterCriteria: true,
    adapterEvidenceShapeAvailable: dryRunReady,   // true only when the safe, complete dry-run shape passes
    rawStreamConfirmed: false, identityConfirmed: false, timebaseConfirmed: false,
    scalingConfirmed: false, unitsConfirmed: false,
    canonicalAdapterEligible: false, canonicalTelemetry: false, timeSeries: false,
    measuredExtraction: false, measuredHandlingResponse: false, handlingAnalysis: false,
    overlayEnabled: false, kus: false, handlingCorrelation: false, setupRecommendation: false,
    modelVsActual: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_SADAPTER_RUN', 'telemetry.sadapter.info.run', 'high'));
  if (status === 'not_available') diagnostics.push(D('warning', 'BMS_SADAPTER_NOT_AVAILABLE', 'telemetry.sadapter.warning.notAvailable'));
  if (status === 'boundary_not_ready') diagnostics.push(D('warning', 'BMS_SADAPTER_BOUNDARY_NOT_READY', 'telemetry.sadapter.warning.boundaryNotReady'));
  if (status === 'evidence_missing') diagnostics.push(D('warning', 'BMS_SADAPTER_EVIDENCE_MISSING', 'telemetry.sadapter.warning.evidenceMissing'));
  if (status === 'evidence_invalid') diagnostics.push(D('warning', 'BMS_SADAPTER_EVIDENCE_INVALID', 'telemetry.sadapter.warning.evidenceInvalid'));
  if (status === 'unsafe_evidence') diagnostics.push(D('error', 'BMS_SADAPTER_UNSAFE_EVIDENCE', 'telemetry.sadapter.error.unsafeEvidence'));
  if (status === 'insufficient_scope') diagnostics.push(D('warning', 'BMS_SADAPTER_INSUFFICIENT_SCOPE', 'telemetry.sadapter.warning.insufficientScope'));
  if (status === 'partial_adapter_shape' || status === 'adapter_shape_candidate') diagnostics.push(D('warning', 'BMS_SADAPTER_SHAPE_INCOMPLETE', 'telemetry.sadapter.warning.shapeIncomplete'));
  diagnostics.push(D('warning', 'BMS_SADAPTER_DRY_RUN_ONLY', 'telemetry.sadapter.warning.dryRunOnly'));
  diagnostics.push(D('warning', 'BMS_SADAPTER_NOT_CONFIRMATION', 'telemetry.sadapter.warning.notConfirmation'));
  if (dryRunReady) diagnostics.push(D('info', 'BMS_SADAPTER_DRY_RUN_READY', 'telemetry.sadapter.info.dryRunReady', 'low'));
  if (nextEvidenceNeeded.length) diagnostics.push(D('info', 'BMS_SADAPTER_NEXT_EVIDENCE_NEEDED', 'telemetry.sadapter.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: (pcb && typeof pcb.sourceType === 'string') ? pcb.sourceType : (opts.sourceType || 'bmsbin'),
    stage: 'sanitized_evidence_adapter', status,
    reason: aggregateDecision.reason,
    adapterEvidenceLevel: status,
    evidenceLevel: status,
    realDataUsed: false,
    evidenceShape,
    adapterDryRunContract: SANITIZED_EVIDENCE_ADAPTER_CONTRACT,
    blockers, warnings, nextEvidenceNeeded,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      dryRunReady
        ? 'sanitized evidence arranged into an adapter DRY-RUN shape — this is NOT confirmed telemetry; no canonical series / time-series / measured extraction / analysis is produced'
        : 'no adapter dry-run shape produced (this is a dry-run shaping layer, not extraction / confirmation; real data never enters the repo)',
      'no confirmed raw stream / identity / timebase / scaling / units',
      'no canonical adapter eligibility / canonical telemetry / time-series / measured extraction',
      'no overlay / Kus / model-vs-actual / setup recommendation',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsSanitizedEvidenceAdapter, SANITIZED_EVIDENCE_ADAPTER_CONTRACT };
}
