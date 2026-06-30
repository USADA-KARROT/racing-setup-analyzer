/**
 * contracts/r3.0f/migration-envelope.js — R3.0F F1 · Migration Envelope + Journal contracts (PURE).
 *
 * Defines the wire shapes the migration engine produces. Pure validators: NO I/O.
 *
 * Contracts:
 *   MigrationEnvelope — frozen { engineVersion, storageVersion, perStore: { storeKey: storeTargetVersion } }.
 *     Identifies the unified-storage version + per-store target schema versions. Single source of truth
 *     for "what does CURRENT mean". The engine refuses to advance past this envelope's targets.
 *
 *   MigrationJournalEntry — append-only, frozen, deterministic. Records the migration of ONE record.
 *     Fields: schemaVersion, recordedAt, store, key, fromVersion, toVersion, status, recordHash,
 *             migrationsApplied, reasonCode?, limitations[].
 *     - status ∈ { migrated, no-op, rejected, failed }.
 *     - reasonCode populated when status ∈ { rejected, failed } (closed enum).
 *     - limitations carry honest deferred / partial / un-validated observations (never weakening).
 *     - recordHash is a stable SHA-256-like (we use a deterministic FNV-1a fallback when SubtleCrypto is
 *       unavailable, e.g. Node test runner) over JSON.stringify(record) at the post-migration state.
 *
 *   MigrationPlan — frozen { generatedAt, currentVersions: {...}, targetVersions: {...},
 *                            steps: [...], blockers: [...] }.
 *     Pure preview of the migrate() call. blockers populated for future-version records, malformed
 *     legacy rows, missing migrators, etc.
 *
 *   MigrationReport — frozen { startedAt, completedAt, journalCount, migrated, noop, rejected, failed,
 *                              perStore: {...}, status }.
 *     Final shape returned by migrate(). status ∈ { complete, partial, halted }.
 *
 * Closed reasonCode enum (engine + tests share this):
 *   UNSUPPORTED_FUTURE_VERSION — record.schemaVersion > envelope.perStore[store].
 *   NO_MIGRATION_PATH         — no migrator registered for store, or no step for fromVersion.
 *   RECORD_NOT_AN_OBJECT      — record is null/array/primitive.
 *   RECORD_BAD_VERSION        — schemaVersion missing/NaN/negative/non-integer.
 *   RECORD_TOO_LARGE          — record exceeds maxRecordBytes (defense vs hostile inflation).
 *   RECORD_CIRCULAR           — JSON serialization failed (cycles, BigInt, etc.).
 *   PROXY_INPUT_REJECTED      — proxy detection tripped (best-effort).
 *   POST_MIGRATION_INVALID    — migrator returned ok but validator rejected.
 *   MIGRATOR_THREW            — migrator threw an exception; treated as fail-closed.
 *   BACKEND_REJECTED          — backend.transact rejected mid-batch.
 *   CONFIRM_REQUIRED          — migrate() called without { confirm: true } in destructive mode.
 *   ENVELOPE_VERSION_MISMATCH — meta-store envelope.engineVersion above engine's known target.
 *   JOURNAL_OVERFLOW          — journal entry count > maxJournalEntries before compaction; engine refuses to append further until journal is compacted.
 *   PRODUCER_ATTESTATION_REFUSED — migrator attempted to mark a record as producer-attested; engine forbids it (only the live producer module may attest).
 *
 * The engine NEVER coerces a future-version record. NEVER silently drops fields. NEVER fabricates
 * producer attestation. Migration of one record does NOT side-effect another. Each batch is a single
 * atomic backend.transact() per store family — either every write in the batch lands, or none does.
 *
 * UMD: Node require / Electron renderer global (R3_0F_MigrationEnvelope).
 */
