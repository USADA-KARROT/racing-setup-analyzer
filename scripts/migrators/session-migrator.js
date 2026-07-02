/**
 * scripts/migrators/session-migrator.js — R3.0F F1 · per-store migrator for `sessions` (R3.0B).
 *
 * Thin wrapper over renderer/js/schema-migration.js (the SAME pure migration the live session-store
 * uses on read). The wrapper does NOT modify schema-migration.js (frozen R3.0B). It NEVER fabricates
 * producer attestation: a session is a raw-telemetry envelope and the session-store re-validates on
 * read. Migration of a session never resurrects a pruned session — the engine only operates on
 * keys returned by backend.list(storeKey) at the time of the batch.
 *
 * UMD: Node require / Electron renderer global (R3_0F_SessionMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader.
  var SM = null;
  if (typeof module !== 'undefined' && module.exports) { try { SM = require('../../renderer/js/schema-migration.js'); } catch (_) { } }
  if (!SM) SM = (root && root.SchemaMigration) || null;

  function migrate(rec) {
    if (!SM) return { ok: false, rejected: true, reason: 'NO_MIGRATION_PATH', migrations: [] };
    return SM.migrateSessionRecord(rec);
  }

  var api = {
    storeKey: 'sessions',
    targetVersion: SM ? SM.SESSION_SCHEMA_VERSION : 1,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_SessionMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
