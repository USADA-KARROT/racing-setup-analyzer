/**
 * scripts/migrators/case-migrator.js — R3.0F F1 · per-store migrator for `cases` (R3.0B).
 *
 * Thin delegating wrapper over renderer/js/schema-migration.js (the SAME pure migration the live
 * case-store uses on read). F1 establishes the wrapper boundary; future case-schema bumps add
 * step migrators inside schema-migration.js — this wrapper carries the new steps automatically.
 *
 * The wrapper does NOT modify schema-migration.js (frozen R3.0B). It NEVER fabricates producer
 * attestation: the case-store still re-validates on read via its own sanitizeForStorage + the
 * portable-bundle revalidation path. This migrator returns a plain object suitable for re-storage
 * via the case-store's normal write path.
 *
 * Public API: migrate(rec) → { ok, record?, migrations: [...], rejected?, reason? }
 *             targetVersion (number)
 *             storeKey (string)
 *
 * UMD: Node require / Electron renderer global (R3_0F_CaseMigrator).
 */
(function (root) {
  'use strict';
  // Literal-only loader. Node: direct require by string literal. Browser: read pre-loaded global.
  var SM = null;
  if (typeof module !== 'undefined' && module.exports) { try { SM = require('../../renderer/js/schema-migration.js'); } catch (_) { } }
  if (!SM) SM = (root && root.SchemaMigration) || null;

  function migrate(rec) {
    if (!SM) return { ok: false, rejected: true, reason: 'NO_MIGRATION_PATH', migrations: [] };
    return SM.migrateCaseRecord(rec);
  }

  var api = {
    storeKey: 'cases',
    targetVersion: SM ? SM.CASE_SCHEMA_VERSION : 1,
    migrate: migrate
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.R3_0F_CaseMigrator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