(function (root) {
  'use strict';

  var ENGINE_VERSION = 1;       // the unified migration-engine envelope version itself
  var STORAGE_VERSION = 1;      // overall storage envelope version (bumped only when engine semantics change)

  // Per-store target schema versions. Mirrored from each store module to detect drift.
  // F1 establishes the registry; no version bump occurs in F1 (all stores at v1).
  var PER_STORE_TARGETS = Object.freeze({
    cases:               1,
    sessions:            1,
    r3_0e_experiments:   1,
    r3_0e_outcomes:      1,
    r3_0e_timelines:     1,
    r3_0e_followupLinks: 1
  });

  var REASON_CODES = Object.freeze([
    'UNSUPPORTED_FUTURE_VERSION',
    'NO_MIGRATION_PATH',
    'RECORD_NOT_AN_OBJECT',
    'RECORD_BAD_VERSION',
    'RECORD_TOO_LARGE',
    'RECORD_CIRCULAR',
    'PROXY_INPUT_REJECTED',
    'POST_MIGRATION_INVALID',
    'MIGRATOR_THREW',
    'BACKEND_REJECTED',
    'CONFIRM_REQUIRED',
    'ENVELOPE_VERSION_MISMATCH',
    'JOURNAL_OVERFLOW',
    'PRODUCER_ATTESTATION_REFUSED'
  ]);
  var REASON_SET = (function () { var s = {}; for (var i = 0; i < REASON_CODES.length; i++) s[REASON_CODES[i]] = true; return Object.freeze(s); })();

  var STATUS_VALUES = Object.freeze(['migrated', 'no-op', 'rejected', 'failed']);
  var STATUS_SET = (function () { var s = {}; for (var i = 0; i < STATUS_VALUES.length; i++) s[STATUS_VALUES[i]] = true; return Object.freeze(s); })();

  var REPORT_STATUS_VALUES = Object.freeze(['complete', 'partial', 'halted', 'no-op']);
  var REPORT_STATUS_SET = (function () { var s = {}; for (var i = 0; i < REPORT_STATUS_VALUES.length; i++) s[REPORT_STATUS_VALUES[i]] = true; return Object.freeze(s); })();

  // ── deep freeze (closure-captured intrinsics) ─────────────────────────────────
  var _ObjectFreeze = Object.freeze;
  var _ObjectIsFrozen = Object.isFrozen;
  var _ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
  var _ArrayIsArray = Array.isArray;

  function deepFreeze(v) {
    if (v === null || typeof v !== 'object') return v;
    if (_ObjectIsFrozen(v)) return v;
    var keys = _ObjectGetOwnPropertyNames(v);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      try { deepFreeze(v[k]); } catch (_) { /* accessor; skip */ }
    }
    return _ObjectFreeze(v);
  }

  // ── envelope + journal entry shape validators ────────────────────────────────
  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !_ArrayIsArray(v);
  }

  function validateEnvelope(env) {
    var violations = [];
    if (!isPlainObject(env)) violations.push('not_an_object');
    else {
      if (env.engineVersion !== ENGINE_VERSION) violations.push('engine_version_mismatch');
      if (env.storageVersion !== STORAGE_VERSION) violations.push('storage_version_mismatch');
      if (!isPlainObject(env.perStore)) violations.push('per_store_missing');
      else {
        var keys = _ObjectGetOwnPropertyNames(PER_STORE_TARGETS);
        for (var i = 0; i < keys.length; i++) {
          var k = keys[i];
          if (env.perStore[k] !== PER_STORE_TARGETS[k]) violations.push('per_store_drift:' + k);
        }
      }
    }
    return { ok: violations.length === 0, violations: violations };
  }

  function validateJournalEntry(entry) {
    var violations = [];
    if (!isPlainObject(entry)) return { ok: false, violations: ['not_an_object'] };
    if (entry.schemaVersion !== 1) violations.push('bad_schema_version');
    if (typeof entry.recordedAt !== 'string' || !entry.recordedAt.length) violations.push('bad_recorded_at');
    if (typeof entry.store !== 'string' || !entry.store.length) violations.push('bad_store');
    if (typeof entry.key !== 'string' || !entry.key.length) violations.push('bad_key');
    // fromVersion >= -1 (sentinel -1 = "unknown"; engine uses it when the source record had a malformed schemaVersion)
    if (typeof entry.fromVersion !== 'number' || !isFinite(entry.fromVersion) || entry.fromVersion < -1 || Math.floor(entry.fromVersion) !== entry.fromVersion) violations.push('bad_from_version');
    if (typeof entry.toVersion !== 'number' || !isFinite(entry.toVersion) || entry.toVersion < 0 || Math.floor(entry.toVersion) !== entry.toVersion) violations.push('bad_to_version');
    if (!STATUS_SET[entry.status]) violations.push('bad_status');
    if (typeof entry.recordHash !== 'string') violations.push('bad_record_hash');
    if (!_ArrayIsArray(entry.migrationsApplied)) violations.push('bad_migrations_applied');
    if (!_ArrayIsArray(entry.limitations)) violations.push('bad_limitations');
    if (entry.status === 'rejected' || entry.status === 'failed') {
      if (!REASON_SET[entry.reasonCode]) violations.push('bad_reason_code');
    }
    return { ok: violations.length === 0, violations: violations };
  }

  function buildEnvelope() {
    return deepFreeze({
      schemaVersion: 1,
      engineVersion: ENGINE_VERSION,
      storageVersion: STORAGE_VERSION,
      perStore: deepFreeze({
        cases:               PER_STORE_TARGETS.cases,
        sessions:            PER_STORE_TARGETS.sessions,
        r3_0e_experiments:   PER_STORE_TARGETS.r3_0e_experiments,
        r3_0e_outcomes:      PER_STORE_TARGETS.r3_0e_outcomes,
        r3_0e_timelines:     PER_STORE_TARGETS.r3_0e_timelines,
        r3_0e_followupLinks: PER_STORE_TARGETS.r3_0e_followupLinks
      })
    });
  }

  var api = {
    ENGINE_VERSION:      ENGINE_VERSION,
    STORAGE_VERSION:     STORAGE_VERSION,
    PER_STORE_TARGETS:   PER_STORE_TARGETS,
    REASON_CODES:        REASON_CODES,
    STATUS_VALUES:       STATUS_VALUES,
    REPORT_STATUS_VALUES: REPORT_STATUS_VALUES,
    buildEnvelope:       buildEnvelope,
    validateEnvelope:    validateEnvelope,
    validateJournalEntry: validateJournalEntry,
    deepFreeze:          deepFreeze
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_MigrationEnvelope = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
