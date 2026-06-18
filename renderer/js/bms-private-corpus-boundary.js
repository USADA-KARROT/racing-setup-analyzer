/**
 * bms-private-corpus-boundary.js — PRIVATE real-corpus BOUNDARY / evidence-ingestion policy gate
 * (Phase 3G-2)
 *
 * This is a BOUNDARY / POLICY gate, not extraction and not decoding. It answers ONE question: may a
 * private, LOCAL-ONLY telemetry corpus contribute SANITIZED aggregate evidence to the trust chain —
 * and is its manifest safe (nothing proprietary committed or exposed)? It reads NO raw bytes,
 * decodes NOTHING, opens NO real file, names NO channel, infers NO units / scaling / Hz, and builds
 * NO canonical series / time-series / measured extraction.
 *
 * Key distinction from earlier gates: a real, local, private corpus MAY pass this boundary (that is
 * the whole point — letting real data contribute evidence locally). But `private_corpus_boundary_ready`
 * means ONLY that sanitized evidence is safe to ingest — it does NOT confirm raw stream / identity /
 * timebase / scaling / units, does NOT make the canonical adapter eligible, and does NOT produce
 * canonical telemetry. Whether this evidence can later UPGRADE any confirmation is a FUTURE phase's
 * decision; 3G-2 never feeds back to make any upstream confirmation `confirmed`.
 *
 * Safety: the input is a MANIFEST (a descriptor of safe, high-level fields) — never the real files.
 * A manifest that commits raw files / exposes raw bytes / decoded sequences / file names / offsets /
 * fingerprints, OR that carries any identifying field (a real path, file name, exact hash, byte
 * offset, exact sample count, sample rate, channel names, raw snippet, decoded value, timestamp,
 * exact file size), is rejected as unsafe/invalid. Everything is fail-closed.
 *
 * Red lines (always held): real telemetry files NEVER enter the repo; the reporter emits only
 * sanitized scalars (no file names / paths / hashes / offsets / fingerprints / raw / decoded /
 * sample values / timing / channel names). `realDataUsed` is ALWAYS false (only a manifest +
 * sanitized evidence are consumed). capabilities rawStreamConfirmed / identityConfirmed /
 * timebaseConfirmed / scalingConfirmed / unitsConfirmed / canonicalAdapterEligible /
 * canonicalTelemetry / timeSeries / measuredExtraction / measuredHandlingResponse / handlingAnalysis
 * / overlayEnabled / kus / handlingCorrelation / setupRecommendation / modelVsActual stay false on
 * EVERY path (even private_corpus_boundary_ready). Only privateCorpusBoundaryCriteria and
 * privateCorpusEvidenceAvailable (when the safe boundary passes) may be true. One-way: never mutates
 * any upstream result. Clean-room.
 */

// Manifest field names that would leak identifying / raw / proprietary information — their presence
// (non-empty) makes the manifest invalid. The manifest must be a sanitized descriptor only.
const _FORBIDDEN_MANIFEST_KEYS = [
  'absolutePath', 'path', 'filePath', 'fileName', 'fileNames', 'localPath', 'realPath',
  'hash', 'sha', 'sha1', 'sha256', 'md5', 'exactHash', 'fingerprint', 'fingerprints',
  'offset', 'offsets', 'byteOffset', 'sampleCount', 'sampleRate', 'hz', 'channelNames', 'channels',
  'rawBytes', 'rawSnippet', 'decodedValues', 'decoded', 'timestamps', 'fileSize', 'fileSizes', 'values',
];

// Unsafe boolean flags that must be false/absent — any true means the manifest describes a leak.
const _UNSAFE_FLAG_KEYS = [
  'rawFilesCommitted', 'rawBytesExposed', 'decodedSequencesExposed',
  'fileNamesExposed', 'offsetsExposed', 'fingerprintsExposed',
];

// An accepted free-form descriptor string (formatFamily / sourceType) must not carry an identifying
// VALUE — a path, a hash, a hex offset, or a proprietary file extension. The key denylist alone is
// not enough (a leak can hide in an allowed field). Matches: any slash, 0x-hex, a sha/md5 token, a
// long hex run, or a known vendor extension. Plain tokens like 'darab' / 'bmsbin' / 'csv' do NOT match.
const _VALUE_LEAK_RE = /[/\\]|0x[0-9a-f]+|\b(sha\d*|md5)\b|[0-9a-f]{16,}|\.(bmsbin|tir|pds|cvp|pvp|mch|fnl|bin|dat)\b/i;

const _PC_RANK = {
  not_available: 0, private_corpus_disabled: 1, manifest_missing: 2, manifest_invalid: 3,
  unsafe_manifest: 4, insufficient_file_count: 5, sanitized_evidence_missing: 6,
  sanitized_evidence_candidate: 7, private_corpus_boundary_ready: 8,
};

const _MIN_CORPUS_FILES = 2;

function _fileCountBucket(n) {
  if (!Number.isFinite(n)) return 'unknown';
  if (n < 2) return '0-1';
  if (n < 10) return '2-9';
  if (n < 50) return '10-49';
  return '50+';
}

/**
 * Evaluate the private real-corpus boundary / evidence-ingestion policy.
 * @param {object} corpusManifest sanitized descriptor (safe high-level fields only; NEVER real files)
 * @param {object} opts  { allowPrivateLocalCorpus | policy:{allowPrivateLocalCorpus},
 *                         sanitizedEvidence:{ hasRawStreamEvidence, hasIdentityEvidence,
 *                            hasTimebaseEvidence, hasScalingEvidence, hasUnitsEvidence,
 *                            hasCorpusEvidence },  // evidence FLAGS only, never confirmation
 *                         syntheticOnly | mockOnly, sourceType }
 */
function evaluateBmsPrivateCorpusBoundary(corpusManifest, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  if (!opts || typeof opts !== 'object') opts = {};   // garbage opts → fail-closed
  const manifest = (corpusManifest && typeof corpusManifest === 'object' && !Array.isArray(corpusManifest)) ? corpusManifest : null;

  const privateAllowed = opts.allowPrivateLocalCorpus === true || !!(opts.policy && opts.policy.allowPrivateLocalCorpus === true);

  // ── manifest safety analysis (descriptor only) ──
  const hasForbiddenKey = manifest ? _FORBIDDEN_MANIFEST_KEYS.some(k => {
    const v = manifest[k];
    return v !== undefined && v !== null && v !== false && !(typeof v === 'string' && v === '');
  }) : false;
  const sanitizedOnly = !!(manifest && manifest.sanitizedOnly === true);
  // free-form descriptor fields must not carry an identifying value (path / hash / hex / file ext)
  const freeFormStrings = manifest ? [manifest.formatFamily, manifest.sourceType].filter(v => typeof v === 'string') : [];
  const hasLeakyValue = freeFormStrings.some(v => _VALUE_LEAK_RE.test(v));
  // exposure flags fail CLOSED: ANY truthy value (not only the boolean true) is a self-declared exposure
  const unsafeFlags = {};
  for (const k of _UNSAFE_FLAG_KEYS) unsafeFlags[k] = !!(manifest && manifest[k]);
  const anyUnsafeFlag = Object.values(unsafeFlags).some(v => v === true);

  // a structurally valid manifest is a sanitized descriptor: explicit sanitizedOnly + no identifying
  // keys + no identifying value in an accepted free-form field
  const manifestStructurallyValid = !!(manifest && sanitizedOnly && !hasForbiddenKey && !hasLeakyValue);

  const rawFileCount = (manifest && Number.isFinite(manifest.fileCount)) ? manifest.fileCount : null;
  const fileCountOk = rawFileCount !== null && rawFileCount >= _MIN_CORPUS_FILES;

  // sanitized evidence FLAGS (never confirmation); supplied via opts (synthetic/mock for tests, or a
  // host-side sanitized summary at runtime — still flags only, never raw/decoded values)
  const ev = (opts.sanitizedEvidence && typeof opts.sanitizedEvidence === 'object') ? opts.sanitizedEvidence : null;
  const hasSanitizedEvidence = !!ev;
  const evidenceFlags = {
    hasRawStreamEvidence: !!(ev && ev.hasRawStreamEvidence === true),
    hasIdentityEvidence: !!(ev && ev.hasIdentityEvidence === true),
    hasTimebaseEvidence: !!(ev && ev.hasTimebaseEvidence === true),
    hasScalingEvidence: !!(ev && ev.hasScalingEvidence === true),
    hasUnitsEvidence: !!(ev && ev.hasUnitsEvidence === true),
    hasCorpusEvidence: !!(ev && ev.hasCorpusEvidence === true),
  };
  const evidenceComplete = Object.values(evidenceFlags).every(v => v === true);

  // ── status ladder (fail-closed) ──
  let status;
  if (!manifest && !hasSanitizedEvidence && !privateAllowed) status = 'not_available';
  else if (!privateAllowed) status = 'private_corpus_disabled';
  else if (!manifest) status = 'manifest_missing';
  else if (!manifestStructurallyValid) status = 'manifest_invalid';   // missing sanitizedOnly OR an identifying field present
  else if (anyUnsafeFlag) status = 'unsafe_manifest';
  else if (!fileCountOk) status = 'insufficient_file_count';
  else if (!hasSanitizedEvidence) status = 'sanitized_evidence_missing';
  else if (!evidenceComplete) status = 'sanitized_evidence_candidate';
  else status = 'private_corpus_boundary_ready';

  const boundaryReady = status === 'private_corpus_boundary_ready';

  const manifestSummary = manifest ? {
    fileCountBucket: _fileCountBucket(rawFileCount),
    formatFamily: (typeof manifest.formatFamily === 'string') ? manifest.formatFamily : null,
    sourceType: (typeof manifest.sourceType === 'string') ? manifest.sourceType : (opts.sourceType || null),
    sanitizedOnly,
    rawFilesCommitted: unsafeFlags.rawFilesCommitted,
    rawBytesExposed: unsafeFlags.rawBytesExposed,
    decodedSequencesExposed: unsafeFlags.decodedSequencesExposed,
    fileNamesExposed: unsafeFlags.fileNamesExposed,
    offsetsExposed: unsafeFlags.offsetsExposed,
    fingerprintsExposed: unsafeFlags.fingerprintsExposed,
  } : null;

  const blockers = [];
  if (!privateAllowed) blockers.push('private local corpus is not enabled by policy');
  if (privateAllowed && !manifest) blockers.push('no corpus manifest supplied');
  if (manifest && !sanitizedOnly) blockers.push('manifest is not marked sanitizedOnly');
  if (manifest && hasForbiddenKey) blockers.push('manifest carries an identifying field (path / file name / hash / offset / sample rate / channel name) — not allowed');
  if (manifestStructurallyValid && anyUnsafeFlag) blockers.push('manifest reports an exposure (raw files / raw bytes / decoded sequences / file names / offsets / fingerprints)');
  if (manifestStructurallyValid && !anyUnsafeFlag && !fileCountOk) blockers.push('insufficient corpus file count (need ≥ ' + _MIN_CORPUS_FILES + ')');
  if (manifestStructurallyValid && !anyUnsafeFlag && fileCountOk && !hasSanitizedEvidence) blockers.push('no sanitized evidence supplied');
  if (manifestStructurallyValid && !anyUnsafeFlag && fileCountOk && hasSanitizedEvidence && !evidenceComplete) blockers.push('sanitized evidence is incomplete');

  const warnings = [];
  if (boundaryReady) warnings.push('private_corpus_boundary_ready means sanitized evidence is safe to ingest — it does NOT confirm raw stream / identity / timebase / scaling / units, and does NOT make canonical telemetry available');

  const nextEvidenceNeeded = [];
  if (privateAllowed && manifestStructurallyValid && !anyUnsafeFlag && !fileCountOk) nextEvidenceNeeded.push('a corpus of at least ' + _MIN_CORPUS_FILES + ' files');
  if (privateAllowed && fileCountOk && !hasSanitizedEvidence) nextEvidenceNeeded.push('a sanitized evidence summary (flags only, no raw values)');
  if (privateAllowed && hasSanitizedEvidence && !evidenceComplete) {
    for (const k of Object.keys(evidenceFlags)) if (!evidenceFlags[k]) nextEvidenceNeeded.push('sanitized ' + k);
  }

  const blockerCount = blockers.length;
  const aggregateDecision = {
    canUsePrivateCorpusEvidence: boundaryReady,
    candidateCount: (_PC_RANK[status] >= _PC_RANK.sanitized_evidence_candidate && !boundaryReady) ? 1 : 0,
    blockerCount,
    reason: boundaryReady
      ? 'a safe, sanitized, local-only corpus manifest with complete sanitized evidence passed the boundary — sanitized evidence MAY be ingested; this does NOT confirm telemetry, make the canonical adapter eligible, or produce any canonical series'
      : 'private corpus boundary not passed — this is a local-only evidence-ingestion policy check; real telemetry never enters the repo, evidence never becomes confirmed telemetry, and no canonical series / analysis is produced',
  };

  const confirmationFeed = {
    privateCorpusBoundaryReady: boundaryReady,
    privateCorpusBoundaryLevel: status,
    sanitizedEvidenceAvailable: boundaryReady,
  };

  // ── capabilities (confirmation / canonical / decode / analysis pinned false on EVERY path) ──
  const capabilities = {
    privateCorpusBoundaryCriteria: true,
    privateCorpusEvidenceAvailable: boundaryReady,  // true only when the safe sanitized boundary passes
    rawStreamConfirmed: false, identityConfirmed: false, timebaseConfirmed: false,
    scalingConfirmed: false, unitsConfirmed: false,
    canonicalAdapterEligible: false, canonicalTelemetry: false, timeSeries: false,
    measuredExtraction: false, measuredHandlingResponse: false, handlingAnalysis: false,
    overlayEnabled: false, kus: false, handlingCorrelation: false, setupRecommendation: false,
    modelVsActual: false,
  };

  // ── diagnostics ──
  const diagnostics = [];
  diagnostics.push(D('info', 'BMS_PCORPUS_RUN', 'telemetry.pcorpus.info.run', 'high'));
  if (status === 'not_available') diagnostics.push(D('warning', 'BMS_PCORPUS_NOT_AVAILABLE', 'telemetry.pcorpus.warning.notAvailable'));
  if (status === 'private_corpus_disabled') diagnostics.push(D('warning', 'BMS_PCORPUS_DISABLED', 'telemetry.pcorpus.warning.disabled'));
  if (status === 'manifest_missing') diagnostics.push(D('warning', 'BMS_PCORPUS_MANIFEST_MISSING', 'telemetry.pcorpus.warning.manifestMissing'));
  if (status === 'manifest_invalid') diagnostics.push(D('warning', 'BMS_PCORPUS_MANIFEST_INVALID', 'telemetry.pcorpus.warning.manifestInvalid'));
  if (status === 'unsafe_manifest') diagnostics.push(D('error', 'BMS_PCORPUS_UNSAFE_MANIFEST', 'telemetry.pcorpus.error.unsafeManifest'));
  if (status === 'insufficient_file_count') diagnostics.push(D('warning', 'BMS_PCORPUS_INSUFFICIENT_FILES', 'telemetry.pcorpus.warning.insufficientFiles'));
  if (status === 'sanitized_evidence_missing' || status === 'sanitized_evidence_candidate') diagnostics.push(D('warning', 'BMS_PCORPUS_EVIDENCE_INCOMPLETE', 'telemetry.pcorpus.warning.evidenceIncomplete'));
  diagnostics.push(D('warning', 'BMS_PCORPUS_LOCAL_ONLY', 'telemetry.pcorpus.warning.localOnly'));
  diagnostics.push(D('warning', 'BMS_PCORPUS_NOT_CONFIRMATION', 'telemetry.pcorpus.warning.notConfirmation'));
  if (boundaryReady) diagnostics.push(D('info', 'BMS_PCORPUS_BOUNDARY_READY', 'telemetry.pcorpus.info.boundaryReady', 'low'));
  if (nextEvidenceNeeded.length) diagnostics.push(D('info', 'BMS_PCORPUS_NEXT_EVIDENCE_NEEDED', 'telemetry.pcorpus.info.nextEvidenceNeeded', 'low'));

  return {
    sourceType: (manifest && typeof manifest.sourceType === 'string') ? manifest.sourceType : (opts.sourceType || 'bmsbin'),
    stage: 'private_corpus_boundary', status,
    reason: aggregateDecision.reason,
    boundaryLevel: status,
    evidenceLevel: status,
    realDataUsed: false,
    manifestSummary,
    evidenceSummary: evidenceFlags,
    blockers, warnings, nextEvidenceNeeded,
    aggregateDecision,
    confirmationFeed,
    capabilities,
    diagnostics,
    unknowns: [
      boundaryReady
        ? 'private corpus boundary passed — sanitized evidence MAY be ingested (local-only); this is NOT confirmed telemetry; no canonical series / time-series / measured extraction / analysis is produced'
        : 'private corpus boundary not passed (local-only evidence-ingestion policy; real data never enters the repo)',
      'no confirmed raw stream / identity / timebase / scaling / units',
      'no canonical telemetry / time-series / measured extraction',
      'no overlay / Kus / model-vs-actual / setup recommendation',
    ],
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { evaluateBmsPrivateCorpusBoundary };
}
